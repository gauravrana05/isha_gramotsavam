import { createClient } from '@supabase/supabase-js';
import { StorageProvider, ProgressCallback } from '../types';

export class SupabaseStorageProvider implements StorageProvider {
  private client;
  private defaultBucket = 'documents'; // Default bucket for documents

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Anon Key are required');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  async upload(path: string, file: File, onProgress?: ProgressCallback): Promise<string> {
    try {
      // Validate file
      if (!file || file.size === 0) {
        throw new Error('Invalid file');
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File size must be less than 10MB');
      }

      // Get bucket from path or use default
      const bucket = this.getBucketFromPath(path);
      const filePath = this.getFilePathFromPath(path);

      console.log('📄 Supabase upload details:', { bucket, filePath, path });

      // Upload with progress tracking
      const { data, error } = await this.client.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Replace if exists
        });

      if (error) {
        console.error('Supabase upload error details:', error);
        throw new Error(`Upload failed: ${error.message}${error.details ? ` - ${error.details}` : ''}`);
      }

      // Simulate progress callback for compatibility (Supabase does&apos;t have built-in progress)
      if (onProgress) {
        onProgress({
          progress: 100,
          bytesTransferred: file.size,
          totalBytes: file.size,
          fileName: file.name,
        });
      }

      // Get public URL
      const publicUrl = this.getPublicUrl(path);
      return publicUrl;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Upload failed');
    }
  }

  getPublicUrl(path: string): string {
    const bucket = this.getBucketFromPath(path);
    const filePath = this.getFilePathFromPath(path);

    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async delete(path: string): Promise<void> {
    try {
      const bucket = this.getBucketFromPath(path);
      const filePath = this.getFilePathFromPath(path);

      const { error } = await this.client.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Delete failed');
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const bucket = this.getBucketFromPath(path);
      const filePath = this.getFilePathFromPath(path);

      const { data, error } = await this.client.storage
        .from(bucket)
        .list(this.getDirectoryFromPath(filePath), {
          limit: 1,
          search: this.getFileNameFromPath(filePath),
        });

      if (error) {
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      return false;
    }
  }

  // Helper methods to parse paths and determine buckets
  private getBucketFromPath(path: string): string {
    // Use single bucket for simplicity
    return 'documents';
    
    // Original logic (commented out until bucket permissions are fixed):
    // if (path.includes('/profile/')) return 'profile-images';
    // if (path.includes('/documents/')) return 'documents';
    // if (path.includes('/photos/')) return 'team-photos';
    // if (path.includes('/media/')) return 'media-uploads';
    // return this.defaultBucket;
  }

  private getFilePathFromPath(path: string): string {
    // Remove leading slash if present
    return path.startsWith('/') ? path.slice(1) : path;
  }

  private getDirectoryFromPath(filePath: string): string {
    const parts = filePath.split('/');
    parts.pop(); // Remove filename
    return parts.join('/');
  }

  private getFileNameFromPath(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  }

  // Initialize buckets - no-op since bucket already exists
  async initializeBuckets(): Promise<void> {
    // No bucket initialization needed - bucket already exists
  }
}