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

  if (url === "/api/ai-proxy") {
    if (method !== "POST") { res.statusCode = 405; res.end("Method Not Allowed"); return; }
    const key = process.env.GEMINI_API_KEY;
    if (!key) { jsonRes(res, 503, { error: "AI unavailable" }); return; }
    const rawBody = await new Promise<string>((resolve) => {
      let b = "";
      req.on("data", (c: Buffer) => { b += c.toString(); });
      req.on("end", () => resolve(b));
      req.on("error", () => resolve(""));
    });
    try {
      const parsed = JSON.parse(rawBody);
      const model = parsed.model ?? "gemini-2.5-flash";

      // Separate system messages from chat messages
      const systemMessages = (parsed.messages ?? []).filter((m: any) => m.role === "system");
      const chatMessages = (parsed.messages ?? []).filter((m: any) => m.role !== "system");
      const contents = chatMessages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const geminiBody: Record<string, unknown> = {
        contents,
        generationConfig: {
          ...(parsed.max_tokens ? { maxOutputTokens: parsed.max_tokens } : {}),
          ...(parsed.temperature !== undefined ? { temperature: parsed.temperature } : {}),
        },
      };
      if (systemMessages.length > 0) {
        geminiBody.system_instruction = {
          parts: [{ text: systemMessages.map((m: any) => m.content).join("\n") }],
        };
      }

      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(geminiBody) },
      );
      const data = await upstream.json() as any;
      if (!upstream.ok) { jsonRes(res, upstream.status, { error: data?.error?.message ?? "Gemini error" }); return; }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      jsonRes(res, 200, { choices: [{ message: { role: "assistant", content: text } }] });
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
            "/api/ai-proxy": {
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
        "@": path.resolve(import.meta.dirname, "src"),
        "@shared": path.resolve(import.meta.dirname, "src", "types"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
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
