import { generateText } from "ai";

const MODEL = "openai/gpt-4o-mini";

interface QualityResult {
  isComprehensive: boolean;
  followUpQuestion: string | null;
}

const EVASIVE_ANSWERS = new Set([
  "idk",
  "i dont know",
  "i don't know",
  "not sure",
  "maybe",
  "whatever",
  "anything",
  "up to you",
  "n/a",
  "na",
]);

function normalizeText(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function parseQualityResult(raw: string): QualityResult {
  try {
    const cleaned = raw.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      isComprehensive?: unknown;
      followUpQuestion?: unknown;
    };
    return {
      isComprehensive: parsed.isComprehensive === true,
      followUpQuestion:
        typeof parsed.followUpQuestion === "string" &&
        parsed.followUpQuestion.trim().length > 0
          ? parsed.followUpQuestion.trim()
          : null,
    };
  } catch {
    return { isComprehensive: true, followUpQuestion: null };
  }
}

function needsOpenToBothPreference(answer: string): boolean {
  const normalized = normalizeText(answer);
  const saysBoth =
    normalized.includes("both") ||
    normalized.includes("open to both") ||
    normalized.includes("either");
  const indicatesPreference =
    normalized.includes("prefer") ||
    normalized.includes("lean") ||
    normalized.includes("mostly") ||
    normalized.includes("more");
  return saysBoth && !indicatesPreference;
}

function hasConcreteSignal(answer: string): boolean {
  const normalized = normalizeText(answer);
  if (!normalized) return false;
  if (EVASIVE_ANSWERS.has(normalized)) return false;
  if (normalized.length >= 4) return true;
  return ["yes", "no"].includes(normalized);
}

function shouldUseHeuristicAccept(question: string, answer: string): boolean {
  const normalizedQuestion = normalizeText(question);
  const normalizedAnswer = normalizeText(answer);

  if (!hasConcreteSignal(normalizedAnswer)) {
    return false;
  }

  if (
    normalizedQuestion.includes("looking for a hookup or a long-term relationship")
  ) {
    const mentionsHookup = normalizedAnswer.includes("hookup");
    const mentionsLongTerm =
      normalizedAnswer.includes("long-term") ||
      normalizedAnswer.includes("long term");
    const mentionsBoth =
      normalizedAnswer.includes("both") || normalizedAnswer.includes("either");

    if (mentionsBoth) {
      return !needsOpenToBothPreference(normalizedAnswer);
    }
    return mentionsHookup || mentionsLongTerm;
  }

  // Most non-empty, concrete answers should pass quickly.
  return true;
}

export async function evaluateOnboardingAnswer(params: {
  question: string;
  answer: string;
}): Promise<QualityResult> {
  const { question, answer } = params;
  const normalizedQuestion = normalizeText(question);
  const normalizedAnswer = normalizeText(answer);

  if (!normalizedAnswer || EVASIVE_ANSWERS.has(normalizedAnswer)) {
    return {
      isComprehensive: false,
      followUpQuestion: "quick one: can you give me a clear answer so i can match well?",
    };
  }

  if (
    normalizedQuestion.includes("looking for a hookup or a long-term relationship") &&
    needsOpenToBothPreference(answer)
  ) {
    return {
      isComprehensive: false,
      followUpQuestion:
        "got it. if you're open to both, which way are you leaning right now?",
    };
  }

  if (shouldUseHeuristicAccept(question, answer)) {
    console.log("[tpo/answer-quality] heuristic_accept", {
      question: normalizedQuestion.slice(0, 80),
      answerLength: normalizedAnswer.length,
    });
    return { isComprehensive: true, followUpQuestion: null };
  }

  if (!process.env.AI_GATEWAY_API_KEY) {
    console.log("[tpo/answer-quality] ai_disabled_accept");
    return { isComprehensive: true, followUpQuestion: null };
  }

  try {
    const { text } = await generateText({
      model: MODEL,
      prompt: `You evaluate a dating app onboarding answer.
Question: "${question}"
Answer: "${answer}"

Rules:
1. "isComprehensive": true if the answer directly addresses the question with a choice, specific detail, or valid preference.
   - Short answers like "yes", "no", "never", "tall", "blue" ARE comprehensive if they answer the prompt.
   - Only return false if the answer is evasive ("idk", "maybe"), completely irrelevant, or misses the main choice requested.
   - If the answer is brief but direct, mark true.
2. "followUpQuestion":
   - If comprehensive=false, provide ONE short natural nudge (max 15 words) asking for the specific missing detail.
   - Do NOT restate the original question. Ask only for the missing detail.
   - Keep a conversational tone.
   - If comprehensive=true, return null.

Return ONLY JSON:
{"isComprehensive": true|false, "followUpQuestion": "..." | null}`,
      maxOutputTokens: 140,
    });

    return parseQualityResult(text);
  } catch (error) {
    console.warn("[tpo/answer-quality] ai_error_accept", error);
    return { isComprehensive: true, followUpQuestion: null };
  }
}
