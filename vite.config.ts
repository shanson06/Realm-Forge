// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        // The worker is registered only from src/lib/pwa/register-sw.ts, which
        // refuses dev, iframes, and Lovable preview hosts.
        injectRegister: null,
        devOptions: { enabled: false },
        // "prompt" leaves a new worker waiting until the player accepts the
        // update; "autoUpdate" would force skipWaiting and could swap the shell
        // mid-match.
        registerType: "prompt",
        filename: "sw.js",
        // TanStack Start/Nitro emits the browser bundle to .output/public.
        // Generate the worker there so it is served from /sw.js and Workbox can
        // discover the built client assets for offline precaching.
        outDir: ".output/public",
        // public/manifest.webmanifest is the single source of truth.
        manifest: false,
        injectManifest: undefined,
        workbox: {
          // Precache the app shell and the fonts/icons it boots with.
          globPatterns: ["**/*.{js,css,html,woff,woff2,svg,ico}"],
          globIgnores: ["**/node_modules/**", "**/splash/**"],
          cleanupOutdatedCaches: true,
          skipWaiting: false,
          clientsClaim: false,
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          runtimeCaching: [
            {
              // Pages are server-rendered, so there is no static index.html to
              // fall back to. Serve navigations from the network and keep the
              // last good HTML for offline reloads.
              urlPattern: ({ request, url }: { request: Request; url: URL }) =>
                request.mode === "navigate" &&
                !url.pathname.startsWith("/~oauth") &&
                !url.pathname.startsWith("/api/"),
              handler: "NetworkFirst",
              options: {
                cacheName: "realmforge-pages-v1",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              // Card art and cover banners served from Lovable's asset CDN.
              urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/__l5e/assets-v1/"),
              handler: "CacheFirst",
              options: {
                cacheName: "realmforge-card-art-v1",
                expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 90 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ url }: { url: URL }) =>
                url.pathname.startsWith("/icons/") || url.pathname.startsWith("/splash/"),
              handler: "CacheFirst",
              options: {
                cacheName: "realmforge-app-icons-v1",
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: ({ url }: { url: URL }) => url.origin === "https://fonts.googleapis.com",
              handler: "StaleWhileRevalidate",
              options: { cacheName: "realmforge-font-css-v1" },
            },
            {
              urlPattern: ({ url }: { url: URL }) => url.origin === "https://fonts.gstatic.com",
              handler: "CacheFirst",
              options: {
                cacheName: "realmforge-font-files-v1",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Never place a signed-in user's data in a shared cache.
              urlPattern: ({ url, request }: { url: URL; request: Request }) =>
                url.pathname.startsWith("/api/") ||
                url.pathname.startsWith("/_serverFn/") ||
                request.headers.has("Authorization"),
              handler: "NetworkOnly",
            },
          ],
        },
      }),
    ],
  },
});
