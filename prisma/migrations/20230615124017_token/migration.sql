/*
  Warnings:

  - You are about to drop the column `tokens` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `tokens` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `tokens` on the `Seller` table. All the data in the column will be lost.
  - Added the required column `token` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token` to the `Seller` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Admin" DROP COLUMN "tokens",
ADD COLUMN     "token" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "tokens",
ADD COLUMN     "token" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Seller" DROP COLUMN "tokens",
ADD COLUMN     "token" TEXT NOT NULL;
