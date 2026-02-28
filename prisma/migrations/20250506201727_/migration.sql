/*
  Warnings:

  - A unique constraint covering the columns `[phoneNumber]` on the table `MutualTestUser` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MutualTestUser_phoneNumber_key" ON "MutualTestUser"("phoneNumber");
