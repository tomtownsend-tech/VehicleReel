-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'INSURANCE';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'INSURANCE_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'INSURANCE_OVERDUE';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "bookingId" TEXT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "documents_bookingId_idx" ON "documents"("bookingId");
