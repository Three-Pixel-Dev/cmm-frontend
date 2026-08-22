export type ChatRole = "customer" | "p2p" | "admin";

export interface ChatUserBrief {
  id: string;
  name?: string;
  email?: string;
  role?: ChatRole;
}

export interface ChatConversation {
  id: string;
  p2p_id?: string;
  customer: ChatUserBrief;
  agent: ChatUserBrief;
  counterpart: ChatUserBrief;
  last_message_text?: string;
  last_message_at?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender: ChatUserBrief;
  sender_role: ChatRole;
  body: string;
  attachment_url?: string;
  created_at: string;
}

/** Shape of the `chat.message` event published over `user.<id>.chat`. */
export interface ChatMessageEvent {
  eventType: "chat.message";
  conversation_id: string;
  message: ChatMessage;
}
