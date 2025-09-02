# Authentication Flow Test Cases

This document provides mock user data and test scenarios for both authentication flows.

## Test Setup

### Mock User Data

```javascript
// Mock OIDC Response - User WITH Phone
const mockUserWithPhone = {
  "sub": "isha_user_12345",
  "name": "Arjun Kumar",
  "given_name": "Arjun",
  "family_name": "Kumar", 
  "email": "arjun.kumar@example.com",
  "email_verified": true,
  "phone_number": "+919876543210",
  "phone_number_verified": true,
  "picture": null,
  "birthdate": "1990-05-15",
  "gender": "male",
  "address": {
    "locality": "Coimbatore",
    "region": "Tamil Nadu",
    "postal_code": "641001"
  }
};

// Mock OIDC Response - User WITHOUT Phone
const mockUserWithoutPhone = {
  "sub": "isha_user_67890", 
  "name": "Priya Sharma",
  "given_name": "Priya",
  "family_name": "Sharma",
  "email": "priya.sharma@example.com", 
  "email_verified": true,
  "phone_number": null, // No phone from OIDC
  "phone_number_verified": false,
  "picture": null,
  "birthdate": "1985-12-20",
  "gender": "female",
  "address": {
    "locality": "Bangalore",
    "region": "Karnataka", 
    "postal_code": "560001"
  }
};

// Mock Existing Database User (for testing existing user flow)
const mockExistingUser = {
  "id": "clx1234567890",
  "email": "existing@example.com",
  "phone": "8888999900",
  "firstName": "Existing",
  "lastName": "User",
  "role": "public",
  "languagePreference": "ta",
  "profileComplete": true
};
```

## Test Case 1: User WITH Phone Number (Direct Login)

### Scenario
User logs in via OIDC and phone number is provided in the response.

### Expected Flow
1. User clicks "Login with Isha SSO"
2. OIDC returns user data with `phone_number: "+919876543210"`
3. System extracts phone as "9876543210" (removes +91)
4. User is created/updated in database
5. User is directly redirected to `/en/public` (or their preferred language)

### Test Steps
```bash
# 1. Start your local development server
npm run dev

# 2. Navigate to login page
open http://localhost:3000/en/login

# 3. Simulate OIDC callback with mock data
# You can use browser dev tools to simulate this by calling:
fetch('/api/auth/callback?code=test_code&state=test_state', {
  method: 'GET',
  // This would trigger the callback handler
})
```

### Expected Database Entry
```javascript
{
  email: "arjun.kumar@example.com",
  phone: "9876543210", // Clean 10-digit number
  firstName: "Arjun", 
  lastName: "Kumar",
  dateOfBirth: "1990-05-15T00:00:00.000Z",
  gender: "male",
  district: "Coimbatore",
  state: "Tamil Nadu", 
  pincode: "641001",
  role: "public",
  languagePreference: "en", // Default since not specified
  profileComplete: true // Has required + optional fields
}
```

## Test Case 2: User WITHOUT Phone Number (Phone Required Flow)

### Scenario
User logs in via OIDC but no phone number is provided in the response.

### Expected Flow
1. User clicks "Login with Isha SSO" 
2. OIDC returns user data with `phone_number: null`
3. System redirects to `/en/auth/phone-required`
4. User sees form pre-filled with name and email
5. User enters phone number and selects language preference
6. User submits form
7. User is redirected to language-specific public page

### Test Steps
```bash
# 1. Clear any existing session cookies
# Open browser dev tools → Application → Cookies → Clear

# 2. Navigate to phone required page directly to test
open http://localhost:3000/en/auth/phone-required

# 3. You should see session expired message since no temp data

# 4. To test the full flow, you need to simulate the OIDC callback
# that sets the temp_user_data cookie before redirecting
```

### Manual Test Setup for Phone Required Flow

Create a test endpoint to simulate the flow:

```javascript
// Add to /pages/api/test-auth.js or similar
export default function handler(req, res) {
  const tempUserData = {
    email: "priya.sharma@example.com",
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
  };

  // Set temp user data cookie
  res.setHeader('Set-Cookie', [
    `temp_user_data=${JSON.stringify(tempUserData)}; HttpOnly; Path=/; Max-Age=600`
  ]);
  
  // Redirect to phone required page
  res.redirect(302, '/en/auth/phone-required');
}
```

