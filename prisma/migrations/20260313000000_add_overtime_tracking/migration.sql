-- Add shoot day hours to projects (10 or 12)
ALTER TABLE "projects" ADD COLUMN "shootDayHours" INTEGER NOT NULL DEFAULT 10;

-- Add actual hours tracking to booking daily details
ALTER TABLE "booking_daily_details" ADD COLUMN "actualHours" DECIMAL(4,1);
