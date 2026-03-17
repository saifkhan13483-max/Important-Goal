import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import type { ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "http";

const isReplit = process.env.REPL_ID !== undefined;

function suppressPostCSSFromWarning() {
  return {
    name: "suppress-postcss-from-warning",
    enforce: "pre" as const,
    configResolved() {
      const original = console.warn.bind(console);
      console.warn = (...args: unknown[]) => {
        if (
          typeof args[0] === "string" &&
          args[0].includes("`from` option")
        ) {
          return;
        }
        original(...args);
      };
    },
  };
}

/**
 * groqProxyPlugin — adds a server-side /api/groq-proxy endpoint to the Vite
 * dev server so the GROQ_API_KEY never reaches the browser. The key is read
 * from process.env.GROQ_API_KEY (no VITE_ prefix, therefore not bundled).
 */
function groqProxyPlugin() {
  return {
    name: "groq-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        "/api/groq-proxy",
        (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }
          const key = process.env.GROQ_API_KEY;
          if (!key) {
            res.statusCode = 503;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "AI unavailable" }));
            return;
          }
          let body = "";
          req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
          req.on("end", async () => {
            try {
              const upstream = await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${key}`,
                  },
                  body,
                },
              );
              const data = await upstream.json();
              res.statusCode = upstream.status;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(data));
            } catch {
              res.statusCode = 502;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "AI unavailable" }));
            }
          });
        },
      );
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
    plugins: [suppressPostCSSFromWarning(), groqProxyPlugin(), react(), ...replitPlugins],
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
            if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
              return "react-vendor";
            }
            if (id.includes("node_modules/firebase/") || id.includes("node_modules/@firebase/")) {
              return "firebase";
            }
            if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-") || id.includes("node_modules/victory-")) {
              return "charts";
            }
            if (id.includes("node_modules/framer-motion")) {
              return "motion";
            }
            if (id.includes("node_modules/@radix-ui/")) {
              return "radix";
            }
            if (id.includes("node_modules/@stripe/") || id.includes("node_modules/stripe")) {
              return "stripe";
            }
            if (id.includes("node_modules/@emailjs/")) {
              return "emailjs";
            }
            if (
              id.includes("node_modules/date-fns") ||
              id.includes("node_modules/zod") ||
              id.includes("node_modules/wouter") ||
              id.includes("node_modules/clsx") ||
              id.includes("node_modules/class-variance-authority") ||
              id.includes("node_modules/tailwind-merge")
            ) {
              return "utils";
            }
          },
        },
      },
    },
    server: {
      port: 5000,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    preview: {
      port: 5000,
      host: "0.0.0.0",
    },
  };
});
