"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Briefcase,
  CalendarDays,
  Cigarette,
  Dumbbell,
  GlassWater,
  Heart,
  MessageCircle,
  MoonStar,
  Mountain,
  PawPrint,
  PersonStanding,
  Radar,
  Ruler,
  Scale,
  Sparkles,
  Speech,
  UserRound,
  Users,
  VenetianMask,
  RefreshCcw,
  Pencil,
  Trash2,
} from "lucide-react";

type Tab = "approvals" | "pairing" | "onboarding";

interface TpoUser {
  id: string;
  createdAt: string;
  phoneNumber: string;
  status: string;
  onboardingStep: string;
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
  fitnessImportance: string | null;
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
}

interface PreferencesStructuredView {
  summary: string | null;
  ageRange: string | null;
  heightRange: string | null;
  mustHaves: string[];
  dealbreakers: string[];
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
  bodyTypePreferences: string[];
  faceFeaturePreferences: string[];
  raceEthnicityPreferences: string[];
  stylePreferences: string[];
  groomingPreferences: string[];
  voiceAccentPreferences: string[];
  jobAmbitionPreferences: string[];
  fitnessPreference: string | null;
}

interface StructuredProfileView {
  about: AboutStructuredView;
  preferences: PreferencesStructuredView;
  photoAiTags: string[];
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
      fitnessImportance: toStringOrNull(about.fitnessImportance),
      fridayNight: toStringOrNull(about.fridayNight),
      sunday: toStringOrNull(about.sunday),
      homeCleanliness: toStringOrNull(about.homeCleanliness),
      communicationWhenInterested: toStringOrNull(
        about.communicationWhenInterested
      ),
      directness: toStringOrNull(about.directness),
      conflictStyle: toStringOrNull(about.conflictStyle),
      planningStyle: toStringOrNull(about.planningStyle),
      personalValues: toStringArray(about.personalValues),
      drinking: toStringOrNull(about.drinking),
      smoking: toStringOrNull(about.smoking),
    },
    preferences: {
      summary: toStringOrNull(preferences.summary),
      ageRange: toStringOrNull(preferences.ageRange),
      heightRange: toStringOrNull(preferences.heightRange),
      mustHaves: toStringArray(preferences.mustHaves),
      dealbreakers: toStringArray(preferences.dealbreakers),
      personalityTraits: toStringArray(preferences.personalityTraits),
      humorStyle: toStringOrNull(preferences.humorStyle),
      socialEnergyPreference: toStringOrNull(preferences.socialEnergyPreference),
      religionCompatibility: toStringOrNull(preferences.religionCompatibility),
      politicalCompatibility: toStringOrNull(preferences.politicalCompatibility),
      drinkingPreference: toStringOrNull(preferences.drinkingPreference),
      smokingPreference: toStringOrNull(preferences.smokingPreference),
      textingFrequency: toStringOrNull(preferences.textingFrequency),
      replySpeed: toStringOrNull(preferences.replySpeed),
      meetupFrequency: toStringOrNull(preferences.meetupFrequency),
      datePlanningPreference: toStringOrNull(preferences.datePlanningPreference),
      locationLimits: toStringOrNull(preferences.locationLimits),
      bodyTypePreferences: toStringArray(preferences.bodyTypePreferences),
      faceFeaturePreferences: toStringArray(preferences.faceFeaturePreferences),
      raceEthnicityPreferences: toStringArray(preferences.raceEthnicityPreferences),
      stylePreferences: toStringArray(preferences.stylePreferences),
      groomingPreferences: toStringArray(preferences.groomingPreferences),
      voiceAccentPreferences: toStringArray(preferences.voiceAccentPreferences),
      jobAmbitionPreferences: toStringArray(preferences.jobAmbitionPreferences),
      fitnessPreference: toStringOrNull(preferences.fitnessPreference),
    },
    photoAiTags: toStringArray(obj.photoAiTags),
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

