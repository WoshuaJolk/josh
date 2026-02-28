import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  hasValidInternalApiKey,
  INTERNAL_API_KEY_HEADER,
} from "@/lib/internalApiAuth";
import { sendSms } from "@/lib/surgeSend";
import { TPO_DATE_ENDED_TEXT } from "@/lib/tpoConstants";

export async function POST(req: NextRequest) {
  try {
    const key = req.headers.get(INTERNAL_API_KEY_HEADER);
    if (!hasValidInternalApiKey(key)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { dateId } = body;

    if (!dateId) {
      return NextResponse.json(
        { message: "dateId is required" },
        { status: 400 }
      );
    }

    const date = await db.tpoDate.findUnique({
      where: { id: dateId },
      include: { userA: true, userB: true },
    });

    if (!date) {
      return NextResponse.json(
        { message: "Date not found" },
        { status: 404 }
      );
    }

    if (date.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "Date is not active" },
        { status: 400 }
      );
    }

    await db.tpoDate.update({
      where: { id: dateId },
      data: { status: "ENDED", endedAt: new Date() },
    });

    await Promise.all([
      sendSms(date.userA.phoneNumber, TPO_DATE_ENDED_TEXT, {
        skipProfanityFilter: true,
      }),
      sendSms(date.userB.phoneNumber, TPO_DATE_ENDED_TEXT, {
        skipProfanityFilter: true,
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[tpo/admin/end-date] Error:", error);
    return NextResponse.json(
      { message: "Failed to end date" },
      { status: 500 }
    );
  }
}
