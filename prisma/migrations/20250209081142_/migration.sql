/*
  Warnings:

  - A unique constraint covering the columns `[photoId,userId]` on the table `Ick` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Ick_photoId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Ick_photoId_userId_key" ON "Ick"("photoId", "userId");
