"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginButton() {
  const { user, loading, login, logout, isAuthenticated } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (isAuthenticated && user) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="mb-2">
          <p><strong>Phone:</strong> {user.phone}</p>
          <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Profile Complete:</strong> {user.profileComplete ? 'Yes' : 'No'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <button
        onClick={handleLogin}
        disabled={isLoggingIn}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isLoggingIn ? 'Redirecting to Isha SSO...' : 'Login with Isha SSO'}
      </button>
    </div>
  );
}