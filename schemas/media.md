# Media Schema Documentation

## Collection: `media`

### Overview
Comprehensive media management system for Isha Gramotsavam with file storage, categorization, approval workflows, and social media integration.

### Document Structure

```typescript
interface Media {
  id: string; // Media identifier (auto-generated)
  
  // Basic Media Information
  type: 'image' | 'video' | 'audio' | 'document' | 'live_stream';
  category: 'event_promotion' | 'team_photos' | 'match_highlights' | 'venue_photos' | 'official_documents' | 'user_generated' | 'social_media' | 'broadcast';
  
  // File Information
  fileInfo: {
    fileName: string; // Original file name
    url: string; // Storage URL (Firebase Storage, CDN, etc.)
    thumbnailUrl?: string; // Thumbnail URL for images/videos
    previewUrl?: string; // Preview URL for documents
    
    // File Technical Details
    size: number; // File size in bytes
    mimeType: string; // MIME type
    format: string; // File format (JPEG, MP4, PDF, etc.)
    
    // Media Dimensions (for images/videos)
    dimensions?: {
      width: number;
      height: number;
      aspectRatio: string; // e.g., '16:9', '4:3'
    };
    
    // Video/Audio Specific
    duration?: number; // Duration in seconds (for video/audio)
    bitrate?: number; // Bitrate for video/audio
    frameRate?: number; // Frame rate for videos
    audioCodec?: string; // Audio codec information
    videoCodec?: string; // Video codec information
    
    // Quality Information
    quality: 'low' | 'medium' | 'high' | 'ultra' | 'original';
    resolution?: string; // e.g., '1920x1080', '4K'
    
    // Processing Status
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
    processedVersions?: Array<{
      quality: string;
      url: string;
      size: number;
    }>;
  };
  
  // Content Metadata
  metadata: {
    title: string; // Media title
    description?: string; // Media description
    altText?: string; // Alt text for accessibility
    
    // Keywords and Tags
    tags: string[]; // Searchable tags
    keywords: string[]; // SEO keywords
    hashtags?: string[]; // Social media hashtags
    
    // Categorization
    subCategory?: string; // More specific category
    sport?: string; // Associated sport
    eventId?: string; // Associated event
    matchId?: string; // Associated match
    teamId?: string; // Associated team
    venueId?: string; // Associated venue
    
    // Geographic Information
    location?: {
      venue?: string;
      city?: string;
      state?: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
    
    // Temporal Information
    capturedAt?: Timestamp; // When media was captured
    eventDate?: Timestamp; // Date of event depicted
    
    // People and Entities
    peopleTagged?: Array<{
      userId?: string;
      name: string;
      role?: string; // player, official, volunteer, etc.
      team?: string;
    }>;
    
    entities?: Array<{
      type: 'team' | 'venue' | 'sponsor' | 'official';
      id: string;
      name: string;
    }>;
  };
  
  // Upload and Source Information
  uploadInfo: {
    uploadedBy: string; // User ID who uploaded
    uploadedAt: Timestamp;
    uploadMethod: 'web_upload' | 'mobile_app' | 'api' | 'bulk_import' | 'live_capture';
    
    // Original Source
    source: {
      type: 'user_upload' | 'professional_photographer' | 'live_stream' | 'security_camera' | 'drone' | 'official_media';
      attribution?: string; // Photo credit or source attribution
      copyright?: string; // Copyright information
      license?: string; // Usage license
    };
    
    // Upload Context
    uploadContext?: {
      userAgent?: string;
      device?: string;
      ipAddress?: string;
      sessionId?: string;
    };
    
    // Batch Information (for bulk uploads)
    batchId?: string;
    batchIndex?: number;
    totalInBatch?: number;
  };
  
  // Approval and Moderation
  moderation: {
    status: 'pending' | 'approved' | 'rejected' | 'flagged' | 'archived';
    
    // Review Information
    reviewedBy?: string; // Admin user who reviewed
    reviewedAt?: Timestamp;
    reviewNotes?: string; // Review comments
    
    // Rejection Details
    rejectionReason?: string;
    rejectionCategory?: 'inappropriate_content' | 'poor_quality' | 'copyright_violation' | 'privacy_violation' | 'spam' | 'other';
    
    // Flag Information
    flags?: Array<{
      flaggedBy: string; // User who flagged
      flaggedAt: Timestamp;
      reason: string;
      category: 'inappropriate' | 'copyright' | 'privacy' | 'spam' | 'other';
      resolved: boolean;
      resolvedBy?: string;
      resolvedAt?: Timestamp;
    }>;
    
    // Content Warnings
    contentWarnings?: string[]; // Violence, language, etc.
    ageRestriction?: number; // Minimum age for viewing
  };
  
  // Visibility and Access Control
  visibility: {
    status: 'public' | 'private' | 'restricted' | 'unlisted';
    
    // Access Control
    accessLevel: 'everyone' | 'registered_users' | 'team_members' | 'officials' | 'admins';
    specificUsers?: string[]; // Specific users with access
    specificRoles?: string[]; // Specific roles with access
    
    // Geographic Restrictions
    geoRestrictions?: {
      allowedCountries?: string[];
      blockedCountries?: string[];
      allowedRegions?: string[];
    };
    
    // Time-based Access
    availableFrom?: Timestamp; // When media becomes available
    availableUntil?: Timestamp; // When media expires
    
    // Download Permissions
    downloadAllowed: boolean;
    printAllowed: boolean;
    shareAllowed: boolean;
  };
  
  // Usage and Analytics
  usage: {
    // View Statistics
    views: {
      total: number;
      unique: number;
      byDate: Array<{
        date: string; // YYYY-MM-DD
        views: number;
        uniqueViews: number;
      }>;
    };
    
    // Download Statistics
    downloads: {
      total: number;
      byUser: Array<{
        userId: string;
        downloadedAt: Timestamp;
        purpose?: string;
      }>;
    };
    
    // Sharing Statistics
    shares: {
      total: number;
      platforms: Array<{
        platform: string; // facebook, twitter, whatsapp, etc.
        count: number;
      }>;
      directShares: number; // Direct link shares
    };
    
    // Engagement Metrics
    engagement: {
      likes?: number;
      comments?: number;
      reactions?: {
        [reactionType: string]: number;
      };
      bookmarks?: number;
    };
    
    // Usage in Other Content
    usedIn: Array<{
      type: 'article' | 'post' | 'video' | 'presentation' | 'report';
      title: string;
      url?: string;
      usedAt: Timestamp;
    }>;
  };
  
  // Social Media Integration
  socialMedia: {
    // Cross-platform Publishing
    publishedTo: Array<{
      platform: 'facebook' | 'instagram' | 'twitter' | 'youtube' | 'linkedin' | 'whatsapp';
      postId?: string; // Platform-specific post ID
      publishedAt: Timestamp;
      url?: string; // URL of the social media post
      
      // Platform-specific Metrics
      metrics?: {
        likes?: number;
        shares?: number;
        comments?: number;
        views?: number;
        reach?: number;
        impressions?: number;
      };
      
      // Publishing Status
      status: 'scheduled' | 'published' | 'failed' | 'archived';
      scheduledFor?: Timestamp;
      errorMessage?: string;
    }>;
    
    // Hashtag Performance
    hashtagPerformance?: Array<{
      hashtag: string;
      platform: string;
      reach: number;
      engagement: number;
    }>;
    
    // Mentions and Tags
    mentions?: Array<{
      platform: string;
      mentionedUser: string;
      mentionType: 'tag' | 'mention' | 'reply';
    }>;
  };
  
  // Technical Processing
  processing: {
    // Image Processing
    imageProcessing?: {
      autoEnhanced: boolean;
      filters: string[]; // Applied filters
      adjustments: Array<{
        type: 'brightness' | 'contrast' | 'saturation' | 'crop' | 'resize';
        value: number | string;
      }>;
      
      // Face Detection
      faces?: Array<{
        boundingBox: {
          x: number;
          y: number;
          width: number;
          height: number;
        };
        confidence: number;
        personId?: string; // If person is identified
      }>;
      
      // Object Detection
      objects?: Array<{
        type: string; // ball, trophy, uniform, etc.
        confidence: number;
        boundingBox: {
          x: number;
          y: number;
          width: number;
          height: number;
        };
      }>;
    };
    
    // Video Processing
    videoProcessing?: {
      // Highlights Detection
      highlights?: Array<{
        startTime: number; // seconds
        endTime: number; // seconds
        type: 'goal' | 'save' | 'celebration' | 'key_moment';
        confidence: number;
        description?: string;
      }>;
      
      // Scene Detection
      scenes?: Array<{
        startTime: number;
        endTime: number;
        sceneType: string;
        keyFrame: string; // URL to key frame image
      }>;
      
      // Audio Analysis
      audioAnalysis?: {
        volumeLevels: Array<{
          timestamp: number;
          level: number;
        }>;
        silenceDetected: boolean;
        backgroundMusic: boolean;
        speechDetected: boolean;
      };
    };
    
    // AI/ML Analysis
    aiAnalysis?: {
      // Content Recognition
      contentTags: Array<{
        tag: string;
        confidence: number;
        category: string;
      }>;
      
      // Text Recognition (OCR)
      textDetected?: Array<{
        text: string;
        confidence: number;
        boundingBox?: {
          x: number;
          y: number;
          width: number;
          height: number;
        };
      }>;
      
      // Sentiment Analysis
      sentiment?: {
        score: number; // -1 to 1
        magnitude: number;
        classification: 'positive' | 'negative' | 'neutral';
      };
    };
  };
  
  // Quality and Technical Ratings
  quality: {
    // Technical Quality
    technicalRating: number; // 1-5 scale
    qualityMetrics: {
      sharpness?: number;
      exposure?: number;
      colorAccuracy?: number;
      composition?: number;
      audioQuality?: number; // For videos
    };
    
    // Content Quality
    contentRating: number; // 1-5 scale
    contentMetrics: {
      relevance: number;
      uniqueness: number;
      interestLevel: number;
      informativeness: number;
    };
    
    // User Ratings
    userRatings?: Array<{
      userId: string;
      rating: number; // 1-5 scale
      review?: string;
      ratedAt: Timestamp;
    }>;
    
    averageRating: number;
    totalRatings: number;
  };
  
  // Rights and Legal
  rights: {
    // Copyright Information
    copyright: {
      owner: string; // Copyright owner
      year: number; // Copyright year
      statement?: string; // Copyright statement
      
      // Licensing
      license: 'all_rights_reserved' | 'creative_commons' | 'public_domain' | 'fair_use' | 'custom';
      licenseDetails?: string;
      licenseUrl?: string;
      
      // Usage Rights
      commercialUse: boolean;
      modification: boolean;
      redistribution: boolean;
      attribution: boolean;
    };
    
    // Privacy and Consent
    privacy: {
      containsPersonalData: boolean;
      consentObtained: boolean;
      consentType?: 'verbal' | 'written' | 'digital';
      
      // People in Media
      peopleConsent?: Array<{
        personId?: string;
        name: string;
        consentGiven: boolean;
        consentDate?: Timestamp;
        consentType: string;
        minorConsent?: boolean; // Special consent for minors
      }>;
      
      // Data Retention
      retentionPeriod?: number; // Days to retain
      deletionScheduled?: Timestamp;
    };
    
    // Legal Compliance
    compliance: {
      gdprCompliant: boolean;
      coppaCompliant: boolean; // For content involving minors
      localLawsCompliant: boolean;
      
      // Violations
      violations?: Array<{
        type: string;
        description: string;
        reportedAt: Timestamp;
        resolvedAt?: Timestamp;
        resolution?: string;
      }>;
    };
  };
  
  // Storage and Backup
  storage: {
    // Primary Storage
    primaryStorage: {
      provider: 'firebase' | 'aws' | 'gcp' | 'azure' | 'cloudinary';
      bucket: string;
      path: string;
      region: string;
      storageClass: 'standard' | 'nearline' | 'coldline' | 'archive';
    };
    
    // Backup Storage
    backups?: Array<{
      provider: string;
      location: string;
      backedUpAt: Timestamp;
      restorePoint: boolean;
    }>;
    
    // CDN Information
    cdn?: {
      provider: string;
      distributionId: string;
      cacheStatus: 'cached' | 'not_cached' | 'expired';
      lastCached?: Timestamp;
    };
    
    // Storage Costs
    costs: {
      storageCost: number; // Monthly storage cost
      bandwidthCost: number; // Monthly bandwidth cost
      processingCost: number; // Processing costs
      totalCost: number;
    };
  };
  
  // Related Content
  relationships: {
    // Parent-Child Relationships
    parentId?: string; // Parent media (e.g., full video for highlight clips)
    children?: string[]; // Child media IDs
    
    // Related Media
    relatedMedia?: Array<{
      mediaId: string;
      relationship: 'same_event' | 'same_team' | 'same_person' | 'similar_content';
      relevanceScore: number;
    }>;
    
    // Media Collections
    collections?: Array<{
      collectionId: string;
      collectionName: string;
      collectionType: 'album' | 'gallery' | 'playlist' | 'series';
    }>;
    
    // Series Information (for episodic content)
    series?: {
      seriesId: string;
      seriesName: string;
      episodeNumber: number;
      seasonNumber?: number;
    };
  };
  
  // Workflow and Status
  workflow: {
    // Processing Workflow
    currentStage: 'upload' | 'processing' | 'review' | 'approved' | 'published' | 'archived';
    
    stages: Array<{
      stage: string;
      status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
      startedAt?: Timestamp;
      completedAt?: Timestamp;
      assignedTo?: string; // User responsible for this stage
      notes?: string;
    }>;
    
    // Approval Workflow
    approvalWorkflow?: Array<{
      level: number;
      approver: string;
      status: 'pending' | 'approved' | 'rejected';
      approvedAt?: Timestamp;
      comments?: string;
    }>;
    
    // Publication Schedule
    publicationSchedule?: {
      scheduledFor: Timestamp;
      publishedAt?: Timestamp;
      platforms: string[];
      autoPublish: boolean;
    };
  };
  
  // Analytics and Performance
  performance: {
    // Load Performance
    loadTimes: Array<{
      timestamp: Timestamp;
      loadTime: number; // milliseconds
      userLocation: string;
      deviceType: string;
    }>;
    
    // Conversion Metrics
    conversions: {
      viewToDownload: number; // Percentage
      viewToShare: number;
      viewToEngage: number;
    };
    
    // SEO Performance
    seo?: {
      searchRanking: Array<{
        keyword: string;
        platform: string;
        rank: number;
        searchVolume: number;
      }>;
      
      organicTraffic: number;
      referralTraffic: number;
    };
  };
  
  // System Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastAccessedAt?: Timestamp;
  expiresAt?: Timestamp; // When media expires/is deleted
  version: number; // Schema version
  archived: boolean;
  
  // Audit Trail
  auditTrail: Array<{
    action: 'create' | 'update' | 'delete' | 'view' | 'download' | 'share';
    performedBy: string; // User ID
    performedAt: Timestamp;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
  }>;
}
```

