import { generateText } from "ai";

const MODEL = "openai/gpt-4o-mini";

function parseTags(raw: string): string[] {
  try {
    const cleaned = raw.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { tags?: unknown };
    if (!Array.isArray(parsed.tags)) return [];
    return parsed.tags
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 5);
  } catch {
    return [];
  }
}

export async function extractPhotoAiTags(
  imageBase64: string
): Promise<string[]> {
  if (!process.env.AI_GATEWAY_API_KEY) return [];

  try {
    const { text } = await generateText({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            'You generate concise visual tags for dating profile photos. Return ONLY JSON with {"tags": string[]}.',
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Tag this photo with 3-5 short physical-characteristic tags only. Focus on visible traits like hair color/type, build, facial hair, skin tone, eyewear, and obvious features. Do not tag vibe, outfit style, or setting. Return only JSON: {"tags":[...]}',
            },
            {
              type: "image",
              image: `data:image/jpeg;base64,${imageBase64}`,
            },
          ],
        },
      ],
      maxOutputTokens: 180,
    });

    return parseTags(text);
  } catch {
    return [];
  }
}
