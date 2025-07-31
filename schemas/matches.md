# Matches Schema Documentation

## Collection: `matches`

### Overview
Comprehensive match management system for Isha Gramotsavam with live scoring, detailed statistics, and complete match lifecycle tracking.

### Document Structure

```typescript
interface Match {
  id: string; // Match identifier (e.g., 'match_001_cluster_vb_men')
  
  // Match Basic Information
  matchInfo: {
    matchNumber: number; // Sequential match number
    sport: string; // Sport ID (e.g., 'volleyball_men')
    level: 'cluster' | 'division' | 'final'; // Tournament level
    phase: 'group_stage' | 'knockout' | 'quarter_final' | 'semi_final' | 'final' | 'third_place';
    round?: number; // Round number within phase
    group?: string; // Group identifier (for group stage)
    fixtureId: string; // Reference to fixture document
  };
  
  // Teams Information
  teams: {
    team1: {
      id: string; // Team ID
      name: string; // Team name
      shortName?: string; // Abbreviated name
      seed?: number; // Tournament seeding
      
      // Team Composition for Match
      players: Array<{
        userId: string;
        name: string;
        position: string;
        jerseyNumber?: number;
        isPlaying: boolean; // Starting lineup
        isSubstitute: boolean;
        substitutedIn?: {
          time: string; // Time of substitution
          replacedPlayer: string; // Player being replaced
          set?: number; // Set number (for set-based sports)
        };
        substitutedOut?: {
          time: string;
          replacementPlayer: string;
          set?: number;
        };
      }>;
      
      captain: {
        userId: string;
        name: string;
      };
      
      coach?: {
        name: string;
        contact: string;
      };
    };
    
    team2: {
      id: string;
      name: string;
      shortName?: string;
      seed?: number;
      
      players: Array<{
        userId: string;
        name: string;
        position: string;
        jerseyNumber?: number;
        isPlaying: boolean;
        isSubstitute: boolean;
        substitutedIn?: {
          time: string;
          replacedPlayer: string;
          set?: number;
        };
        substitutedOut?: {
          time: string;
          replacementPlayer: string;
          set?: number;
        };
      }>;
      
      captain: {
        userId: string;
        name: string;
      };
      
      coach?: {
        name: string;
        contact: string;
      };
    };
  };
  
  // Scheduling Information
  schedule: {
    scheduledDate: Timestamp; // Scheduled start time
    actualStartTime?: Timestamp; // Actual start time
    actualEndTime?: Timestamp; // Actual end time
    duration?: number; // Match duration in minutes
    
    // Time Management
    breaks: Array<{
      type: 'timeout' | 'technical_timeout' | 'injury_timeout' | 'set_break' | 'half_time';
      startTime: Timestamp;
      endTime?: Timestamp;
      duration: number; // Break duration in seconds
      calledBy?: 'team1' | 'team2' | 'referee'; // Who called the break
      reason?: string;
    }>;
    
    delays: Array<{
      reason: string; // Reason for delay
      startTime: Timestamp;
      endTime?: Timestamp;
      duration: number; // Delay duration in minutes
    }>;
  };
  
  // Venue and Court Information
  venue: {
    id: string; // Venue ID
    name: string; // Venue name
    courtId: string; // Specific court within venue
    courtNumber: number; // Court number
  };
  
  // Match Officials
  officials: {
    referee: {
      name: string;
      certification: string;
      contact: string;
      experience: number; // Years of experience
    };
    
    assistantReferees?: Array<{
      name: string;
      role: 'line_judge' | 'scorer' | 'assistant_referee';
      certification?: string;
    }>;
    
    scorer?: {
      name: string;
      contact: string;
    };
    
    announcer?: {
      name: string;
      languages: string[]; // Languages they can announce in
    };
  };
  
  // Match Status and State
  status: 'scheduled' | 'warm_up' | 'in_progress' | 'completed' | 'suspended' | 'cancelled' | 'postponed';
  
  // Live Score Tracking
  liveScore: {
    // Current State
    currentSet: number; // Current set being played (0-based)
    currentTime?: string; // Current time in match (for time-based sports)
    
    // Score Information
    team1Score: {
      sets: number; // Sets won
      currentSetPoints: number; // Points in current set
      totalPoints: number; // Total points across all sets
    };
    
    team2Score: {
      sets: number;
      currentSetPoints: number;
      totalPoints: number;
    };
    
    // Set-by-Set Scores
    setScores: Array<{
      setNumber: number;
      team1Points: number;
      team2Points: number;
      duration?: number; // Set duration in minutes
      winner: 'team1' | 'team2';
    }>;
    
    // Serving Information (for applicable sports)
    serving?: {
      team: 'team1' | 'team2';
      player: string; // Player name serving
      serveCount: number; // Number of serves in this service
    };
    
    // Timeouts Used
    timeoutsUsed: {
      team1: Array<{
        setNumber: number;
        timeoutNumber: number;
        time: string;
        duration: number; // seconds
      }>;
      team2: Array<{
        setNumber: number;
        timeoutNumber: number;
        time: string;
        duration: number;
      }>;
    };
  };
  
  // Final Match Result
  result?: {
    winner: 'team1' | 'team2' | 'draw';
    winnerTeamId: string;
    winnerTeamName: string;
    loserTeamId: string;
    loserTeamName: string;
    
    // Final Scores
    finalScore: {
      team1Sets: number;
      team2Sets: number;
      team1Points: number;
      team2Points: number;
    };
    
    // Match Statistics
    matchStats: {
      totalDuration: number; // Total match duration in minutes
      longestSet: number; // Duration of longest set in minutes
      shortestSet: number; // Duration of shortest set in minutes
      totalTimeouts: number;
      totalSubstitutions: number;
    };
    
    // Victory Details
    victoryType: 'regular' | 'walkover' | 'forfeit' | 'disqualification';
    victoryReason?: string; // Explanation if not regular victory
    
    // Tournament Implications
    advancementInfo?: {
      winnerAdvancesTo: string; // Next round/match ID
      loserPosition?: string; // Final position for loser
      nextMatchDate?: Timestamp;
    };
  };
  
  // Detailed Match Events
  events: Array<{
    id: string; // Event ID
    timestamp: Timestamp; // When event occurred
    eventType: 'point_scored' | 'timeout' | 'substitution' | 'card' | 'injury' | 'technical_fault' | 'protest';
    
    // Event Details
    details: {
      team?: 'team1' | 'team2'; // Team involved
      player?: string; // Player involved
      set?: number; // Set number
      score?: { team1: number; team2: number }; // Score at time of event
      description: string; // Event description
      
      // Specific Event Data
      substitution?: {
        playerOut: string;
        playerIn: string;
        reason?: string;
      };
      
      card?: {
        type: 'yellow' | 'red';
        player: string;
        reason: string;
      };
      
      timeout?: {
        calledBy: 'team1' | 'team2' | 'referee';
        type: 'regular' | 'technical' | 'injury';
        duration: number; // seconds
      };
      
      injury?: {
        player: string;
        severity: 'minor' | 'moderate' | 'serious';
        treatment: string;
        resumeTime?: Timestamp;
      };
    };
    
    // Event Metadata
    recordedBy: string; // Official/scorer who recorded
    verified: boolean; // Whether event has been verified
  }>;
  
  // Individual Player Statistics
  playerStats: {
    team1: Array<{
      userId: string;
      name: string;
      
      // Performance Stats (sport-specific)
      points?: number; // Points scored
      serves?: { successful: number; total: number; aces: number; faults: number };
      attacks?: { successful: number; total: number; kills: number; errors: number };
      blocks?: { successful: number; total: number; solos: number; assists: number };
      digs?: number; // Defensive plays
      assists?: number; // Set-ups for attacks
      
      // Time on Court
      timeOnCourt: number; // Minutes played
      setsPlayed: number; // Number of sets played
      
      // Disciplinary
      yellowCards: number;
      redCards: number;
      
      // Substitutions
      substitutions: Array<{
        inTime?: string;
        outTime?: string;
        set: number;
      }>;
    }>;
    
    team2: Array<{
      userId: string;
      name: string;
      points?: number;
      serves?: { successful: number; total: number; aces: number; faults: number };
      attacks?: { successful: number; total: number; kills: number; errors: number };
      blocks?: { successful: number; total: number; solos: number; assists: number };
      digs?: number;
      assists?: number;
      timeOnCourt: number;
      setsPlayed: number;
      yellowCards: number;
      redCards: number;
      substitutions: Array<{
        inTime?: string;
        outTime?: string;
        set: number;
      }>;
    }>;
  };
  
  // Team Statistics
  teamStats: {
    team1: {
      // Scoring
      totalPoints: number;
      pointsPerSet: number[];
      
      // Technical Stats (sport-specific)
      serves: { successful: number; total: number; aces: number; errors: number };
      attacks: { successful: number; total: number; kills: number; errors: number };
      blocks: { successful: number; total: number; solos: number; assists: number };
      digs: number;
      assists: number;
      
      // Efficiency Metrics
      attackEfficiency: number; // Percentage
      serveEfficiency: number; // Percentage
      blockEfficiency: number; // Percentage
      
      // Match Management
      timeoutsUsed: number;
      timeoutsRemaining: number;
      substitutionsUsed: number;
      substitutionsRemaining: number;
      
      // Disciplinary
      totalCards: number;
      warnings: number;
    };
    
    team2: {
      totalPoints: number;
      pointsPerSet: number[];
      serves: { successful: number; total: number; aces: number; errors: number };
      attacks: { successful: number; total: number; kills: number; errors: number };
      blocks: { successful: number; total: number; solos: number; assists: number };
      digs: number;
      assists: number;
      attackEfficiency: number;
      serveEfficiency: number;
      blockEfficiency: number;
      timeoutsUsed: number;
      timeoutsRemaining: number;
      substitutionsUsed: number;
      substitutionsRemaining: number;
      totalCards: number;
      warnings: number;
    };
  };
  
  // Media and Broadcasting
  media: {
    liveStream?: {
      enabled: boolean;
      streamUrl?: string;
      platform: string; // YouTube, Facebook, etc.
      viewerCount?: number;
    };
    
    photos: string[]; // Array of photo URLs
    videos: string[]; // Array of video URLs
    highlights?: string[]; // Match highlight video URLs
    
    socialMedia: {
      hashtags: string[]; // Official hashtags
      mentions: number; // Social media mentions
      shares: number; // Times shared
    };
  };
  
  // Weather and Conditions (for outdoor venues)
  conditions?: {
    weather: 'sunny' | 'cloudy' | 'rainy' | 'windy' | 'hot' | 'cold';
    temperature: number; // Celsius
    humidity: number; // Percentage
    windSpeed?: number; // km/h
    visibility: 'excellent' | 'good' | 'fair' | 'poor';
    impact: 'none' | 'minimal' | 'moderate' | 'significant'; // Impact on play
  };
  
  // Post-Match Information
  postMatch?: {
    // Awards and Recognition
    manOfTheMatch?: {
      playerId: string;
      playerName: string;
      team: 'team1' | 'team2';
      reason: string;
    };
    
    bestPerformer?: {
      category: string; // 'best_server', 'best_blocker', etc.
      playerId: string;
      playerName: string;
      team: 'team1' | 'team2';
    };
    
    // Interviews and Quotes
    interviews?: Array<{
      person: string; // Name of interviewee
      role: 'player' | 'captain' | 'coach' | 'referee';
      team?: 'team1' | 'team2';
      quote: string;
      timestamp: Timestamp;
    }>;
    
    // Match Report
    matchReport?: {
      summary: string; // Match summary
      keyMoments: string[]; // Key moments in the match
      technicalAnalysis?: string; // Technical analysis
      reportedBy: string; // Reporter name
    };
  };
  
  // Quality Control and Verification
  verification: {
    scoreVerified: boolean; // Score verified by officials
    verifiedBy?: string; // Official who verified
    verifiedAt?: Timestamp;
    
    dataQuality: {
      completeness: number; // Percentage of data completeness
      accuracy: number; // Accuracy rating
      inconsistencies: string[]; // Any data inconsistencies found
    };
    
    officialApproval: boolean; // Official match result approval
    approvedBy?: string;
    approvedAt?: Timestamp;
  };
  
  // Audit and Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string; // User who created match record
  lastModifiedBy?: string; // User who last modified
  dataSource: 'manual' | 'automated' | 'live_feed'; // How data was collected
  version: number; // Schema version
}
```

