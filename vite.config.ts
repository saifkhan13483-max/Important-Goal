import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import type { ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "http";

const isReplit = process.env.REPL_ID !== undefined;

const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || "";
const STORE_PATH = path.join(process.cwd(), "server", "workspaces_data.json");

/* ─────────────────────────────────────────────
   Workspace data store helpers
───────────────────────────────────────────── */
interface WorkspaceMemberStats {
  activeSystems: number;
  bestStreak: number;
  completionRate: number;
  weeklyRate: number;
  last7: { dateKey: string; done: number; total: number }[];
  syncedAt: string;
}
interface WorkspaceMember {
  userId: string;
  email: string;
  name: string;
  role: "owner" | "member";
  joinedAt: string;
  stats?: WorkspaceMemberStats;
}
interface WorkspaceRecord {
  id: string;
  ownerId: string;
  name: string;
  inviteCode: string;
  members: WorkspaceMember[];
  createdAt: string;
}

function loadStore(): Record<string, WorkspaceRecord> {
  try {
    if (fs.existsSync(STORE_PATH)) return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
  } catch { /* */ }
  return {};
}
function saveStore(store: Record<string, WorkspaceRecord>) {
  try { fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8"); } catch { /* */ }
}
function generateId() { return Math.random().toString(36).substring(2, 10) + Date.now().toString(36); }
function generateCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }

async function verifyToken(idToken: string): Promise<{ uid: string; email: string } | null> {
  if (!FIREBASE_API_KEY) return null;
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.users?.length) return null;
    const u = data.users[0];
    return { uid: u.localId, email: u.email || "" };
  } catch { return null; }
}

function readBody(req: IncomingMessage): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

function extractToken(req: IncomingMessage): string | null {
  const auth = req.headers["authorization"] as string | undefined;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

function jsonRes(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

/* ─────────────────────────────────────────────
   Vite plugins
───────────────────────────────────────────── */
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

function groqProxyPlugin() {
  return {
    name: "groq-proxy",
    enforce: "pre" as const,
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        "/api/groq-proxy",
        (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== "POST") { res.statusCode = 405; res.end("Method Not Allowed"); return; }
          const key = process.env.GROQ_API_KEY;
          if (!key) { jsonRes(res, 503, { error: "AI unavailable" }); return; }
          let body = "";
          req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
          req.on("end", async () => {
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
          });
        },
      );
    },
  };
}

