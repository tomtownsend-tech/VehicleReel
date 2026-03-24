-- Enable RLS on tables added after the initial RLS migration.
-- These tables are only accessed via Prisma (direct DB connection),
-- so enabling RLS with no policies blocks all PostgREST/anon-key access.

ALTER TABLE public.deletion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
