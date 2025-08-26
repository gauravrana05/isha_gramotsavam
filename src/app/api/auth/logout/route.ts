import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Clear authentication cookies/session
    const response = NextResponse.json({ success: true });
    
    // Clear any auth-related cookies
    response.cookies.delete('oidc_state');
    response.cookies.delete('auth_token'); // If using JWT cookies
    
    return response;
  } catch (error) {
    console.error('Logout failed:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}