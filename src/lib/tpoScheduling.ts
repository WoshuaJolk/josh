import { generateText } from "ai";

const MODEL = "mistral/mistral-medium";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateFriendly(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ─── proposeInitialTimeSlot ───────────────────────────────────────────────────

export async function proposeInitialTimeSlot(params: {
  today: Date;
}): Promise<string> {
  const { today } = params;
  const minDate = addDays(today, 2);
  const minDateStr = formatDateFriendly(minDate);
  const todayStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const fallback = formatDateFriendly(addDays(today, 3)) + " at 7pm";

  if (!process.env.AI_GATEWAY_API_KEY) {
    return fallback;
  }

  try {
    const { text } = await generateText({
      model: MODEL,
      prompt: `You are scheduling a first date for a dating app.

Today is ${todayStr}.
The earliest allowed date is ${minDateStr} (must be at least 2 full days from today).

Suggest ONE specific date and time for a first date. Pick a weekend evening or weekday evening after work — something that naturally fits a casual first date.

Rules:
- The date must be on or after ${minDateStr}.
- Return ONLY the date/time string. No explanation, no quotes.
- Format example: "Saturday, March 8th at 7pm"`,
      maxOutputTokens: 30,
    });

    const cleaned = text.trim().replace(/^["']|["']$/g, "");
    if (cleaned.length > 5 && cleaned.length < 80) {
      return cleaned;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

// ─── analyzeSchedulingResponse ────────────────────────────────────────────────

export interface SchedulingAnalysis {
  accepted: boolean;
  proposedAlternative: string | null;
  tooSoon: boolean;
  needsClarification: boolean;
  clarificationQuestion: string | null;
}

function parseAnalysis(
  raw: string
): Omit<SchedulingAnalysis, "tooSoon"> & { proposedDateYMD: string | null } {
  try {
    const cleaned = raw.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<{
      accepted: boolean;
      proposedAlternative: string | null;
      proposedDateYMD: string | null;
      needsClarification: boolean;
      clarificationQuestion: string | null;
    }>;
    return {
      accepted: parsed.accepted === true,
      proposedAlternative:
        typeof parsed.proposedAlternative === "string" &&
        parsed.proposedAlternative.trim()
          ? parsed.proposedAlternative.trim()
          : null,
      proposedDateYMD:
        typeof parsed.proposedDateYMD === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(parsed.proposedDateYMD.trim())
          ? parsed.proposedDateYMD.trim()
          : null,
      needsClarification: parsed.needsClarification === true,
      clarificationQuestion:
        typeof parsed.clarificationQuestion === "string" &&
        parsed.clarificationQuestion.trim()
          ? parsed.clarificationQuestion.trim()
          : null,
    };
  } catch {
    return {
      accepted: false,
      proposedAlternative: null,
      proposedDateYMD: null,
      needsClarification: true,
      clarificationQuestion: "just to confirm — does that time work for you?",
    };
  }
}

export async function analyzeSchedulingResponse(params: {
  conversation: { role: "assistant" | "user"; content: string }[];
  proposedSlot: string | null;
  today: Date;
}): Promise<SchedulingAnalysis> {
  const { conversation, proposedSlot, today } = params;
  const todayStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (!process.env.AI_GATEWAY_API_KEY) {
    return {
      accepted: true,
      proposedAlternative: null,
      tooSoon: false,
      needsClarification: false,
      clarificationQuestion: null,
    };
  }

  const conversationText = conversation
    .map((m) => `${m.role === "assistant" ? "Bot" : "User"}: ${m.content}`)
    .join("\n");

  try {
    const { text } = await generateText({
      model: MODEL,
      prompt: `You are analyzing a user's message in a dating app scheduling conversation.

Today is ${todayStr}.
${proposedSlot ? `Currently proposed time: "${proposedSlot}"` : "No specific time has been proposed yet."}

Full conversation (the last "User:" line is the message to analyze — use all prior context to resolve ambiguous references like "Friday", "7pm", or "6 days from now"):
${conversationText}

Your job: classify the last User message into exactly one of three outcomes.

OUTCOME 1 — accepted=true
The user is clearly agreeing to the CURRENTLY PROPOSED time with no counter-suggestion.
Signal words: "yes", "yeah", "yep", "sure", "works", "works for me", "sounds good", "that works", "perfect", "great", "ok", "okay", "fine with that", "i'm in", "let's do it".
⚠️ CRITICAL: If the user mentions ANY different day, time, or uses words like "how about", "what about", "instead", "rather", "prefer", "can we do" — this is NOT accepted, it is an alternative proposal (Outcome 2).

OUTCOME 2 — proposedAlternative set
The user is suggesting a different time (even if phrased positively).
Signal phrases: "how about X", "what about X", "can we do X", "X works better", "X instead", "rather do X", mentioning any specific day/time that differs from the proposed time.
Resolve relative references using today = ${todayStr}:
  - "tomorrow" = the day after today
  - "next Friday" = the coming Friday
  - "in 6 days" / "6 days from now" = today + 6 days
Return proposedAlternative as a full absolute date string like "Saturday, March 8th at 7pm".
Also return proposedDateYMD as "YYYY-MM-DD" for the same date (e.g. "2026-03-08"). This must be the resolved calendar date.
If the user gives a day without a time, set proposedAlternative to the day only and leave proposedDateYMD to that day's date.

OUTCOME 3 — needsClarification=true
The intent is genuinely ambiguous — you cannot tell if they're accepting or proposing something else.
Provide a short natural clarificationQuestion (max 10 words, lowercase).

Return ONLY valid JSON (no markdown):
{
  "accepted": true or false,
  "proposedAlternative": "full absolute date like 'Saturday, March 8th at 7pm'" or null,
  "proposedDateYMD": "YYYY-MM-DD" or null,
  "needsClarification": true or false,
  "clarificationQuestion": "short SMS follow-up (max 10 words, lowercase)" or null
}

Rules:
- Exactly one outcome applies. If in doubt between accepted and alternative, choose alternative.
- If accepted=true, all other fields are false/null.
- If proposedAlternative is non-null, also set proposedDateYMD. Set accepted=false.
- When resolving relative dates, always calculate from today = ${todayStr}.`,
      maxOutputTokens: 160,
    });

    const { proposedDateYMD, ...base } = parseAnalysis(text);

    // Compare YYYY-MM-DD strings — lexicographic order is correct for dates.
    // This is reliable code-level validation; no extra AI call needed.
    let tooSoon = false;
    if (proposedDateYMD) {
      const minDate = addDays(today, 2);
      const minYMD = minDate.toISOString().slice(0, 10); // "YYYY-MM-DD"
      tooSoon = proposedDateYMD < minYMD;
    }

    return { ...base, tooSoon };
  } catch {
    return {
      accepted: false,
      proposedAlternative: null,
      tooSoon: false,
      needsClarification: true,
      clarificationQuestion: "just to confirm — does that time work for you?",
    };
  }
}

// ─── suggestDateSpot ──────────────────────────────────────────────────────────

function profileSummary(profile: object | null): string {
  if (!profile) return "no profile info";
  const p = profile as Record<string, unknown>;
  const about = p.about as Record<string, unknown> | undefined;
  const prefs = p.preferences as Record<string, unknown> | undefined;
  const relevant = {
    hobbies: about?.hobbies,
    activityLevel: about?.activityLevel,
    fridayNight: about?.fridayNight,
    drinking: about?.drinking,
    planningStyle: about?.planningStyle,
    lookingForNow: about?.lookingForNow,
    mustHaves: prefs?.mustHaves,
    datePlanningPreference: prefs?.datePlanningPreference,
  };
  return JSON.stringify(relevant);
}

export async function suggestDateSpot(params: {
  userAProfile: object | null;
  userBProfile: object | null;
  city: string;
  agreedTime: string;
}): Promise<string> {
  const { userAProfile, userBProfile, city, agreedTime } = params;

  const fallback = `Cafe Maud in East Village, New York — cozy but lively, great for a first date conversation.`;

  function isSpecificVenueSuggestion(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.length < 12 || trimmed.length > 250) return false;
    if (!trimmed.includes("—")) return false;

    const [venuePart] = trimmed.split("—");
    const venue = venuePart.trim();
    const lowerVenue = venue.toLowerCase();

    // Must look like an actual establishment reference with a location.
    if (!/\sin\s/i.test(venue)) return false;

    // Reject generic vibe-only outputs.
    const genericPhrases = [
      "a cozy",
      "a casual",
      "a lively",
      "a rooftop",
      "a coffee shop",
      "a wine bar",
      "a cocktail spot",
      "a brunch place",
      "somewhere",
      "spot in",
      "place in",
      "bar in",
      "restaurant in",
      "bistro",
    ];
    if (genericPhrases.some((phrase) => lowerVenue.includes(phrase))) return false;

    // Require at least one capitalized token to resemble a proper noun.
    return /\b[A-Z][a-zA-Z0-9&'.-]*\b/.test(venue);
  }

  if (!process.env.AI_GATEWAY_API_KEY) {
    return fallback;
  }

  try {
    const { text } = await generateText({
      model: MODEL,
      prompt: `You are suggesting a first date venue for two people on a dating app.

City: ${city}
Date/time: ${agreedTime}

Person A's vibe: ${profileSummary(userAProfile)}
Person B's vibe: ${profileSummary(userBProfile)}

Suggest ONE real, specific establishment in ${city} that exists in real life and matches both people's energy.

Rules:
- Under 180 characters total
- Must include the real venue name and a neighborhood/area
- Do NOT suggest a generic vibe-only place (e.g., "a cozy bistro")
- If uncertain about niche spots, pick a widely known real place in ${city}
- End with a short reason it fits them both
- Format: "[real venue name] in [neighborhood/area], [city] — [why it fits you both]"`,
      maxOutputTokens: 80,
    });

    const cleaned = text.trim().replace(/^["']|["']$/g, "");
    if (isSpecificVenueSuggestion(cleaned)) {
      return cleaned;
    }

    // Retry once with stricter constraints if first output is too generic.
    const retry = await generateText({
      model: MODEL,
      prompt: `Return one line only in this exact format:
"[real venue name] in [neighborhood/area], [city] — [short reason]"

City: ${city}
Date/time: ${agreedTime}
Vibes:
- Person A: ${profileSummary(userAProfile)}
- Person B: ${profileSummary(userBProfile)}

Hard constraints:
- The venue must be a real establishment that exists in ${city}
- No generic phrases like "cozy bistro", "wine bar", "cocktail spot", "coffee shop"
- Include a proper venue name and neighborhood/area`,
      maxOutputTokens: 80,
    });
    const retryCleaned = retry.text.trim().replace(/^["']|["']$/g, "");
    if (isSpecificVenueSuggestion(retryCleaned)) {
      return retryCleaned;
    }
    return fallback;
  } catch {
    return fallback;
  }
}
