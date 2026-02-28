import { generateText } from "ai";

const MODEL = "openai/gpt-4o-mini";

function cleanupAdlib(value: string): string | null {
  const trimmed = value
    .replace(/[`"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!trimmed) return null;
  if (trimmed.includes("?")) return null;
  if (trimmed.split(" ").length > 6) return null;
  if (trimmed.length > 48) return null;
  return trimmed;
}

export async function getOnboardingAdlib(params: {
  previousQuestion: string;
  answer: string;
  nextQuestion: string;
}): Promise<string | null> {
  const { previousQuestion, answer, nextQuestion } = params;

  if (!process.env.AI_GATEWAY_API_KEY) {
    return null;
  }

  try {
    const { text } = await generateText({
      model: MODEL,
      prompt: `Write a tiny conversational reaction to the user's answer in a matchmaking SMS flow.

Previous question: "${previousQuestion}"
User answer: "${answer}"
Next question: "${nextQuestion}"

Rules:
- Return ONLY a short reaction phrase (2-5 words).
- Do not ask a question.
- Do not include the next question.
- Keep it lowercase and natural.
- If nothing stands out, return: null

Examples:
- "fair enough."
- "love that."
- "go cards!"
- null`,
      maxOutputTokens: 20,
    });

    const cleaned = text.trim().toLowerCase();
    if (cleaned === "null") return null;
    return cleanupAdlib(cleaned);
  } catch {
    return null;
  }
}
