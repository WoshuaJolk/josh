/*
  Warnings:

  - Added the required column `fromName` to the `MutualLike` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toName` to the `MutualLike` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MutualLike" ADD COLUMN     "fromName" TEXT NOT NULL,
ADD COLUMN     "toName" TEXT NOT NULL;