### Sample Match Data

```javascript
{
  id: 'match_001_cluster_vb_men',
  
  matchInfo: {
    matchNumber: 1,
    sport: 'volleyball_men',
    level: 'cluster',
    phase: 'group_stage',
    group: 'A',
    fixtureId: 'gramotsavam_2025_cluster_volleyball_men'
  },
  
  teams: {
    team1: {
      id: 'rural_warriors_001',
      name: 'Rural Warriors',
      shortName: 'RW',
      
      players: [
        {
          userId: 'captain_001',
          name: 'Murugan Selvam',
          position: 'captain',
          jerseyNumber: 1,
          isPlaying: true,
          isSubstitute: false
        }
        // ... more players
      ],
      
      captain: {
        userId: 'captain_001',
        name: 'Murugan Selvam'
      }
    },
    
    team2: {
      id: 'village_stars_002',
      name: 'Village Stars',
      shortName: 'VS',
      
      players: [
        // ... players data
      ],
      
      captain: {
        userId: 'captain_002',
        name: 'Raj Kumar'
      }
    }
  },
  
  schedule: {
    scheduledDate: Timestamp.fromDate(new Date('2025-03-01T10:00:00Z')),
    actualStartTime: Timestamp.fromDate(new Date('2025-03-01T10:05:00Z')),
    duration: 87 // minutes
  },
  
  venue: {
    id: 'isha_main_complex',
    name: 'Isha Sports Complex',
    courtId: 'court_1',
    courtNumber: 1
  },
  
  officials: {
    referee: {
      name: 'Krishnan R',
      certification: 'National Level',
      contact: '+91 9876543444',
      experience: 12
    }
  },
  
  status: 'completed',
  
  result: {
    winner: 'team1',
    winnerTeamId: 'rural_warriors_001',
    winnerTeamName: 'Rural Warriors',
    finalScore: {
      team1Sets: 3,
      team2Sets: 1,
      team1Points: 75,
      team2Points: 68
    },
    victoryType: 'regular'
  }
}
```

