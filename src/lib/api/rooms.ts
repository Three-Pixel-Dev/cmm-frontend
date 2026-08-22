import type { ApiMarketGroup, ApiPaged } from "@/types/market-api";
import { http, unwrap, type ApiEnvelope } from "./http";

export type JoinPaymentMode = "required" | "after" | "free";
export type RoomStatus = "open" | "closed";
export type RoomMemberRole = "admin" | "player";
export type JoinPaymentStatus = "paid" | "pending" | "waived";
export type StakeMode = "prepaid" | "pay_after";
export type TabKind = "join_fee" | "bet_stake";
export type TabStatus = "pending" | "collected" | "overdue" | "waived";

export type RoomPreview = {
  id: string;
  name: string;
  invite_code: string;
  join_payment_mode: JoinPaymentMode;
  join_fee: number;
  status: RoomStatus;
};

export type Room = RoomPreview & {
  owner_user_id: string;
  is_admin: boolean;
  is_member: boolean;
  member_count: number;
  created_at: string;
};

export type RoomMember = {
  id: string;
  room_id: string;
  user_id: string;
  role: RoomMemberRole;
  join_payment_status: JoinPaymentStatus;
  created_at: string;
};

export type RoomTab = {
  id: string;
  room_id: string;
  user_id: string;
  kind: TabKind;
  amount: number;
  status: TabStatus;
  market_item_id?: string;
  created_at: string;
};

export type CollectTabsResult = {
  collected: number;
  overdue: number;
};

export type CreateRoomPayload = {
  name: string;
  join_payment_mode: JoinPaymentMode;
  join_fee?: number;
};

export type CreateRoomMarketPayload = {
  title: string;
  description?: string;
  close_hours?: number;
  one_share_price: number;
  platform_fee_percentage?: number;
  stake_mode: StakeMode;
  options?: string[];
};

export const roomsApi = {
  preview: (inviteCode: string) =>
    http
      .get<ApiEnvelope<RoomPreview>>(`/rooms/by-code/${encodeURIComponent(inviteCode)}`)
      .then((r) => unwrap(r.data)),

  listMine: () => http.get<ApiEnvelope<Room[]>>("/rooms/mine").then((r) => unwrap(r.data)),

  get: (id: string) => http.get<ApiEnvelope<Room>>(`/rooms/${id}`).then((r) => unwrap(r.data)),

  create: (payload: CreateRoomPayload) =>
    http.post<ApiEnvelope<Room>>("/rooms", payload).then((r) => unwrap(r.data)),

  join: (inviteCode: string) =>
    http
      .post<ApiEnvelope<Room>>("/rooms/join", { invite_code: inviteCode })
      .then((r) => unwrap(r.data)),

  members: (id: string) =>
    http.get<ApiEnvelope<RoomMember[]>>(`/rooms/${id}/members`).then((r) => unwrap(r.data)),

  tabs: (id: string) =>
    http.get<ApiEnvelope<RoomTab[]>>(`/rooms/${id}/tabs`).then((r) => unwrap(r.data)),

  collectTabs: (id: string) =>
    http
      .post<ApiEnvelope<CollectTabsResult>>(`/rooms/${id}/collect-tabs`)
      .then((r) => unwrap(r.data)),

  listMarkets: (id: string) =>
    http
      .get<ApiEnvelope<ApiPaged<ApiMarketGroup>>>(`/rooms/${id}/markets`)
      .then((r) => unwrap(r.data)),

  createMarket: (id: string, payload: CreateRoomMarketPayload) =>
    http
      .post<ApiEnvelope<ApiMarketGroup>>(`/rooms/${id}/markets`, payload)
      .then((r) => unwrap(r.data)),

  addVirtualChips: (roomId: string, userId: string, amount: number) =>
    http
      .post<ApiEnvelope<{ success: boolean }>>(`/rooms/${roomId}/members/${userId}/add-chips`, { amount })
      .then((r) => unwrap(r.data)),
};
