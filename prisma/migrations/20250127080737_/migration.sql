-- CreateTable
CREATE TABLE "PhotoTransform" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photoId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "scale" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PhotoTransform_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhotoTransform_photoId_key" ON "PhotoTransform"("photoId");

-- AddForeignKey
ALTER TABLE "PhotoTransform" ADD CONSTRAINT "PhotoTransform_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
