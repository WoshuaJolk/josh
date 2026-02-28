"use client";

import { AdminCardModal } from "@/components/AdminCardModal";
import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Briefcase,
  CalendarDays,
  Cigarette,
  Eye,
  GlassWater,
  Heart,
  MessageCircle,
  MoonStar,
  Mountain,
  PawPrint,
  Pencil,
  PersonStanding,
  Radar,
  RefreshCcw,
  Ruler,
  Scale,
  Sparkles,
  Speech,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type Tab = "approvals" | "pairing" | "onboarding" | "blocked";
type TabCounts = {
  approvals: number;
  pairing: number;
  onboarding: number;
  blocked: number;
};

const EMPTY_TAB_COUNTS: TabCounts = {
  approvals: 0,
  pairing: 0,
  onboarding: 0,
  blocked: 0,
};

interface TpoUser {
  id: string;
  createdAt: string;
  phoneNumber: string;
  status: string;
  onboardingStep: string;
  onboardingQuestionIndex: number;
  aboutMe: string | null;
  preferences: string | null;
  city: string | null;
  structuredProfile: unknown;
  photoUrls: string[];
  idPhotoUrl: string | null;
  dlName: string | null;
  dlAge: number | null;
  dlHeight: string | null;
}

interface TpoDate {
  id: string;
  createdAt: string;
  status: string;
  portalEnabled: boolean;
  proposedSlot: string | null;
  agreedTime: string | null;
  suggestedPlace: string | null;
  schedulingPhase: string;
  schedulingAttemptCount: number;
  lastSchedulingMessageAt: string | null;
  schedulingEscalatedAt: string | null;
  schedulingFailedReason: string | null;
  userA: Pick<
    TpoUser,
    | "id"
    | "phoneNumber"
    | "aboutMe"
    | "photoUrls"
    | "idPhotoUrl"
    | "city"
    | "dlName"
    | "dlAge"
    | "dlHeight"
  >;
  userB: Pick<
    TpoUser,
    | "id"
    | "phoneNumber"
    | "aboutMe"
    | "photoUrls"
    | "idPhotoUrl"
    | "city"
    | "dlName"
    | "dlAge"
    | "dlHeight"
  >;
  _count: { messages: number };
}

function formatStepLabel(step: string): string {
  return step.replaceAll("_", " ").toLowerCase();
}

interface AboutStructuredView {
  summary: string | null;
  gender: string | null;
  sexuality: string | null;
  lookingForNow: string | null;
  openToBothPreference: string | null;
  relationshipIntent: string | null;
  friendDescription: string | null;
  boundaries: string[];
  work: string | null;
  hobbies: string[];
  introExtro: string | null;
  weekdaySocialLevel: string | null;
  weekendSocialLevel: string | null;
  sleepSchedule: string | null;
  activityLevel: string | null;
  fridayNight: string | null;
  sunday: string | null;
  homeCleanliness: string | null;
  communicationWhenInterested: string | null;
  directness: string | null;
  conflictStyle: string | null;
  planningStyle: string | null;
  personalValues: string[];
  drinking: string | null;
  smoking: string | null;
  kidsMentioned: string | null;
  petsMentioned: string | null;
}

interface PreferencesStructuredView {
  summary: string | null;
  ageRange: string | null;
  heightRange: string | null;
  mustHaves: string[];
  dealbreakers: string[];
  personalityTraits: string[];
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
  bodyTypePreferences: string[];
  faceFeaturePreferences: string[];
  raceEthnicityPreferences: string[];
  stylePreferences: string[];
  groomingPreferences: string[];
  voiceAccentPreferences: string[];
  jobAmbitionPreferences: string[];
}

interface StructuredProfileView {
  about: AboutStructuredView;
  preferences: PreferencesStructuredView;
  photoAiTags: string[];
  idParseStatus: string | null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getStructuredProfile(user: TpoUser): StructuredProfileView | null {
  const raw = user.structuredProfile;
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const about =
    obj.about && typeof obj.about === "object"
      ? (obj.about as Record<string, unknown>)
      : null;
  const preferences =
    obj.preferences && typeof obj.preferences === "object"
      ? (obj.preferences as Record<string, unknown>)
      : null;
  if (!about || !preferences) return null;

  return {
    about: {
      summary: toStringOrNull(about.summary),
      gender: toStringOrNull(about.gender),
      sexuality: toStringOrNull(about.sexuality),
      lookingForNow: toStringOrNull(about.lookingForNow),
      openToBothPreference: toStringOrNull(about.openToBothPreference),
      relationshipIntent: toStringOrNull(about.relationshipIntent),
      friendDescription: toStringOrNull(about.friendDescription),
      boundaries: toStringArray(about.boundaries),
      work: toStringOrNull(about.work),
      hobbies: toStringArray(about.hobbies),
      introExtro: toStringOrNull(about.introExtro),
      weekdaySocialLevel: toStringOrNull(about.weekdaySocialLevel),
      weekendSocialLevel: toStringOrNull(about.weekendSocialLevel),
      sleepSchedule: toStringOrNull(about.sleepSchedule),
      activityLevel: toStringOrNull(about.activityLevel),
      fridayNight: toStringOrNull(about.fridayNight),
      sunday: toStringOrNull(about.sunday),
      homeCleanliness: toStringOrNull(about.homeCleanliness),
      communicationWhenInterested: toStringOrNull(
        about.communicationWhenInterested,
      ),
      directness: toStringOrNull(about.directness),
      conflictStyle: toStringOrNull(about.conflictStyle),
      planningStyle: toStringOrNull(about.planningStyle),
      personalValues: toStringArray(about.personalValues),
      drinking: toStringOrNull(about.drinking),
      smoking: toStringOrNull(about.smoking),
      kidsMentioned: toStringOrNull(about.kidsMentioned),
      petsMentioned: toStringOrNull(about.petsMentioned),
    },
    preferences: {
      summary: toStringOrNull(preferences.summary),
      ageRange: toStringOrNull(preferences.ageRange),
      heightRange: toStringOrNull(preferences.heightRange),
      mustHaves: toStringArray(preferences.mustHaves),
      dealbreakers: toStringArray(preferences.dealbreakers),
      personalityTraits: toStringArray(preferences.personalityTraits),
      socialEnergyPreference: toStringOrNull(
        preferences.socialEnergyPreference,
      ),
      religionCompatibility: toStringOrNull(preferences.religionCompatibility),
      politicalCompatibility: toStringOrNull(
        preferences.politicalCompatibility,
      ),
      drinkingPreference: toStringOrNull(preferences.drinkingPreference),
      smokingPreference: toStringOrNull(preferences.smokingPreference),
      textingFrequency: toStringOrNull(preferences.textingFrequency),
      replySpeed: toStringOrNull(preferences.replySpeed),
      meetupFrequency: toStringOrNull(preferences.meetupFrequency),
      datePlanningPreference: toStringOrNull(
        preferences.datePlanningPreference,
      ),
      locationLimits: toStringOrNull(preferences.locationLimits),
      bodyTypePreferences: toStringArray(preferences.bodyTypePreferences),
      faceFeaturePreferences: toStringArray(preferences.faceFeaturePreferences),
      raceEthnicityPreferences: toStringArray(
        preferences.raceEthnicityPreferences,
      ),
      stylePreferences: toStringArray(preferences.stylePreferences),
      groomingPreferences: toStringArray(preferences.groomingPreferences),
      voiceAccentPreferences: toStringArray(preferences.voiceAccentPreferences),
      jobAmbitionPreferences: toStringArray(preferences.jobAmbitionPreferences),
    },
    photoAiTags: toStringArray(obj.photoAiTags),
    idParseStatus: toStringOrNull(obj.idParseStatus),
  };
}

interface ParsedBadge {
  key: string;
  label: string;
  value: string;
  rawValue: string;
  profileSection: "about" | "preferences";
  field: string;
  editable: boolean;
  Icon: LucideIcon;
}

interface ParsedBadgeGroups {
  about: ParsedBadge[];
  preference: ParsedBadge[];
  all: ParsedBadge[];
}

const BADGE_PREFIXES = [
  "being ",
  "is ",
  "someone who is ",
  "someone who's ",
  "a person who is ",
  "person who is ",
  "someone that is ",
  "someone that's ",
];

function isWhitespaceChar(char: string): boolean {
  return (
    char === " " ||
    char === "\n" ||
    char === "\t" ||
    char === "\r" ||
    char === "\f" ||
    char === "\v"
  );
}

function collapseWhitespace(value: string): string {
  let out = "";
  let inWhitespace = false;
  for (const char of value.trim()) {
    if (isWhitespaceChar(char)) {
      if (!inWhitespace && out.length > 0) {
        out += " ";
      }
      inWhitespace = true;
      continue;
    }
    out += char;
    inWhitespace = false;
  }
  return out;
}

function stripTrailingPunctuation(value: string): string {
  let end = value.length;
  while (end > 0 && ".,!?;:".includes(value[end - 1])) {
    end -= 1;
  }
  return value.slice(0, end);
}

const EMPTY_STATE_CONTAINER_CLASS =
  "rounded-xl border border-white/25 bg-white/12 p-10 text-center backdrop-blur-md";
const TAB_GRID_CLASS = "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3";

function normalizeBadgeValue(value: string): string {
  let normalized = stripTrailingPunctuation(value.trim().toLowerCase());
  if (normalized.startsWith("i'm ")) {
    normalized = normalized.slice(4);
  } else if (normalized.startsWith("i am ")) {
    normalized = normalized.slice(5);
  }
  for (const article of ["a ", "an ", "the "]) {
    if (normalized.startsWith(article)) {
      normalized = normalized.slice(article.length);
      break;
    }
  }
  normalized = collapseWhitespace(normalized);

  for (const prefix of BADGE_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length).trim();
      break;
    }
  }

  return normalized;
}

