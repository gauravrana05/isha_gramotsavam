'use client';

import { useState, useEffect, useCallback } from 'react';

interface OfflineStorageOptions {
  key: string;
  syncInterval?: number;
}

export const useOfflineStorage = <T>(options: OfflineStorageOptions) => {
  const [data, setData] = useState<T[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load data from localStorage
    try {
      const stored = localStorage.getItem(options.key);
      if (stored) {
        setData(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [options.key]);

  const saveData = useCallback((newData: T[]) => {
    try {
      localStorage.setItem(options.key, JSON.stringify(newData));
      setData(newData);
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  }, [options.key]);

  const addItem = useCallback((item: T) => {
    const newData = [...data, item];
    saveData(newData);
  }, [data, saveData]);

  const removeItem = useCallback((index: number) => {
    const newData = data.filter((_, i) => i !== index);
    saveData(newData);
  }, [data, saveData]);

  const syncData = useCallback(async () => {
    if (!isOnline || syncing) return;
    
    setSyncing(true);
    try {
      // TODO: Implement actual sync logic
      console.log('Syncing offline data...');
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      setSyncing(false);
    }
  }, [isOnline, syncing]);

  return {
    data,
    isOnline,
    syncing,
    addItem,
    removeItem,
    syncData,
    saveData
  };
};
