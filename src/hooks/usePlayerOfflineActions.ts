'use client';

import { usePlayerOffline } from '@/context/PlayerOfflineContext';
import { useCallback } from 'react';

export const usePlayerOfflineActions = () => {
  const { queuePlayerAction, cachePlayerData, isOnline } = usePlayerOffline();

  const updateProfileOffline = useCallback(async (profileData: any) => {
    // Cache the data immediately for offline viewing
    await cachePlayerData({ profile: profileData });
    
    // Queue the action for sync when online
    await queuePlayerAction({
      type: 'profile_update',
      data: profileData
    });
  }, [queuePlayerAction, cachePlayerData]);

  const uploadMediaOffline = useCallback(async (mediaData: any) => {
    // Add to cached media
    await cachePlayerData({ 
      media: [...(await cachePlayerData).media || [], mediaData] 
    });
    
    // Queue for upload
    await queuePlayerAction({
      type: 'media_upload',
      data: mediaData
    });
  }, [queuePlayerAction, cachePlayerData]);

  const respondToTeamOffline = useCallback(async (teamResponse: any) => {
    await queuePlayerAction({
      type: 'team_response',
      data: teamResponse
    });
  }, [queuePlayerAction]);

  const markNotificationReadOffline = useCallback(async (notificationId: string) => {
    await queuePlayerAction({
      type: 'notification_read',
      data: { notificationId }
    });
  }, [queuePlayerAction]);

  return {
    updateProfileOffline,
    uploadMediaOffline,
    respondToTeamOffline,
    markNotificationReadOffline,
    isOnline
  };
};