function ParsedBadgeRow({
  badges,
  onEdit,
  onDelete,
  actionKey,
}: {
  badges: ParsedBadge[];
  onEdit?: (badge: ParsedBadge, nextValue: string) => void;
  onDelete?: (badge: ParsedBadge) => void;
  actionKey?: string | null;
}) {
  const [editingBadge, setEditingBadge] = useState<ParsedBadge | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const canManageBadges = Boolean(onEdit && onDelete);

  const openEditModal = (badge: ParsedBadge) => {
    setEditingBadge(badge);
    setDraftValue(badge.value);
  };

  const closeEditModal = () => {
    setEditingBadge(null);
    setDraftValue("");
  };

  const submitEdit = () => {
    if (!editingBadge || !onEdit) return;
    const nextValue = draftValue.trim();
    if (!nextValue || nextValue === editingBadge.value) return;
    onEdit(editingBadge, nextValue);
    closeEditModal();
  };

  if (badges.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            key={badge.key}
            className="group relative inline-flex overflow-hidden rounded-full border border-white/35 bg-white/15 px-2.5 py-1 text-xs text-white"
            title={badge.label}
          >
            <span
              className={`inline-flex items-center gap-1.5 transition-all ${
                badge.editable && canManageBadges
                  ? "group-hover:opacity-25 group-hover:blur-[1px]"
                  : ""
              }`}
            >
              <badge.Icon className="h-3.5 w-3.5 text-white/70" />
              <span>{badge.value}</span>
            </span>

            {badge.editable && canManageBadges && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <span className="pointer-events-auto inline-flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded p-0.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                    disabled={actionKey === `${badge.key}:edit`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(badge);
                    }}
                    title="edit badge"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-0.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                    disabled={actionKey === `${badge.key}:delete`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(badge);
                    }}
                    title="delete badge"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              </span>
            )}
          </span>
        ))}
      </div>

      <AdminCardModal
        open={Boolean(editingBadge)}
        title="Edit badge"
        subtitle={editingBadge?.label}
        onClose={closeEditModal}
      >
        <input
          autoFocus
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitEdit();
            if (e.key === "Escape") closeEditModal();
          }}
          className="mt-1 w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-white/40 focus:border-white/45"
          placeholder="Enter badge text"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            className="font-pp-neue-montreal rounded-lg bg-white/10 px-3 py-1 text-xs text-white/90 transition-colors hover:bg-white/20"
            onClick={closeEditModal}
          >
            Cancel
          </button>
          <button
            type="button"
            className="font-pp-neue-montreal rounded-lg bg-white px-3 py-1 text-xs text-[#1d4ed8] transition-colors hover:bg-white/90 disabled:opacity-50"
            disabled={
              !editingBadge ||
              !draftValue.trim() ||
              draftValue.trim() === editingBadge.value ||
              actionKey === `${editingBadge.key}:edit`
            }
            onClick={submitEdit}
          >
            Save
          </button>
        </div>
      </AdminCardModal>
    </>
  );
}

