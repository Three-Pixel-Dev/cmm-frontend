import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/lib/api/chat";
import type { ChatConversation, ChatMessage } from "@/lib/chat/types";
import { useAuth } from "@/store/useAuth";

export const CHAT_CONVERSATIONS_KEY = ["chat", "conversations"] as const;
export const chatMessagesKey = (conversationId: string) =>
  ["chat", "messages", conversationId] as const;

export function useConversations() {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  return useQuery({
    queryKey: CHAT_CONVERSATIONS_KEY,
    queryFn: () => chatApi.listConversations(),
    enabled: isLoggedIn,
  });
}

export function useChatUnreadTotal(): number {
  const { data } = useConversations();
  return (data ?? []).reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: conversationId ? chatMessagesKey(conversationId) : ["chat", "messages", "none"],
    queryFn: () => chatApi.listMessages(conversationId as string, { limit: 100 }),
    enabled: !!conversationId,
  });
}

/** Insert/replace a message in the cached thread, de-duplicating by id. */
export function upsertMessage(
  qc: ReturnType<typeof useQueryClient>,
  conversationId: string,
  msg: ChatMessage,
) {
  qc.setQueryData<ChatMessage[]>(chatMessagesKey(conversationId), (old) => {
    const list = old ?? [];
    if (list.some((m) => m.id === msg.id)) {
      return list.map((m) => (m.id === msg.id ? msg : m));
    }
    return [...list, msg];
  });
}

export function useSendMessage(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => chatApi.sendMessage(conversationId as string, body),
    onSuccess: (msg) => {
      if (!conversationId) return;
      upsertMessage(qc, conversationId, msg);
      void qc.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_KEY });
    },
  });
}

export function useOpenWithAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p2pId: string) => chatApi.openWithAgent(p2pId),
    onSuccess: (conv) => {
      qc.setQueryData<ChatConversation[]>(CHAT_CONVERSATIONS_KEY, (old) => {
        const list = old ?? [];
        return list.some((c) => c.id === conv.id) ? list : [conv, ...list];
      });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatApi.markRead(conversationId),
    onSuccess: (_data, conversationId) => {
      qc.setQueryData<ChatConversation[]>(CHAT_CONVERSATIONS_KEY, (old) =>
        (old ?? []).map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)),
      );
    },
  });
}