### Phone Required Form Test Data
```javascript
// Test input values
const testFormData = {
  phoneNumber: "9988776655",
  languagePreference: "tamil" // Should map to "ta" in database
};
```

### Expected Database Entry After Completion
```javascript
{
  email: "priya.sharma@example.com", 
  phone: "9988776655", // From form input
  firstName: "Priya",
  lastName: "Sharma", 
  dateOfBirth: "1985-12-20T00:00:00.000Z",
  gender: "female",
  district: "Bangalore",
  state: "Karnataka",
  pincode: "560001", 
  role: "public",
  languagePreference: "ta", // Mapped from "tamil"
  profileComplete: true
}
```

## Test Case 3: Existing User Login

### Scenario  
User already exists in database and logs in again.

### Expected Flow
1. User logs in via OIDC
2. System finds existing user by email
3. System updates user data with any new info from OIDC
4. User role and language preference are preserved  
5. User redirected based on existing language preference

### Database Setup
```sql
-- Create test user in database
INSERT INTO "User" (
  id, email, phone, "firstName", "lastName", role, 
  "languagePreference", "profileComplete", "createdAt", "updatedAt"
) VALUES (
  'test_user_existing', 
  'existing@example.com',
  '8888999900',
  'Existing', 
  'User',
  'public',
  'ta',
  true,
  NOW(),
  NOW()
);
```

## Automated Test Scripts

### Create Test Script
```javascript
// test/auth-flows.test.js
describe('Authentication Flows', () => {
  
  test('User with phone - direct login', async () => {
    // Mock OIDC response with phone
    const mockResponse = mockUserWithPhone;
    
    // Simulate callback
    const result = await fetch('/api/auth/callback?code=test&state=test');
    
    // Should redirect to /en/public
    expect(result.status).toBe(302);
    expect(result.headers.get('location')).toContain('/en/public');
    
    // Check database entry
    const user = await prisma.user.findUnique({
      where: { email: mockResponse.email }
    });
    expect(user.phone).toBe('9876543210');
    expect(user.languagePreference).toBe('en');
  });
  
  test('User without phone - phone required flow', async () => {
    // Mock OIDC response without phone
    const mockResponse = mockUserWithoutPhone;
    
    // Should redirect to phone-required
    const result = await fetch('/api/auth/callback?code=test&state=test');
    expect(result.headers.get('location')).toContain('/auth/phone-required');
    
    // Test phone completion
    const completionResult = await fetch('/api/auth/complete-registration', {
      method: 'POST',
      body: JSON.stringify({
        phone: '9988776655',
        languagePreference: 'tamil'
      })
    });
    
    const data = await completionResult.json();
    expect(data.success).toBe(true);
    expect(data.redirectPath).toBe('/ta/public');
  });
  
});
```

## Manual Testing Checklist

### For User WITH Phone:
- [ ] Login redirects directly to public page
- [ ] Phone number stored without country code  
- [ ] User data correctly mapped from OIDC
- [ ] Session cookie set properly
- [ ] Profile completeness calculated correctly

### For User WITHOUT Phone:
- [ ] Login redirects to phone-required page
- [ ] Temp user data cookie set correctly
- [ ] Phone-required page shows user info
- [ ] Language options display properly
- [ ] Form validation works (10-digit phone)
- [ ] Submission creates user with correct language
- [ ] Redirect goes to language-specific page
- [ ] Temp cookie cleared after completion

### Error Cases:
- [ ] Session expired shows proper message
- [ ] Invalid phone number shows validation error
- [ ] Network errors handled gracefully
- [ ] Missing temp data redirects to login

## Environment Variables Required

```bash
# .env.local
ISHA_OIDC_CLIENT_ID=your_client_id
ISHA_OIDC_REDIRECT_URI=http://localhost:3000/api/auth/callback  
ISHA_OIDC_ISSUER=https://isha-sso-domain.com
DATABASE_URL=your_postgres_connection_string
```

## Notes

1. **Phone Number Format**: Always stored as 10-digit string without country code
2. **Language Mapping**: Frontend sends full names, backend stores ISO codes  
3. **Session Management**: Uses httpOnly cookies for security
4. **Profile Completeness**: Calculated based on required + optional field presence
5. **Error Handling**: All flows have proper error states and user feedback