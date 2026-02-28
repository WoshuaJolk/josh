import axios from "axios";
import { sanitizeBlockedWords } from "./curseFilter";

const SURGE_API_URL = "https://api.surge.app/accounts";
const SURGE_API_KEY = process.env.SURGE_API_KEY;
const SURGE_ACCOUNT_ID = process.env.SURGE_ACCOUNT_ID;
const GSM_7_BASIC_CHARS = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ`¿abcdefghijklmnopqrstuvwxyzäöñüà"
);
const GSM_7_EXTENDED_CHARS = new Set("^{}\\[~]|€");

function estimateSmsSegments(message: string): {
  encoding: "GSM-7" | "UCS-2";
  segments: number;
  units: number;
} {
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
      segments: ucsUnits <= 70 ? 1 : Math.ceil(ucsUnits / 67),
      units: ucsUnits,
    };
  }
  return {
    encoding: "GSM-7",
    segments: gsmUnits <= 160 ? 1 : Math.ceil(gsmUnits / 153),
    units: gsmUnits,
  };
}

export async function sendSms(
  phoneNumber: string,
  message: string,
  options?: { skipProfanityFilter?: boolean }
) {
  if (!SURGE_API_KEY || !SURGE_ACCOUNT_ID) {
    throw new Error("Missing Surge configuration (SURGE_API_KEY or SURGE_ACCOUNT_ID)");
  }

  const body = options?.skipProfanityFilter
    ? message
    : sanitizeBlockedWords(message);
  const smsMeta = estimateSmsSegments(body);
  if (smsMeta.segments > 1) {
    console.info("[sms] multi-segment outbound", {
      to: phoneNumber,
      segments: smsMeta.segments,
      encoding: smsMeta.encoding,
      units: smsMeta.units,
      preview: body.slice(0, 120),
    });
  }

  const response = await axios.post(
    `${SURGE_API_URL}/${SURGE_ACCOUNT_ID}/messages`,
    {
      conversation: {
        contact: {
          phone_number: phoneNumber,
        },
      },
      body,
    },
    {
      headers: {
        Authorization: `Bearer ${SURGE_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}
