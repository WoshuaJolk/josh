import { resolveDateStartIso } from "@/lib/datePlanner";

const MIN_PROPOSED_TIME_LEAD_DAYS = 2;

export function slotLabel(slot: string | null): string {
  return slot?.trim() || "a time that works for both of you";
}

export function getSharedCity(cityA?: string | null, cityB?: string | null): string {
  const a = cityA?.trim();
  const b = cityB?.trim();
  if (a && b && a.toLowerCase() === b.toLowerCase()) return a;
  return a || b || "your city";
}

export function buildInitialSchedulingPrompt(params: {
  slot: string;
  city: string;
}): string {
  const { slot } = params;
  return `you're matched! are you free at ${slot} for a first date ?`;
}

export function buildSchedulingAvailabilityPrompt(params: {
  slot: string;
  previousSlot?: string | null;
}): string {
  const { slot, previousSlot } = params;
  const next = slotLabel(slot);
  const previous = slotLabel(previousSlot ?? "");
  if (previousSlot && previous.toLowerCase() !== next.toLowerCase()) {
    return `update: your match could not do ${previous}. are you free at ${next} instead ?`;
  }
  return `hey! are you free at ${next} ?`;
}

export function buildRequestAlternativePrompt(): string {
  return "what day and time works better for you?";
}

export function buildDecisionClarifyPrompt(proposalLabel: string): string {
  return `please confirm if ${proposalLabel} works, or send one new day and time that works better.`;
}

export function buildFinalSchedulingMessage(params: { agreedTime: string }): string {
  const { agreedTime } = params;
  return `date confirmed for ${agreedTime}. chat is now open through this number.`;
}

export async function validateProposedSlotLeadTime(params: {
  slot: string;
  city: string;
  referenceIso?: string;
}): Promise<string | null> {
  const { slot, city, referenceIso } = params;
  const referenceMs = (() => {
    if (!referenceIso) return Date.now();
    const parsedRef = new Date(referenceIso).getTime();
    return Number.isNaN(parsedRef) ? Date.now() : parsedRef;
  })();

  const resolvedIso = await resolveDateStartIso({
    slot,
    city,
    referenceIso,
  });
  if (!resolvedIso) {
    return "that time is too soon - we need at least 2 days notice to coordinate. please share another time 2+ days from now.";
  }

  const resolvedDate = new Date(resolvedIso);
  if (Number.isNaN(resolvedDate.getTime())) {
    return "that time is too soon - we need at least 2 days notice to coordinate. please share another time 2+ days from now.";
  }

  const referenceDate = new Date(referenceMs);
  const referenceStartUtc = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate()
  );
  const resolvedStartUtc = Date.UTC(
    resolvedDate.getUTCFullYear(),
    resolvedDate.getUTCMonth(),
    resolvedDate.getUTCDate()
  );
  const dayDiff = Math.floor((resolvedStartUtc - referenceStartUtc) / (24 * 60 * 60 * 1000));
  if (dayDiff < MIN_PROPOSED_TIME_LEAD_DAYS) {
    return "that time is too soon - we need at least 2 days notice to coordinate. please share another time 2+ days from now.";
  }
  return null;
}
