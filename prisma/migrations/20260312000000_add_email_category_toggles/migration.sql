-- AlterTable
ALTER TABLE "users" ADD COLUMN "emailOptionsBookings" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "emailDocuments" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "emailMessages" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "emailShootLogistics" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "emailListings" BOOLEAN NOT NULL DEFAULT true;