### Key Features

#### 1. **Comprehensive Match Tracking**
- Complete match lifecycle from scheduling to completion
- Real-time score updates and live tracking
- Detailed event logging for every match moment
- Multi-level tournament progression tracking

#### 2. **Advanced Statistics System**
- Individual player performance metrics
- Team statistics and efficiency calculations
- Sport-specific statistical categories
- Historical performance comparison

#### 3. **Live Match Management**
- Real-time score updates
- Timeout and substitution tracking
- Official decision recording
- Event timeline maintenance

#### 4. **Media and Broadcasting Support**
- Live streaming integration
- Photo and video management
- Social media tracking
- Highlight generation

#### 5. **Quality Assurance**
- Multi-level verification system
- Data completeness tracking
- Official approval workflows
- Audit trail maintenance

### Validation Rules

#### Required Fields
- `matchInfo` (all sub-fields)
- `teams.team1`, `teams.team2` (basic info)
- `schedule.scheduledDate`
- `venue` (id, courtId)
- `officials.referee`
- `status`

#### Business Rules
- Match must have exactly 2 teams
- Scheduled date must be in the future (for new matches)
- Teams must be eligible for the tournament level
- Referee must be certified for the sport level
- Score updates must follow sport-specific rules

#### Score Validation
- Set scores must follow sport rules (volleyball: max 25/15 points)
- Total points must equal sum of set points
- Winner must have won majority of sets
- Timeouts usage must not exceed sport limits

