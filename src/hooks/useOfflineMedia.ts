'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMediaStorage, MediaItemRecord } from '@/lib/services/offline/mediaStorage';

interface MediaOfflineData {
  mediaItems: MediaItemRecord[];
  photos: MediaItemRecord[];
  videos: MediaItemRecord[];
  isLoading: boolean;
  error: string | null;
}

export function useOfflineMedia(venueId: string) {
  const { user } = useAuth();
  const [data, setData] = useState<MediaOfflineData>({
    mediaItems: [],
    photos: [],
    videos: [],
    isLoading: true,
    error: null
  });

  const loadMediaData = useCallback(async () => {
    if (!venueId) return;

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const storage = await getMediaStorage();
      
      const [allMedia, photos, videos] = await Promise.all([
        storage.getVenueMedia(venueId),
        storage.getVenueMedia(venueId, 'image'),
        storage.getVenueMedia(venueId, 'video')
      ]);

      setData(prev => ({
        ...prev,
        mediaItems: allMedia,
        photos,
        videos,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error loading media data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load media data'
      }));
    }
  }, [venueId]);

  const likeMedia = useCallback(async (mediaId: string) => {
    if (!user) return;

    try {
      const storage = await getMediaStorage();
      await storage.likeMedia(mediaId, user.id, `${user.firstName} ${user.lastName}`);
      
      // Update local state optimistically
      const updateMediaItem = (item: MediaItemRecord) => 
        item.id === mediaId 
          ? { 
              ...item, 
              data: { 
                ...item.data, 
                likes: (item.data.likes || 0) + 1,
                isLiked: true 
              } 
            }
          : item;

      setData(prev => ({
        ...prev,
        mediaItems: prev.mediaItems.map(updateMediaItem),
        photos: prev.photos.map(updateMediaItem),
        videos: prev.videos.map(updateMediaItem)
      }));
    } catch (error) {
      console.error('Error liking media:', error);
      throw error;
    }
  }, [user]);

  const unlikeMedia = useCallback(async (mediaId: string) => {
    if (!user) return;

    try {
      const storage = await getMediaStorage();
      await storage.unlikeMedia(mediaId, user.id);
      
      // Update local state optimistically
      const updateMediaItem = (item: MediaItemRecord) => 
        item.id === mediaId 
          ? { 
              ...item, 
              data: { 
                ...item.data, 
                likes: Math.max((item.data.likes || 0) - 1, 0),
                isLiked: false 
              } 
            }
          : item;

      setData(prev => ({
        ...prev,
        mediaItems: prev.mediaItems.map(updateMediaItem),
        photos: prev.photos.map(updateMediaItem),
        videos: prev.videos.map(updateMediaItem)
      }));
    } catch (error) {
      console.error('Error unliking media:', error);
      throw error;
    }
  }, [user]);

  const getCachedMediaUrl = useCallback(async (mediaId: string): Promise<string | null> => {
    try {
      const storage = await getMediaStorage();
      const cachedBlob = await storage.getCachedMediaBlob(mediaId);
      
      if (cachedBlob) {
        return URL.createObjectURL(cachedBlob);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached media:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (venueId) {
      loadMediaData();
    }
  }, [venueId, loadMediaData]);

  return {
    ...data,
    actions: {
      likeMedia,
      unlikeMedia,
      getCachedMediaUrl,
      refresh: loadMediaData
    }
  };
}
