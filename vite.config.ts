import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api/bilibili": {
        target: "https://api.bilibili.com",
        changeOrigin: true,
        secure: true,
        rewrite: (pathValue) => pathValue.replace(/^\/api\/bilibili/, "/x/web-interface"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
  },
});
