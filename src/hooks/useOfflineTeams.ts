import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';
import { api } from '@/server/trpc/react';

export function useOfflineTeams(venueId?: string) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fallback to API when offline storage is empty
  const { data: apiTeams, refetch: refetchApiTeams } = api.volunteers.venue.getVenueTeams.useQuery(
    { venueId: venueId! },
    { 
      enabled: !!venueId && !!user?.id,
      retry: false 
    }
  );

  const loadTeams = useCallback(async () => {
    if (!venueId || !user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Try offline storage first (offline-first approach)
      const service = getVolunteerService();
      let teamsData = [];
      
      try {
        const offlineTeams = await service.getTeamsForVenue(venueId, user.id);
        teamsData = offlineTeams.map(t => t.data || t);
        
        if (teamsData.length > 0) {
          setTeams(teamsData);
          console.log('✅ Using offline teams data:', teamsData.length, 'teams');
          // Don't return early - let finally block run
        } else {
          // Try API fallback
          if (apiTeams?.length) {
            setTeams(apiTeams);
            console.log('✅ Using API teams data with relations');
            
            // Cache API response for future offline use
            try {
              for (const team of apiTeams) {
                await service.cacheTeamData(user.id, { ...team, venueId });
              }
              console.log('💾 Cached API teams data for offline use');
            } catch (cacheError) {
              console.warn('Failed to cache teams data:', cacheError);
            }
          } else {
            // No data available
            setTeams([]);
            console.log('ℹ️ No teams data available');
          }
        }
      } catch (offlineError) {
        console.log('📱 No offline teams data available');
        
        // Fallback to API data when offline storage fails
        if (apiTeams?.length) {
          setTeams(apiTeams);
          console.log('✅ Using API teams data (offline failed)');
          
          // Cache API response for future offline use
          try {
            for (const team of apiTeams) {
              await service.cacheTeamData(user.id, { ...team, venueId });
            }
            console.log('💾 Cached API teams data for offline use');
          } catch (cacheError) {
            console.warn('Failed to cache teams data:', cacheError);
          }
        } else {
          // No data available
          setTeams([]);
          console.log('ℹ️ No teams data available (offline failed, no API)');
        }
      }
      
    } catch (err) {
      console.error('Failed to load teams:', err);
      // Final fallback to API data on error
      if (apiTeams?.length) {
        setTeams(apiTeams);
        console.log('✅ Using API teams data (error fallback)');
      }
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [venueId, user?.id, apiTeams]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

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
