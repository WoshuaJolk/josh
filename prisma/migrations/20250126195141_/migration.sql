/*
  Warnings:

  - A unique constraint covering the columns `[ipAddress]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "User_ipAddress_key" ON "User"("ipAddress");
