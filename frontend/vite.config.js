import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        // Serve static .json files from public/ directly, don't proxy them
        bypass(req) {
          if (req.url && req.url.endsWith(".json")) return req.url;
          return null;
        },
      },
    },
  },
});
