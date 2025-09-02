import { NextRequest, NextResponse } from 'next/server';

// Test endpoint to simulate different auth scenarios
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scenario = searchParams.get('scenario');
  
  if (scenario === 'with-phone') {
    // Simulate user WITH phone - should go directly to public page
    const mockUserData = {
      sub: "isha_user_12345",
      name: "Arjun Kumar", 
      given_name: "Arjun",
      family_name: "Kumar",
      email: "arjun.kumar@example.com",
      email_verified: true,
      phone_number: "+919876543210", // Has phone
      phone_number_verified: true,
      birthdate: "1990-05-15",
      gender: "male",
      address: {
        locality: "Coimbatore", 
        region: "Tamil Nadu",
        postal_code: "641001"
      }
    };
    
    // For testing, redirect directly to public page (simulating successful auth)
    const response = NextResponse.redirect(new URL('/en/public?test=with-phone&message=User with phone would login directly', request.url));
    
    return response;
  }
  
  if (scenario === 'without-phone') {
    // Simulate user WITHOUT phone - should go to phone-required page
    const mockUserData = {
      sub: "isha_user_67890",
      name: "Priya Sharma",
      given_name: "Priya", 
      family_name: "Sharma",
      email: "priya.sharma@example.com",
      email_verified: true,
      phone_number: null, // No phone
      phone_number_verified: false,
      birthdate: "1985-12-20",
      gender: "female", 
      address: {
        locality: "Bangalore",
        region: "Karnataka",
        postal_code: "560001"
      }
    };
    
    // Set temp user data cookie as the callback would
    const response = NextResponse.redirect(new URL('/en/auth/phone-required', request.url));
    response.cookies.set('temp_user_data', JSON.stringify({
      email: mockUserData.email,
      firstName: mockUserData.given_name,
      lastName: mockUserData.family_name, 
      sub: mockUserData.sub,
      ...mockUserData
    }), {
      httpOnly: true,
      maxAge: 600 // 10 minutes
    });
    
    return response;
  }
  
  // Default - show test options
  return NextResponse.json({
    message: "Auth Flow Test Helper",
    scenarios: {
      "with-phone": {
        url: "/api/test-auth?scenario=with-phone",
        description: "Test user who has phone number in OIDC response - should go directly to public page"
      },
      "without-phone": { 
        url: "/api/test-auth?scenario=without-phone",
        description: "Test user who needs to provide phone number - should go to phone-required page"
      }
    },
    usage: "Visit the URLs above to test different authentication flows"
  });
}

// Simulate the callback processing without actual OIDC
export async function POST(request: NextRequest) {
  try {
    const { userType } = await request.json();
    
    if (userType === 'with-phone') {
      // Simulate successful auth with phone
      return NextResponse.json({
        success: true,
        message: "User with phone would be created and redirected to /en/public",
        expectedFlow: [
          "1. OIDC provides phone_number: '+919876543210'",
          "2. Phone extracted as '9876543210'", 
          "3. User created in database",
          "4. Session cookie set",
          "5. Redirect to /en/public"
        ]
      });
    }
    
    if (userType === 'without-phone') {
      return NextResponse.json({
        success: true,
        message: "User without phone would be redirected to phone-required page", 
        expectedFlow: [
          "1. OIDC provides no phone_number",
          "2. Temp user data stored in cookie",
          "3. Redirect to /en/auth/phone-required",
          "4. User fills phone + language form",
          "5. Complete registration creates user",
          "6. Redirect to language-specific public page"
        ]
      });
    }
    
    return NextResponse.json({ error: "Invalid user type" }, { status: 400 });
    
  } catch (error) {
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
}