-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_leftPhotoId_fkey" FOREIGN KEY ("leftPhotoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_rightPhotoId_fkey" FOREIGN KEY ("rightPhotoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
