'use client';

import { useState } from 'react';
import { api } from '@/server/trpc/react';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';
import { useAuth } from '@/context/AuthContext';

export default function TestCachePage() {
  const { user } = useAuth();
  const [cacheData, setCacheData] = useState<any>(null);
  const [apiData, setApiData] = useState<any>(null);

  // Test API call that should populate cache
  const { data: assignments, refetch } = api.volunteers.assignments.getMyAssignments.useQuery();

  const testCachePopulation = async () => {
    if (!user?.id) return;

    try {
      console.log('🧪 Testing cache population...');
      
      // Make API call
      const freshData = await refetch();
      setApiData(freshData.data);
      
      // Wait a moment for cache to populate
      setTimeout(async () => {
        // Check what's in IndexedDB
        const service = getVolunteerService();
        await service.initialize(user.id);
        
        // Get cached data
        const cachedAssignments = await service.getVolunteerAssignments(user.id);
        setCacheData(cachedAssignments);
        
        console.log('📊 Cache test results:', {
          apiData: freshData.data,
          cachedData: cachedAssignments
        });
      }, 2000);
      
    } catch (error) {
      console.error('❌ Cache test failed:', error);
    }
  };

  if (!user) {
    return <div>Please log in to test cache population</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Cache Population Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={testCachePopulation}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test Cache Population
        </button>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">API Data:</h3>
            <pre className="text-xs overflow-auto max-h-64">
              {JSON.stringify(apiData, null, 2)}
            </pre>
          </div>
          
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">Cached Data:</h3>
            <pre className="text-xs overflow-auto max-h-64">
              {JSON.stringify(cacheData, null, 2)}
            </pre>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Test Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click "Test Cache Population" button</li>
            <li>Check browser console for cache update logs</li>
            <li>Compare API data vs Cached data above</li>
            <li>Go offline and refresh - data should load from cache</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