function makeBadgeGroups(
  user: TpoUser,
  structured: StructuredProfileView | null,
): ParsedBadgeGroups {
  if (!structured) return { about: [], preference: [], all: [] };
  const about: ParsedBadge[] = [];
  const preference: ParsedBadge[] = [];
  const seen = new Set<string>();
  const push = (
    section: "about" | "preference",
    label: string,
    profileSection: "about" | "preferences",
    field: string,
    value: string | null | undefined,
    Icon: LucideIcon,
    editable = true,
  ) => {
    if (!value) return;
    const rawValue = value.trim();
    if (!rawValue) return;
    const clean = normalizeBadgeValue(value);
    if (!clean) return;
    const dedupeKey = `${profileSection}.${field}:${clean.toLowerCase()}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    const badge = {
      key: dedupeKey,
      label,
      value: clean,
      rawValue,
      profileSection,
      field,
      editable,
      Icon,
    };
    if (section === "about") about.push(badge);
    else preference.push(badge);
  };
  const pushMany = (
    section: "about" | "preference",
    label: string,
    profileSection: "about" | "preferences",
    field: string,
    values: string[] | null | undefined,
    Icon: LucideIcon,
    editable = true,
  ) => {
    for (const value of values ?? [])
      push(section, label, profileSection, field, value, Icon, editable);
  };

  // Identity + intent
  push(
    "about",
    "gender",
    "about",
    "gender",
    structured.about.gender,
    UserRound,
  );
  push(
    "about",
    "sexuality",
    "about",
    "sexuality",
    structured.about.sexuality,
    Heart,
  );
  push(
    "about",
    "intent",
    "about",
    "lookingForNow",
    structured.about.lookingForNow ?? structured.about.relationshipIntent,
    Heart,
  );
  push(
    "about",
    "lean",
    "about",
    "openToBothPreference",
    structured.about.openToBothPreference,
    Scale,
  );

  // Background
  push("about", "work", "about", "work", structured.about.work, Briefcase);
  push("about", "city", "about", "city", user.city, Radar);
  push(
    "about",
    "age",
    "about",
    "age",
    user.dlAge ? `${user.dlAge}` : null,
    CalendarDays,
  );
  push("about", "height", "about", "height", user.dlHeight, Ruler);

  // Lifestyle / self
  push(
    "about",
    "drinking",
    "about",
    "drinking",
    structured.about.drinking,
    GlassWater,
  );
  push(
    "about",
    "smoking",
    "about",
    "smoking",
    structured.about.smoking,
    Cigarette,
  );
  push(
    "about",
    "sleep",
    "about",
    "sleepSchedule",
    structured.about.sleepSchedule,
    MoonStar,
  );
  push(
    "about",
    "activity",
    "about",
    "activityLevel",
    structured.about.activityLevel,
    Mountain,
  );
  push(
    "about",
    "social week",
    "about",
    "weekdaySocialLevel",
    structured.about.weekdaySocialLevel,
    Users,
  );
  push(
    "about",
    "social weekend",
    "about",
    "weekendSocialLevel",
    structured.about.weekendSocialLevel,
    Users,
  );
  push(
    "about",
    "friday",
    "about",
    "fridayNight",
    structured.about.fridayNight,
    Sparkles,
  );
  push("about", "sunday", "about", "sunday", structured.about.sunday, Sparkles);
  push(
    "about",
    "cleanliness",
    "about",
    "homeCleanliness",
    structured.about.homeCleanliness,
    Sparkles,
  );

  // Communication / personality
  push(
    "about",
    "vibe",
    "about",
    "introExtro",
    structured.about.introExtro,
    Users,
  );
  push(
    "about",
    "communication",
    "about",
    "communicationWhenInterested",
    structured.about.communicationWhenInterested,
    MessageCircle,
  );
  push(
    "about",
    "directness",
    "about",
    "directness",
    structured.about.directness,
    Speech,
  );
  push(
    "about",
    "conflict",
    "about",
    "conflictStyle",
    structured.about.conflictStyle,
    Speech,
  );
  push(
    "about",
    "planning",
    "about",
    "planningStyle",
    structured.about.planningStyle,
    CalendarDays,
  );
  pushMany(
    "about",
    "values",
    "about",
    "personalValues",
    structured.about.personalValues,
    Scale,
  );
  pushMany(
    "about",
    "hobby",
    "about",
    "hobbies",
    structured.about.hobbies,
    Sparkles,
  );

  // Partner preferences
  push(
    "preference",
    "age",
    "preferences",
    "ageRange",
    structured.preferences.ageRange,
    CalendarDays,
  );
  push(
    "preference",
    "height",
    "preferences",
    "heightRange",
    structured.preferences.heightRange,
    Ruler,
  );
  push(
    "preference",
    "religion",
    "preferences",
    "religionCompatibility",
    structured.preferences.religionCompatibility,
    Scale,
  );
  push(
    "preference",
    "politics",
    "preferences",
    "politicalCompatibility",
    structured.preferences.politicalCompatibility,
    Scale,
  );
  push(
    "preference",
    "drinking",
    "preferences",
    "drinkingPreference",
    structured.preferences.drinkingPreference,
    GlassWater,
  );
  push(
    "preference",
    "smoking",
    "preferences",
    "smokingPreference",
    structured.preferences.smokingPreference,
    Cigarette,
  );
  push(
    "preference",
    "social",
    "preferences",
    "socialEnergyPreference",
    structured.preferences.socialEnergyPreference,
    Users,
  );
  push(
    "preference",
    "texting",
    "preferences",
    "textingFrequency",
    structured.preferences.textingFrequency,
    MessageCircle,
  );
  push(
    "preference",
    "replies",
    "preferences",
    "replySpeed",
    structured.preferences.replySpeed,
    MessageCircle,
  );
  push(
    "preference",
    "meetup",
    "preferences",
    "meetupFrequency",
    structured.preferences.meetupFrequency,
    Users,
  );
  push(
    "preference",
    "planning",
    "preferences",
    "datePlanningPreference",
    structured.preferences.datePlanningPreference,
    CalendarDays,
  );
  push(
    "preference",
    "location",
    "preferences",
    "locationLimits",
    structured.preferences.locationLimits,
    Radar,
  );
  pushMany(
    "preference",
    "must-have",
    "preferences",
    "mustHaves",
    structured.preferences.mustHaves,
    Sparkles,
  );
  pushMany(
    "preference",
    "dealbreaker",
    "preferences",
    "dealbreakers",
    structured.preferences.dealbreakers,
    Scale,
  );
  pushMany(
    "preference",
    "trait",
    "preferences",
    "personalityTraits",
    structured.preferences.personalityTraits,
    UserRound,
  );
  pushMany(
    "preference",
    "ambition",
    "preferences",
    "jobAmbitionPreferences",
    structured.preferences.jobAmbitionPreferences,
    Briefcase,
  );
  pushMany(
    "preference",
    "body",
    "preferences",
    "bodyTypePreferences",
    structured.preferences.bodyTypePreferences,
    PersonStanding,
  );
  pushMany(
    "preference",
    "face",
    "preferences",
    "faceFeaturePreferences",
    structured.preferences.faceFeaturePreferences,
    UserRound,
  );
  pushMany(
    "preference",
    "style",
    "preferences",
    "stylePreferences",
    structured.preferences.stylePreferences,
    Sparkles,
  );
  pushMany(
    "preference",
    "grooming",
    "preferences",
    "groomingPreferences",
    structured.preferences.groomingPreferences,
    Sparkles,
  );
  pushMany(
    "preference",
    "race/ethnicity",
    "preferences",
    "raceEthnicityPreferences",
    structured.preferences.raceEthnicityPreferences,
    Users,
  );
  pushMany(
    "preference",
    "voice/accent",
    "preferences",
    "voiceAccentPreferences",
    structured.preferences.voiceAccentPreferences,
    Speech,
  );
  pushMany(
    "preference",
    "boundaries",
    "about",
    "boundaries",
    structured.about.boundaries,
    Scale,
  );

  if (structured.about.kidsMentioned) {
    push(
      "about",
      "kids",
      "about",
      "kidsMentioned",
      structured.about.kidsMentioned,
      Baby,
    );
  }
  if (structured.about.petsMentioned) {
    push(
      "about",
      "pets",
      "about",
      "petsMentioned",
      structured.about.petsMentioned,
      PawPrint,
    );
  }
  if (structured.idParseStatus === "failed") {
    push(
      "about",
      "id check",
      "about",
      "idParseStatus",
      "needs clearer id",
      UserRound,
      false,
    );
  }

  // AI photo extraction
  pushMany(
    "about",
    "photo",
    "about",
    "photoAiTags",
    structured.photoAiTags,
    Sparkles,
  );

  return { about, preference, all: [...about, ...preference] };
}

function getDisplayName(
  user: Pick<TpoUser, "aboutMe" | "phoneNumber"> & { dlName?: string | null },
) {
  if (user.dlName) return user.dlName;
  if (!user.aboutMe) return user.phoneNumber;
  const firstLine = user.aboutMe.split("\n")[0];
  return firstLine.length > 40 ? firstLine.slice(0, 40) + "..." : firstLine;
}

function formatApplicationPlaintext(
  user: Pick<
    TpoUser,
    | "phoneNumber"
    | "aboutMe"
    | "preferences"
    | "city"
    | "dlName"
    | "dlAge"
    | "dlHeight"
  >,
): string {
  const lines: string[] = [];
  lines.push(`phone: ${user.phoneNumber}`);
  if (user.dlName) lines.push(`name: ${user.dlName}`);
  if (user.dlAge) lines.push(`age: ${user.dlAge}`);
  if (user.dlHeight) lines.push(`height: ${user.dlHeight}`);
  if (user.city) lines.push(`city: ${user.city}`);
  lines.push("");
  lines.push("about:");
  lines.push(user.aboutMe?.trim() || "(none)");
  lines.push("");
  lines.push("preferences:");
  lines.push(user.preferences?.trim() || "(none)");
  return lines.join("\n");
}

export default function BackendPage() {
  const [apiKey, setApiKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState<Tab>("approvals");
  const [tabCounts, setTabCounts] = useState<TabCounts>(EMPTY_TAB_COUNTS);
  const ADMIN_KEY_STORAGE = "tpo_admin_key";

  useEffect(() => {
    const savedKey = window.localStorage.getItem(ADMIN_KEY_STORAGE);
    if (savedKey) {
      setApiKey(savedKey);
      setAuthenticated(true);
    }
  }, []);

  const handleSignIn = () => {
    if (!apiKey) return;
    window.localStorage.setItem(ADMIN_KEY_STORAGE, apiKey);
    setAuthenticated(true);
  };

  const handleSignOut = () => {
    window.localStorage.removeItem(ADMIN_KEY_STORAGE);
    setAuthenticated(false);
    setApiKey("");
    setTabCounts(EMPTY_TAB_COUNTS);
  };

  const fetchTabCounts = useCallback(async () => {
    if (!apiKey || !authenticated) return;
    try {
      const [approvalsRes, pairingRes, onboardingRes, bannedRes, rejectedRes] =
        await Promise.all([
          fetch("/api/tpo/admin/users?status=PENDING_REVIEW", {
            headers: { "x-internal-api-key": apiKey },
          }),
          fetch("/api/tpo/admin/users?status=APPROVED", {
            headers: { "x-internal-api-key": apiKey },
          }),
          fetch("/api/tpo/admin/users?status=ONBOARDING", {
            headers: { "x-internal-api-key": apiKey },
          }),
          fetch("/api/tpo/admin/users?status=BANNED", {
            headers: { "x-internal-api-key": apiKey },
          }),
          fetch("/api/tpo/admin/users?status=REJECTED", {
            headers: { "x-internal-api-key": apiKey },
          }),
        ]);

      const approvals = approvalsRes.ok
        ? (((await approvalsRes.json()) as { users?: unknown[] }).users
            ?.length ?? 0)
        : 0;
      const pairing = pairingRes.ok
        ? (((await pairingRes.json()) as { users?: unknown[] }).users?.length ??
          0)
        : 0;
      const onboarding = onboardingRes.ok
        ? (((await onboardingRes.json()) as { users?: unknown[] }).users
            ?.length ?? 0)
        : 0;
      const banned = bannedRes.ok
        ? (((await bannedRes.json()) as { users?: unknown[] }).users?.length ??
          0)
        : 0;
      const rejected = rejectedRes.ok
        ? (((await rejectedRes.json()) as { users?: unknown[] }).users
            ?.length ?? 0)
        : 0;

      setTabCounts({
        approvals,
        pairing,
        onboarding,
        blocked: banned + rejected,
      });
    } catch (err) {
      console.error("Failed to fetch tab counts", err);
    }
  }, [apiKey, authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    void fetchTabCounts();
    const timer = window.setInterval(() => {
      void fetchTabCounts();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [authenticated, fetchTabCounts]);

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1d4ed8] to-[#90A9F1] px-4 font-pp-neue-montreal">
        <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#2563eb] to-[#90A9F1] p-[1px] shadow-lg">
          <div className="rounded-2xl bg-gradient-to-b from-[#1d4ed8] to-[#90A9F1] p-8">
            <h1 className="mb-6 text-center text-2xl text-white">jøsh admin</h1>
            <input
              type="password"
              placeholder="Enter admin key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && apiKey) handleSignIn();
              }}
              className="mb-4 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white placeholder:text-white/65 focus:outline-none focus:ring-2 focus:ring-white/45"
            />
            <button
              onClick={handleSignIn}
              disabled={!apiKey}
              className="w-full rounded-lg bg-white py-3 text-sm text-[#1d4ed8] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1d4ed8] to-[#90A9F1] font-pp-neue-montreal">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl text-white">jøsh admin</h1>
          <button
            onClick={handleSignOut}
            className="rounded-lg border border-white/40 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
          >
            sign out
          </button>
        </div>

        <div className="mb-6 flex w-fit gap-1 rounded-lg border border-white/25 p-1">
          <button
            onClick={() => setTab("approvals")}
            className={`rounded-md px-4 py-2 text-sm transition-colors ${
              tab === "approvals"
                ? "bg-white text-[#1d4ed8]"
                : "text-white/85 hover:bg-white/10 hover:text-white"
            }`}
          >
            Applications ({tabCounts.approvals})
          </button>
          <button
            onClick={() => setTab("pairing")}
            className={`rounded-md px-4 py-2 text-sm transition-colors ${
              tab === "pairing"
                ? "bg-white text-[#1d4ed8]"
                : " text-white/85 hover:bg-white/10 hover:text-white"
            }`}
          >
            Pairing ({tabCounts.pairing})
          </button>
          <button
            onClick={() => setTab("onboarding")}
            className={`rounded-md px-4 py-2 text-sm transition-colors ${
              tab === "onboarding"
                ? "bg-white text-[#1d4ed8]"
                : " text-white/85 hover:bg-white/10 hover:text-white"
            }`}
          >
            Onboarding ({tabCounts.onboarding})
          </button>
          <button
            onClick={() => setTab("blocked")}
            className={`rounded-md px-4 py-2 text-sm transition-colors ${
              tab === "blocked"
                ? "bg-white text-[#1d4ed8]"
                : " text-white/85 hover:bg-white/10 hover:text-white"
            }`}
          >
            Blocked ({tabCounts.blocked})
          </button>
        </div>

        {tab === "approvals" && <ApprovalsTab apiKey={apiKey} />}
        {tab === "pairing" && <PairingTab apiKey={apiKey} />}
        {tab === "onboarding" && <OnboardingTab apiKey={apiKey} />}
        {tab === "blocked" && <BlockedTab apiKey={apiKey} />}
      </div>
    </div>
  );
}

async function resolveSignedUrls(
  paths: string[],
  apiKey: string,
  size: "thumbnail" | "full" = "thumbnail",
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  try {
    const res = await fetch("/api/tpo/admin/signed-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": apiKey,
      },
      body: JSON.stringify({ paths, size }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.urls || {};
    }
  } catch (err) {
    console.error("Failed to resolve signed URLs", err);
  }
  return {};
}

function ImageModal({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none font-light z-10"
      >
        &times;
      </button>
      <Image
        src={src}
        alt={alt}
        width={1600}
        height={1200}
        unoptimized
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function OnboardingConversationModal({
  userId,
  userPhoneNumber,
  onboardingStep,
  conversation,
  pingLoading,
  onPing,
  onClose,
}: {
  userId: string;
  userPhoneNumber: string;
  onboardingStep: string;
  conversation: string | null;
  pingLoading: boolean;
  onPing: (userId: string) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <AdminCardModal
      open
      title="Onboarding convo"
      subtitle={`${userPhoneNumber} · ${formatStepLabel(onboardingStep)}`}
      maxWidthClass="max-w-2xl"
      showCloseButton={false}
      topRightSlot={
        <button
          type="button"
          onClick={() => void onPing(userId)}
          disabled={pingLoading}
          className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-[#1d4ed8] transition-colors hover:bg-white/90 disabled:opacity-50"
          title="Send reminder ping"
        >
          {pingLoading ? "Pinging..." : "Ping"}
        </button>
      }
      onClose={onClose}
    >
      <div className="min-h-0 flex-1 overflow-y-auto text-xs leading-relaxed text-white/90 whitespace-pre-wrap">
        {conversation?.trim() || "No onboarding conversation yet."}
      </div>
    </AdminCardModal>
  );
}

function ApplicationPlaintextModal({
  user,
  onClose,
}: {
  user: Pick<
    TpoUser,
    | "phoneNumber"
    | "aboutMe"
    | "preferences"
    | "city"
    | "dlName"
    | "dlAge"
    | "dlHeight"
  >;
  onClose: () => void;
}) {
  return (
    <AdminCardModal
      open
      title="Application plaintext"
      maxWidthClass="max-w-2xl"
      onClose={onClose}
    >
      <div className="min-h-0 flex-1 overflow-y-auto text-xs leading-relaxed text-white/90 whitespace-pre-wrap">
        {formatApplicationPlaintext(user)}
      </div>
    </AdminCardModal>
  );
}

function SecureImage({
  path,
  urlMap,
  fullUrlMap,
  alt,
  className,
  onExpand,
}: {
  path: string;
  urlMap: Record<string, string>;
  fullUrlMap?: Record<string, string>;
  alt: string;
  className?: string;
  onExpand?: (src: string, alt: string) => void;
}) {
  const url = urlMap[path];
  if (!url)
    return (
      <div
        className={`${className} flex items-center justify-center bg-white/15 text-xs text-white/70`}
      />
    );

  const handleClick = () => {
    if (onExpand) {
      const fullUrl = fullUrlMap?.[path] || url;
      onExpand(fullUrl, alt);
    }
  };

  return (
    <Image
      src={url}
      alt={alt}
      width={600}
      height={600}
      unoptimized
      className={`${className} ${onExpand ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
      onClick={onExpand ? handleClick : undefined}
    />
  );
}

function ApprovalsTab({ apiKey }: { apiKey: string }) {
  const [users, setUsers] = useState<TpoUser[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [badgeActionKey, setBadgeActionKey] = useState<string | null>(null);
  const [galleryIndexByUser, setGalleryIndexByUser] = useState<
    Record<string, number>
  >({});
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [fullUrlMap, setFullUrlMap] = useState<Record<string, string>>({});
  const [modalImage, setModalImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [applicationModalUser, setApplicationModalUser] =
    useState<TpoUser | null>(null);

  const fetchUsers = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setInitialLoading(true);
      }
      try {
        const res = await fetch("/api/tpo/admin/users?status=PENDING_REVIEW", {
          headers: { "x-internal-api-key": apiKey },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users);

          const allPaths = data.users.flatMap((u: TpoUser) => [
            ...u.photoUrls,
            ...(u.idPhotoUrl ? [u.idPhotoUrl] : []),
          ]);
          const [thumbs, fulls] = await Promise.all([
            resolveSignedUrls(allPaths, apiKey, "thumbnail"),
            resolveSignedUrls(allPaths, apiKey, "full"),
          ]);
          setUrlMap(thumbs);
          setFullUrlMap(fulls);
        }
      } catch (err) {
        console.error("Failed to fetch users", err);
      } finally {
        if (isInitial) {
          setInitialLoading(false);
        }
      }
    },
    [apiKey],
  );

  useEffect(() => {
    fetchUsers(true);
  }, [fetchUsers]);

  const handleReview = async (userId: string, action: "approve" | "reject") => {
    setActionLoading(userId);
    try {
      await fetch("/api/tpo/admin/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({ userId, action }),
      });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error("Review failed", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserAction = async (userId: string, action: "delete" | "ban") => {
    setActionLoading(userId);
    try {
      await fetch("/api/tpo/admin/user-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({ userId, action }),
      });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error("User action failed", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReparseProfile = async (userId: string) => {
    setActionLoading(`reparse:${userId}`);
    try {
      await fetch("/api/tpo/admin/user-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({ userId, action: "reparse_profile" }),
      });
      await fetchUsers();
    } catch (err) {
      console.error("Profile reparse failed", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditBadge = async (
    userId: string,
    badge: ParsedBadge,
    nextValue: string,
  ) => {
    const actionId = `${badge.key}:edit`;
    setBadgeActionKey(actionId);
    try {
      const res = await fetch("/api/tpo/admin/user-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({
          userId,
          action: "edit_badge",
          section: badge.profileSection,
          field: badge.field,
          currentValue: badge.rawValue,
          nextValue,
        }),
      });
      if (res.ok) {
        await fetchUsers();
      }
    } catch (err) {
      console.error("Badge edit failed", err);
    } finally {
      setBadgeActionKey(null);
    }
  };

  const handleDeleteBadge = async (userId: string, badge: ParsedBadge) => {
    const actionId = `${badge.key}:delete`;
    setBadgeActionKey(actionId);
    try {
      const res = await fetch("/api/tpo/admin/user-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({
          userId,
          action: "delete_badge",
          section: badge.profileSection,
          field: badge.field,
          currentValue: badge.rawValue,
        }),
      });
      if (res.ok) {
        await fetchUsers();
      }
    } catch (err) {
      console.error("Badge delete failed", err);
    } finally {
      setBadgeActionKey(null);
    }
  };

  if (initialLoading) return null;

  if (users.length === 0) {
    return (
      <div className={EMPTY_STATE_CONTAINER_CLASS}>
        <p className="text-base text-white/65">No pending applications</p>
      </div>
    );
  }

  return (
    <div>
      <div className={TAB_GRID_CLASS}>
        {users.map((user) => {
          const structured = getStructuredProfile(user);
          const badgeGroups = makeBadgeGroups(user, structured);
          const isReparsing = actionLoading === `reparse:${user.id}`;
          const displayName = user.dlName || user.phoneNumber;
          const galleryPaths = [
            ...user.photoUrls,
            ...(user.idPhotoUrl ? [user.idPhotoUrl] : []),
          ];
          const currentGalleryIndex =
            galleryPaths.length > 0
              ? Math.min(
                  galleryIndexByUser[user.id] ?? 0,
                  galleryPaths.length - 1,
                )
              : 0;
          const activeGalleryPath = galleryPaths[currentGalleryIndex] ?? null;
          return (
            <div
              key={user.id}
              className="flex flex-col rounded-xl border border-white/25 bg-white/12 p-4 backdrop-blur-md"
            >
              <div className="mb-3 flex h-[170px] gap-3 overflow-hidden">
                <div className="w-24 shrink-0">
                  {activeGalleryPath ? (
                    <div
                      className="block aspect-square w-full overflow-hidden rounded-lg border border-white/25 bg-white/10"
                      title="click to expand image"
                    >
                      <SecureImage
                        path={activeGalleryPath}
                        urlMap={urlMap}
                        fullUrlMap={fullUrlMap}
                        alt={`Photo ${currentGalleryIndex + 1}`}
                        className="h-full w-full object-cover"
                        onExpand={(src, alt) => {
                          setModalImage({ src, alt });
                        }}
                      />
                    </div>
                  ) : (
                    <div className="aspect-square w-full rounded-lg border border-white/25 bg-white/10" />
                  )}
                  {galleryPaths.length > 1 && (
                    <div className="mt-1 grid grid-cols-4 gap-1">
                      {galleryPaths.slice(0, 4).map((path, idx) => (
                        <button
                          key={`${user.id}:${path}:${idx}`}
                          type="button"
                          onClick={() =>
                            setGalleryIndexByUser((prev) => ({
                              ...prev,
                              [user.id]: idx,
                            }))
                          }
                          className={`aspect-square overflow-hidden rounded border ${
                            idx === currentGalleryIndex
                              ? "border-white bg-white/15"
                              : "border-white/35 bg-white/10"
                          }`}
                          title={`show image ${idx + 1}`}
                        >
                          <SecureImage
                            path={path}
                            urlMap={urlMap}
                            alt={`Thumb ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {displayName}
                      </p>
                      <p className="truncate text-[11px] text-white/60">
                        {user.phoneNumber} ·{" "}
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setApplicationModalUser(user)}
                        className="rounded-full bg-white/15 p-1 text-white/85 hover:bg-white/25 hover:text-white"
                        title="view full plaintext application"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReparseProfile(user.id)}
                        disabled={isReparsing}
                        className="rounded-full bg-white/15 p-1 text-white/85 hover:bg-white/25 hover:text-white disabled:opacity-50"
                        title="re-parse badges"
                      >
                        <RefreshCcw
                          className={`h-3.5 w-3.5 ${isReparsing ? "animate-spin" : ""}`}
                        />
                      </button>
                    </div>
                  </div>

                  <div
                    className={`min-h-0 pt-2 pb-4 flex-1 overflow-y-auto pr-1 [mask-image:linear-gradient(to_bottom,transparent_0,black_20px,black_calc(100%_-_20px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_20px,black_calc(100%_-_20px),transparent_100%)]`}
                  >
                    <div className="space-y-2">
                      {badgeGroups.about.length > 0 && (
                        <div>
                          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/60">
                            about
                          </p>
                          <ParsedBadgeRow
                            badges={badgeGroups.about}
                            actionKey={badgeActionKey}
                            onEdit={(badge, nextValue) =>
                              handleEditBadge(user.id, badge, nextValue)
                            }
                            onDelete={(badge) =>
                              handleDeleteBadge(user.id, badge)
                            }
                          />
                        </div>
                      )}
                      {badgeGroups.preference.length > 0 && (
                        <div>
                          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/60">
                            preference
                          </p>
                          <ParsedBadgeRow
                            badges={badgeGroups.preference}
                            actionKey={badgeActionKey}
                            onEdit={(badge, nextValue) =>
                              handleEditBadge(user.id, badge, nextValue)
                            }
                            onDelete={(badge) =>
                              handleDeleteBadge(user.id, badge)
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto space-y-1.5">
                <button
                  onClick={() => handleReview(user.id, "approve")}
                  disabled={actionLoading === user.id}
                  className="w-full rounded-lg bg-white py-1.5 text-xs font-medium text-[#1d4ed8] transition-colors hover:bg-white/90 disabled:opacity-50"
                >
                  Approve
                </button>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleReview(user.id, "reject")}
                    disabled={actionLoading === user.id}
                    className="w-full rounded-lg bg-white/10 hover:bg-white/20 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/28 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleUserAction(user.id, "delete")}
                    disabled={actionLoading === user.id}
                    className="w-full rounded-lg bg-white/10 hover:bg-white/20 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/28 disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => handleUserAction(user.id, "ban")}
                    disabled={actionLoading === user.id}
                    className="w-full rounded-lg bg-white/10 hover:bg-white/20 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/28 disabled:opacity-50"
                  >
                    Ban
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modalImage && (
        <ImageModal
          src={modalImage.src}
          alt={modalImage.alt}
          onClose={() => setModalImage(null)}
        />
      )}
      {applicationModalUser && (
        <ApplicationPlaintextModal
          user={applicationModalUser}
          onClose={() => setApplicationModalUser(null)}
        />
      )}
    </div>
  );
}

function PairingTab({ apiKey }: { apiKey: string }) {
  const [approvedUsers, setApprovedUsers] = useState<TpoUser[]>([]);
  const [activeDates, setActiveDates] = useState<TpoDate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [endingDateId, setEndingDateId] = useState<string | null>(null);
  const [dateActionLoadingId, setDateActionLoadingId] = useState<string | null>(
    null,
  );
  const [userActionLoadingId, setUserActionLoadingId] = useState<string | null>(
    null,
  );
  const [badgeActionKey, setBadgeActionKey] = useState<string | null>(null);
  const [reparseLoadingId, setReparseLoadingId] = useState<string | null>(null);
  const [galleryIndexByUser, setGalleryIndexByUser] = useState<
    Record<string, number>
  >({});
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [fullUrlMap, setFullUrlMap] = useState<Record<string, string>>({});
  const [modalImage, setModalImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [applicationModalUser, setApplicationModalUser] =
    useState<TpoUser | null>(null);

  const fetchData = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setInitialLoading(true);
      }
      try {
        const [usersRes, datesRes] = await Promise.all([
          fetch("/api/tpo/admin/users?status=APPROVED", {
            headers: { "x-internal-api-key": apiKey },
          }),
          fetch("/api/tpo/admin/dates?status=ACTIVE", {
            headers: { "x-internal-api-key": apiKey },
          }),
        ]);

        let allUsers: TpoUser[] = [];
        if (usersRes.ok) {
          const data = await usersRes.json();
          allUsers = data.users;
          setApprovedUsers(allUsers);
        }

        let allDates: TpoDate[] = [];
        if (datesRes.ok) {
          const data = await datesRes.json();
          allDates = data.dates;
          setActiveDates(allDates);
        }

        const allPaths = [
          ...allUsers.flatMap((u) => [
            ...u.photoUrls,
            ...(u.idPhotoUrl ? [u.idPhotoUrl] : []),
          ]),
          ...allDates.flatMap((d) => [
            ...(d.userA.photoUrls || []),
            ...(d.userA.idPhotoUrl ? [d.userA.idPhotoUrl] : []),
            ...(d.userB.photoUrls || []),
            ...(d.userB.idPhotoUrl ? [d.userB.idPhotoUrl] : []),
          ]),
        ];
        const [thumbs, fulls] = await Promise.all([
          resolveSignedUrls(allPaths, apiKey, "thumbnail"),
          resolveSignedUrls(allPaths, apiKey, "full"),
        ]);
        setUrlMap(thumbs);
        setFullUrlMap(fulls);
      } catch (err) {
        console.error("Failed to fetch pairing data", err);
      } finally {
        if (isInitial) {
          setInitialLoading(false);
        }
      }
    },
    [apiKey],
  );

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const pairedUserIds = new Set(
    activeDates.flatMap((d) => [d.userA.id, d.userB.id]),
  );
  const availableUsers = approvedUsers.filter((u) => !pairedUserIds.has(u.id));

  const toggleSelect = (userId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      if (prev.length >= 2) return [prev[1], userId];
      return [...prev, userId];
    });
  };

  const handlePair = async () => {
    if (selectedIds.length !== 2) return;
    setPairingLoading(true);
    try {
      const res = await fetch("/api/tpo/admin/pair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({
          userAId: selectedIds[0],
          userBId: selectedIds[1],
        }),
      });

      if (res.ok) {
        setSelectedIds([]);
        await fetchData();
      }
    } catch (err) {
      console.error("Pair failed", err);
    } finally {
      setPairingLoading(false);
    }
  };

  const handleEndDate = async (dateId: string) => {
    setEndingDateId(dateId);
    try {
      const res = await fetch("/api/tpo/admin/end-date", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({ dateId }),
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error("End date failed", err);
    } finally {
      setEndingDateId(null);
    }
  };

  const handleDateAction = async (
    dateId: string,
    action:
      | "resend_prompt"
      | "force_propose_slot"
      | "mark_agreed_open_portal"
      | "escalate_date",
  ) => {
    setDateActionLoadingId(`${dateId}:${action}`);
    try {
      let slot: string | undefined;
      let target: "A" | "B" | undefined;
      if (action === "force_propose_slot") {
        slot =
          window.prompt("enter slot text (e.g. friday at 7:30 pm)")?.trim() ||
          undefined;
        if (!slot) return;
        target = window.confirm(
          "send to user b? click cancel to send to user a.",
        )
          ? "B"
          : "A";
      }

      const res = await fetch("/api/tpo/admin/date-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({
          dateId,
          action,
          slot,
          target,
        }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Date action failed", err);
    } finally {
      setDateActionLoadingId(null);
    }
  };

  const handleUserAction = async (userId: string, action: "delete" | "ban") => {
    setUserActionLoadingId(userId);
    try {
      const res = await fetch("/api/tpo/admin/user-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("User action failed", err);
    } finally {
      setUserActionLoadingId(null);
    }
  };

  const handleEditBadge = async (
    userId: string,
    badge: ParsedBadge,
    nextValue: string,
  ) => {
    const actionId = `${badge.key}:edit`;
    setBadgeActionKey(actionId);
    try {
      const res = await fetch("/api/tpo/admin/user-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({
          userId,
          action: "edit_badge",
          section: badge.profileSection,
          field: badge.field,
          currentValue: badge.rawValue,
          nextValue,
        }),
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error("Badge edit failed", err);
    } finally {
      setBadgeActionKey(null);
    }
  };

  const handleDeleteBadge = async (userId: string, badge: ParsedBadge) => {
    const actionId = `${badge.key}:delete`;
    setBadgeActionKey(actionId);
    try {
      const res = await fetch("/api/tpo/admin/user-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({
          userId,
          action: "delete_badge",
          section: badge.profileSection,
          field: badge.field,
          currentValue: badge.rawValue,
        }),
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error("Badge delete failed", err);
    } finally {
      setBadgeActionKey(null);
    }
  };

  const handleReparseProfile = async (userId: string) => {
    setReparseLoadingId(userId);
    try {
      const res = await fetch("/api/tpo/admin/user-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({ userId, action: "reparse_profile" }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Profile reparse failed", err);
    } finally {
      setReparseLoadingId(null);
    }
  };

  if (initialLoading) return null;

  return (
    <div>
      <div>
        {availableUsers.length === 0 ? (
          <div className={EMPTY_STATE_CONTAINER_CLASS}>
            <p className="text-base text-white/65">
              No available users to pair
            </p>
          </div>
        ) : (
          <div className={TAB_GRID_CLASS}>
            {availableUsers.map((user) => {
              const isSelected = selectedIds.includes(user.id);
              const structured = getStructuredProfile(user);
              const badgeGroups = makeBadgeGroups(user, structured);
              const displayName = user.dlName || user.phoneNumber;
              const isReparsing = reparseLoadingId === user.id;
              const galleryPaths = [
                ...user.photoUrls,
                ...(user.idPhotoUrl ? [user.idPhotoUrl] : []),
              ];
              const currentGalleryIndex =
                galleryPaths.length > 0
                  ? Math.min(
                      galleryIndexByUser[user.id] ?? 0,
                      galleryPaths.length - 1,
                    )
                  : 0;
              const activeGalleryPath =
                galleryPaths[currentGalleryIndex] ?? null;
              return (
                <div
                  key={user.id}
                  className={`flex flex-col rounded-xl border border-white/25 bg-white/12 p-4 backdrop-blur-md transition-all ${
                    isSelected ? "shadow-md ring-1 ring-white/60" : ""
                  }`}
                >
                  <div className="mb-3 flex h-[170px] gap-3 overflow-hidden">
                    <div className="w-24 shrink-0">
                      {activeGalleryPath ? (
                        <div
                          className="block aspect-square w-full overflow-hidden rounded-lg border border-white/25 bg-white/10"
                          title="click to expand image"
                        >
                          <SecureImage
                            path={activeGalleryPath}
                            urlMap={urlMap}
                            fullUrlMap={fullUrlMap}
                            alt={`Photo ${currentGalleryIndex + 1}`}
                            className="h-full w-full object-cover"
                            onExpand={(src, alt) => {
                              setModalImage({ src, alt });
                            }}
                          />
                        </div>
                      ) : (
                        <div className="aspect-square w-full rounded-lg border border-white/25 bg-white/10" />
                      )}
                      {galleryPaths.length > 1 && (
                        <div className="mt-1 grid grid-cols-4 gap-1">
                          {galleryPaths.slice(0, 4).map((path, idx) => (
                            <button
                              key={`${user.id}:${path}:${idx}`}
                              type="button"
                              onClick={() =>
                                setGalleryIndexByUser((prev) => ({
                                  ...prev,
                                  [user.id]: idx,
                                }))
                              }
                              className={`aspect-square overflow-hidden rounded border ${
                                idx === currentGalleryIndex
                                  ? "border-white bg-white/15"
                                  : "border-white/35 bg-white/10"
                              }`}
                              title={`show image ${idx + 1}`}
                            >
                              <SecureImage
                                path={path}
                                urlMap={urlMap}
                                alt={`Thumb ${idx + 1}`}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {displayName}
                          </p>
                          <p className="truncate text-[11px] text-white/60">
                            {user.phoneNumber} ·{" "}
                            {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleSelect(user.id)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors ${
                              isSelected
                                ? "border-white bg-white text-[#1d4ed8]"
                                : "border-white/45 bg-white/18 text-white hover:bg-white/28"
                            }`}
                          >
                            {isSelected ? "selected" : "select"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setApplicationModalUser(user)}
                            className="rounded-full bg-white/15 p-1 text-white/85 hover:bg-white/25 hover:text-white"
                            title="view full plaintext application"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReparseProfile(user.id)}
                            disabled={isReparsing}
                            className="rounded-full bg-white/15 p-1 text-white/85 hover:bg-white/25 hover:text-white disabled:opacity-50"
                            title="re-parse badges from original answers"
                          >
                            <RefreshCcw
                              className={`h-3.5 w-3.5 ${isReparsing ? "animate-spin" : ""}`}
                            />
                          </button>
                        </div>
                      </div>

                      <div
                        className={`min-h-0 pt-2 pb-4 flex-1 overflow-y-auto pr-1 [mask-image:linear-gradient(to_bottom,transparent_0,black_20px,black_calc(100%_-_20px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_20px,black_calc(100%_-_20px),transparent_100%)]`}
                      >
                        <div className="space-y-2">
                          {badgeGroups.about.length > 0 && (
                            <div>
                              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/60">
                                about
                              </p>
                              <ParsedBadgeRow
                                badges={badgeGroups.about}
                                actionKey={badgeActionKey}
                                onEdit={(badge, nextValue) =>
                                  handleEditBadge(user.id, badge, nextValue)
                                }
                                onDelete={(badge) =>
                                  handleDeleteBadge(user.id, badge)
                                }
                              />
                            </div>
                          )}
                          {badgeGroups.preference.length > 0 && (
                            <div>
                              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/60">
                                preference
                              </p>
                              <ParsedBadgeRow
                                badges={badgeGroups.preference}
                                actionKey={badgeActionKey}
                                onEdit={(badge, nextValue) =>
                                  handleEditBadge(user.id, badge, nextValue)
                                }
                                onDelete={(badge) =>
                                  handleDeleteBadge(user.id, badge)
                                }
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUserAction(user.id, "delete")}
                      disabled={userActionLoadingId === user.id}
                      className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/28 disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUserAction(user.id, "ban")}
                      disabled={userActionLoadingId === user.id}
                      className="rounded-lg bg-white/18 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/28 disabled:opacity-50"
                    >
                      Ban
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between">
          <div />
          {selectedIds.length === 2 && (
            <button
              onClick={handlePair}
              disabled={pairingLoading}
              className="rounded-lg bg-white px-6 py-2 text-sm font-medium text-[#1d4ed8] transition-colors hover:bg-white/90 disabled:opacity-50"
            >
              {pairingLoading ? "Pairing..." : "Pair Selected"}
            </button>
          )}
        </div>
      </div>

      {activeDates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white">
            Active Dates ({activeDates.length})
          </h2>
          <div className={TAB_GRID_CLASS}>
            {activeDates.map((date) => (
              <div
                key={date.id}
                className="flex flex-col rounded-xl border border-white/25 bg-white/12 p-4 backdrop-blur-md"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex -space-x-2 shrink-0">
                    {date.userA.photoUrls[0] && (
                      <SecureImage
                        path={date.userA.photoUrls[0]}
                        urlMap={urlMap}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border-2 border-white"
                      />
                    )}
                    {date.userB.photoUrls[0] && (
                      <SecureImage
                        path={date.userB.photoUrls[0]}
                        urlMap={urlMap}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border-2 border-white"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {getDisplayName(date.userA)} &{" "}
                      {getDisplayName(date.userB)}
                    </p>
                    <p className="text-[11px] text-white/60">
                      {date._count.messages} msgs ·{" "}
                      {new Date(date.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="mb-3 space-y-0.5 text-[11px] text-white/70">
                  <p>
                    {date.portalEnabled
                      ? `portal open${date.agreedTime ? ` · ${date.agreedTime}` : ""}`
                      : `scheduling${date.proposedSlot ? ` · ${date.proposedSlot}` : ""}`}
                  </p>
                  <p>
                    {formatStepLabel(date.schedulingPhase)} ·{" "}
                    {date.schedulingAttemptCount} attempts
                  </p>
                  {date.schedulingFailedReason && (
                    <p className="text-red-500">
                      {date.schedulingFailedReason}
                    </p>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                  <button
                    onClick={() => handleDateAction(date.id, "resend_prompt")}
                    disabled={
                      dateActionLoadingId === `${date.id}:resend_prompt`
                    }
                    className="rounded-md border border-white/35 bg-white/15 px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-white/25"
                  >
                    resend
                  </button>
                  <button
                    onClick={() =>
                      handleDateAction(date.id, "force_propose_slot")
                    }
                    disabled={
                      dateActionLoadingId === `${date.id}:force_propose_slot`
                    }
                    className="rounded-md border border-white/35 bg-white/15 px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-white/25"
                  >
                    force slot
                  </button>
                  <button
                    onClick={() =>
                      handleDateAction(date.id, "mark_agreed_open_portal")
                    }
                    disabled={
                      dateActionLoadingId ===
                      `${date.id}:mark_agreed_open_portal`
                    }
                    className="rounded-md border border-white/35 bg-white/15 px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-white/25"
                  >
                    agreed
                  </button>
                  <button
                    onClick={() => handleDateAction(date.id, "escalate_date")}
                    disabled={
                      dateActionLoadingId === `${date.id}:escalate_date`
                    }
                    className="rounded-md border border-white/35 bg-white/15 px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-white/25"
                  >
                    escalate
                  </button>
                  <button
                    onClick={() => handleEndDate(date.id)}
                    disabled={endingDateId === date.id}
                    className="rounded-md border border-white/35 bg-white/15 px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-white/25"
                  >
                    {endingDateId === date.id ? "..." : "end"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalImage && (
        <ImageModal
          src={modalImage.src}
          alt={modalImage.alt}
          onClose={() => setModalImage(null)}
        />
      )}
      {applicationModalUser && (
        <ApplicationPlaintextModal
          user={applicationModalUser}
          onClose={() => setApplicationModalUser(null)}
        />
      )}
    </div>
  );
}

function BlockedTab({ apiKey }: { apiKey: string }) {
  const [users, setUsers] = useState<TpoUser[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [applicationModalUser, setApplicationModalUser] =
    useState<TpoUser | null>(null);

  const fetchUsers = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setInitialLoading(true);
      }
      try {
        const [bannedRes, rejectedRes] = await Promise.all([
          fetch("/api/tpo/admin/users?status=BANNED", {
            headers: { "x-internal-api-key": apiKey },
          }),
          fetch("/api/tpo/admin/users?status=REJECTED", {
            headers: { "x-internal-api-key": apiKey },
          }),
        ]);

        const merged: TpoUser[] = [];
        if (bannedRes.ok) {
          const bannedData = await bannedRes.json();
          merged.push(...(bannedData.users || []));
        }
        if (rejectedRes.ok) {
          const rejectedData = await rejectedRes.json();
          merged.push(...(rejectedData.users || []));
        }

        merged.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setUsers(merged);
      } catch (err) {
        console.error("Failed to fetch blocked users", err);
      } finally {
        if (isInitial) {
          setInitialLoading(false);
        }
      }
    },
    [apiKey],
  );

  useEffect(() => {
    fetchUsers(true);
  }, [fetchUsers]);

  const handleUserAction = async (userId: string, action: "delete") => {
    const loadingKey = `${userId}:${action}`;
    setActionLoading(loadingKey);
    try {
      const res = await fetch("/api/tpo/admin/user-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) {
        await fetchUsers();
      }
    } catch (err) {
      console.error("Blocked user action failed", err);
    } finally {
      setActionLoading(null);
    }
  };

  if (initialLoading) return null;

  if (users.length === 0) {
    return (
      <div className={EMPTY_STATE_CONTAINER_CLASS}>
        <p className="text-base text-white/65">
          No banned or rejected profiles
        </p>
      </div>
    );
  }

  return (
    <div className={TAB_GRID_CLASS}>
      {users.map((user) => {
        const isBanned = user.status === "BANNED";
        const statusLabel = isBanned ? "banned" : "rejected";
        return (
          <div
            key={user.id}
            className="flex flex-col rounded-xl border border-white/25 bg-white/12 p-4 backdrop-blur-md"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user.dlName || user.phoneNumber}
                </p>
                <p className="truncate text-[11px] text-white/60">
                  {user.phoneNumber} ·{" "}
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isBanned
                      ? "bg-rose-500/30 text-rose-100"
                      : "bg-amber-500/30 text-amber-100"
                  }`}
                >
                  {statusLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setApplicationModalUser(user)}
                className="rounded-full bg-white/15 p-1 text-white/85 transition-colors hover:bg-white/25 hover:text-white"
                title="view full plaintext application"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="mb-3 text-xs text-white/75">
              cancel flow deletes this record so they can sign up fresh.
            </p>

            <div className="mt-auto">
              <button
                type="button"
                onClick={() => handleUserAction(user.id, "delete")}
                disabled={actionLoading === `${user.id}:delete`}
                className="w-full rounded-lg bg-white/10 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/28 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })}
      {applicationModalUser && (
        <ApplicationPlaintextModal
          user={applicationModalUser}
          onClose={() => setApplicationModalUser(null)}
        />
      )}
    </div>
  );
}

function OnboardingTab({ apiKey }: { apiKey: string }) {
  const [users, setUsers] = useState<TpoUser[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [conversationModalUser, setConversationModalUser] =
    useState<TpoUser | null>(null);

  const fetchUsers = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setInitialLoading(true);
      }
      try {
        const res = await fetch("/api/tpo/admin/users?status=ONBOARDING", {
          headers: { "x-internal-api-key": apiKey },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error("Failed to fetch onboarding users", err);
      } finally {
        if (isInitial) {
          setInitialLoading(false);
        }
      }
    },
    [apiKey],
  );

  useEffect(() => {
    fetchUsers(true);
  }, [fetchUsers]);

  const handleAction = async (
    userId: string,
    action: "restart_onboarding" | "cancel_onboarding" | "ping_onboarding",
  ) => {
    setActionLoading(userId + action);
    try {
      const res = await fetch("/api/tpo/admin/user-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": apiKey,
        },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) {
        await fetchUsers();
      }
    } catch (err) {
      console.error("Onboarding action failed", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePing = async (userId: string) => {
    await handleAction(userId, "ping_onboarding");
  };

  if (initialLoading) return null;

  if (users.length === 0) {
    return (
      <div className={EMPTY_STATE_CONTAINER_CLASS}>
        <p className="text-base text-white/65">No users currently onboarding</p>
      </div>
    );
  }

  return (
    <div className={TAB_GRID_CLASS}>
      {users.map((user) => (
        <div
          key={user.id}
          className="flex flex-col rounded-xl border border-white/25 bg-white/12 p-4 backdrop-blur-md"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white">
                {user.phoneNumber}
              </p>
              <p className="text-[11px] text-white/60">
                {formatStepLabel(user.onboardingStep)} ·{" "}
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConversationModalUser(user)}
              className="rounded-full bg-white/15 p-1 text-white/85 transition-colors hover:bg-white/25 hover:text-white"
              title="view full conversation"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-auto flex gap-1.5 pt-2">
            <button
              onClick={() => handleAction(user.id, "restart_onboarding")}
              disabled={actionLoading === user.id + "restart_onboarding"}
              className="flex-1 rounded-lg bg-white py-1.5 text-xs font-medium text-[#1d4ed8] transition-colors hover:bg-white/90 disabled:opacity-50"
            >
              Restart
            </button>
            <button
              onClick={() => handleAction(user.id, "cancel_onboarding")}
              disabled={actionLoading === user.id + "cancel_onboarding"}
              className="flex-1 rounded-lg bg-white/10 hover:bg-white/20 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/28 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ))}
      {conversationModalUser && (
        <OnboardingConversationModal
          userId={conversationModalUser.id}
          userPhoneNumber={conversationModalUser.phoneNumber}
          onboardingStep={conversationModalUser.onboardingStep}
          conversation={conversationModalUser.aboutMe}
          pingLoading={
            actionLoading === conversationModalUser.id + "ping_onboarding"
          }
          onPing={handlePing}
          onClose={() => setConversationModalUser(null)}
        />
      )}
    </div>
  );
}
