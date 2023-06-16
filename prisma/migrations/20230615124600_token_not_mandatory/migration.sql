-- AlterTable
ALTER TABLE "Admin" ALTER COLUMN "token" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "token" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Seller" ALTER COLUMN "token" DROP NOT NULL;
