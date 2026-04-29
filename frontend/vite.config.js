import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://def-lab.de",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "https://def-lab.de",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
