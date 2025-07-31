# Fixtures Schema Documentation

## Collection: `fixtures`

### Overview
Tournament fixture management system for Isha Gramotsavam with comprehensive scheduling, bracket management, and match organization across multiple tournament levels.

### Document Structure

```typescript
interface Fixture {
  id: string; // Fixture identifier (e.g., 'gramotsavam_2025_cluster_volleyball_men')
  
  // Tournament Information
  tournamentInfo: {
    eventId: string; // Associated event ID
    sport: string; // Sport ID (e.g., 'volleyball_men')
    level: 'cluster' | 'division' | 'final'; // Tournament level
    phase: 'group_stage' | 'knockout' | 'playoffs' | 'finals';
    season: string; // Tournament season/year
  };
  
  // Basic Fixture Details
  basicInfo: {
    name: string; // Fixture display name
    description: string; // Fixture description
    format: 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss' | 'hybrid';
    status: 'draft' | 'published' | 'active' | 'completed' | 'cancelled' | 'suspended';
  };
  
  // Schedule Information
  schedule: {
    startDate: Timestamp; // Fixture start date
    endDate: Timestamp; // Fixture end date
    registrationDeadline: Timestamp; // Team registration deadline
    drawDate?: Timestamp; // When draw/bracket was created
    
    // Daily Schedule
    dailySchedule: Array<{
      date: string; // YYYY-MM-DD format
      sessions: Array<{
        sessionId: string;
        name: string; // e.g., 'Morning Session', 'Evening Session'
        startTime: string; // HH:MM format
        endTime: string; // HH:MM format
        venue: string; // Venue ID
        maxMatches: number; // Maximum matches in this session
        scheduledMatches: string[]; // Array of match IDs
      }>;
    }>;
    
    // Match Scheduling Parameters
    matchScheduling: {
      matchDuration: number; // Expected match duration in minutes
      breakBetweenMatches: number; // Break between matches in minutes
      setupTime: number; // Setup time before matches in minutes
      cleanupTime: number; // Cleanup time after matches in minutes
      bufferTime: number; // Additional buffer time in minutes
    };
  };
  
  // Participating Teams
  teams: Array<{
    teamId: string;
    teamName: string;
    shortName?: string;
    
    // Team Details
    captain: {
      name: string;
      contact: string;
    };
    
    // Registration Status
    registrationStatus: 'registered' | 'verified' | 'confirmed' | 'withdrawn';
    registrationDate: Timestamp;
    confirmationDate?: Timestamp;
    
    // Seeding Information
    seed?: number; // Team seeding (1 = top seed)
    seedingCriteria?: string; // How seeding was determined
    
    // Group Assignment (for group stage formats)
    group?: string; // Group identifier (A, B, C, etc.)
    groupPosition?: number; // Position within group
    
    // Contact and Logistics
    contactPerson: string;
    phoneNumber: string;
    emailAddress: string;
    
    // Special Requirements
    accommodationRequired: boolean;
    transportRequired: boolean;
    specialRequests?: string[];
  }>;
  
  // Venue Assignment
  venues: Array<{
    venueId: string;
    venueName: string;
    
    // Court/Field Assignment
    courts: Array<{
      courtId: string;
      courtNumber: number;
      surface: string;
      capacity: number;
      
      // Court Availability
      availability: Array<{
        date: string; // YYYY-MM-DD
        timeSlots: Array<{
          startTime: string; // HH:MM
          endTime: string; // HH:MM
          available: boolean;
          reservedBy?: string; // Match ID if reserved
        }>;
      }>;
    }>;
    
    // Venue Logistics
    facilities: string[]; // Available facilities
    parkingSpaces: number;
    spectatorCapacity: number;
    accessibilityFeatures: string[];
  }>;
  
  // Tournament Structure
  structure: {
    // Total Tournament Parameters
    totalTeams: number;
    totalMatches: number;
    totalRounds: number;
    
    // Group Stage (if applicable)
    groupStage?: {
      enabled: boolean;
      numberOfGroups: number;
      teamsPerGroup: number;
      
      groups: Array<{
        groupId: string;
        groupName: string; // e.g., 'Group A'
        teams: string[]; // Array of team IDs
        
        // Group Format
        format: 'round_robin' | 'single_round';
        matchesPerTeam: number;
        totalMatches: number;
        
        // Qualification Rules
        qualificationRules: {
          teamsToQualify: number; // Teams advancing to next stage
          qualificationCriteria: string[]; // Criteria for advancement
          tiebreakers: string[]; // Tiebreaking rules
        };
      }>;
    };
    
    // Knockout Stage
    knockoutStage: {
      enabled: boolean;
      format: 'single_elimination' | 'double_elimination';
      
      // Bracket Structure
      brackets: Array<{
        bracketId: string;
        bracketName: string; // e.g., 'Main Bracket', 'Consolation Bracket'
        type: 'main' | 'consolation' | 'third_place';
        
        rounds: Array<{
          roundId: string;
          roundNumber: number;
          roundName: string; // e.g., 'Quarter Finals', 'Semi Finals'
          
          // Round Details
          totalMatches: number;
          teamsInRound: number;
          winnersAdvance: number;
          losersEliminated: number;
          
          // Scheduling
          scheduledDate: string; // YYYY-MM-DD
          estimatedDuration: number; // Hours
        }>;
      }>;
    };
    
    // Playoff Structure (if applicable)
    playoffs?: {
      enabled: boolean;
      format: string;
      
      positions: Array<{
        position: number; // Final position (1st, 2nd, 3rd, etc.)
        positionName: string; // 'Champion', 'Runner-up', etc.
        determinedBy: string; // How this position is determined
        
        // Prize Information
        prize?: {
          monetary: number;
          trophy: string;
          medals: number;
          certificates: number;
        };
      }>;
    };
  };
  
  // Match Generation and Management
  matches: Array<{
    matchId: string;
    matchNumber: number;
    
    // Match Classification
    stage: 'group' | 'knockout' | 'playoff';
    round?: string; // Round identifier
    group?: string; // Group identifier (for group matches)
    
    // Teams
    team1Id?: string; // May be TBD initially
    team2Id?: string; // May be TBD initially
    team1Name?: string;
    team2Name?: string;
    
    // Scheduling
    scheduledDate?: string; // YYYY-MM-DD
    scheduledTime?: string; // HH:MM
    venueId?: string;
    courtId?: string;
    
    // Match Dependencies
    dependsOn: Array<{
      matchId: string;
      condition: string; // e.g., 'winner', 'loser', 'team_from_group_a'
    }>;
    
    // Match Status
    status: 'scheduled' | 'ready' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
    
    // Officials Assignment
    officials: {
      referee?: string;
      assistantReferees?: string[];
      scorer?: string;
      announcer?: string;
    };
    
    // Broadcasting
    liveStream: boolean;
    recordMatch: boolean;
    socialMediaCoverage: boolean;
    
    // Special Attributes
    isElimination: boolean; // Is this an elimination match
    isPlayoff: boolean; // Is this a playoff match
    importance: 'low' | 'medium' | 'high' | 'final'; // Match importance
  }>;
  
  // Draw and Bracket Information
  draw: {
    drawCompleted: boolean;
    drawDate?: Timestamp;
    drawMethod: 'random' | 'seeded' | 'manual' | 'hybrid';
    drawOfficials?: string[]; // Officials present during draw
    
    // Seeding Details
    seeding: {
      seedingMethod: string; // How teams were seeded
      seedingCriteria: string[]; // Criteria used for seeding
      seedingDate?: Timestamp;
      
      // Seed Distribution
      seeds: Array<{
        seed: number;
        teamId: string;
        teamName: string;
        seedingPoints?: number;
        qualification: string; // How team qualified for this seed
      }>;
    };
    
    // Group Draw (if applicable)
    groupDraw?: {
      method: 'random' | 'geographical' | 'strength_based';
      constraints: string[]; // Draw constraints
      
      drawResult: Array<{
        groupId: string;
        teams: Array<{
          teamId: string;
          seed: number;
          potNumber?: number; // Draw pot number
        }>;
      }>;
    };
    
    // Bracket Visualization Data
    bracketData?: {
      visualFormat: 'standard' | 'swiss' | 'round_robin';
      bracketUrl?: string; // URL to bracket visualization
      lastUpdated: Timestamp;
    };
  };
  
  // Rules and Regulations
  rules: {
    // General Tournament Rules
    general: {
      playingRules: string; // Reference to official rules
      modificationAllowed: boolean;
      localModifications?: string[]; // Any local rule modifications
    };
    
    // Qualification and Advancement
    advancement: {
      groupStageQualification?: string; // How teams qualify from groups
      knockoutAdvancement: string; // How teams advance in knockout
      tiebreakingRules: string[]; // Tiebreaking procedures
      walkoverRules: string; // Walkover procedures
    };
    
    // Time and Scheduling Rules
    scheduling: {
      punctualityRules: string; // Punctuality requirements
      defaultTime: number; // Default time in minutes for no-show
      reschedulePolicy: string; // Rescheduling policy
      weatherPolicy?: string; // Weather-related policies
    };
    
    // Player and Team Rules
    team: {
      substituteRules: string; // Player substitution rules
      uniformRequirements: string; // Uniform requirements
      disciplinaryProcedures: string; // Disciplinary procedures
      protestProcedures: string; // Match protest procedures
    };
  };
  
  // Officials and Personnel
  officials: {
    // Tournament Officials
    tournamentDirector: {
      name: string;
      contact: string;
      responsibilities: string[];
    };
    
    // Referees and Match Officials
    referees: Array<{
      officialId: string;
      name: string;
      certification: string;
      experience: number; // Years of experience
      availability: Array<{
        date: string;
        timeSlots: string[];
      }>;
      assignedMatches: string[]; // Match IDs assigned
      specializations: string[]; // Special qualifications
    }>;
    
    // Support Staff
    supportStaff: Array<{
      staffId: string;
      name: string;
      role: string; // scorer, announcer, technical official
      contact: string;
      availability: Array<{
        date: string;
        sessions: string[];
      }>;
    }>;
    
    // Volunteers
    volunteers: {
      required: number; // Number of volunteers needed
      registered: number; // Number registered
      assignments: Array<{
        volunteerId: string;
        name: string;
        role: string;
        schedule: Array<{
          date: string;
          timeSlot: string;
          assignment: string;
        }>;
      }>;
    };
  };
  
  // Logistics and Operations
  logistics: {
    // Equipment Requirements
    equipment: Array<{
      item: string;
      quantity: number;
      supplier?: string;
      deliveryDate?: Timestamp;
      setupRequired: boolean;
    }>;
    
    // Transportation
    transportation: {
      teamTransportRequired: boolean;
      officialsTransportRequired: boolean;
      
      arrangements: Array<{
        type: 'bus' | 'van' | 'taxi';
        capacity: number;
        route: string;
        schedule: Array<{
          departureTime: string;
          departurePoint: string;
          arrivalPoint: string;
          arrivalTime: string;
        }>;
      }>;
    };
    
    // Accommodation
    accommodation: {
      providedByOrganizer: boolean;
      
      facilities: Array<{
        facilityName: string;
        capacity: number;
        location: string;
        amenities: string[];
        bookings: Array<{
          teamId: string;
          checkIn: Timestamp;
          checkOut: Timestamp;
          roomsBooked: number;
        }>;
      }>;
    };
    
    // Catering
    catering: {
      providedByOrganizer: boolean;
      
      arrangements: Array<{
        mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
        venue: string;
        servingTime: string;
        capacity: number;
        specialDiets: string[]; // Vegetarian, vegan, etc.
      }>;
    };
  };
  
  // Media and Broadcasting
  media: {
    // Live Coverage
    liveCoverage: {
      enabled: boolean;
      platforms: string[]; // YouTube, Facebook, etc.
      
      schedule: Array<{
        matchId: string;
        platform: string;
        streamUrl?: string;
        estimatedViewers: number;
      }>;
    };
    
    // Photography and Videography
    documentation: {
      photographyAllowed: boolean;
      videographyAllowed: boolean;
      
      personnel: Array<{
        name: string;
        role: 'photographer' | 'videographer' | 'social_media';
        contact: string;
        equipment: string[];
        assignments: string[]; // Match IDs or venues assigned
      }>;
    };
    
    // Social Media
    socialMedia: {
      hashtags: string[]; // Official tournament hashtags
      handles: Array<{
        platform: string;
        handle: string;
      }>;
      
      contentPlan: Array<{
        contentType: string;
        scheduledTime: Timestamp;
        platform: string[];
        description: string;
      }>;
    };
  };
  
  // Financial Information
  financial: {
    // Budget
    budget: {
      totalBudget: number;
      
      breakdown: Array<{
        category: string;
        allocatedAmount: number;
        spentAmount: number;
        remainingAmount: number;
      }>;
    };
    
    // Revenue
    revenue: {
      registrationFees: number;
      sponsorship: number;
      merchandising: number;
      ticketSales: number;
      other: number;
      total: number;
    };
    
    // Prize Distribution
    prizes: Array<{
      position: number;
      positionName: string;
      monetaryPrize: number;
      trophies: number;
      medals: number;
      certificates: number;
      otherPrizes: string[];
    }>;
  };
  
  // Quality Assurance and Monitoring
  quality: {
    // Performance Metrics
    performance: {
      onTimeStartPercentage: number; // Percentage of matches starting on time
      completionRate: number; // Percentage of scheduled matches completed
      averageMatchDuration: number; // Average actual match duration
      
      // Issues Tracking
      issues: Array<{
        issueId: string;
        type: 'scheduling' | 'venue' | 'equipment' | 'personnel' | 'other';
        description: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        reportedAt: Timestamp;
        resolvedAt?: Timestamp;
        resolution?: string;
      }>;
    };
    
    // Stakeholder Feedback
    feedback: {
      teams: Array<{
        teamId: string;
        rating: number; // 1-5 scale
        comments: string;
        categories: Array<{
          category: string;
          rating: number;
        }>;
      }>;
      
      officials: Array<{
        officialId: string;
        rating: number;
        comments: string;
        recommendations: string[];
      }>;
      
      venues: Array<{
        venueId: string;
        overallRating: number;
        facilityRatings: Array<{
          facility: string;
          rating: number;
        }>;
        comments: string;
      }>;
    };
  };
  
  // Audit and Compliance
  audit: {
    // Change History
    changeHistory: Array<{
      timestamp: Timestamp;
      changedBy: string; // User ID
      changeType: 'create' | 'update' | 'delete';
      field: string;
      oldValue?: any;
      newValue?: any;
      reason?: string;
    }>;
    
    // Approvals
    approvals: Array<{
      stage: string; // What was approved
      approvedBy: string; // User ID
      approvedAt: Timestamp;
      conditions?: string[]; // Any conditions attached
    }>;
    
    // Compliance Checks
    compliance: {
      rulesCompliance: boolean; // Follows sport rules
      safetyCompliance: boolean; // Meets safety standards
      timelineCompliance: boolean; // Follows scheduled timeline
      
      violations: Array<{
        type: string;
        description: string;
        severity: string;
        reportedAt: Timestamp;
        resolvedAt?: Timestamp;
      }>;
    };
  };
  
  // System Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // User ID who created the fixture
  lastModifiedBy: string; // User ID who last modified
  version: number; // Schema version for migrations
  archived: boolean; // Whether fixture is archived
  tags: string[]; // Tags for categorization and searching
}
```