async function handleWorkspaceRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = (req.url || "").split("?")[0]; // strip query string
  const method = req.method || "GET";

  const token = extractToken(req);
  if (!token) { jsonRes(res, 401, { error: "Unauthorized" }); return; }

  let caller: { uid: string; email: string } | null = null;
  try {
    caller = await verifyToken(token);
  } catch (e) {
    console.error("[workspace-api] verifyToken error:", e);
    jsonRes(res, 500, { error: "Token verification failed" });
    return;
  }
  if (!caller) { jsonRes(res, 401, { error: "Invalid token" }); return; }
  const { uid, email: callerEmail } = caller;

  const store = loadStore();

  /* GET /api/workspace */
  if (method === "GET" && url === "/api/workspace") {
    const ws = Object.values(store).find(w => w.members.some(m => m.userId === uid));
    jsonRes(res, 200, ws || null);
    return;
  }

  /* GET /api/workspace/by-code/:code */
  const byCodeMatch = url.match(/^\/api\/workspace\/by-code\/([^/?]+)/);
  if (method === "GET" && byCodeMatch) {
    const code = decodeURIComponent(byCodeMatch[1]).toUpperCase();
    const ws = Object.values(store).find(w => w.inviteCode === code);
    if (!ws) { jsonRes(res, 404, { error: "Workspace not found" }); return; }
    jsonRes(res, 200, ws);
    return;
  }

  /* POST /api/workspace/create */
  if (method === "POST" && url === "/api/workspace/create") {
    const body = await readBody(req);
    const existing = Object.values(store).find(w => w.members.some(m => m.userId === uid));
    if (existing) { jsonRes(res, 409, { error: "Already in a workspace", workspace: existing }); return; }
    const now = new Date().toISOString();
    const ws: WorkspaceRecord = {
      id: generateId(),
      ownerId: uid,
      name: (body.name as string)?.trim() || `${(body.displayName as string) || "My"} Team`,
      inviteCode: generateCode(),
      members: [{ userId: uid, email: (body.email as string) || callerEmail, name: (body.displayName as string) || "You", role: "owner", joinedAt: now }],
      createdAt: now,
    };
    store[ws.id] = ws;
    saveStore(store);
    jsonRes(res, 200, ws);
    return;
  }

  /* POST /api/workspace/join */
  if (method === "POST" && url === "/api/workspace/join") {
    const body = await readBody(req);
    const alreadyIn = Object.values(store).find(w => w.members.some(m => m.userId === uid));
    if (alreadyIn) { jsonRes(res, 409, { error: "Already in a workspace", workspace: alreadyIn }); return; }
    const code = ((body.code as string) || "").toUpperCase();
    const ws = Object.values(store).find(w => w.inviteCode === code);
    if (!ws) { jsonRes(res, 404, { error: "Workspace not found. Check the invite code." }); return; }
    ws.members.push({ userId: uid, email: (body.email as string) || callerEmail, name: (body.displayName as string) || "Member", role: "member", joinedAt: new Date().toISOString() });
    store[ws.id] = ws;
    saveStore(store);
    jsonRes(res, 200, ws);
    return;
  }

  /* POST /api/workspace/leave */
  if (method === "POST" && url === "/api/workspace/leave") {
    const ws = Object.values(store).find(w => w.members.some(m => m.userId === uid));
    if (!ws) { jsonRes(res, 404, { error: "Not in a workspace" }); return; }
    ws.members = ws.members.filter(m => m.userId !== uid);
    store[ws.id] = ws;
    saveStore(store);
    jsonRes(res, 200, { ok: true });
    return;
  }

  /* DELETE /api/workspace/members/:memberId */
  const removeMemberMatch = url.match(/^\/api\/workspace\/members\/([^/?]+)/);
  if (method === "DELETE" && removeMemberMatch) {
    const memberId = removeMemberMatch[1];
    const ws = Object.values(store).find(w => w.ownerId === uid);
    if (!ws) { jsonRes(res, 403, { error: "Not a workspace owner" }); return; }
    ws.members = ws.members.filter(m => m.userId !== memberId);
    store[ws.id] = ws;
    saveStore(store);
    jsonRes(res, 200, ws);
    return;
  }

  /* POST /api/workspace/regen-code */
  if (method === "POST" && url === "/api/workspace/regen-code") {
    const ws = Object.values(store).find(w => w.ownerId === uid);
    if (!ws) { jsonRes(res, 403, { error: "Not a workspace owner" }); return; }
    ws.inviteCode = generateCode();
    store[ws.id] = ws;
    saveStore(store);
    jsonRes(res, 200, { inviteCode: ws.inviteCode });
    return;
  }

  /* POST /api/workspace/sync-stats */
  if (method === "POST" && url === "/api/workspace/sync-stats") {
    const body = await readBody(req);
    const ws = Object.values(store).find(w => w.members.some(m => m.userId === uid));
    if (!ws) { jsonRes(res, 404, { error: "Not in a workspace" }); return; }
    const member = ws.members.find(m => m.userId === uid);
    if (member && body.stats) {
      member.stats = { ...(body.stats as object), syncedAt: new Date().toISOString() } as WorkspaceMemberStats;
      store[ws.id] = ws;
      saveStore(store);
    }
    jsonRes(res, 200, { ok: true });
    return;
  }

  jsonRes(res, 404, { error: "Unknown workspace route" });
}

function workspacePlugin() {
  return {
    name: "workspace-api",
    enforce: "pre" as const,
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = (req.url || "").split("?")[0];
        if (!url.startsWith("/api/workspace")) { next(); return; }
        // Hand off to async handler; catch all errors and always send a JSON response
        handleWorkspaceRequest(req, res).catch((err) => {
          console.error("[workspace-api] Unhandled error:", err);
          if (!res.headersSent) {
            jsonRes(res, 500, { error: String(err?.message ?? "Server error") });
          }
        });
      });
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
    plugins: [suppressPostCSSFromWarning(), groqProxyPlugin(), workspacePlugin(), react(), ...replitPlugins],
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
