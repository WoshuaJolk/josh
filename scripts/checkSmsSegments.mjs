import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const CONSTANTS_PATH = resolve(ROOT, "src/lib/tpoConstants.ts");

const GSM_7_BASIC_CHARS = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ`¿abcdefghijklmnopqrstuvwxyzäöñüà"
);
const GSM_7_EXTENDED_CHARS = new Set("^{}\\[~]|€");

function estimateSegments(message) {
  let gsmUnits = 0;
  for (const char of message) {
    if (GSM_7_BASIC_CHARS.has(char)) {
      gsmUnits += 1;
      continue;
    }
    if (GSM_7_EXTENDED_CHARS.has(char)) {
      gsmUnits += 2;
      continue;
    }

    const ucsUnits = message.length;
    return {
      encoding: "UCS-2",
      units: ucsUnits,
      segments: ucsUnits <= 70 ? 1 : Math.ceil(ucsUnits / 67),
    };
  }

  return {
    encoding: "GSM-7",
    units: gsmUnits,
    segments: gsmUnits <= 160 ? 1 : Math.ceil(gsmUnits / 153),
  };
}

function parseTpoConstants(fileText) {
  const pattern = /export const (TPO_[A-Z0-9_]+)\s*=\s*\n\s*"([\s\S]*?)";/g;
  const parsed = [];
  for (const match of fileText.matchAll(pattern)) {
    const name = match[1];
    const raw = match[2];
    const text = raw.replace(/\\n/g, "\n");
    parsed.push({ name, text });
  }
  return parsed;
}

function main() {
  const source = readFileSync(CONSTANTS_PATH, "utf8");
  const constants = parseTpoConstants(source);
  if (constants.length === 0) {
    console.error(`[sms-check] No TPO_* constants found in ${CONSTANTS_PATH}`);
    process.exit(1);
  }

  const offenders = [];
  for (const constant of constants) {
    const meta = estimateSegments(constant.text);
    if (meta.segments > 1) {
      offenders.push({ ...constant, ...meta });
    }
  }

  if (offenders.length > 0) {
    console.error("[sms-check] Multi-segment TPO messages detected:");
    for (const offender of offenders) {
      console.error(
        `- ${offender.name}: ${offender.segments} segments (${offender.encoding}, ${offender.units} units)`
      );
    }
    process.exit(1);
  }

  console.log(`[sms-check] PASS: ${constants.length} TPO_* constants are single-segment.`);
}

main();
