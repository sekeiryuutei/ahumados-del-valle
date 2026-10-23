// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [VitePWA({
    strategies: "generateSW", filename: "sw.js", outDir: "dist/client", manifest: false,
    injectRegister: null, registerType: "autoUpdate", devOptions: { enabled: false },
    workbox: {
      navigateFallback: null, cleanupOutdatedCaches: true,
      globPatterns: ["**/*.{js,css,png,jpg,webmanifest}"],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      runtimeCaching: [
        { urlPattern: ({ request, url }) => request.mode === "navigate" && url.origin === self.location.origin && !url.pathname.startsWith("/~oauth") && !url.pathname.startsWith("/api/"), handler: "NetworkFirst", options: { cacheName: "adv-navigation", networkTimeoutSeconds: 3, cacheableResponse: { statuses: [200] }, expiration: { maxEntries: 80, maxAgeSeconds: 7 * 86400 } } },
        { urlPattern: ({ url }) => url.origin === self.location.origin && /^\/assets\/.*-[\w-]{8,}\.(js|css|png|jpg)$/.test(url.pathname), handler: "CacheFirst", options: { cacheName: "adv-assets", expiration: { maxEntries: 150, maxAgeSeconds: 30 * 86400 } } },
      ],
    },
  })],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
