import { generateText } from "ai";

export interface AboutStructured {
  summary: string | null;
  lookingForNow: string | null;
  gender: string | null;
  sexuality: string | null;
  openToBothPreference: string | null;
  work: string | null;
  hobbies: string[];
  friendDescription: string | null;
  humorStyle: string | null;
  introExtro: string | null;
  weekdaySocialLevel: string | null;
  weekendSocialLevel: string | null;
  drinking: string | null;
  smoking: string | null;
  sleepSchedule: string | null;
  activityLevel: string | null;
  fitnessImportance: string | null;
  fridayNight: string | null;
  sunday: string | null;
  homeCleanliness: string | null;
  communicationWhenInterested: string | null;
  directness: string | null;
  conflictStyle: string | null;
  planningStyle: string | null;
  personalValues: string[];
  relationshipIntent: string | null;
  boundaries: string[];
}

export interface PreferencesStructured {
  summary: string | null;
  mustHaves: string[];
  ageRange: string | null;
  heightRange: string | null;
  bodyTypePreferences: string[];
  faceFeaturePreferences: string[];
  stylePreferences: string[];
  groomingPreferences: string[];
  tattoosPiercingsPreference: string | null;
  fitnessPreference: string | null;
  voiceAccentPreferences: string[];
  raceEthnicityPreferences: string[];
  jobAmbitionPreferences: string[];
  personalityTraits: string[];
  humorStyle: string | null;
  socialEnergyPreference: string | null;
  religionCompatibility: string | null;
  politicalCompatibility: string | null;
  drinkingPreference: string | null;
  smokingPreference: string | null;
  textingFrequency: string | null;
  replySpeed: string | null;
  meetupFrequency: string | null;
  datePlanningPreference: string | null;
  locationLimits: string | null;
  dealbreakers: string[];
}

export interface StructuredProfile {
  about: AboutStructured;
  preferences: PreferencesStructured;
}

const MODEL = "openai/gpt-4o-mini";

const EMPTY_ABOUT: AboutStructured = {
  summary: null,
  lookingForNow: null,
  gender: null,
  sexuality: null,
  openToBothPreference: null,
  work: null,
  hobbies: [],
  friendDescription: null,
  humorStyle: null,
  introExtro: null,
  weekdaySocialLevel: null,
  weekendSocialLevel: null,
  drinking: null,
  smoking: null,
  sleepSchedule: null,
  activityLevel: null,
  fitnessImportance: null,
  fridayNight: null,
  sunday: null,
  homeCleanliness: null,
  communicationWhenInterested: null,
  directness: null,
  conflictStyle: null,
  planningStyle: null,
  personalValues: [],
  relationshipIntent: null,
  boundaries: [],
};

const EMPTY_PREFERENCES: PreferencesStructured = {
  summary: null,
  mustHaves: [],
  ageRange: null,
  heightRange: null,
  bodyTypePreferences: [],
  faceFeaturePreferences: [],
  stylePreferences: [],
  groomingPreferences: [],
  tattoosPiercingsPreference: null,
  fitnessPreference: null,
  voiceAccentPreferences: [],
  raceEthnicityPreferences: [],
  jobAmbitionPreferences: [],
  personalityTraits: [],
  humorStyle: null,
  socialEnergyPreference: null,
  religionCompatibility: null,
  politicalCompatibility: null,
  drinkingPreference: null,
  smokingPreference: null,
  textingFrequency: null,
  replySpeed: null,
  meetupFrequency: null,
  datePlanningPreference: null,
  locationLimits: null,
  dealbreakers: [],
};

const EMPTY_PROFILE: StructuredProfile = {
  about: EMPTY_ABOUT,
  preferences: EMPTY_PREFERENCES,
};

function chooseString(next: string | null, prev: string | null): string | null {
  return next && next.trim().length > 0 ? next : prev;
}

function chooseStringArray(next: string[], prev: string[]): string[] {
  if (next.length > 0) return next;
  return prev;
}

