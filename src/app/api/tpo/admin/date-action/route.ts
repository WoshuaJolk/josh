import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  hasValidInternalApiKey,
  INTERNAL_API_KEY_HEADER,
} from "@/lib/internalApiAuth";
import { sendSms } from "@/lib/surgeSend";
import { suggestDatePlaceAndReasoning } from "@/lib/datePlanner";
import { TPO_DATE_PLAN_READY_TEXT_PREFIX } from "@/lib/tpoConstants";

function getSharedCity(cityA?: string | null, cityB?: string | null): string {
  const a = cityA?.trim();
  const b = cityB?.trim();
  if (a && b && a.toLowerCase() === b.toLowerCase()) return a;
  return a || b || "your city";
}

export async function POST(req: NextRequest) {
  try {
    const key = req.headers.get(INTERNAL_API_KEY_HEADER);
    if (!hasValidInternalApiKey(key)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { dateId, action, slot, target } = body as {
      dateId?: string;
      action?: string;
      slot?: string;
      target?: "A" | "B";
    };

    if (!dateId || !action) {
      return NextResponse.json(
        { message: "dateId and action are required" },
        { status: 400 }
      );
    }

    const date = await db.tpoDate.findUnique({
      where: { id: dateId },
      include: { userA: true, userB: true },
    });
    if (!date) {
      return NextResponse.json({ message: "Date not found" }, { status: 404 });
    }

    if (action === "resend_prompt") {
      const prompt = `can you do ${date.proposedSlot ?? "the proposed time"}? reply yes or no.`;
      if (
        date.schedulingPhase === "WAITING_FOR_A_REPLY" ||
        date.schedulingPhase === "WAITING_FOR_A_ALTERNATIVE"
      ) {
        await sendSms(date.userA.phoneNumber, prompt, { skipProfanityFilter: true });
      } else if (
        date.schedulingPhase === "WAITING_FOR_B_REPLY" ||
        date.schedulingPhase === "WAITING_FOR_B_ALTERNATIVE"
      ) {
        await sendSms(date.userB.phoneNumber, prompt, { skipProfanityFilter: true });
      }
      await db.tpoDate.update({
        where: { id: date.id },
        data: {
          schedulingAttemptCount: { increment: 1 },
          lastSchedulingMessageAt: new Date(),
        },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "force_propose_slot") {
      if (!slot?.trim()) {
        return NextResponse.json(
          { message: "slot is required for force_propose_slot" },
          { status: 400 }
        );
      }
      const targetUser = target === "B" ? date.userB : date.userA;
      const waitingPhase = target === "B" ? "WAITING_FOR_B_REPLY" : "WAITING_FOR_A_REPLY";
      await db.tpoDate.update({
        where: { id: date.id },
        data: {
          proposedSlot: slot.trim(),
          userAAvailable: null,
          userBAvailable: null,
          schedulingPhase: waitingPhase,
          schedulingAttemptCount: { increment: 1 },
          lastSchedulingMessageAt: new Date(),
        },
      });
      await sendSms(
        targetUser.phoneNumber,
        `can you do ${slot.trim()}? reply yes or no.`,
        { skipProfanityFilter: true }
      );
      return NextResponse.json({ success: true });
    }

    if (action === "mark_agreed_open_portal") {
      const agreedTime = slot?.trim() || date.proposedSlot || "the agreed time";
      const city = getSharedCity(date.userA.city, date.userB.city);
      const placeSuggestion = await suggestDatePlaceAndReasoning({
        city,
        agreedTime,
        userA: {
          name: date.userA.dlName,
          age: date.userA.dlAge,
          height: date.userA.dlHeight,
          aboutMe: date.userA.aboutMe,
          preferences: date.userA.preferences,
          city: date.userA.city,
        },
        userB: {
          name: date.userB.dlName,
          age: date.userB.dlAge,
          height: date.userB.dlHeight,
          aboutMe: date.userB.aboutMe,
          preferences: date.userB.preferences,
          city: date.userB.city,
        },
      });
      await db.tpoDate.update({
        where: { id: date.id },
        data: {
          portalEnabled: true,
          agreedTime,
          suggestedPlace: placeSuggestion,
          schedulingPhase: "AGREED",
        },
      });

      const finalMessage = `${TPO_DATE_PLAN_READY_TEXT_PREFIX}\n\n${placeSuggestion}\n\nonce you both confirm this works, just text here — the chat portal is now open.`.toLowerCase();
      await Promise.all([
        sendSms(date.userA.phoneNumber, finalMessage, { skipProfanityFilter: true }),
        sendSms(date.userB.phoneNumber, finalMessage, { skipProfanityFilter: true }),
      ]);
      return NextResponse.json({ success: true });
    }

    if (action === "escalate_date") {
      await db.tpoDate.update({
        where: { id: date.id },
        data: {
          schedulingPhase: "ESCALATED",
          schedulingEscalatedAt: new Date(),
          schedulingFailedReason: "manual_admin_escalation",
        },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("[tpo/admin/date-action] Error:", error);
    return NextResponse.json(
      { message: "Failed to perform date action" },
      { status: 500 }
    );
  }
}
