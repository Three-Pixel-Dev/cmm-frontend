import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWebsocketSubscription } from "@/components/WebsocketProvider";
import { useAuth } from "@/store/useAuth";
import { useChatUI } from "@/store/useChatUI";
import {
  CHAT_CONVERSATIONS_KEY,
  upsertMessage,
} from "@/hooks/useChat";
import type { ChatMessageEvent } from "@/lib/chat/types";

function parseChatEvent(payload: unknown): ChatMessageEvent | null {
  let data: unknown = payload;
  if (typeof payload === "string") {
    try {
      data = JSON.parse(payload);
    } catch {
      return null;
    }
  }
  const ev = data as ChatMessageEvent | undefined;
  if (!ev || ev.eventType !== "chat.message" || !ev.message) return null;
  return ev;
}

/**
 * Mounted once at the app root (inside WebsocketContextProvider). Listens on the
 * signed-in user's private chat channel and keeps the react-query caches fresh,
 * toasting messages that arrive while the panel is closed or focused elsewhere.
 */
export function ChatRealtimeListener() {
  const { subscribe } = useWebsocketSubscription();
  const qc = useQueryClient();
  const myId = useAuth((s) => s.user?.id);
  const isLoggedIn = useAuth((s) => s.isLoggedIn());

  useEffect(() => {
    if (!myId || !isLoggedIn) return;
    const unsubscribe = subscribe(`user.${myId}.chat`, (payload) => {
      const ev = parseChatEvent(payload);
      if (!ev) return;

      upsertMessage(qc, ev.conversation_id, ev.message);
      void qc.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_KEY });

      if (ev.message.sender?.id !== myId) {
        const { open, selectedId } = useChatUI.getState();
        if (!open || selectedId !== ev.conversation_id) {
          toast.info(ev.message.sender?.name || "New message", {
            description: ev.message.body.slice(0, 80),
          });
        }
      }
    });
    return unsubscribe;
  }, [myId, isLoggedIn, subscribe, qc]);

  return null;
}
