import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Get temp user data from cookie
    const tempUserDataCookie = request.cookies.get('temp_user_data')?.value;
    if (!tempUserDataCookie) {
      return NextResponse.json({ error: 'Registration session expired' }, { status: 400 });
    }

    const tempUserData = JSON.parse(tempUserDataCookie);
    
    // Create user with phone number
    const userData = {
      email: tempUserData.email || null,
      phone: phone,
      firstName: tempUserData.firstName || tempUserData.given_name || null,
      lastName: tempUserData.lastName || tempUserData.family_name || null,
      dateOfBirth: tempUserData.birthdate ? new Date(tempUserData.birthdate) : null,
      gender: tempUserData.gender || null,
      whatsappNumber: phone, // Use same phone for WhatsApp
      instagramHandle: tempUserData.instagram_handle || null,
      panchayat: tempUserData.address?.panchayat || null,
      taluk: tempUserData.address?.taluk || null,
      district: tempUserData.address?.locality || tempUserData.address?.district || null,
      state: tempUserData.address?.region || tempUserData.address?.state || null,
      pincode: tempUserData.address?.postal_code || tempUserData.address?.pincode || null,
      profileComplete: false,
      role: 'public',
      languagePreference: 'en',
    };

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: phone }
    });

    let user;
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

    // Create session
    const response = NextResponse.json({ success: true, user: { id: user.id, phone: user.phone } });
    response.cookies.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    // Clear temp data
    response.cookies.delete('temp_user_data');

    return response;

  } catch (error) {
    console.error('Registration completion failed:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
