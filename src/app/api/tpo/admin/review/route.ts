import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  hasValidInternalApiKey,
  INTERNAL_API_KEY_HEADER,
} from "@/lib/internalApiAuth";
import { sendSms } from "@/lib/surgeSend";
import { TPO_ACCEPTED_TEXT, TPO_REJECTED_TEXT } from "@/lib/tpoConstants";

export async function POST(req: NextRequest) {
  try {
    const key = req.headers.get(INTERNAL_API_KEY_HEADER);
    if (!hasValidInternalApiKey(key)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, action } = body;

    if (!userId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { message: "userId and action (approve|reject) are required" },
        { status: 400 }
      );
    }

    const user = await db.tpoUser.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    if (user.status !== "PENDING_REVIEW") {
      return NextResponse.json(
        { message: `User is not pending review (current: ${user.status})` },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    await db.tpoUser.update({
      where: { id: userId },
      data: { status: newStatus as "APPROVED" | "REJECTED" },
    });

    const smsText = action === "approve" ? TPO_ACCEPTED_TEXT : TPO_REJECTED_TEXT;
    await sendSms(user.phoneNumber, smsText, { skipProfanityFilter: true });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("[tpo/admin/review] Error:", error);
    return NextResponse.json(
      { message: "Failed to review user" },
      { status: 500 }
    );
  }
}
