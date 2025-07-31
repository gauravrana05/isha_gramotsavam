# Analytics Schema Documentation

## Collection: `analytics`

### Overview
Comprehensive analytics and reporting system for Isha Gramotsavam with real-time metrics, performance tracking, and business intelligence data.

### Document Structure

```typescript
interface Analytics {
  id: string; // Analytics identifier (e.g., 'overview', 'daily_2025_03_01')
  
  // Analytics Type and Scope
  type: 'overview' | 'daily' | 'weekly' | 'monthly' | 'event' | 'sport_specific' | 'real_time';
  scope: 'global' | 'event' | 'sport' | 'venue' | 'team' | 'user';
  eventId?: string; // Associated event ID
  sportId?: string; // Associated sport ID
  venueId?: string; // Associated venue ID
  
  // Time Period
  period: {
    startDate: Timestamp;
    endDate: Timestamp;
    timezone: string;
    granularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
  };
  
  // Registration Analytics
  registrationStats: {
    total: {
      registrations: number; // Total registrations
      completedRegistrations: number; // Fully completed registrations
      pendingRegistrations: number; // Pending registrations
      cancelledRegistrations: number; // Cancelled registrations
    };
    
    // Verification Status
    verification: {
      verified: number; // Verified teams/users
      underReview: number; // Under review
      rejected: number; // Rejected
      needsCorrection: number; // Needs correction
    };
    
    // Payment Status
    payment: {
      paid: number; // Paid registrations
      pending: number; // Pending payments
      failed: number; // Failed payments
      refunded: number; // Refunded payments
      totalAmount: number; // Total amount collected
    };
    
    // Timeline Data
    timeline: Array<{
      date: string; // YYYY-MM-DD format
      registrations: number;
      completions: number;
      payments: number;
      cumulativeTotal: number;
    }>;
    
    // Registration Sources
    sources: Array<{
      source: string; // Registration source
      count: number;
      percentage: number;
    }>;
  };
  
  // Participation Analytics
  participationStats: {
    // Demographics
    demographics: {
      totalParticipants: number;
      genderDistribution: {
        male: number;
        female: number;
        other: number;
      };
      
      ageDistribution: {
        under18: number;
        age18to21: number;
        age22to25: number;
        age26to30: number;
        age31to35: number;
        over35: number;
        averageAge: number;
      };
      
      experienceLevel: {
        beginner: number;
        intermediate: number;
        advanced: number;
        professional: number;
      };
    };
    
    // Geographic Distribution
    geographic: {
      states: Array<{
        state: string;
        participants: number;
        teams: number;
        percentage: number;
      }>;
      
      districts: Array<{
        district: string;
        state: string;
        participants: number;
        teams: number;
        percentage: number;
      }>;
      
      panchayats: Array<{
        panchayat: string;
        district: string;
        participants: number;
        teams: number;
        percentage: number;
      }>;
      
      regions: {
        rural: number;
        semiUrban: number;
        urban: number;
      };
    };
    
    // Team Statistics
    teams: {
      totalTeams: number;
      averageTeamSize: number;
      teamSizeDistribution: {
        [size: number]: number; // size: count
      };
      
      verificationStatus: {
        verified: number;
        pending: number;
        rejected: number;
      };
    };
  };
  
  // Sports-Specific Analytics
  sportsStats: {
    [sportId: string]: {
      registrations: number;
      teams: number;
      participants: number;
      averageTeamSize: number;
      
      // Performance Metrics
      matches: {
        scheduled: number;
        completed: number;
        inProgress: number;
        cancelled: number;
      };
      
      // Participation Quality
      quality: {
        experiencedPlayers: number; // Players with tournament experience
        newPlayers: number; // First-time participants
        returningPlayers: number; // Previous year participants
      };
      
      // Geographic Spread
      geographicSpread: {
        states: number; // Number of states represented
        districts: number; // Number of districts represented
        panchayats: number; // Number of panchayats represented
      };
    };
  };
  
  // Venue and Infrastructure Analytics
  venueStats: {
    utilization: Array<{
      venueId: string;
      venueName: string;
      totalHours: number;
      bookedHours: number;
      utilizationRate: number; // Percentage
      averageAttendance: number;
    }>;
    
    capacity: {
      totalCapacity: number; // Sum of all venues
      averageOccupancy: number; // Average occupancy percentage
      peakOccupancy: number; // Highest occupancy
      underutilizedVenues: string[]; // Venues with low utilization
    };
    
    facilities: {
      mostUsedFacilities: Array<{
        facility: string;
        usageCount: number;
      }>;
      
      facilityRatings: Array<{
        facility: string;
        averageRating: number;
        responseCount: number;
      }>;
    };
  };
  
  // Financial Analytics
  financialStats: {
    revenue: {
      totalRevenue: number;
      registrationFees: number;
      lateFees: number;
      otherCharges: number;
      
      // Revenue by Sport
      bySport: Array<{
        sportId: string;
        sportName: string;
        revenue: number;
        teams: number;
        averagePerTeam: number;
      }>;
      
      // Revenue Timeline
      timeline: Array<{
        date: string;
        dailyRevenue: number;
        cumulativeRevenue: number;
      }>;
    };
    
    expenses: {
      totalExpenses: number;
      
      categories: Array<{
        category: string;
        amount: number;
        percentage: number;
      }>;
      
      breakdown: {
        venues: number;
        equipment: number;
        officials: number;
        prizes: number;
        marketing: number;
        administration: number;
        other: number;
      };
    };
    
    profitability: {
      grossProfit: number;
      netProfit: number;
      profitMargin: number; // Percentage
      breakEvenPoint: number; // Number of registrations needed
    };
    
    paymentAnalytics: {
      methodDistribution: Array<{
        method: string;
        count: number;
        amount: number;
        percentage: number;
      }>;
      
      failureRate: number; // Payment failure rate
      averageTransactionTime: number; // Average time to complete payment
      refundRate: number; // Percentage of refunded transactions
    };
  };
  
  // Performance Analytics
  performanceStats: {
    // System Performance
    system: {
      averageResponseTime: number; // milliseconds
      errorRate: number; // percentage
      uptime: number; // percentage
      concurrentUsers: {
        peak: number;
        average: number;
        current: number;
      };
    };
    
    // User Engagement
    engagement: {
      dailyActiveUsers: number;
      weeklyActiveUsers: number;
      monthlyActiveUsers: number;
      
      sessionMetrics: {
        averageSessionDuration: number; // minutes
        bounceRate: number; // percentage
        pagesPerSession: number;
      };
      
      featureUsage: Array<{
        feature: string;
        usageCount: number;
        uniqueUsers: number;
      }>;
    };
    
    // Content Performance
    content: {
      mostViewedPages: Array<{
        page: string;
        views: number;
        uniqueViews: number;
        averageTimeOnPage: number;
      }>;
      
      downloadStats: Array<{
        document: string;
        downloads: number;
        category: string;
      }>;
    };
  };
  
  // Tournament Analytics
  tournamentStats: {
    // Match Statistics
    matches: {
      totalMatches: number;
      completedMatches: number;
      onTimeMatches: number;
      delayedMatches: number;
      cancelledMatches: number;
      
      averageMatchDuration: number; // minutes
      longestMatch: number; // minutes
      shortestMatch: number; // minutes
    };
    
    // Competition Quality
    competitiveness: {
      closeMatches: number; // Matches decided by small margins
      dominantWins: number; // One-sided matches
      averageScoreDifference: number;
      
      upsets: Array<{
        matchId: string;
        higherSeed: string;
        lowerSeed: string;
        scoreline: string;
      }>;
    };
    
    // Player Performance
    playerPerformance: {
      topPerformers: Array<{
        playerId: string;
        playerName: string;
        sport: string;
        team: string;
        statistics: any; // Sport-specific stats
      }>;
      
      consistencyMetrics: {
        mostConsistentPlayers: Array<{
          playerId: string;
          playerName: string;
          consistencyScore: number;
        }>;
      };
    };
  };
  
  // Quality and Feedback Analytics
  qualityStats: {
    // User Satisfaction
    satisfaction: {
      overallRating: number; // 1-5 scale
      responseCount: number;
      
      categoryRatings: Array<{
        category: string; // e.g., 'registration_process', 'venue_quality'
        rating: number;
        responseCount: number;
      }>;
      
      npsScore: number; // Net Promoter Score
    };
    
    // Feedback Analysis
    feedback: {
      totalFeedbacks: number;
      
      sentiment: {
        positive: number;
        neutral: number;
        negative: number;
      };
      
      topIssues: Array<{
        issue: string;
        count: number;
        severity: 'low' | 'medium' | 'high';
      }>;
      
      suggestions: Array<{
        suggestion: string;
        count: number;
        category: string;
      }>;
    };
    
    // Document Quality
    documentation: {
      documentAcceptanceRate: number; // Percentage of documents accepted
      commonRejectionReasons: Array<{
        reason: string;
        count: number;
        percentage: number;
      }>;
      
      averageVerificationTime: number; // Hours
    };
  };
  
  // Marketing and Outreach Analytics
  marketingStats: {
    // Campaign Performance
    campaigns: Array<{
      campaignName: string;
      impressions: number;
      clicks: number;
      conversions: number;
      cost: number;
      roi: number; // Return on investment
    }>;
    
    // Social Media Metrics
    socialMedia: {
      platforms: Array<{
        platform: string;
        followers: number;
        engagement: {
          likes: number;
          shares: number;
          comments: number;
          mentions: number;
        };
        reach: number;
        impressions: number;
      }>;
      
      viralContent: Array<{
        contentId: string;
        platform: string;
        shares: number;
        reach: number;
        engagementRate: number;
      }>;
    };
    
    // Referral Analytics
    referrals: {
      totalReferrals: number;
      conversionRate: number; // Percentage of referrals that registered
      
      sources: Array<{
        source: string; // Social media, word of mouth, etc.
        referrals: number;
        conversions: number;
      }>;
    };
  };
  
  // Predictive Analytics
  predictions: {
    // Registration Forecasting
    registrationForecast: Array<{
      date: string;
      predictedRegistrations: number;
      confidence: number; // Confidence percentage
    }>;
    
    // Capacity Planning
    capacityNeeds: {
      predictedPeakLoad: number;
      recommendedCapacity: number;
      scalingRecommendations: string[];
    };
    
    // Revenue Projections
    revenueProjection: {
      projectedTotal: number;
      confidenceInterval: {
        low: number;
        high: number;
      };
    };
  };
  
  // Comparative Analytics
  comparativeData: {
    // Year-over-Year Comparison
    yearOverYear: {
      previousYear: {
        registrations: number;
        participants: number;
        revenue: number;
        satisfaction: number;
      };
      
      growthRates: {
        registrations: number; // Percentage growth
        participants: number;
        revenue: number;
        geographicExpansion: number;
      };
    };
    
    // Benchmarking
    benchmarks: Array<{
      metric: string;
      currentValue: number;
      industryBenchmark: number;
      performance: 'above' | 'at' | 'below'; // Compared to benchmark
    }>;
  };
  
  // Data Quality and Metadata
  dataQuality: {
    completeness: number; // Percentage of complete data
    accuracy: number; // Data accuracy score
    freshness: Timestamp; // Last data update
    
    sources: Array<{
      source: string;
      recordCount: number;
      lastUpdate: Timestamp;
      reliability: number; // Source reliability score
    }>;
    
    knownIssues: Array<{
      issue: string;
      impact: 'low' | 'medium' | 'high';
      estimatedFix: Timestamp;
    }>;
  };
  
  // Report Generation Metadata
  reportMetadata: {
    generatedAt: Timestamp;
    generatedBy: string; // System or user ID
    reportVersion: string;
    processingTime: number; // milliseconds
    
    // Data Sources Used
    dataSources: string[];
    
    // Filters Applied
    filters: Array<{
      field: string;
      value: any;
      operator: string;
    }>;
    
    // Aggregation Methods
    aggregations: Array<{
      field: string;
      method: 'sum' | 'average' | 'count' | 'max' | 'min';
    }>;
  };
  
  // Audit and Compliance
  audit: {
    accessLog: Array<{
      userId: string;
      accessTime: Timestamp;
      action: string;
      ipAddress: string;
    }>;
    
    exportHistory: Array<{
      exportedBy: string;
      exportTime: Timestamp;
      dataRange: string;
      format: string;
      purpose: string;
    }>;
    
    privacyCompliance: {
      anonymized: boolean;
      gdprCompliant: boolean;
      retentionPeriod: number; // days
    };
  };
  
  // System Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  nextUpdate?: Timestamp; // When next update is scheduled
  autoGenerated: boolean; // Whether report was auto-generated
  tags: string[]; // Tags for categorization
}
```

