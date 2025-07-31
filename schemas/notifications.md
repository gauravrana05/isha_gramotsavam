# Notifications Schema Documentation

## Collection: `notifications`

### Overview
Comprehensive notification management system for Isha Gramotsavam with multi-channel delivery, templates, scheduling, and analytics.

### Document Structure

```typescript
interface Notification {
  id: string; // Notification identifier
  
  // Notification Type and Classification
  type: 'system' | 'user_action' | 'event_update' | 'match_update' | 'registration' | 'verification' | 'payment' | 'reminder' | 'promotional' | 'emergency';
  category: 'registration' | 'verification' | 'match_schedule' | 'results' | 'payment' | 'general' | 'marketing' | 'system_maintenance' | 'emergency';
  subCategory?: string; // More specific categorization
  
  // Priority and Urgency
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  urgency: 'immediate' | 'within_hour' | 'within_day' | 'scheduled';
  
  // Content and Messaging
  content: {
    // Multi-language Support
    messages: {
      [languageCode: string]: {
        title: string; // Notification title
        body: string; // Main notification message
        shortText?: string; // Short version for SMS/mobile
        htmlBody?: string; // HTML version for email
        
        // Rich Content
        emoji?: string; // Emoji for mobile notifications
        imageUrl?: string; // Image for rich notifications
        actionText?: string; // Call-to-action text
        actionUrl?: string; // Call-to-action URL
      };
    };
    
    // Template Information
    templateId?: string; // Reference to notification template
    templateVersion?: string; // Template version used
    
    // Dynamic Content
    variables?: {
      [key: string]: string | number | boolean;
    }; // Variables used in template
    
    // Personalization
    personalized: boolean; // Whether content is personalized
    personalizationData?: {
      recipientName?: string;
      teamName?: string;
      matchDetails?: string;
      customData?: { [key: string]: any };
    };
  };
  
  // Recipient Information
  recipients: {
    // Target Audience
    targetType: 'individual' | 'group' | 'role' | 'all_users' | 'custom_query';
    
    // Individual Recipients
    userIds?: string[]; // Specific user IDs
    
    // Group Recipients
    groups?: Array<{
      type: 'team' | 'sport' | 'role' | 'location' | 'custom';
      identifier: string; // Team ID, sport ID, role name, etc.
      name: string; // Human-readable group name
    }>;
    
    // Role-based Recipients
    roles?: string[]; // User roles to notify
    
    // Location-based Recipients
    locations?: Array<{
      type: 'state' | 'district' | 'panchayat' | 'venue';
      value: string;
    }>;
    
    // Custom Query Recipients
    customQuery?: {
      collection: string;
      filters: Array<{
        field: string;
        operator: string;
        value: any;
      }>;
      description: string; // Human-readable description of query
    };
    
    // Exclusions
    excludeUserIds?: string[]; // Users to exclude
    excludeGroups?: string[]; // Groups to exclude
    
    // Recipient Count
    estimatedRecipients: number; // Estimated number of recipients
    actualRecipients?: number; // Actual number after processing
  };
  
  // Delivery Channels
  channels: {
    // Channel Configuration
    selectedChannels: ('email' | 'sms' | 'push' | 'whatsapp' | 'in_app' | 'web_push')[];
    
    // Channel-specific Settings
    email?: {
      enabled: boolean;
      fromAddress?: string;
      replyToAddress?: string;
      attachments?: Array<{
        name: string;
        url: string;
        mimeType: string;
        size: number;
      }>;
      trackOpens: boolean;
      trackClicks: boolean;
    };
    
    sms?: {
      enabled: boolean;
      senderId?: string;
      messageType: 'transactional' | 'promotional';
      unicode: boolean; // Support for non-English characters
    };
    
    push?: {
      enabled: boolean;
      badge?: number;
      sound?: string;
      category?: string; // iOS notification category
      collapseKey?: string; // Android collapse key
      timeToLive?: number; // TTL for push notifications
    };
    
    whatsapp?: {
      enabled: boolean;
      templateName?: string; // WhatsApp Business template
      templateLanguage?: string;
      mediaUrl?: string; // Media attachment
    };
    
    inApp?: {
      enabled: boolean;
      persistent: boolean; // Whether to persist in notification center
      actionable: boolean; // Whether notification has actions
      autoRead: boolean; // Mark as read after viewing
    };
    
    webPush?: {
      enabled: boolean;
      icon?: string; // Notification icon
      badge?: string; // Badge icon
      vibrate?: number[]; // Vibration pattern
      silent: boolean;
    };
  };
  
  // Scheduling and Timing
  scheduling: {
    // Delivery Timing
    deliveryType: 'immediate' | 'scheduled' | 'triggered' | 'recurring';
    
    scheduledAt?: Timestamp; // When to send (for scheduled notifications)
    
    // Trigger Conditions (for triggered notifications)
    triggers?: Array<{
      event: string; // Event that triggers notification
      conditions: Array<{
        field: string;
        operator: string;
        value: any;
      }>;
      delay?: number; // Delay in minutes after trigger
    }>;
    
    // Recurring Schedule (for recurring notifications)
    recurrence?: {
      pattern: 'daily' | 'weekly' | 'monthly' | 'custom';
      interval: number; // Every N days/weeks/months
      daysOfWeek?: number[]; // For weekly recurrence (0=Sunday)
      dayOfMonth?: number; // For monthly recurrence
      endDate?: Timestamp; // When to stop recurring
      maxOccurrences?: number; // Maximum number of occurrences
    };
    
    // Time Zone Handling
    timezone: string; // Timezone for scheduling
    localizeTime: boolean; // Whether to send at recipient's local time
    
    // Delivery Windows
    deliveryWindow?: {
      startHour: number; // Don't send before this hour (0-23)
      endHour: number; // Don't send after this hour (0-23)
      daysOfWeek: number[]; // Days when delivery is allowed
      respectUserPreferences: boolean; // Respect user's notification preferences
    };
  };
  
  // Context and Association
  context: {
    // Related Entities
    eventId?: string; // Associated event
    matchId?: string; // Associated match
    teamId?: string; // Associated team
    userId?: string; // Primary user (for user-specific notifications)
    venueId?: string; // Associated venue
    
    // Activity Context
    activityType?: string; // Type of activity that triggered notification
    activityId?: string; // ID of the triggering activity
    
    // Business Context
    businessProcess?: string; // Business process (registration, verification, etc.)
    processStep?: string; // Step in the process
    
    // Parent Notification
    parentNotificationId?: string; // Parent notification (for follow-ups)
    campaignId?: string; // Marketing campaign ID
  };
  
  // Delivery Status and Tracking
  delivery: {
    // Overall Status
    status: 'draft' | 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'cancelled';
    
    // Channel-specific Delivery Status
    channelStatus: {
      [channel: string]: {
        status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'unsubscribed';
        attemptCount: number;
        lastAttemptAt?: Timestamp;
        deliveredAt?: Timestamp;
        errorMessage?: string;
        providerId?: string; // External service message ID
        
        // Metrics
        metrics?: {
          sent: number;
          delivered: number;
          failed: number;
          bounced: number;
          opened?: number; // Email opens
          clicked?: number; // Email/SMS clicks
          unsubscribed?: number;
        };
      };
    };
    
    // Retry Configuration
    retryPolicy: {
      maxRetries: number;
      retryDelay: number; // Minutes between retries
      backoffMultiplier: number; // Exponential backoff multiplier
      failedChannels: string[]; // Channels that have failed
    };
    
    // Delivery Timeline
    timeline: Array<{
      timestamp: Timestamp;
      event: string; // created, queued, sent, delivered, failed, etc.
      channel?: string;
      details?: string;
      metadata?: { [key: string]: any };
    }>;
  };
  
  // User Interaction and Engagement
  engagement: {
    // Interaction Tracking
    interactions: Array<{
      userId: string;
      action: 'viewed' | 'clicked' | 'dismissed' | 'replied' | 'unsubscribed' | 'marked_spam';
      timestamp: Timestamp;
      channel: string;
      
      // Action Details
      actionDetails?: {
        linkClicked?: string; // Which link was clicked
        replyContent?: string; // Reply message content
        dismissReason?: string; // Reason for dismissal
      };
      
      // Device/Context Information
      deviceInfo?: {
        deviceType: string;
        platform: string;
        appVersion?: string;
        location?: string;
      };
    }>;
    
    // Aggregated Metrics
    metrics: {
      totalViews: number;
      totalClicks: number;
      totalDismissals: number;
      totalReplies: number;
      totalUnsubscribes: number;
      
      // Engagement Rates
      openRate?: number; // For email
      clickThroughRate?: number;
      responseRate?: number;
      unsubscribeRate?: number;
      
      // Time-based Metrics
      averageReadTime?: number; // Seconds
      peakEngagementTime?: Timestamp;
    };
    
    // A/B Testing Results
    abTestResults?: {
      variant: string; // A, B, C, etc.
      conversionRate: number;
      engagementRate: number;
      statisticalSignificance: number;
    };
  };
  
  // Personalization and Segmentation
  personalization: {
    // Audience Segmentation
    segments: Array<{
      segmentId: string;
      segmentName: string;
      criteria: string;
      recipientCount: number;
    }>;
    
    // Dynamic Content Rules
    contentRules?: Array<{
      condition: string; // Condition for content variation
      content: {
        title?: string;
        body?: string;
        actionText?: string;
        imageUrl?: string;
      };
      appliedTo: number; // Number of recipients this rule applied to
    }>;
    
    // User Preferences Consideration
    respectsUserPreferences: boolean;
    preferenceOverrides?: {
      channel?: string; // Override user's preferred channel
      frequency?: string; // Override frequency preference
      reason: string; // Reason for override
    };
  };
  
  // Compliance and Legal
  compliance: {
    // Regulatory Compliance
    gdprCompliant: boolean;
    canSpamCompliant: boolean;
    caslCompliant: boolean; // Canadian Anti-Spam Law
    
    // Consent Management
    consentRequired: boolean;
    consentObtained: Array<{
      userId: string;
      consentType: 'explicit' | 'implicit' | 'legitimate_interest';
      consentDate: Timestamp;
      consentMethod: string;
      withdrawalMethod?: string;
      withdrawnAt?: Timestamp;
    }>;
    
    // Opt-out Management
    optOutHandling: {
      optOutUrl?: string; // One-click opt-out URL
      optOutInstructions: string;
      honorOptOuts: boolean;
      
      // Opt-out Statistics
      optOuts: Array<{
        userId: string;
        optedOutAt: Timestamp;
        reason?: string;
        channel?: string; // Channel-specific opt-out
      }>;
    };
    
    // Data Retention
    dataRetention: {
      retentionPeriod: number; // Days to retain notification data
      purgeScheduled?: Timestamp; // When data will be purged
      anonymizeAfter?: number; // Days after which to anonymize data
    };
  };
  
  // Analytics and Reporting
  analytics: {
    // Performance Metrics
    performance: {
      deliveryRate: number; // Percentage successfully delivered
      bounceRate: number; // Percentage bounced
      failureRate: number; // Percentage failed
      
      // Channel Performance
      channelPerformance: Array<{
        channel: string;
        sent: number;
        delivered: number;
        opened?: number;
        clicked?: number;
        cost: number; // Cost for this channel
        roi?: number; // Return on investment
      }>;
      
      // Time to Delivery
      averageDeliveryTime: number; // Minutes from creation to delivery
      deliveryTimeByChannel: {
        [channel: string]: number;
      };
    };
    
    // Business Impact
    businessImpact?: {
      // Conversion Tracking
      conversions: Array<{
        userId: string;
        conversionType: string; // registration, payment, etc.
        conversionValue: number;
        attributedRevenue?: number;
        conversionTime: Timestamp;
      }>;
      
      // Goal Achievement
      goalMetrics?: {
        goalType: string;
        targetValue: number;
        actualValue: number;
        achievementRate: number;
      };
    };
    
    // Cost Analysis
    costAnalysis: {
      totalCost: number;
      costPerRecipient: number;
      costPerChannel: {
        [channel: string]: number;
      };
      costPerConversion?: number;
    };
  };
  
  // Quality Control
  quality: {
    // Content Quality
    contentScore: number; // 1-10 quality score
    
    qualityChecks: Array<{
      check: string; // Type of quality check
      passed: boolean;
      score?: number;
      feedback?: string;
    }>;
    
    // Deliverability Score
    deliverabilityScore?: number; // Predicted deliverability (1-100)
    
    spamScore?: number; // Spam likelihood score
    
    // Review Status
    reviewStatus: 'not_required' | 'pending' | 'approved' | 'rejected';
    reviewedBy?: string; // Admin who reviewed
    reviewedAt?: Timestamp;
    reviewNotes?: string;
  };
  
  // System Integration
  integration: {
    // External Systems
    externalSystems: Array<{
      system: string; // External system name
      messageId: string; // External system message ID
      status: string;
      lastSyncAt: Timestamp;
    }>;
    
    // Webhook Integrations
    webhooks?: Array<{
      url: string;
      events: string[]; // Events that trigger webhook
      status: 'active' | 'inactive' | 'failed';
      lastTriggeredAt?: Timestamp;
    }>;
    
    // API Integration
    apiCallbacks?: Array<{
      callbackUrl: string;
      method: 'GET' | 'POST' | 'PUT';
      expectedEvents: string[];
      authHeaders?: { [key: string]: string };
    }>;
  };
  
  // Workflow and Automation
  workflow: {
    // Workflow State
    currentStage: string; // Current workflow stage
    
    stages: Array<{
      stage: string;
      status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
      startedAt?: Timestamp;
      completedAt?: Timestamp;
      assignedTo?: string;
      notes?: string;
    }>;
    
    // Automation Rules
    automationRules?: Array<{
      rule: string;
      condition: string;
      action: string;
      applied: boolean;
      appliedAt?: Timestamp;
    }>;
    
    // Follow-up Actions
    followUpActions?: Array<{
      action: string;
      scheduledFor: Timestamp;
      status: 'pending' | 'completed' | 'cancelled';
      dependsOn?: string; // Condition for execution
    }>;
  };
  
  // System Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // User who created the notification
  lastModifiedBy?: string; // User who last modified
  
  // Archival and Cleanup
  archived: boolean;
  archivedAt?: Timestamp;
  archivedReason?: string;
  
  // Version Control
  version: number; // Notification version
  previousVersionId?: string; // Previous version ID
  
  // Tags and Classification
  tags: string[]; // Tags for organization and search
  internalNotes?: string; // Internal notes for admins
  
  // Error Handling
  errors?: Array<{
    errorType: string;
    errorMessage: string;
    errorCode?: string;
    occurredAt: Timestamp;
    resolved: boolean;
    resolvedAt?: Timestamp;
    resolution?: string;
  }>;
}
```

