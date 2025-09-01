'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import OfflineContext to avoid SSR issues
const OfflineContext = dynamic(
  () => import('./OfflineContext').then(mod => ({ default: mod.OfflineContext })),
  { 
    ssr: false,
    loading: () => <div>Loading offline services...</div>
  }
);

export const OfflineContextWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <OfflineContext>{children}</OfflineContext>;
};

// Browser-only hook
export const useOffline = () => {
  if (typeof window === 'undefined') {
    // Return mock values for SSR
    return {
      isOnline: true,
      connectionQuality: 'good' as const,
      syncStatus: 'idle' as const,
      pendingActions: [],
      preloadVolunteerData: async () => {},
      queueSyncAction: async () => {},
      queueMediaUpload: async () => '',
      getSyncStats: async () => ({ pending: 0, success: 0, failed: 0 })
    };
  }

  // Dynamic import for browser
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useOffline: useOfflineHook } = require('./OfflineContext');
  return useOfflineHook();
};

export default OfflineContextWrapper;
