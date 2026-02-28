-- CreateEnum
CREATE TYPE "TpoUserStatus" AS ENUM ('ONBOARDING', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TpoOnboardingStep" AS ENUM ('INTRO_SENT', 'AWAITING_ABOUT', 'AWAITING_PREFERENCES', 'AWAITING_PHOTOS', 'AWAITING_ID', 'COMPLETE');

-- CreateEnum
CREATE TYPE "TpoDateStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateTable
CREATE TABLE "TpoUser" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "status" "TpoUserStatus" NOT NULL DEFAULT 'ONBOARDING',
    "onboardingStep" "TpoOnboardingStep" NOT NULL DEFAULT 'INTRO_SENT',
    "aboutMe" TEXT,
    "preferences" TEXT,
    "photoUrls" TEXT[],
    "idPhotoUrl" TEXT,

    CONSTRAINT "TpoUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TpoDate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TpoDateStatus" NOT NULL DEFAULT 'ACTIVE',
    "endedAt" TIMESTAMP(3),
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,

    CONSTRAINT "TpoDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TpoMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateId" TEXT NOT NULL,
    "fromPhone" TEXT NOT NULL,
    "toPhone" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "blocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TpoMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TpoUser_phoneNumber_key" ON "TpoUser"("phoneNumber");

-- AddForeignKey
ALTER TABLE "TpoDate" ADD CONSTRAINT "TpoDate_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "TpoUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TpoDate" ADD CONSTRAINT "TpoDate_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "TpoUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TpoMessage" ADD CONSTRAINT "TpoMessage_dateId_fkey" FOREIGN KEY ("dateId") REFERENCES "TpoDate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
