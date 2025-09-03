'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface MockUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  email?: string;
}

export default function TestLogin() {
  const [phone, setPhone] = useState('');
  const [users, setUsers] = useState<MockUser[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user: currentUser, loading: authLoading, refreshUser } = useAuth();

  // Fetch mock users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/auth/mock-users');
        if (response.ok) {
          const { users } = await response.json();
          setUsers(users);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  const handlePhoneLogin = () => {
    if (phone.trim()) {
      router.push(`/en?phone=${phone}`);
    }
  };

  const handleMockUserLogin = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/mock-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        // Redirect to appropriate dashboard based on user role
        const { user } = await response.json();
        const roleRoutes = {
          admin: '/en/admin',
          captain: '/en/captain',
          player: '/en/player',
          general_volunteer: '/en/volunteer',
          technical_volunteer: '/en/volunteer',
          verification_volunteer: '/en/verification',
          public: '/en/public'
        };
        
        const route = roleRoutes[user.role as keyof typeof roleRoutes] || '/en/public';
        
        // Force a page reload to ensure AuthContext picks up the new cookie
        window.location.href = route;
      } else {
        alert('Login failed');
      }
    } catch (error) {
      console.error('Mock login failed:', error);
      alert('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Test Login</h1>
        
        {/* Current Auth State */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold mb-2">Current Auth State</h2>
          <p><strong>Loading:</strong> {authLoading ? 'Yes' : 'No'}</p>
          <p><strong>User:</strong> {currentUser ? `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})` : 'Not logged in'}</p>
          <button
            onClick={refreshUser}
            className="mt-2 bg-yellow-600 text-white py-1 px-3 rounded text-sm hover:bg-yellow-700"
          >
            Refresh Auth
          </button>
        </div>
        
        {/* Phone Login */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Phone Login</h2>
          <div className="flex gap-4">
            <input
              type="tel"
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handlePhoneLogin()}
            />
            <button
              onClick={handlePhoneLogin}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Login
            </button>
          </div>
        </div>

        {/* Mock Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Login (Mock Users)</h2>
          {users.length === 0 ? (
            <p className="text-gray-500">Loading users...</p>
          ) : (
            <div className="grid gap-3">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleMockUserLogin(user.id)}
                  disabled={loading}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-600">{user.phone}</div>
                      {user.email && (
                        <div className="text-sm text-gray-600">{user.email}</div>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'captain' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'player' ? 'bg-green-100 text-green-800' :
                      user.role.includes('volunteer') ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
