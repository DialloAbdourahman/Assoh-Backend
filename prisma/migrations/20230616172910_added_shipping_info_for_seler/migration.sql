-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "shippingCountries" TEXT[],
ADD COLUMN     "shippingRegionsAndPrices" JSONB[];
