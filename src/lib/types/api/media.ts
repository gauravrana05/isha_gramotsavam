import { BaseEntity } from '../shared/common';

// Media API response types
export interface MediaData extends BaseEntity {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedBy: string;
  eventId?: string;
  venueId?: string;
  teamId?: string;
  fixtureId?: string;
  matchId?: string;
  title?: string;
  capturedDuring?: string;
  description?: string;
  tags?: string[];
}

// Alias for backward compatibility
export type MediaItem = MediaData;

export interface MediaFilter {
  type?: 'image' | 'video' | 'all';
  eventId?: string;
  venueId?: string;
  teamId?: string;
  uploadedBy?: string;
  tags?: string[];
}

export interface MediaMetadata {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  description?: string;
  tags?: string[];
}

export const MEDIA_CONFIG = {
  MAX_FILE_SIZE: {
    IMAGE: 10 * 1024 * 1024, // 10MB
    VIDEO: 50 * 1024 * 1024, // 50MB
  },
  ALLOWED_TYPES: {
    IMAGE: ['image/jpeg', 'image/png', 'image/gif'],
    VIDEO: ['video/mp4', 'video/webm'],
  },
  maxFileSize: 10 * 1024 * 1024, // Backward compatibility
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'], // Backward compatibility
  maxFiles: 10,
} as const;
