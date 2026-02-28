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

    const users = await db.tpoUser.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[tpo/admin/users] Error:", error);
    return NextResponse.json(
      { message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
