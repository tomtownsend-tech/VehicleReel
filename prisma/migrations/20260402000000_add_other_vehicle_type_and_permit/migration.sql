-- Add OTHER to VehicleType enum
ALTER TYPE "VehicleType" ADD VALUE 'OTHER';

-- Add VEHICLE_PERMIT to DocumentType enum
ALTER TYPE "DocumentType" ADD VALUE 'VEHICLE_PERMIT';

-- Add customType field to vehicles table
ALTER TABLE "vehicles" ADD COLUMN "customType" TEXT;
