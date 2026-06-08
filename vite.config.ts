import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/parties": { target: "http://localhost:1999", ws: true, changeOrigin: true },
      "/party": { target: "http://localhost:1999", ws: true, changeOrigin: true },
    },
  },
});
