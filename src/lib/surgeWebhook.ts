import { createHmac, timingSafeEqual } from "node:crypto";

const SURGE_WEBHOOK_SECRET = process.env.SURGE_WEBHOOK_SECRET;
const MAX_AGE_SECONDS = 300; // 5 minutes

export function validateSurgeSignature(
  signatureHeader: string | null,
  rawBody: string
): boolean {
  if (!SURGE_WEBHOOK_SECRET || !signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split(",");
  let timestamp: string | null = null;
  const v1Hashes: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (key === "t") {
      timestamp = value;
    } else if (key === "v1" && value) {
      v1Hashes.push(value);
    }
  }

  if (!timestamp || v1Hashes.length === 0) {
    return false;
  }

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > MAX_AGE_SECONDS) {
    return false;
  }

  const payload = `${timestamp}.${rawBody}`;
  const expectedHash = createHmac("sha256", SURGE_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  const expectedBuf = Buffer.from(expectedHash, "hex");

  return v1Hashes.some((hash) => {
    const hashBuf = Buffer.from(hash, "hex");
    if (hashBuf.length !== expectedBuf.length) {
      return false;
    }
    return timingSafeEqual(hashBuf, expectedBuf);
  });
}
