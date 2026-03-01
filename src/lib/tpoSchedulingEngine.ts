import { db } from "@/server/db";
import { interpretSchedulingReply } from "@/lib/datePlanner";
import {
  buildDecisionClarifyPrompt,
  buildRequestAlternativePrompt,
  buildSchedulingAvailabilityPrompt,
  buildFinalSchedulingMessage,
  getSharedCity,
  slotLabel,
  validateProposedSlotLeadTime,
} from "@/lib/tpoSchedulingShared";
import { TPO_SCHEDULING_WAITING_TEXT } from "@/lib/tpoConstants";

type DeliverMessage = (toPhone: string, message: string) => Promise<void>;

type Interpretation = {
  intent: "accept" | "reject" | "clarify" | "propose_new_time";
  canonicalSlot?: string;
  clarificationQuestion?: string;
};

export async function handleSchedulingReplyCore(params: {
  senderPhone: string;
  messageBody: string | null;
  deliverMessage: DeliverMessage;
}): Promise<boolean> {
  const { senderPhone, messageBody, deliverMessage } = params;
  if (!messageBody) return false;

  const date = await db.tpoDate.findFirst({
    where: {
      status: "ACTIVE",
      portalEnabled: false,
      OR: [
        { userA: { phoneNumber: senderPhone } },
        { userB: { phoneNumber: senderPhone } },
      ],
    },
    include: { userA: true, userB: true },
  });
  if (!date) return false;

  const senderIsA = date.userA.phoneNumber === senderPhone;
  const waitingOnA = date.schedulingPhase === "WAITING_FOR_A_REPLY";
  const waitingOnB = date.schedulingPhase === "WAITING_FOR_B_REPLY";
  if ((waitingOnA && !senderIsA) || (waitingOnB && senderIsA)) {
    await deliverMessage(senderPhone, TPO_SCHEDULING_WAITING_TEXT);
    return true;
  }

  const proposalLabel = slotLabel(date.proposedSlot);
  const sharedCity = getSharedCity(date.userA.city, date.userB.city);
  const senderLabel = senderIsA ? "A" : "B";
  const interpretation = (await interpretSchedulingReply({
    message: messageBody,
    proposedSlot: proposalLabel,
    city: sharedCity,
    recentMessages: [],
    referenceIso: new Date().toISOString(),
    senderLabel,
  })) as Interpretation;

  const recipientPhone = senderIsA ? date.userB.phoneNumber : date.userA.phoneNumber;
  const markTouch = async () => {
    await db.tpoDate.update({
      where: { id: date.id },
      data: {
        schedulingAttemptCount: { increment: 1 },
        lastSchedulingMessageAt: new Date(),
      },
    });
  };

  if (interpretation.intent === "accept") {
    if (senderIsA) {
      await db.tpoDate.update({
        where: { id: date.id },
        data: {
          userAAvailable: true,
          userBAvailable: null,
          schedulingPhase: "WAITING_FOR_B_REPLY",
          schedulingAttemptCount: { increment: 1 },
          lastSchedulingMessageAt: new Date(),
        },
      });
      await deliverMessage(
        recipientPhone,
        buildSchedulingAvailabilityPrompt({
          slot: proposalLabel,
        })
      );
      await deliverMessage(senderPhone, TPO_SCHEDULING_WAITING_TEXT);
      return true;
    }

    await db.tpoDate.update({
      where: { id: date.id },
      data: {
        userAAvailable: true,
        userBAvailable: true,
        schedulingPhase: "AGREED",
        agreedTime: proposalLabel,
        portalEnabled: true,
      },
    });

    const finalMessage = buildFinalSchedulingMessage({ agreedTime: proposalLabel });
    await Promise.all([
      deliverMessage(date.userA.phoneNumber, finalMessage),
      deliverMessage(date.userB.phoneNumber, finalMessage),
    ]);
    return true;
  }

  if (interpretation.intent === "reject") {
    await deliverMessage(senderPhone, buildRequestAlternativePrompt());
    await markTouch();
    return true;
  }

  if (interpretation.intent === "propose_new_time") {
    const candidateSlot = interpretation.canonicalSlot?.trim();
    if (!candidateSlot) {
      await deliverMessage(senderPhone, buildRequestAlternativePrompt());
      await markTouch();
      return true;
    }

    const leadTimeMessage = await validateProposedSlotLeadTime({
      slot: candidateSlot,
      city: sharedCity,
      referenceIso: new Date().toISOString(),
    });
    if (leadTimeMessage) {
      await deliverMessage(senderPhone, leadTimeMessage);
      await markTouch();
      return true;
    }

    await db.tpoDate.update({
      where: { id: date.id },
      data: senderIsA
        ? {
            proposedSlot: candidateSlot,
            userAAvailable: true,
            userBAvailable: null,
            schedulingPhase: "WAITING_FOR_B_REPLY",
            schedulingAttemptCount: { increment: 1 },
            lastSchedulingMessageAt: new Date(),
          }
        : {
            proposedSlot: candidateSlot,
            userAAvailable: null,
            userBAvailable: true,
            schedulingPhase: "WAITING_FOR_A_REPLY",
            schedulingAttemptCount: { increment: 1 },
            lastSchedulingMessageAt: new Date(),
          },
    });

    await deliverMessage(
      recipientPhone,
      buildSchedulingAvailabilityPrompt({
        slot: candidateSlot,
        previousSlot: proposalLabel,
      })
    );
    await deliverMessage(senderPhone, TPO_SCHEDULING_WAITING_TEXT);
    return true;
  }

  await deliverMessage(
    senderPhone,
    interpretation.clarificationQuestion ?? buildDecisionClarifyPrompt(proposalLabel)
  );
  await markTouch();
  return true;
}
