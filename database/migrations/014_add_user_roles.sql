-- Migration: Add user roles for superadmin access
-- Description: Add role field to users table to distinguish admin from regular users

-- Add role field (default 'user')
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Set your email as admin (update this with your actual email)
UPDATE public.users
SET role = 'admin'
WHERE email = 'shotbymikebeck@gmail.com';

-- Add comment
COMMENT ON COLUMN public.users.role IS 'User role: user (default) or admin (superadmin access)';


