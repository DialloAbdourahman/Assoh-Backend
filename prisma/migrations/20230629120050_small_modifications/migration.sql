/*
  Warnings:

  - Made the column `comment` on table `ProductReview` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ProductReview" ALTER COLUMN "comment" SET NOT NULL;

-- AlterTable
ALTER TABLE "sellerReport" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
