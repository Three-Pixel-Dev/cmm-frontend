import { http, unwrap, type ApiEnvelope } from "./http";
import type { ChatConversation, ChatMessage } from "@/lib/chat/types";

export const chatApi = {
  listConversations: () =>
    http
      .get<ApiEnvelope<ChatConversation[]>>("/p2p/chat/conversations")
      .then((r) => unwrap(r.data) ?? []),

  /** Customer opens (or returns) the thread with a given p2p agent. */
  openWithAgent: (p2pId: string) =>
    http
      .post<ApiEnvelope<ChatConversation>>("/p2p/chat/conversations", { p2p_id: p2pId })
      .then((r) => unwrap(r.data)),

  listMessages: (conversationId: string, params?: { limit?: number; before?: string }) =>
    http
      .get<ApiEnvelope<ChatMessage[]>>(`/p2p/chat/conversations/${conversationId}/messages`, {
        params,
      })
      .then((r) => unwrap(r.data) ?? []),

  sendMessage: (conversationId: string, body: string, attachmentUrl?: string) =>
    http
      .post<ApiEnvelope<ChatMessage>>(`/p2p/chat/conversations/${conversationId}/messages`, {
        body,
        attachment_url: attachmentUrl,
      })
      .then((r) => unwrap(r.data)),

  markRead: (conversationId: string) =>
    http.post(`/p2p/chat/conversations/${conversationId}/read`).then(() => undefined),
};
