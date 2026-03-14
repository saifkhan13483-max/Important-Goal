import { db } from "./db";
import { eq, and, desc, like, or } from "drizzle-orm";
import {
  users, goals, systems, checkins, journalEntries, templates,
  type User, type InsertUser,
  type Goal, type InsertGoal,
  type System, type InsertSystem,
  type Checkin, type InsertCheckin,
  type JournalEntry, type InsertJournal,
  type Template, type InsertTemplate,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  // Goals
  getGoal(id: string): Promise<Goal | undefined>;
  getGoalsByUser(userId: string): Promise<Goal[]>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, data: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<void>;

  // Systems
  getSystem(id: string): Promise<System | undefined>;
  getSystemsByUser(userId: string): Promise<System[]>;
  getSystemsByGoal(goalId: string): Promise<System[]>;
  createSystem(system: InsertSystem): Promise<System>;
  updateSystem(id: string, data: Partial<InsertSystem>): Promise<System | undefined>;
  deleteSystem(id: string): Promise<void>;

  // Checkins
  getCheckin(id: string): Promise<Checkin | undefined>;
  getCheckinBySystemAndDate(systemId: string, dateKey: string): Promise<Checkin | undefined>;
  getCheckinsByUser(userId: string): Promise<Checkin[]>;
  getCheckinsByUserAndDate(userId: string, dateKey: string): Promise<Checkin[]>;
  createCheckin(checkin: InsertCheckin): Promise<Checkin>;
  updateCheckin(id: string, data: Partial<InsertCheckin>): Promise<Checkin | undefined>;

  // Journal
  getJournalEntry(id: string): Promise<JournalEntry | undefined>;
  getJournalsByUser(userId: string): Promise<JournalEntry[]>;
  getJournalByUserAndDate(userId: string, dateKey: string): Promise<JournalEntry[]>;
  createJournal(entry: InsertJournal): Promise<JournalEntry>;
  updateJournal(id: string, data: Partial<InsertJournal>): Promise<JournalEntry | undefined>;
  deleteJournal(id: string): Promise<void>;

  // Templates
  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;

  // Seed
  seedTemplates(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values({ ...user, id: randomUUID() }).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getGoal(id: string): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal;
  }

  async getGoalsByUser(userId: string): Promise<Goal[]> {
    return db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt));
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const [created] = await db.insert(goals).values({ ...goal, id: randomUUID() }).returning();
    return created;
  }

  async updateGoal(id: string, data: Partial<InsertGoal>): Promise<Goal | undefined> {
    const [updated] = await db.update(goals).set({ ...data, updatedAt: new Date() }).where(eq(goals.id, id)).returning();
    return updated;
  }

  async deleteGoal(id: string): Promise<void> {
    await db.delete(goals).where(eq(goals.id, id));
  }

  async getSystem(id: string): Promise<System | undefined> {
    const [system] = await db.select().from(systems).where(eq(systems.id, id));
    return system;
  }

  async getSystemsByUser(userId: string): Promise<System[]> {
    return db.select().from(systems).where(eq(systems.userId, userId)).orderBy(desc(systems.createdAt));
  }

  async getSystemsByGoal(goalId: string): Promise<System[]> {
    return db.select().from(systems).where(eq(systems.goalId, goalId)).orderBy(desc(systems.createdAt));
  }

  async createSystem(system: InsertSystem): Promise<System> {
    const [created] = await db.insert(systems).values({ ...system, id: randomUUID() }).returning();
    return created;
  }

  async updateSystem(id: string, data: Partial<InsertSystem>): Promise<System | undefined> {
    const [updated] = await db.update(systems).set({ ...data, updatedAt: new Date() }).where(eq(systems.id, id)).returning();
    return updated;
  }

  async deleteSystem(id: string): Promise<void> {
    await db.delete(systems).where(eq(systems.id, id));
  }

  async getCheckin(id: string): Promise<Checkin | undefined> {
    const [checkin] = await db.select().from(checkins).where(eq(checkins.id, id));
    return checkin;
  }

  async getCheckinBySystemAndDate(systemId: string, dateKey: string): Promise<Checkin | undefined> {
    const [checkin] = await db.select().from(checkins).where(and(eq(checkins.systemId, systemId), eq(checkins.dateKey, dateKey)));
    return checkin;
  }

  async getCheckinsByUser(userId: string): Promise<Checkin[]> {
    return db.select().from(checkins).where(eq(checkins.userId, userId)).orderBy(desc(checkins.createdAt));
  }

  async getCheckinsByUserAndDate(userId: string, dateKey: string): Promise<Checkin[]> {
    return db.select().from(checkins).where(and(eq(checkins.userId, userId), eq(checkins.dateKey, dateKey)));
  }

  async createCheckin(checkin: InsertCheckin): Promise<Checkin> {
    const [created] = await db.insert(checkins).values({ ...checkin, id: randomUUID() }).returning();
    return created;
  }

  async updateCheckin(id: string, data: Partial<InsertCheckin>): Promise<Checkin | undefined> {
    const [updated] = await db.update(checkins).set(data).where(eq(checkins.id, id)).returning();
    return updated;
  }

  async getJournalEntry(id: string): Promise<JournalEntry | undefined> {
    const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, id));
    return entry;
  }

  async getJournalsByUser(userId: string): Promise<JournalEntry[]> {
    return db.select().from(journalEntries).where(eq(journalEntries.userId, userId)).orderBy(desc(journalEntries.createdAt));
  }

  async getJournalByUserAndDate(userId: string, dateKey: string): Promise<JournalEntry[]> {
    return db.select().from(journalEntries).where(and(eq(journalEntries.userId, userId), eq(journalEntries.dateKey, dateKey)));
  }

  async createJournal(entry: InsertJournal): Promise<JournalEntry> {
    const [created] = await db.insert(journalEntries).values({ ...entry, id: randomUUID() }).returning();
    return created;
  }

  async updateJournal(id: string, data: Partial<InsertJournal>): Promise<JournalEntry | undefined> {
    const [updated] = await db.update(journalEntries).set({ ...data, updatedAt: new Date() }).where(eq(journalEntries.id, id)).returning();
    return updated;
  }

  async deleteJournal(id: string): Promise<void> {
    await db.delete(journalEntries).where(eq(journalEntries.id, id));
  }

  async getTemplates(): Promise<Template[]> {
    return db.select().from(templates).where(eq(templates.isPublic, true));
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [created] = await db.insert(templates).values({ ...template, id: randomUUID() }).returning();
    return created;
  }

  async seedTemplates(): Promise<void> {
    const existing = await db.select().from(templates).limit(1);
    if (existing.length > 0) return;

    const seedData: InsertTemplate[] = [
      {
        title: "Morning Workout Starter",
        category: "fitness",
        description: "A simple system to build a consistent morning exercise habit without overwhelm.",
        identityStatement: "I am someone who moves their body every single morning.",
        triggerStatement: "After I brush my teeth, I will put on my workout clothes.",
        minimumAction: "Do 5 push-ups and a 1-minute stretch.",
        rewardPlan: "Make my favourite coffee as a reward after the workout.",
        fallbackPlan: "If I miss morning, I will do just 10 squats at any point before bed.",
        isPublic: true,
      },
      {
        title: "Daily Reading Habit",
        category: "study",
        description: "Build a consistent reading habit with a low-friction approach.",
        identityStatement: "I am a person who reads every day and keeps learning.",
        triggerStatement: "After lunch, before I check my phone, I will open my book.",
        minimumAction: "Read just one page — even if I'm tired.",
        rewardPlan: "Track my pages in an app and celebrate milestones.",
        fallbackPlan: "Listen to an audiobook version if I cannot read physically.",
        isPublic: true,
      },
      {
        title: "Deep Work Session",
        category: "career",
        description: "Protect your most important focused work with a reliable trigger.",
        identityStatement: "I am someone who does focused, meaningful work every day.",
        triggerStatement: "At 9am, I put on headphones and open my top priority task.",
        minimumAction: "Work for at least 25 minutes without checking messages.",
        rewardPlan: "Take a full 5-minute break outdoors after each session.",
        fallbackPlan: "Work for even 10 minutes if energy is low. Progress beats perfection.",
        isPublic: true,
      },
      {
        title: "Evening Journaling",
        category: "mindset",
        description: "End each day with intentional reflection to process emotions and grow.",
        identityStatement: "I am a reflective person who learns from every experience.",
        triggerStatement: "After dinner, before watching anything, I open my journal.",
        minimumAction: "Write 3 sentences about what happened today.",
        rewardPlan: "Read back an old entry after writing — feel the progress.",
        fallbackPlan: "Record a 60-second voice memo instead of writing.",
        isPublic: true,
      },
      {
        title: "Meditation Practice",
        category: "mindset",
        description: "Start a sustainable meditation habit that actually sticks.",
        identityStatement: "I am someone who takes time to be still and present.",
        triggerStatement: "After I wake up and drink water, I sit in my chair and close my eyes.",
        minimumAction: "Breathe deeply for 2 minutes. Nothing else needed.",
        rewardPlan: "Track my streak and share milestones with a friend.",
        fallbackPlan: "Take 5 deep breaths in the bathroom if I'm rushed.",
        isPublic: true,
      },
      {
        title: "Content Creation Sprint",
        category: "business",
        description: "Build a consistent creative output habit for makers and creators.",
        identityStatement: "I am a creator who shows up consistently, even on hard days.",
        triggerStatement: "After my morning coffee, before email, I open my draft.",
        minimumAction: "Write 100 words or record 2 minutes of content.",
        rewardPlan: "Share one finished piece per week and note the responses.",
        fallbackPlan: "Save a single idea or sentence in my notes app — ideas compound.",
        isPublic: true,
      },
      {
        title: "Sleep Wind-Down",
        category: "health",
        description: "Protect your sleep quality with a calming end-of-day routine.",
        identityStatement: "I am someone who protects their sleep as a form of self-care.",
        triggerStatement: "When the clock hits 10pm, I put my phone face down and dim the lights.",
        minimumAction: "Spend 10 minutes away from all screens before bed.",
        rewardPlan: "Track how rested I feel each morning and celebrate improvement.",
        fallbackPlan: "Use blue light glasses if I need to use screens late.",
        isPublic: true,
      },
      {
        title: "Relationship Check-In",
        category: "relationship",
        description: "Nurture important relationships consistently with a simple weekly habit.",
        identityStatement: "I am someone who actively maintains meaningful connections.",
        triggerStatement: "Every Sunday evening, I look at my contacts and pick one person to message.",
        minimumAction: "Send a genuine message to one person — ask how they are.",
        rewardPlan: "Schedule a catch-up call and look forward to it.",
        fallbackPlan: "Leave a voice note if texting feels too formal.",
        isPublic: true,
      },
    ];

    for (const t of seedData) {
      await db.insert(templates).values({ ...t, id: randomUUID() });
    }
  }
}

export const storage = new DatabaseStorage();
