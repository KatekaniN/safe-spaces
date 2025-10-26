import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["icons/*.png", "offline.html"],
      manifest: {
        name: "Safe Spaces",
        short_name: "Safe Spaces",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#8764C1",
        icons: [
          { src: "/icons/icon-48x48.png", sizes: "48x48", type: "image/png" },
          { src: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
          { src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
          { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
          { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
          { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
          { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-256x256.png", sizes: "256x256", type: "image/png" },
          { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
          { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" }
        ],
      },
      workbox: {
        navigateFallback: "/offline.html",
        runtimeCaching: [
          // Static assets
          {
            urlPattern: ({ request }) =>
              ["style", "script", "worker"].includes(request.destination),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "assets-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          // Images & icons
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "images-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          // Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*$/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // Firebase Storage download URLs
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "firebase-storage",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          // Google Maps JS API and tiles (best-effort)
          {
            urlPattern: /^(https:\/\/maps\.googleapis\.com|https:\/\/maps\.gstatic\.com)\/.*$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-maps",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1200, // raise limit a bit; primary optimization is manualChunks below
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
          googlemaps: [
            "@vis.gl/react-google-maps",
            "@googlemaps/markerclusterer",
          ],
        },
      },
    },
  },
});
