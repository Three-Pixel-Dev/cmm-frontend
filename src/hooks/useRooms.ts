import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebsocketSubscription } from "@/components/WebsocketProvider";
import {
  roomsApi,
  type CreateRoomMarketPayload,
  type CreateRoomPayload,
  type RoomMessage,
} from "@/lib/api/rooms";

export const ROOM_PREVIEW_KEY = "room-preview";
export const MY_ROOMS_KEY = "rooms-mine";
export const ROOM_DETAIL_KEY = "room";
export const ROOM_MEMBERS_KEY = "room-members";
export const ROOM_TABS_KEY = "room-tabs";
export const ROOM_MARKETS_KEY = "room-markets";
export const ROOM_MESSAGES_KEY = "room-messages";

export function useRoomPreview(inviteCode: string | undefined) {
  return useQuery({
    queryKey: [ROOM_PREVIEW_KEY, inviteCode?.toUpperCase()],
    queryFn: () => roomsApi.preview(inviteCode!),
    enabled: !!inviteCode?.trim(),
    retry: false,
  });
}

export function useMyRooms(enabled: boolean) {
  return useQuery({
    queryKey: [MY_ROOMS_KEY],
    queryFn: () => roomsApi.listMine(),
    enabled,
    staleTime: 15_000,
  });
}

export function useRoom(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [ROOM_DETAIL_KEY, id],
    queryFn: () => roomsApi.get(id!),
    enabled: enabled && !!id,
    retry: false,
  });
}

export function useRoomMembers(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [ROOM_MEMBERS_KEY, id],
    queryFn: () => roomsApi.members(id!),
    enabled: enabled && !!id,
  });
}

export function useRoomTabs(id: string | undefined, enabled = false) {
  return useQuery({
    queryKey: [ROOM_TABS_KEY, id],
    queryFn: () => roomsApi.tabs(id!),
    enabled: enabled && !!id,
  });
}

export function useRoomMarkets(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [ROOM_MARKETS_KEY, id],
    queryFn: () => roomsApi.listMarkets(id!),
    enabled: enabled && !!id,
  });
}


export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRoomPayload) => roomsApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [MY_ROOMS_KEY] });
    },
  });
}

export function useJoinRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: string | import("@/lib/api/rooms").JoinRoomPayload) =>
      roomsApi.join(payload),
    onSuccess: (room) => {
      void qc.invalidateQueries({ queryKey: [MY_ROOMS_KEY] });
      void qc.invalidateQueries({ queryKey: [ROOM_DETAIL_KEY, room.id] });
      void qc.invalidateQueries({ queryKey: [ROOM_MEMBERS_KEY, room.id] });
      void qc.invalidateQueries({ queryKey: [ROOM_PREVIEW_KEY] });
    },
  });
}

export function useUpdateMemberPaymentQr(roomId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: import("@/lib/api/rooms").UpdateMemberPaymentQrPayload) =>
      roomsApi.updateMemberPaymentQr(roomId!, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [ROOM_MEMBERS_KEY, roomId] });
      void qc.invalidateQueries({ queryKey: [ROOM_DETAIL_KEY, roomId] });
    },
  });
}

export function useUpdateHostPaymentQr(roomId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: import("@/lib/api/rooms").UpdateHostPaymentQrPayload) =>
      roomsApi.updateHostPaymentQr(roomId!, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [ROOM_DETAIL_KEY, roomId] });
      void qc.invalidateQueries({ queryKey: [ROOM_PREVIEW_KEY] });
    },
  });
}


export function useCreateRoomMarket(roomId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRoomMarketPayload) => roomsApi.createMarket(roomId!, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [ROOM_MARKETS_KEY, roomId] });
    },
  });
}

export function useCollectRoomTabs(roomId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => roomsApi.collectTabs(roomId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [ROOM_TABS_KEY, roomId] });
      void qc.invalidateQueries({ queryKey: [ROOM_MEMBERS_KEY, roomId] });
    },
  });
}

export function useAddVirtualChips(roomId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, amount }: { userId: string; amount: number }) =>
      roomsApi.addVirtualChips(roomId!, userId, amount),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [ROOM_MEMBERS_KEY, roomId] });
    },
  });
}

function asRecord(payload: unknown): Record<string, unknown> | null {
  let data: unknown = payload;
  for (let i = 0; i < 2 && typeof data === "string"; i++) {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const obj = data as Record<string, unknown>;
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    return obj.data as Record<string, unknown>;
  }
  if (obj.message && typeof obj.message === "object" && !Array.isArray(obj.message)) {
    return obj.message as Record<string, unknown>;
  }
  return obj;
}

function fieldString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value) return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return "";
}

function parseRoomMessagePayload(payload: unknown): RoomMessage | null {
  const obj = asRecord(payload);
  if (!obj) return null;
  const id = fieldString(obj, "id");
  const roomId = fieldString(obj, "room_id", "roomId");
  const message = fieldString(obj, "message");
  if (!id || !roomId || !message) return null;
  return {
    id,
    room_id: roomId,
    user_id: fieldString(obj, "user_id", "userId"),
    user_name: fieldString(obj, "user_name", "userName") || "Player",
    user_avatar: fieldString(obj, "user_avatar", "userAvatar") || undefined,
    user_role: (fieldString(obj, "user_role", "userRole") || "player") as RoomMessage["user_role"],
    message,
    created_at: fieldString(obj, "created_at", "createdAt") || new Date().toISOString(),
  };
}

export function useRoomChatRealtime(roomId: string | undefined) {
  const { subscribe, isReady, resubscribeAll } = useWebsocketSubscription();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isReady) return;
    resubscribeAll();
  }, [isReady, resubscribeAll]);

  useEffect(() => {
    if (!roomId) return;

    const channel = `room.${roomId}.chat`;
    return subscribe(channel, (payload) => {
      const msg = parseRoomMessagePayload(payload);
      if (msg) {
        queryClient.setQueryData<RoomMessage[]>([ROOM_MESSAGES_KEY, roomId], (old) => {
          if (!old) return [msg];
          if (old.some((m) => m.id === msg.id)) return old;
          return [...old, msg];
        });
        return;
      }
      void queryClient.invalidateQueries({ queryKey: [ROOM_MESSAGES_KEY, roomId] });
    });
  }, [roomId, subscribe, queryClient]);
}

export function useRoomMessages(id: string | undefined, enabled = true) {
  useRoomChatRealtime(id);

  return useQuery({
    queryKey: [ROOM_MESSAGES_KEY, id],
    queryFn: () => roomsApi.messages(id!),
    enabled: enabled && !!id,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}


export function useSendRoomMessage(roomId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => roomsApi.sendMessage(roomId!, message),
    onSuccess: (saved) => {
      if (saved && roomId) {
        qc.setQueryData<RoomMessage[]>([ROOM_MESSAGES_KEY, roomId], (old) => {
          if (!old) return [saved];
          if (old.some((m) => m.id === saved.id)) return old;
          return [...old, saved];
        });
      }
      void qc.invalidateQueries({ queryKey: [ROOM_MESSAGES_KEY, roomId] });
    },
  });
}

