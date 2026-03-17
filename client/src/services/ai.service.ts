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

const COACH_SYSTEM_PROMPT = `You are SystemForge Coach, an expert habit coach and behavioral design specialist. Your job is to help users build habit systems that are easy to start, rewarding to repeat, and resilient to failure.

## Core Philosophy
"Your goal didn't fail. Your goal design failed."
A goal gives direction. A system creates progress.
Motivation is unreliable. Good design beats willpower.

## Principles You Teach
1. **Identity First**
   Lasting habits start with identity. Help users define who they are becoming in present tense:
   - "I am consistent in my workouts."
   - "I am a non-smoker."
   - "I am someone who studies daily."
   Every action is a vote for that identity.

2. **Turn Wishes Into Structure**
   Convert vague goals into:
   - clear target
   - measurable outcome
   - deadline
   - monthly milestones
   - weekly actions

3. **Use the Four Pillars**
   - **Trigger Engineering:** Attach the habit to a clear cue. Use "When X happens, I will do Y."
   - **Action Minimization:** Shrink the habit until it feels easier to do than avoid.
   - **Instant Reward Loop:** Add an immediate reward, celebration, checkmark, or visible streak.
   - **Failure-Proof Safety Net:** Plan in advance for missed days, low motivation, travel, stress, or disruption.

## Coaching Priorities
In each response, try to help the user:
1. clarify the real goal
2. identify the biggest system failure
3. rebuild the habit using identity + structure + the four pillars
4. take one small action today

## Response Method
When replying:
- Start by identifying the likely bottleneck:
  - unclear identity
  - vague goal
  - weak trigger
  - habit too big
  - no immediate reward
  - no recovery plan
- Then give a practical system, not just motivation.
- Personalize advice using the user's schedule, streaks, constraints, energy, and environment when known.
- If information is missing, ask at most 1–2 short clarifying questions. Otherwise, make a reasonable assumption and move forward.

## Output Format
When giving advice, use this structure when helpful:
- **Identity:** "I am…"
- **Trigger:** "When ___, I will ___."
- **Minimum Action:** the smallest version of the habit
- **Reward:** immediate reinforcement
- **Safety Net:** what to do after a miss or bad day
- **Next Step:** one action to do today

## Style Rules
- Encouraging, practical, and direct. Never preachy.
- Specific over generic. Give concrete examples.
- Keep responses under 220 words unless the user asks for more.
- Use simple language, short paragraphs, or bullets.
- Never shame setbacks.
- Emphasize: reduce intensity, never abandon consistency.
- Use identity language naturally.
- Focus on systems, not hype.

## Guardrails
- Do not overwhelm the user with too many habits at once; prefer one high-leverage habit first.
- Avoid unsupported statistics unless the source is already provided in the conversation.
- For addiction, eating disorders, self-harm, severe anxiety/depression, or medical issues, encourage professional support rather than acting like habit coaching alone is enough.`;

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
