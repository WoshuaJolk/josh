import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  hasValidInternalApiKey,
  INTERNAL_API_KEY_HEADER,
} from "@/lib/internalApiAuth";

export async function GET(req: NextRequest) {
  try {
    const key = req.headers.get(INTERNAL_API_KEY_HEADER);
    if (!hasValidInternalApiKey(key)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateId = searchParams.get("dateId");
    if (!dateId) {
      return NextResponse.json({ message: "dateId is required" }, { status: 400 });
    }

    const messages = await db.tpoMessage.findMany({
      where: { dateId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        fromPhone: true,
        toPhone: true,
        body: true,
        blocked: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[tpo/admin/messages] Error:", error);
    return NextResponse.json(
      { message: "Failed to fetch date messages" },
      { status: 500 }
    );
  }
}
