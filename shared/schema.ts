import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  focusArea: text("focus_area"),
  preferredTheme: text("preferred_theme").default("system"),
  timezone: text("timezone").default("UTC"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const goalCategoryEnum = pgEnum("goal_category", [
  "fitness", "study", "career", "business", "relationship", "mindset", "health", "finance", "creativity", "other"
]);

export const goalPriorityEnum = pgEnum("goal_priority", ["low", "medium", "high"]);
export const goalStatusEnum = pgEnum("goal_status", ["active", "completed", "archived", "paused"]);

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("other"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("active"),
  deadline: text("deadline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const systems = pgTable("systems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  identityStatement: text("identity_statement"),
  targetOutcome: text("target_outcome"),
  whyItMatters: text("why_it_matters"),
  triggerType: text("trigger_type").default("time"),
  triggerStatement: text("trigger_statement"),
  minimumAction: text("minimum_action"),
  rewardPlan: text("reward_plan"),
  fallbackPlan: text("fallback_plan"),
  frequency: text("frequency").default("daily"),
  preferredTime: text("preferred_time").default("morning"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const checkins = pgTable("checkins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  systemId: varchar("system_id").notNull().references(() => systems.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dateKey: text("date_key").notNull(),
  status: text("status").notNull().default("done"),
  note: text("note"),
  moodBefore: integer("mood_before"),
  moodAfter: integer("mood_after"),
  difficulty: integer("difficulty"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: "set null" }),
  systemId: varchar("system_id").references(() => systems.id, { onDelete: "set null" }),
  dateKey: text("date_key").notNull(),
  promptType: text("prompt_type").default("daily"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  identityStatement: text("identity_statement"),
  triggerStatement: text("trigger_statement"),
  minimumAction: text("minimum_action"),
  rewardPlan: text("reward_plan"),
  fallbackPlan: text("fallback_plan"),
  isPublic: boolean("is_public").default(true),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertGoalSchema = createInsertSchema(goals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSystemSchema = createInsertSchema(systems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCheckinSchema = createInsertSchema(checkins).omit({ id: true, createdAt: true });
export const insertJournalSchema = createInsertSchema(journalEntries).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTemplateSchema = createInsertSchema(templates).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;
export type InsertSystem = z.infer<typeof insertSystemSchema>;
export type System = typeof systems.$inferSelect;
export type InsertCheckin = z.infer<typeof insertCheckinSchema>;
export type Checkin = typeof checkins.$inferSelect;
export type InsertJournal = z.infer<typeof insertJournalSchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;
