'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, startAfter, getDocs, doc, getDoc, deleteDoc, updateDoc, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { clientMediaUploadService } from '@/lib/services/clientMediaService';
import { MediaItem, MediaFilter } from '@/lib/types/media';

interface MediaManagerState {
  mediaItems: MediaItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
}

interface UseMediaManagerReturn {
  state: MediaManagerState;
  loadMedia: (filters?: MediaFilter, pageSize?: number) => Promise<void>;
  loadMoreMedia: () => Promise<void>;
  refreshMedia: () => Promise<void>;
  updateMediaItem: (mediaId: string, updates: Partial<MediaItem>) => Promise<boolean>;
  deleteMediaItem: (mediaId: string) => Promise<boolean>;
  getMediaItem: (mediaId: string) => Promise<MediaItem | null>;
  clearError: () => void;
}

export const useMediaManager = (): UseMediaManagerReturn => {
  const [state, setState] = useState<MediaManagerState>({
    mediaItems: [],
    loading: false,
    error: null,
    hasMore: true,
    totalCount: 0
  });

  const [currentFilters, setCurrentFilters] = useState<MediaFilter | undefined>();
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [pageSize, setPageSize] = useState(20);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const buildQuery = useCallback((filters?: MediaFilter, startAfterDoc?: DocumentSnapshot, limitCount = 20) => {
    let baseQuery = collection(db, 'media');
    const constraints: any[] = [];

    // Add filters
    if (filters) {
      if (filters.type && filters.type !== 'all') {
        constraints.push(where('type', '==', filters.type));
      }
      
      if (filters.fixtureId) {
        constraints.push(where('fixtureId', '==', filters.fixtureId));
      }
      
      if (filters.matchId) {
        constraints.push(where('matchId', '==', filters.matchId));
      }
      
      if (filters.uploadedBy) {
        constraints.push(where('uploadedBy', '==', filters.uploadedBy));
      }
      
      if (filters.capturedDuring) {
        constraints.push(where('capturedDuring', '==', filters.capturedDuring));
      }
      
      if (filters.status) {
        constraints.push(where('status', '==', filters.status));
      } else {
        // Default to active media only
        constraints.push(where('status', '==', 'active'));
      }
    } else {
      // Default to active media only
      constraints.push(where('status', '==', 'active'));
    }

    // Add ordering
    constraints.push(orderBy('createdAt', 'desc'));

    // Add pagination
    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }
    constraints.push(limit(limitCount));

    return query(baseQuery, ...constraints);
  }, []);

  const loadMedia = useCallback(async (filters?: MediaFilter, pageSizeParam = 20) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    setCurrentFilters(filters);
    setPageSize(pageSizeParam);
    setLastDoc(null);

    try {
      const mediaQuery = buildQuery(filters, undefined, pageSizeParam);
      const snapshot = await getDocs(mediaQuery);
      
      const mediaItems: MediaItem[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        mediaItems.push({
          mediaId: doc.id,
          ...data
        } as MediaItem);
      });

      const lastDocument = snapshot.docs[snapshot.docs.length - 1] || null;
      setLastDoc(lastDocument);

      setState(prev => ({
        ...prev,
        mediaItems,
        loading: false,
        hasMore: snapshot.docs.length === pageSizeParam,
        totalCount: mediaItems.length
      }));
    } catch (error) {
      console.error('Error loading media:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load media'
      }));
    }
  }, [buildQuery]);

  const loadMoreMedia = useCallback(async () => {
    if (!lastDoc || state.loading || !state.hasMore) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const mediaQuery = buildQuery(currentFilters, lastDoc, pageSize);
      const snapshot = await getDocs(mediaQuery);
      
      const newMediaItems: MediaItem[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        newMediaItems.push({
          mediaId: doc.id,
          ...data
        } as MediaItem);
      });

      const lastDocument = snapshot.docs[snapshot.docs.length - 1] || null;
      setLastDoc(lastDocument);

      setState(prev => ({
        ...prev,
        mediaItems: [...prev.mediaItems, ...newMediaItems],
        loading: false,
        hasMore: snapshot.docs.length === pageSize,
        totalCount: prev.totalCount + newMediaItems.length
      }));
    } catch (error) {
      console.error('Error loading more media:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load more media'
      }));
    }
  }, [buildQuery, currentFilters, lastDoc, pageSize, state.loading, state.hasMore]);

  const refreshMedia = useCallback(async () => {
    await loadMedia(currentFilters, pageSize);
  }, [loadMedia, currentFilters, pageSize]);

  const getMediaItem = useCallback(async (mediaId: string): Promise<MediaItem | null> => {
    try {
      const docRef = doc(db, 'media', mediaId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          mediaId: docSnap.id,
          ...data
        } as MediaItem;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting media item:', error);
      return null;
    }
  }, []);

  const updateMediaItem = useCallback(async (mediaId: string, updates: Partial<MediaItem>): Promise<boolean> => {
    try {
      const result = await clientMediaUploadService.updateMedia(mediaId, updates);
      
      if (result.success) {
        // Update local state
        setState(prev => ({
          ...prev,
          mediaItems: prev.mediaItems.map(item => 
            item.mediaId === mediaId 
              ? { ...item, ...updates, updatedAt: new Date() }
              : item
          )
        }));
        return true;
      } else {
        setState(prev => ({ ...prev, error: result.error || 'Failed to update media' }));
        return false;
      }
    } catch (error) {
      console.error('Error updating media item:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update media'
      }));
      return false;
    }
  }, []);

  const deleteMediaItem = useCallback(async (mediaId: string): Promise<boolean> => {
    try {
      const result = await clientMediaUploadService.deleteMedia(mediaId);
      
      if (result.success) {
        // Remove from local state
        setState(prev => ({
          ...prev,
          mediaItems: prev.mediaItems.filter(item => item.mediaId !== mediaId),
          totalCount: prev.totalCount - 1
        }));
        return true;
      } else {
        setState(prev => ({ ...prev, error: result.error || 'Failed to delete media' }));
        return false;
      }
    } catch (error) {
      console.error('Error deleting media item:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete media'
      }));
      return false;
    }
  }, []);

  // Auto-load media on mount with default filters
  useEffect(() => {
    loadMedia();
  }, []);

  return {
    state,
    loadMedia,
    loadMoreMedia,
    refreshMedia,
    updateMediaItem,
    deleteMediaItem,
    getMediaItem,
    clearError
  };
};