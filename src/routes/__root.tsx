import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import "../i18n";
import { MarketRealtimeProvider } from "@/components/MarketRealtimeProvider";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { WebsocketContextProvider } from "@/components/WebsocketProvider";
import { WalletRealtimeListener } from "@/hooks/useWalletRealtime";
import { useSessionBootstrap } from "@/hooks/useSessionBootstrap";
import { useTheme } from "@/hooks/useTheme";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { buildDefaultSiteMeta } from "@/lib/seo/marketShareMeta";
import { getSiteUrl } from "@/lib/app-url";

function NotFoundComponent() {
  return (
    <div className="game-shell flex min-h-screen items-center justify-center px-4">
      <div className="hud-panel max-w-md rounded-2xl p-8 text-center">
        <h1 className="text-7xl font-bold tracking-wide">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Page not found.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 font-display text-sm font-semibold text-primary-foreground"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="game-shell flex min-h-screen items-center justify-center px-4">
      <div className="hud-panel max-w-md rounded-2xl p-8 text-center">
        <h1 className="text-xl font-semibold tracking-wide">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-lg bg-primary px-4 py-2 font-display text-sm font-semibold text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const siteMeta = buildDefaultSiteMeta(getSiteUrl());
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        ...siteMeta.meta,
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Rajdhani:wght@500;600;700&display=swap",
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Restore theme before first paint to avoid FOUC. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { resolvedTheme } = useTheme();
  useSessionBootstrap();
  return (
    <QueryClientProvider client={queryClient}>
      <WebsocketContextProvider>
        <MarketRealtimeProvider>
          <WalletRealtimeListener />
          <div className="min-h-screen w-full overflow-x-hidden text-foreground">
            <Navbar />
            <Outlet />
            <Toaster position="top-right" theme={resolvedTheme} richColors />
          </div>
        </MarketRealtimeProvider>
      </WebsocketContextProvider>
    </QueryClientProvider>
  );
}
