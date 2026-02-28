import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { sendSms } from "@/lib/surgeSend";
import {
  TPO_INTRO_TEXT,
  getOnboardingQuestionByIndex,
} from "@/lib/tpoConstants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phoneNumber } = body;

    if (
      !phoneNumber ||
      typeof phoneNumber !== "string" ||
      !/^\+1\d{10}$/.test(phoneNumber)
    ) {
      return NextResponse.json(
        { message: "Invalid phone number. Expected E.164 format (+1XXXXXXXXXX)." },
        { status: 400 }
      );
    }

    const existing = await db.tpoUser.findUnique({
      where: { phoneNumber },
    });

    if (existing) {
      if (existing.status === "BANNED") {
        return NextResponse.json(
          { message: "This number has been banned from jøsh." },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { message: "You've already signed up! Check your texts." },
        { status: 409 }
      );
    }

    await db.tpoUser.create({
      data: {
        phoneNumber,
        status: "ONBOARDING",
        onboardingStep: "AWAITING_ABOUT",
          onboardingQuestionIndex: 0,
      },
    });

    const firstQuestion =
      getOnboardingQuestionByIndex(0)?.prompt ?? "tell us about yourself.";
    await sendSms(phoneNumber, TPO_INTRO_TEXT, { skipProfanityFilter: true });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await sendSms(phoneNumber, firstQuestion, { skipProfanityFilter: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Some throw sites can throw `null`/non-Error values; normalize before logging.
    const errorPayload =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : {
            message: String(error ?? "Unknown error"),
          };

    console.error("[tpo/signup] Error", errorPayload);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
