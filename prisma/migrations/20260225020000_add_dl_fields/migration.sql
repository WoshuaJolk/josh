-- Add driver's license extracted fields to TpoUser
ALTER TABLE "TpoUser" ADD COLUMN "dlName" TEXT;
ALTER TABLE "TpoUser" ADD COLUMN "dlAge" INTEGER;
ALTER TABLE "TpoUser" ADD COLUMN "dlHeight" TEXT;
