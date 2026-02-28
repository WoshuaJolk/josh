-- CreateTable
CREATE TABLE "MutualLike" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,

    CONSTRAINT "MutualLike_pkey" PRIMARY KEY ("id")
);
