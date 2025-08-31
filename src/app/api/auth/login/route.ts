import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// PKCE helper functions
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(codeVerifier: string) {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

export async function POST(request: NextRequest) {
  try {
    // Generate PKCE parameters
    const state = crypto.randomUUID();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    
    const authUrl = new URL(`${process.env.ISHA_OIDC_ISSUER}/oidc/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', process.env.ISHA_OIDC_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', process.env.ISHA_OIDC_REDIRECT_URI!);
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    console.log('Authorization URL:', authUrl.toString());

    // Return JSON with authUrl (as expected by AuthContext)
    const response = NextResponse.json({ authUrl: authUrl.toString() });
    response.cookies.set('oidc_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });
    response.cookies.set('code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
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
    // Remove PKCE temporarily
    // authUrl.searchParams.set('code_challenge', codeChallenge);
    // authUrl.searchParams.set('code_challenge_method', 'S256');

    console.log('Authorization URL:', authUrl.toString());

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