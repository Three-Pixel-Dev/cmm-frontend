import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { roomsApi, type CreateRoomMarketPayload, type CreateRoomPayload } from "@/lib/api/rooms";
import { WALLET_QUERY_KEY } from "@/lib/api/wallet";

export const ROOM_PREVIEW_KEY = "room-preview";
export const MY_ROOMS_KEY = "rooms-mine";
export const ROOM_DETAIL_KEY = "room";
export const ROOM_MEMBERS_KEY = "room-members";
export const ROOM_TABS_KEY = "room-tabs";
export const ROOM_MARKETS_KEY = "room-markets";

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
    refetchInterval: 8_000,
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
    mutationFn: (inviteCode: string) => roomsApi.join(inviteCode),
    onSuccess: (room) => {
      void qc.invalidateQueries({ queryKey: [MY_ROOMS_KEY] });
      void qc.invalidateQueries({ queryKey: [ROOM_DETAIL_KEY, room.id] });
      void qc.invalidateQueries({ queryKey: [ROOM_PREVIEW_KEY] });
      void qc.invalidateQueries({ queryKey: [WALLET_QUERY_KEY] });
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
      void qc.invalidateQueries({ queryKey: [WALLET_QUERY_KEY] });
    },
  });
}

export function useAddVirtualChips(roomId: string | undefined) {
  return useMutation({
    mutationFn: ({ userId, amount }: { userId: string; amount: number }) =>
      roomsApi.addVirtualChips(roomId!, userId, amount),
  });
}
