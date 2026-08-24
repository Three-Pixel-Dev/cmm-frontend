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
  host_payment_qr_url?: string;
  host_payment_type?: string;
  host_payment_account_name?: string;
  host_payment_account_number?: string;
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
  user_name?: string;
  user_avatar?: string;
  role: RoomMemberRole;
  join_payment_status: JoinPaymentStatus;
  payment_qr_url?: string;
  payment_type?: string;
  payment_account_name?: string;
  payment_account_number?: string;
  payment_note?: string;
  chip_balance?: number;
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
  host_payment_qr_url?: string;
  host_payment_type?: string;
  host_payment_account_name?: string;
  host_payment_account_number?: string;
};

export type JoinRoomPayload = {
  invite_code: string;
  payment_qr_url?: string;
  payment_type?: string;
  payment_account_name?: string;
  payment_account_number?: string;
  payment_note?: string;
};

export type UpdateMemberPaymentQrPayload = {
  payment_qr_url?: string;
  payment_type?: string;
  payment_account_name?: string;
  payment_account_number?: string;
  payment_note?: string;
};

export type UpdateHostPaymentQrPayload = {
  host_payment_qr_url?: string;
  host_payment_type?: string;
  host_payment_account_name?: string;
  host_payment_account_number?: string;
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

export type RoomMessage = {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  user_role: RoomMemberRole | "admin" | "player";
  message: string;
  created_at: string;
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

  join: (payload: string | JoinRoomPayload) => {
    const body = typeof payload === "string" ? { invite_code: payload } : payload;
    return http.post<ApiEnvelope<Room>>("/rooms/join", body).then((r) => unwrap(r.data));
  },

  members: (id: string) =>
    http.get<ApiEnvelope<RoomMember[]>>(`/rooms/${id}/members`).then((r) => unwrap(r.data)),

  updateMemberPaymentQr: (roomId: string, payload: UpdateMemberPaymentQrPayload) =>
    http
      .put<ApiEnvelope<RoomMember>>(`/rooms/${roomId}/members/me/payment-qr`, payload)
      .then((r) => unwrap(r.data)),

  updateHostPaymentQr: (roomId: string, payload: UpdateHostPaymentQrPayload) =>
    http
      .put<ApiEnvelope<Room>>(`/rooms/${roomId}/host-payment-qr`, payload)
      .then((r) => unwrap(r.data)),

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
      .post<
        ApiEnvelope<{ success: boolean }>
      >(`/rooms/${roomId}/members/${userId}/add-chips`, { amount })
      .then((r) => unwrap(r.data)),

  messages: (id: string, limit = 100) =>
    http
      .get<ApiEnvelope<RoomMessage[]>>(`/rooms/${id}/messages?limit=${limit}`)
      .then((r) => unwrap(r.data)),

  sendMessage: (id: string, message: string) =>
    http
      .post<ApiEnvelope<RoomMessage>>(`/rooms/${id}/messages`, { message })
      .then((r) => unwrap(r.data)),
};
