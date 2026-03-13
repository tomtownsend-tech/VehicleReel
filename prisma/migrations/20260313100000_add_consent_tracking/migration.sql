-- Add T&C and POPIA consent tracking to users
ALTER TABLE "users" ADD COLUMN "tcVersion" TEXT;
ALTER TABLE "users" ADD COLUMN "tcConsentAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "popiaConsentAt" TIMESTAMP(3);
