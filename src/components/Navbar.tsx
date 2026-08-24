import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, Settings, Smile, Wallet } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";
import { PlayerLookDialog } from "@/components/player/PlayerLookDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { RoomCodeForm } from "@/components/game/RoomCodeForm";
import { useHydrated } from "@/hooks/useHydrated";
import { useProfile } from "@/hooks/useProfile";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/store/useAuth";
import { useTranslation } from "react-i18next";

export function Navbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const [lookOpen, setLookOpen] = useState(false);
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const isHost = useAuth((s) => s.isHost());
  const isGuest = useAuth((s) => s.isGuest());
  const showAuth = hydrated && isLoggedIn;
  const profileQ = useProfile();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* clear local state even if the network call fails */
    }
    logout();
    navigate({ to: "/" });
    setMenuOpen(false);
  };

  return (
    <>
      <header className="hud-rail sticky top-0 z-40 w-full max-w-none backdrop-blur-xl">
        <div className="flex h-14 w-full items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6 lg:px-8 xl:px-10">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <BrandLogo variant="icon" className="sm:hidden" />
            <BrandLogo variant="full" className="hidden sm:flex" />
          </Link>

          <div className="hidden min-w-0 flex-1 md:block">
            <div className="mx-auto max-w-md">
              <RoomCodeForm size="sm" />
            </div>
          </div>

          <nav className="hidden shrink-0 items-center gap-1 md:flex">
            <Link
              to="/"
              className="rounded-lg px-3 py-2 font-display text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-primary/15 text-primary" }}
            >
              Rooms
            </Link>
            {showAuth && !isHost ? (
              <Link
                to="/wallet"
                className="rounded-lg px-3 py-2 font-display text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                activeProps={{ className: "bg-primary/15 text-primary" }}
              >
                Chips
              </Link>
            ) : null}
            {!isHost ? (
              <Link
                to="/host"
                className="rounded-lg px-3 py-2 font-display text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                activeProps={{ className: "bg-primary/15 text-primary" }}
              >
                Host
              </Link>
            ) : null}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <div className="hidden sm:flex">
              <LanguageToggle />
            </div>
            <ThemeToggle className="hidden sm:flex" />
            {showAuth && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Account"
                  >
                    <PlayerAvatar
                      src={profileQ.data?.profile_url}
                      name={user.name}
                      className="h-8 w-8 ring-2 ring-primary/35"
                      fallbackClassName="bg-primary text-primary-foreground text-xs font-semibold"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {isGuest ? t("login.guestSession") : user.email}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setLookOpen(true)}>
                    <Smile className="h-4 w-4" />
                    {t("settings.editLook")}
                  </DropdownMenuItem>
                  {showAuth && !isHost ? (
                    <DropdownMenuItem asChild>
                      <Link to="/wallet">
                        <Wallet className="h-4 w-4" />
                        Chips
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem asChild>
                    <Link to="/settings/profile">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="font-semibold">
                <Link to="/login">Log in</Link>
              </Button>
            )}

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="hud-panel border-l border-primary/20">
                <SheetHeader>
                  <SheetTitle>
                    <BrandLogo variant="full" />
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-1">
                  <div className="mb-4 flex gap-2">
                    <LanguageToggle />
                    <ThemeToggle />
                  </div>
                  <div className="mb-4">
                    <RoomCodeForm size="sm" />
                  </div>
                  <Link
                    to="/"
                    className="rounded-lg px-3 py-2 font-display font-semibold uppercase tracking-[0.12em] hover:bg-primary/10 hover:text-primary"
                    onClick={() => setMenuOpen(false)}
                  >
                    Rooms
                  </Link>
                  {showAuth && !isHost ? (
                    <Link
                      to="/wallet"
                      className="rounded-lg px-3 py-2 font-display font-semibold uppercase tracking-[0.12em] hover:bg-primary/10 hover:text-primary"
                      onClick={() => setMenuOpen(false)}
                    >
                      Chips
                    </Link>
                  ) : null}
                  {!isHost ? (
                    <Link
                      to="/host"
                      className="rounded-lg px-3 py-2 font-display font-semibold uppercase tracking-[0.12em] hover:bg-primary/10 hover:text-primary"
                      onClick={() => setMenuOpen(false)}
                    >
                      Host
                    </Link>
                  ) : null}
                  {showAuth ? (
                    <>
                      <button
                        type="button"
                        className="rounded-lg px-3 py-2 text-left font-display font-semibold uppercase tracking-[0.12em] hover:bg-primary/10 hover:text-primary"
                        onClick={() => {
                          setMenuOpen(false);
                          setLookOpen(true);
                        }}
                      >
                        {t("settings.editLook")}
                      </button>
                      <Link
                        to="/settings/profile"
                        className="rounded-lg px-3 py-2 font-display font-semibold uppercase tracking-[0.12em] hover:bg-primary/10 hover:text-primary"
                        onClick={() => setMenuOpen(false)}
                      >
                        Settings
                      </Link>
                    </>
                  ) : null}
                  {!showAuth ? (
                    <Button asChild className="mt-4">
                      <Link to="/login" onClick={() => setMenuOpen(false)}>
                        Log in
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setMenuOpen(false);
                        void handleLogout();
                      }}
                    >
                      Log out
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <PlayerLookDialog open={lookOpen} onOpenChange={setLookOpen} />
    </>
  );
}
