# Audit Logs Schema Documentation

## Collection: `audit_logs`

### Overview
Comprehensive audit logging system for Isha Gramotsavam platform tracking all user actions, system events, and administrative activities for security, compliance, and troubleshooting purposes.

### Document Structure

```typescript
interface AuditLog {
  id: string; // Audit log identifier (auto-generated)
  
  // Event Classification
  eventType: 'user_action' | 'system_event' | 'admin_action' | 'security_event' | 'data_modification' | 'authentication' | 'authorization' | 'integration' | 'error';
  category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system_configuration' | 'user_management' | 'payment' | 'notification' | 'media' | 'integration' | 'security' | 'performance';
  subCategory?: string; // More specific categorization
  
  // Core Event Information
  action: string; // Specific action performed (e.g., 'user_login', 'team_registration', 'payment_processed')
  description: string; // Human-readable description of the event
  outcome: 'success' | 'failure' | 'partial' | 'error' | 'warning';
  
  // Severity and Impact
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  impact: 'none' | 'low' | 'medium' | 'high' | 'critical'; // Business impact level
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical'; // Security risk level
  
  // Temporal Information
  timestamp: Timestamp; // When the event occurred
  timezone: string; // Timezone of the event
  duration?: number; // Event duration in milliseconds
  
  // User and Authentication Context
  userInfo: {
    // Primary User
    userId?: string; // User who performed the action
    userEmail?: string; // User's email (for correlation)
    userName?: string; // User's display name
    userRole?: string; // User's role at time of action
    
    // Impersonation (if applicable)
    impersonatedBy?: string; // Admin user performing impersonation
    impersonationReason?: string; // Reason for impersonation
    
    // Authentication Details
    authenticationMethod?: 'password' | 'oauth' | 'sso' | 'api_key' | 'token';
    sessionId?: string; // User session identifier
    sessionDuration?: number; // Session duration at time of action
    
    // User State
    accountStatus?: 'active' | 'inactive' | 'suspended' | 'pending';
    profileCompleteness?: number; // Profile completion percentage
    lastLoginAt?: Timestamp; // User's last login time
  };
  
  // System and Technical Context
  systemContext: {
    // Request Information
    requestId?: string; // Unique request identifier
    correlationId?: string; // Correlation ID for related events
    
    // Network Information
    ipAddress: string; // Client IP address
    userAgent?: string; // User agent string
    referer?: string; // HTTP referer
    
    // Device Information
    deviceInfo?: {
      deviceType: 'desktop' | 'mobile' | 'tablet' | 'api' | 'system';
      platform: string; // iOS, Android, Windows, etc.
      browser?: string; // Browser name and version
      appVersion?: string; // Mobile app version
      screenResolution?: string;
    };
    
    // Geographic Information
    location?: {
      country?: string;
      region?: string;
      city?: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
      accuracy?: number; // Location accuracy in meters
    };
    
    // System Performance
    systemLoad?: {
      cpuUsage?: number; // CPU usage percentage
      memoryUsage?: number; // Memory usage percentage
      activeConnections?: number; // Active database connections
      responseTime?: number; // Response time in milliseconds
    };
  };
  
  // Entity and Resource Information
  entityInfo: {
    // Primary Entity
    entityType?: 'user' | 'team' | 'event' | 'match' | 'venue' | 'sport' | 'payment' | 'notification' | 'media' | 'system_config';
    entityId?: string; // ID of the affected entity
    entityName?: string; // Name/title of the entity
    
    // Related Entities
    relatedEntities?: Array<{
      type: string;
      id: string;
      name?: string;
      relationship: string; // How it relates to the primary entity
    }>;
    
    // Entity State
    previousState?: any; // Entity state before the action
    newState?: any; // Entity state after the action
    changeSet?: Array<{
      field: string;
      oldValue: any;
      newValue: any;
      changeType: 'create' | 'update' | 'delete';
    }>;
  };
  
  // Request and Response Details
  requestInfo?: {
    // HTTP Request Details
    method?: string; // HTTP method (GET, POST, etc.)
    url?: string; // Request URL
    endpoint?: string; // API endpoint
    
    // Request Headers
    headers?: {
      [key: string]: string;
    };
    
    // Request Body (sanitized)
    requestBody?: any; // Sanitized request body
    requestSize?: number; // Request size in bytes
    
    // Query Parameters
    queryParameters?: {
      [key: string]: string | string[];
    };
    
    // File Uploads
    uploadedFiles?: Array<{
      fileName: string;
      fileSize: number;
      mimeType: string;
      uploadPath?: string;
    }>;
  };
  
  responseInfo?: {
    // HTTP Response Details
    statusCode?: number; // HTTP status code
    statusMessage?: string; // HTTP status message
    
    // Response Headers
    headers?: {
      [key: string]: string;
    };
    
    // Response Body (sanitized)
    responseBody?: any; // Sanitized response body
    responseSize?: number; // Response size in bytes
    
    // Performance Metrics
    processingTime?: number; // Server processing time in ms
    databaseQueries?: number; // Number of database queries
    cacheHits?: number; // Number of cache hits
    cacheMisses?: number; // Number of cache misses
  };
  
  // Business Context
  businessContext?: {
    // Process Information
    businessProcess?: string; // Business process (registration, payment, etc.)
    processStep?: string; // Step within the process
    workflowId?: string; // Workflow identifier
    
    // Event Context
    eventId?: string; // Associated event
    tournamentLevel?: string; // Tournament level (cluster, division, final)
    sport?: string; // Associated sport
    
    // Financial Context
    transactionId?: string; // Financial transaction ID
    amount?: number; // Transaction amount
    currency?: string; // Currency code
    
    // Operational Context
    venue?: string; // Associated venue
    matchId?: string; // Associated match
    teamId?: string; // Associated team
    
    // Regulatory Context
    complianceRequirement?: string; // Compliance requirement met
    dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  };
  
  // Security Context
  securityContext: {
    // Authentication Security
    authenticationStrength?: 'weak' | 'medium' | 'strong'; // Authentication strength
    multiFactorUsed?: boolean; // Whether MFA was used
    
    // Authorization Details
    permissions?: string[]; // Permissions used for this action
    roles?: string[]; // Roles active at time of action
    
    // Security Flags
    securityFlags?: Array<{
      flag: string; // Security flag name
      value: boolean | string | number;
      description: string;
    }>;
    
    // Threat Intelligence
    threatIndicators?: Array<{
      type: 'ip' | 'user_agent' | 'behavior' | 'geographic';
      indicator: string;
      threatLevel: 'low' | 'medium' | 'high' | 'critical';
      source: string; // Threat intelligence source
    }>;
    
    // Anomaly Detection
    anomalies?: Array<{
      type: string; // Type of anomaly
      score: number; // Anomaly score (0-100)
      baseline: number; // Baseline value
      actualValue: number; // Actual value
      threshold: number; // Threshold for anomaly
    }>;
  };
  
  // Error and Exception Information
  errorInfo?: {
    // Error Details
    errorType?: string; // Type of error
    errorCode?: string; // Application error code
    errorMessage?: string; // Error message
    
    // Exception Details
    exception?: {
      type: string; // Exception type
      message: string; // Exception message
      stackTrace?: string; // Stack trace (sanitized)
      innerException?: string; // Inner exception details
    };
    
    // Recovery Information
    recoveryAction?: string; // Action taken to recover
    recoverySuccessful?: boolean; // Whether recovery was successful
    
    // Impact Assessment
    affectedUsers?: number; // Number of users affected
    affectedSystems?: string[]; // Systems affected by the error
    businessImpact?: string; // Description of business impact
  };
  
  // Data Privacy and Compliance
  privacyInfo: {
    // Personal Data Handling
    containsPersonalData: boolean; // Whether event involves personal data
    dataTypes?: string[]; // Types of personal data involved
    
    // Data Processing Basis
    processingBasis?: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
    consentId?: string; // Consent record ID
    
    // Data Subject Information
    dataSubjects?: Array<{
      userId: string;
      dataTypes: string[]; // Types of personal data for this subject
      processingPurpose: string;
    }>;
    
    // Retention and Deletion
    retentionPeriod?: number; // Retention period in days
    scheduledDeletion?: Timestamp; // When data is scheduled for deletion
    deletionReason?: string; // Reason for data deletion
    
    // Cross-border Transfer
    crossBorderTransfer?: boolean; // Whether data crossed borders
    destinationCountries?: string[]; // Countries data was transferred to
    adequacyDecision?: boolean; // Whether adequate protection exists
  };
  
  // Integration and External Systems
  integrationInfo?: {
    // External System Integration
    externalSystems?: Array<{
      systemName: string; // External system name
      systemType: 'payment_gateway' | 'email_service' | 'sms_service' | 'analytics' | 'storage' | 'other';
      operation: string; // Operation performed with external system
      requestId?: string; // External system request ID
      responseCode?: string; // External system response code
      latency?: number; // Response time from external system
    }>;
    
    // API Integration
    apiCalls?: Array<{
      apiName: string;
      endpoint: string;
      method: string;
      statusCode: number;
      responseTime: number;
      retryCount?: number;
    }>;
    
    // Webhook Information
    webhooks?: Array<{
      webhookUrl: string;
      event: string;
      status: 'success' | 'failure' | 'retry';
      responseCode?: number;
      retryCount?: number;
    }>;
  };
  
  // Performance and Metrics
  performanceInfo?: {
    // Timing Metrics
    timingMetrics: {
      totalTime: number; // Total execution time in ms
      databaseTime?: number; // Time spent on database operations
      externalApiTime?: number; // Time spent on external API calls
      renderTime?: number; // Time spent rendering response
      networkTime?: number; // Network latency
    };
    
    // Resource Usage
    resourceUsage: {
      cpuTime?: number; // CPU time used in ms
      memoryUsed?: number; // Memory used in bytes
      diskIo?: number; // Disk I/O operations
      networkIo?: number; // Network I/O in bytes
    };
    
    // Cache Performance
    cacheMetrics?: {
      cacheHits: number;
      cacheMisses: number;
      cacheHitRatio: number;
      cacheKeys: string[]; // Cache keys accessed
    };
    
    // Database Performance
    databaseMetrics?: {
      queriesExecuted: number;
      totalQueryTime: number;
      slowQueries: Array<{
        query: string; // Sanitized query
        executionTime: number;
        rowsAffected: number;
      }>;
    };
  };
  
  // Regulatory and Compliance Context
  complianceInfo?: {
    // Regulatory Framework
    applicableRegulations?: string[]; // GDPR, CCPA, etc.
    complianceStatus: 'compliant' | 'non_compliant' | 'partial' | 'unknown';
    
    // Audit Requirements
    auditRequirement?: string; // Why this event needs to be audited
    retentionRequirement?: number; // Legal retention requirement in days
    
    // Data Classification
    dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
    
    // Legal Hold
    legalHold?: boolean; // Whether event is under legal hold
    legalHoldId?: string; // Legal hold identifier
    
    // Compliance Checks
    complianceChecks?: Array<{
      checkName: string;
      passed: boolean;
      details?: string;
    }>;
  };
  
  // Alert and Notification Context
  alertInfo?: {
    // Alert Generation
    alertGenerated: boolean; // Whether this event generated an alert
    alertLevel?: 'info' | 'warning' | 'error' | 'critical';
    alertRecipients?: string[]; // Who was notified
    
    // Alert Details
    alertRule?: string; // Alert rule that was triggered
    alertThreshold?: number; // Threshold that was exceeded
    alertFrequency?: number; // How often this alert has fired recently
    
    // Notification Details
    notificationsSent?: Array<{
      channel: 'email' | 'sms' | 'slack' | 'webhook';
      recipient: string;
      status: 'sent' | 'failed' | 'pending';
      sentAt?: Timestamp;
    }>;
  };
  
  // Forensic Information
  forensicInfo?: {
    // Chain of Custody
    custodyChain?: Array<{
      handler: string; // Person/system handling the evidence
      action: string; // Action performed
      timestamp: Timestamp;
      signature?: string; // Digital signature
    }>;
    
    // Evidence Collection
    evidenceCollected?: boolean;
    evidenceLocation?: string; // Where evidence is stored
    evidenceHash?: string; // Hash of collected evidence
    
    // Investigation Context
    investigationId?: string; // Related investigation ID
    caseNumber?: string; // Legal case number
    
    // Digital Fingerprinting
    digitalFingerprints?: Array<{
      type: 'file_hash' | 'network_signature' | 'behavioral_pattern';
      fingerprint: string;
      algorithm: string;
    }>;
  };
  
  // Correlation and Analysis
  correlationInfo?: {
    // Event Correlation
    correlatedEvents?: string[]; // Related audit log IDs
    eventSequence?: number; // Position in event sequence
    eventChain?: string; // Event chain identifier
    
    // Pattern Analysis
    patternMatches?: Array<{
      patternName: string;
      matchConfidence: number; // 0-100
      patternType: 'behavioral' | 'temporal' | 'geographic' | 'technical';
    }>;
    
    // Risk Scoring
    riskScore?: number; // Overall risk score (0-100)
    riskFactors?: Array<{
      factor: string;
      weight: number;
      score: number;
    }>;
    
    // Machine Learning Insights
    mlInsights?: Array<{
      model: string; // ML model name
      prediction: string;
      confidence: number;
      features: { [key: string]: number };
    }>;
  };
  
  // System Metadata
  metadata: {
    // Version Information
    schemaVersion: string; // Audit log schema version
    applicationVersion: string; // Application version
    systemVersion: string; // System version
    
    // Collection Information
    collectionMethod: 'automatic' | 'manual' | 'batch' | 'real_time';
    collectionSource: string; // Source system/component
    
    // Processing Information
    processed: boolean; // Whether log has been processed
    processedAt?: Timestamp; // When log was processed
    processingRules?: string[]; // Processing rules applied
    
    // Storage Information
    storageLocation: string; // Where log is stored
    compressionUsed?: boolean; // Whether log is compressed
    encryptionUsed: boolean; // Whether log is encrypted
    
    // Quality Metrics
    completeness: number; // Completeness score (0-100)
    accuracy: number; // Accuracy score (0-100)
    
    // Lifecycle Information
    createdAt: Timestamp;
    lastModifiedAt?: Timestamp;
    archivedAt?: Timestamp;
    purgeScheduledAt?: Timestamp;
  };
  
  // Custom Fields (for extensibility)
  customFields?: {
    [key: string]: any;
  };
  
  // Tags and Labels
  tags: string[]; // Tags for categorization and search
  labels?: {
    [key: string]: string;
  }; // Key-value labels
}
```

