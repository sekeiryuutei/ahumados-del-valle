import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

const GITHUB_PAGES_BASE = "/ahumados-del-valle/";

export default defineConfig(({ mode }) => {
  const isPages = mode === "pages";
  const rawBase = isPages ? (process.env["PAGES_BASE"] ?? GITHUB_PAGES_BASE) : "/";
  const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
  const routerBasepath = base === "/" ? "/" : base.replace(/\/$/, "");

  const plugins = [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
      ...(isPages
        ? {
            router: { basepath: routerBasepath },
            spa: { enabled: true },
          }
        : {}),
    }),
    viteReact(),
    nitro({
      preset: "node-server",
    }),
  ];

  if (!isPages) {
    plugins.push(
      VitePWA({
        strategies: "generateSW",
        filename: "sw.js",
        outDir: "dist/client",
        manifest: false,
        injectRegister: null,
        registerType: "autoUpdate",
        devOptions: { enabled: false },
        workbox: {
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          globPatterns: ["**/*.{js,css,png,jpg,webmanifest}"],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" &&
                url.origin === self.location.origin &&
                !url.pathname.startsWith("/~oauth") &&
                !url.pathname.startsWith("/api/"),
              handler: "NetworkFirst",
              options: {
                cacheName: "adv-navigation",
                networkTimeoutSeconds: 3,
                cacheableResponse: { statuses: [200] },
                expiration: { maxEntries: 80, maxAgeSeconds: 7 * 86400 },
              },
            },
            {
              urlPattern: ({ url }) =>
                url.origin === self.location.origin &&
                /^\/assets\/.*-[\w-]{8,}\.(js|css|png|jpg)$/.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "adv-assets",
                expiration: { maxEntries: 150, maxAgeSeconds: 30 * 86400 },
              },
            },
          ],
        },
      }),
    );
  }

  return {
    base,
    plugins,
  };
});
