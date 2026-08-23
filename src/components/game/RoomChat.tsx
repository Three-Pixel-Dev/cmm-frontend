import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Loader2, Crown, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useWebsocketSubscription } from "@/components/WebsocketProvider";
import { useRoomMessages, useSendRoomMessage } from "@/hooks/useRooms";
import { useAuth } from "@/store/useAuth";

interface RoomChatProps {
  roomId: string;
  isMember?: boolean;
}

export function RoomChat({ roomId, isMember = true }: RoomChatProps) {
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const user = useAuth((s) => s.user);
  const { data: messages = [], isLoading } = useRoomMessages(roomId, isMember);
  const sendM = useSendRoomMessage(roomId);
  const { isReady } = useWebsocketSubscription();

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, [messages.length]);

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
    <section className="flex h-[460px] flex-col rounded-2xl border border-white/10 bg-black/40 shadow-xl backdrop-blur-sm">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-foreground">Table Chat</h2>
            <p className="text-[11px] text-muted-foreground">Live discussion & comments</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`flex h-2 w-2 rounded-full ${
              isReady ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"
            }`}
          />
          <span className="text-xs font-medium text-muted-foreground">
            {messages.length} {messages.length === 1 ? "message" : "messages"}
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
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
            const initials = (msg.user_name || "P").slice(0, 2).toUpperCase();

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                <Avatar className="h-7 w-7 shrink-0 border border-white/10">
                  {msg.user_avatar ? (
                    <AvatarImage src={msg.user_avatar} alt={msg.user_name} />
                  ) : null}
                  <AvatarFallback className="bg-white/10 text-[11px] font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className={`flex max-w-[80%] flex-col ${isMe ? "items-end" : "items-start"}`}>
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
                          : "rounded-tl-xs bg-white/10 text-foreground"
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

      {/* Input Box */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-white/10 p-3 bg-black/20 rounded-b-2xl"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message or comment..."
          maxLength={1000}
          disabled={!isMember || sendM.isPending}
          className="h-10 border-white/10 bg-black/40 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/40"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!text.trim() || sendM.isPending || !isMember}
          className="h-10 px-4 shrink-0 font-semibold gap-1.5"
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
  );
}
