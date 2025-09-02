import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get temp user data from cookie
    const tempUserDataCookie = request.cookies.get('temp_user_data');
    
    if (!tempUserDataCookie) {
      return NextResponse.json({ 
        success: false, 
        error: 'No temporary user data found' 
      }, { status: 404 });
    }

    const userData = JSON.parse(tempUserDataCookie.value);
    
    return NextResponse.json({
      success: true,
      userData: {
        firstName: userData.firstName || userData.name?.split(' ')[0] || '',
        lastName: userData.lastName || userData.name?.split(' ').slice(1).join(' ') || '',
        email: userData.email,
        sub: userData.sub
      }
    });
  } catch (error) {
    console.error('Error fetching temp user data:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch user data' 
    }, { status: 500 });
  }
}