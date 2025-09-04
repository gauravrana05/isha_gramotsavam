import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';
import { api } from '@/server/trpc/react';
import React from 'react';
export function useOfflineTeams(venueId?: string) {
  console.log('🏒 [useOfflineTeams] Hook called with venueId:', venueId);
  
  const { user } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Circuit breaker to prevent infinite loops
  const loadAttempts = React.useRef(0);
  const lastLoadTime = React.useRef(0);
  
  console.log('🏒 [useOfflineTeams] Current state:', {
    venueId,
    userId: user?.id,
    isLoading,
    teamsCount: teams.length,
    loadAttempts: loadAttempts.current
  });

  // Fallback to API when offline storage is empty
  const { data: apiTeams, refetch: refetchApiTeams } = api.volunteers.venue.getVenueTeams.useQuery(
    { venueId: venueId! },
    { 
      enabled: !!venueId && !!user?.id,
      retry: false 
    }
  );

  const loadTeams = useCallback(async () => {
    const now = Date.now();
    
    // Circuit breaker: prevent excessive loading attempts
    if (loadAttempts.current > 5 && (now - lastLoadTime.current) < 5000) {
      console.warn('🚨 [useOfflineTeams] Circuit breaker triggered - too many load attempts');
      setIsLoading(false);
      setError(new Error('Too many load attempts, circuit breaker activated'));
      return;
    }
    
    loadAttempts.current++;
    lastLoadTime.current = now;
    
    console.log('🏒 [useOfflineTeams] loadTeams called:', { venueId, userId: user?.id, loadAttempt: loadAttempts.current });
    
    if (!venueId || !user?.id) {
      console.log('🏒 [useOfflineTeams] Missing venueId or userId, stopping');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🏒 [useOfflineTeams] Starting teams load');
      setIsLoading(true);
      setError(null);
      
      // Try offline storage first (offline-first approach)
      const service = getVolunteerService();
      let teamsData = [];
      
      try {
        console.log('🏒 [useOfflineTeams] Trying offline storage');
        const offlineTeams = await service.getTeamsForVenue(venueId, user.id);
        teamsData = offlineTeams.map(t => t.data || t);
        console.log('🏒 [useOfflineTeams] Offline storage returned:', teamsData.length, 'teams');
        
        if (teamsData.length > 0) {
          setTeams(teamsData);
          console.log('✅ Using offline teams data:', teamsData.length, 'teams');
          // Don't return early - let finally block run
        } else {
          console.log('🏒 [useOfflineTeams] No offline data, trying API fallback');
          // No offline data - set empty for now, API fallback handled separately
          console.log('🏒 [useOfflineTeams] No offline data, setting empty (API fallback separate)');
          setTeams([]);
          console.log('ℹ️ No offline teams data available');
        }
      } catch (offlineError) {
        console.log('🏒 [useOfflineTeams] Offline storage error:', offlineError);
        console.log('📱 No offline teams data available');
        
        // Offline storage failed - set empty, API fallback handled separately
        setTeams([]);
        console.log('ℹ️ No teams data available (offline failed)');
      }
      
    } catch (err) {
      console.log('🏒 [useOfflineTeams] Load failed with error:', err);
      console.error('Failed to load teams:', err);
      setError(err as Error);
    } finally {
      console.log('🏒 [useOfflineTeams] Setting isLoading to false');
      setIsLoading(false);
    }
  }, [venueId, user?.id]);

  // Initial load effect - stable dependencies to prevent loops
  useEffect(() => {
    console.log('🏒 [useOfflineTeams] useEffect triggered:', { venueId, userId: user?.id, hasApiTeams: !!apiTeams?.length });
    if (venueId && user?.id) {
      console.log('🏒 [useOfflineTeams] Calling loadTeams');
      loadTeams();
    }
  }, [venueId, user?.id]); // FIXED: Only stable dependencies, removed loadTeams

  // Separate API fallback effect
  useEffect(() => {
    console.log('🏒 [useOfflineTeams] API fallback effect:', { hasApiTeams: !!apiTeams?.length, teamsCount: teams.length });
    
    // Only use API fallback if we have API data but no teams yet
    if (apiTeams?.length && teams.length === 0) {
      console.log('🏒 [useOfflineTeams] Using API fallback data:', apiTeams.length, 'teams');
      setTeams(apiTeams);
      setIsLoading(false);
      
      // Cache API response for future offline use
      const cacheApiData = async () => {
        try {
          const service = getVolunteerService();
          for (const team of apiTeams) {
            await service.cacheTeamData(user?.id!, { ...team, venueId });
          }
          console.log('💾 Cached API teams data for offline use');
        } catch (cacheError) {
          console.warn('Failed to cache teams data:', cacheError);
        }
      };
      
      if (user?.id) {
        cacheApiData();
      }
    }
  }, [apiTeams]); // FIXED: Only depend on apiTeams array reference, not length

  const refetch = useCallback(async () => {
    await refetchApiTeams();
    await loadTeams();
  }, [refetchApiTeams, loadTeams]);

  return {
    teams,
    isLoading,
    error,
    refetch,
  };
}

export function useOfflineTeamDetails(teamId?: string) {
  const { user } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fallback to API when offline storage doesn't have the team
  const { data: apiTeamData, refetch: refetchApiTeam } = api.volunteers.venue.getTeamDetails.useQuery(
    { teamId: teamId! },
    { 
      enabled: !!teamId && !!user?.id,
      retry: false 
    }
  );

  const loadTeamDetails = useCallback(async () => {
    if (!teamId || !user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Prefer API data when available (has complete relations)
      if (apiTeamData) {
        setTeam(apiTeamData);
        setPlayers(apiTeamData.teamPlayers || []);
        console.log('✅ Using API team details with relations');
      } else {
        // Fallback to offline storage
        const service = getVolunteerService();
        const [teamData, playersData] = await Promise.all([
          service.getTeam(teamId, user.id),
          service.getPlayersForTeam(teamId, user.id),
        ]);
        
        setTeam(teamData);
        setPlayers(playersData);
        console.log('📱 Using offline team details');
      }
      
    } catch (err) {
      console.error('Failed to load team details:', err);
      // Final fallback to API data on error
      if (apiTeamData) {
        setTeam(apiTeamData);
        setPlayers(apiTeamData.teamPlayers || []);
      }
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, user?.id, apiTeamData]);

  useEffect(() => {
    loadTeamDetails();
  }, [loadTeamDetails]);

  const refetch = useCallback(async () => {
    await refetchApiTeam();
    await loadTeamDetails();
  }, [refetchApiTeam, loadTeamDetails]);

  return {
    team,
    players: players,
    isLoading,
    error,
    refetch,
  };
}