const LEADING_PHRASE_PREFIXES = [
  "being ",
  "is ",
  "someone who is ",
  "someone who's ",
  "a person who is ",
  "person who is ",
  "someone that is ",
  "someone that's ",
];

function normalizeBadgePhrase(value: string): string | null {
  let normalized = value.trim().toLowerCase().replace(/[.,!?;:]+$/g, "");
  if (!normalized) return null;

  normalized = normalized
    .replace(/^i(?:'m| am)\s+/, "")
    .replace(/^(a|an|the)\s+/, "")
    .replace(/\s+/g, " ");

  for (const prefix of LEADING_PHRASE_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length).trim();
      break;
    }
  }

  return normalized || null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
    .filter((item): item is string => typeof item === "string")
        .map((item) => normalizeBadgePhrase(item))
        .filter((item): item is string => Boolean(item))
    )
  ).slice(0, 10);
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? normalizeBadgePhrase(value) : null;
}

function parseStructuredProfile(raw: string): StructuredProfile {
  try {
    const cleaned = raw.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const aboutRaw =
      parsed.about && typeof parsed.about === "object"
        ? (parsed.about as Record<string, unknown>)
        : {};
    const preferencesRaw =
      parsed.preferences && typeof parsed.preferences === "object"
        ? (parsed.preferences as Record<string, unknown>)
        : {};

    return {
      about: {
        summary: asStringOrNull(aboutRaw.summary),
        lookingForNow: asStringOrNull(aboutRaw.lookingForNow),
        gender: asStringOrNull(aboutRaw.gender),
        sexuality: asStringOrNull(aboutRaw.sexuality),
        openToBothPreference: asStringOrNull(aboutRaw.openToBothPreference),
        work: asStringOrNull(aboutRaw.work),
        hobbies: asStringArray(aboutRaw.hobbies),
        friendDescription: asStringOrNull(aboutRaw.friendDescription),
        humorStyle: asStringOrNull(aboutRaw.humorStyle),
        introExtro: asStringOrNull(aboutRaw.introExtro),
        weekdaySocialLevel: asStringOrNull(aboutRaw.weekdaySocialLevel),
        weekendSocialLevel: asStringOrNull(aboutRaw.weekendSocialLevel),
        drinking: asStringOrNull(aboutRaw.drinking),
        smoking: asStringOrNull(aboutRaw.smoking),
        sleepSchedule: asStringOrNull(aboutRaw.sleepSchedule),
        activityLevel: asStringOrNull(aboutRaw.activityLevel),
        fitnessImportance: asStringOrNull(aboutRaw.fitnessImportance),
        fridayNight: asStringOrNull(aboutRaw.fridayNight),
        sunday: asStringOrNull(aboutRaw.sunday),
        homeCleanliness: asStringOrNull(aboutRaw.homeCleanliness),
        communicationWhenInterested: asStringOrNull(
          aboutRaw.communicationWhenInterested
        ),
        directness: asStringOrNull(aboutRaw.directness),
        conflictStyle: asStringOrNull(aboutRaw.conflictStyle),
        planningStyle: asStringOrNull(aboutRaw.planningStyle),
        personalValues: asStringArray(aboutRaw.personalValues),
        relationshipIntent: asStringOrNull(aboutRaw.relationshipIntent),
        boundaries: asStringArray(aboutRaw.boundaries),
      },
      preferences: {
        summary: asStringOrNull(preferencesRaw.summary),
        mustHaves: asStringArray(preferencesRaw.mustHaves),
        ageRange: asStringOrNull(preferencesRaw.ageRange),
        heightRange: asStringOrNull(preferencesRaw.heightRange),
        bodyTypePreferences: asStringArray(preferencesRaw.bodyTypePreferences),
        faceFeaturePreferences: asStringArray(
          preferencesRaw.faceFeaturePreferences
        ),
        stylePreferences: asStringArray(preferencesRaw.stylePreferences),
        groomingPreferences: asStringArray(preferencesRaw.groomingPreferences),
        tattoosPiercingsPreference: asStringOrNull(
          preferencesRaw.tattoosPiercingsPreference
        ),
        fitnessPreference: asStringOrNull(preferencesRaw.fitnessPreference),
        voiceAccentPreferences: asStringArray(
          preferencesRaw.voiceAccentPreferences
        ),
        raceEthnicityPreferences: asStringArray(
          preferencesRaw.raceEthnicityPreferences
        ),
        jobAmbitionPreferences: asStringArray(
          preferencesRaw.jobAmbitionPreferences
        ),
        personalityTraits: asStringArray(preferencesRaw.personalityTraits),
        humorStyle: asStringOrNull(preferencesRaw.humorStyle),
        socialEnergyPreference: asStringOrNull(
          preferencesRaw.socialEnergyPreference
        ),
        religionCompatibility: asStringOrNull(
          preferencesRaw.religionCompatibility
        ),
        politicalCompatibility: asStringOrNull(
          preferencesRaw.politicalCompatibility
        ),
        drinkingPreference: asStringOrNull(preferencesRaw.drinkingPreference),
        smokingPreference: asStringOrNull(preferencesRaw.smokingPreference),
        textingFrequency: asStringOrNull(preferencesRaw.textingFrequency),
        replySpeed: asStringOrNull(preferencesRaw.replySpeed),
        meetupFrequency: asStringOrNull(preferencesRaw.meetupFrequency),
        datePlanningPreference: asStringOrNull(
          preferencesRaw.datePlanningPreference
        ),
        locationLimits: asStringOrNull(preferencesRaw.locationLimits),
        dealbreakers: asStringArray(preferencesRaw.dealbreakers),
      },
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

export async function structureUserProfile(input: {
  aboutMe: string | null;
  preferences: string | null;
  city: string | null;
  dlName: string | null;
  dlAge: number | null;
  dlHeight: string | null;
}): Promise<StructuredProfile> {
  if (!process.env.AI_GATEWAY_API_KEY) {
    return EMPTY_PROFILE;
  }

  try {
    const { text } = await generateText({
      model: MODEL,
      prompt: `Convert this dating onboarding profile into structured JSON.
Use this split:
- "about" = facts and qualities about the user
- "preferences" = what the user wants in a partner

Important:
- Do not put partner preferences inside "about".
- Do not put personal self-description inside "preferences".
- Do not invent facts; unknown should be null or [].
- Preserve explicit answers from Q/A content when present.

Name: ${input.dlName ?? "Unknown"}
Age: ${input.dlAge ?? "Unknown"}
Height: ${input.dlHeight ?? "Unknown"}
City: ${input.city ?? "Unknown"}
About:
${input.aboutMe ?? "Unknown"}

Preferences:
${input.preferences ?? "Unknown"}

Return ONLY JSON with this exact shape:
{
  "about": {
    "summary": string | null,
    "lookingForNow": string | null,
    "gender": string | null,
    "sexuality": string | null,
    "openToBothPreference": string | null,
    "work": string | null,
    "hobbies": string[],
    "friendDescription": string | null,
    "humorStyle": string | null,
    "introExtro": string | null,
    "weekdaySocialLevel": string | null,
    "weekendSocialLevel": string | null,
    "drinking": string | null,
    "smoking": string | null,
    "sleepSchedule": string | null,
    "activityLevel": string | null,
    "fitnessImportance": string | null,
    "fridayNight": string | null,
    "sunday": string | null,
    "homeCleanliness": string | null,
    "communicationWhenInterested": string | null,
    "directness": string | null,
    "conflictStyle": string | null,
    "planningStyle": string | null,
    "personalValues": string[],
    "relationshipIntent": string | null,
    "boundaries": string[]
  },
  "preferences": {
    "summary": string | null,
    "mustHaves": string[],
    "ageRange": string | null,
    "heightRange": string | null,
    "bodyTypePreferences": string[],
    "faceFeaturePreferences": string[],
    "stylePreferences": string[],
    "groomingPreferences": string[],
    "tattoosPiercingsPreference": string | null,
    "fitnessPreference": string | null,
    "voiceAccentPreferences": string[],
    "raceEthnicityPreferences": string[],
    "jobAmbitionPreferences": string[],
    "personalityTraits": string[],
    "humorStyle": string | null,
    "socialEnergyPreference": string | null,
    "religionCompatibility": string | null,
    "politicalCompatibility": string | null,
    "drinkingPreference": string | null,
    "smokingPreference": string | null,
    "textingFrequency": string | null,
    "replySpeed": string | null,
    "meetupFrequency": string | null,
    "datePlanningPreference": string | null,
    "locationLimits": string | null,
    "dealbreakers": string[]
  }
}

Rules:
- include city-aware context when useful.
- keep every value concise: 1-3 words only (prefer 1-2 words).
- remove filler phrases (example: "being smart" -> "smart").
- do real semantic normalization, not truncation.
- examples: "i like people with unhinged humor" -> "unhinged humor", "someone who's really kind and emotionally mature" -> "kind", "emotionally mature".
- keep array items short and specific.
- if unknown, use null or [].
- no markdown and no extra keys.`,
      maxOutputTokens: 700,
    });

    return parseStructuredProfile(text);
  } catch {
    return EMPTY_PROFILE;
  }
}

export function mergeStructuredProfilePreservingExisting(
  nextProfile: StructuredProfile,
  existingRaw: unknown
): StructuredProfile {
  if (!existingRaw || typeof existingRaw !== "object") {
    return nextProfile;
  }

  const existing = parseStructuredProfile(JSON.stringify(existingRaw));

  return {
    about: {
      summary: chooseString(nextProfile.about.summary, existing.about.summary),
      lookingForNow: chooseString(
        nextProfile.about.lookingForNow,
        existing.about.lookingForNow
      ),
      gender: chooseString(nextProfile.about.gender, existing.about.gender),
      sexuality: chooseString(
        nextProfile.about.sexuality,
        existing.about.sexuality
      ),
      openToBothPreference: chooseString(
        nextProfile.about.openToBothPreference,
        existing.about.openToBothPreference
      ),
      work: chooseString(nextProfile.about.work, existing.about.work),
      hobbies: chooseStringArray(nextProfile.about.hobbies, existing.about.hobbies),
      friendDescription: chooseString(
        nextProfile.about.friendDescription,
        existing.about.friendDescription
      ),
      humorStyle: chooseString(
        nextProfile.about.humorStyle,
        existing.about.humorStyle
      ),
      introExtro: chooseString(
        nextProfile.about.introExtro,
        existing.about.introExtro
      ),
      weekdaySocialLevel: chooseString(
        nextProfile.about.weekdaySocialLevel,
        existing.about.weekdaySocialLevel
      ),
      weekendSocialLevel: chooseString(
        nextProfile.about.weekendSocialLevel,
        existing.about.weekendSocialLevel
      ),
      drinking: chooseString(nextProfile.about.drinking, existing.about.drinking),
      smoking: chooseString(nextProfile.about.smoking, existing.about.smoking),
      sleepSchedule: chooseString(
        nextProfile.about.sleepSchedule,
        existing.about.sleepSchedule
      ),
      activityLevel: chooseString(
        nextProfile.about.activityLevel,
        existing.about.activityLevel
      ),
      fitnessImportance: chooseString(
        nextProfile.about.fitnessImportance,
        existing.about.fitnessImportance
      ),
      fridayNight: chooseString(
        nextProfile.about.fridayNight,
        existing.about.fridayNight
      ),
      sunday: chooseString(nextProfile.about.sunday, existing.about.sunday),
      homeCleanliness: chooseString(
        nextProfile.about.homeCleanliness,
        existing.about.homeCleanliness
      ),
      communicationWhenInterested: chooseString(
        nextProfile.about.communicationWhenInterested,
        existing.about.communicationWhenInterested
      ),
      directness: chooseString(
        nextProfile.about.directness,
        existing.about.directness
      ),
      conflictStyle: chooseString(
        nextProfile.about.conflictStyle,
        existing.about.conflictStyle
      ),
      planningStyle: chooseString(
        nextProfile.about.planningStyle,
        existing.about.planningStyle
      ),
      personalValues: chooseStringArray(
        nextProfile.about.personalValues,
        existing.about.personalValues
      ),
      relationshipIntent: chooseString(
        nextProfile.about.relationshipIntent,
        existing.about.relationshipIntent
      ),
      boundaries: chooseStringArray(
        nextProfile.about.boundaries,
        existing.about.boundaries
      ),
    },
    preferences: {
      summary: chooseString(
        nextProfile.preferences.summary,
        existing.preferences.summary
      ),
      mustHaves: chooseStringArray(
        nextProfile.preferences.mustHaves,
        existing.preferences.mustHaves
      ),
      ageRange: chooseString(
        nextProfile.preferences.ageRange,
        existing.preferences.ageRange
      ),
      heightRange: chooseString(
        nextProfile.preferences.heightRange,
        existing.preferences.heightRange
      ),
      bodyTypePreferences: chooseStringArray(
        nextProfile.preferences.bodyTypePreferences,
        existing.preferences.bodyTypePreferences
      ),
      faceFeaturePreferences: chooseStringArray(
        nextProfile.preferences.faceFeaturePreferences,
        existing.preferences.faceFeaturePreferences
      ),
      stylePreferences: chooseStringArray(
        nextProfile.preferences.stylePreferences,
        existing.preferences.stylePreferences
      ),
      groomingPreferences: chooseStringArray(
        nextProfile.preferences.groomingPreferences,
        existing.preferences.groomingPreferences
      ),
      tattoosPiercingsPreference: chooseString(
        nextProfile.preferences.tattoosPiercingsPreference,
        existing.preferences.tattoosPiercingsPreference
      ),
      fitnessPreference: chooseString(
        nextProfile.preferences.fitnessPreference,
        existing.preferences.fitnessPreference
      ),
      voiceAccentPreferences: chooseStringArray(
        nextProfile.preferences.voiceAccentPreferences,
        existing.preferences.voiceAccentPreferences
      ),
      raceEthnicityPreferences: chooseStringArray(
        nextProfile.preferences.raceEthnicityPreferences,
        existing.preferences.raceEthnicityPreferences
      ),
      jobAmbitionPreferences: chooseStringArray(
        nextProfile.preferences.jobAmbitionPreferences,
        existing.preferences.jobAmbitionPreferences
      ),
      personalityTraits: chooseStringArray(
        nextProfile.preferences.personalityTraits,
        existing.preferences.personalityTraits
      ),
      humorStyle: chooseString(
        nextProfile.preferences.humorStyle,
        existing.preferences.humorStyle
      ),
      socialEnergyPreference: chooseString(
        nextProfile.preferences.socialEnergyPreference,
        existing.preferences.socialEnergyPreference
      ),
      religionCompatibility: chooseString(
        nextProfile.preferences.religionCompatibility,
        existing.preferences.religionCompatibility
      ),
      politicalCompatibility: chooseString(
        nextProfile.preferences.politicalCompatibility,
        existing.preferences.politicalCompatibility
      ),
      drinkingPreference: chooseString(
        nextProfile.preferences.drinkingPreference,
        existing.preferences.drinkingPreference
      ),
      smokingPreference: chooseString(
        nextProfile.preferences.smokingPreference,
        existing.preferences.smokingPreference
      ),
      textingFrequency: chooseString(
        nextProfile.preferences.textingFrequency,
        existing.preferences.textingFrequency
      ),
      replySpeed: chooseString(
        nextProfile.preferences.replySpeed,
        existing.preferences.replySpeed
      ),
      meetupFrequency: chooseString(
        nextProfile.preferences.meetupFrequency,
        existing.preferences.meetupFrequency
      ),
      datePlanningPreference: chooseString(
        nextProfile.preferences.datePlanningPreference,
        existing.preferences.datePlanningPreference
      ),
      locationLimits: chooseString(
        nextProfile.preferences.locationLimits,
        existing.preferences.locationLimits
      ),
      dealbreakers: chooseStringArray(
        nextProfile.preferences.dealbreakers,
        existing.preferences.dealbreakers
      ),
    },
  };
}
