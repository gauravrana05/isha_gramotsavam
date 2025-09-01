import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { feedback, rating, category, timestamp, url } = body;

    // Simple logging to console (can be enhanced later)
    console.log('📝 Feedback Received:', {
      category,
      rating,
      feedback: feedback.substring(0, 100) + '...',
      url,
      timestamp
    });

    // In production, save to database or send to analytics service
    // For now, just log and return success
    
    return NextResponse.json({ 
      success: true, 
      message: 'Feedback received successfully' 
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
