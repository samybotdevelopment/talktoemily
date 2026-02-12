import { NextResponse } from 'next/server';

/**
 * Development endpoint to clear all browser storage and sessions
 * Usage: GET /api/dev/clear-session
 */
export async function GET() {
  const response = NextResponse.json({ success: true, message: 'Session cleared' });

  // Clear all possible auth-related cookies
  const cookiesToClear = [
    'sb-access-token',
    'sb-refresh-token',
    'sb-gfppotrwghrawzpezsoc-auth-token',
    'sb-auth-token',
    'auth-token',
    'session',
    'next-auth.session-token',
  ];

  for (const cookie of cookiesToClear) {
    response.cookies.delete(cookie);
  }

  return response;
}
