import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';
import { useOffline } from '@/context/OfflineContext';

export function useOfflineBase<T>(
  serviceMethod: string,
  params: any = {},
  options: {
    enabled?: boolean;
    refreshInterval?: number;
    backgroundSync?: boolean;
  } = {}
) {
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const { enabled = true, refreshInterval, backgroundSync = true } = options;

  useEffect(() => {
    if (!enabled || !user?.id) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setError(null);
        const service = getVolunteerService();
        
        // Always try offline storage first
        const result = await (service as any)[serviceMethod](
          ...Object.values(params),
          user.id
        );
        
        setData(result);
        setLastUpdated(Date.now());
        
        // Background sync if online
        if (isOnline && backgroundSync) {
          setTimeout(() => syncInBackground(), 100);
        }
        
      } catch (err) {
        console.error(`Hook ${serviceMethod} error:`, err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    const syncInBackground = async () => {
      try {
        // This would trigger API call to refresh cache
        // Implementation depends on specific service method
      } catch (error) {
        console.warn('Background sync failed:', error);
      }
    };

    loadData();
  }, [enabled, user?.id, JSON.stringify(params), serviceMethod, isOnline, backgroundSync]);

  return { data, isLoading, error, lastUpdated };
}
