import { useEffect, useCallback, useRef, ReactNode } from "react";
import { gatewayWebSocketUrl, parseWsMessage } from "@/lib/api/ws";
import {
  createContext,
  useContext,
  useState,
} from "react";

type WsCallback = (payload: unknown) => void;

interface WebsocketContextType {
  isReady: boolean;
  subscribe: (channel: string, callback: WsCallback) => () => void;
  /** Re-send subscribe frames for all channels (after reconnect). */
  resubscribeAll: () => void;
}

const WebsocketContext = createContext<WebsocketContextType | null>(null);

const RECONNECT_MS = 2_000;

export function WebsocketContextProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<WsCallback>>>(new Map());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const [isReady, setIsReady] = useState(false);

  const sendSubscribe = useCallback((channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "subscribe", channel }));
    }
  }, []);

  const resubscribeAll = useCallback(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }
    for (const channel of listenersRef.current.keys()) {
      sendSubscribe(channel);
    }
  }, [sendSubscribe]);

  const subscribe = useCallback((channel: string, callback: WsCallback): (() => void) => {
    let set = listenersRef.current.get(channel);
    if (!set) {
      set = new Set();
      listenersRef.current.set(channel, set);
      sendSubscribe(channel);
    }
    set.add(callback);

    return () => {
      const currentSet = listenersRef.current.get(channel);
      if (!currentSet) return;
      currentSet.delete(callback);
      if (currentSet.size === 0) {
        listenersRef.current.delete(channel);
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "unsubscribe", channel }));
        }
      }
    };
  }, [sendSubscribe]);

  useEffect(() => {
    unmountedRef.current = false;

    const connect = () => {
      if (unmountedRef.current) return;

      const ws = new WebSocket(gatewayWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setIsReady(true);
        for (const channel of listenersRef.current.keys()) {
          ws.send(JSON.stringify({ type: "subscribe", channel }));
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        setIsReady(false);
        if (!unmountedRef.current) {
          reconnectTimerRef.current = setTimeout(connect, RECONNECT_MS);
        }
      };

      ws.onmessage = (ev) => {
        const msg = parseWsMessage(String(ev.data));
        if (!msg || msg.type !== "event") return;

        const channelListeners = listenersRef.current.get(msg.channel);
        channelListeners?.forEach((cb) => {
          try {
            cb(msg.payload);
          } catch (err) {
            console.error(`WS callback error [${msg.channel}]:`, err);
          }
        });
      };

      ws.onerror = () => {
        // onclose handles reconnect
      };
    };

    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
      setIsReady(false);
    };
  }, []);

  return (
    <WebsocketContext.Provider value={{ isReady, subscribe, resubscribeAll }}>
      {children}
    </WebsocketContext.Provider>
  );
}

export function useWebsocketSubscription() {
  const context = useContext(WebsocketContext);
  if (!context) {
    throw new Error("useWebsocketSubscription must be used within a WebsocketContextProvider");
  }
  return context;
}
