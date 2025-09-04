import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContext';
import { getVolunteerService } from '@/lib/services/offline/volunteerService';

export function useOfflineActions() {
  const { user } = useAuth();
  const { addPendingAction } = useOffline();

  const checkInTeam = useCallback(async (teamId: string, notes?: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const service = getVolunteerService();
      await service.checkInTeam({
        teamId,
        checkedInBy: user.id,
        timestamp: Date.now(),
        notes,
      }, user.id);

      // Add to pending actions for sync
      addPendingAction({
        id: `checkin-${teamId}-${Date.now()}`,
        type: 'team_checkin',
        description: `Check in team ${teamId}`,
        timestamp: Date.now(),
        priority: 'high',
        retryCount: 0,
      });

      console.log('✅ Team checked in offline');
      
    } catch (error) {
      console.error('Failed to check in team:', error);
      throw error;
    }
  }, [user?.id, addPendingAction]);

  const verifyPlayer = useCallback(async (
    playerId: string, 
    status: 'verified' | 'rejected',
    notes?: string
  ) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const service = getVolunteerService();
      await service.verifyPlayer({
        playerId,
        status,
        verifiedBy: user.id,
        timestamp: Date.now(),
        notes,
      }, user.id);

      addPendingAction({
        id: `verify-${playerId}-${Date.now()}`,
        type: 'player_verification',
        description: `${status} player ${playerId}`,
        timestamp: Date.now(),
        priority: 'high',
        retryCount: 0,
      });

      console.log('✅ Player verification updated offline');
      
    } catch (error) {
      console.error('Failed to verify player:', error);
      throw error;
    }
  }, [user?.id, addPendingAction]);

  const updateMatchScore = useCallback(async (
    matchId: string, 
    teamScores: { teamId: string; score: number }[]
  ) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const service = getVolunteerService();
      await service.updateMatchScore({
        matchId,
        teamScores,
        updatedBy: user.id,
        timestamp: Date.now(),
      }, user.id);

      addPendingAction({
        id: `score-${matchId}-${Date.now()}`,
        type: 'match_score',
        description: `Update score for match ${matchId}`,
        timestamp: Date.now(),
        priority: 'high',
        retryCount: 0,
      });

      console.log('✅ Match score updated offline');
      
    } catch (error) {
      console.error('Failed to update match score:', error);
      throw error;
    }
  }, [user?.id, addPendingAction]);

  const updateTeamStatus = useCallback(async (
    teamId: string,
    status: string,
    notes?: string
  ) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const service = getVolunteerService();
      await service.updateTeamStatus({
        teamId,
        status,
        updatedBy: user.id,
        timestamp: Date.now(),
        notes,
      }, user.id);

      addPendingAction({
        id: `team-status-${teamId}-${Date.now()}`,
        type: 'team_status',
        description: `Update team ${teamId} status to ${status}`,
        timestamp: Date.now(),
        priority: 'high',
        retryCount: 0,
      });

      console.log('✅ Team status updated offline');
      
    } catch (error) {
      console.error('Failed to update team status:', error);
      throw error;
    }
  }, [user?.id, addPendingAction]);

  const uploadMedia = useCallback(async (
    file: File,
    type: 'team_photo' | 'match_photo' | 'venue_photo',
    entityId: string
  ) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const service = getVolunteerService();
      await service.queueMediaUpload({
        file,
        type,
        entityId,
        uploadedBy: user.id,
        timestamp: Date.now(),
      }, user.id);

      addPendingAction({
        id: `media-${entityId}-${Date.now()}`,
        type: 'media_upload',
        description: `Upload ${type} for ${entityId}`,
        timestamp: Date.now(),
        priority: 'medium',
        retryCount: 0,
      });

      console.log('✅ Media queued for upload');
      
    } catch (error) {
      console.error('Failed to queue media upload:', error);
      throw error;
    }
  }, [user?.id, addPendingAction]);

  const createTeam = useCallback(async (
    teamData: {
      name: string;
      sportId: string;
      venueId: string;
      captainId: string;
      description?: string;
      players?: any[];
    }
  ) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const service = getVolunteerService();
      const newTeam = await service.createTeam({
        ...teamData,
        createdBy: user.id,
        timestamp: Date.now(),
      }, user.id);

      addPendingAction({
        id: `create-team-${newTeam.id}-${Date.now()}`,
        type: 'team_creation',
        description: `Create team ${teamData.name}`,
        timestamp: Date.now(),
        priority: 'high',
        retryCount: 0,
      });

      console.log('✅ Team created offline');
      return newTeam;
      
    } catch (error) {
      console.error('Failed to create team:', error);
      throw error;
    }
  }, [user?.id, addPendingAction]);

  return {
    createTeam,
    checkInTeam,
    verifyPlayer,
    updateMatchScore,
    updateTeamStatus,
    uploadMedia,
  };
}
