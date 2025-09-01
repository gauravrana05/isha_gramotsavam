'use client';

import { useCaptainOffline } from '@/context/CaptainOfflineContext';
import { useCallback } from 'react';

export const useCaptainOfflineActions = () => {
  const { queueCaptainAction, cacheCaptainData, isOnline } = useCaptainOffline();

  const updateTeamOffline = useCallback(async (teamData: any) => {
    // Cache immediately
    await cacheCaptainData({ team: teamData });
    
    // Queue for sync
    await queueCaptainAction({
      type: 'team_update',
      data: teamData
    });
  }, [queueCaptainAction, cacheCaptainData]);

  const invitePlayerOffline = useCallback(async (inviteData: any) => {
    await queueCaptainAction({
      type: 'player_invite',
      data: inviteData
    });
  }, [queueCaptainAction]);

  const uploadTeamMediaOffline = useCallback(async (mediaData: any) => {
    // Add to cached media
    await cacheCaptainData({ 
      media: [...(await cacheCaptainData).media || [], mediaData] 
    });
    
    await queueCaptainAction({
      type: 'media_upload',
      data: mediaData
    });
  }, [queueCaptainAction, cacheCaptainData]);

  const sendTeamCommunicationOffline = useCallback(async (communicationData: any) => {
    // Cache immediately for offline viewing
    await cacheCaptainData({ 
      communications: [...(await cacheCaptainData).communications || [], communicationData] 
    });
    
    await queueCaptainAction({
      type: 'team_communication',
      data: communicationData
    });
  }, [queueCaptainAction, cacheCaptainData]);

  const submitMatchResultOffline = useCallback(async (matchResult: any) => {
    await queueCaptainAction({
      type: 'match_result',
      data: matchResult
    });
  }, [queueCaptainAction]);

  return {
    updateTeamOffline,
    invitePlayerOffline,
    uploadTeamMediaOffline,
    sendTeamCommunicationOffline,
    submitMatchResultOffline,
    isOnline
  };
};
