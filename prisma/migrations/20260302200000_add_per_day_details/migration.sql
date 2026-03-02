-- Add per-day location and notes fields to booking_daily_details
ALTER TABLE "booking_daily_details" ADD COLUMN "locationAddress" TEXT;
ALTER TABLE "booking_daily_details" ADD COLUMN "locationPin" TEXT;
ALTER TABLE "booking_daily_details" ADD COLUMN "notes" TEXT;
