-- CreateTable
CREATE TABLE "Shot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "person" "Person" NOT NULL,
    "name" TEXT NOT NULL,
    "socialHandle" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "pickupLine" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,

    CONSTRAINT "Shot_pkey" PRIMARY KEY ("id")
);
