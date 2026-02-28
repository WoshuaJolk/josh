-- CreateTable
CREATE TABLE "MutualTestUser" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phoneNumber" TEXT NOT NULL,

    CONSTRAINT "MutualTestUser_pkey" PRIMARY KEY ("id")
);
