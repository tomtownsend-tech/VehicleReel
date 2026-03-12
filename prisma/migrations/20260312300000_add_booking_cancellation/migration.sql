-- Add cancellation fields to bookings
ALTER TABLE "bookings" ADD COLUMN "cancellationReason" TEXT;
ALTER TABLE "bookings" ADD COLUMN "cancellationFeePct" INTEGER;
ALTER TABLE "bookings" ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Add BOOKING_CANCELLED to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_CANCELLED';
