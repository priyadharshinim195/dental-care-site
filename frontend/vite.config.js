import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_TARGET = process.env.VITE_API_TARGET || "http://127.0.0.1:8000";

// Serve admin.html for every /admin route (dev and `vite preview`), so the dashboard
// is a separate entry point with its own CSS and bundle, away from the public site.
function adminFallback() {
  const rewrite = (req, _res, next) => {
    const url = req.url || "";
    if ((url === "/admin" || url.startsWith("/admin/")) && !url.includes(".")) {
      req.url = "/admin.html";
    }
    next();
  };
  return {
    name: "admin-html-fallback",
    configureServer(server) { server.middlewares.use(rewrite); },
    configurePreviewServer(server) { server.middlewares.use(rewrite); },
  };
}

const proxy = {
  "/api": { target: API_TARGET, changeOrigin: false },
  "/media": { target: API_TARGET, changeOrigin: false },
};

export default defineConfig({
  plugins: [react(), adminFallback()],
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        admin: fileURLToPath(new URL("./admin.html", import.meta.url)),
      },
    },
  },
  test: { environment: "jsdom", setupFiles: ["./src/tests/setup.js"], globals: true },
});
