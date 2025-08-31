import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Clear authentication cookies/session
    const response = NextResponse.json({ success: true });
    
    // Clear all auth-related cookies
    response.cookies.delete('userId');
    response.cookies.delete('oidc_state');
    response.cookies.delete('auth_token');
    
    return response;
  } catch (error) {
    console.error('Logout failed:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}

// Add GET method for direct logout redirect
export async function GET(request: NextRequest) {
  try {
    const redirectUrl = new URL('/en/public', request.url);
    const response = NextResponse.redirect(redirectUrl);
    
    // Clear all auth-related cookies
    response.cookies.delete('userId');
    response.cookies.delete('oidc_state');
    response.cookies.delete('auth_token');
    
    return response;
  } catch (error) {
    console.error('Logout redirect failed:', error);
    return NextResponse.redirect(`${request.nextUrl.origin}/en/public`);
  }
}