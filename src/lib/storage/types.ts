export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  fileName?: string;
}

export type ProgressCallback = (progress: UploadProgress) => void;

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface StorageProvider {
  /**
   * Upload a file to storage
   * @param path - Storage path for the file
   * @param file - File to upload
   * @param onProgress - Optional progress callback
   * @returns Promise that resolves to the public URL
   */
  upload(path: string, file: File, onProgress?: ProgressCallback): Promise<string>;

  /**
   * Get public URL for a file
   * @param path - Storage path of the file
   * @returns Public URL string
   */
  getPublicUrl(path: string): string;

  /**
   * Delete a file from storage
   * @param path - Storage path of the file to delete
   * @returns Promise that resolves when deletion is complete
   */
  delete(path: string): Promise<void>;

  /**
   * Check if a file exists in storage
   * @param path - Storage path to check
   * @returns Promise that resolves to boolean
   */
  exists?(path: string): Promise<boolean>;
}

export interface StorageConfig {
  provider: 'supabase' | 'replit' | 's3';
  supabase?: {
    url: string;
    anonKey: string;
    bucket: string;
  };
  replit?: {
    // Future Replit config
  };
  s3?: {
    // Future S3 config
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

// Storage bucket configurations
export const STORAGE_BUCKETS = {
  PROFILE_IMAGES: 'profile-images',
  TEAM_PHOTOS: 'team-photos',
  DOCUMENTS: 'documents',
  MEDIA_UPLOADS: 'media-uploads',
} as const;

// Helper functions for path generation
export const generateStoragePath = {
  profilePhoto: (userId: string, extension = 'jpg') => `${userId}/profile/profile_photo_${Date.now()}.${extension}`,
  aadhaarFront: (userId: string, extension = 'jpg') => `${userId}/documents/aadhaar_front_${Date.now()}.${extension}`,
  aadhaarBack: (userId: string, extension = 'jpg') => `${userId}/documents/aadhaar_back_${Date.now()}.${extension}`,
  teamPhoto: (teamId: string, extension = 'jpg') => `${teamId}/photos/team_photo_${Date.now()}.${extension}`,
  fixtureMedia: (venueId: string, fixtureId: string, type: 'image' | 'video', fileName: string) => {
    const timestamp = Date.now();
    const folder = type === 'image' ? 'images' : 'videos';
    return `media/venues/${venueId}/fixtures/${fixtureId}/${folder}/${timestamp}_${fileName}`;
  },
  matchMedia: (venueId: string, matchId: string, type: 'image' | 'video', fileName: string) => {
    const timestamp = Date.now();
    const folder = type === 'image' ? 'images' : 'videos';
    return `media/venues/${venueId}/matches/${matchId}/${folder}/${timestamp}_${fileName}`;
  },
  venueMedia: (venueId: string, type: 'image' | 'video', fileName: string) => {
    const timestamp = Date.now();
    const folder = type === 'image' ? 'images' : 'videos';
    return `media/venues/${venueId}/general/${folder}/${timestamp}_${fileName}`;
  },
};