-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN "registrationNumber" TEXT;

-- CreateIndex
CREATE INDEX "vehicles_registrationNumber_idx" ON "vehicles"("registrationNumber");

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'DUPLICATE_VEHICLE';
