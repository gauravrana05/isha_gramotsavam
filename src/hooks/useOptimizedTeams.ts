import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';
import { usePerformanceOptimization } from './usePerformanceOptimization';
import { PaginationConfig } from '@/lib/services/offline/performanceService';

export interface UseOptimizedTeamsOptions {
  enablePagination?: boolean;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  preloadData?: boolean;
}

/**
 * Performance-optimized hook for managing teams data with pagination and caching
 */
export function useOptimizedTeams(venueId: string, options: UseOptimizedTeamsOptions = {}) {
  const { user } = useAuth();
  const { getPaginatedData, preloadCriticalData, getCachedData, cacheData } = usePerformanceOptimization();
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  const {
    enablePagination = false,
    pageSize = 20,
    sortBy = 'name',
    sortOrder = 'asc',
    preloadData = true
  } = options;

  // API fallback for teams data
  const { 
    data: apiTeams, 
    isLoading: apiLoading,
    error: apiError,
    refetch: refetchApi
  } = api.volunteers.venue.getVenueTeams.useQuery(
    { venueId },
    { 
      enabled: !!venueId && !!user?.id,
      retry: false 
    }
  );

  const loadTeams = useCallback(async (page: number = 1) => {
    if (!user?.id || !venueId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Check cache first for better performance
      const cacheKey = `teams_${venueId}_${page}_${pageSize}`;
      const cachedData = getCachedData(cacheKey, 300000); // 5min cache
      
      if (cachedData && !apiLoading) {
        setTeams(cachedData.data || cachedData);
        if (cachedData.pagination) setPagination(cachedData.pagination);
        console.log('⚡ Using cached teams data');
        setIsLoading(false);
        return;
      }

      if (enablePagination) {
        // Use paginated loading for better performance
        const paginationConfig: PaginationConfig = {
          page,
          limit: pageSize,
          sortBy,
          sortOrder
        };

        const result = await getPaginatedData('teams', venueId, paginationConfig);
        setTeams(result.data.map(t => t.data || t));
        setPagination(result.pagination);
        
        // Cache the result
        await cacheData(cacheKey, result, 300000);
        console.log(`📄 Loaded page ${page} with ${result.data.length} teams`);
        
      } else {
        // Prefer API data when available (has complete relations)
        if (apiTeams?.length) {
          setTeams(apiTeams);
          console.log('✅ Using API teams data with relations');
          
          // Cache API data
          await cacheData(`teams_${venueId}_full`, apiTeams, 300000);
        } else {
          // Fallback to offline storage
          const service = getVolunteerService();
          const teamsData = await service.getTeamsForVenue(venueId, user.id);
          const mappedTeams = teamsData.map(t => t.data || t);
          setTeams(mappedTeams);
          console.log('📱 Using offline teams data');
        }
      }
      
    } catch (err) {
      console.error('Failed to load teams:', err);
      // Final fallback to API data on error
      if (apiTeams?.length) {
        setTeams(apiTeams);
      }
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, venueId, apiTeams, enablePagination, pageSize, sortBy, sortOrder, getPaginatedData, getCachedData, cacheData, apiLoading]);

  // Preload data in background for better performance
  useEffect(() => {
    if (preloadData && user?.id && venueId) {
      preloadCriticalData(venueId);
    }
  }, [preloadData, user?.id, venueId, preloadCriticalData]);

  useEffect(() => {
    loadTeams(currentPage);
  }, [loadTeams, currentPage]);

  const refetch = useCallback(async () => {
    await Promise.all([
      loadTeams(currentPage),
      refetchApi()
    ]);
  }, [loadTeams, currentPage, refetchApi]);

  const goToPage = useCallback((page: number) => {
    if (enablePagination && pagination && page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  }, [enablePagination, pagination]);

  const nextPage = useCallback(() => {
    if (pagination?.hasNext) {
      setCurrentPage(prev => prev + 1);
    }
  }, [pagination]);

  const prevPage = useCallback(() => {
    if (pagination?.hasPrev) {
      setCurrentPage(prev => prev - 1);
    }
  }, [pagination]);

  return {
    teams,
    isLoading: isLoading || apiLoading,
    error: error || apiError,
    refetch,
    // Pagination controls
    pagination,
    currentPage,
    goToPage,
    nextPage,
    prevPage,
    // Performance info
    isPaginated: enablePagination,
  };
}
