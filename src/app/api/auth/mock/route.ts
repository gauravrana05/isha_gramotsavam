import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    if (!role || !['admin', 'public', 'captain', 'player'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Fetch real user from database based on role
    const user = await prisma.users.findFirst({
      where: { 
        role: role === 'admin' ? 'admin' : role === 'captain' ?  'captain' :  role === 'player' ? 'player' : 'public'
      }
    });

    if (!user) {
      return NextResponse.json({ error: `No ${role} user found in database` }, { status: 404 });
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
    console.error('Mock auth failed:', error);
    return NextResponse.json({ error: 'Mock authentication failed' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}