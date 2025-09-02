'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface PublicOfflineData {
  events: any[];
  sports: any[];
  venues: any[];
  matches: any[];
  media: any[];
  leaderboards: any[];
  cachedPages: Record<string, { content: string; timestamp: number }>;
}

export interface PublicOfflineContextType {
  isOnline: boolean;
  publicData: PublicOfflineData;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  lastSyncTime: Date | null;
  cachePublicData: (data: Partial<PublicOfflineData>) => Promise<void>;
  cachePage: (url: string, content: string) => Promise<void>;
  getCachedPage: (url: string) => string | null;
  clearCache: () => Promise<void>;
  getStorageStats: () => Promise<{ totalSize: number; eventCount: number; pageCount: number }>;
  hasCachedData: () => boolean;
}

const PublicOfflineContext = createContext<PublicOfflineContextType | null>(null);

export const PublicOfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [publicData, setPublicData] = useState<PublicOfflineData>({
    events: [],
    sports: [],
    venues: [],
    matches: [],
    media: [],
    leaderboards: [],
    cachedPages: {}
  });
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'offline'>('good');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Connection quality detection
  const detectConnectionQuality = useCallback(async () => {
    if (!navigator.onLine) {
      setConnectionQuality('offline');
      return;
    }

    try {
      const startTime = performance.now();
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000),
      });
      const endTime = performance.now();
      const latency = endTime - startTime;

      if (!response.ok) {
        setConnectionQuality('poor');
        return;
      }

      if (latency < 100) setConnectionQuality('excellent');
      else if (latency < 300) setConnectionQuality('good');
      else if (latency < 1000) setConnectionQuality('fair');
      else setConnectionQuality('poor');
    } catch (error) {
      setConnectionQuality('offline');
    }
  }, []);

  // Cache public data (events, sports, etc.)
  const cachePublicData = useCallback(async (data: Partial<PublicOfflineData>) => {
    const newData = { ...publicData, ...data };
    setPublicData(newData);
    
    try {
      localStorage.setItem('public_data', JSON.stringify(newData));
      setLastSyncTime(new Date());
      console.log('✅ Public data cached successfully');
    } catch (error) {
      console.error('❌ Failed to cache public data:', error);
    }
  }, [publicData]);

  // Cache individual pages for offline viewing
  const cachePage = useCallback(async (url: string, content: string) => {
    const updatedPages = {
      ...publicData.cachedPages,
      [url]: {
        content,
        timestamp: Date.now()
      }
    };

    const newData = {
      ...publicData,
      cachedPages: updatedPages
    };

    setPublicData(newData);
    
    try {
      localStorage.setItem('public_data', JSON.stringify(newData));
      console.log('✅ Page cached:', url);
    } catch (error) {
      console.error('❌ Failed to cache page:', error);
    }
  }, [publicData]);

  // Get cached page content
  const getCachedPage = useCallback((url: string): string | null => {
    const cachedPage = publicData.cachedPages[url];
    
    if (!cachedPage) return null;
    
    // Check if cached page is older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    if (cachedPage.timestamp < oneHourAgo) {
      console.log('⚠️ Cached page expired:', url);
      return null;
    }
    
    return cachedPage.content;
  }, [publicData.cachedPages]);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      setPublicData({
        events: [],
        sports: [],
        venues: [],
        matches: [],
        media: [],
        leaderboards: [],
        cachedPages: {}
      });
      
      localStorage.removeItem('public_data');
      console.log('✅ Public cache cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear public cache:', error);
      throw error;
    }
  }, []);

  // Get storage stats
  const getStorageStats = useCallback(async () => {
    try {
      const dataSize = JSON.stringify(publicData).length;
      
      return {
        totalSize: dataSize,
        eventCount: publicData.events.length,
        pageCount: Object.keys(publicData.cachedPages).length,
      };
    } catch (error) {
      console.error('❌ Failed to get public storage stats:', error);
      return { totalSize: 0, eventCount: 0, pageCount: 0 };
    }
  }, [publicData]);

  // Check if we have any cached data
  const hasCachedData = useCallback(() => {
    return publicData.events.length > 0 || 
           publicData.sports.length > 0 || 
           Object.keys(publicData.cachedPages).length > 0;
  }, [publicData]);

  // Network event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      detectConnectionQuality();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial connection check
    setIsOnline(navigator.onLine);
    detectConnectionQuality();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [detectConnectionQuality]);

  // Load cached data on mount
  useEffect(() => {
    try {
      const cachedData = localStorage.getItem('public_data');
      if (cachedData) {
        setPublicData(JSON.parse(cachedData));
        console.log('✅ Public cached data loaded');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load public cached data:', error);
    }
  }, []);

  const value: PublicOfflineContextType = {
    isOnline,
    publicData,
    connectionQuality,
    lastSyncTime,
    cachePublicData,
    cachePage,
    getCachedPage,
    clearCache,
    getStorageStats,
    hasCachedData
  };

  return (
    <PublicOfflineContext.Provider value={value}>
      {children}
    </PublicOfflineContext.Provider>
  );
};

export const usePublicOffline = () => {
  const context = useContext(PublicOfflineContext);
  if (!context) {
    throw new Error('usePublicOffline must be used within PublicOfflineProvider');
  }
  return context;
};