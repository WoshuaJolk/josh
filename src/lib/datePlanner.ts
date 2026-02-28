import { generateText } from "ai";
const MODEL = "openai/gpt-4o-mini";
const PLACE_SUGGESTION_MAX_CHARS = 120;

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
  recentMessages?: string[];
}): Promise<AlternativeParseResult> {
  const { message, city, recentMessages = [] } = params;
  const normalized = message.trim();
  const trimmedHistory = recentMessages
    .map((item) => item.trim())
    .filter(Boolean);
  const historyContext =
    trimmedHistory.length > 0 ? [...trimmedHistory, normalized].join(" | ") : normalized;
  if (!normalized) {
    return {
      status: "clarify",
      clarificationQuestion:
        "can you share a specific day and time that works better for you?",
    };
  }

  if (!process.env.AI_GATEWAY_API_KEY) {
    if (historyContext.length >= 8) {
      return { status: "parsed", canonicalSlot: historyContext };
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
Latest reply: "${message}"
Recent replies from same sender (oldest -> newest): ${trimmedHistory.length > 0 ? trimmedHistory.map((entry) => `"${entry}"`).join(", ") : "none"}
City context: ${city ?? "unknown"}

Rules:
- Combine the latest reply with recent replies when needed. Example: "friday" then "6pm" => "friday at 6:00 pm".
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

export async function resolveDateStartIso(params: {
  slot: string;
  city?: string | null;
  referenceIso?: string;
}): Promise<string | null> {
  const { slot, city, referenceIso } = params;
  const normalizedSlot = slot.trim();
  if (!normalizedSlot || !process.env.AI_GATEWAY_API_KEY) {
    return null;
  }

  try {
    const { text } = await generateText({
      model: MODEL,
      prompt: `Resolve this natural-language schedule to one absolute ISO 8601 datetime with timezone offset.
Slot: "${normalizedSlot}"
City context: ${city ?? "unknown"}
Reference timestamp: ${referenceIso ?? new Date().toISOString()}

Rules:
- Choose the next future occurrence relative to the reference timestamp.
- Return only JSON with key "iso".
- If it cannot be determined confidently, return {"iso":null}.

Return ONLY JSON:
{"iso":"2026-03-06T19:00:00-08:00"}
or
{"iso":null}`,
      maxOutputTokens: 80,
    });

    const cleaned = text.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (typeof parsed.iso === "string" && parsed.iso.trim()) {
      const parsedDate = new Date(parsed.iso);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString();
      }
    }
  } catch {
    // Ignore and return null; caller can keep manual fallback behavior.
  }

  return null;
}

export async function suggestDatePlaceAndReasoning(params: {
  userA: UserSummary;
  userB: UserSummary;
  city: string;
  agreedTime: string;
}): Promise<string> {
  const { userA, userB, city, agreedTime } = params;
  if (!process.env.AI_GATEWAY_API_KEY) {
    return `Try a quiet cocktail bar or coffee spot in ${city} around ${agreedTime} so conversation stays easy.`;
  }

  try {
    const { text } = await generateText({
      model: MODEL,
      prompt: `You are a matchmaking assistant. Propose ONE concrete first-date place in ${city} for these two people.

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

Rules:
- Return a single plain-text SMS sentence under 140 characters.
- No markdown, bullets, headings, or line breaks.
- Mention a specific venue type and why it fits both people.
- Keep it practical and specific.`,
      maxOutputTokens: 120,
    });

    const cleaned = text.replace(/[*_`#>\[\]]/g, "").replace(/\s+/g, " ").trim();
    if (cleaned.length <= PLACE_SUGGESTION_MAX_CHARS) {
      return cleaned;
    }
    return `${cleaned.slice(0, PLACE_SUGGESTION_MAX_CHARS - 1).trimEnd()}...`;
  } catch {
    return `Pick a relaxed cafe or wine bar in ${city} around ${agreedTime} where both can talk comfortably.`;
  }
}