### Sample Analytics Data

```javascript
{
  id: 'overview_current',
  type: 'overview',
  scope: 'event',
  eventId: 'isha_gramotsavam_2025',
  
  period: {
    startDate: Timestamp.fromDate(new Date('2025-01-01T00:00:00Z')),
    endDate: Timestamp.fromDate(new Date('2025-03-15T23:59:59Z')),
    timezone: 'Asia/Kolkata',
    granularity: 'day'
  },
  
  registrationStats: {
    total: {
      registrations: 1247,
      completedRegistrations: 1156,
      pendingRegistrations: 91,
      cancelledRegistrations: 12
    },
    
    verification: {
      verified: 1023,
      underReview: 133,
      rejected: 23,
      needsCorrection: 68
    },
    
    payment: {
      paid: 1156,
      pending: 91,
      failed: 34,
      refunded: 5,
      totalAmount: 867000
    }
  },
  
  participationStats: {
    demographics: {
      totalParticipants: 12456,
      genderDistribution: {
        male: 6789,
        female: 5667,
        other: 0
      },
      
      ageDistribution: {
        under18: 0,
        age18to21: 1234,
        age22to25: 3456,
        age26to30: 4567,
        age31to35: 3199,
        over35: 0,
        averageAge: 27.3
      }
    }
  },
  
  sportsStats: {
    'volleyball_men': {
      registrations: 456,
      teams: 456,
      participants: 5472,
      averageTeamSize: 12
    },
    'volleyball_women': {
      registrations: 389,
      teams: 389,
      participants: 4668,
      averageTeamSize: 12
    },
    'throwball_women': {
      registrations: 402,
      teams: 402,
      participants: 2814,
      averageTeamSize: 7
    }
  }
}
```

### Related Collections
- **events**: Analytics tied to specific events
- **users**: User behavior and engagement analytics
- **teams**: Team performance analytics
- **matches**: Match and tournament analytics
- **venues**: Venue utilization analytics