import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { generateText } from "ai";
import { db } from "@/server/db";
import {
  hasValidInternalApiKey,
  INTERNAL_API_KEY_HEADER,
} from "@/lib/internalApiAuth";
import { sendSms } from "@/lib/surgeSend";
import {
  TPO_INTRO_TEXT,
  TPO_ID_TEXT,
  TPO_PHOTOS_TEXT,
  getOnboardingQuestionByIndex,
} from "@/lib/tpoConstants";
import {
  structureUserProfile,
} from "@/lib/profileStructuring";

function isWhitespaceChar(char: string): boolean {
  return (
    char === " " ||
    char === "\n" ||
    char === "\t" ||
    char === "\r" ||
    char === "\f" ||
    char === "\v"
  );
}

function collapseWhitespace(value: string): string {
  let out = "";
  let inWhitespace = false;
  for (const char of value.trim()) {
    if (isWhitespaceChar(char)) {
      if (!inWhitespace && out.length > 0) out += " ";
      inWhitespace = true;
      continue;
    }
    out += char;
    inWhitespace = false;
  }
  return out;
}

function readPhotoAiTags(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const raw = (value as Record<string, unknown>).photoAiTags;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBadgeText(value: string): string {
  return collapseWhitespace(value).toLowerCase();
}

const ONBOARDING_REMINDER_MODEL = "openai/gpt-4o-mini";
const REMINDER_MAX_CHARS = 120;

function fallbackOnboardingReminder(params: {
  onboardingStep: string;
  onboardingQuestionIndex: number | null;
  photoCount: number;
}): string {
  const { onboardingStep, onboardingQuestionIndex, photoCount } = params;
  if (onboardingStep === "AWAITING_ABOUT") {
    const question =
      getOnboardingQuestionByIndex(
        Math.max(0, onboardingQuestionIndex ?? 0)
      )?.prompt ?? "tell us about yourself.";
    return `quick reminder: ${question}`;
  }
  if (onboardingStep === "AWAITING_PHOTOS") {
    const remaining = Math.max(0, 2 - photoCount);
    if (remaining > 0) {
      return `quick reminder: send ${remaining} more photo${remaining > 1 ? "s" : ""} so we can continue onboarding.`;
    }
    return "quick reminder: send at least one close-up and one full-body photo so we can continue.";
  }
  if (onboardingStep === "AWAITING_ID") {
    return `quick reminder: ${TPO_ID_TEXT}`;
  }
  return "quick reminder: reply here when you're ready and we'll continue your onboarding.";
}

async function buildOnboardingReminder(params: {
  onboardingStep: string;
  onboardingQuestionIndex: number | null;
  photoCount: number;
}): Promise<string> {
  const fallback = fallbackOnboardingReminder(params);
  if (!process.env.AI_GATEWAY_API_KEY) {
    return fallback;
  }

  const { onboardingStep, onboardingQuestionIndex, photoCount } = params;
  const currentQuestion =
    getOnboardingQuestionByIndex(Math.max(0, onboardingQuestionIndex ?? 0))
      ?.prompt ?? null;
  const stepContext =
    onboardingStep === "AWAITING_ABOUT"
      ? `User owes an answer to this question: "${currentQuestion ?? "tell us about yourself."}"`
      : onboardingStep === "AWAITING_PHOTOS"
        ? `User is waiting on photos. Minimum is 2 total (1 close-up and 1 full-body). Current count: ${photoCount}. Canonical instruction: "${TPO_PHOTOS_TEXT}"`
        : onboardingStep === "AWAITING_ID"
          ? `User is waiting on driver's license verification. Canonical instruction: "${TPO_ID_TEXT}"`
          : `User onboarding step is "${onboardingStep}". Send a gentle progress nudge.`;

  try {
    const { text } = await generateText({
      model: ONBOARDING_REMINDER_MODEL,
      prompt: `You write reminder SMS messages for an in-progress dating app onboarding flow.

Context:
${stepContext}

Rules:
- Return one single SMS message only.
- Keep it concise (max 120 characters).
- Keep it lowercase, friendly, and direct.
- Do not include links.
- Do not mention AI.
- Do not use emojis.
- Focus on exactly what the user still needs to send right now.`,
      maxOutputTokens: 60,
    });
    const quoteChars = new Set(['"', "'", "`"]);
    let cleaned = collapseWhitespace(text);
    while (
      cleaned.length >= 2 &&
      quoteChars.has(cleaned[0]) &&
      quoteChars.has(cleaned[cleaned.length - 1])
    ) {
      cleaned = collapseWhitespace(cleaned.slice(1, -1));
    }
    const bounded = cleaned.length > REMINDER_MAX_CHARS
      ? `${cleaned.slice(0, REMINDER_MAX_CHARS - 1).trimEnd()}...`
      : cleaned;
    return bounded || fallback;
  } catch {
    return fallback;
  }
}

function updateStructuredBadge(
  structuredProfile: unknown,
  section: "about" | "preferences",
  field: string,
  currentValue: string,
  nextValue: string | null
): Prisma.InputJsonValue | null {
  if (!structuredProfile || typeof structuredProfile !== "object") return null;
  const root = JSON.parse(JSON.stringify(structuredProfile)) as Record<string, unknown>;

  if (field === "photoAiTags") {
    const existing = root.photoAiTags;
    if (!Array.isArray(existing)) return null;
    const oldNorm = normalizeBadgeText(currentValue);
    const arrayValues = existing
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

    if (nextValue === null) {
      root.photoAiTags = arrayValues.filter(
        (item) => normalizeBadgeText(item) !== oldNorm
      );
    } else {
      const nextClean = nextValue.trim();
      if (!nextClean) return null;
      let replaced = false;
      root.photoAiTags = arrayValues.map((item) => {
        if (!replaced && normalizeBadgeText(item) === oldNorm) {
          replaced = true;
          return nextClean;
        }
        return item;
      });
      if (!replaced) {
        (root.photoAiTags as unknown[]).push(nextClean);
      }
    }
    return root as unknown as Prisma.InputJsonValue;
  }

  const sectionObj = root[section];
  if (!sectionObj || typeof sectionObj !== "object") return null;
  const target = sectionObj as Record<string, unknown>;
  const existing = target[field];

  if (Array.isArray(existing)) {
    const oldNorm = normalizeBadgeText(currentValue);
    const arrayValues = existing
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

    if (nextValue === null) {
      target[field] = arrayValues.filter(
        (item) => normalizeBadgeText(item) !== oldNorm
      );
    } else {
      const nextClean = nextValue.trim();
      if (!nextClean) return null;
      let replaced = false;
      target[field] = arrayValues.map((item) => {
        if (!replaced && normalizeBadgeText(item) === oldNorm) {
          replaced = true;
          return nextClean;
        }
        return item;
      });
      if (!replaced) {
        (target[field] as unknown[]).push(nextClean);
      }
    }
    return root as unknown as Prisma.InputJsonValue;
  }

  target[field] = nextValue === null ? null : nextValue.trim();
  return root as unknown as Prisma.InputJsonValue;
}

function parseAge(value: string): number | null {
  let digits = "";
  let started = false;
  for (const char of value.trim()) {
    const isDigit = char >= "0" && char <= "9";
    if (isDigit) {
      digits += char;
      started = true;
    } else if (started) {
      break;
    }
  }
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed) || parsed < 18 || parsed > 120) return null;
  return parsed;
}