function normalizeBadgeValue(value: string): string {
  let normalized = value.trim().toLowerCase().replace(/[.,!?;:]+$/g, "");
  normalized = normalized
    .replace(/^i(?:'m| am)\s+/, "")
    .replace(/^(a|an|the)\s+/, "")
    .replace(/\s+/g, " ");

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
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge.key}
          className="group inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-700"
          title={badge.label}
        >
          <badge.Icon className="h-3.5 w-3.5 text-stone-500" />
          <span>{badge.value}</span>
          {badge.editable && onEdit && onDelete && (
            <span className="ml-0.5 hidden items-center gap-1 group-hover:inline-flex">
              <button
                type="button"
                className="rounded p-0.5 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
                disabled={actionKey === `${badge.key}:edit`}
                onClick={(e) => {
                  e.stopPropagation();
                  const nextValue = window.prompt("edit badge", badge.value)?.trim();
                  if (!nextValue || nextValue === badge.value) return;
                  onEdit(badge, nextValue);
                }}
                title="edit badge"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="rounded p-0.5 text-stone-500 hover:bg-stone-100 hover:text-red-600"
                disabled={actionKey === `${badge.key}:delete`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!window.confirm(`delete "${badge.value}"?`)) return;
                  onDelete(badge);
                }}
                title="delete badge"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function makeBadgeGroups(
  user: TpoUser,
  structured: StructuredProfileView | null
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
    editable = true
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
    editable = true
  ) => {
    for (const value of values ?? [])
      push(section, label, profileSection, field, value, Icon, editable);
  };

  // Identity + intent
  push("about", "gender", "about", "gender", structured.about.gender, UserRound);
  push("about", "sexuality", "about", "sexuality", structured.about.sexuality, Heart);
  push(
    "about",
    "intent",
    "about",
    "lookingForNow",
    structured.about.lookingForNow ?? structured.about.relationshipIntent,
    Heart
  );
  push(
    "about",
    "lean",
    "about",
    "openToBothPreference",
    structured.about.openToBothPreference,
    Scale
  );

  // Background
  push("about", "work", "about", "work", structured.about.work, Briefcase);
  push("about", "city", "about", "city", user.city, Radar, false);
  push("about", "age", "about", "age", user.dlAge ? `${user.dlAge}` : null, CalendarDays, false);
  push("about", "height", "about", "height", user.dlHeight, Ruler, false);

  // Lifestyle / self
  push("about", "drinking", "about", "drinking", structured.about.drinking, GlassWater);
  push("about", "smoking", "about", "smoking", structured.about.smoking, Cigarette);
  push("about", "sleep", "about", "sleepSchedule", structured.about.sleepSchedule, MoonStar);
  push("about", "activity", "about", "activityLevel", structured.about.activityLevel, Mountain);
  push("about", "fitness", "about", "fitnessImportance", structured.about.fitnessImportance, Dumbbell);
  push("about", "social week", "about", "weekdaySocialLevel", structured.about.weekdaySocialLevel, Users);
  push("about", "social weekend", "about", "weekendSocialLevel", structured.about.weekendSocialLevel, Users);
  push("about", "friday", "about", "fridayNight", structured.about.fridayNight, Sparkles);
  push("about", "sunday", "about", "sunday", structured.about.sunday, Sparkles);
  push("about", "cleanliness", "about", "homeCleanliness", structured.about.homeCleanliness, Sparkles);

  // Communication / personality
  push("about", "vibe", "about", "introExtro", structured.about.introExtro, Users);
  push("about", "communication", "about", "communicationWhenInterested", structured.about.communicationWhenInterested, MessageCircle);
  push("about", "directness", "about", "directness", structured.about.directness, Speech);
  push("about", "conflict", "about", "conflictStyle", structured.about.conflictStyle, Speech);
  push("about", "planning", "about", "planningStyle", structured.about.planningStyle, CalendarDays);
  pushMany("about", "values", "about", "personalValues", structured.about.personalValues, Scale);
  pushMany("about", "hobby", "about", "hobbies", structured.about.hobbies, Sparkles);

  // Partner preferences
  push("preference", "age", "preferences", "ageRange", structured.preferences.ageRange, CalendarDays);
  push("preference", "height", "preferences", "heightRange", structured.preferences.heightRange, Ruler);
  push("preference", "fitness", "preferences", "fitnessPreference", structured.preferences.fitnessPreference, Dumbbell);
  push("preference", "religion", "preferences", "religionCompatibility", structured.preferences.religionCompatibility, Scale);
  push("preference", "politics", "preferences", "politicalCompatibility", structured.preferences.politicalCompatibility, Scale);
  push("preference", "drinking", "preferences", "drinkingPreference", structured.preferences.drinkingPreference, GlassWater);
  push("preference", "smoking", "preferences", "smokingPreference", structured.preferences.smokingPreference, Cigarette);
  push("preference", "social", "preferences", "socialEnergyPreference", structured.preferences.socialEnergyPreference, Users);
  push("preference", "texting", "preferences", "textingFrequency", structured.preferences.textingFrequency, MessageCircle);
  push("preference", "replies", "preferences", "replySpeed", structured.preferences.replySpeed, MessageCircle);
  push("preference", "meetup", "preferences", "meetupFrequency", structured.preferences.meetupFrequency, Users);
  push("preference", "planning", "preferences", "datePlanningPreference", structured.preferences.datePlanningPreference, CalendarDays);
  push("preference", "location", "preferences", "locationLimits", structured.preferences.locationLimits, Radar);
  push("preference", "humor", "preferences", "humorStyle", structured.preferences.humorStyle, VenetianMask);
  pushMany("preference", "must-have", "preferences", "mustHaves", structured.preferences.mustHaves, Sparkles);
  pushMany("preference", "dealbreaker", "preferences", "dealbreakers", structured.preferences.dealbreakers, Scale);
  pushMany("preference", "trait", "preferences", "personalityTraits", structured.preferences.personalityTraits, UserRound);
  pushMany("preference", "ambition", "preferences", "jobAmbitionPreferences", structured.preferences.jobAmbitionPreferences, Briefcase);
  pushMany("preference", "body", "preferences", "bodyTypePreferences", structured.preferences.bodyTypePreferences, PersonStanding);
  pushMany("preference", "face", "preferences", "faceFeaturePreferences", structured.preferences.faceFeaturePreferences, UserRound);
  pushMany("preference", "style", "preferences", "stylePreferences", structured.preferences.stylePreferences, Sparkles);
  pushMany("preference", "grooming", "preferences", "groomingPreferences", structured.preferences.groomingPreferences, Sparkles);
  pushMany("preference", "race/ethnicity", "preferences", "raceEthnicityPreferences", structured.preferences.raceEthnicityPreferences, Users);
  pushMany("preference", "voice/accent", "preferences", "voiceAccentPreferences", structured.preferences.voiceAccentPreferences, Speech);
  pushMany("preference", "boundaries", "about", "boundaries", structured.about.boundaries, Scale);

  // Kids/pets indicator from freeform if parser did not split them out
  const combined = `${user.aboutMe ?? ""} ${user.preferences ?? ""}`.toLowerCase();
  if (combined.includes("kid")) push("about", "kids", "about", "kidsMentioned", "mentioned", Baby, false);
  if (combined.includes("pet") || combined.includes("dog") || combined.includes("cat")) {
    push("about", "pets", "about", "petsMentioned", "mentioned", PawPrint, false);
  }

  // AI photo extraction
  pushMany("about", "photo", "about", "photoAiTags", structured.photoAiTags, Sparkles, false);

  return { about, preference, all: [...about, ...preference] };
}

function getDisplayName(user: Pick<TpoUser, "aboutMe" | "phoneNumber"> & { dlName?: string | null }) {
  if (user.dlName) return user.dlName;
  if (!user.aboutMe) return user.phoneNumber;
  const firstLine = user.aboutMe.split("\n")[0];
  return firstLine.length > 40 ? firstLine.slice(0, 40) + "..." : firstLine;
}

export default function BackendPage() {
  const [apiKey, setApiKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState<Tab>("approvals");
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
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
          <h1 className="text-2xl font-bold text-stone-900 mb-6 text-center">
            jøsh Admin
          </h1>
          <input
            type="password"
            placeholder="Enter admin key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && apiKey) handleSignIn();
            }}
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 mb-4 focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
          <button
            onClick={handleSignIn}
            disabled={!apiKey}
            className="w-full rounded-lg bg-stone-900 text-white py-3 text-sm font-medium hover:bg-stone-800 disabled:opacity-40 transition-colors"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 font-pp-neue-montreal">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-stone-900">jøsh Admin</h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            Sign out
          </button>
        </div>

        <div className="flex gap-1 mb-6 bg-stone-200 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("approvals")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "approvals"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Approvals
          </button>
          <button
            onClick={() => setTab("pairing")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "pairing"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Pairing
          </button>
          <button
            onClick={() => setTab("onboarding")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "onboarding"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Onboarding
          </button>
        </div>

        {tab === "approvals" && <ApprovalsTab apiKey={apiKey} />}
        {tab === "pairing" && <PairingTab apiKey={apiKey} />}
        {tab === "onboarding" && <OnboardingTab apiKey={apiKey} />}
      </div>
    </div>
  );
}

async function resolveSignedUrls(
  paths: string[],
  apiKey: string,
  size: "thumbnail" | "full" = "thumbnail"
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
        className={`${className} bg-stone-100 flex items-center justify-center text-stone-400 text-xs`}
      >
        Loading...
      </div>
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
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [fullUrlMap, setFullUrlMap] = useState<Record<string, string>>({});
  const [modalImage, setModalImage] = useState<{ src: string; alt: string } | null>(null);

  const fetchUsers = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
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
      } else {
        setRefreshing(false);
      }
    }
  }, [apiKey]);

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

  if (initialLoading) {
    return <p className="text-stone-500">Loading applications...</p>;
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
        <p className="text-stone-400 text-lg">No pending applications</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-stone-500">
          {users.length} pending application{users.length !== 1 ? "s" : ""}
        </p>
        {refreshing && <p className="text-xs text-stone-400">refreshing...</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {users.map((user) => {
          const structured = getStructuredProfile(user);
          const badgeGroups = makeBadgeGroups(user, structured);
          const isReparsing = actionLoading === `reparse:${user.id}`;
          const displayName = user.dlName || user.phoneNumber;
          const subtitle = [user.dlAge && `${user.dlAge}`, user.dlHeight, user.city]
            .filter(Boolean)
            .join(" · ");
          return (
            <div
              key={user.id}
              className="bg-white rounded-xl border border-stone-200 p-4 flex flex-col"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">{displayName}</p>
                  <p className="text-[11px] text-stone-400 truncate">
                    {user.phoneNumber} · {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                  {subtitle && (
                    <p className="text-[11px] text-stone-500">{subtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleReparseProfile(user.id)}
                  disabled={isReparsing}
                  className="shrink-0 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 disabled:opacity-50"
                  title="re-parse badges"
                >
                  <RefreshCcw className={`h-3.5 w-3.5 ${isReparsing ? "animate-spin" : ""}`} />
                </button>
              </div>

              {badgeGroups.all.length > 0 && (
                <div className="mb-3 space-y-2 overflow-y-auto max-h-40">
                  {badgeGroups.about.length > 0 && (
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-stone-400 mb-1">about</p>
                      <ParsedBadgeRow badges={badgeGroups.about} />
                    </div>
                  )}
                  {badgeGroups.preference.length > 0 && (
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-stone-400 mb-1">preference</p>
                      <ParsedBadgeRow badges={badgeGroups.preference} />
                    </div>
                  )}
                </div>
              )}

              {(user.photoUrls.length > 0 || user.idPhotoUrl) && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {user.photoUrls.map((path, i) => (
                    <SecureImage
                      key={i}
                      path={path}
                      urlMap={urlMap}
                      fullUrlMap={fullUrlMap}
                      alt={`Photo ${i + 1}`}
                      className="h-20 w-auto object-contain rounded-lg border border-stone-200 bg-stone-50"
                      onExpand={(src, alt) => setModalImage({ src, alt })}
                    />
                  ))}
                  {user.idPhotoUrl && (
                    <SecureImage
                      path={user.idPhotoUrl}
                      urlMap={urlMap}
                      fullUrlMap={fullUrlMap}
                      alt="ID"
                      className="h-20 w-auto object-contain rounded-lg border border-amber-200 bg-amber-50"
                      onExpand={(src, alt) => setModalImage({ src, alt })}
                    />
                  )}
                </div>
              )}

              <div className="mt-auto flex gap-1.5 pt-2 border-t border-stone-100">
                <button
                  onClick={() => handleReview(user.id, "approve")}
                  disabled={actionLoading === user.id}
                  className="flex-1 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReview(user.id, "reject")}
                  disabled={actionLoading === user.id}
                  className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleUserAction(user.id, "delete")}
                  disabled={actionLoading === user.id}
                  className="py-1.5 px-2.5 rounded-lg bg-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-300 disabled:opacity-50 transition-colors"
                >
                  Del
                </button>
                <button
                  onClick={() => handleUserAction(user.id, "ban")}
                  disabled={actionLoading === user.id}
                  className="py-1.5 px-2.5 rounded-lg bg-stone-800 text-white text-xs font-medium hover:bg-stone-900 disabled:opacity-50 transition-colors"
                >
                  Ban
                </button>
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
    </div>
  );
}

function PairingTab({ apiKey }: { apiKey: string }) {
  const [approvedUsers, setApprovedUsers] = useState<TpoUser[]>([]);
  const [activeDates, setActiveDates] = useState<TpoDate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [endingDateId, setEndingDateId] = useState<string | null>(null);
  const [dateActionLoadingId, setDateActionLoadingId] = useState<string | null>(null);
  const [userActionLoadingId, setUserActionLoadingId] = useState<string | null>(null);
  const [badgeActionKey, setBadgeActionKey] = useState<string | null>(null);
  const [reparseLoadingId, setReparseLoadingId] = useState<string | null>(null);
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [fullUrlMap, setFullUrlMap] = useState<Record<string, string>>({});
  const [modalImage, setModalImage] = useState<{ src: string; alt: string } | null>(null);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
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
        ...allUsers.flatMap((u) => [...u.photoUrls, ...(u.idPhotoUrl ? [u.idPhotoUrl] : [])]),
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
      } else {
        setRefreshing(false);
      }
    }
  }, [apiKey]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const pairedUserIds = new Set(
    activeDates.flatMap((d) => [d.userA.id, d.userB.id])
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
    action: "resend_prompt" | "force_propose_slot" | "mark_agreed_open_portal" | "escalate_date"
  ) => {
    setDateActionLoadingId(`${dateId}:${action}`);
    try {
      let slot: string | undefined;
      let target: "A" | "B" | undefined;
      if (action === "force_propose_slot") {
        slot =
          window.prompt("enter slot text (e.g. friday at 7:30 pm)")?.trim() || undefined;
        if (!slot) return;
        target = window.confirm("send to user b? click cancel to send to user a.")
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
    nextValue: string
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

  if (initialLoading) {
    return <p className="text-stone-500">Loading...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-stone-900">
              Available Users ({availableUsers.length})
            </h2>
            {refreshing && <p className="text-xs text-stone-400">refreshing...</p>}
          </div>
          {selectedIds.length === 2 && (
            <button
              onClick={handlePair}
              disabled={pairingLoading}
              className="px-6 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {pairingLoading ? "Pairing..." : "Pair Selected"}
            </button>
          )}
        </div>

        {selectedIds.length > 0 && selectedIds.length < 2 && (
          <p className="text-sm text-stone-500 mb-4">
            Select one more user to pair
          </p>
        )}

        {availableUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
            <p className="text-stone-400">No available users to pair</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {availableUsers.map((user) => {
              const isSelected = selectedIds.includes(user.id);
              const structured = getStructuredProfile(user);
              const badgeGroups = makeBadgeGroups(user, structured);
              const displayName = user.dlName || user.phoneNumber;
              const isReparsing = reparseLoadingId === user.id;
              const subtitle = [user.dlAge && `${user.dlAge}`, user.dlHeight, user.city]
                .filter(Boolean)
                .join(" · ");
              return (
                <div
                  key={user.id}
                  className={`bg-white rounded-xl border-2 p-4 flex flex-col transition-all ${
                    isSelected
                      ? "border-stone-900 shadow-md ring-1 ring-stone-900"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">{displayName}</p>
                      <p className="text-[11px] text-stone-400 truncate">
                        {user.phoneNumber} · {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                      {subtitle && (
                        <p className="text-[11px] text-stone-500">{subtitle}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSelect(user.id)}
                      className={`shrink-0 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors ${
                        isSelected
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-300 text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      {isSelected ? "selected" : "select"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReparseProfile(user.id)}
                      disabled={isReparsing}
                      className="shrink-0 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 disabled:opacity-50"
                      title="re-parse badges from original answers"
                    >
                      <RefreshCcw className={`h-3.5 w-3.5 ${isReparsing ? "animate-spin" : ""}`} />
                    </button>
                  </div>

                  {badgeGroups.all.length > 0 && (
                    <div className="mb-3 space-y-2 overflow-y-auto max-h-40">
                      {badgeGroups.about.length > 0 && (
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-stone-400 mb-1">about</p>
                          <ParsedBadgeRow
                            badges={badgeGroups.about}
                            actionKey={badgeActionKey}
                            onEdit={(badge, nextValue) =>
                              handleEditBadge(user.id, badge, nextValue)
                            }
                            onDelete={(badge) => handleDeleteBadge(user.id, badge)}
                          />
                        </div>
                      )}
                      {badgeGroups.preference.length > 0 && (
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-stone-400 mb-1">preference</p>
                          <ParsedBadgeRow
                            badges={badgeGroups.preference}
                            actionKey={badgeActionKey}
                            onEdit={(badge, nextValue) =>
                              handleEditBadge(user.id, badge, nextValue)
                            }
                            onDelete={(badge) => handleDeleteBadge(user.id, badge)}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {(user.photoUrls.length > 0 || user.idPhotoUrl) && (
                    <div className="flex gap-2 flex-wrap mb-3">
                      {user.photoUrls.map((path, i) => (
                        <SecureImage
                          key={i}
                          path={path}
                          urlMap={urlMap}
                          fullUrlMap={fullUrlMap}
                          alt={`Photo ${i + 1}`}
                          className="h-20 w-auto object-contain rounded-lg border border-stone-200 bg-stone-50"
                          onExpand={(src, alt) => { setModalImage({ src, alt }); }}
                        />
                      ))}
                      {user.idPhotoUrl && (
                        <SecureImage
                          path={user.idPhotoUrl}
                          urlMap={urlMap}
                          fullUrlMap={fullUrlMap}
                          alt="ID"
                          className="h-20 w-auto object-contain rounded-lg border border-amber-200 bg-amber-50"
                          onExpand={(src, alt) => { setModalImage({ src, alt }); }}
                        />
                      )}
                    </div>
                  )}

                  <div className="mt-auto flex gap-1.5 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => handleUserAction(user.id, "delete")}
                      disabled={userActionLoadingId === user.id}
                      className="py-1.5 px-2.5 rounded-lg bg-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-300 disabled:opacity-50 transition-colors"
                    >
                      Del
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUserAction(user.id, "ban")}
                      disabled={userActionLoadingId === user.id}
                      className="py-1.5 px-2.5 rounded-lg bg-stone-800 text-white text-xs font-medium hover:bg-stone-900 disabled:opacity-50 transition-colors"
                    >
                      Ban
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeDates.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-900 mb-3">
            Active Dates ({activeDates.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeDates.map((date) => (
              <div
                key={date.id}
                className="bg-white rounded-xl border border-stone-200 p-4 flex flex-col"
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
                    <p className="text-sm font-semibold text-stone-900 truncate">
                      {getDisplayName(date.userA)} & {getDisplayName(date.userB)}
                    </p>
                    <p className="text-[11px] text-stone-400">
                      {date._count.messages} msgs · {new Date(date.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-stone-500 space-y-0.5 mb-3">
                  <p>
                    {date.portalEnabled
                      ? `portal open${date.agreedTime ? ` · ${date.agreedTime}` : ""}`
                      : `scheduling${date.proposedSlot ? ` · ${date.proposedSlot}` : ""}`}
                  </p>
                  <p>
                    {date.schedulingPhase.toLowerCase()} · {date.schedulingAttemptCount} attempts
                  </p>
                  {date.schedulingFailedReason && (
                    <p className="text-red-500">{date.schedulingFailedReason}</p>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap gap-1.5 pt-2 border-t border-stone-100">
                  <button
                    onClick={() => handleDateAction(date.id, "resend_prompt")}
                    disabled={dateActionLoadingId === `${date.id}:resend_prompt`}
                    className="py-1 px-2 rounded-md border border-stone-200 text-stone-600 text-[10px] font-medium hover:bg-stone-50 transition-colors"
                  >
                    resend
                  </button>
                  <button
                    onClick={() => handleDateAction(date.id, "force_propose_slot")}
                    disabled={dateActionLoadingId === `${date.id}:force_propose_slot`}
                    className="py-1 px-2 rounded-md border border-stone-200 text-stone-600 text-[10px] font-medium hover:bg-stone-50 transition-colors"
                  >
                    force slot
                  </button>
                  <button
                    onClick={() => handleDateAction(date.id, "mark_agreed_open_portal")}
                    disabled={dateActionLoadingId === `${date.id}:mark_agreed_open_portal`}
                    className="py-1 px-2 rounded-md border border-emerald-200 text-emerald-700 text-[10px] font-medium hover:bg-emerald-50 transition-colors"
                  >
                    agreed
                  </button>
                  <button
                    onClick={() => handleDateAction(date.id, "escalate_date")}
                    disabled={dateActionLoadingId === `${date.id}:escalate_date`}
                    className="py-1 px-2 rounded-md border border-amber-200 text-amber-700 text-[10px] font-medium hover:bg-amber-50 transition-colors"
                  >
                    escalate
                  </button>
                  <button
                    onClick={() => handleEndDate(date.id)}
                    disabled={endingDateId === date.id}
                    className="py-1 px-2 rounded-md border border-red-200 text-red-600 text-[10px] font-medium hover:bg-red-50 transition-colors"
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
    </div>
  );
}

function OnboardingTab({ apiKey }: { apiKey: string }) {
  const [users, setUsers] = useState<TpoUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = async (
    userId: string,
    action: "restart_onboarding" | "cancel_onboarding"
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

  if (loading) {
    return <p className="text-stone-500">Loading onboarding users...</p>;
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
        <p className="text-stone-400">No users currently onboarding</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {users.map((user) => (
        <div
          key={user.id}
          className="bg-white rounded-xl border border-stone-200 p-4 flex flex-col"
        >
          <div className="mb-2">
            <p className="text-sm font-semibold text-stone-900">{user.phoneNumber}</p>
            <p className="text-[11px] text-stone-400">
              Step: {user.onboardingStep} · {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="mt-auto flex gap-1.5 pt-2 border-t border-stone-100">
            <button
              onClick={() => handleAction(user.id, "restart_onboarding")}
              disabled={actionLoading === user.id + "restart_onboarding"}
              className="flex-1 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              Restart
            </button>
            <button
              onClick={() => handleAction(user.id, "cancel_onboarding")}
              disabled={actionLoading === user.id + "cancel_onboarding"}
              className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
