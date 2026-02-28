-- Add city to user profile
ALTER TABLE "TpoUser" ADD COLUMN IF NOT EXISTS "city" TEXT;

-- Add onboarding step for city collection
ALTER TYPE "TpoOnboardingStep" ADD VALUE IF NOT EXISTS 'AWAITING_CITY';

-- Add scheduling and portal-gating fields to dates
ALTER TABLE "TpoDate"
  ADD COLUMN IF NOT EXISTS "portalEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "proposedSlot" TEXT,
  ADD COLUMN IF NOT EXISTS "userAAvailable" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "userBAvailable" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "agreedTime" TEXT,
  ADD COLUMN IF NOT EXISTS "suggestedPlace" TEXT;
