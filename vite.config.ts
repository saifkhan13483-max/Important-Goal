import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import http from "http";
import type { IncomingMessage, ServerResponse } from "http";

const isReplit = process.env.REPL_ID !== undefined;

const API_PORT = 35001;

function jsonRes(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = (req.url || "").split("?")[0];
  const method = req.method || "GET";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (method === "OPTIONS") { res.statusCode = 204; res.end(); return; }

  if (url === "/api/groq-proxy") {
    if (method !== "POST") { res.statusCode = 405; res.end("Method Not Allowed"); return; }
    const key = process.env.GROQ_API_KEY;
    if (!key) { jsonRes(res, 503, { error: "AI unavailable" }); return; }
    const body = await new Promise<string>((resolve) => {
      let b = "";
      req.on("data", (c: Buffer) => { b += c.toString(); });
      req.on("end", () => resolve(b));
      req.on("error", () => resolve(""));
    });
    try {
      const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body,
      });
      const data = await upstream.json();
      res.statusCode = upstream.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
    } catch { jsonRes(res, 502, { error: "AI unavailable" }); }
    return;
  }

  jsonRes(res, 404, { error: "Not found" });
}

function startApiServer() {
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      console.error("[api-server] Unhandled error:", err);
      if (!res.headersSent) jsonRes(res, 500, { error: String(err?.message ?? "Server error") });
    });
  });
  server.listen(API_PORT, "127.0.0.1", () => {
    console.log(`[api-server] Listening on port ${API_PORT}`);
  });
  server.on("error", (err) => {
    console.error("[api-server] Failed to start:", err);
  });
  return server;
}

function suppressPostCSSFromWarning() {
  return {
    name: "suppress-postcss-from-warning",
    enforce: "pre" as const,
    configResolved() {
      const original = console.warn.bind(console);
      console.warn = (...args: unknown[]) => {
        if (typeof args[0] === "string" && args[0].includes("`from` option")) return;
        original(...args);
      };
    },
  };
}

function apiPlugin() {
  let apiServer: ReturnType<typeof http.createServer> | null = null;
  return {
    name: "api-plugin",
    enforce: "pre" as const,
    config() {
      return {
        server: {
          proxy: {
            "/api/groq-proxy": {
              target: `http://127.0.0.1:${API_PORT}`,
              changeOrigin: false,
              secure: false,
            },
          },
        },
      };
    },
    configureServer() {
      if (!apiServer) {
        apiServer = startApiServer();
      }
    },
  };
}

export default defineConfig(async () => {
  const replitPlugins = isReplit
    ? await Promise.all([
        import("@replit/vite-plugin-runtime-error-modal").then(m => m.default()),
        import("@replit/vite-plugin-cartographer").then(m => m.cartographer()),
        import("@replit/vite-plugin-dev-banner").then(m => m.devBanner()),
      ])
    : [];

  return {
    plugins: [suppressPostCSSFromWarning(), apiPlugin(), react(), ...replitPlugins],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "client", "src", "types"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) return "react-vendor";
            if (id.includes("node_modules/firebase/") || id.includes("node_modules/@firebase/")) return "firebase";
            if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-") || id.includes("node_modules/victory-")) return "charts";
            if (id.includes("node_modules/framer-motion")) return "motion";
            if (id.includes("node_modules/@radix-ui/")) return "radix";
            if (id.includes("node_modules/@stripe/") || id.includes("node_modules/stripe")) return "stripe";
            if (id.includes("node_modules/@emailjs/")) return "emailjs";
            if (id.includes("node_modules/date-fns") || id.includes("node_modules/zod") || id.includes("node_modules/wouter") || id.includes("node_modules/clsx") || id.includes("node_modules/class-variance-authority") || id.includes("node_modules/tailwind-merge")) return "utils";
          },
        },
      },
    },
    server: {
      port: 5000,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: { strict: true, deny: ["**/.*"] },
    },
    preview: { port: 5000, host: "0.0.0.0" },
  };
});
