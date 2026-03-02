-- AlterTable
ALTER TABLE "options" ADD COLUMN "usageTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "precisionDriverRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "usageDescription" TEXT;
