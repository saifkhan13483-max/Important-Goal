import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "5000", 10);

const app = express();
app.use(express.json({ limit: "20kb" }));

/* ─────────────────────────────────────────────
   Groq proxy — server-only key, never VITE_ prefix
───────────────────────────────────────────── */
app.post("/api/groq-proxy", async (req, res): Promise<void> => {
  const key = process.env.GROQ_API_KEY;
  if (!key) { res.status(503).json({ error: "AI unavailable" }); return; }
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch {
    res.status(500).json({ error: "Groq proxy error" });
  }
});

/* ─────────────────────────────────────────────
   Static files + SPA fallback (production only)
───────────────────────────────────────────── */
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, ".")));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SystemForge server running on port ${PORT}`);
});
