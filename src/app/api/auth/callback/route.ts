import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error('OAuth error from Isha SSO:', error, errorDescription);
      return NextResponse.redirect(`${new URL(request.url).origin}/en/login?error=oauth_error&details=${encodeURIComponent(errorDescription || error)}`);
    }

    if (!code) {
      console.error('Authorization code missing from callback');
      return NextResponse.redirect(`${new URL(request.url).origin}/en/login?error=missing_code`);
    }

    // Validate state parameter
    const storedState = request.cookies.get('oidc_state')?.value;
    if (!storedState || storedState !== state) {
      console.error('State mismatch or missing:', { stored: storedState, received: state });
      return NextResponse.redirect(`${new URL(request.url).origin}/en/login?error=invalid_state`);
    }

    // Get code verifier from cookies
    const codeVerifier = request.cookies.get('code_verifier')?.value;
    
    console.log('=== PKCE VERIFICATION ===');
    console.log('Code verifier from cookie:', codeVerifier ? 'Present' : 'Missing');
    console.log('Code verifier length:', codeVerifier?.length);
    console.log('Code verifier (first 10 chars):', codeVerifier?.substring(0, 10));
    console.log('Authorization code:', code.substring(0, 10) + '...');
    
    // DEBUGGING: Regenerate code challenge to verify
    if (codeVerifier) {
      const crypto = require('crypto');
      const regeneratedChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
      console.log('Regenerated code challenge:', regeneratedChallenge.substring(0, 10) + '...');
    }
    
    if (!codeVerifier) {
      console.error('Code verifier missing from cookies');
      console.log('Available cookies:', request.cookies.getAll().map(c => c.name));
      return NextResponse.redirect(`${new URL(request.url).origin}/en/login?error=missing_pkce`);
    }

    // Prepare token exchange request
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.ISHA_OIDC_CLIENT_ID!,
      code,
      redirect_uri: process.env.ISHA_OIDC_REDIRECT_URI!,
      code_verifier: codeVerifier,
    });

    console.log('=== TOKEN EXCHANGE REQUEST ===');
    console.log('Token endpoint:', `${process.env.ISHA_OIDC_ISSUER}/oidc/token`);
    console.log('Request params:', Object.fromEntries(tokenParams.entries()));
    
    const tokenResponse = await fetch(`${process.env.ISHA_OIDC_ISSUER}/oidc/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: tokenParams,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('=== TOKEN EXCHANGE FAILED ===');
      console.error('Status:', tokenResponse.status);
      console.error('Response:', errorText);
      
      return NextResponse.redirect(`${new URL(request.url).origin}/en/login?error=token_exchange_failed&details=${encodeURIComponent(errorText)}`);
    }

    const tokens = await tokenResponse.json();
    console.log('=== TOKEN EXCHANGE SUCCESS ===');
    console.log('Received tokens:', Object.keys(tokens));

    // Get user info from OIDC provider
    const userResponse = await fetch(`${process.env.ISHA_OIDC_ISSUER}/oidc/userinfo`, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json',
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch user info:', userResponse.status);
      return NextResponse.redirect(`${new URL(request.url).origin}/en/login?error=userinfo_failed`);
    }

    const userInfo = await userResponse.json();
    
    console.log('=== USER INFO FROM ISHA SSO ===');
    console.log('User sub:', userInfo.sub);
    console.log('User email:', userInfo.email);
    console.log('User phone:', userInfo.phone_number);
    
    // Map OIDC user info to our User model
    const userData = {
      email: userInfo.email || null,
      phone: userInfo.phone_number || userInfo.phone || userInfo.phoneNumber || userInfo.mobile || null,
      firstName: userInfo.given_name || userInfo.name?.split(' ')[0] || null,
      lastName: userInfo.family_name || userInfo.name?.split(' ').slice(1).join(' ') || null,
      dateOfBirth: userInfo.birthdate ? new Date(userInfo.birthdate) : null,
      gender: userInfo.gender || null,
      whatsappNumber: userInfo.whatsapp_number || userInfo.phone_number || userInfo.phone || null,
      instagramHandle: userInfo.instagram_handle || null,
      panchayat: userInfo.address?.panchayat || null,
      taluk: userInfo.address?.taluk || null,
      district: userInfo.address?.locality || userInfo.address?.district || null,
      state: userInfo.address?.region || userInfo.address?.state || null,
      pincode: userInfo.address?.postal_code || userInfo.address?.pincode || null,
      profileComplete: false,
      role: 'public',
    };

    // Create or update user in database
    let user: any;
    const phone = userData.phone;
     
    if (!phone) {
      // Store user info temporarily for phone collection
      const tempUserData = {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        sub: userInfo.sub,
        ...userInfo
      };
      
      const redirectUrl = new URL('/en/auth/phone-required', request.url);
      const response = NextResponse.redirect(redirectUrl);
      
      response.cookies.set('temp_user_data', JSON.stringify(tempUserData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60,
      });
      
      // Clear PKCE cookies
      response.cookies.delete('oidc_state');
      response.cookies.delete('code_verifier');
      
      return response;
    }

    const existingUser = await prisma.user.findUnique({
      where: { phone: phone }
    });

    if (existingUser) {
      user = await prisma.user.update({
        where: { phone: phone },
        data: {
          ...userData,
          role: existingUser.role,
          updatedAt: new Date(),
        }
      });
    } else {
      user = await prisma.user.create({
        data: userData
      });
    }

    // Check profile completeness
    const requiredFields = ['firstName', 'lastName', 'phone'];
    const optionalFields = ['dateOfBirth', 'gender', 'district', 'state'];
    
    const hasRequiredFields = requiredFields.every(field => {
      const value = user[field as keyof typeof user];
      return value !== null && value !== undefined && value !== '';
    });
    
    const hasOptionalFields = optionalFields.some(field => {
      const value = user[field as keyof typeof user];
      return value !== null && value !== undefined && value !== '';
    });
    
    const isProfileComplete = hasRequiredFields && hasOptionalFields;
    
    if (user.profileComplete !== isProfileComplete) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { profileComplete: isProfileComplete }
      });
    }

    // Determine redirect path
    const supportedLanguages = ['en', 'ta', 'hi', 'ml', 'te', 'kn', 'or'];
    const userLang = user.languagePreference && supportedLanguages.includes(user.languagePreference) 
      ? user.languagePreference 
      : 'en';
    
    const hasLanguagePreference = Boolean(user.languagePreference);
    let redirectPath = `/${userLang}`;
    
    if (user.role === 'admin') {
      redirectPath = `/${userLang}/admin/dashboard`;
    } else if (['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(user.role)) {
      if (!hasLanguagePreference) {
        redirectPath = `/${userLang}/volunteer?showLanguageModal=true`;
      } else {
        redirectPath = `/${userLang}/volunteer`;
      }
    } else if (user.role === 'captain') {
      redirectPath = `/${userLang}/captain/dashboard`;
    } else if (user.role === 'player') {
      redirectPath = `/${userLang}/player/dashboard`;
    } else {
      redirectPath = `/${userLang}/public`;
    }

    const redirectUrl = new URL(redirectPath, request.url);
    redirectUrl.searchParams.set('auth', 'success');

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });

    // Clear PKCE cookies
    response.cookies.delete('oidc_state');
    response.cookies.delete('code_verifier');

    console.log('=== AUTH SUCCESS ===');
    console.log('User ID:', user.id);
    console.log('Redirecting to:', redirectPath);

    return response;

  } catch (error) {
    console.error('=== OIDC CALLBACK ERROR ===');
    console.error('Error:', error);
    
    const errorResponse = NextResponse.redirect(`${new URL(request.url).origin}/en/login?error=callback_error`);
    errorResponse.cookies.delete('userId');
    errorResponse.cookies.delete('oidc_state');
    errorResponse.cookies.delete('code_verifier');
    
    return errorResponse;
  }
}