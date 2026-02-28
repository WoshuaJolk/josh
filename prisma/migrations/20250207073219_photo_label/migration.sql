-- CreateTable
CREATE TABLE "PhotoLabel" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photoId" TEXT NOT NULL,
    "labels" JSONB NOT NULL,

    CONSTRAINT "PhotoLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhotoLabel_photoId_key" ON "PhotoLabel"("photoId");

-- AddForeignKey
ALTER TABLE "PhotoLabel" ADD CONSTRAINT "PhotoLabel_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
