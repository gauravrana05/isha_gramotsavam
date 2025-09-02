# Quick Test Commands

## 1. Start Your Development Server
```bash
npm run dev
```

## 2. Test Both Scenarios

### Option A: Use the Test Page (Recommended)
Open in your browser:
```
http://localhost:3000/test-auth
```

This gives you a nice UI to test both scenarios with detailed information about each flow.

### Option B: Direct URLs

**Test User WITH Phone (Direct Login):**
```
http://localhost:3000/api/test-auth?scenario=with-phone
```
Expected: Should eventually redirect to `/en/public` after processing

**Test User WITHOUT Phone (Phone Required):**
```
http://localhost:3000/api/test-auth?scenario=without-phone
```  
Expected: Should redirect to `/en/auth/phone-required` with form pre-filled

## 3. Verify Database Changes

After running tests, check your database:

```sql
-- See all users created during testing
SELECT id, email, phone, "firstName", "lastName", role, "languagePreference", "profileComplete" 
FROM "User" 
WHERE email IN ('arjun.kumar@example.com', 'priya.sharma@example.com')
ORDER BY "createdAt" DESC;

-- Check phone number format (should be 10 digits, no +91)
SELECT phone FROM "User" WHERE phone IS NOT NULL;

-- Check language preferences (should be 'en', 'ta', etc. not 'english', 'tamil')
SELECT "languagePreference", COUNT(*) 
FROM "User" 
GROUP BY "languagePreference";
```

## 4. Test the Phone Required Form

1. Go to: `http://localhost:3000/api/test-auth?scenario=without-phone`
2. You should see the phone-required page with:
   - User name: "Priya Sharma"
   - Email: "priya.sharma@example.com" 
   - Empty phone field to fill
   - Language selection (English selected by default)

3. Fill in the form:
   - Phone: `8899776655`
   - Language: Select "தமிழ் (Tamil)"
   - Click "Complete Registration"

4. Expected result:
   - User created in database with phone `8899776655` and `languagePreference: 'ta'`
   - Redirected to `/ta/public` (Tamil public page)

## 5. Clear Test Data

To clean up test data between runs:

```sql
-- Delete test users
DELETE FROM "User" 
WHERE email IN ('arjun.kumar@example.com', 'priya.sharma@example.com');
```

Or in your browser:
- Clear all cookies for localhost:3000
- This will clear temp session data

## 6. Test Edge Cases

### Session Expired
1. Clear browser cookies
2. Go directly to: `http://localhost:3000/en/auth/phone-required`
3. Expected: Should show "Session Expired" message with "Back to Login" button

### Invalid Phone Number
1. Use scenario without phone to get to phone-required page
2. Try entering invalid phone numbers:
   - `123` (too short)
   - `123456789012` (too long)
   - `abc123def45` (contains letters)
3. Expected: Should show validation errors

### Language Preference Mapping
Test that frontend language names map correctly to database codes:
- `english` → `en`
- `tamil` → `ta` 
- `kannada` → `kn`
- `telugu` → `te`
- `hindi` → `hi`

## 7. Production-Like Testing

To test closer to production conditions:

1. **Set up OIDC test account** (if you have access to Isha SSO test environment)
2. **Use ngrok** to get HTTPS URL for local testing:
   ```bash
   npx ngrok http 3000
   # Update ISHA_OIDC_REDIRECT_URI to use ngrok URL
   ```
3. **Test with real OIDC flow** instead of mocked data

## Troubleshooting

### If phone-required page shows "Session Expired":
- The `temp_user_data` cookie wasn't set or expired
- Make sure you're coming from the test URL, not navigating directly

### If language preference isn't saved correctly:
- Check the language mapping in `/api/auth/complete-registration/route.ts`
- Verify the form is sending the correct language value

### If redirect doesn't work after phone completion:
- Check browser network tab for the POST to `/api/auth/complete-registration`
- Verify the response includes `redirectPath`
- Check that the redirect URL is correctly formatted

### Database connection issues:
```bash
# Check if database is running
npx prisma db pull

# Reset database if needed  
npx prisma db push --force-reset
```

## Expected Test Results Summary

| Test Case | Phone in OIDC | Expected Redirect | Database Phone | Database Language |
|-----------|---------------|-------------------|----------------|-------------------|
| User WITH Phone | `+919876543210` | `/en/public` | `9876543210` | `en` |
| User WITHOUT Phone | `null` | `/en/auth/phone-required` → user fills form → `/ta/public` (if Tamil selected) | `8899776655` (from form) | `ta` (if Tamil selected) |