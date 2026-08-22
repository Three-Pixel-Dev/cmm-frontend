// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

const isVercel = process.env.VERCEL === "1";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  // Cloudflare Workers build locally; Nitro + Vercel preset when deployed on Vercel.
  cloudflare: isVercel ? false : undefined,
  plugins: isVercel ? [nitro()] : undefined,
  // Dev UI on 5173; API gateway stays on 8080 (see VITE_API_BASE_URL in .env).
  vite: {
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        "/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
        },
        "/ws": {
          target: "http://localhost:8080",
          ws: true,
          changeOrigin: true,
        },
      },
    },
  },
  tanstackStart: isVercel
    ? {}
    : {
        server: { entry: "server" },
      },
});
