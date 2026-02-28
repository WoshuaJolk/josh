/*
  Warnings:

  - You are about to drop the column `selectedPhotoId` on the `Vote` table. All the data in the column will be lost.
  - Added the required column `winnerSide` to the `Vote` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Side" AS ENUM ('LEFT', 'RIGHT');

-- AlterTable
ALTER TABLE "Vote" DROP COLUMN "selectedPhotoId",
ADD COLUMN     "winnerSide" "Side" NOT NULL;
