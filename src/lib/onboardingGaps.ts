import { generateText } from "ai";
const MODEL = "openai/gpt-4o-mini";

interface GapCheckResult {
  followUpQuestion: string | null;
  missingAreas: string[];
}

function parseGapResult(raw: string): GapCheckResult {
  try {
    const cleaned = raw.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      followUpQuestion?: unknown;
      missingAreas?: unknown;
    };
    return {
      followUpQuestion:
        typeof parsed.followUpQuestion === "string" &&
        parsed.followUpQuestion.trim().length > 0
          ? parsed.followUpQuestion.trim()
          : null,
      missingAreas: Array.isArray(parsed.missingAreas)
        ? parsed.missingAreas
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 4)
        : [],
    };
  } catch {
    return { followUpQuestion: null, missingAreas: [] };
  }
}

async function checkForSevereGap(
  type: "about" | "preferences",
  content: string
): Promise<GapCheckResult> {
  if (!process.env.AI_GATEWAY_API_KEY) {
    return { followUpQuestion: null, missingAreas: [] };
  }

  const prompt =
    type === "about"
      ? `you are evaluating a dating onboarding "about me" response for missing information.
important: do not ask for name, age, height, or partner preferences.
this section is only about the person themselves.

User response:
"""
${content}
"""

identify whether we are missing important detail for matching quality across:
- personality and emotional style
- lifestyle and routine
- communication/conflict style
- relationship intent and pacing
- values, boundaries, or non-negotiables
- interests and social energy

if there are gaps, return one concise follow-up question that asks for specific detail (not generic).
if there are no meaningful gaps, return null.

Return ONLY JSON:
{"followUpQuestion":"...", "missingAreas":["..."]} or {"followUpQuestion":null, "missingAreas":[]}`
      : `you are evaluating a dating onboarding "preferences" response for missing specificity.
important: do not ask for the user's own bio details like name, age, or height.
this section is only what they want in a partner.

User response:
"""
${content}
"""

identify whether we are missing important detail across:
- relationship type, pace, and seriousness
- personality and emotional traits they want
- lifestyle compatibility (schedule, social style, habits)
- values and worldview alignment
- physical preferences (if they care)
- dealbreakers and hard boundaries

if there are gaps, return one concise follow-up question that pushes for specificity (ranges, examples, priorities, or must-haves).
if there are no meaningful gaps, return null.

Return ONLY JSON:
{"followUpQuestion":"...", "missingAreas":["..."]} or {"followUpQuestion":null, "missingAreas":[]}`;

  try {
    const { text } = await generateText({
      model: MODEL,
      prompt,
      maxOutputTokens: 180,
    });

    return parseGapResult(text);
  } catch {
    return { followUpQuestion: null, missingAreas: [] };
  }
}

export async function checkAboutGaps(content: string): Promise<GapCheckResult> {
  return checkForSevereGap("about", content);
}

export async function checkPreferenceGaps(
  content: string
): Promise<GapCheckResult> {
  return checkForSevereGap("preferences", content);
}
