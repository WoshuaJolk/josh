import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { validateSurgeSignature } from "@/lib/surgeWebhook";
import { sendSms } from "@/lib/surgeSend";
import { handleSchedulingReplyCore } from "@/lib/tpoSchedulingEngine";
import { sanitizeBlockedWords, containsBlockedWords } from "@/lib/curseFilter";
import { extractDriversLicenseData } from "@/lib/dlExtract";
import {
  structureUserProfile,
} from "@/lib/profileStructuring";
import { evaluateOnboardingAnswer } from "@/lib/tpoAnswerQuality";
import { extractPhotoAiTags } from "@/lib/tpoPhotoTags";
import { getOnboardingAdlib } from "@/lib/tpoOnboardingAdlib";
import {
  getOnboardingQuestionByIndex,
  getOnboardingQuestionDefs,
  TPO_PHOTOS_TEXT,
  TPO_ID_TEXT,
  TPO_COMPLETE_TEXT,
  TPO_DEFAULT_REPLY,
  TPO_NO_ACTIVE_DATE,
} from "@/lib/tpoConstants";

const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const SUPABASE_UPLOAD_BUCKET =
  process.env.SUPABASE_UPLOAD_BUCKET?.trim() || "tpo-uploads";

interface SurgeAttachment {
  url?: string;
  type?: string;
  media_url?: string;
  file_url?: string;
  download_url?: string;
}

interface AttachmentDownloadResult {
  buffer: Buffer;
  contentType: string;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 70;
const ADLIB_ENABLED_QUESTION_IDS = new Set([
  "work_education",
  "roots_languages",
  "city",
]);

async function downloadAttachment(url: string): Promise<AttachmentDownloadResult> {
  const surgeApiKey = process.env.SURGE_API_KEY;

  const unauthRes = await fetch(url);
  if (unauthRes.ok) {
    return {
      buffer: Buffer.from(await unauthRes.arrayBuffer()),
      contentType: unauthRes.headers.get("content-type") ?? "application/octet-stream",
    };
  }

  if (!surgeApiKey) {
    throw new Error(
      `Failed to download attachment from ${url} (status ${unauthRes.status})`
    );
  }

  const authRes = await fetch(url, {
    headers: { Authorization: `Bearer ${surgeApiKey}` },
  });
  if (!authRes.ok) {
    throw new Error(
      `Failed to download attachment from ${url} (statuses: ${unauthRes.status}, ${authRes.status})`
    );
  }

  return {
    buffer: Buffer.from(await authRes.arrayBuffer()),
    contentType: authRes.headers.get("content-type") ?? "application/octet-stream",
  };
}

async function uploadAttachmentToSupabase(
  attachment: SurgeAttachment,
  folder: string,
  phoneNumber: string
): Promise<string> {
  const url =
    attachment.url ??
    attachment.media_url ??
    attachment.file_url ??
    attachment.download_url;
  if (!url) {
    throw new Error("Attachment missing URL");
  }

  const downloaded = await downloadAttachment(url);
  const rawBuffer = downloaded.buffer;
  const inboundContentType =
    attachment.type ??
    downloaded.contentType ??
    "application/octet-stream";

  let uploadBuffer = rawBuffer;
  let uploadContentType = inboundContentType;
  let extension = "bin";
  if (inboundContentType.includes("jpeg") || inboundContentType.includes("jpg")) {
    extension = "jpg";
  } else if (inboundContentType.includes("png")) {
    extension = "png";
  } else if (inboundContentType.includes("webp")) {
    extension = "webp";
  } else if (inboundContentType.includes("heic") || inboundContentType.includes("heif")) {
    extension = "heic";
  }

  try {
    uploadBuffer = await sharp(rawBuffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, progressive: true })
      .toBuffer();
    uploadContentType = "image/jpeg";
    extension = "jpg";
  } catch (compressionErr) {
    console.warn(
      "[tpo/webhook] Image compression failed, uploading original attachment:",
      compressionErr
    );
  }

