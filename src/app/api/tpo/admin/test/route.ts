import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  hasValidInternalApiKey,
  INTERNAL_API_KEY_HEADER,
} from "@/lib/internalApiAuth";
import { handleSchedulingReplyCore } from "@/lib/tpoSchedulingEngine";
import { suggestInitialSlot } from "@/lib/datePlanner";
import { buildInitialSchedulingPrompt, getSharedCity } from "@/lib/tpoSchedulingShared";

const TEST_PHONE_A = "+19990000001";
const TEST_PHONE_B = "+19990000002";

async function ensureTestUsers() {
  const [userA, userB] = await Promise.all([
    db.tpoUser.findUnique({ where: { phoneNumber: TEST_PHONE_A } }),
    db.tpoUser.findUnique({ where: { phoneNumber: TEST_PHONE_B } }),
  ]);

  const createdA =
    userA ??
    (await db.tpoUser.create({
      data: {
        phoneNumber: TEST_PHONE_A,
        status: "APPROVED",
        dlName: "Test User A",
        city: "New York",
      },
    }));

  const createdB =
    userB ??
    (await db.tpoUser.create({
      data: {
        phoneNumber: TEST_PHONE_B,
        status: "APPROVED",
        dlName: "Test User B",
        city: "New York",
      },
    }));

  return { userA: createdA, userB: createdB };
}

async function fetchState() {
  const { userA, userB } = await ensureTestUsers();
  const date = await db.tpoDate.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        { userAId: userA.id, userBId: userB.id },
        { userAId: userB.id, userBId: userA.id },
      ],
    },
    include: { userA: true, userB: true, messages: { orderBy: { createdAt: "asc" } } },
  });

  return {
    userA,
    userB,
    date,
    messages: date?.messages ?? [],
  };
}

async function appendSystemMessage(dateId: string, toPhone: string, body: string) {
  await db.tpoMessage.create({
    data: {
      dateId,
      fromPhone: "SYSTEM",
      toPhone,
      body,
      blocked: false,
    },
  });
}

async function ensurePair() {
  const { userA, userB } = await ensureTestUsers();
  const existing = await db.tpoDate.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        { userAId: userA.id, userBId: userB.id },
        { userAId: userB.id, userBId: userA.id },
      ],
    },
    include: { messages: true },
  });

  if (existing) {
    if (existing.messages.length === 0) {
      const sharedCity = getSharedCity(userA.city, userB.city);
      const suggested = await suggestInitialSlot({
        city: sharedCity,
        referenceIso: new Date().toISOString(),
      });
      const proposedSlot = suggested ?? "next friday at 7:00 pm";
      await db.tpoDate.update({
        where: { id: existing.id },
        data: {
          proposedSlot,
          schedulingPhase: "WAITING_FOR_A_REPLY",
          schedulingAttemptCount: 1,
          lastSchedulingMessageAt: new Date(),
        },
      });
      await appendSystemMessage(
        existing.id,
        userA.phoneNumber,
        buildInitialSchedulingPrompt({ slot: proposedSlot, city: sharedCity })
      );
    }
    return existing;
  }

  const sharedCity = getSharedCity(userA.city, userB.city);
  const suggested = await suggestInitialSlot({
    city: sharedCity,
    referenceIso: new Date().toISOString(),
  });
  const proposedSlot = suggested ?? "next friday at 7:00 pm";

  const created = await db.tpoDate.create({
    data: {
      userAId: userA.id,
      userBId: userB.id,
      status: "ACTIVE",
      portalEnabled: false,
      proposedSlot,
      userAAvailable: null,
      userBAvailable: null,
      schedulingPhase: "WAITING_FOR_A_REPLY",
      schedulingAttemptCount: 1,
      lastSchedulingMessageAt: new Date(),
    },
  });

  await appendSystemMessage(
    created.id,
    userA.phoneNumber,
    buildInitialSchedulingPrompt({ slot: proposedSlot, city: sharedCity })
  );
  return created;
}

async function resetPair() {
  const { userA, userB } = await ensureTestUsers();
  const existing = await db.tpoDate.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        { userAId: userA.id, userBId: userB.id },
        { userAId: userB.id, userBId: userA.id },
      ],
    },
  });

  if (existing) {
    await db.tpoMessage.deleteMany({ where: { dateId: existing.id } });
    await db.tpoDate.delete({ where: { id: existing.id } });
  }

  await ensurePair();
}

async function sendTestMessage(sender: "A" | "B", text: string) {
  const { userA, userB } = await ensureTestUsers();
  const date = await db.tpoDate.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        { userAId: userA.id, userBId: userB.id },
        { userAId: userB.id, userBId: userA.id },
      ],
    },
  });
  if (!date) return;

  const senderPhone = sender === "A" ? userA.phoneNumber : userB.phoneNumber;
  await db.tpoMessage.create({
    data: {
      dateId: date.id,
      fromPhone: senderPhone,
      toPhone: "SYSTEM",
      body: text,
      blocked: false,
    },
  });

  await handleSchedulingReplyCore({
    senderPhone,
    messageBody: text,
    deliverMessage: async (toPhone, message) => {
      await appendSystemMessage(date.id, toPhone, message);
    },
  });
}

export async function GET(req: NextRequest) {
  const key = req.headers.get(INTERNAL_API_KEY_HEADER);
  if (!hasValidInternalApiKey(key)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const state = await fetchState();
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  const key = req.headers.get(INTERNAL_API_KEY_HEADER);
  if (!hasValidInternalApiKey(key)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const action = body?.action;

  if (action === "setup_accounts") {
    await ensureTestUsers();
    const state = await fetchState();
    return NextResponse.json(state);
  }

  if (action === "ensure_pair") {
    await ensurePair();
    const state = await fetchState();
    return NextResponse.json(state);
  }

  if (action === "reset") {
    await resetPair();
    const state = await fetchState();
    return NextResponse.json(state);
  }

  if (action === "send_message") {
    const sender = body?.sender as "A" | "B";
    const text = String(body?.text ?? "").trim();
    if (!text || (sender !== "A" && sender !== "B")) {
      return NextResponse.json(
        { message: "sender and text are required" },
        { status: 400 }
      );
    }
    await ensurePair();
    await sendTestMessage(sender, text);
    const state = await fetchState();
    return NextResponse.json(state);
  }

  return NextResponse.json({ message: "Unknown action" }, { status: 400 });
}
