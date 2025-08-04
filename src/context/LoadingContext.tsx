'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LoadingState {
  [key: string]: boolean;
}

interface LoadingContextType {
  loading: LoadingState;
  isLoading: (key?: string) => boolean;
  setLoading: (key: string, value: boolean) => void;
  startLoading: (key: string) => void;
  stopLoading: (key: string) => void;
  clearAllLoading: () => void;
  isAnyLoading: () => boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [loading, setLoadingState] = useState<LoadingState>({});

  const isLoading = useCallback((key?: string): boolean => {
    if (!key) return Object.values(loading).some(Boolean);
    return loading[key] || false;
  }, [loading]);

  const setLoading = useCallback((key: string, value: boolean) => {
    setLoadingState(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const startLoading = useCallback((key: string) => {
    setLoading(key, true);
  }, [setLoading]);

  const stopLoading = useCallback((key: string) => {
    setLoading(key, false);
  }, [setLoading]);

  const clearAllLoading = useCallback(() => {
    setLoadingState({});
  }, []);

  const isAnyLoading = useCallback((): boolean => {
    return Object.values(loading).some(Boolean);
  }, [loading]);

  const value: LoadingContextType = {
    loading,
    isLoading,
    setLoading,
    startLoading,
    stopLoading,
    clearAllLoading,
    isAnyLoading
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoadingContext = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoadingContext must be used within a LoadingProvider');
  }
  return context;
};