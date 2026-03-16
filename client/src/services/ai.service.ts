import Bytez from "bytez.js";

const BYTEZ_API_KEY =
  (import.meta as any).env?.VITE_BYTEZ_API_KEY || "e2f3b7fb95d8ef3a220b11ff774be0ab";

let _model: any = null;

function getModel() {
  if (!_model) {
    const sdk = new Bytez(BYTEZ_API_KEY);
    _model = sdk.model("openai/gpt-4o");
  }
  return _model;
}

const COACH_SYSTEM_PROMPT = `You are an expert habit coach and behavioral design specialist for SystemForge, a habit-building app. You help users design better habit systems using proven behavioral science principles (James Clear, BJ Fogg, etc.). You are encouraging, practical, and concise. Always give actionable, specific advice. Never be preachy. Keep responses under 200 words unless asked for more.`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function suggestSystemField(
  field: "trigger" | "minimumAction" | "fallbackPlan",
  context: {
    title: string;
    identityStatement?: string;
    triggerStatement?: string;
    minimumAction?: string;
  }
): Promise<string> {
  const model = getModel();

  const prompts: Record<string, string> = {
    trigger: `Habit system: "${context.title}". Identity goal: "${context.identityStatement || "not specified"}".
Suggest ONE specific trigger statement. Start with "After I..." or "At [specific time], after...".
Be specific and practical. One sentence only. No explanation.`,

    minimumAction: `Habit system: "${context.title}". Trigger: "${context.triggerStatement || "not specified"}". Identity: "${context.identityStatement || "not specified"}".
Suggest ONE embarrassingly small minimum action. Should be so tiny the user would do it sick, tired, or on their worst day.
Be concrete (include numbers: "5 push-ups", "1 page", "5 minutes"). One sentence only. No explanation.`,

    fallbackPlan: `Habit system: "${context.title}". Minimum action: "${context.minimumAction || "not specified"}".
Suggest ONE fallback plan for missed days. Should be even smaller than the minimum action.
Start with "If I miss my trigger," or "On hard days,". One or two sentences only. No explanation.`,
  };

  const { error, output } = await model.run([
    { role: "system", content: COACH_SYSTEM_PROMPT },
    { role: "user", content: prompts[field] },
  ]);

  if (error) throw new Error(typeof error === "string" ? error : "AI suggestion failed");
  return (output || "").trim();
}

export async function generateJournalPrompt(context: {
  promptType: string;
  systemNames: string[];
}): Promise<string> {
  const model = getModel();

  const systemsStr =
    context.systemNames.length > 0
      ? context.systemNames.join(", ")
      : "general habit building";

  const { error, output } = await model.run([
    { role: "system", content: COACH_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Generate a personalized ${context.promptType} journal prompt for someone working on these habits: ${systemsStr}.
Write a single thought-provoking question or reflection starter (1–2 sentences). Make it specific to their habits, not generic.
Output only the prompt itself — no labels, no explanation, no quotation marks.`,
    },
  ]);

  if (error) throw new Error(typeof error === "string" ? error : "AI prompt generation failed");
  return (output || "").trim();
}

export async function chatWithCoach(
  messages: ChatMessage[],
  context: {
    systemNames: string[];
    bestStreak?: number;
    userName?: string;
  }
): Promise<string> {
  const model = getModel();

  const systemsStr =
    context.systemNames.length > 0
      ? `The user is working on these habit systems: ${context.systemNames.join(", ")}.`
      : "The user hasn't created any habit systems yet.";

  const streakStr =
    context.bestStreak && context.bestStreak > 0
      ? `Their current best streak is ${context.bestStreak} days.`
      : "";

  const userStr = context.userName ? `The user's name is ${context.userName}.` : "";

  const fullMessages = [
    {
      role: "system" as const,
      content: `${COACH_SYSTEM_PROMPT} ${systemsStr} ${streakStr} ${userStr}`.trim(),
    },
    ...messages,
  ];

  const { error, output } = await model.run(fullMessages);
  if (error) throw new Error(typeof error === "string" ? error : "AI chat failed");
  return (output || "").trim();
}
