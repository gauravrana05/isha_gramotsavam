export interface MediaItem {
  mediaId: string;
  type: 'image' | 'video';
  
  // Context Information
  fixtureId?: string;          // For fixture-level media
  matchId?: string;            // For match-specific media  
  venueId: string;             // Always required
  eventId: string;             // Always 'isha_gramotsavam_2025'
  
  // Media Details
  title: string;               // User-provided title
  description?: string;        // Optional description
  tags?: string[];            // Searchable tags
  
  // Storage Information
  storagePath: string;         // Firebase Storage path
  url: string;                 // Download URL
  thumbnailUrl?: string;       // For videos
  
  // File Metadata
  fileName: string;            // Original filename
  fileSize: number;            // Size in bytes
  mimeType: string;           // image/jpeg, video/mp4, etc.
  duration?: number;          // For videos (in seconds)
  
  // Upload Information
  uploadedBy: string;          // User ID (technical volunteer)
  uploadedByName: string;      // Display name
  uploadedAt: any;            // Firestore Timestamp
  
  // Status & Moderation
  status: 'active' | 'pending' | 'hidden' | 'deleted';
  moderatedBy?: string;
  moderatedAt?: any;          // Firestore Timestamp
  
  // Context Metadata
  capturedDuring?: 'pre-match' | 'match' | 'post-match' | 'ceremony';
  location?: string;           // More specific location within venue
  
  createdAt: any;             // Firestore Timestamp
  updatedAt: any;             // Firestore Timestamp
}

export interface MediaMetadata {
  title: string;
  description?: string;
  tags?: string[];
  capturedDuring?: 'pre-match' | 'match' | 'post-match' | 'ceremony';
  location?: string;
}

export interface MediaUploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  fileName: string;
}

export interface MediaFilter {
  type?: 'image' | 'video' | 'all';
  fixtureId?: string;
  matchId?: string;
  uploadedBy?: string;
  capturedDuring?: 'pre-match' | 'match' | 'post-match' | 'ceremony';
  dateFrom?: Date;
  dateTo?: Date;
  status?: 'active' | 'pending' | 'hidden' | 'deleted';
  searchQuery?: string;
}

export interface MediaUploadResult {
  success: boolean;
  mediaId?: string;
  url?: string;
  error?: string;
}

export interface MediaBatchUploadResult {
  success: boolean;
  uploadedCount: number;
  failedCount: number;
  results: MediaUploadResult[];
  errors?: string[];
}

// Media file validation constants
export const MEDIA_CONFIG = {
  MAX_FILE_SIZE: {
    IMAGE: 10 * 1024 * 1024,    // 10MB for images
    VIDEO: 100 * 1024 * 1024,   // 100MB for videos
  },
  ALLOWED_TYPES: {
    IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    VIDEO: ['video/mp4', 'video/webm', 'video/mov', 'video/avi'],
  },
  THUMBNAIL_SIZE: {
    WIDTH: 300,
    HEIGHT: 200,
  },
  COMPRESSION: {
    IMAGE_QUALITY: 0.8,         // JPEG quality
    IMAGE_MAX_WIDTH: 1920,      // Max width before compression
    IMAGE_MAX_HEIGHT: 1080,     // Max height before compression
  }
} as const;

export type MediaType = 'image' | 'video';
export type MediaStatus = 'active' | 'pending' | 'hidden' | 'deleted';
export type CaptureContext = 'pre-match' | 'match' | 'post-match' | 'ceremony';