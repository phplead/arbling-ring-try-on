// frontend/vite.config.js
import { defineConfig } from "vite";
import { dirname } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";

process.env.VITE_SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;

const BACKEND_PORT = process.env.BACKEND_PORT || "3000";
const proxyOptions = {
  target: `http://127.0.0.1:${BACKEND_PORT}`,
  changeOrigin: true,
  secure: false,
};

export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  plugins: [react()],
  resolve: { preserveSymlinks: true },
  server: {
    host: "localhost",
    port: process.env.FRONTEND_PORT || 3001,
    // --- NEW: Allow Cloudflare Tunnel domains ---
    allowedHosts: [
      "localhost",
      ".trycloudflare.com",   // <-- this allows may-united-para-acts.trycloudflare.com
    ],
    // -------------------------------------------
    proxy: {
      "^/api(/.*)?$": proxyOptions,
    },
  },
});