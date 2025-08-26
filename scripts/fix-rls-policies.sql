-- ================================================================
-- Fix Row Level Security Policies for user_profile_images table
-- ================================================================

-- Disable RLS temporarily for development (option 1)
ALTER TABLE user_profile_images DISABLE ROW LEVEL SECURITY;

-- Alternative: Enable proper RLS policies (option 2 - comment out the above if using this)
-- ALTER TABLE user_profile_images ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for anonymous users (development only)
-- DROP POLICY IF EXISTS "Allow all operations for development" ON user_profile_images;
-- CREATE POLICY "Allow all operations for development" ON user_profile_images
--   FOR ALL USING (true) WITH CHECK (true);

-- Production-ready policies (use these instead of above for production):
-- DROP POLICY IF EXISTS "Users can manage their own profile images" ON user_profile_images;
-- CREATE POLICY "Users can manage their own profile images" ON user_profile_images
--   FOR ALL USING (auth.uid()::text = user_id::text) 
--   WITH CHECK (auth.uid()::text = user_id::text);

-- Grant necessary permissions
GRANT ALL ON user_profile_images TO postgres;
GRANT ALL ON user_profile_images TO anon;
GRANT ALL ON user_profile_images TO authenticated;

-- Also fix for other related tables that might have RLS issues
ALTER TABLE media DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

GRANT ALL ON media TO postgres;
GRANT ALL ON media TO anon;
GRANT ALL ON media TO authenticated;

GRANT ALL ON team_photos TO postgres;
GRANT ALL ON team_photos TO anon;
GRANT ALL ON team_photos TO authenticated;

GRANT ALL ON users TO postgres;
GRANT ALL ON users TO anon;
GRANT ALL ON users TO authenticated;