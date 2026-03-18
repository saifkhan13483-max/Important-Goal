import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "5000", 10);
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || "";

const app = express();
app.use(express.json({ limit: "20kb" }));

/* ─────────────────────────────────────────────
   Groq proxy
───────────────────────────────────────────── */
app.post("/api/groq-proxy", async (req, res): Promise<void> => {
  const key = process.env.GROQ_API_KEY;
  if (!key) { res.status(503).json({ error: "AI unavailable" }); return; }
  try {
    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(req.body),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch {
    res.status(502).json({ error: "AI unavailable" });
  }
});

/* ─────────────────────────────────────────────
   Workspace data store (file-backed)
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

const STORE_PATH = path.join(__dirname, "..", "server", "workspaces_data.json");

function loadStore(): Record<string, WorkspaceRecord> {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
    }
  } catch { /* ignore */ }
  return {};
}

function saveStore(store: Record<string, WorkspaceRecord>) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch { /* ignore */ }
}

function generateId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* ─────────────────────────────────────────────
   Firebase ID token verification
───────────────────────────────────────────── */
async function verifyToken(idToken: string): Promise<{ uid: string; email: string } | null> {
  if (!FIREBASE_API_KEY) return null;
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.users?.length) return null;
    const u = data.users[0];
    return { uid: u.localId, email: u.email || "" };
  } catch {
    return null;
  }
}

function extractToken(req: express.Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

/* ─────────────────────────────────────────────
   Workspace API routes
───────────────────────────────────────────── */

// GET /api/workspace — current user's workspace (owned or joined)
app.get("/api/workspace", async (req, res): Promise<void> => {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const caller = await verifyToken(token);
  if (!caller) { res.status(401).json({ error: "Invalid token" }); return; }

  const store = loadStore();
  const ws = Object.values(store).find(
    (w) => w.members.some((m) => m.userId === caller.uid),
  );
  res.json(ws || null);
});

// GET /api/workspace/by-code/:code — look up workspace by invite code
app.get("/api/workspace/by-code/:code", async (req, res): Promise<void> => {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const caller = await verifyToken(token);
  if (!caller) { res.status(401).json({ error: "Invalid token" }); return; }

  const store = loadStore();
  const ws = Object.values(store).find(
    (w) => w.inviteCode === req.params.code.toUpperCase(),
  );
  if (!ws) { res.status(404).json({ error: "Workspace not found" }); return; }
  res.json(ws);
});

// POST /api/workspace/create
app.post("/api/workspace/create", async (req, res): Promise<void> => {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const caller = await verifyToken(token);
  if (!caller) { res.status(401).json({ error: "Invalid token" }); return; }

  const { name, email, displayName } = req.body as {
    name: string; email: string; displayName: string;
  };

  const store = loadStore();

  // Check if already in a workspace
  const existing = Object.values(store).find(
    (w) => w.members.some((m) => m.userId === caller.uid),
  );
  if (existing) { res.status(409).json({ error: "Already in a workspace", workspace: existing }); return; }

  const now = new Date().toISOString();
  const ws: WorkspaceRecord = {
    id: generateId(),
    ownerId: caller.uid,
    name: name?.trim() || `${displayName || "My"} Team`,
    inviteCode: generateCode(),
    members: [{
      userId: caller.uid,
      email: email || caller.email,
      name: displayName || "You",
      role: "owner",
      joinedAt: now,
    }],
    createdAt: now,
  };

  store[ws.id] = ws;
  saveStore(store);
  res.json(ws);
});

// POST /api/workspace/join
app.post("/api/workspace/join", async (req, res): Promise<void> => {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const caller = await verifyToken(token);
  if (!caller) { res.status(401).json({ error: "Invalid token" }); return; }

  const { code, email, displayName } = req.body as {
    code: string; email: string; displayName: string;
  };

  const store = loadStore();

  // Already in a workspace?
  const alreadyIn = Object.values(store).find(
    (w) => w.members.some((m) => m.userId === caller.uid),
  );
  if (alreadyIn) {
    res.status(409).json({ error: "Already in a workspace", workspace: alreadyIn });
    return;
  }

  const ws = Object.values(store).find(
    (w) => w.inviteCode === code?.toUpperCase(),
  );
  if (!ws) { res.status(404).json({ error: "Workspace not found. Check the invite code." }); return; }

  const now = new Date().toISOString();
  ws.members.push({
    userId: caller.uid,
    email: email || caller.email,
    name: displayName || "Member",
    role: "member",
    joinedAt: now,
  });
  store[ws.id] = ws;
  saveStore(store);
  res.json(ws);
});

// POST /api/workspace/leave
app.post("/api/workspace/leave", async (req, res): Promise<void> => {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const caller = await verifyToken(token);
  if (!caller) { res.status(401).json({ error: "Invalid token" }); return; }

  const store = loadStore();
  const ws = Object.values(store).find(
    (w) => w.members.some((m) => m.userId === caller.uid),
  );
  if (!ws) { res.status(404).json({ error: "Not in a workspace" }); return; }

  ws.members = ws.members.filter((m) => m.userId !== caller.uid);
  store[ws.id] = ws;
  saveStore(store);
  res.json({ ok: true });
});

// DELETE /api/workspace/members/:memberId — owner removes a member
app.delete("/api/workspace/members/:memberId", async (req, res): Promise<void> => {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const caller = await verifyToken(token);
  if (!caller) { res.status(401).json({ error: "Invalid token" }); return; }

  const store = loadStore();
  const ws = Object.values(store).find((w) => w.ownerId === caller.uid);
  if (!ws) { res.status(403).json({ error: "Not a workspace owner" }); return; }

  ws.members = ws.members.filter((m) => m.userId !== req.params.memberId);
  store[ws.id] = ws;
  saveStore(store);
  res.json(ws);
});

// POST /api/workspace/regen-code — owner regenerates invite code
app.post("/api/workspace/regen-code", async (req, res): Promise<void> => {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const caller = await verifyToken(token);
  if (!caller) { res.status(401).json({ error: "Invalid token" }); return; }

  const store = loadStore();
  const ws = Object.values(store).find((w) => w.ownerId === caller.uid);
  if (!ws) { res.status(403).json({ error: "Not a workspace owner" }); return; }

  ws.inviteCode = generateCode();
  store[ws.id] = ws;
  saveStore(store);
  res.json({ inviteCode: ws.inviteCode });
});

// POST /api/workspace/sync-stats — member pushes their own computed stats
app.post("/api/workspace/sync-stats", async (req, res): Promise<void> => {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const caller = await verifyToken(token);
  if (!caller) { res.status(401).json({ error: "Invalid token" }); return; }

  const { stats } = req.body as { stats: WorkspaceMemberStats };
  const store = loadStore();
  const ws = Object.values(store).find(
    (w) => w.members.some((m) => m.userId === caller.uid),
  );
  if (!ws) { res.status(404).json({ error: "Not in a workspace" }); return; }

  const member = ws.members.find((m) => m.userId === caller.uid);
  if (member) {
    member.stats = { ...stats, syncedAt: new Date().toISOString() };
    store[ws.id] = ws;
    saveStore(store);
  }
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────
   Static files + SPA fallback
───────────────────────────────────────────── */
app.use(express.static(path.join(__dirname, ".")));
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SystemForge server running on port ${PORT}`);
});