export async function POST(req: NextRequest) {
  try {
    const key = req.headers.get(INTERNAL_API_KEY_HEADER);
    if (!hasValidInternalApiKey(key)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, action, section, field, currentValue, nextValue } = body as {
      userId?: string;
      action?:
        | "delete"
        | "ban"
        | "restart_onboarding"
        | "ping_onboarding"
        | "cancel_onboarding"
        | "reparse_profile"
        | "edit_badge"
        | "delete_badge";
      section?: "about" | "preferences";
      field?: string;
      currentValue?: string;
      nextValue?: string;
    };

    if (
      !userId ||
      !action ||
      ![
        "delete",
        "ban",
        "restart_onboarding",
        "ping_onboarding",
        "cancel_onboarding",
        "reparse_profile",
        "edit_badge",
        "delete_badge",
      ].includes(action)
    ) {
      return NextResponse.json(
        {
          message:
            "userId and action (delete|ban|restart_onboarding|ping_onboarding|cancel_onboarding|reparse_profile|edit_badge|delete_badge) are required",
        },
        { status: 400 }
      );
    }

    const user = await db.tpoUser.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (action === "ban") {
      // End any active dates this user is in.
      await db.tpoDate.updateMany({
        where: {
          status: "ACTIVE",
          OR: [{ userAId: userId }, { userBId: userId }],
        },
        data: {
          status: "ENDED",
          endedAt: new Date(),
        },
      });

      await db.tpoUser.update({
        where: { id: userId },
        data: { status: "BANNED" },
      });

      return NextResponse.json({ success: true, status: "BANNED" });
    }

    if (action === "cancel_onboarding") {
      // Canceling onboarding should remove this in-progress record, not reject it.
      const dates = await db.tpoDate.findMany({
        where: {
          OR: [{ userAId: userId }, { userBId: userId }],
        },
        select: { id: true },
      });
      const dateIds = dates.map((d) => d.id);

      await db.$transaction(async (tx) => {
        if (dateIds.length > 0) {
          await tx.tpoMessage.deleteMany({
            where: { dateId: { in: dateIds } },
          });
        }

        await tx.tpoDate.deleteMany({
          where: {
            OR: [{ userAId: userId }, { userBId: userId }],
          },
        });

        await tx.tpoUser.delete({
          where: { id: userId },
        });
      });

      return NextResponse.json({ success: true, canceled: true });
    }

    if (action === "ping_onboarding") {
      const reminder = await buildOnboardingReminder({
        onboardingStep: user.onboardingStep,
        onboardingQuestionIndex: user.onboardingQuestionIndex,
        photoCount: user.photoUrls.length,
      });
      await sendSms(user.phoneNumber, reminder, {
        skipProfanityFilter: true,
      });
      return NextResponse.json({ success: true, reminder });
    }

    if (action === "restart_onboarding") {
      // End active dates if they exist to prevent stale links.
      await db.tpoDate.updateMany({
        where: {
          status: "ACTIVE",
          OR: [{ userAId: userId }, { userBId: userId }],
        },
        data: {
          status: "ENDED",
          endedAt: new Date(),
        },
      });

      await db.tpoUser.update({
        where: { id: userId },
        data: {
          status: "ONBOARDING",
          onboardingStep: "AWAITING_ABOUT",
          onboardingQuestionIndex: 0,
          aboutMe: null,
          aboutFollowupAsked: false,
          aboutFollowupCount: 0,
          preferences: null,
          preferencesFollowupAsked: false,
          preferencesFollowupCount: 0,
          city: null,
          structuredProfile: Prisma.DbNull,
          photoUrls: [],
          idPhotoUrl: null,
          dlName: null,
          dlAge: null,
          dlHeight: null,
        },
      });

      const firstQuestion =
        getOnboardingQuestionByIndex(0)?.prompt ?? "tell us about yourself.";
      await sendSms(user.phoneNumber, TPO_INTRO_TEXT, { skipProfanityFilter: true });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await sendSms(user.phoneNumber, firstQuestion, {
        skipProfanityFilter: true,
      });
      return NextResponse.json({ success: true, status: "ONBOARDING" });
    }

    if (action === "reparse_profile") {
      const nextStructured = await structureUserProfile({
        aboutMe: user.aboutMe,
        preferences: user.preferences,
        city: user.city,
        dlName: user.dlName,
        dlAge: user.dlAge,
        dlHeight: user.dlHeight,
      });

      const nextPhotoTags = Array.from(
        new Set(readPhotoAiTags(user.structuredProfile))
      );
      const structuredProfileWithTags = {
        ...nextStructured,
        photoAiTags: nextPhotoTags,
      } as unknown as Prisma.InputJsonValue;

      await db.tpoUser.update({
        where: { id: userId },
        data: { structuredProfile: structuredProfileWithTags },
      });
      return NextResponse.json({ success: true, reparsed: true });
    }

    if (action === "edit_badge" || action === "delete_badge") {
      if (
        (section !== "about" && section !== "preferences") ||
        !field ||
        !currentValue ||
        (action === "edit_badge" && (!nextValue || !nextValue.trim()))
      ) {
        return NextResponse.json(
          {
            message:
              "section, field, currentValue and nextValue (for edit_badge) are required",
          },
          { status: 400 }
        );
      }

      const nextValueForUpdate: string | null =
        action === "edit_badge" ? (nextValue as string) : null;

      if (section === "about" && field === "city") {
        await db.tpoUser.update({
          where: { id: userId },
          data: { city: nextValueForUpdate },
        });
        return NextResponse.json({ success: true });
      }

      if (section === "about" && field === "height") {
        await db.tpoUser.update({
          where: { id: userId },
          data: { dlHeight: nextValueForUpdate },
        });
        return NextResponse.json({ success: true });
      }

      if (section === "about" && field === "age") {
        const parsedAge =
          nextValueForUpdate === null ? null : parseAge(nextValueForUpdate);
        if (nextValueForUpdate !== null && parsedAge === null) {
          return NextResponse.json(
            { message: "Age must be a number between 18 and 120" },
            { status: 400 }
          );
        }
        await db.tpoUser.update({
          where: { id: userId },
          data: { dlAge: parsedAge },
        });
        return NextResponse.json({ success: true });
      }

      const nextStructured = updateStructuredBadge(
        user.structuredProfile,
        section,
        field,
        currentValue,
        nextValueForUpdate
      );
      if (!nextStructured) {
        return NextResponse.json(
          { message: "Unable to update badge for this user profile" },
          { status: 400 }
        );
      }

      await db.tpoUser.update({
        where: { id: userId },
        data: { structuredProfile: nextStructured },
      });
      return NextResponse.json({ success: true });
    }

    // action === "delete"
    // Remove all date messages and dates for this user before deleting user.
    const dates = await db.tpoDate.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      select: { id: true },
    });
    const dateIds = dates.map((d) => d.id);

    await db.$transaction(async (tx) => {
      if (dateIds.length > 0) {
        await tx.tpoMessage.deleteMany({
          where: { dateId: { in: dateIds } },
        });
      }

      await tx.tpoDate.deleteMany({
        where: {
          OR: [{ userAId: userId }, { userBId: userId }],
        },
      });

      await tx.tpoUser.delete({
        where: { id: userId },
      });
    });

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("[tpo/admin/user-action] Error:", error);
    return NextResponse.json(
      { message: "Failed to perform user action" },
      { status: 500 }
    );
  }
}
