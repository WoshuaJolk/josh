/*
  Warnings:

  - You are about to drop the column `ipAddress` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_ipAddress_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "ipAddress";
