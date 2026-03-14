import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { storage } from "./storage";
import { insertUserSchema, insertGoalSchema, insertSystemSchema, insertCheckinSchema, insertJournalSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";

const p = (v: string | string[]) => (Array.isArray(v) ? v[0] : v);

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + process.env.SESSION_SECRET || "sf-secret").digest("hex");
}

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const PgStore = connectPgSimple(session);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  app.use(session({
    store: new PgStore({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "systemforge-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 30 * 24 * 60 * 60 * 1000 },
  }));

  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!(req.session as any).userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const body = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
      }).parse(req.body);

      const existing = await storage.getUserByEmail(body.email);
      if (existing) return res.status(400).json({ message: "Email already in use" });

      const user = await storage.createUser({
        email: body.email,
        password: hashPassword(body.password),
        name: body.name,
        onboardingCompleted: false,
        preferredTheme: "system",
        timezone: "UTC",
      });
      (req.session as any).userId = user.id;
      const { password: _, ...userSafe } = user;
      res.json(userSafe);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const body = z.object({
        email: z.string().email(),
        password: z.string(),
      }).parse(req.body);

      const user = await storage.getUserByEmail(body.email);
      if (!user || user.password !== hashPassword(body.password)) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      (req.session as any).userId = user.id;
      const { password: _, ...userSafe } = user;
      res.json(userSafe);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUser((req.session as any).userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { password: _, ...userSafe } = user;
    res.json(userSafe);
  });

  app.patch("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const allowed = z.object({
        name: z.string().optional(),
        avatarUrl: z.string().optional(),
        focusArea: z.string().optional(),
        preferredTheme: z.string().optional(),
        timezone: z.string().optional(),
        onboardingCompleted: z.boolean().optional(),
      }).parse(req.body);

      const updated = await storage.updateUser(userId, allowed);
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password: _, ...userSafe } = updated;
      res.json(userSafe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Goals routes
  app.get("/api/goals", requireAuth, async (req, res) => {
    const goals = await storage.getGoalsByUser((req.session as any).userId);
    res.json(goals);
  });

  app.post("/api/goals", requireAuth, async (req, res) => {
    try {
      const body = insertGoalSchema.omit({ userId: true }).parse(req.body);
      const goal = await storage.createGoal({ ...body, userId: (req.session as any).userId });
      res.json(goal);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/goals/:id", requireAuth, async (req, res) => {
    const goal = await storage.getGoal(p(req.params.id));
    if (!goal || goal.userId !== (req.session as any).userId) return res.status(404).json({ message: "Not found" });
    res.json(goal);
  });

  app.patch("/api/goals/:id", requireAuth, async (req, res) => {
    try {
      const goal = await storage.getGoal(p(req.params.id));
      if (!goal || goal.userId !== (req.session as any).userId) return res.status(404).json({ message: "Not found" });
      const updated = await storage.updateGoal(p(req.params.id), req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/goals/:id", requireAuth, async (req, res) => {
    const goal = await storage.getGoal(p(req.params.id));
    if (!goal || goal.userId !== (req.session as any).userId) return res.status(404).json({ message: "Not found" });
    await storage.deleteGoal(p(req.params.id));
    res.json({ success: true });
  });

  // Systems routes
  app.get("/api/systems", requireAuth, async (req, res) => {
    const allSystems = await storage.getSystemsByUser((req.session as any).userId);
    res.json(allSystems);
  });

  app.get("/api/systems/goal/:goalId", requireAuth, async (req, res) => {
    const goalSystems = await storage.getSystemsByGoal(p(req.params.goalId));
    res.json(goalSystems);
  });

  app.post("/api/systems", requireAuth, async (req, res) => {
    try {
      const body = insertSystemSchema.omit({ userId: true }).parse(req.body);
      const system = await storage.createSystem({ ...body, userId: (req.session as any).userId });
      res.json(system);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/systems/:id", requireAuth, async (req, res) => {
    const system = await storage.getSystem(p(req.params.id));
    if (!system || system.userId !== (req.session as any).userId) return res.status(404).json({ message: "Not found" });
    res.json(system);
  });

  app.patch("/api/systems/:id", requireAuth, async (req, res) => {
    try {
      const system = await storage.getSystem(p(req.params.id));
      if (!system || system.userId !== (req.session as any).userId) return res.status(404).json({ message: "Not found" });
      const updated = await storage.updateSystem(p(req.params.id), req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/systems/:id", requireAuth, async (req, res) => {
    const system = await storage.getSystem(p(req.params.id));
    if (!system || system.userId !== (req.session as any).userId) return res.status(404).json({ message: "Not found" });
    await storage.deleteSystem(p(req.params.id));
    res.json({ success: true });
  });

  // Checkins routes
  app.get("/api/checkins/today", requireAuth, async (req, res) => {
    const dateKey = getTodayKey();
    const todayCheckins = await storage.getCheckinsByUserAndDate((req.session as any).userId, dateKey);
    res.json(todayCheckins);
  });

  app.get("/api/checkins", requireAuth, async (req, res) => {
    const allCheckins = await storage.getCheckinsByUser((req.session as any).userId);
    res.json(allCheckins);
  });

  app.post("/api/checkins", requireAuth, async (req, res) => {
    try {
      const body = insertCheckinSchema.omit({ userId: true }).parse(req.body);
      const existing = await storage.getCheckinBySystemAndDate(body.systemId, body.dateKey);
      if (existing) {
        const updated = await storage.updateCheckin(existing.id, body);
        return res.json(updated);
      }
      const checkin = await storage.createCheckin({ ...body, userId: (req.session as any).userId });
      res.json(checkin);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/checkins/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateCheckin(p(req.params.id), req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Journal routes
  app.get("/api/journal", requireAuth, async (req, res) => {
    const entries = await storage.getJournalsByUser((req.session as any).userId);
    res.json(entries);
  });

  app.get("/api/journal/today", requireAuth, async (req, res) => {
    const dateKey = getTodayKey();
    const entries = await storage.getJournalByUserAndDate((req.session as any).userId, dateKey);
    res.json(entries);
  });

  app.post("/api/journal", requireAuth, async (req, res) => {
    try {
      const body = insertJournalSchema.omit({ userId: true }).parse(req.body);
      const entry = await storage.createJournal({ ...body, userId: (req.session as any).userId });
      res.json(entry);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/journal/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateJournal(p(req.params.id), req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/journal/:id", requireAuth, async (req, res) => {
    await storage.deleteJournal(p(req.params.id));
    res.json({ success: true });
  });

  // Templates routes
  app.get("/api/templates", async (req, res) => {
    const templates = await storage.getTemplates();
    res.json(templates);
  });

  app.get("/api/templates/:id", async (req, res) => {
    const template = await storage.getTemplate(p(req.params.id));
    if (!template) return res.status(404).json({ message: "Not found" });
    res.json(template);
  });

  // Analytics
  app.get("/api/analytics", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    const [allCheckins, allSystems, allGoals] = await Promise.all([
      storage.getCheckinsByUser(userId),
      storage.getSystemsByUser(userId),
      storage.getGoalsByUser(userId),
    ]);

    const streaks: Record<string, number> = {};
    const systemsMap = Object.fromEntries(allSystems.map(s => [s.id, s]));

    for (const system of allSystems) {
      const systemCheckins = allCheckins
        .filter(c => c.systemId === system.id && c.status === "done")
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

      let streak = 0;
      const today = getTodayKey();
      let checkDate = new Date(today);

      for (let i = 0; i < 365; i++) {
        const dateKey = checkDate.toISOString().split("T")[0];
        const found = systemCheckins.find(c => c.dateKey === dateKey);
        if (found) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      streaks[system.id] = streak;
    }

    const last30Days: { date: string; done: number; total: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const dayCheckins = allCheckins.filter(c => c.dateKey === dateKey);
      last30Days.push({
        date: dateKey,
        done: dayCheckins.filter(c => c.status === "done").length,
        total: allSystems.filter(s => s.active).length,
      });
    }

    res.json({
      totalGoals: allGoals.length,
      activeGoals: allGoals.filter(g => g.status === "active").length,
      completedGoals: allGoals.filter(g => g.status === "completed").length,
      totalSystems: allSystems.length,
      activeSystems: allSystems.filter(s => s.active).length,
      totalCheckins: allCheckins.length,
      streaks,
      last30Days,
      categoryBreakdown: allGoals.reduce((acc: Record<string, number>, g) => {
        acc[g.category] = (acc[g.category] || 0) + 1;
        return acc;
      }, {}),
    });
  });

  // Seed templates on startup
  await storage.seedTemplates();

  return httpServer;
}
