import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, MessageSquare, Send, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/useAuth";
import { useChatUI } from "@/store/useChatUI";
import { useConversations, useMarkRead, useMessages, useSendMessage } from "@/hooks/useChat";
import type { ChatConversation, ChatMessage } from "@/lib/chat/types";

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function timeLabel(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatPanel() {
  const open = useChatUI((s) => s.open);
  const selectedId = useChatUI((s) => s.selectedId);
  const closePanel = useChatUI((s) => s.closePanel);
  const selectConversation = useChatUI((s) => s.selectConversation);

  const conversationsQ = useConversations();
  const conversations = conversationsQ.data ?? [];
  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? null : closePanel())}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        aria-label="Chat"
      >
        {selectedId && selected ? (
          <ThreadView conversation={selected} onBack={() => selectConversation(null)} />
        ) : (
          <ListView
            conversations={conversations}
            loading={conversationsQ.isLoading}
            error={conversationsQ.isError ? (conversationsQ.error as Error).message : null}
            onSelect={(id) => selectConversation(id)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ListView({
  conversations,
  loading,
  error,
  onSelect,
}: {
  conversations: ChatConversation[];
  loading: boolean;
  error: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b border-border/60 px-4">
        <MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-base font-semibold">Messages</h2>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="px-4 py-12 text-center text-sm text-destructive">{error}</p>
        ) : conversations.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            No conversations yet. Start one from a P2P agent.
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                    {initials(c.counterpart.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {c.counterpart.name || "P2P Agent"}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {timeLabel(c.last_message_at)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {c.last_message_text || "No messages yet"}
                      </span>
                      {c.unread_count > 0 && (
                        <span
                          className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
                          aria-label={`${c.unread_count} unread messages`}
                        >
                          {c.unread_count}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function ThreadView({
  conversation,
  onBack,
}: {
  conversation: ChatConversation;
  onBack: () => void;
}) {
  const myId = useAuth((s) => s.user?.id);
  const messagesQ = useMessages(conversation.id);
  const messages = messagesQ.data ?? [];
  const sendM = useSendMessage(conversation.id);
  const markRead = useMarkRead();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mark read on open and whenever new messages land while viewing.
  useEffect(() => {
    if (conversation.unread_count > 0) {
      markRead.mutate(conversation.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, conversation.unread_count]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sendM.isPending) return;
    setDraft("");
    sendM.mutate(body, {
      onError: () => setDraft(body),
    });
  };

  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b border-border/60 px-2 pr-12">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
          {initials(conversation.counterpart.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {conversation.counterpart.name || "P2P Agent"}
          </p>
          <p className="text-[11px] capitalize text-muted-foreground">
            {conversation.counterpart.role === "p2p" ? "P2P agent" : conversation.counterpart.role}
          </p>
        </div>
      </header>

      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
        role="log"
        aria-live="polite"
        aria-label="Messages"
      >
        {messagesQ.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No messages yet. Say hello 👋
          </p>
        ) : (
          messages.map((msg) => <Bubble key={msg.id} msg={msg} mine={msg.sender.id === myId} />)
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-border/60 p-3">
        <label htmlFor="chat-composer" className="sr-only">
          Message
        </label>
        <Input
          id="chat-composer"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          autoComplete="off"
        />
        <Button type="submit" disabled={!draft.trim() || sendM.isPending} aria-label="Send message">
          {sendM.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </>
  );
}

function Bubble({ msg, mine }: { msg: ChatMessage; mine: boolean }) {
  const isAdmin = msg.sender_role === "admin";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
          mine
            ? "bg-primary text-primary-foreground"
            : isAdmin
              ? "bg-amber-500/15 text-foreground ring-1 ring-amber-500/40"
              : "bg-muted text-foreground",
        )}
      >
        {!mine && isAdmin && (
          <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-500">
            <ShieldCheck className="h-3 w-3" /> Support
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{msg.body}</p>
        <p className={cn("mt-1 text-[10px]", mine ? "opacity-70" : "text-muted-foreground")}>
          {timeLabel(msg.created_at)}
        </p>
      </div>
    </div>
  );
}
