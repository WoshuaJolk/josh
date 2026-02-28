-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "personId" TEXT NOT NULL,
    "leftPhotoId" TEXT NOT NULL,
    "rightPhotoId" TEXT NOT NULL,
    "timeTaken" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);
