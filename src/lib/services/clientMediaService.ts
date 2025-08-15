'use client';

import { storage, db } from '@/lib/firebase/config';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { 
  MediaItem, 
  MediaMetadata, 
  MediaUploadProgress, 
  MediaUploadResult,
  MediaBatchUploadResult,
  MEDIA_CONFIG,
  MediaType 
} from '@/lib/types/media';

export class ClientMediaUploadService {
  
  // Storage path generators
  private getFixtureMediaPath(venueId: string, fixtureId: string, type: MediaType, fileName: string): string {
    const timestamp = Date.now();
    const folder = type === 'image' ? 'images' : 'videos';
    return `media/venues/${venueId}/fixtures/${fixtureId}/${folder}/${timestamp}_${fileName}`;
  }
  
  private getMatchMediaPath(venueId: string, matchId: string, type: MediaType, fileName: string): string {
    const timestamp = Date.now();
    const folder = type === 'image' ? 'images' : 'videos';
    return `media/venues/${venueId}/matches/${matchId}/${folder}/${timestamp}_${fileName}`;
  }
  
  private getVenueMediaPath(venueId: string, type: MediaType, fileName: string): string {
    const timestamp = Date.now();
    const folder = type === 'image' ? 'images' : 'videos';
    return `media/venues/${venueId}/general/${folder}/${timestamp}_${fileName}`;
  }

  // File validation
  private validateMediaFile(file: File): { isValid: boolean; error?: string } {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return { isValid: false, error: 'File must be an image or video' };
    }
    
    const mediaType: MediaType = isImage ? 'image' : 'video';
    const maxSize = MEDIA_CONFIG.MAX_FILE_SIZE[mediaType.toUpperCase() as keyof typeof MEDIA_CONFIG.MAX_FILE_SIZE];
    
    if (file.size > maxSize) {
      const sizeMB = Math.round(maxSize / (1024 * 1024));
      return { isValid: false, error: `File size must be less than ${sizeMB}MB` };
    }
    
