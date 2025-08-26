import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // For now, we'll use a simple approach with URL parameters
    // In production, you'd want to use proper JWT or session management
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        first_name: true,
        last_name: true,
        date_of_birth: true,
        gender: true,
        whatsapp_number: true,
        instagram_handle: true,
        panchayat: true,
        taluk: true,
        district: true,
        state: true,
        pincode: true,
        profile_complete: true,
        role: true,
        language_preference: true,
        created_at: true,
        updated_at: true,
      }
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Failed to get user:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}