### Sample Notification Data

```javascript
{
  id: 'notif_welcome_captain_001',
  type: 'registration',
  category: 'registration',
  priority: 'normal',
  urgency: 'within_hour',
  
  content: {
    messages: {
      'en': {
        title: 'Welcome to Isha Gramotsavam 2025!',
        body: 'Dear {captain_name}, your registration as team captain has been successful. Team ID: {team_id}. Next step: Complete your team registration by adding all players.',
        shortText: 'Registration successful! Team ID: {team_id}. Add players next.',
        actionText: 'Complete Team Registration',
        actionUrl: '/captain/teams/{team_id}/players'
      },
      'ta': {
        title: 'ஈஷா கிராமோற்சவம் 2025 க்கு வருக!',
        body: 'அன்புள்ள {captain_name}, அணி தலைவராக உங்கள் பதிவு வெற்றிகரமாக உள்ளது. அணி ID: {team_id}. அடுத்த கட்டம்: அனைத்து வீரர்களையும் சேர்த்து உங்கள் அணி பதிவை முடிக்கவும்.',
        shortText: 'பதிவு வெற்றி! அணி ID: {team_id}. வீரர்களை சேர்க்கவும்.',
        actionText: 'அணி பதிவை முடிக்கவும்',
        actionUrl: '/captain/teams/{team_id}/players'
      }
    },
    templateId: 'welcome_captain',
    templateVersion: '1.2',
    variables: {
      captain_name: 'Murugan Selvam',
      team_id: 'rural_warriors_001'
    },
    personalized: true
  },
  
  recipients: {
    targetType: 'individual',
    userIds: ['captain_rural_001'],
    estimatedRecipients: 1,
    actualRecipients: 1
  },
  
  channels: {
    selectedChannels: ['email', 'sms', 'in_app'],
    email: {
      enabled: true,
      fromAddress: 'noreply@isha.org',
      trackOpens: true,
      trackClicks: true
    },
    sms: {
      enabled: true,
      senderId: 'ISHA',
      messageType: 'transactional',
      unicode: true
    },
    inApp: {
      enabled: true,
      persistent: true,
      actionable: true,
      autoRead: false
    }
  },
  
  scheduling: {
    deliveryType: 'triggered',
    triggers: [
      {
        event: 'user_registered_as_captain',
        delay: 5 // 5 minutes after registration
      }
    ],
    timezone: 'Asia/Kolkata',
    localizeTime: false
  },
  
  context: {
    eventId: 'isha_gramotsavam_2025',
    userId: 'captain_rural_001',
    activityType: 'registration',
    businessProcess: 'team_registration',
    processStep: 'captain_registration_complete'
  },
  
  delivery: {
    status: 'sent',
    channelStatus: {
      email: {
        status: 'delivered',
        attemptCount: 1,
        deliveredAt: Timestamp.fromDate(new Date('2025-01-20T10:35:00Z')),
        providerId: 'msg_email_12345'
      },
      sms: {
        status: 'delivered',
        attemptCount: 1,
        deliveredAt: Timestamp.fromDate(new Date('2025-01-20T10:31:00Z')),
        providerId: 'msg_sms_67890'
      },
      inApp: {
        status: 'delivered',
        attemptCount: 1,
        deliveredAt: Timestamp.fromDate(new Date('2025-01-20T10:30:00Z'))
      }
    }
  },
  
  engagement: {
    interactions: [
      {
        userId: 'captain_rural_001',
        action: 'clicked',
        timestamp: Timestamp.fromDate(new Date('2025-01-20T10:45:00Z')),
        channel: 'email',
        actionDetails: {
          linkClicked: '/captain/teams/rural_warriors_001/players'
        }
      }
    ],
    metrics: {
      totalViews: 1,
      totalClicks: 1,
      clickThroughRate: 100
    }
  }
}
```

### Related Collections
- **users**: Notification recipients and preferences
- **events**: Event-related notifications
- **teams**: Team-specific notifications
- **matches**: Match updates and alerts
- **system_config**: Notification settings and templates