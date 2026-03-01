import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  hasValidInternalApiKey,
  INTERNAL_API_KEY_HEADER,
} from "@/lib/internalApiAuth";
import {
  proposeInitialTimeSlot,
  analyzeSchedulingResponse,
  suggestDateSpot,
} from "@/lib/tpoScheduling";

const TEST_PHONE_A = "+15550000001";
const TEST_PHONE_B = "+15550000002";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type BotSend = { to: string; body: string };

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function upsertTestUsers() {
  const [userA, userB] = await Promise.all([
    db.tpoUser.upsert({
      where: { phoneNumber: TEST_PHONE_A },
      create: {
        phoneNumber: TEST_PHONE_A,
        status: "APPROVED",
        onboardingStep: "COMPLETE",
        city: "New York",
        aboutMe:
          "Q: tell us about yourself\nA: I'm a graphic designer who loves hiking, craft coffee, and catching indie shows on weeknights. Pretty spontaneous, but I like knowing there's a plan. Looking for something real — not just something to pass time.",
        structuredProfile: {
          about: {
            hobbies: ["hiking", "coffee", "live music"],
            activityLevel: "active",
            drinking: "socially",
            planningStyle: "spontaneous",
            fridayNight: "out with friends or a show",
          },
          preferences: {
            datePlanningPreference: "low-key but intentional",
            mustHaves: ["curiosity", "kindness"],
          },
        },
      },
      update: { status: "APPROVED" },
    }),
    db.tpoUser.upsert({
      where: { phoneNumber: TEST_PHONE_B },
      create: {
        phoneNumber: TEST_PHONE_B,
        status: "APPROVED",
        onboardingStep: "COMPLETE",
        city: "New York",
        aboutMe:
          "Q: tell us about yourself\nA: Software engineer, big reader, weekend cook. I'm into long walks, trying new restaurants, and the occasional dive bar. Laid-back but ambitious. Looking for something meaningful.",
        structuredProfile: {
          about: {
            hobbies: ["reading", "cooking", "restaurants"],
            activityLevel: "moderate",
            drinking: "socially",
            planningStyle: "planner",
            fridayNight: "dinner out or a cozy bar",
          },
          preferences: {
            datePlanningPreference: "something with a vibe",
            mustHaves: ["ambition", "humor"],
          },
        },
      },
      update: { status: "APPROVED" },
    }),
  ]);
  return { userA, userB };
}

// Snapshot just the fields the UI cares about
async function snapDate(dateId: string) {
  const d = await db.tpoDate.findUnique({ where: { id: dateId } });
  if (!d) return null;
  return {
    id: d.id,
    schedulingPhase: d.schedulingPhase,
    proposedSlot: d.proposedSlot,
    agreedTime: d.agreedTime,
    suggestedPlace: d.suggestedPlace,
    portalEnabled: d.portalEnabled,
  };
}

// Load all TpoMessages for a date, split by which user they belong to
async function loadMessages(dateId: string) {
  const msgs = await db.tpoMessage.findMany({
    where: { dateId },
    orderBy: { createdAt: "asc" },
  });

  const forA = msgs.filter(
    (m) => m.fromPhone === TEST_PHONE_A || m.toPhone === TEST_PHONE_A
  );
  const forB = msgs.filter(
    (m) => m.fromPhone === TEST_PHONE_B || m.toPhone === TEST_PHONE_B
  );

  const format = (m: (typeof msgs)[number]) => ({
    id: m.id,
    role: m.fromPhone === "system" ? ("bot" as const) : ("user" as const),
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  });

  return {
    userAMessages: forA.map(format),
    userBMessages: forB.map(format),
  };
}

// ─── Core scheduling state machine (no SMS — collects sends instead) ──────────

