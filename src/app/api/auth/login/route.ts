import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// PKCE helper functions - FIXED to match RFC 7636 spec
function generateCodeVerifier() {
  // Generate 32 random bytes and encode as base64url (RFC 7636 compliant)
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(codeVerifier: string) {
  // SHA256 hash of code verifier, encoded as base64url (RFC 7636 compliant)
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

    console.log('=== PKCE GENERATION ===');
    console.log('Code verifier:', codeVerifier);
    console.log('Code challenge:', codeChallenge);
    console.log('State:', state);

    // Return JSON with authUrl (as expected by AuthContext)
    const response = NextResponse.json({ authUrl: authUrl.toString() });
    
    // Set cookies with proper configuration
    response.cookies.set('oidc_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60, // 10 minutes in seconds
    });
    
    response.cookies.set('code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60, // 10 minutes in seconds
    });

    return response;
  } catch (error) {
    console.error('Failed to initiate OIDC login:', error);
    return NextResponse.json({ error: 'Failed to initiate login' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
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

    console.log('=== PKCE GENERATION (GET) ===');
    console.log('Code verifier:', codeVerifier);
    console.log('Code challenge:', codeChallenge);
    console.log('State:', state);

    const response = NextResponse.redirect(authUrl.toString());
    
    // Set cookies with proper configuration
    response.cookies.set('oidc_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60, // 10 minutes in seconds
    });
    
    response.cookies.set('code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60, // 10 minutes in seconds
    });

    return response;
  } catch (error) {
    console.error('Failed to initiate OIDC login:', error);
    return NextResponse.redirect(`${request.nextUrl.origin}/en/login?error=auth_failed`);
  }
}