import LoginButton from '@/components/auth/LoginButton';

export default function TestAuthPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Test New Auth System</h1>
        <p className="text-gray-600 text-center mb-6">
          This page tests the new Isha SSO OIDC authentication system
        </p>
        
        {/* Test the new auth component */}
        <LoginButton />
        
        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <h3 className="font-semibold mb-2">Testing Instructions:</h3>
          <ol className="text-sm space-y-1">
            <li>1. Click &ldquo;Login with Isha SSO&rdquo; to test the auth flow</li>
            <li>2. Check tRPC endpoints work</li>
            <li>3. Verify database connection</li>
          </ol>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 rounded-md">
          <h4 className="font-semibold mb-2">Debug Info:</h4>
          <p className="text-xs text-gray-600">
            Path: /en/(auth)/test-auth<br/>
            This bypasses the old Firebase auth redirects
          </p>
        </div>
      </div>
    </div>
  );
}