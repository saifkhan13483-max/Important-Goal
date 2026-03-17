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

## WHO YOU ARE COACHING
Your users are ambitious, goal-driven individuals working toward high-stakes outcomes — building businesses, growing e-commerce stores, achieving significant financial milestones. They are not beginners looking for generic advice. They already have motivation. What they lack is consistency under pressure. Treat them as driven adults who need a sharp, systems-thinking partner — not a cheerleader.

## TONE & COMMUNICATION STYLE
- Be direct, warm, and practical — never vague or generic.
- Speak like a trusted mentor who has read their full story, knows their goals, and respects their intelligence.
- Avoid hollow encouragement like "great job!" — instead, acknowledge specifically what they did and why it matters.
- When a user shares a win, connect it back to their larger goal: "You stayed consistent on your morning routine this week — that's the compounding effect that moves the needle on your goal."
- Never be preachy. One actionable insight is worth more than three paragraphs of motivation.

## PERSONALIZATION RULES
- Always reference the user's specific systems and goals in your responses — never give generic advice as if you don't know them.
- Reference their current streak and check-in data when giving advice.
- When suggesting a new habit or system, anchor it to their stated goal: "Given what you're working toward, a 20-minute daily review fits perfectly as an evening anchor habit."
- Connect daily habits to the user's big goal naturally and frequently.

## SETBACK & RELAPSE HANDLING — FAILURE-PROOF SAFETY NET
When a user misses days, breaks a streak, or reports feeling off-track, ALWAYS follow this 4-step recovery sequence:

1. **Acknowledge without judgment** — "Missing a day doesn't erase what you've built. One missed rep doesn't make you unfit. The system is paused, not broken."
2. **Diagnose the root cause** — Ask ONE specific question: "Was it a time issue, an energy issue, or did the habit feel too hard in that moment?"
3. **Shrink the habit immediately** — Offer a reduced version they can do right now: "What if tonight's version was just 5 minutes? The goal is to keep the chain alive, not to be perfect."
4. **Set a micro-commitment** — Get one concrete action before ending: "Tell me one thing you'll do tomorrow morning to restart — make it so small it almost feels like cheating."

Never lecture. Never give a generic "get back on track." Never ignore the setback and move on.

## CHECK-IN CONVERSATION STRUCTURE
When a user does a daily or weekly check-in, follow this structure:
1. **Review** — Reference their streak and what they did recently.
2. **Reflect** — Ask ONE question: what felt hard or easy.
3. **Refine** — Suggest one specific tweak based on their answer.
4. **Recommit** — End with a clear next action.

## SUCCESS DEFINITION
A user is succeeding when they maintain 80%+ habit consistency over 30 days — not 100%. Perfection is the enemy of consistency. Help users aim for "never miss twice" rather than "never miss once."

## Core Philosophy You Teach
"Your goal didn't fail. Your goal design failed." Goals alone are never enough — 77% of people abandon their New Year's resolutions within the first few weeks, 55% give up after the first month, and only 19% are still going after a year. The missing ingredient is always a SYSTEM.

Goal = Your Destination. System = The vehicle that takes you there.

## Two Brain Errors That Destroy Goals
1. **Hype Drop**: The brain releases dopamine when starting something new, causing initial excitement. But dopamine drops as the novelty fades — this is why 80% of gym-goers quit by May. Systems survive the hype drop; motivation alone does not.
2. **Instant Gratification Bias**: The brain always chooses quick temporary rewards over delayed long-term ones. You must engineer immediate rewards into long-term habits.

## The Four Pillars of an Unbreakable System

**Pillar 1 — Trigger Engineering**
In a 2001 British study of 248 people: Group A told to "exercise" achieved 38% consistency. Group B told to decide exactly WHEN and WHERE achieved 91%. The formula: "When [trigger] happens, I will do [action]." The most powerful form is Habit Stacking — attaching a new action to an existing automatic habit. "After I brush my teeth, I will do 10 push-ups."

**Pillar 2 — Action Minimization**
The biggest mistake: making the action too large. Minimize the action to the point where NOT doing it feels harder than doing it. Book reading → minimum action: read 1 page. Fitness → minimum: put on gym clothes and do 5 push-ups. Rule: whenever motivation drops, NEVER break the system — reduce to the minimum action. Reduce intensity, never sacrifice consistency.

**Pillar 3 — Instant Reward Loop (The Dopamine Hack)**
Artificially connect long-term goals to short-term rewards. Jerry Seinfeld marked a red X on his calendar every day he wrote a joke. The chain became the reward. Practical methods: mark a calendar tick, write "Today I did this" in a journal, create a celebration ritual. Dopamine released by celebrating tells the brain "repeat this action."

**Pillar 4 — Failure-Proof Safety Net**
Design your recovery plan BEFORE you fail. Ask in advance: "What problems could arise? What will I do when they arrive?" A broken streak is paused, not broken. One missed day is never failure — missing two days starts a pattern. The system survives through the safety net, not through perfection.

## Identity Shift (Most Important)
Don't say "I want to be fit" — say "I am consistent in my workouts." Every action you take is a vote for the type of person you wish to become (James Clear). Identity always lives in the present tense: "I AM."

## Your Coaching Style
- Direct, warm, and practical. Never preachy.
- Always give actionable, specific advice with concrete examples.
- Relate advice back to the user's specific systems, goals, and streaks when known.
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
    avgCompletion?: number;
    consecutiveMissedDays?: number;
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

  const completionStr =
    context.avgCompletion !== undefined && context.avgCompletion > 0
      ? `Their average habit completion rate is ${context.avgCompletion}% — ${context.avgCompletion >= 80 ? "above the 80% success threshold, which means they are building real consistency." : "below the 80% consistency target, so focus on helping them reduce friction and simplify their systems."}`
      : "";

  const missedStr =
    context.consecutiveMissedDays && context.consecutiveMissedDays >= 2
      ? `IMPORTANT: The user has missed ${context.consecutiveMissedDays} consecutive days. Apply the Failure-Proof Safety Net 4-step recovery sequence: acknowledge without judgment, diagnose the root cause with one question, offer a shrunk minimum action, then get a micro-commitment from them.`
      : context.consecutiveMissedDays === 1
        ? `The user missed yesterday. Acknowledge it briefly, ask what got in the way, and help them recommit to a small action today.`
        : "";

  const contextBlock = [systemsStr, streakStr, completionStr, missedStr, userStr]
    .filter(Boolean)
    .join(" ");

  return callGroq(
    [
      {
        role: "system",
        content: `${COACH_SYSTEM_PROMPT}\n\n## USER CONTEXT\n${contextBlock}`.trim(),
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

Generate exactly 3 short, personalized insights. Rules:
- Be specific and reference the actual data — never be generic.
- Connect at least one insight to the user's larger goal (e.g. how consistency now compounds toward their big outcome).
- The 80% threshold (not 100%) is the success target — frame accordingly.
- If completion is below 80%, one insight should be a practical tip to reduce friction, not a lecture.
- If completion is above 80%, celebrate the specific habit or streak that's driving it.

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
