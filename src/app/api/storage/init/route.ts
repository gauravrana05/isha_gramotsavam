import { NextResponse } from 'next/server';
import { initializeStorage } from '@/lib/storage';

export async function POST() {
  try {
    await initializeStorage();
    return NextResponse.json({ 
      success: true, 
      message: 'Storage initialized successfully' 
    });
  } catch (error) {
    console.error('Storage initialization failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Storage initialization failed' 
    }, { status: 500 });
  }
}

export async function GET() {
  return POST(); // Allow GET requests for testing
}