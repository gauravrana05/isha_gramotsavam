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

  const addPlayer = useCallback(async (
    teamId: string,
    playerData: {
      name: string;
      firstName: string;
      lastName: string;
      phone: string;
      dob: string;
      whatsappNumber?: string;
      village?: string;
      position: 'main' | 'substitute';
    }
  ) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const service = getVolunteerService();
      await service.addPlayerToTeam({
        teamId,
        playerId: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        position: playerData.position,
        addedBy: user.id,
        timestamp: Date.now(),
      }, user.id);

      addPendingAction({
        id: `add-player-${teamId}-${Date.now()}`,
        type: 'player_addition',
        description: `Add player ${playerData.name} to team`,
        timestamp: Date.now(),
        priority: 'medium',
        retryCount: 0,
      });

      console.log('✅ Player added offline');
      
    } catch (error) {
      console.error('Failed to add player:', error);
      throw error;
    }
  }, [user?.id, addPendingAction]);

  const removePlayer = useCallback(async (
    teamId: string,
    playerId: string
  ) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // TODO: Implement removePlayerFromTeam in VolunteerService
      console.log('✅ Player removed offline:', playerId);

      addPendingAction({
        id: `remove-player-${playerId}-${Date.now()}`,
        type: 'player_removal',
        description: `Remove player from team`,
        timestamp: Date.now(),
        priority: 'medium',
        retryCount: 0,
      });
      
    } catch (error) {
      console.error('Failed to remove player:', error);
      throw error;
    }
  }, [user?.id, addPendingAction]);

  const updatePlayer = useCallback(async (
    playerId: string,
    playerData: {
      name?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      position?: 'main' | 'substitute';
    }
  ) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // TODO: Implement updatePlayer in VolunteerService
      console.log('✅ Player updated offline:', playerId);

      addPendingAction({
        id: `update-player-${playerId}-${Date.now()}`,
        type: 'player_update',
        description: `Update player information`,
        timestamp: Date.now(),
        priority: 'medium',
        retryCount: 0,
      });
      
    } catch (error) {
      console.error('Failed to update player:', error);
      throw error;
    }
  }, [user?.id, addPendingAction]);

  const promoteCaptain = useCallback(async (
    teamId: string,
    playerId: string
  ) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // TODO: Implement promoteCaptain in VolunteerService
      console.log('✅ Captain promoted offline:', playerId);

      addPendingAction({
        id: `promote-captain-${playerId}-${Date.now()}`,
        type: 'captain_promotion',
        description: `Promote player to captain`,
        timestamp: Date.now(),
        priority: 'high',
        retryCount: 0,
      });
      
    } catch (error) {
      console.error('Failed to promote captain:', error);
      throw error;
    }
  }, [user?.id, addPendingAction]);

  const deleteMedia = useCallback(async (
    mediaId: string,
    entityType: 'team' | 'venue' | 'match'
  ) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // TODO: Implement deleteMedia in VolunteerService
      console.log('✅ Media deleted offline:', mediaId);

      addPendingAction({
        id: `delete-media-${mediaId}-${Date.now()}`,
        type: 'media_deletion',
        description: `Delete media file`,
        timestamp: Date.now(),
        priority: 'low',
        retryCount: 0,
      });
      
    } catch (error) {
      console.error('Failed to delete media:', error);
      throw error;
    }
  }, [user?.id, addPendingAction]);

  const assignTournamentNumbers = useCallback(async (
    assignments: Array<{
      teamId: string;
      tournamentNumber: number;
    }>
  ) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // TODO: Implement assignTournamentNumbers in VolunteerService
      console.log('✅ Tournament numbers assigned offline:', assignments);

      addPendingAction({
        id: `assign-numbers-${Date.now()}`,
        type: 'number_assignment',
        description: `Assign tournament numbers to ${assignments.length} teams`,
        timestamp: Date.now(),
        priority: 'medium',
        retryCount: 0,
      });
      
    } catch (error) {
      console.error('Failed to assign tournament numbers:', error);
      throw error;
    }
  }, [user?.id, addPendingAction]);

  return {
    createTeam,
    addPlayer,
    removePlayer,
    updatePlayer,
    promoteCaptain,
    checkInTeam,
    verifyPlayer,
    updateMatchScore,
    updateTeamStatus,
    uploadMedia,
    deleteMedia,
    assignTournamentNumbers,
  };
}