  const fileName = `${folder}/${phoneNumber.replace("+", "")}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(SUPABASE_UPLOAD_BUCKET)
    .upload(fileName, uploadBuffer, { contentType: uploadContentType });

  if (error) {
    throw new Error(
      `Supabase upload failed (bucket=${SUPABASE_UPLOAD_BUCKET}): ${error.message}`
    );
  }

  return fileName;
}

function readPhotoAiTags(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const raw = (value as Record<string, unknown>).photoAiTags;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergePhotoAiTags(
  structuredProfile: unknown,
  tagsToAdd: string[]
): Prisma.InputJsonValue {
  const base =
    structuredProfile && typeof structuredProfile === "object"
      ? (structuredProfile as Record<string, unknown>)
      : {};
  const existingTags = readPhotoAiTags(base);
  const mergedTags = Array.from(new Set([...existingTags, ...tagsToAdd])).slice(
    0,
    60
  );
  return {
    ...base,
    photoAiTags: mergedTags,
  } as Prisma.InputJsonValue;
}

function withIdParseStatus(
  structuredProfile: Prisma.InputJsonValue,
  status: "failed" | "verified"
): Prisma.InputJsonValue {
  const base =
    structuredProfile && typeof structuredProfile === "object"
      ? (structuredProfile as Record<string, unknown>)
      : {};
  return {
    ...base,
    idParseStatus: status,
  } as Prisma.InputJsonValue;
}

async function handleOnboarding(
  user: {
    id: string;
    phoneNumber: string;
    onboardingStep: string;
    photoUrls: string[];
    aboutMe: string | null;
    preferences: string | null;
    city: string | null;
    dlName: string | null;
    dlAge: number | null;
    dlHeight: string | null;
    aboutFollowupAsked: boolean;
    preferencesFollowupAsked: boolean;
    onboardingQuestionIndex: number;
    aboutFollowupCount: number;
    preferencesFollowupCount: number;
    structuredProfile: Prisma.JsonValue | null;
  },
  messageBody: string | null,
  attachments: SurgeAttachment[]
) {
  const { onboardingStep, phoneNumber } = user;
  const appendAnswer = (
    existing: string | null,
    question: string,
    answer: string
  ): string =>
    [existing, `Q: ${question}\nA: ${answer.trim()}`].filter(Boolean).join("\n\n");
  const sendOnboardingQuestion = async (params: {
    nextQuestion: string;
    previousQuestion: string;
    previousQuestionId: string | null;
    answer: string;
  }) => {
    const { nextQuestion, previousQuestion, previousQuestionId, answer } = params;
    const answerWordCount = answer.trim().split(/\s+/).filter(Boolean).length;
    const shouldAttemptAdlib =
      answerWordCount >= 4 &&
      !!previousQuestionId &&
      ADLIB_ENABLED_QUESTION_IDS.has(previousQuestionId);
    const adlib = shouldAttemptAdlib
      ? await getOnboardingAdlib({
          previousQuestion,
          answer,
          nextQuestion,
        })
      : null;
    await sendSms(
      phoneNumber,
      adlib ? `${adlib} ${nextQuestion}` : nextQuestion,
      { skipProfanityFilter: true }
    );
  };

  switch (onboardingStep) {
    case "AWAITING_ABOUT": {
      const totalQuestions = getOnboardingQuestionDefs().length;
      const questionIndex = Math.max(0, user.onboardingQuestionIndex ?? 0);
      const currentQuestionDef =
        getOnboardingQuestionByIndex(questionIndex) ??
        getOnboardingQuestionByIndex(totalQuestions - 1);
      const currentQuestion =
        currentQuestionDef?.prompt ??
        getOnboardingQuestionByIndex(0)?.prompt ??
        "tell us about yourself.";

      if (!messageBody) {
        const fallbackPrompt =
          getOnboardingQuestionByIndex(0)?.prompt ?? "tell us about yourself.";
        await sendSms(
          phoneNumber,
          currentQuestion ?? fallbackPrompt,
          { skipProfanityFilter: true }
        );
        return;
      }

      const mergedAbout = appendAnswer(user.aboutMe, currentQuestion, messageBody);
      const cityFromAnswer =
        currentQuestionDef?.id === "city"
          ? messageBody.trim()
          : null;

      if (user.aboutFollowupAsked) {
        const nextIndex = questionIndex + 1;
        const nextQuestion = getOnboardingQuestionByIndex(nextIndex)?.prompt;
        if (nextQuestion) {
          await db.tpoUser.update({
            where: { id: user.id },
            data: {
              aboutMe: mergedAbout,
              city: cityFromAnswer ?? user.city,
              aboutFollowupAsked: false,
              onboardingQuestionIndex: nextIndex,
            },
          });
          await sendOnboardingQuestion({
            nextQuestion,
            previousQuestion: currentQuestion,
            previousQuestionId: currentQuestionDef?.id ?? null,
            answer: messageBody,
          });
          return;
        }

        await db.tpoUser.update({
          where: { id: user.id },
          data: {
            aboutMe: mergedAbout,
            preferences: mergedAbout,
              city: cityFromAnswer ?? user.city,
            aboutFollowupAsked: false,
            onboardingQuestionIndex: 0,
            aboutFollowupCount: 0,
            preferencesFollowupAsked: false,
            preferencesFollowupCount: 0,
              onboardingStep: "AWAITING_PHOTOS",
          },
        });
        await sendSms(phoneNumber, TPO_PHOTOS_TEXT, { skipProfanityFilter: true });
        return;
      }

      const quality = await evaluateOnboardingAnswer({
        question: currentQuestion,
        answer: messageBody.trim(),
      });

      if (!quality.isComprehensive && quality.followUpQuestion) {
        await db.tpoUser.update({
          where: { id: user.id },
          data: {
            aboutMe: mergedAbout,
            city: cityFromAnswer ?? user.city,
            aboutFollowupAsked: true,
          },
        });
        await sendSms(phoneNumber, quality.followUpQuestion, {
          skipProfanityFilter: true,
        });
        return;
      }

      const nextIndex = questionIndex + 1;
      const nextQuestion = getOnboardingQuestionByIndex(nextIndex)?.prompt;
      if (nextQuestion) {
        await db.tpoUser.update({
          where: { id: user.id },
          data: {
            aboutMe: mergedAbout,
            city: cityFromAnswer ?? user.city,
            aboutFollowupAsked: false,
            onboardingQuestionIndex: nextIndex,
          },
        });
        await sendOnboardingQuestion({
          nextQuestion,
          previousQuestion: currentQuestion,
          previousQuestionId: currentQuestionDef?.id ?? null,
          answer: messageBody,
        });
        return;
      }

      await db.tpoUser.update({
        where: { id: user.id },
        data: {
          aboutMe: mergedAbout,
          preferences: mergedAbout,
          city: cityFromAnswer ?? user.city,
          aboutFollowupAsked: false,
          onboardingQuestionIndex: 0,
          aboutFollowupCount: 0,
          preferencesFollowupAsked: false,
          preferencesFollowupCount: 0,
          onboardingStep: "AWAITING_PHOTOS",
        },
      });
      await sendSms(phoneNumber, TPO_PHOTOS_TEXT, { skipProfanityFilter: true });
      return;
    }

    case "AWAITING_PREFERENCES": {
      // compatibility: older users in this state are moved back to the single-list flow
      await db.tpoUser.update({
        where: { id: user.id },
        data: {
          onboardingStep: "AWAITING_ABOUT",
        },
      });
      await sendSms(
        phoneNumber,
        getOnboardingQuestionByIndex(user.onboardingQuestionIndex)?.prompt ??
          getOnboardingQuestionByIndex(0)?.prompt ??
          "tell us about yourself.",
        { skipProfanityFilter: true }
      );
      return;
    }

    case "AWAITING_CITY": {
      // compatibility: city is now part of single-list onboarding.
      if (!messageBody) {
        await sendSms(phoneNumber, "what city are you currently living in?", {
          skipProfanityFilter: true,
        });
        return;
      }
      await db.tpoUser.update({
        where: { id: user.id },
        data: {
          city: messageBody.trim(),
          onboardingStep: "AWAITING_PHOTOS",
        },
      });
      await sendSms(phoneNumber, TPO_PHOTOS_TEXT, { skipProfanityFilter: true });
      return;
    }

    case "AWAITING_PHOTOS": {
      if (attachments.length === 0) {
        await sendSms(
          phoneNumber,
          "please send photos as image attachments (at least 1 close-up and 1 full-body).",
          { skipProfanityFilter: true }
        );
        return;
      }

      const acceptedPhotoRefs: string[] = [];
      const newPhotoTags: string[] = [];
      for (const [index, attachment] of attachments.entries()) {
        const attachmentUrl =
          attachment.url ??
          attachment.media_url ??
          attachment.file_url ??
          attachment.download_url;
        if (!attachmentUrl) {
          const placeholderRef = `attachment_unresolved:${Date.now()}:${index}`;
          acceptedPhotoRefs.push(placeholderRef);
          console.error(
            "[tpo/webhook] Photo attachment had no URL; counting as received with placeholder ref"
          );
          continue;
        }
        try {
          const url = await uploadAttachmentToSupabase(
            attachment,
            "photos",
            phoneNumber
          );
          acceptedPhotoRefs.push(url);
          try {
            const imageRes = await fetch(attachmentUrl);
            if (imageRes.ok) {
              const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
              const imageBase64 = imageBuffer.toString("base64");
              const tags = await extractPhotoAiTags(imageBase64);
              newPhotoTags.push(...tags);
            }
          } catch (tagErr) {
            console.error("[tpo/webhook] Photo tag extraction error:", tagErr);
          }
        } catch (err) {
          console.error("[tpo/webhook] Photo upload error:", err);
          // Treat attachment receipt as success for flow progression.
          acceptedPhotoRefs.push(`attachment_fallback:${attachmentUrl}`);
        }
      }

      const mergedPhotoUrls = Array.from(
        new Set([...user.photoUrls, ...acceptedPhotoRefs])
      );
      if (acceptedPhotoRefs.length > 0) {
        await db.tpoUser.update({
          where: { id: user.id },
          data: {
            photoUrls: mergedPhotoUrls,
            structuredProfile: mergePhotoAiTags(user.structuredProfile, newPhotoTags),
          },
        });
      }

      const totalPhotos = mergedPhotoUrls.length;
      if (totalPhotos >= 2) {
        await db.tpoUser.update({
          where: { id: user.id },
          data: { onboardingStep: "AWAITING_ID" },
        });
        try {
          await sendSms(
            phoneNumber,
            `got it, ${totalPhotos} photo${totalPhotos > 1 ? "s" : ""} saved!\n\n${TPO_ID_TEXT}`,
            { skipProfanityFilter: true }
          );
        } catch (err) {
          // Do not block onboarding progression if downstream SMS delivery is flaky.
          console.error("[tpo/webhook] Failed to send post-photo prompt:", err);
        }
      } else {
        const remaining = 2 - totalPhotos;
        await sendSms(
          phoneNumber,
          `got it! send ${remaining} more photo${remaining > 1 ? "s" : ""} - need at least 1 close-up and 1 full-body.`,
          { skipProfanityFilter: true }
        );
      }
      return;
    }

    case "AWAITING_ID": {
      if (attachments.length === 0) {
        await sendSms(
          phoneNumber,
          "please send a photo of your driver's license so we can verify your identity.",
          { skipProfanityFilter: true }
        );
        return;
      }

      try {
        const idAttachment = attachments[0];
        const idAttachmentSource =
          idAttachment?.url
            ? "url"
            : idAttachment?.media_url
              ? "media_url"
              : idAttachment?.file_url
                ? "file_url"
                : idAttachment?.download_url
                  ? "download_url"
                  : "none";
        const idAttachmentUrl =
          idAttachment?.url ??
          idAttachment?.media_url ??
          idAttachment?.file_url ??
          idAttachment?.download_url;
        console.log("[tpo/webhook] ID attachment source:", idAttachmentSource);
        if (!idAttachmentUrl) {
          await sendSms(
            phoneNumber,
            "i couldn't read that attachment. please resend a clear photo of your driver's license.",
            { skipProfanityFilter: true }
          );
          return;
        }

        let idUrl = idAttachmentUrl;
        try {
          idUrl = await uploadAttachmentToSupabase(
            idAttachment,
            "ids",
            phoneNumber
          );
        } catch (uploadErr) {
          // Keep onboarding unblocked if storage upload fails; admin signed-url
          // endpoint can render absolute URLs directly.
          console.error(
            "[tpo/webhook] ID upload to Supabase failed; falling back to source URL:",
            uploadErr
          );
          console.log(
            "[tpo/webhook] ID fallback active; storing source URL from:",
            idAttachmentSource
          );
        }

        let dlImageBase64: string | null = null;
        try {
          const dlImage = await downloadAttachment(idAttachmentUrl);
          dlImageBase64 = dlImage.buffer.toString("base64");
        } catch (imageErr) {
          console.error("[tpo/webhook] ID image fetch error (non-blocking):", imageErr);
        }

        let dlData = {
          name: null as string | null,
          age: null as number | null,
          height: null as string | null,
          dateOfBirth: null as string | null,
        };
        if (dlImageBase64) {
          const extracted = await withTimeout(
            extractDriversLicenseData(dlImageBase64),
            20000
          );
          if (extracted) {
            dlData = extracted;
            console.log("[tpo/webhook] DL extraction result:", dlData);
          } else {
            console.warn("[tpo/webhook] DL extraction timed out/skipped (non-blocking)");
          }
        }

        let structuredProfile: Prisma.InputJsonValue = mergePhotoAiTags(
          user.structuredProfile,
          readPhotoAiTags(user.structuredProfile)
        );
        const maybeStructured = await withTimeout(
          structureUserProfile({
            aboutMe: user.aboutMe,
            preferences: user.preferences,
            city: user.city,
            dlName: dlData.name,
            dlAge: dlData.age,
            dlHeight: dlData.height,
          }),
          20000
        );
        if (maybeStructured) {
          structuredProfile = mergePhotoAiTags(
            maybeStructured,
            readPhotoAiTags(user.structuredProfile)
          );
        } else {
          console.warn("[tpo/webhook] profile structuring timed out/skipped");
        }

        const hasUsefulDlData =
          Boolean(dlData.name?.trim()) ||
          dlData.age !== null ||
          Boolean(dlData.height?.trim());

        if (!hasUsefulDlData) {
          const mergedPhotoUrls = Array.from(new Set([...user.photoUrls, idUrl]));
          const structuredWithFailedId = withIdParseStatus(structuredProfile, "failed");
          await db.tpoUser.update({
            where: { id: user.id },
            data: {
              photoUrls: mergedPhotoUrls,
              structuredProfile: structuredWithFailedId,
              onboardingStep: "AWAITING_ID",
            },
          });
          await sendSms(
            phoneNumber,
            "got another photo - still need a clear photo of your driver's license to verify your identity.",
            { skipProfanityFilter: true }
          );
          return;
        }

        await db.tpoUser.update({
          where: { id: user.id },
          data: {
            idPhotoUrl: idUrl,
            dlName: dlData.name,
            dlAge: dlData.age,
            dlHeight: dlData.height,
            structuredProfile: withIdParseStatus(structuredProfile, "verified"),
            onboardingStep: "COMPLETE",
            status: "PENDING_REVIEW",
          },
        });
        await sendSms(phoneNumber, TPO_COMPLETE_TEXT, { skipProfanityFilter: true });
      } catch (err) {
        console.error("[tpo/webhook] ID upload error:", err);
        await sendSms(
          phoneNumber,
          "we had trouble receiving your driver's license. please try sending it again.",
          { skipProfanityFilter: true }
        );
      }
      return;
    }

    default:
      return;
  }
}

async function handleMessageRelay(
  senderPhone: string,
  messageBody: string | null
) {
  if (!messageBody) return;

  const activeDate = await db.tpoDate.findFirst({
    where: {
      status: "ACTIVE",
      portalEnabled: true,
      OR: [
        { userA: { phoneNumber: senderPhone } },
        { userB: { phoneNumber: senderPhone } },
      ],
    },
    include: { userA: true, userB: true },
  });

  if (!activeDate) {
    await sendSms(senderPhone, TPO_NO_ACTIVE_DATE, { skipProfanityFilter: true });
    return;
  }

  const recipientPhone =
    activeDate.userA.phoneNumber === senderPhone
      ? activeDate.userB.phoneNumber
      : activeDate.userA.phoneNumber;

  const blocked = containsBlockedWords(messageBody);
  const sanitizedBody = sanitizeBlockedWords(messageBody);

  await db.tpoMessage.create({
    data: {
      dateId: activeDate.id,
      fromPhone: senderPhone,
      toPhone: recipientPhone,
      body: messageBody,
      blocked,
    },
  });

  await sendSms(recipientPhone, sanitizedBody, { skipProfanityFilter: true });
}


export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const signatureHeader = req.headers.get("surge-signature");
    const skipValidation = process.env.SURGE_SKIP_WEBHOOK_VALIDATION === "true";
    console.log("[tpo/webhook] Hit! Signature present:", !!signatureHeader, "Skip:", skipValidation);

    if (!skipValidation && !validateSurgeSignature(signatureHeader, rawBody)) {
      console.log("[tpo/webhook] Signature validation FAILED");
      return NextResponse.json(
        { message: "Invalid signature" },
        { status: 401 }
      );
    }

    console.log("[tpo/webhook] Proceeding with payload");

    const payload = JSON.parse(rawBody);
    console.log("[tpo/webhook] Full payload:", JSON.stringify(payload, null, 2));

    if (payload.type !== "message.received") {
      return NextResponse.json({ ok: true });
    }

    const msg = payload.data;
    const senderPhone: string = msg.conversation?.contact?.phone_number;
    const messageBody: string | null = msg.body ?? null;
    const attachments: SurgeAttachment[] = msg.attachments || [];

    const user = await db.tpoUser.findUnique({
      where: { phoneNumber: senderPhone },
    });

    if (!user) {
      await sendSms(senderPhone, TPO_DEFAULT_REPLY, { skipProfanityFilter: true });
      return NextResponse.json({ ok: true });
    }

    if (user.status === "ONBOARDING") {
      await handleOnboarding(user, messageBody, attachments);
      return NextResponse.json({ ok: true });
    }

    if (user.status === "APPROVED") {
      const handled = await handleSchedulingReplyCore({
        senderPhone,
        messageBody,
        deliverMessage: async (toPhone, message) => {
          await sendSms(toPhone, message, { skipProfanityFilter: true });
        },
      });
      if (!handled) {
        await handleMessageRelay(senderPhone, messageBody);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[tpo/webhook] Error:", error);
    return NextResponse.json(
      { message: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
