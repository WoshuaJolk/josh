import { generateText } from "ai";
const MODEL = "openai/gpt-4o-mini";

type Availability = "yes" | "no" | "unclear";
type AlternativeParseResult =
  | { status: "parsed"; canonicalSlot: string }
  | { status: "clarify"; clarificationQuestion: string };

interface UserSummary {
  name?: string | null;
  aboutMe?: string | null;
  preferences?: string | null;
  city?: string | null;
  age?: number | null;
  height?: string | null;
}

export async function classifyAvailabilityReply(
  message: string,
  proposedSlot: string
): Promise<Availability> {
  const normalizedMessage = message.trim().toLowerCase();
  if (!normalizedMessage) return "unclear";

  // Deterministic fast-paths for common SMS replies.
  if (/^(yes|yep|yeah|ya|y|works|that works|sounds good|good)$/i.test(normalizedMessage)) {
    return "yes";
  }
  if (
    /^(no|nope|nah|n|doesn't work|doesnt work|can't|cant|can't do|cant do)$/i.test(
      normalizedMessage
    )
  ) {
    return "no";
  }

  if (
    /\b(yes|yep|yeah|works|sounds good|i can|i'm free|im free)\b/i.test(
      normalizedMessage
    ) &&
    !/\b(no|nope|nah|can't|cant|doesn't work|doesnt work)\b/i.test(
      normalizedMessage
    )
  ) {
    return "yes";
  }
  if (
    /\b(no|nope|nah|can't|cant|doesn't work|doesnt work|not free)\b/i.test(
      normalizedMessage
    )
  ) {
    return "no";
  }

  if (!process.env.AI_GATEWAY_API_KEY) return "unclear";

  try {
    const { text } = await generateText({
      model: MODEL,
      prompt: `Classify this reply to a scheduling prompt.
Proposed time: ${proposedSlot}
Reply: "${message}"

Return only one token: yes, no, or unclear.`,
      maxOutputTokens: 5,
    });

    const normalized = text.trim().toLowerCase();
    if (normalized.includes("yes")) return "yes";
    if (normalized.includes("no")) return "no";
    return "unclear";
  } catch {
    return "unclear";
  }
}

export async function normalizeAlternativeTimeSuggestion(params: {
  message: string;
  city?: string | null;
}): Promise<AlternativeParseResult> {
  const { message, city } = params;
  const normalized = message.trim();
  if (!normalized) {
    return {
      status: "clarify",
      clarificationQuestion:
        "can you share a specific day and time that works better for you?",
    };
  }

  if (!process.env.AI_GATEWAY_API_KEY) {
    if (normalized.length >= 8) {
      return { status: "parsed", canonicalSlot: normalized };
    }
    return {
      status: "clarify",
      clarificationQuestion:
        "can you send a clearer time suggestion, like friday at 8pm?",
    };
  }

  try {
    const { text } = await generateText({
      model: MODEL,
      prompt: `Parse this dating scheduling reply into one normalized proposal.
Reply: "${message}"
City context: ${city ?? "unknown"}

Rules:
- If a clear single time is provided, return status "parsed" and a concise "canonicalSlot" (for example: "friday at 8:00 pm").
- If ambiguous/multiple/no actual time, return status "clarify" with one short natural clarification question.
- Keep all output lowercase.

Return ONLY JSON:
{"status":"parsed","canonicalSlot":"..."}
or
{"status":"clarify","clarificationQuestion":"..."}`,
      maxOutputTokens: 120,
    });

    const cleaned = text.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (
      parsed.status === "parsed" &&
      typeof parsed.canonicalSlot === "string" &&
      parsed.canonicalSlot.trim()
    ) {
      return { status: "parsed", canonicalSlot: parsed.canonicalSlot.trim() };
    }

    if (
      parsed.status === "clarify" &&
      typeof parsed.clarificationQuestion === "string" &&
      parsed.clarificationQuestion.trim()
    ) {
      return {
        status: "clarify",
        clarificationQuestion: parsed.clarificationQuestion.trim(),
      };
    }
  } catch {
    // ignore and fall through to default clarification
  }

  return {
    status: "clarify",
    clarificationQuestion:
      "can you send one specific day and time that works better for you?",
  };
}

export async function suggestDatePlaceAndReasoning(params: {
  userA: UserSummary;
  userB: UserSummary;
  city: string;
  agreedTime: string;
}): Promise<string> {
  const { userA, userB, city, agreedTime } = params;
  if (!process.env.AI_GATEWAY_API_KEY) {
    return `Time: ${agreedTime}\nPlace: Pick a cozy, low-pressure spot in ${city} that makes talking easy.`;
  }

  try {
    const { text } = await generateText({
      model: MODEL,
      prompt: `You are a matchmaking assistant. Propose ONE concrete first-date place in ${city} for these two people and explain why it fits both of them.

Person A:
- Name: ${userA.name ?? "Unknown"}
- Age: ${userA.age ?? "Unknown"}
- Height: ${userA.height ?? "Unknown"}
- About: ${userA.aboutMe ?? "Unknown"}
- Preferences: ${userA.preferences ?? "Unknown"}

Person B:
- Name: ${userB.name ?? "Unknown"}
- Age: ${userB.age ?? "Unknown"}
- Height: ${userB.height ?? "Unknown"}
- About: ${userB.aboutMe ?? "Unknown"}
- Preferences: ${userB.preferences ?? "Unknown"}

Agreed time: ${agreedTime}

Output:
1) A place name/type in ${city}
2) A short explanation (2-4 sentences) focused on shared fit.
Keep it practical and specific.`,
      maxOutputTokens: 300,
    });

    return text.trim();
  } catch {
    return `Time: ${agreedTime}\nPlace: Choose a comfortable cafe or wine bar in ${city} where you can talk easily.`;
  }
}
