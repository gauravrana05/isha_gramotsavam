import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Normalize phone number - try both with and without +91
    const normalizedPhone = phone.replace(/^\+91/, '');
    const phoneWithCountryCode = phone.startsWith('+91') ? phone : `+91${phone}`;

    console.log('🔍 Phone auth - Looking for:', { phone, normalizedPhone, phoneWithCountryCode });

    // Try to find user with either format
    const user = await db.user.findFirst({
      where: {
        OR: [
          { phone: phone },
          { phone: normalizedPhone },
          { phone: phoneWithCountryCode }
        ]
      }
    });

    console.log('🔍 Phone auth - Found user:', user ? { id: user.id, phone: user.phone, role: user.role } : 'null');

    if (!user) {
      return NextResponse.json({ error: 'User not found with this phone number' }, { status: 404 });
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
    console.error('Phone auth failed:', error);
    return NextResponse.json({ error: 'Phone authentication failed' }, { status: 500 });
  }
}
