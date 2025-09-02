import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { phone, languagePreference = 'english' } = await request.json();
    
    if (!languagePreference) {
      return NextResponse.json({ error: 'Language preference is required' }, { status: 400 });
    }

    // Map language preference to database format
    const languageMap: { [key: string]: string } = {
      'english': 'en',
      'tamil': 'ta', 
      'kannada': 'kn',
      'telugu': 'te',
      'hindi': 'hi'
    };
    
    const dbLanguagePreference = languageMap[languagePreference] || 'en';

    // Get temp user data from cookie
    const tempUserDataCookie = request.cookies.get('temp_user_data')?.value;
    if (!tempUserDataCookie) {
      return NextResponse.json({ error: 'Registration session expired' }, { status: 400 });
    }

    const tempUserData = JSON.parse(tempUserDataCookie);
    
    // Determine final phone number (from form or OIDC)
    const finalPhone = phone || tempUserData.phoneFromOIDC;
    
    if (!finalPhone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }
    
    // Create user data
    const userData = {
      email: tempUserData.email || null,
      phone: finalPhone,
      firstName: tempUserData.firstName || tempUserData.given_name || null,
      lastName: tempUserData.lastName || tempUserData.family_name || null,
      dateOfBirth: tempUserData.birthdate ? new Date(tempUserData.birthdate) : null,
      gender: tempUserData.gender || null,
      whatsappNumber: finalPhone, // Use same phone for WhatsApp
      instagramHandle: tempUserData.instagram_handle || null,
      panchayat: tempUserData.address?.panchayat || null,
      taluk: tempUserData.address?.taluk || null,
      district: tempUserData.address?.locality || tempUserData.address?.district || null,
      state: tempUserData.address?.region || tempUserData.address?.state || null,
      pincode: tempUserData.address?.postal_code || tempUserData.address?.pincode || null,
      profileComplete: false,
      role: 'public',
      languagePreference: dbLanguagePreference, // Always use language from form
    };

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: finalPhone }
    });

    let user;
    if (existingUser) {
      // Update existing user
      user = await prisma.user.update({
        where: { phone: finalPhone },
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

    // Redirect to user's selected language
    const userLang = user.languagePreference || 'en';
    const redirectPath = `/${userLang}/public`;
    
    // Create session
    const response = NextResponse.json({ 
      success: true, 
      user: { id: user.id, phone: user.phone },
      redirectPath 
    });
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
