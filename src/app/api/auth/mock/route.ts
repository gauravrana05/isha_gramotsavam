import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    if (!role || !['admin', 'public', 'captain'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Fetch real user from database based on role
    const user = await prisma.users.findFirst({
      where: { 
        role: role === 'admin' ? 'admin' : role === 'captain' ?  'captain' : 'public'
      }
    });

    if (!user) {
      return NextResponse.json({ error: `No ${role} user found in database` }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Mock auth failed:', error);
    return NextResponse.json({ error: 'Mock authentication failed' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}