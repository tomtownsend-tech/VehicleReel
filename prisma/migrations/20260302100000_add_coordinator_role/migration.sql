-- Add COORDINATOR to UserRole enum
ALTER TYPE "UserRole" ADD VALUE 'COORDINATOR';

-- Add PAYMENT_READY to BookingStatus enum
ALTER TYPE "BookingStatus" ADD VALUE 'PAYMENT_READY';

-- Add new notification types
ALTER TYPE "NotificationType" ADD VALUE 'COORDINATOR_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_PAYMENT_READY';

-- Create MessageThread enum
CREATE TYPE "MessageThread" AS ENUM ('PRODUCTION_COORDINATOR', 'OWNER_COORDINATOR');

-- Add coordinator fields to bookings
ALTER TABLE "bookings" ADD COLUMN "coordinatorId" TEXT;
ALTER TABLE "bookings" ADD COLUMN "locationAddress" TEXT;
ALTER TABLE "bookings" ADD COLUMN "locationPin" TEXT;
ALTER TABLE "bookings" ADD COLUMN "specialInstructions" TEXT;

-- Add foreign key for coordinator
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for coordinator lookups
CREATE INDEX "bookings_coordinatorId_idx" ON "bookings"("coordinatorId");

-- Add thread column to messages
ALTER TABLE "messages" ADD COLUMN "thread" "MessageThread";

-- Replace old index with new compound index including thread
DROP INDEX "messages_bookingId_createdAt_idx";
CREATE INDEX "messages_bookingId_thread_createdAt_idx" ON "messages"("bookingId", "thread", "createdAt");

-- Create BookingDailyDetail table
CREATE TABLE "booking_daily_details" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "callTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_daily_details_pkey" PRIMARY KEY ("id")
);

-- Create BookingCheckIn table
CREATE TABLE "booking_check_ins" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInBy" TEXT NOT NULL,

    CONSTRAINT "booking_check_ins_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints
CREATE UNIQUE INDEX "booking_daily_details_bookingId_date_key" ON "booking_daily_details"("bookingId", "date");
CREATE UNIQUE INDEX "booking_check_ins_bookingId_date_key" ON "booking_check_ins"("bookingId", "date");

-- Add foreign keys
ALTER TABLE "booking_daily_details" ADD CONSTRAINT "booking_daily_details_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_check_ins" ADD CONSTRAINT "booking_check_ins_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_check_ins" ADD CONSTRAINT "booking_check_ins_checkedInBy_fkey" FOREIGN KEY ("checkedInBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
