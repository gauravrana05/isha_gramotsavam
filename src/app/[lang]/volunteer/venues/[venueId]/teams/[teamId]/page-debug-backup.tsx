'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

// Simple debug page to test if the route works
export default function TeamDebugPage() {
  console.log('🚀 DEBUG: Team debug page rendered!');
  
  const params = useParams();
  const { venueId, teamId } = params as { venueId: string; teamId: string };
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🚀 DEBUG: Team debug page mounted with params:', { venueId, teamId });
    
    // Simulate loading and then show content
    const timer = setTimeout(() => {
      setLoading(false);
      console.log('🚀 DEBUG: Loading complete');
    }, 2000);

    return () => clearTimeout(timer);
  }, [venueId, teamId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Debug Loading...</p>
          <p className="text-sm text-gray-500">Team ID: {teamId}</p>
          <p className="text-sm text-gray-500">Venue ID: {venueId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          <h1 className="text-2xl font-bold">✅ SUCCESS!</h1>
          <p>The team page route is working correctly!</p>
        </div>
        
        <div className="bg-gray-100 p-4 rounded mb-6">
          <h2 className="text-lg font-semibold mb-2">Route Parameters:</h2>
          <ul className="space-y-1">
            <li><strong>Team ID:</strong> {teamId}</li>
            <li><strong>Venue ID:</strong> {venueId}</li>
          </ul>
        </div>

        <div className="bg-blue-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">What This Proves:</h2>
          <ul className="space-y-1 text-sm">
            <li>✅ The route `/[lang]/volunteer/venues/[venueId]/teams/[teamId]` is accessible</li>
            <li>✅ The component can render without context dependencies</li>
            <li>✅ The params are being passed correctly</li>
            <li>❌ The issue is in the context chain (AuthContext infinite re-renders)</li>
          </ul>
        </div>

        <div className="mt-6 p-4 bg-yellow-100 rounded">
          <h2 className="text-lg font-semibold mb-2">Next Steps:</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Fix the AuthContext infinite re-render issue</li>
            <li>Restore the original team page component</li>
            <li>The endless loading should be resolved</li>
          </ol>
        </div>
      </div>
    </div>
  );
}