import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = (await createClient()) as any;

  // Sign out the user
  await supabase.auth.signOut();

  // Clear all cookies and redirect to login
  const response = NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'), {
    status: 302,
  });

  // Clear Supabase auth cookies
  response.cookies.delete('sb-access-token');
  response.cookies.delete('sb-refresh-token');
  response.cookies.delete('sb-gfppotrwghrawzpezsoc-auth-token');

  return response;
}
