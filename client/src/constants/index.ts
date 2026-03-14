export const APP_NAME = "SystemForge";
export const APP_TAGLINE = "Turn goals into systems.";

export const FOCUS_AREAS = [
  { value: "fitness", label: "Fitness & Health" },
  { value: "study", label: "Study & Learning" },
  { value: "career", label: "Career & Work" },
  { value: "business", label: "Business & Side Projects" },
  { value: "relationship", label: "Relationships & Social" },
  { value: "mindset", label: "Mindset & Mental Health" },
  { value: "custom", label: "Something else" },
];

export const ROUTINE_TIMES = [
  { value: "morning", label: "Morning person" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "flexible", label: "Flexible / varies" },
];

export const GOAL_CATEGORIES = [
  "fitness",
  "study",
  "career",
  "business",
  "relationship",
  "mindset",
  "health",
  "finance",
  "creativity",
  "other",
];

export const GOAL_PRIORITIES = ["low", "medium", "high"];
export const GOAL_STATUSES = ["active", "paused", "completed", "archived"];

export const TRIGGER_TYPES = [
  { value: "time", label: "Time-based (e.g. 7am)" },
  { value: "action", label: "Action-based (e.g. after coffee)" },
  { value: "location", label: "Location-based (e.g. at gym)" },
];

export const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "3x_week", label: "3x per week" },
  { value: "custom", label: "Custom" },
];

export const CHECKIN_STATUSES = [
  { value: "done", label: "Done", color: "text-green-600" },
  { value: "partial", label: "Partial", color: "text-yellow-600" },
  { value: "missed", label: "Missed", color: "text-red-500" },
];

export const TEMPLATE_CATEGORIES = [
  "fitness",
  "reading",
  "meditation",
  "exam preparation",
  "content creation",
  "relationship care",
  "sleep routine",
  "deep work",
];

export const JOURNAL_PROMPT_TYPES = [
  { value: "daily", label: "Daily Reflection" },
  { value: "weekly", label: "Weekly Review" },
  { value: "freeform", label: "Freeform Note" },
];

export const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];
