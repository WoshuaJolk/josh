/*
  Warnings:

  - You are about to drop the column `personId` on the `Photo` table. All the data in the column will be lost.
  - You are about to drop the column `personId` on the `Vote` table. All the data in the column will be lost.
  - Added the required column `person` to the `Photo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `person` to the `Vote` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Person" AS ENUM ('JOSH', 'JONATHAN');

-- AlterTable
ALTER TABLE "Photo" DROP COLUMN "personId",
ADD COLUMN     "person" "Person" NOT NULL;

-- AlterTable
ALTER TABLE "Vote" DROP COLUMN "personId",
ADD COLUMN     "person" "Person" NOT NULL;
