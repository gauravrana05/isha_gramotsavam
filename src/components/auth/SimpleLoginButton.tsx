"use client";

import { useState } from 'react';

export default function SimpleLoginButton() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      // Test basic auth API call without tRPC
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }

      const { authUrl } = await response.json();
      
      // Show the auth URL instead of redirecting for testing
      alert(`Would redirect to: ${authUrl}`);
      
    } catch (error) {
      console.error('Login failed:', error);
      setError(error instanceof Error ? error.message : 'Login failed');
      setIsLoggingIn(false);
    }
  };

  const testMe = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setError('Not authenticated');
      }
    } catch (error) {
      console.error('Test me failed:', error);
      setError(error instanceof Error ? error.message : 'Test failed');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 mr-2"
        >
          {isLoggingIn ? 'Testing...' : 'Test Auth Login'}
        </button>
        
        <button
          onClick={testMe}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Test /api/auth/me
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {user && (
        <div className="p-3 bg-green-100 text-green-700 rounded">
          <strong>User:</strong> <pre>{JSON.stringify(user, null, 2)}</pre>
        </div>
      )}

      <div className="text-xs text-gray-500">
        This component doesn&apos;t use tRPC or complex auth context - just basic API calls
      </div>
    </div>
  );
}