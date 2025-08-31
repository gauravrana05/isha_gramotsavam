import { useCallback } from 'react';
import { useOffline } from '@/context/OfflineContextWrapper';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

export const useVolunteerActions = (venueId: string) => {
  const { queueSyncAction, queueMediaUpload, isOnline } = useOffline();
  const { user } = useAuth();
  const { addNotification } = useNotification();

  // Team check-in
  const checkInTeam = useCallback(async (teamId: string) => {
    if (!user) return;

    try {
      await queueSyncAction({
        type: 'team_checkin',
        priority: 'critical',
        payload: {
          teamId,
          venueId,
          checkedInBy: user.id,
          checkedInAt: Date.now()
        },
        userId: user.id,
        maxRetries: 5
      });

      const message = isOnline 
        ? 'Team checked in successfully' 
        : 'Team check-in queued for sync';
      addNotification(message, 'success');
    } catch (error) {
      addNotification('Failed to check in team', 'error');
    }
  }, [user, venueId, queueSyncAction, isOnline, addNotification]);

  // Player verification
  const verifyPlayer = useCallback(async (playerId: string, status: string, teamId?: string) => {
    if (!user) return;

    try {
      await queueSyncAction({
        type: 'player_verification',
        priority: 'high',
        payload: {
          playerId,
          status,
          teamId,
          venueId,
          verifiedBy: user.id,
          verifiedAt: Date.now()
        },
        userId: user.id,
        maxRetries: 3
      });

      const message = isOnline 
        ? `Player ${status} successfully` 
        : `Player ${status} queued for sync`;
      addNotification(message, 'success');
    } catch (error) {
      addNotification('Failed to verify player', 'error');
    }
  }, [user, venueId, queueSyncAction, isOnline, addNotification]);

  // Match score update
  const updateMatchScore = useCallback(async (matchId: string, scoreData: any) => {
    if (!user) return;

    try {
      await queueSyncAction({
        type: 'match_score',
        priority: 'critical',
        payload: {
          matchId,
          venueId,
          scoreData,
          updatedBy: user.id,
          updatedAt: Date.now()
        },
        userId: user.id,
        maxRetries: 5
      });

      const message = isOnline 
        ? 'Match score updated successfully' 
        : 'Match score queued for sync';
      addNotification(message, 'success');
    } catch (error) {
      addNotification('Failed to update match score', 'error');
    }
  }, [user, venueId, queueSyncAction, isOnline, addNotification]);

  // Media upload
  const uploadMedia = useCallback(async (file: File, metadata: any) => {
    if (!user) return;

    try {
      const uploadId = await queueMediaUpload(file, {
        userId: user.id,
        venueId,
        ...metadata
      });

      const message = isOnline 
        ? 'Media upload started' 
        : 'Media queued for upload';
      addNotification(message, 'success');
      
      return uploadId;
    } catch (error) {
      addNotification('Failed to queue media upload', 'error');
    }
  }, [user, venueId, queueMediaUpload, isOnline, addNotification]);

  return {
    checkInTeam,
    verifyPlayer,
    updateMatchScore,
    uploadMedia,
    isOnline
  };
};

export default useVolunteerActions;
