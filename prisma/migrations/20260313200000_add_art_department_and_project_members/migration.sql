-- Add ART_DEPARTMENT to UserRole enum
ALTER TYPE "UserRole" ADD VALUE 'ART_DEPARTMENT';

-- Add ProjectMemberRole enum
CREATE TYPE "ProjectMemberRole" AS ENUM ('COORDINATOR', 'ART_DIRECTOR');

-- Create project_members table
CREATE TABLE "project_members" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectMemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("projectId","userId")
);

-- Create indexes
CREATE INDEX "project_members_userId_idx" ON "project_members"("userId");

-- Add foreign keys
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing coordinator assignments from bookings to project_members
-- For each booking with a coordinatorId, find the project via option -> project_options -> project
-- and create a project_member entry (deduplicated)
INSERT INTO "project_members" ("projectId", "userId", "role")
SELECT DISTINCT po."projectId", b."coordinatorId", 'COORDINATOR'::"ProjectMemberRole"
FROM "bookings" b
JOIN "project_options" po ON po."optionId" = b."optionId"
WHERE b."coordinatorId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop the coordinatorId column and its index from bookings
DROP INDEX IF EXISTS "bookings_coordinatorId_idx";
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "coordinatorId";
