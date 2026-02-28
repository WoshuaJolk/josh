import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import {
  hasValidInternalApiKey,
  INTERNAL_API_KEY_HEADER,
} from "@/lib/internalApiAuth";
import { sendSms } from "@/lib/surgeSend";
import {
  TPO_INTRO_TEXT,
  getOnboardingQuestionByIndex,
} from "@/lib/tpoConstants";
import {
  structureUserProfile,
} from "@/lib/profileStructuring";

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
  return value.trim().toLowerCase().replace(/\s+/g, " ");
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
        "cancel_onboarding",
        "reparse_profile",
        "edit_badge",
        "delete_badge",
      ].includes(action)
    ) {
      return NextResponse.json(
        {
          message:
            "userId and action (delete|ban|restart_onboarding|cancel_onboarding|reparse_profile|edit_badge|delete_badge) are required",
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