### Security Considerations

#### Access Control
- Match officials can update live scores
- Admin users can modify all match data
- Team captains can view their team's match details
- Public users can view basic match information and scores

#### Data Integrity
- Score updates validated against sport rules
- Event timestamps must be chronological
- Player substitutions must follow sport regulations
- Statistical calculations auto-verified

### Usage Examples

#### Creating a New Match
```javascript
const newMatch = {
  id: 'match_new_001',
  matchInfo: {
    matchNumber: 15,
    sport: 'volleyball_men',
    level: 'cluster',
    phase: 'knockout',
    fixtureId: 'fixture_001'
  },
  teams: {
    team1: { id: 'team_a', name: 'Team A' },
    team2: { id: 'team_b', name: 'Team B' }
  },
  // ... other required fields
};

await setDoc(doc(db, 'matches', newMatch.id), newMatch);
```

#### Updating Live Score
```javascript
const updateScore = async (matchId, scoreUpdate) => {
  await updateDoc(doc(db, 'matches', matchId), {
    'liveScore.team1Score.currentSetPoints': scoreUpdate.team1Points,
    'liveScore.team2Score.currentSetPoints': scoreUpdate.team2Points,
    'updatedAt': serverTimestamp()
  });
};
```

#### Recording Match Event
```javascript
const recordEvent = async (matchId, eventData) => {
  await updateDoc(doc(db, 'matches', matchId), {
    events: arrayUnion({
      id: generateEventId(),
      timestamp: serverTimestamp(),
      eventType: eventData.type,
      details: eventData.details,
      recordedBy: eventData.recordedBy,
      verified: false
    })
  });
};
```

#### Querying Matches by Status
```javascript
const liveMatches = await getDocs(
  query(
    collection(db, 'matches'),
    where('status', '==', 'in_progress'),
    orderBy('schedule.actualStartTime', 'desc')
  )
);
```

### Related Collections
- **teams**: Matches involve two teams
- **fixtures**: Matches are part of fixtures
- **venues**: Matches are played at venues
- **sports**: Matches follow sport-specific rules
- **events**: Matches are part of events
- **users**: Players and officials are users

### Indexes Required
- `status` - for filtering matches by status
- `matchInfo.sport` - for sport-specific queries
- `matchInfo.level` - for tournament level queries
- `schedule.scheduledDate` - for chronological queries
- `teams.team1.id`, `teams.team2.id` - for team-specific queries
- `venue.id` - for venue-specific queries
- `result.winner` - for results queries