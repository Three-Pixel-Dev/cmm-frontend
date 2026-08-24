import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Loader2, Crown, Minus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";
import { Badge } from "@/components/ui/badge";
import { useWebsocketSubscription } from "@/components/WebsocketProvider";
import { useRoomMessages, useSendRoomMessage } from "@/hooks/useRooms";
import { useAuth } from "@/store/useAuth";
import { cn } from "@/lib/utils";

interface RoomChatProps {
  roomId: string;
  isMember?: boolean;
}

export function RoomChat({ roomId, isMember = true }: RoomChatProps) {
  const [open, setOpen] = useState(false);
  const [seenCount, setSeenCount] = useState<number | null>(null);
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const user = useAuth((s) => s.user);
  const { data: messages = [], isLoading } = useRoomMessages(roomId, isMember);
  const sendM = useSendRoomMessage(roomId);
  const { isReady } = useWebsocketSubscription();

  const unread = open || seenCount === null ? 0 : Math.max(0, messages.length - seenCount);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (seenCount === null && !isLoading) {
      setSeenCount(messages.length);
    }
  }, [isLoading, messages.length, seenCount]);

  useEffect(() => {
    if (!open) return;
    setSeenCount(messages.length);
    scrollToBottom("auto");
  }, [open, messages.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    sendM.mutate(trimmed, {
      onSuccess: () => {
        setText("");
        setTimeout(() => scrollToBottom(), 50);
      },
      onError: (err: Error) => {
        toast.error(err.message || "Failed to send message");
      },
    });
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <section
          className="pointer-events-auto hud-panel flex h-[min(70dvh,28rem)] w-[min(calc(100vw-2rem),22.5rem)] origin-bottom-right flex-col overflow-hidden rounded-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200"
          role="dialog"
          aria-label="Table chat"
        >
          <div className="flex items-center justify-between border-b border-primary/15 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-sm font-semibold tracking-wide text-foreground">
                  Table Chat
                </h2>
                <p className="text-[11px] text-muted-foreground">Live discussion & comments</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <span
                className={cn(
                  "mr-1.5 h-2 w-2 rounded-full",
                  isReady ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/50",
                )}
                title={isReady ? "Live" : "Connecting"}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center px-4 py-8">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No comments yet.</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Say hello or discuss rounds with everyone at the table!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = user?.id === msg.user_id;
                const isHost = msg.user_role === "admin";
                const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <PlayerAvatar
                      src={msg.user_avatar}
                      name={msg.user_name}
                      className="h-7 w-7 shrink-0"
                    />

                    <div
                      className={`flex max-w-[80%] flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-0.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          {isMe ? "You" : msg.user_name}
                        </span>
                        {isHost && (
                          <Badge
                            variant="outline"
                            className="h-4 border-amber-500/40 bg-amber-500/10 px-1 text-[9px] font-semibold text-amber-400 gap-0.5"
                          >
                            <Crown className="h-2.5 w-2.5" />
                            Host
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                          {timeStr}
                        </span>
                      </div>

                      <div
                        className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words ${
                          isMe
                            ? "rounded-tr-xs bg-primary text-primary-foreground font-normal shadow-sm"
                            : isHost
                              ? "rounded-tl-xs bg-amber-500/10 border border-amber-500/20 text-foreground"
                              : "rounded-tl-xs bg-elevated text-foreground"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-primary/15 bg-elevated/40 p-2.5"
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message or comment..."
              maxLength={1000}
              disabled={!isMember || sendM.isPending}
              className="h-10 border-primary/20 bg-elevated/80 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/40"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!text.trim() || sendM.isPending || !isMember}
              className="h-10 px-3 shrink-0 font-semibold gap-1.5"
            >
              {sendM.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </Button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? "Minimize table chat" : "Open table chat"}
        className={cn(
          "pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-[0_8px_28px_color-mix(in_oklab,var(--primary)_42%,transparent)]",
          "transition-transform duration-150 hover:brightness-110 active:scale-95",
          open && "ring-2 ring-primary/40",
        )}
      >
        {open ? <Minus className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        {!open && unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
        {!open && isReady ? (
          <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-primary bg-emerald-400" />
        ) : null}
      </button>
    </div>
  );
}
