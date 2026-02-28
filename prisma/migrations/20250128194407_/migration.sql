-- CreateTable
CREATE TABLE "BannedUser" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL DEFAULT '',
    "ipAddress" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "BannedUser_pkey" PRIMARY KEY ("id")
);
