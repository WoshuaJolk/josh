-- Enable RLS on all TPO tables (blocks access via Supabase REST API / PostgREST).
-- Prisma uses the postgres superuser role via DIRECT_URL, which bypasses RLS,
-- so server-side code continues to work normally.

ALTER TABLE "TpoUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TpoDate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TpoMessage" ENABLE ROW LEVEL SECURITY;

-- Deny all access via anon and authenticated roles (Supabase REST API).
-- No SELECT, INSERT, UPDATE, or DELETE policies = deny by default.

-- Also lock down existing tables that hold user data.
ALTER TABLE "MutualLike" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MutualTestUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BannedUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote" ENABLE ROW LEVEL SECURITY;

-- Storage bucket policies for tpo-uploads.
-- Deny all public access; only service_role can read/write.

-- Remove any existing permissive policies on tpo-uploads (safety).
DO $$
BEGIN
  -- Drop policies if they exist (ignore errors if they don't).
  BEGIN
    DROP POLICY IF EXISTS "Allow public select" ON storage.objects;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;

-- Create explicit deny-all for anon/authenticated on tpo-uploads bucket.
-- Since RLS is already enabled on storage.objects by Supabase by default,
-- and we create no permissive policies, access is denied.
-- But let's be explicit with a restrictive barrier policy.

CREATE POLICY "tpo_uploads_deny_anon_select"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id != 'tpo-uploads');

CREATE POLICY "tpo_uploads_deny_anon_insert"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id != 'tpo-uploads');

CREATE POLICY "tpo_uploads_deny_authenticated_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id != 'tpo-uploads');

CREATE POLICY "tpo_uploads_deny_authenticated_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id != 'tpo-uploads');
