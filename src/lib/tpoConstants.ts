export const TPO_INTRO_TEXT =
  "hey! welcome to jøsh - no swiping, no small talk, no overthinking. we'll handpick a match and text the plan. first, a few quick questions.";

interface OnboardingQuestionDef {
  id: string;
  prompt: string;
}

const ONBOARDING_QUESTION_DEFS: OnboardingQuestionDef[] = [
  { id: "identity", prompt: "how do you describe your gender and sexuality?" },
  {
    id: "intent",
    prompt:
      "are you looking for something long-term or a hookup? if open to both, which way are you leaning?",
  },
  {
    id: "work_education",
    prompt: "what do you do for work or school, and what's your education background?",
  },
  {
    id: "roots_languages",
    prompt: "where did you grow up, and what languages do you speak?",
  },
  {
    id: "kids_pets",
    prompt: "do you have kids or pets, and do you want kids in the future?",
  },
  {
    id: "substances_self",
    prompt:
      "how do you handle drinking, smoking, and other substances? what are your dealbreakers for a partner on those?",
  },
  {
    id: "values_alignment",
    prompt:
      "what are your religious and political views? do you want a partner who shares them?",
  },
  {
    id: "vibe_partner",
    prompt:
      "when you picture your ideal partner, what's their general vibe: energy, ambition, humor, social style?",
  },
  { id: "age_height", prompt: "what are your age and height preferences?" },
  {
    id: "physical_preferences",
    prompt: "do you have any preferences regarding ethnicity or body type?",
  },
  { id: "city", prompt: "what city are you currently living in?" },
  {
    id: "anything_else",
    prompt:
      "is there anything else you want me to know about you or what you're looking for?",
  },
];

export function getOnboardingQuestions(): string[] {
  return ONBOARDING_QUESTION_DEFS.map((q) => q.prompt);
}

export function getOnboardingQuestionDefs(): OnboardingQuestionDef[] {
  return [...ONBOARDING_QUESTION_DEFS];
}

export function getOnboardingQuestionByIndex(
  index: number
): OnboardingQuestionDef | null {
  return ONBOARDING_QUESTION_DEFS[index] ?? null;
}

// Kept for compatibility with existing callers.
export function getAboutQuestions(): string[] {
  return getOnboardingQuestions();
}

// Single-list flow: no separate preferences list.
export function getPreferenceQuestions(): string[] {
  return [];
}

export const TPO_PHOTOS_TEXT =
  "send at least 2 photos: 1 close-up and 1 full-body. private and only used by our matchmaker.";

export const TPO_ID_TEXT =
  "last step: send a photo of your driver's license to verify your identity. it's private and only used for verification.";

export const TPO_COMPLETE_TEXT =
  "your application is in! we're reviewing it now and will text you when you're accepted.";

export const TPO_ACCEPTED_TEXT =
  "good news - you're accepted to jøsh! we'll text when we've found a great match for you.";

export const TPO_REJECTED_TEXT =
  "thanks for applying to jøsh. unfortunately we're not able to accept your application at this time.";

export const TPO_MATCHED_TEXT =
  "you've been matched! any messages you send to this number will be forwarded to your match. have fun getting to know each other!";

export const TPO_SCHEDULING_WAITING_TEXT =
  "thanks - checking with your match now. i will confirm shortly.";

export const TPO_DATE_PLAN_READY_TEXT_PREFIX =
  "great - you're both confirmed. here's your suggested date:";

export const TPO_DATE_ENDED_TEXT =
  "your current match conversation has ended. we'll let you know when we have another great match for you!";

export const TPO_DEFAULT_REPLY =
  "thanks for reaching out! we'll be in touch.";

export const TPO_NO_ACTIVE_DATE =
  "you don't have an active match right now. sit tight - we'll text you when we find someone great!";
