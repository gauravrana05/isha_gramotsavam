import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      return NextResponse.json({ error: 'Authorization code missing' }, { status: 400 });
    }

    // Exchange authorization code for tokens
    const tokenParams: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: process.env.ISHA_OIDC_CLIENT_ID!,
      code,
      redirect_uri: process.env.ISHA_OIDC_REDIRECT_URI!,
    };

    // Only add client_secret if it's provided (some OIDC flows use PKCE instead)
    if (process.env.ISHA_OIDC_CLIENT_SECRET && process.env.ISHA_OIDC_CLIENT_SECRET !== 'null') {
      tokenParams.client_secret = process.env.ISHA_OIDC_CLIENT_SECRET;
    }

    const tokenResponse = await fetch(`${process.env.ISHA_OIDC_ISSUER}/oidc/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams(tokenParams),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.json({ error: 'Token exchange failed' }, { status: 400 });
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    // Get user info from OIDC provider
    const userResponse = await fetch(`${process.env.ISHA_OIDC_ISSUER}/oidc/userinfo`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch user info');
      return NextResponse.json({ error: 'Failed to fetch user info' }, { status: 400 });
    }

    const userInfo = await userResponse.json();
    
    // Map OIDC user info to our User model (using snake_case field names)
    const userData = {
      email: userInfo.email,
      phone: userInfo.phone_number || null,
      firstName: userInfo.given_name || null,
      lastName: userInfo.family_name || null,
      dateOfBirth: userInfo.birthdate ? new Date(userInfo.birthdate) : null,
      gender: userInfo.gender || null,
      whatsappNumber: userInfo.whatsapp_number || null,
      instagramHandle: userInfo.instagram_handle || null,
      panchayat: userInfo.address?.panchayat || null,
      taluk: userInfo.address?.taluk || null,
      district: userInfo.address?.locality || null,
      state: userInfo.address?.region || null,
      pincode: userInfo.address?.postal_code || null,
      profileComplete: false, // Will be updated based on completeness check
      role: 'public', // Default role
      languagePreference: 'en', // Default language
    };

    // Create or update user in database (search by phone instead of email)
    let user: any;
    const phone = userInfo.phone_number;
    
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required for authentication' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { phone: phone }
    });

    if (existingUser) {
      // Update existing user
      user = await prisma.user.update({
        where: { phone: phone },
        data: {
          ...userData,
          role: existingUser.role, // Preserve existing role
          updatedAt: new Date(),
        }
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: userData
      });
    }

    // Check profile completeness
    const requiredFields = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 'district', 'state'];
    const isProfileComplete = requiredFields.every(field => user[field as keyof typeof user]);
    
    if (user.profileComplete !== isProfileComplete) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { profileComplete: isProfileComplete }
      });
    }

    // Create session by setting userId cookie
    const redirectUrl = new URL('/en', request.url);
    redirectUrl.searchParams.set('auth', 'success');

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return response;

  } catch (error) {
    console.error('OIDC callback error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}