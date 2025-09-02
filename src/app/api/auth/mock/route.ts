import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    if (!role || !['admin', 'public', 'captain', 'player', 'verification_volunteer', 'technical_volunteer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Fetch real user from database based on role
    let user = await prisma.user.findFirst({
      where: { 
        role: role === 'admin' ? 'admin' : 
              role === 'captain' ? 'captain' : 
              role === 'player' ? 'player' : 
              role === 'verification_volunteer' ? 'verification_volunteer' :
              role === 'technical_volunteer' ? 'technical_volunteer' : 
              'public'
      }
    });

    console.log('🔍 Mock auth - Requested role:', role);
    console.log('🔍 Mock auth - Database query role:', role === 'admin' ? 'admin' : 
              role === 'captain' ? 'captain' : 
              role === 'player' ? 'player' : 
              role === 'verification_volunteer' ? 'verification_volunteer' :
              role === 'technical_volunteer' ? 'technical_volunteer' : 
              'public');
    console.log('🔍 Mock auth - Found user:', user ? { id: user.id, role: user.role, firstName: user.firstName } : 'null');

    if (!user) {
      return NextResponse.json({ error: `No ${role} user found in database` }, { status: 404 });
    }

    // Ensure admin and special roles have profileComplete set to true
    if ((role === 'admin' || role.includes('volunteer') || role === 'public') && !user.profileComplete) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { profileComplete: true }
      });
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