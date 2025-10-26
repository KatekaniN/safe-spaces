import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
