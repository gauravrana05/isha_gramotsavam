import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get userId from cookie instead of URL parameters
    const userId = request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        whatsappNumber: true,
        instagramHandle: true,
        panchayat: true,
        taluk: true,
        district: true,
        state: true,
        pincode: true,
        profileComplete: true,
        role: true,
        languagePreference: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    // Set userId in cookie for tRPC context
    const response = NextResponse.json({ user });
    response.cookies.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Failed to get user:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}