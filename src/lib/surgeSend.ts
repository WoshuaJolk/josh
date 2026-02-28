import axios from "axios";
import { sanitizeBlockedWords } from "./curseFilter";

const SURGE_API_URL = "https://api.surge.app/accounts";
const SURGE_API_KEY = process.env.SURGE_API_KEY;
const SURGE_ACCOUNT_ID = process.env.SURGE_ACCOUNT_ID;

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
