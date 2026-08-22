import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Loader2, Sparkles } from "lucide-react";
import { CreateRoomForm } from "@/components/game/CreateRoomForm";
import { RoomCodeForm } from "@/components/game/RoomCodeForm";
import { RoomListCard } from "@/components/game/RoomListCard";
import { useHydrated } from "@/hooks/useHydrated";
import { useMyRooms } from "@/hooks/useRooms";
import { useAuth } from "@/store/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rooms — SuperCash" },
      {
        name: "description",
        content: "Enter a room code or open a table. Bet prepaid or pay after.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const isHost = useAuth((s) => s.isHost());
  const roomsQ = useMyRooms(hydrated && isLoggedIn);

  return (
    <main className="game-shell">
      <div className="game-felt mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6 lg:py-16">
        <section className="text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Sit down. Play the round.
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Enter a room</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Paste an invite code to join a table. Hosts deal markets as rounds. Pay now or run a
            tab.
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <RoomCodeForm size="lg" autoFocus />
          </div>
          {!isLoggedIn ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Players{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                log in
              </Link>{" "}
              or{" "}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                register
              </Link>
              . Hosts use an{" "}
              <Link to="/host" className="font-semibold text-primary hover:underline">
                access code
              </Link>
              .
            </p>
          ) : null}
        </section>

        {isLoggedIn && isHost ? (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-black/35 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Open a table</h2>
              <p className="mt-1 mb-4 text-sm text-muted-foreground">
                Share the invite code. Players buy in now, later, or free.
              </p>
              <CreateRoomForm />
            </div>
            <MyRoomsPanel loading={roomsQ.isLoading} rooms={roomsQ.data ?? []} />
          </section>
        ) : isLoggedIn ? (
          <MyRoomsPanel loading={roomsQ.isLoading} rooms={roomsQ.data ?? []} />
        ) : null}

        {hydrated && user ? (
          <p className="text-center text-xs text-muted-foreground">
            Signed in as {user.name}. Chips live in your{" "}
            <Link to="/wallet" className="text-primary hover:underline">
              wallet
            </Link>
            .
          </p>
        ) : null}
      </div>
    </main>
  );
}

function MyRoomsPanel({
  loading,
  rooms,
}: {
  loading: boolean;
  rooms: NonNullable<ReturnType<typeof useMyRooms>["data"]>;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-black/25 p-5 sm:p-6">
      <h2 className="text-lg font-semibold">My rooms</h2>
      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rooms.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No tables yet. Enter a code to join one.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {rooms.map((room) => (
            <RoomListCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </section>
  );
}
