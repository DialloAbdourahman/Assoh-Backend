/*
  Warnings:

  - Added the required column `creator` to the `Seller` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "creator" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Seller" ADD CONSTRAINT "Seller_creator_fkey" FOREIGN KEY ("creator") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
