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
    const status = searchParams.get("status");

    const where = status ? { status: status as never } : {};

    const dates = await db.tpoDate.findMany({
      where,
      include: {
        userA: {
          select: {
            id: true,
            phoneNumber: true,
            aboutMe: true,
            photoUrls: true,
            city: true,
            dlName: true,
            dlAge: true,
            dlHeight: true,
          },
        },
        userB: {
          select: {
            id: true,
            phoneNumber: true,
            aboutMe: true,
            photoUrls: true,
            city: true,
            dlName: true,
            dlAge: true,
            dlHeight: true,
          },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ dates });
  } catch (error) {
    console.error("[tpo/admin/dates] Error:", error);
    return NextResponse.json(
      { message: "Failed to fetch dates" },
      { status: 500 }
    );
  }
}
