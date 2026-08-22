import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, Settings, Wallet } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useWallet, parseWalletAmount } from "@/hooks/useWallet";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/store/useAuth";
import { fmtLedger } from "@/lib/format";

export function Navbar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const isHost = useAuth((s) => s.isHost());
  const showAuth = hydrated && isLoggedIn;
  const { data: wallet } = useWallet(showAuth ? user?.id : undefined);
  const balance = parseWalletAmount(wallet?.amount);

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

  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full max-w-none border-b border-border/60 bg-background/80 backdrop-blur-xl">
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
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-accent/60 text-foreground font-medium" }}
          >
            Rooms
          </Link>
          {showAuth ? (
            <Link
              to="/wallet"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
              activeProps={{ className: "bg-accent/60 text-foreground font-medium" }}
            >
              Chips
            </Link>
          ) : null}
          {!isHost ? (
            <Link
              to="/host"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
              activeProps={{ className: "bg-accent/60 text-foreground font-medium" }}
            >
              Host
            </Link>
          ) : null}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {showAuth && user ? (
            <Link
              to="/wallet"
              className="flex items-center gap-1.5 rounded-lg bg-elevated px-2 py-1.5 transition-colors hover:bg-accent sm:px-3 sm:py-2"
            >
              <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="max-w-[5.5rem] truncate text-[10px] font-semibold tabular-nums sm:max-w-none sm:text-xs">
                {fmtLedger(balance, "real", { compact: true })}
              </span>
            </Link>
          ) : null}
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
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/wallet">
                    <Wallet className="h-4 w-4" />
                    Chips
                  </Link>
                </DropdownMenuItem>
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
            <SheetContent side="right">
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
                  className="rounded-md px-3 py-2 hover:bg-accent"
                  onClick={() => setMenuOpen(false)}
                >
                  Rooms
                </Link>
                {showAuth ? (
                  <Link
                    to="/wallet"
                    className="rounded-md px-3 py-2 hover:bg-accent"
                    onClick={() => setMenuOpen(false)}
                  >
                    Chips
                  </Link>
                ) : null}
                {!isHost ? (
                  <Link
                    to="/host"
                    className="rounded-md px-3 py-2 hover:bg-accent"
                    onClick={() => setMenuOpen(false)}
                  >
                    Host
                  </Link>
                ) : null}
                {showAuth ? (
                  <Link
                    to="/settings/profile"
                    className="rounded-md px-3 py-2 hover:bg-accent"
                    onClick={() => setMenuOpen(false)}
                  >
                    Settings
                  </Link>
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
  );
}
