import naughtyWords from "naughty-words";

const CHAR_VARIANTS: Record<string, string> = {
  a: "a4@",
  b: "b8",
  e: "e3",
  g: "g69",
  i: "i1!|",
  l: "l1|",
  o: "o0",
  s: "s5$",
  t: "t7+",
  z: "z2",
};

function escapeForCharClass(value: string) {
  return value.replace(/[\\\]-]/g, "\\$&");
}

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getWordsFromEnv(key: string) {
  return process.env[key]
    ?.split(",")
    .map((word) => word.trim())
    .filter(Boolean);
}

function getBlockedWords() {
  return [
    ...(getWordsFromEnv("MUTUAL_BLOCKED_WORDS") || []),
    ...(getWordsFromEnv("MUTUAL_BLOCKED_SLURS") || []),
  ]
    .map((word) => normalizeText(word))
    .filter(Boolean);
}

function getWhitelistWords() {
  return (getWordsFromEnv("MUTUAL_PROFANITY_WHITELIST") || [])
    .map((word) => normalizeText(word))
    .filter(Boolean);
}

function toObfuscationRegex(word: string, isGlobal = false) {
  const normalizedWord = normalizeText(word).replace(/[^a-z0-9]/g, "");
  if (!normalizedWord) {
    return null;
  }

  const chars = normalizedWord.split("");
  const pattern = chars
    .map((char) => {
      const variants = CHAR_VARIANTS[char] ?? char;
      return `[${escapeForCharClass(variants)}]`;
    })
    .join("[^a-z0-9]*");

  return new RegExp(
    `(?<![a-z0-9])${pattern}(?![a-z0-9])`,
    isGlobal ? "gi" : "i"
  );
}

const configuredWords = getBlockedWords();
const whitelistWords = getWhitelistWords();
const whitelistSet = new Set(whitelistWords);
const customBlockedWords = configuredWords.filter((word) => !whitelistSet.has(word));

const naughtyWordsByLanguage = naughtyWords as unknown as Record<string, string[]>;
const BASE_PROFANITY_WORDS = Array.isArray(naughtyWordsByLanguage.en)
  ? naughtyWordsByLanguage.en
  : [];

function normalizeBlockedWord(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const baselineBlockedWords = [
  ...BASE_PROFANITY_WORDS.map((word) => normalizeBlockedWord(word)),
  ...customBlockedWords,
]
  .filter((word) => word.length > 1)
  .filter((word) => !whitelistSet.has(word))
  .filter((word, index, arr) => arr.indexOf(word) === index);

const baselineWordRegexes = baselineBlockedWords
  .filter(Boolean)
  .map((word) => {
    const pattern = word
      .split(" ")
      .filter(Boolean)
      .map((part) => escapeForRegex(part))
      .join("\\s+");
    return new RegExp(`(?<![a-z0-9])${pattern}(?![a-z0-9])`, "i");
  });

const baselineWordReplaceRegexes = baselineBlockedWords
  .filter(Boolean)
  .map((word) => {
    const pattern = word
      .split(" ")
      .filter(Boolean)
      .map((part) => escapeForRegex(part))
      .join("\\s+");
    return new RegExp(`(?<![a-z0-9])${pattern}(?![a-z0-9])`, "gi");
  });

const obfuscationCheckRegexes = customBlockedWords
  .map((word) => toObfuscationRegex(word))
  .filter((regex): regex is RegExp => regex !== null);

const obfuscationReplaceRegexes = customBlockedWords
  .map((word) => toObfuscationRegex(word, true))
  .filter((regex): regex is RegExp => regex !== null);

export function sanitizeBlockedWords(text: string) {
  if (!text) {
    return text;
  }

  let sanitizedText = text;

  for (const regex of baselineWordReplaceRegexes) {
    sanitizedText = sanitizedText.replace(regex, "****");
  }

  // Also sanitize obfuscated forms for your custom blocked/slur list.
  for (const regex of obfuscationReplaceRegexes) {
    sanitizedText = sanitizedText.replace(regex, "****");
  }

  return sanitizedText;
}

export function containsBlockedWords(text: string) {
  if (!text) {
    return false;
  }

  const normalizedText = normalizeText(text);
  if (baselineWordRegexes.some((regex) => regex.test(normalizedText))) {
    return true;
  }

  return obfuscationCheckRegexes.some((regex) => regex.test(normalizedText));
}