async function processSchedulingMessage(
  dateId: string,
  senderPhone: string,
  messageBody: string
): Promise<BotSend[]> {
  const botSends: BotSend[] = [];

  const activeDate = await db.tpoDate.findUnique({
    where: { id: dateId },
    include: { userA: true, userB: true },
  });

  if (!activeDate) throw new Error("Date not found");

  const isUserA = activeDate.userA.phoneNumber === senderPhone;
  const phase = activeDate.schedulingPhase;

  const isExpectedActor =
    (isUserA &&
      (phase === "WAITING_FOR_A_REPLY" ||
        phase === "WAITING_FOR_A_ALTERNATIVE")) ||
    (!isUserA &&
      (phase === "WAITING_FOR_B_REPLY" ||
        phase === "WAITING_FOR_B_ALTERNATIVE"));

  // Helper: record a bot send and log to DB
  const send = async (toPhone: string, body: string) => {
    botSends.push({ to: toPhone, body });
    await db.tpoMessage.create({
      data: { dateId, fromPhone: "system", toPhone, body, blocked: false },
    });
  };

  // Load conversation history for this user BEFORE logging the new message
  const pastMessages = await db.tpoMessage.findMany({
    where: {
      dateId,
      OR: [{ fromPhone: senderPhone }, { toPhone: senderPhone }],
    },
    orderBy: { createdAt: "asc" },
  });

  const conversation = [
    ...pastMessages.map((msg) => ({
      role: (msg.fromPhone === "system" ? "assistant" : "user") as
        | "assistant"
        | "user",
      content: msg.body,
    })),
    { role: "user" as const, content: messageBody },
  ];

  // Log the incoming user message
  await db.tpoMessage.create({
    data: {
      dateId,
      fromPhone: senderPhone,
      toPhone: "system",
      body: messageBody,
      blocked: false,
    },
  });

  if (!isExpectedActor) {
    await send(senderPhone, "just checking with your match — hang tight!");
    return botSends;
  }

  const today = new Date();
  const analysis = await analyzeSchedulingResponse({
    conversation,
    proposedSlot: activeDate.proposedSlot,
    today,
  });

  const otherUser = isUserA ? activeDate.userB : activeDate.userA;

  // Too soon
  if (analysis.tooSoon && analysis.proposedAlternative) {
    const minDate = addDays(today, 2);
    const minDateStr = minDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    await send(
      senderPhone,
      `that's a bit soon — can you pick something after ${minDateStr}?`
    );
    return botSends;
  }

  // Needs clarification
  if (analysis.needsClarification && analysis.clarificationQuestion) {
    await send(senderPhone, analysis.clarificationQuestion);
    return botSends;
  }

  // Notify B for the first time if they haven't been messaged yet
  const notifyBIfFirst = async () => {
    const priorBCount = await db.tpoMessage.count({
      where: { dateId, toPhone: otherUser.phoneNumber },
    });
    if (priorBCount === 0) {
      await send(otherUser.phoneNumber, "you've been matched!");
    }
  };

  switch (phase) {
    case "WAITING_FOR_A_REPLY":
    case "WAITING_FOR_A_ALTERNATIVE": {
      if (analysis.accepted && phase === "WAITING_FOR_A_REPLY") {
        await send(senderPhone, "perfect — checking with your match now!");
        await notifyBIfFirst();
        const bMsg = `your match is free on ${activeDate.proposedSlot ?? "the proposed time"}. does that work for you?`;
        await send(otherUser.phoneNumber, bMsg);
        await db.tpoDate.update({
          where: { id: dateId },
          data: { schedulingPhase: "WAITING_FOR_B_REPLY" },
        });
      } else if (analysis.proposedAlternative) {
        const newSlot = analysis.proposedAlternative;
        await send(senderPhone, "perfect — checking with your match now!");
        await notifyBIfFirst();
        const bMsg = `your match is free on ${newSlot}. does that work for you?`;
        await send(otherUser.phoneNumber, bMsg);
        await db.tpoDate.update({
          where: { id: dateId },
          data: { schedulingPhase: "WAITING_FOR_B_REPLY", proposedSlot: newSlot },
        });
      } else {
        await send(senderPhone, "no worries — what time works better for you?");
        if (phase !== "WAITING_FOR_A_ALTERNATIVE") {
          await db.tpoDate.update({
            where: { id: dateId },
            data: { schedulingPhase: "WAITING_FOR_A_ALTERNATIVE" },
          });
        }
      }
      break;
    }

    case "WAITING_FOR_B_REPLY":
    case "WAITING_FOR_B_ALTERNATIVE": {
      if (analysis.accepted) {
        const city =
          activeDate.userA.city ?? activeDate.userB.city ?? "your city";
        const agreedTime = activeDate.proposedSlot ?? "your agreed time";
        const venue = await suggestDateSpot({
          userAProfile: activeDate.userA.structuredProfile as object | null,
          userBProfile: activeDate.userB.structuredProfile as object | null,
          city,
          agreedTime,
        });
        const confirmation = `you're both confirmed for ${agreedTime}!\n\ndate spot: ${venue}\n\nany messages to this number now go straight to your match. have fun!`;
        await db.tpoDate.update({
          where: { id: dateId },
          data: {
            schedulingPhase: "AGREED",
            agreedTime,
            suggestedPlace: venue,
            portalEnabled: true,
          },
        });
        await send(activeDate.userA.phoneNumber, confirmation);
        await send(activeDate.userB.phoneNumber, confirmation);
      } else if (analysis.proposedAlternative) {
        const newSlot = analysis.proposedAlternative;
        await send(senderPhone, "got it — i'll check with your match!");
        const aMsg = `your match can't do ${activeDate.proposedSlot ?? "that time"}, but is free on ${newSlot}. does that work for you?`;
        await send(otherUser.phoneNumber, aMsg);
        await db.tpoDate.update({
          where: { id: dateId },
          data: { schedulingPhase: "WAITING_FOR_A_REPLY", proposedSlot: newSlot },
        });
      } else {
        await send(senderPhone, "no worries — i'll find another time!");
        const aMsg = `your match can't do ${activeDate.proposedSlot ?? "that time"}. got another time that works?`;
        await send(otherUser.phoneNumber, aMsg);
        await db.tpoDate.update({
          where: { id: dateId },
          data: { schedulingPhase: "WAITING_FOR_A_ALTERNATIVE" },
        });
      }
      break;
    }

    default:
      break;
  }

  return botSends;
}