### Sample Media Data

```javascript
{
  id: 'media_001_gramotsavam_banner',
  type: 'image',
  category: 'event_promotion',
  
  fileInfo: {
    fileName: 'gramotsavam-2025-main-banner.jpg',
    url: 'https://storage.googleapis.com/isha-gramotsavam/media/banners/main-banner-2025.jpg',
    thumbnailUrl: 'https://storage.googleapis.com/isha-gramotsavam/media/banners/main-banner-2025-thumb.jpg',
    size: 2048576,
    mimeType: 'image/jpeg',
    format: 'JPEG',
    dimensions: {
      width: 1920,
      height: 1080,
      aspectRatio: '16:9'
    },
    quality: 'high',
    resolution: '1920x1080',
    processingStatus: 'completed'
  },
  
  metadata: {
    title: 'Isha Gramotsavam 2025 - Main Event Banner',
    description: 'Official promotional banner for Isha Gramotsavam 2025 sports festival',
    tags: ['banner', 'promotion', 'gramotsavam', '2025', 'sports'],
    keywords: ['isha gramotsavam', 'rural sports', 'volleyball', 'throwball'],
    eventId: 'isha_gramotsavam_2025',
    
    location: {
      venue: 'Isha Yoga Center',
      city: 'Coimbatore',
      state: 'Tamil Nadu'
    }
  },
  
  uploadInfo: {
    uploadedBy: 'admin_design_001',
    uploadedAt: Timestamp.fromDate(new Date('2024-12-15T10:00:00Z')),
    uploadMethod: 'web_upload',
    
    source: {
      type: 'professional_photographer',
      attribution: 'Isha Design Team',
      copyright: 'Isha Foundation',
      license: 'all_rights_reserved'  
    }
  },
  
  moderation: {
    status: 'approved',
    reviewedBy: 'admin_media_001',
    reviewedAt: Timestamp.fromDate(new Date('2024-12-15T11:00:00Z')),
    reviewNotes: 'High quality promotional banner, approved for all platforms'
  },
  
  visibility: {
    status: 'public',
    accessLevel: 'everyone',
    downloadAllowed: true,
    shareAllowed: true
  },
  
  socialMedia: {
    publishedTo: [
      {
        platform: 'facebook',
        postId: 'fb_post_12345',
        publishedAt: Timestamp.fromDate(new Date('2024-12-15T12:00:00Z')),
        status: 'published',
        metrics: {
          likes: 1500,
          shares: 234,
          comments: 89,
          reach: 45000
        }
      },
      {
        platform: 'instagram',
        postId: 'ig_post_67890',
        publishedAt: Timestamp.fromDate(new Date('2024-12-15T12:30:00Z')),
        status: 'published',
        metrics: {
          likes: 2300,
          comments: 156,
          shares: 445
        }
      }
    ]
  }
}
```

### Related Collections
- **events**: Media associated with events
- **teams**: Team photos and videos
- **matches**: Match highlights and documentation
- **venues**: Venue photos and virtual tours
- **users**: User-generated content and profile photos