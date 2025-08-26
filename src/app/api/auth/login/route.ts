import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Generate state parameter for CSRF protection
    const state = crypto.randomUUID();
    
    // Build authorization URL
    const authUrl = new URL(`${process.env.ISHA_OIDC_ISSUER}/oidc/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', process.env.ISHA_OIDC_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', process.env.ISHA_OIDC_REDIRECT_URI!);
    authUrl.searchParams.set('scope', 'openid profile email phone address');
    authUrl.searchParams.set('state', state);

    // Store state in session/cookie for verification (optional)
    const response = NextResponse.json({ authUrl: authUrl.toString() });
    response.cookies.set('oidc_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error('Failed to initiate OIDC login:', error);
    return NextResponse.json({ error: 'Failed to initiate login' }, { status: 500 });
  }
}