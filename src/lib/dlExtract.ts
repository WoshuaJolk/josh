import { generateText } from "ai";
const MODEL = "openai/gpt-4o-mini";

export interface DlExtractedData {
  name: string | null;
  age: number | null;
  height: string | null;
  dateOfBirth: string | null;
}

function normalizeFullName(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const cleaned = value
    .replace(/\s+/g, " ")
    .trim();

  // Require at least first + last name.
  if (cleaned.split(" ").length < 2) return null;

  return cleaned;
}

function normalizeDob(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function parseDobToParts(value: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const trimmed = value.trim();

  // MM/DD/YYYY or M/D/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  // Month DD, YYYY (e.g. June 18, 2003)
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      year: parsed.getUTCFullYear(),
      month: parsed.getUTCMonth() + 1,
      day: parsed.getUTCDate(),
    };
  }

  return null;
}

function calculateAgeFromDob(value: string): number | null {
  const parts = parseDobToParts(value);
  if (!parts) return null;

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const currentDay = now.getUTCDate();

  let age = currentYear - parts.year;
  const hadBirthdayThisYear =
    currentMonth > parts.month ||
    (currentMonth === parts.month && currentDay >= parts.day);

  if (!hadBirthdayThisYear) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

export async function extractDriversLicenseData(
  imageBase64: string
): Promise<DlExtractedData> {
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.error("[dlExtract] Missing AI_GATEWAY_API_KEY");
    return { name: null, age: null, height: null, dateOfBirth: null };
  }

  try {
    const { text } = await generateText({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You extract structured data from US driver's license images. Return ONLY valid JSON with these fields:
- "name": FULL legal first and last name exactly as shown on the driver's license. Include middle name only if present (string or null). Do not return only first name.
- "dateOfBirth": date of birth exactly as shown on the license (string or null)
- "height": height as shown on the license, e.g. "5'10\"" (string or null)

If you cannot read a field, set it to null. Do not include any text outside the JSON object.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the FULL first and last name, date of birth, and height from this driver's license.",
            },
            {
              type: "image",
              image: `data:image/jpeg;base64,${imageBase64}`,
            },
          ],
        },
      ],
      maxOutputTokens: 200,
    });

    const cleaned = text.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const dateOfBirth = normalizeDob(parsed.dateOfBirth);
    const calculatedAge =
      dateOfBirth !== null
        ? calculateAgeFromDob(dateOfBirth)
        : typeof parsed.age === "number"
          ? parsed.age
          : null;

    return {
      name: normalizeFullName(parsed.name),
      age: calculatedAge,
      height: typeof parsed.height === "string" ? parsed.height : null,
      dateOfBirth,
    };
  } catch (err) {
    console.error("[dlExtract] Failed to extract driver's license data:", err);
    return { name: null, age: null, height: null, dateOfBirth: null };
  }
}
