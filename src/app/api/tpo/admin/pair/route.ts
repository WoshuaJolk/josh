import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  hasValidInternalApiKey,
  INTERNAL_API_KEY_HEADER,
} from "@/lib/internalApiAuth";
import { sendSms } from "@/lib/surgeSend";
import { proposeInitialTimeSlot } from "@/lib/tpoScheduling";

export async function POST(req: NextRequest) {
  try {
    const key = req.headers.get(INTERNAL_API_KEY_HEADER);
    if (!hasValidInternalApiKey(key)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userAId, userBId } = body;

    if (!userAId || !userBId) {
      return NextResponse.json(
        { message: "userAId and userBId are required" },
        { status: 400 }
      );
    }

    if (userAId === userBId) {
      return NextResponse.json(
        { message: "Cannot pair a user with themselves" },
        { status: 400 }
      );
    }

    const [userA, userB] = await Promise.all([
      db.tpoUser.findUnique({ where: { id: userAId } }),
      db.tpoUser.findUnique({ where: { id: userBId } }),
    ]);

    if (!userA || !userB) {
      return NextResponse.json(
        { message: "One or both users not found" },
        { status: 404 }
      );
    }

    if (userA.status !== "APPROVED" || userB.status !== "APPROVED") {
      return NextResponse.json(
        { message: "Both users must be approved before pairing" },
        { status: 400 }
      );
    }

    const existingActive = await db.tpoDate.findFirst({
      where: {
        status: "ACTIVE",
        OR: [
          { userAId: { in: [userAId, userBId] } },
          { userBId: { in: [userAId, userBId] } },
        ],
      },
    });

    if (existingActive) {
      return NextResponse.json(
        { message: "One or both users already have an active date" },
        { status: 409 }
      );
    }

    const date = await db.tpoDate.create({
      data: {
        userAId,
        userBId,
        status: "ACTIVE",
        portalEnabled: false,
      },
    });

    // Only notify A now — B will be notified when A confirms a time
    await sendSms(userA.phoneNumber, "you've been matched!", {
      skipProfanityFilter: true,
    });

    // Kick off scheduling: propose an initial time to User A
    const today = new Date();
    const proposedSlot = await proposeInitialTimeSlot({ today });
    const proposalMsg = `let's get the date on the calendar. how does ${proposedSlot} work for you?`;

    await db.tpoDate.update({
      where: { id: date.id },
      data: {
        schedulingPhase: "WAITING_FOR_A_REPLY",
        proposedSlot,
      },
    });

    await sendSms(userA.phoneNumber, proposalMsg, { skipProfanityFilter: true });

    await db.tpoMessage.create({
      data: {
        dateId: date.id,
        fromPhone: "system",
        toPhone: userA.phoneNumber,
        body: proposalMsg,
        blocked: false,
      },
    });

    return NextResponse.json({ success: true, dateId: date.id });
  } catch (error) {
    console.error("[tpo/admin/pair] Error:", error);
    return NextResponse.json(
      { message: "Failed to create pair" },
      { status: 500 }
    );
  }
}
