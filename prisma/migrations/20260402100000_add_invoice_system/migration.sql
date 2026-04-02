-- Add InvoiceStatus enum
CREATE TYPE "InvoiceStatus" AS ENUM ('SENT', 'OVERDUE', 'PAID', 'CANCELLED');

-- Add invoice notification types
ALTER TYPE "NotificationType" ADD VALUE 'INVOICE_SENT';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_REMINDER';

-- Create invoices table
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "productionUserId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "platformFeeCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "ownerPayoutCents" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'SENT',
    "pdfUrl" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "lastReminderAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE UNIQUE INDEX "invoices_bookingId_key" ON "invoices"("bookingId");

-- Indexes
CREATE INDEX "invoices_status_sentAt_idx" ON "invoices"("status", "sentAt");
CREATE INDEX "invoices_productionUserId_idx" ON "invoices"("productionUserId");

-- Foreign keys
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_productionUserId_fkey" FOREIGN KEY ("productionUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enable RLS (no policies needed — app uses service role)
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
