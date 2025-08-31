import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Generate state parameter for CSRF protection
    const state = crypto.randomUUID();
    
    // Build authorization URL according to OIDC spec
    const authUrl = new URL(`${process.env.ISHA_OIDC_ISSUER}/oidc/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', process.env.ISHA_OIDC_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', process.env.ISHA_OIDC_REDIRECT_URI!);
    authUrl.searchParams.set('scope', 'openid profile email'); // As per doc
    authUrl.searchParams.set('state', state);

    // Store state in session/cookie for verification
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

// Add GET method for direct redirect
export async function GET(request: NextRequest) {
  try {
    const state = crypto.randomUUID();
    
    const authUrl = new URL(`${process.env.ISHA_OIDC_ISSUER}/oidc/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', process.env.ISHA_OIDC_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', process.env.ISHA_OIDC_REDIRECT_URI!);
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', state);

    // Direct redirect to Isha SSO
    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('oidc_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });

    return response;
  } catch (error) {
    console.error('Failed to initiate OIDC login:', error);
    return NextResponse.redirect(`${request.nextUrl.origin}/en/login?error=auth_failed`);
  }
}