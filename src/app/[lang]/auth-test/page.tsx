"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

export default function AuthTestPage() {
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    console.log("=== AUTH TEST UPDATE ===");
    console.log("loading:", loading, "user:", !!user, "userProfile:", !!userProfile);
    if (userProfile) {
      console.log("User profile details:", {
        name: userProfile.name,
        role: userProfile.role,
        isProfileComplete: userProfile.isProfileComplete,
        uid: userProfile.uid
      });
    }
  }, [loading, user, userProfile]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Auth Context Test</h1>
        
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Loading State</h2>
            <p className="text-gray-700">{loading ? "🔄 Loading..." : "✅ Not loading"}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">User Authentication</h2>
            <p className="text-gray-700">
              {user ? `✅ Authenticated: ${user.uid}` : "❌ Not authenticated"}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">User Profile</h2>
            <p className="text-gray-700">
              {userProfile ? `✅ Profile loaded: ${userProfile.name || 'No name'}` : "❌ No profile"}
            </p>
            {userProfile && (
              <div className="mt-2 text-sm text-gray-600">
                <p>Role: {userProfile.role}</p>
                <p>Profile Complete: {userProfile.isProfileComplete ? "Yes" : "No"}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}