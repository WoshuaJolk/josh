ALTER TABLE "TpoUser"
  ADD COLUMN IF NOT EXISTS "structuredProfile" JSONB;
