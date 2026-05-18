interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

function toGeminiRequest(body: {
  model?: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
}) {
  const systemMessages = body.messages.filter((m) => m.role === "system");
  const chatMessages = body.messages.filter((m) => m.role !== "system");

  const contents: GeminiContent[] = chatMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const result: Record<string, unknown> = {
    contents,
    generationConfig: {
      ...(body.max_tokens ? { maxOutputTokens: body.max_tokens } : {}),
      ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
    },
  };

  if (systemMessages.length > 0) {
    result.system_instruction = {
      parts: [{ text: systemMessages.map((m) => m.content).join("\n") }],
    };
  }

  return result;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(503).json({ error: "AI unavailable — GEMINI_API_KEY not set" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const model = body.model ?? "gemini-2.5-flash";
    const geminiBody = toGeminiRequest(body);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      },
    );

    const data = await response.json() as any;

    if (!response.ok) {
      res.status(response.status).json({ error: data?.error?.message ?? "Gemini API error" });
      return;
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    res.status(200).json({
      choices: [{ message: { role: "assistant", content: text } }],
    });
  } catch {
    res.status(500).json({ error: "AI proxy error" });
  }
}