### Sample Fixture Data

```javascript
{
  id: 'gramotsavam_2025_cluster_volleyball_men',
  
  tournamentInfo: {
    eventId: 'isha_gramotsavam_2025',
    sport: 'volleyball_men',
    level: 'cluster',
    phase: 'group_stage',
    season: '2025'
  },
  
  basicInfo: {
    name: 'Volleyball Men - Cluster Level',
    description: 'Cluster level competition for men\'s volleyball teams',
    format: 'round_robin',
    status: 'active'
  },
  
  schedule: {
    startDate: Timestamp.fromDate(new Date('2025-03-01T09:00:00Z')),
    endDate: Timestamp.fromDate(new Date('2025-03-05T18:00:00Z')),
    registrationDeadline: Timestamp.fromDate(new Date('2025-02-20T23:59:59Z')),
    
    matchScheduling: {
      matchDuration: 90,
      breakBetweenMatches: 30,
      setupTime: 15,
      cleanupTime: 15,
      bufferTime: 10
    }
  },
  
  teams: [
    {
      teamId: 'rural_warriors_001',
      teamName: 'Rural Warriors',
      shortName: 'RW',
      registrationStatus: 'verified',
      seed: 1,
      group: 'A'
    }
    // ... more teams
  ],
  
  structure: {
    totalTeams: 32,
    totalMatches: 78,
    totalRounds: 3,
    
    groupStage: {
      enabled: true,
      numberOfGroups: 8,
      teamsPerGroup: 4,
      
      groups: [
        {
          groupId: 'group_a',
          groupName: 'Group A',
          teams: ['team_001', 'team_002', 'team_003', 'team_004'],
          format: 'round_robin',
          matchesPerTeam: 3,
          totalMatches: 6,
          
          qualificationRules: {
            teamsToQualify: 2,
            qualificationCriteria: ['points', 'head_to_head', 'set_difference'],
            tiebreakers: ['head_to_head_record', 'set_ratio', 'point_difference']
          }
        }
        // ... more groups
      ]
    }
  }
}
```

### Related Collections
- **events**: Fixtures belong to events
- **sports**: Fixtures are sport-specific
- **teams**: Teams participate in fixtures
- **matches**: Fixtures generate matches
- **venues**: Fixtures use venues for matches