### Sample Audit Log Data

```javascript
{
  id: 'audit_001_user_login',
  eventType: 'user_action',
  category: 'authentication',
  action: 'user_login',
  description: 'User successfully logged into the system',
  outcome: 'success',
  severity: 'info',
  impact: 'none',
  riskLevel: 'low',
  
  timestamp: Timestamp.fromDate(new Date('2025-01-20T10:30:00Z')),
  timezone: 'Asia/Kolkata',
  
  userInfo: {
    userId: 'captain_rural_001',
    userEmail: 'murugan.selvam@gmail.com',
    userName: 'Murugan Selvam',
    userRole: 'captain',
    authenticationMethod: 'password',
    sessionId: 'sess_12345',
    accountStatus: 'active'
  },
  
  systemContext: {
    requestId: 'req_67890',
    ipAddress: '203.192.12.34',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    
    deviceInfo: {
      deviceType: 'desktop',
      platform: 'Windows',
      browser: 'Chrome 120.0.0'
    },
    
    location: {
      country: 'India',
      region: 'Tamil Nadu',
      city: 'Coimbatore'
    }
  },
  
  entityInfo: {
    entityType: 'user',
    entityId: 'captain_rural_001',
    entityName: 'Murugan Selvam'
  },
  
  requestInfo: {
    method: 'POST',
    url: '/api/v1/auth/login',
    endpoint: '/auth/login',
    requestSize: 156
  },
  
  responseInfo: {
    statusCode: 200,
    statusMessage: 'OK',
    responseSize: 1024,
    processingTime: 234
  },
  
  securityContext: {
    authenticationStrength: 'medium',
    multiFactorUsed: false,
    permissions: ['user_read', 'team_read', 'team_write'],
    roles: ['captain']
  },
  
  privacyInfo: {
    containsPersonalData: true,
    dataTypes: ['email', 'name', 'ip_address'],
    processingBasis: 'contract',
    retentionPeriod: 2555 // 7 years
  },
  
  performanceInfo: {
    timingMetrics: {
      totalTime: 234,
      databaseTime: 45,
      renderTime: 12
    },
    resourceUsage: {
      memoryUsed: 2048,
      networkIo: 1180
    }
  },
  
  complianceInfo: {
    applicableRegulations: ['GDPR', 'IT Act 2000'],
    complianceStatus: 'compliant',
    dataClassification: 'internal',
    retentionRequirement: 2555
  },
  
  metadata: {
    schemaVersion: '2.1.0',
    applicationVersion: '1.5.2',
    systemVersion: 'Node.js 18.17.0',
    collectionMethod: 'automatic',
    collectionSource: 'auth_service',
    processed: true,
    processedAt: Timestamp.fromDate(new Date('2025-01-20T10:30:05Z')),
    completeness: 95,
    accuracy: 98,
    createdAt: Timestamp.fromDate(new Date('2025-01-20T10:30:01Z')),
    encryptionUsed: true
  },
  
  tags: ['authentication', 'login', 'captain', 'success']
}
```

### Key Features

#### 1. **Comprehensive Event Tracking**
- All user actions and system events logged
- Detailed context information for forensic analysis
- Performance metrics for system optimization
- Security context for threat detection

#### 2. **Regulatory Compliance**
- GDPR, CCPA, and other regulatory compliance
- Data privacy and retention management
- Legal hold and forensic capabilities
- Audit trail for compliance reporting

#### 3. **Security and Forensics**
- Threat detection and anomaly identification
- Digital fingerprinting and evidence collection
- Chain of custody for legal proceedings
- Correlation analysis for incident investigation

#### 4. **Performance Monitoring**
- System performance metrics
- Resource usage tracking
- Database query performance
- Cache and external API performance

#### 5. **Business Intelligence**
- Business process tracking
- User behavior analysis
- Operational metrics
- Integration monitoring

### Related Collections
- **users**: User actions and authentication events
- **system_config**: System configuration changes
- **payments**: Financial transaction audits
- **teams**: Team management activities
- **matches**: Match and tournament events