    const allowedTypes = MEDIA_CONFIG.ALLOWED_TYPES[mediaType.toUpperCase() as keyof typeof MEDIA_CONFIG.ALLOWED_TYPES];
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: `File type ${file.type} not supported` };
    }
    
    return { isValid: true };
  }

  // Core upload method
  private async uploadFile(
    storagePath: string,
    file: File,
    onProgress?: (progress: MediaUploadProgress) => void
  ): Promise<string> {
    const validation = this.validateMediaFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress({
              progress,
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              fileName: file.name
            });
          }
        },
        (error) => {
          console.error('Upload error:', error);
          reject(new Error(`Upload failed: ${error.message}`));
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            reject(new Error('Failed to get download URL'));
          }
        }
      );
    });
  }

  // Upload fixture media
  async uploadFixtureMedia(
    fixtureId: string,
    venueId: string,
    file: File,
    metadata: MediaMetadata,
    uploadedBy: string,
    uploadedByName: string,
    onProgress?: (progress: MediaUploadProgress) => void
  ): Promise<MediaUploadResult> {
    try {
      const mediaType: MediaType = file.type.startsWith('image/') ? 'image' : 'video';
      const storagePath = this.getFixtureMediaPath(venueId, fixtureId, mediaType, file.name);
      
      // Upload file
      const url = await this.uploadFile(storagePath, file, onProgress);
      
      // Create media document
      const mediaData: Omit<MediaItem, 'mediaId'> = {
        type: mediaType,
        fixtureId,
        venueId,
        eventId: 'isha_gramotsavam_2025',
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags || [],
        storagePath,
        url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy,
        uploadedByName,
        uploadedAt: serverTimestamp(),
        status: 'active',
        capturedDuring: metadata.capturedDuring,
        location: metadata.location,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'media'), mediaData);
      await updateDoc(doc(db, 'media', docRef.id), { mediaId: docRef.id });
      
      return {
        success: true,
        mediaId: docRef.id,
        url
      };
    } catch (error) {
      console.error('Error uploading fixture media:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  // Upload match media
  async uploadMatchMedia(
    matchId: string,
    venueId: string,
    file: File,
    metadata: MediaMetadata,
    uploadedBy: string,
    uploadedByName: string,
    onProgress?: (progress: MediaUploadProgress) => void
  ): Promise<MediaUploadResult> {
    try {
      const mediaType: MediaType = file.type.startsWith('image/') ? 'image' : 'video';
      const storagePath = this.getMatchMediaPath(venueId, matchId, mediaType, file.name);
      
      // Upload file
      const url = await this.uploadFile(storagePath, file, onProgress);
      
      // Create media document
      const mediaData: Omit<MediaItem, 'mediaId'> = {
        type: mediaType,
        matchId,
        venueId,
        eventId: 'isha_gramotsavam_2025',
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags || [],
        storagePath,
        url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy,
        uploadedByName,
        uploadedAt: serverTimestamp(),
        status: 'active',
        capturedDuring: metadata.capturedDuring,
        location: metadata.location,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'media'), mediaData);
      await updateDoc(doc(db, 'media', docRef.id), { mediaId: docRef.id });
      
      return {
        success: true,
        mediaId: docRef.id,
        url
      };
    } catch (error) {
      console.error('Error uploading match media:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  // Upload general venue media
  async uploadVenueMedia(
    venueId: string,
    file: File,
    metadata: MediaMetadata,
    uploadedBy: string,
    uploadedByName: string,
    onProgress?: (progress: MediaUploadProgress) => void
  ): Promise<MediaUploadResult> {
    try {
      const mediaType: MediaType = file.type.startsWith('image/') ? 'image' : 'video';
      const storagePath = this.getVenueMediaPath(venueId, mediaType, file.name);
      
      // Upload file
      const url = await this.uploadFile(storagePath, file, onProgress);
      
      // Create media document
      const mediaData: Omit<MediaItem, 'mediaId'> = {
        type: mediaType,
        venueId,
        eventId: 'isha_gramotsavam_2025',
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags || [],
        storagePath,
        url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy,
        uploadedByName,
        uploadedAt: serverTimestamp(),
        status: 'active',
        capturedDuring: metadata.capturedDuring,
        location: metadata.location,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'media'), mediaData);
      await updateDoc(doc(db, 'media', docRef.id), { mediaId: docRef.id });
      
      return {
        success: true,
        mediaId: docRef.id,
        url
      };
    } catch (error) {
      console.error('Error uploading venue media:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  // Batch upload multiple files
  async uploadMultipleMedia(
    uploads: Array<{
      file: File;
      metadata: MediaMetadata;
      context: { type: 'fixture'; fixtureId: string; venueId: string } | 
               { type: 'match'; matchId: string; venueId: string } |
               { type: 'venue'; venueId: string };
    }>,
    uploadedBy: string,
    uploadedByName: string,
    onProgress?: (overall: number, current: MediaUploadProgress) => void
  ): Promise<MediaBatchUploadResult> {
    const results: MediaUploadResult[] = [];
    let uploadedCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < uploads.length; i++) {
      const upload = uploads[i];
      
      const individualProgress = (progress: MediaUploadProgress) => {
        const overall = ((i + progress.progress / 100) / uploads.length) * 100;
        if (onProgress) {
          onProgress(overall, progress);
        }
      };
      
      let result: MediaUploadResult;
      
      if (upload.context.type === 'fixture') {
        result = await this.uploadFixtureMedia(
          upload.context.fixtureId,
          upload.context.venueId,
          upload.file,
          upload.metadata,
          uploadedBy,
          uploadedByName,
          individualProgress
        );
      } else if (upload.context.type === 'match') {
        result = await this.uploadMatchMedia(
          upload.context.matchId,
          upload.context.venueId,
          upload.file,
          upload.metadata,
          uploadedBy,
          uploadedByName,
          individualProgress
        );
      } else {
        result = await this.uploadVenueMedia(
          upload.context.venueId,
          upload.file,
          upload.metadata,
          uploadedBy,
          uploadedByName,
          individualProgress
        );
      }
      
      results.push(result);
      
      if (result.success) {
        uploadedCount++;
      } else {
        failedCount++;
      }
    }
    
    return {
      success: failedCount === 0,
      uploadedCount,
      failedCount,
      results,
      errors: results.filter(r => !r.success).map(r => r.error || 'Unknown error')
    };
  }

  // Delete media
  async deleteMedia(mediaId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Note: This is a simplified version for client-side use
      // The actual deletion logic should ideally be handled server-side for security
      await deleteDoc(doc(db, 'media', mediaId));
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting media:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }

  // Update media metadata
  async updateMedia(
    mediaId: string,
    updates: Partial<Pick<MediaItem, 'title' | 'description' | 'tags' | 'status' | 'capturedDuring' | 'location'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await updateDoc(doc(db, 'media', mediaId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating media:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed'
      };
    }
  }
}

// Export singleton instance
export const clientMediaUploadService = new ClientMediaUploadService();