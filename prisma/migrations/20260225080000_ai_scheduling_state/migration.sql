-- onboarding index to avoid question-text coupling
ALTER TABLE "TpoUser"
ADD COLUMN "onboardingQuestionIndex" INTEGER NOT NULL DEFAULT 0;

-- explicit scheduling state machine fields
CREATE TYPE "TpoSchedulingPhase" AS ENUM (
  'PROPOSING_TO_A',
  'WAITING_FOR_A_REPLY',
  'PROPOSING_TO_B',
  'WAITING_FOR_B_REPLY',
  'WAITING_FOR_A_ALTERNATIVE',
  'WAITING_FOR_B_ALTERNATIVE',
  'AGREED',
  'FAILED',
  'ESCALATED'
);

ALTER TABLE "TpoDate"
ADD COLUMN "schedulingPhase" "TpoSchedulingPhase" NOT NULL DEFAULT 'PROPOSING_TO_A',
ADD COLUMN "schedulingAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastSchedulingMessageAt" TIMESTAMP(3),
ADD COLUMN "schedulingEscalatedAt" TIMESTAMP(3),
ADD COLUMN "schedulingFailedReason" TEXT;
