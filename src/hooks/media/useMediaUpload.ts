'use client';

import { useState, useCallback } from 'react';
import { clientMediaUploadService } from '@/lib/services/clientMediaService';
import { useAuth } from '@/context/AuthContext';
import { 
  MediaMetadata, 
  MediaUploadProgress, 
  MediaUploadResult, 
  MediaBatchUploadResult 
} from '@/lib/types/media';

interface MediaUploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  results: MediaUploadResult[];
}

interface UseMediaUploadReturn {
  uploadState: MediaUploadState;
  uploadFixtureMedia: (
    fixtureId: string,
    venueId: string,
    file: File,
    metadata: MediaMetadata
  ) => Promise<MediaUploadResult>;
  uploadMatchMedia: (
    matchId: string,
    venueId: string,
    file: File,
    metadata: MediaMetadata
  ) => Promise<MediaUploadResult>;
  uploadVenueMedia: (
    venueId: string,
    file: File,
    metadata: MediaMetadata
  ) => Promise<MediaUploadResult>;
  uploadMultipleMedia: (
    uploads: Array<{
      file: File;
      metadata: MediaMetadata;
      context: { type: 'fixture'; fixtureId: string; venueId: string } | 
               { type: 'match'; matchId: string; venueId: string } |
               { type: 'venue'; venueId: string };
    }>
  ) => Promise<MediaBatchUploadResult>;
  resetUploadState: () => void;
}

export const useMediaUpload = (): UseMediaUploadReturn => {
  const { user, userProfile } = useAuth();
  
  const [uploadState, setUploadState] = useState<MediaUploadState>({
    uploading: false,
    progress: 0,
    error: null,
    results: []
  });

  const resetUploadState = useCallback(() => {
    setUploadState({
      uploading: false,
      progress: 0,
      error: null,
      results: []
    });
  }, []);

  const handleProgress = useCallback((progress: MediaUploadProgress) => {
    setUploadState(prev => ({
      ...prev,
      progress: progress.progress
    }));
  }, []);

  const uploadFixtureMedia = useCallback(async (
    fixtureId: string,
    venueId: string,
    file: File,
    metadata: MediaMetadata
  ): Promise<MediaUploadResult> => {
    if (!user || !userProfile) {
      return { success: false, error: 'User not authenticated' };
    }

    if (userProfile.role !== 'technical_volunteer' && userProfile.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' };
    }

    setUploadState(prev => ({
      ...prev,
      uploading: true,
      error: null,
      progress: 0
    }));

    try {
      const result = await clientMediaUploadService.uploadFixtureMedia(
        fixtureId,
        venueId,
        file,
        metadata,
        user.uid,
        userProfile.firstName + ' ' + userProfile.lastName,
        handleProgress
      );

      setUploadState(prev => ({
        ...prev,
        uploading: false,
        results: [...prev.results, result],
        error: result.success ? null : result.error || 'Upload failed'
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        error: errorMessage
      }));
      
      return { success: false, error: errorMessage };
    }
  }, [user, userProfile, handleProgress]);

  const uploadMatchMedia = useCallback(async (
    matchId: string,
    venueId: string,
    file: File,
    metadata: MediaMetadata
  ): Promise<MediaUploadResult> => {
    if (!user || !userProfile) {
      return { success: false, error: 'User not authenticated' };
    }

    if (userProfile.role !== 'technical_volunteer' && userProfile.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' };
    }

    setUploadState(prev => ({
      ...prev,
      uploading: true,
      error: null,
      progress: 0
    }));

    try {
      const result = await clientMediaUploadService.uploadMatchMedia(
        matchId,
        venueId,
        file,
        metadata,
        user.uid,
        userProfile.firstName + ' ' + userProfile.lastName,
        handleProgress
      );

      setUploadState(prev => ({
        ...prev,
        uploading: false,
        results: [...prev.results, result],
        error: result.success ? null : result.error || 'Upload failed'
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        error: errorMessage
      }));
      
      return { success: false, error: errorMessage };
    }
  }, [user, userProfile, handleProgress]);

  const uploadVenueMedia = useCallback(async (
    venueId: string,
    file: File,
    metadata: MediaMetadata
  ): Promise<MediaUploadResult> => {
    if (!user || !userProfile) {
      return { success: false, error: 'User not authenticated' };
    }

    if (userProfile.role !== 'technical_volunteer' && userProfile.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' };
    }

    setUploadState(prev => ({
      ...prev,
      uploading: true,
      error: null,
      progress: 0
    }));

    try {
      const result = await clientMediaUploadService.uploadVenueMedia(
        venueId,
        file,
        metadata,
        user.uid,
        userProfile.firstName + ' ' + userProfile.lastName,
        handleProgress
      );

      setUploadState(prev => ({
        ...prev,
        uploading: false,
        results: [...prev.results, result],
        error: result.success ? null : result.error || 'Upload failed'
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        error: errorMessage
      }));
      
      return { success: false, error: errorMessage };
    }
  }, [user, userProfile, handleProgress]);

  const uploadMultipleMedia = useCallback(async (
    uploads: Array<{
      file: File;
      metadata: MediaMetadata;
      context: { type: 'fixture'; fixtureId: string; venueId: string } | 
               { type: 'match'; matchId: string; venueId: string } |
               { type: 'venue'; venueId: string };
    }>
  ): Promise<MediaBatchUploadResult> => {
    if (!user || !userProfile) {
      return { 
        success: false, 
        uploadedCount: 0, 
        failedCount: uploads.length, 
        results: [],
        errors: ['User not authenticated'] 
      };
    }

    if (userProfile.role !== 'technical_volunteer' && userProfile.role !== 'admin') {
      return { 
        success: false, 
        uploadedCount: 0, 
        failedCount: uploads.length, 
        results: [],
        errors: ['Insufficient permissions'] 
      };
    }

    setUploadState(prev => ({
      ...prev,
      uploading: true,
      error: null,
      progress: 0
    }));

    try {
      const result = await clientMediaUploadService.uploadMultipleMedia(
        uploads,
        user.uid,
        userProfile.firstName + ' ' + userProfile.lastName,
        (overall, current) => {
          setUploadState(prev => ({
            ...prev,
            progress: overall
          }));
        }
      );

      setUploadState(prev => ({
        ...prev,
        uploading: false,
        results: [...prev.results, ...result.results],
        error: result.success ? null : result.errors?.join(', ') || 'Some uploads failed'
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch upload failed';
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        error: errorMessage
      }));
      
      return { 
        success: false, 
        uploadedCount: 0, 
        failedCount: uploads.length, 
        results: [],
        errors: [errorMessage] 
      };
    }
  }, [user, userProfile]);

  return {
    uploadState,
    uploadFixtureMedia,
    uploadMatchMedia,
    uploadVenueMedia,
    uploadMultipleMedia,
    resetUploadState
  };
};