import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // allow all hosts
    port: 5000, // dev server port
    allowedHosts: "all", // allow any hostname
    hmr: {
      host: undefined, // use same host as server
      protocol: "ws", // default websocket
      port: 5000, // match server port if needed
    },
  },
  preview: {
    host: true, // allow external preview
    port: 5000,
  },
});
