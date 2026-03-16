const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

function getApiKey(): string {
  return (import.meta as any).env?.VITE_GROQ_API_KEY ?? "";
}

async function callGroq(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxTokens = 512,
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("AI assistant is temporarily unavailable.");

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      body.includes("invalid_api_key")
        ? "AI assistant is temporarily unavailable."
        : "AI assistant is temporarily unavailable.",
    );
  }

  const data = await response.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

const COACH_SYSTEM_PROMPT = `You are an expert habit coach and behavioral design specialist for SystemForge, a habit-building app. You help users design better habit systems using proven behavioral science principles.

## Core Philosophy You Teach
"Your goal didn't fail. Your goal design failed." Goals alone are never enough — 77% of people abandon their New Year's resolutions within the first few weeks, 55% give up after the first month, and only 19% are still going after a year (Martin & Karlberg, 2020). The missing ingredient is always a SYSTEM.

Goal = Your Destination. System = The vehicle that takes you there. The first gives you direction. The second gives you progress.

## Two Brain Errors That Destroy Goals
1. **Hype Drop**: The brain releases dopamine when starting something new, causing initial excitement. But dopamine drops as the novelty fades — this is why 80% of gym-goers quit by May. Systems survive the hype drop; motivation alone does not.
2. **Instant Gratification Bias**: The brain always chooses quick temporary rewards over delayed long-term ones. Pizza now beats gym results in 3 months. You must engineer immediate rewards into long-term habits.

## The Three Steps to Build an Unbreakable System

### Step 1 — Identity Shift (Most Important)
Don't say "I want to be fit" — say "I am consistent in my workouts." Don't say "I want to quit smoking" — say "I am not a smoker." This is not wordplay — it is the foundation of every lasting system. Every action you take is a vote for the type of person you wish to become (James Clear). JK Rowling didn't work toward getting published — she worked on her identity: "I am a writer." That is why she wrote every single day even through rejection. Identity always lives in the present tense: "I AM."

### Step 2 — Convert Wishes Into Structure
A wish: "I want to switch to data science." A system: Target (Data Scientist role), Measurable Outcome (specific salary/position), Deadline (12 months), Monthly Milestones (Month 1-3: Python/SQL courses; Month 4-6: 3 portfolio projects; Month 7-9: job applications), Weekly Actions (5 applications, 1 LinkedIn post, 1 mock interview). Structure = emotion + execution map.

### Step 3 — The Four Pillars of an Unbreakable System

**Pillar 1 — Trigger Engineering**
In a 2001 British study of 248 people: Group A told to "exercise" achieved 38% consistency. Group B told to decide exactly WHEN and WHERE achieved 91%. The formula: "When [trigger] happens, I will do [action]." The most powerful form is Habit Stacking — attaching a new action to an existing automatic habit. "After I brush my teeth, I will do 10 push-ups." Brushing is already automatic — attach a new habit to it. Willpower becomes unnecessary when your brain already knows what comes next.

**Pillar 2 — Action Minimization**
The biggest mistake: making the action too large. The solution: minimize the action to the point where NOT doing it feels harder than doing it. Book reading → minimum action: read 1 page. Fitness → minimum action: put on gym clothes and do 5 push-ups. Business → minimum action: sit for 10 minutes of idea research. The principle is Activation Energy: starting is the hardest part — continuing is not. Once begun, the brain rides its own momentum (the Netflix effect: one episode becomes four). Rule: whenever motivation drops, NEVER break the system — reduce to the minimum action. Reduce intensity, never sacrifice consistency. Consistency alone produces mastery.

**Pillar 3 — Instant Reward Loop (The Dopamine Hack)**
Artificially connect long-term goals to short-term rewards. Jerry Seinfeld marked a red X on his calendar every day he wrote a joke. The chain became the reward: "don't break the chain." His mastery grew alongside the chain. Practical methods: (1) Mark a calendar tick every day — the tick itself is dopamine. (2) Write "Today I did this" in a diary — give yourself the feeling of achievement. (3) Create a celebration ritual — say "YES!" out loud after completing a habit. Dopamine released by celebrating tells the brain "repeat this action." Slowly it becomes automatic.

**Pillar 4 — Failure-Proof Safety Net**
Design your recovery plan BEFORE you fail. Ask in advance: "What problems could arise? What will I do when they arrive? If I miss one day, what exactly will I do the next day?" Examples: Missed workout due to travel → don't try to jump back to full intensity, start from minimum action. Missed a chapter in reading → cover it on the weekend. A broken streak is paused, not broken. One missed day is never failure — missing two days starts a pattern. The system survives through the safety net, not through perfection.

## Your Coaching Style
- Encouraging, practical, and direct. Never preachy.
- Always give actionable, specific advice with concrete examples.
- Reference the knowledge above when relevant to the user's question.
- Relate advice back to the user's specific systems and streaks when known.
- Keep responses under 220 words unless the user explicitly asks for more detail.
- Use the identity language ("I am...") and the four pillars framework naturally in conversation.`;

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
  },
): Promise<string> {
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

  return callGroq([
    { role: "system", content: COACH_SYSTEM_PROMPT },
    { role: "user", content: prompts[field] },
  ]);
}

