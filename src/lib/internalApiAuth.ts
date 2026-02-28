import { timingSafeEqual } from "node:crypto";

export const INTERNAL_API_KEY_HEADER = "x-internal-api-key";
const MUTUAL_INTERNAL_API_KEY = process.env.MUTUAL_INTERNAL_API_KEY;

function constantTimeEquals(a: string, b: string) {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);

  if (aBytes.length !== bBytes.length) {
    return false;
  }

  return timingSafeEqual(aBytes, bBytes);
}

export function getInternalApiHeadersOrThrow() {
  if (!MUTUAL_INTERNAL_API_KEY) {
    throw new Error("Missing required env var: MUTUAL_INTERNAL_API_KEY");
  }

  return {
    [INTERNAL_API_KEY_HEADER]: MUTUAL_INTERNAL_API_KEY,
  };
}

export function hasValidInternalApiKey(providedInternalApiKey: string | null) {
  if (!MUTUAL_INTERNAL_API_KEY || !providedInternalApiKey) {
    return false;
  }

  return constantTimeEquals(providedInternalApiKey, MUTUAL_INTERNAL_API_KEY);
}
