'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import PageLoader from '@/components/ui/loaders/PageLoader';

// Dynamically import OfflineContext to avoid SSR issues
const OfflineContextProvider = dynamic(
  () => import('./OfflineContext').then(mod => mod.OfflineProvider),
  { 
    ssr: false,
    loading: () => <PageLoader variant="default" title="" />
  }
);

export const OfflineContextWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <OfflineContextProvider>{children}</OfflineContextProvider>;
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

// Re-export types for convenience
export { ConnectionQuality, SyncStatus } from './OfflineContext';

export default OfflineContextWrapper;