// ─── GET: load messages for a date ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  const key = req.headers.get(INTERNAL_API_KEY_HEADER);
  if (!hasValidInternalApiKey(key)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const dateId = req.nextUrl.searchParams.get("dateId");
  if (!dateId) {
    return NextResponse.json({ message: "dateId required" }, { status: 400 });
  }

  const [messages, dateSnap] = await Promise.all([
    loadMessages(dateId),
    snapDate(dateId),
  ]);

  return NextResponse.json({ ...messages, date: dateSnap });
}

// ─── POST: init | send | reset ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const key = req.headers.get(INTERNAL_API_KEY_HEADER);
    if (!hasValidInternalApiKey(key)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body as { action: string };

    // ── init ──────────────────────────────────────────────────────────────────
    if (action === "init") {
      // End any existing active test dates
      const existing = await db.tpoDate.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { userA: { phoneNumber: { in: [TEST_PHONE_A, TEST_PHONE_B] } } },
            { userB: { phoneNumber: { in: [TEST_PHONE_A, TEST_PHONE_B] } } },
          ],
        },
      });
      if (existing.length > 0) {
        await db.tpoDate.updateMany({
          where: { id: { in: existing.map((d) => d.id) } },
          data: { status: "ENDED", endedAt: new Date() },
        });
      }

      const { userA, userB } = await upsertTestUsers();

      const date = await db.tpoDate.create({
        data: {
          userAId: userA.id,
          userBId: userB.id,
          status: "ACTIVE",
          portalEnabled: false,
        },
      });

      const botSends: BotSend[] = [];
      const today = new Date();
      const proposedSlot = await proposeInitialTimeSlot({ today });
      const proposalMsg = `let's get the date on the calendar. how does ${proposedSlot} work for you?`;

      // Only notify A now — B will be notified when A confirms a time
      const initMessages: BotSend[] = [
        { to: TEST_PHONE_A, body: "you've been matched!" },
        { to: TEST_PHONE_A, body: proposalMsg },
      ];

      for (const msg of initMessages) {
        botSends.push(msg);
        await db.tpoMessage.create({
          data: {
            dateId: date.id,
            fromPhone: "system",
            toPhone: msg.to,
            body: msg.body,
            blocked: false,
          },
        });
      }

      await db.tpoDate.update({
        where: { id: date.id },
        data: { schedulingPhase: "WAITING_FOR_A_REPLY", proposedSlot },
      });

      const messages = await loadMessages(date.id);
      const dateSnap = await snapDate(date.id);

      return NextResponse.json({
        dateId: date.id,
        userAPhone: TEST_PHONE_A,
        userBPhone: TEST_PHONE_B,
        botSends,
        ...messages,
        date: dateSnap,
      });
    }

    // ── send ──────────────────────────────────────────────────────────────────
    if (action === "send") {
      const { dateId, senderPhone, messageBody } = body as {
        dateId: string;
        senderPhone: string;
        messageBody: string;
      };

      if (!dateId || !senderPhone || !messageBody?.trim()) {
        return NextResponse.json(
          { message: "dateId, senderPhone, messageBody required" },
          { status: 400 }
        );
      }

      const botSends = await processSchedulingMessage(
        dateId,
        senderPhone,
        messageBody
      );

      const messages = await loadMessages(dateId);
      const dateSnap = await snapDate(dateId);

      return NextResponse.json({ botSends, ...messages, date: dateSnap });
    }

    // ── reset ─────────────────────────────────────────────────────────────────
    if (action === "reset") {
      const { dateId } = body as { dateId?: string };

      if (dateId) {
        await db.tpoMessage.deleteMany({ where: { dateId } });
        await db.tpoDate.update({
          where: { id: dateId },
          data: { status: "ENDED", endedAt: new Date() },
        });
      } else {
        // End all active test dates
        const testDates = await db.tpoDate.findMany({
          where: {
            status: "ACTIVE",
            OR: [
              { userA: { phoneNumber: { in: [TEST_PHONE_A, TEST_PHONE_B] } } },
              { userB: { phoneNumber: { in: [TEST_PHONE_A, TEST_PHONE_B] } } },
            ],
          },
        });
        for (const d of testDates) {
          await db.tpoMessage.deleteMany({ where: { dateId: d.id } });
        }
        await db.tpoDate.updateMany({
          where: { id: { in: testDates.map((d) => d.id) } },
          data: { status: "ENDED", endedAt: new Date() },
        });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ message: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[schedule-sim] Error:", error);
    return NextResponse.json(
      { message: "Simulation error", error: String(error) },
      { status: 500 }
    );
  }
}