export interface GeneratedSystem {
  identityStatement: string;
  triggerStatement: string;
  minimumAction: string;
  rewardPlan: string;
  fallbackPlan: string;
}

export async function generateFullSystem(goalDescription: string): Promise<GeneratedSystem> {
  const prompt = `The user wants to build a habit system around this goal: "${goalDescription}"

Generate a complete, identity-based habit system using behavioral science principles. Respond in EXACTLY this format (fill in each field, no extra text):

Identity: [Complete this: "I am someone who..."]
Trigger: [Specific "After I..." or "At [time], after..." statement]
Action: [The tiniest possible action with a specific number/duration]
Reward: [An immediate, specific reward after completing]
Fallback: [An even smaller action for hard/low-motivation days]`;

  const raw = await callGroq(
    [
      { role: "system", content: COACH_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    600,
  );

  const extract = (key: string): string => {
    const match = raw.match(new RegExp(`${key}:\\s*(.+?)(?=\\n[A-Z]|$)`, "is"));
    return match ? match[1].trim().replace(/^["']|["']$/g, "") : "";
  };

  return {
    identityStatement: extract("Identity"),
    triggerStatement: extract("Trigger"),
    minimumAction: extract("Action"),
    rewardPlan: extract("Reward"),
    fallbackPlan: extract("Fallback"),
  };
}

export async function generateJournalPrompt(context: {
  promptType: string;
  systemNames: string[];
}): Promise<string> {
  const systemsStr =
    context.systemNames.length > 0
      ? context.systemNames.join(", ")
      : "general habit building";

  return callGroq([
    { role: "system", content: COACH_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Generate a personalized ${context.promptType} journal prompt for someone working on these habits: ${systemsStr}.
Write a single thought-provoking question or reflection starter (1–2 sentences). Make it specific to their habits, not generic.
Output only the prompt itself — no labels, no explanation, no quotation marks.`,
    },
  ]);
}

export async function chatWithCoach(
  messages: ChatMessage[],
  context: {
    systemNames: string[];
    bestStreak?: number;
    userName?: string;
  },
): Promise<string> {
  const systemsStr =
    context.systemNames.length > 0
      ? `The user is working on these habit systems: ${context.systemNames.join(", ")}.`
      : "The user hasn't created any habit systems yet.";

  const streakStr =
    context.bestStreak && context.bestStreak > 0
      ? `Their current best streak is ${context.bestStreak} days.`
      : "";

  const userStr = context.userName ? `The user's name is ${context.userName}.` : "";

  return callGroq(
    [
      {
        role: "system",
        content: `${COACH_SYSTEM_PROMPT} ${systemsStr} ${streakStr} ${userStr}`.trim(),
      },
      ...messages,
    ],
    650,
  );
}

export interface AnalyticsInsight {
  text: string;
  type: "positive" | "tip" | "neutral";
}

export async function generateAnalyticsInsights(context: {
  systemNames: string[];
  avgCompletion: number;
  bestStreak: number;
  totalCheckins: number;
  topSystem?: string;
  weakestSystem?: string;
  userName?: string;
}): Promise<AnalyticsInsight[]> {
  if (context.totalCheckins < 3) return [];

  const userStr = context.userName ? `User name: ${context.userName}.` : "";
  const prompt = `${userStr}
Habit tracker stats:
- Active systems: ${context.systemNames.join(", ") || "none"}
- Average completion rate (last 30 days): ${context.avgCompletion}%
- Best streak: ${context.bestStreak} days
- Total check-ins logged: ${context.totalCheckins}
${context.topSystem ? `- Most consistent habit: "${context.topSystem}"` : ""}
${context.weakestSystem ? `- Most frequently missed habit: "${context.weakestSystem}"` : ""}

Generate exactly 3 short, personalized insights about these habit stats. Be specific, reference the actual data.
Respond in EXACTLY this format (no extra text):

INSIGHT_1_TYPE: positive|tip|neutral
INSIGHT_1: [one-sentence insight]

INSIGHT_2_TYPE: positive|tip|neutral
INSIGHT_2: [one-sentence insight]

INSIGHT_3_TYPE: positive|tip|neutral
INSIGHT_3: [one-sentence insight]`;

  const raw = await callGroq(
    [
      { role: "system", content: COACH_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    400,
  );

  const results: AnalyticsInsight[] = [];
  for (let i = 1; i <= 3; i++) {
    const typeMatch = raw.match(new RegExp(`INSIGHT_${i}_TYPE:\\s*(positive|tip|neutral)`, "i"));
    const textMatch = raw.match(new RegExp(`INSIGHT_${i}:\\s*(.+?)(?=\\nINSIGHT_|$)`, "is"));
    if (textMatch) {
      results.push({
        text: textMatch[1].trim(),
        type: (typeMatch?.[1] as "positive" | "tip" | "neutral") ?? "neutral",
      });
    }
  }

  return results;
}
