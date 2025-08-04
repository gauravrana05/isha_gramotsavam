'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLoadingContext } from '@/context/LoadingContext';

interface UseLoadingOptions {
  key?: string;
  timeout?: number;
  onTimeout?: () => void;
  autoStop?: boolean;
}

interface UseLoadingReturn {
  loading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
  toggleLoading: () => void;
}

export const useLoading = (options: UseLoadingOptions = {}): UseLoadingReturn => {
  const { 
    key, 
    timeout, 
    onTimeout, 
    autoStop = true 
  } = options;

  const loadingContext = useLoadingContext();
  const [localLoading, setLocalLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingKey = key || `loading-${Math.random().toString(36).substr(2, 9)}`;

  // Use global loading state if key is provided, otherwise use local state
  const loading = key ? loadingContext.isLoading(key) : localLoading;

  const startLoading = useCallback(() => {
    if (key) {
      loadingContext.startLoading(key);
    } else {
      setLocalLoading(true);
    }

    // Set timeout if specified
    if (timeout) {
      timeoutRef.current = setTimeout(() => {
        if (key) {
          loadingContext.stopLoading(key);
        } else {
          setLocalLoading(false);
        }
        onTimeout?.();
      }, timeout);
    }
  }, [key, loadingContext, timeout, onTimeout]);

  const stopLoading = useCallback(() => {
    if (key) {
      loadingContext.stopLoading(key);
    } else {
      setLocalLoading(false);
    }

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [key, loadingContext]);

  const toggleLoading = useCallback(() => {
    if (loading) {
      stopLoading();
    } else {
      startLoading();
    }
  }, [loading, startLoading, stopLoading]);

  const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      startLoading();
      const result = await fn();
      return result;
    } catch (error) {
      throw error;
    } finally {
      if (autoStop) {
        stopLoading();
      }
    }
  }, [startLoading, stopLoading, autoStop]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    loading,
    startLoading,
    stopLoading,
    withLoading,
    toggleLoading
  };
};

// Hook for managing multiple loading states
export const useMultipleLoading = () => {
  const loadingContext = useLoadingContext();
  
  const withLoading = useCallback(async <T>(
    key: string, 
    fn: () => Promise<T>,
    options: { autoStop?: boolean } = {}
  ): Promise<T> => {
    const { autoStop = true } = options;
    
    try {
      loadingContext.startLoading(key);
      const result = await fn();
      return result;
    } catch (error) {
      throw error;
    } finally {
      if (autoStop) {
        loadingContext.stopLoading(key);
      }
    }
  }, [loadingContext]);

  return {
    ...loadingContext,
    withLoading
  };
};

// Hook for async operations with loading state
export const useAsyncLoading = <T, P extends any[]>(
  asyncFunction: (...args: P) => Promise<T>,
  options: UseLoadingOptions = {}
) => {
  const { loading, withLoading } = useLoading(options);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (...args: P) => {
    try {
      setError(null);
      const result = await withLoading(() => asyncFunction(...args));
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred');
      setError(error);
      throw error;
    }
  }, [asyncFunction, withLoading]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    loading,
    data,
    error,
    execute,
    reset
  };
};