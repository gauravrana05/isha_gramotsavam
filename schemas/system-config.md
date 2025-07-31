# System Configuration Schema Documentation

## Collection: `system_config`

### Overview
Centralized system configuration management for Isha Gramotsavam platform with comprehensive settings for events, payments, verification, and operational parameters.

### Document Structure

```typescript
interface SystemConfig {
  id: string; // Configuration identifier (typically 'main')
  
  // Event Management Settings
  eventSettings: {
    currentEvent: string; // Current active event ID
    registrationOpen: boolean; // Global registration status
    maxTeamsPerSport: number; // Maximum teams allowed per sport
    registrationFee: number; // Standard registration fee in INR
    lateRegistrationFee: number; // Late registration penalty fee
    registrationDeadline: Timestamp; // Final registration deadline
    
    // Registration Periods
    registrationPeriods: Array<{
      name: string; // Period name (e.g., 'early_bird', 'regular', 'late')
      startDate: Timestamp;
      endDate: Timestamp;
      fee: number;
      discountPercentage?: number;
    }>;
    
    // Event Timeline
    eventTimeline: {
      announcementDate: Timestamp; // Event announcement
      registrationStart: Timestamp; // Registration opening
      registrationEnd: Timestamp; // Registration closing
      verificationDeadline: Timestamp; // Document verification deadline
      eventStart: Timestamp; // Event start date
      eventEnd: Timestamp; // Event end date
    };
    
    // Capacity Management
    capacityLimits: {
      totalParticipants: number; // Maximum total participants
      totalTeams: number; // Maximum total teams
      perSportLimits: {
        [sportId: string]: {
          maxTeams: number;
          maxParticipants: number;
        };
      };
    };
  };
  
  // Eligibility and Verification Settings
  eligibilitySettings: {
    // Age Restrictions
    ageRestrictions: {
      minAge: number; // Minimum age (16)
      maxAge: number; // Maximum age (35)
      maxUnder21Players: number; // Max under-21 players per team (3)
      ageCalculationMethod: 'event_start_date' | 'registration_date';
    };
    
    // Geographic Restrictions
    geographicRestrictions: {
      panchayatBased: boolean; // Panchayat-based eligibility
      allowedStates: string[]; // Allowed states for participation
      allowedDistricts?: string[]; // Specific districts if applicable
      residenceVerificationRequired: boolean;
      minimumResidenceMonths: number; // Minimum residence duration
      ruralPreference: boolean; // Preference for rural participants
    };
    
    // Required Documents
    requiredDocuments: {
      individual: string[]; // Required for each individual
      team: string[]; // Required for team registration
      captain: string[]; // Additional documents for captain
      optional: string[]; // Optional documents
    };
    
    // Team Composition Rules
    teamComposition: {
      genderRestrictions: boolean; // Enforce gender restrictions
      mixedTeamsAllowed: boolean; // Allow mixed gender teams
      minimumLocalPlayers: number; // Min players from local area
      captainEligibility: {
        minAge: number;
        experienceRequired: boolean;
        residencyRequired: boolean;
      };
    };
  };
  
  // Tournament Structure Settings
  tournamentSettings: {
    structure: 'single_elimination' | 'double_elimination' | 'round_robin' | 'cluster_division_final';
    levels: number; // Number of tournament levels
    
    // Level Configuration
    levelConfig: Array<{
      id: string; // Level identifier
      name: string; // Display name
      qualificationCriteria: string;
      maxTeams: number;
      format: 'knockout' | 'round_robin' | 'swiss';
    }>;
    
    // Match Formats by Sport
    matchFormat: {
      [sportId: string]: {
        format: string; // e.g., 'best_of_5_sets'
        pointsPerSet: number;
        finalSetPoints?: number;
        timeoutsPerSet: number;
        maxMatchDuration: number; // minutes
      };
    };
    
    // Progression Rules
    progressionRules: {
      tiebreakers: string[]; // Tiebreaker rules in order of priority
      advancementCriteria: {
        [level: string]: string; // How teams advance from each level
      };
    };
  };
  
  // Payment and Financial Settings
  paymentSettings: {
    enabled: boolean; // Payment system enabled
    methods: string[]; // Available payment methods
    currency: 'INR' | 'USD' | 'EUR'; // Primary currency
    
    // Payment Gateway Configuration
    gateways: Array<{
      name: string; // Gateway name (e.g., 'razorpay')
      enabled: boolean;
      priority: number; // Gateway priority order
      supportedMethods: string[];
      processingFee: number; // Processing fee percentage
    }>;
    
    // Refund Policy
    refundPolicy: {
      refundsAllowed: boolean;
      refundDeadline?: Timestamp; // Last date for refunds
      refundPercentage: number; // Refund percentage
      processingTime: number; // Refund processing time in days
      conditions: string[]; // Refund conditions
    };
    
    // Pricing Structure
    pricing: {
      baseFee: number; // Base registration fee
      sportSpecificFees: {
        [sportId: string]: number; // Additional fee per sport
      };
      lateFee: number; // Late registration penalty
      processingFee: number; // Payment processing fee
      
      // Discounts
      discounts: Array<{
        code: string; // Discount code
        type: 'percentage' | 'fixed';
        value: number;
        validFrom: Timestamp;
        validUntil: Timestamp;
        maxUses?: number;
        minRegistrations?: number; // Minimum registrations for discount
      }>;
    };
  };
  
  // Verification and Approval Settings
  verificationSettings: {
    autoVerification: boolean; // Automatic verification enabled
    manualReviewRequired: boolean; // Manual review required
    verificationTimeoutDays: number; // Days to complete verification
    
    // Document Verification
    documentVerification: {
      autoScan: boolean; // Automatic document scanning
      ocrEnabled: boolean; // OCR for document text extraction
      faceMatch: boolean; // Face matching with photos
      documentTypes: {
        [docType: string]: {
          required: boolean;
          autoVerify: boolean;
          validityPeriod?: number; // Document validity in months
        };
      };
    };
    
    // Verification Workflow
    verificationWorkflow: Array<{
      step: string; // Verification step name
      order: number; // Step order
      automate: boolean; // Can be automated
      requiredRole: string; // Role required to complete step
      timeoutHours: number; // Step timeout
    }>;
    
    // Approval Levels
    approvalLevels: Array<{
      level: string; // Approval level name
      requiredRole: string; // Role required for this level
      conditions: string[]; // Conditions for this level
      autoApprove: boolean; // Can be auto-approved
    }>;
  };
  
  // System Limits and Constraints
  systemLimits: {
    // File Upload Limits
    files: {
      maxFileSize: number; // Maximum file size in bytes
      allowedFileTypes: string[]; // Allowed file extensions
      maxFilesPerUser: number; // Max files per user
      totalStorageLimit: number; // Total storage limit in GB
    };
    
    // User and Team Limits
    users: {
      maxPlayersPerTeam: number; // Maximum players in a team
      minPlayersPerTeam: number; // Minimum players in a team
      maxTeamsPerUser: number; // Max teams a user can join
      maxTeamNameLength: number; // Maximum team name length
    };
    
    // Performance Limits
    performance: {
      maxConcurrentUsers: number; // Maximum concurrent users
      rateLimit: {
        requests: number; // Requests per minute
        window: number; // Time window in seconds
      };
      sessionTimeout: number; // Session timeout in minutes
    };
    
    // Data Retention
    dataRetention: {
      userDataMonths: number; // User data retention period
      matchDataYears: number; // Match data retention period
      documentStorageYears: number; // Document storage period
      analyticsDataYears: number; // Analytics data retention
    };
  };
  
  // Notification and Communication Settings
  notificationSettings: {
    // Channel Configuration
    channels: {
      email: {
        enabled: boolean;
        provider: string; // Email service provider
        fromAddress: string;
        replyToAddress: string;
        rateLimitPerHour: number;
      };
      sms: {
        enabled: boolean;
        provider: string; // SMS service provider
        senderId: string;
        rateLimitPerHour: number;
        internationalEnabled: boolean;
      };
      push: {
        enabled: boolean;
        provider: string; // Push notification provider
        appId: string;
        rateLimitPerHour: number;
      };
      whatsapp: {
        enabled: boolean;
        businessAccountId: string;
        rateLimitPerHour: number;
      };
    };
    
    // Default Settings
    defaultLanguage: 'english' | 'tamil' | 'hindi' | 'kannada' | 'malayalam';
    supportedLanguages: string[];
    
    // Notification Types
    notificationTypes: {
      [type: string]: {
        enabled: boolean;
        channels: string[]; // Which channels to use
        priority: 'low' | 'medium' | 'high' | 'urgent';
        template: string; // Template identifier
      };
    };
    
    // Scheduling
    scheduling: {
      batchProcessing: boolean; // Batch notifications
      batchSize: number; // Notifications per batch
      retryAttempts: number; // Retry failed notifications
      retryDelay: number; // Delay between retries in minutes
    };
  };
  
  // Security and Privacy Settings
  securitySettings: {
    // Authentication
    authentication: {
      multiFactorRequired: boolean; // MFA requirement
      passwordMinLength: number; // Minimum password length
      passwordComplexity: boolean; // Password complexity rules
      sessionTimeout: number; // Session timeout in minutes
      maxLoginAttempts: number; // Max failed login attempts
      lockoutDuration: number; // Account lockout duration in minutes
    };
    
    // Data Protection
    dataProtection: {
      encryptionEnabled: boolean; // Data encryption enabled
      dataAnonymization: boolean; // Anonymize user data
      gdprCompliance: boolean; // GDPR compliance mode
      dataExportEnabled: boolean; // User data export
      rightToForgotten: boolean; // Right to be forgotten
    };
    
    // Access Control
    accessControl: {
      roleBasedAccess: boolean; // Role-based access control
      ipRestrictions: string[]; // IP address restrictions
      geofencing: boolean; // Geographic access restrictions
      deviceTracking: boolean; // Track user devices
    };
    
    // Audit and Monitoring
    audit: {
      auditLogging: boolean; // Enable audit logging
      logRetentionDays: number; // Log retention period
      sensitiveDataLogging: boolean; // Log sensitive operations
      realTimeMonitoring: boolean; // Real-time monitoring
    };
  };
  
  // Feature Flags and Toggles
  featureFlags: {
    [featureName: string]: {
      enabled: boolean;
      rolloutPercentage: number; // Percentage of users to enable for
      conditions?: string[]; // Conditions for enabling
      expiryDate?: Timestamp; // Feature flag expiry
    };
  };
  
  // Integration Settings
  integrations: {
    // Third-party Services
    services: {
      googleMaps: {
        enabled: boolean;
        apiKey: string;
        rateLimitPerDay: number;
      };
      socialMedia: {
        facebook: { enabled: boolean; appId: string; };
        instagram: { enabled: boolean; accessToken: string; };
        youtube: { enabled: boolean; channelId: string; };
        twitter: { enabled: boolean; apiKey: string; };
      };
      analytics: {
        googleAnalytics: { enabled: boolean; trackingId: string; };
        mixpanel: { enabled: boolean; projectId: string; };
        customAnalytics: { enabled: boolean; endpoint: string; };
      };
    };
    
    // Webhooks
    webhooks: Array<{
      name: string;
      url: string;
      events: string[]; // Events to trigger webhook
      enabled: boolean;
      secret: string; // Webhook secret for verification
      retryAttempts: number;
    }>;
  };
  
  // Maintenance and Operations
  maintenance: {
    maintenanceMode: boolean; // System maintenance mode
    maintenanceMessage?: string; // Message to show during maintenance
    allowedUsers?: string[]; // Users allowed during maintenance
    
    // Scheduled Maintenance
    scheduledMaintenance: Array<{
      name: string;
      startTime: Timestamp;
      endTime: Timestamp;
      description: string;
      impact: 'low' | 'medium' | 'high';
      notifyUsers: boolean;
    }>;
    
    // Backup Configuration
    backup: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly';
      retentionDays: number;
      storageLocation: string[];
      encryptBackups: boolean;
    };
  };
  
  // Localization and Internationalization
  localization: {
    defaultLocale: 'en-US' | 'ta-IN' | 'hi-IN';
    supportedLocales: string[];
    
    // Currency and Number Formatting
    formatting: {
      currency: {
        symbol: string;
        position: 'before' | 'after';
        decimalPlaces: number;
      };
      numbers: {
        decimalSeparator: string;
        thousandsSeparator: string;
      };
      dates: {
        format: string; // Date format string
        timezone: string; // Default timezone
      };
    };
    
    // Content Management
    content: {
      dynamicContent: boolean; // Dynamic content loading
      fallbackLanguage: string; // Fallback language
      translateUserContent: boolean; // Translate user-generated content
    };
  };
  
  // Performance and Monitoring
  performance: {
    // Caching
    caching: {
      enabled: boolean;
      cacheTTL: number; // Cache time-to-live in seconds
      cacheProvider: 'redis' | 'memory' | 'database';
      maxCacheSize: number; // Maximum cache size in MB
    };
    
    // Rate Limiting
    rateLimiting: {
      enabled: boolean;
      globalLimit: number; // Global requests per minute
      userLimit: number; // Per-user requests per minute
      exemptRoles: string[]; // Roles exempt from rate limiting
    };
    
    // Monitoring
    monitoring: {
      enabled: boolean;
      alertThresholds: {
        errorRate: number; // Error rate threshold
        responseTime: number; // Response time threshold in ms
        cpuUsage: number; // CPU usage threshold
        memoryUsage: number; // Memory usage threshold
      };
      alertChannels: string[]; // Where to send alerts
    };
  };
  
  // API Configuration
  apiConfiguration: {
    version: string; // Current API version
    baseUrl: string; // API base URL
    
    // Rate Limiting
    rateLimits: {
      anonymous: number; // Requests per hour for anonymous users
      authenticated: number; // Requests per hour for authenticated users
      premium: number; // Requests per hour for premium users
    };
    
    // CORS Settings
    corsSettings: {
      allowedOrigins: string[];
      allowedMethods: string[];
      allowedHeaders: string[];
      maxAge: number; // Preflight cache duration
    };
    
    // Response Configuration
    response: {
      defaultPageSize: number; // Default pagination size
      maxPageSize: number; // Maximum pagination size
      includeMetadata: boolean; // Include response metadata
      compressionEnabled: boolean; // Enable response compression
    };
  };
  
  // Audit and Metadata
  metadata: {
    version: string; // Configuration version
    lastUpdated: Timestamp;
    updatedBy: string; // User who last updated
    changeHistory: Array<{
      timestamp: Timestamp;
      updatedBy: string;
      changes: string[];
      reason?: string;
    }>;
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Sample System Configuration

```javascript
{
  id: 'main',
  
  eventSettings: {
    currentEvent: 'isha_gramotsavam_2025',
    registrationOpen: true,
    maxTeamsPerSport: 128,
    registrationFee: 750,
    lateRegistrationFee: 1000,
    registrationDeadline: Timestamp.fromDate(new Date('2025-02-15T23:59:59Z')),
    
    capacityLimits: {
      totalParticipants: 2000,
      totalTeams: 200,
      perSportLimits: {
        'volleyball_men': { maxTeams: 64, maxParticipants: 768 },
        'volleyball_women': { maxTeams: 64, maxParticipants: 768 },
        'throwball_women': { maxTeams: 72, maxParticipants: 864 }
      }
    }
  },
  
  eligibilitySettings: {
    ageRestrictions: {
      minAge: 16,
      maxAge: 35,
      maxUnder21Players: 3,
      ageCalculationMethod: 'event_start_date'
    },
    
    geographicRestrictions: {
      panchayatBased: true,
      allowedStates: ['Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh'],
      residenceVerificationRequired: true,
      minimumResidenceMonths: 12,
      ruralPreference: true
    },
    
    requiredDocuments: {
      individual: ['id_proof', 'age_proof', 'medical_certificate', 'panchayat_certificate'],
      team: ['team_photograph', 'captain_documents'],
      captain: ['leadership_experience', 'additional_id_proof']
    }
  },
  
  paymentSettings: {
    enabled: true,
    methods: ['razorpay', 'upi', 'netbanking', 'card'],
    currency: 'INR',
    
    refundPolicy: {
      refundsAllowed: false,
      refundPercentage: 0,
      conditions: ['No refunds after verification begins']
    }
  },
  
  verificationSettings: {
    autoVerification: false,
    manualReviewRequired: true,
    verificationTimeoutDays: 5,
    
    documentVerification: {
      autoScan: true,
      ocrEnabled: true,
      faceMatch: false
    }
  },
  
  systemLimits: {
    files: {
      maxFileSize: 10485760, // 10MB
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf'],
      maxFilesPerUser: 20
    },
    
    users: {
      maxPlayersPerTeam: 12,
      minPlayersPerTeam: 6,
      maxTeamsPerUser: 2,
      maxTeamNameLength: 50
    }
  },
  
  notificationSettings: {
    channels: {
      email: {
        enabled: true,
        provider: 'sendgrid',
        fromAddress: 'noreply@isha.org',
        rateLimitPerHour: 1000
      },
      sms: {
        enabled: true,
        provider: 'twilio',
        senderId: 'ISHA',
        rateLimitPerHour: 500
      }
    },
    
    defaultLanguage: 'english',
    supportedLanguages: ['english', 'tamil', 'hindi']
  },
  
  featureFlags: {
    liveStreaming: { enabled: true, rolloutPercentage: 100 },
    advancedAnalytics: { enabled: false, rolloutPercentage: 0 },
    mobileApp: { enabled: true, rolloutPercentage: 50 }
  },
  
  maintenance: {
    maintenanceMode: false,
    backup: {
      enabled: true,
      frequency: 'daily',
      retentionDays: 30,
      encryptBackups: true
    }
  }
}
```

### Key Features

#### 1. **Comprehensive Configuration Management**
- Centralized settings for all system components
- Environment-specific configurations
- Feature flag management for gradual rollouts
- Real-time configuration updates

#### 2. **Event and Tournament Management**
- Registration timeline management
- Capacity and limit enforcement
- Multi-level tournament configuration
- Sport-specific rule settings

#### 3. **Security and Compliance**
- Data protection and privacy settings
- Authentication and authorization rules
- Audit logging and monitoring
- GDPR compliance features

#### 4. **Payment and Financial Controls**
- Multiple payment gateway support
- Flexible pricing structures
- Refund policy management
- Discount and promotion handling

#### 5. **Operational Excellence**
- System maintenance scheduling
- Performance monitoring and alerts
- Backup and disaster recovery
- Rate limiting and load management

### Usage Examples

#### Updating Registration Settings
```javascript
await updateDoc(doc(db, 'system_config', 'main'), {
  'eventSettings.registrationOpen': false,
  'eventSettings.registrationDeadline': Timestamp.fromDate(new Date('2025-02-10T23:59:59Z')),
  'updatedAt': serverTimestamp()
});
```

#### Managing Feature Flags
```javascript
await updateDoc(doc(db, 'system_config', 'main'), {
  'featureFlags.liveStreaming.enabled': true,
  'featureFlags.liveStreaming.rolloutPercentage': 100,
  'updatedAt': serverTimestamp()
});
```

#### Setting Maintenance Mode
```javascript
await updateDoc(doc(db, 'system_config', 'main'), {
  'maintenance.maintenanceMode': true,
  'maintenance.maintenanceMessage': 'System maintenance in progress. Please try again later.',
  'updatedAt': serverTimestamp()
});
```

### Related Collections
- **events**: Event settings reference current event
- **sports**: Tournament settings affect sports configuration
- **users**: User limits and authentication settings
- **teams**: Team limits and verification settings
- **payments**: Payment configuration affects all transactions

### Security Considerations
- Configuration changes require admin privileges
- Sensitive settings (API keys, secrets) should be encrypted
- Configuration history maintained for audit purposes
- Real-time validation of configuration changes