import { generateText } from "ai";

const MODEL = "openai/gpt-5";

export interface SchedulingInterpretation {
  intent: "accept" | "reject" | "propose_new_time" | "clarify";
  canonicalSlot?: string;
  clarificationQuestion?: string;
}

export async function interpretSchedulingReply(params: {
  message: string;
  proposedSlot: string;
  city?: string | null;
  recentMessages?: string[];
  referenceIso?: string;
  senderLabel?: "A" | "B";
}): Promise<SchedulingInterpretation> {
  const {
    message,
    proposedSlot,
    city,
    recentMessages = [],
    referenceIso,
    senderLabel,
  } = params;
  const latestMessage = message.trim();
  if (!latestMessage) {
    return {
      intent: "clarify",
      clarificationQuestion: "can you share a day and time that works for you?",
    };
  }
  const hasAiKey = Boolean(process.env.AI_GATEWAY_API_KEY);

  const history = recentMessages.map((item) => item.trim()).filter(Boolean);
  try {
    if (!hasAiKey) throw new Error("ai-key-missing");
    const { text } = await generateText({
      model: MODEL,
      prompt: `Interpret one scheduling SMS reply.
Current proposed slot: ${proposedSlot}
Latest sender label: ${senderLabel ?? "unknown"}
Latest reply: "${latestMessage}"
Recent scheduling thread context (oldest -> newest): ${history.length > 0 ? history.map((entry) => `"${entry}"`).join(", ") : "none"}
City context: ${city ?? "unknown"}
Current date/time reference: ${referenceIso ?? new Date().toISOString()}

Return ONLY JSON with keys:
- intent: "accept" | "reject" | "propose_new_time" | "clarify"
- canonicalSlot: string | null
- clarificationQuestion: string | null

Guidance:
- "accept" when the sender agrees to the current proposed slot.
- "reject" when the sender declines without giving a new time.
- "propose_new_time" when the sender suggests or asks about an alternative time.
- "clarify" only when you truly cannot tell if they accepted, rejected, or proposed a time.
- Keep canonicalSlot concise, lowercase, and faithful to what they suggested.
`,
      maxOutputTokens: 120,
    });
    const cleaned = text.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const intent = parsed.intent;
    if (
      intent === "accept" ||
      intent === "reject" ||
      intent === "propose_new_time" ||
      intent === "clarify"
    ) {
      const result: SchedulingInterpretation = {
        intent,
        canonicalSlot:
          typeof parsed.canonicalSlot === "string" && parsed.canonicalSlot.trim()
            ? parsed.canonicalSlot.trim().toLowerCase()
            : undefined,
        clarificationQuestion:
          typeof parsed.clarificationQuestion === "string" &&
          parsed.clarificationQuestion.trim()
            ? parsed.clarificationQuestion.trim()
            : undefined,
      };

      const resolved = await resolveDateStartIso({
        slot: latestMessage,
        city,
        referenceIso,
      });
      if (resolved && result.intent !== "accept" && result.intent !== "reject") {
        return {
          intent: "propose_new_time",
          canonicalSlot: latestMessage.trim().toLowerCase(),
        };
      }

      return result;
    }
  } catch {
    // fall through
  }

  const normalized = latestMessage.toLowerCase();
  const timeHint =
    /\b(tomorrow|tmr|tmrw|tonight|tonite|today|this weekend|weekend|next|mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday)\b/.test(
      normalized
    ) || /\b\d{1,2}(:\d{2})?\s?(am|pm)\b/.test(normalized);
  if (timeHint) {
    return {
      intent: "propose_new_time",
      canonicalSlot: latestMessage.trim().toLowerCase(),
    };
  }

  return {
    intent: "clarify",
    clarificationQuestion: "can you share a day and time that works for you?",
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

export async function suggestInitialSlot(params: {
  city?: string | null;
  referenceIso?: string;
}): Promise<string | null> {
  const { city, referenceIso } = params;
  if (!process.env.AI_GATEWAY_API_KEY) return null;

  try {
    const { text } = await generateText({
      model: MODEL,
      prompt: `Suggest one concrete date/time for a first date.
City context: ${city ?? "unknown"}
Reference timestamp: ${referenceIso ?? new Date().toISOString()}

Rules:
- Pick a time at least 2 days from the reference timestamp.
- Return a short natural-language slot (e.g., "next friday at 7 pm").
- Return only JSON with key "slot".

Return ONLY JSON:
{"slot":"next friday at 7 pm"}
or
{"slot":null}`,
      maxOutputTokens: 60,
    });

    const cleaned = text.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (typeof parsed.slot === "string" && parsed.slot.trim()) {
      return parsed.slot.trim().toLowerCase();
    }
  } catch {
    // ignore
  }

  return null;
}
