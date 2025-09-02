import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scenario = searchParams.get('scenario');
    
    // Scenario 1: User WITH phone, WITH language preference (existing user)
    if (scenario === 'with-phone-with-language') {
      const response = NextResponse.redirect(new URL('/ta/public?test=success&message=User with phone and Tamil preference logged in directly', request.url));
      response.cookies.set('test_scenario', 'with-phone-with-language', { maxAge: 300 });
      return response;
    }
    
    // Scenario 2: User WITH phone, WITHOUT language preference (new user)  
    if (scenario === 'with-phone-no-language') {
      const response = NextResponse.redirect(new URL('/en/public?test=success&message=User with phone but no language preference logged in to English', request.url));
      response.cookies.set('test_scenario', 'with-phone-no-language', { maxAge: 300 });
      return response;
    }
    
    // Scenario 3: User WITHOUT phone, WITH language preference (existing user, phone missing)
    if (scenario === 'no-phone-with-language') {
      const tempUserData = {
        email: "ravi.existing@example.com",
        firstName: "Ravi",
        lastName: "Kumar", 
        sub: "isha_user_11111",
        birthdate: "1988-03-10",
        gender: "male",
        languagePreference: "ta", // Has existing language preference
        address: {
          locality: "Chennai",
          region: "Tamil Nadu",
          postal_code: "600001"
        }
      };
      
      const response = NextResponse.redirect(new URL('/en/auth/phone-required', request.url));
      response.cookies.set('temp_user_data', JSON.stringify(tempUserData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60,
      });
      
      return response;
    }
    
    // Scenario 4: User WITHOUT phone, WITHOUT language preference (completely new user)
    if (scenario === 'no-phone-no-language') {
      const tempUserData = {
        email: "priya.new@example.com",
        firstName: "Priya",
        lastName: "Sharma", 
        sub: "isha_user_67890",
        birthdate: "1985-12-20",
        gender: "female",
        address: {
          locality: "Bangalore",
          region: "Karnataka",
          postal_code: "560001"
        }
        // No languagePreference field
      };
      
      const response = NextResponse.redirect(new URL('/en/auth/phone-required', request.url));
      response.cookies.set('temp_user_data', JSON.stringify(tempUserData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60,
      });
      
      return response;
    }
  
  // Default response
  return NextResponse.json({
    message: "Auth Demo Helper",
    usage: "Add ?scenario=without-phone to test the phone-required flow"
  });
  } catch (error) {
    console.error('Test auth demo error:', error);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}