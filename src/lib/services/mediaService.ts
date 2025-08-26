import { getStorageProvider, generateStoragePath } from '@/lib/storage';
import type { ProgressCallback } from '@/lib/storage';
import { db } from '@/lib/db';
import { 
  MediaMetadata, 
  MediaUploadProgress, 
  MediaUploadResult,
  MediaBatchUploadResult,
  MEDIA_CONFIG,
  MediaType 
} from '@/lib/types/media';

export class MediaUploadService {
  
  // Storage path generators
  private getFixtureMediaPath(venueId: string, fixtureId: string, type: MediaType, fileName: string): string {
    return generateStoragePath.fixtureMedia(venueId, fixtureId, type, fileName);
  }
  
  private getMatchMediaPath(venueId: string, matchId: string, type: MediaType, fileName: string): string {
    return generateStoragePath.matchMedia(venueId, matchId, type, fileName);
  }
  
  private getVenueMediaPath(venueId: string, type: MediaType, fileName: string): string {
    return generateStoragePath.venueMedia(venueId, type, fileName);
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
    if (!(allowedTypes as readonly string[]).includes(file.type as any)) {
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

    const storageProvider = getStorageProvider();
    
    // Convert MediaUploadProgress callback to ProgressCallback
    const progressCallback: ProgressCallback | undefined = onProgress ? (progress) => {
      onProgress({
        progress: progress.progress,
        bytesTransferred: progress.bytesTransferred,
        totalBytes: progress.totalBytes,
        fileName: progress.fileName || file.name
      });
    } : undefined;

    return await storageProvider.upload(storagePath, file, progressCallback);
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
      
      // Create media document in PostgreSQL using correct schema
      const media = await db.media.create({
        data: {
          fileName: file.name,
          filePath: storagePath,
          fileType: file.type,
          fileSize: BigInt(file.size),
          entityType: 'venue', // For fixture media, use venue as entity type
          entityId: venueId, // Link to venue since fixtures are venue-specific
          uploadedBy,
          status: 'approved', // Default status
        }
      });
      
      return {
        success: true,
        mediaId: media.id,
        url
      };
    } catch (error) {
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
      
      // Create media document in PostgreSQL using correct schema
      const media = await db.media.create({
        data: {
          fileName: file.name,
          filePath: storagePath,
          fileType: file.type,
          fileSize: BigInt(file.size),
          entityType: 'match',
          entityId: matchId,
          uploadedBy,
          status: 'approved', // Default status
        }
      });
      
      return {
        success: true,
        mediaId: media.id,
        url
      };
    } catch (error) {
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
      
      // Create media document in PostgreSQL using correct schema
      const media = await db.media.create({
        data: {
          fileName: file.name,
          filePath: storagePath,
          fileType: file.type,
          fileSize: BigInt(file.size),
          entityType: 'venue',
          entityId: venueId,
          uploadedBy,
          status: 'approved', // Default status
        }
      });
      
      return {
        success: true,
        mediaId: media.id,
        url
      };
    } catch (error) {
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
      const media = await db.media.findUnique({
        where: { id: mediaId }
      });
      
      if (!media) {
        return { success: false, error: 'Media not found' };
      }
      
      // Delete from storage
      const storageProvider = getStorageProvider();
      await storageProvider.delete(media.filePath);
      
      // Delete from database
      await db.media.delete({
        where: { id: mediaId }
      });
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }

  // Update media metadata (limited by current schema)
  async updateMedia(
    mediaId: string,
    updates: { status?: 'pending' | 'approved' | 'rejected' }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db.media.update({
        where: { id: mediaId },
        data: updates
      });
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed'
      };
    }
  }
}

// Export singleton instance
export const mediaUploadService = new MediaUploadService();