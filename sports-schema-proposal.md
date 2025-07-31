# Sports Database Schema Proposal

## Collection: `sports`

```typescript
interface Sport {
  // Identifiers
  sportId: string;           // 'volleyball', 'throwball', etc.
  name: string;             // 'Volleyball'
  displayName: string;      // 'Volleyball Championship'
  
  // Basic Info
  description: string;
  category: 'men' | 'women' | 'mixed';
  status: 'active' | 'inactive' | 'upcoming';
  
  // Team Configuration
  teamConfig: {
    minPlayers: number;     // Minimum required players
    maxPlayers: number;     // Maximum main players
    maxSubstitutes: number; // Maximum substitute players
    totalTeamSize: number;  // minPlayers + maxSubstitutes
  };
  
  // Eligibility Rules
  eligibility: {
    genderRestriction: 'male' | 'female' | 'any';
    minAge: number;
    maxAge: number;
    requireSamePanchayat: boolean;
    customRules: string[];  // Additional rules as text
  };
  
  // Event Information
  eventInfo: {
    registrationStart: string;    // ISO date
    registrationEnd: string;      // ISO date
    eventStart: string;           // ISO date
    eventEnd: string;             // ISO date
    venue: string;
    prizePool: {
      first: number;
      second: number;
      third: number;
      currency: string;
    };
  };
  
  // Display Assets
  assets: {
    primaryImage: string;         // Main sport image URL
    thumbnailImage: string;       // Small preview image
    galleryImages: string[];      // Additional images
    rulesDocument: string;        // PDF/document URL
    videoUrl?: string;            // Promotional video
  };
  
  // Administrative
  createdBy: string;              // Admin user ID
  createdAt: string;              // ISO date
  updatedAt: string;              // ISO date
  version: number;                // For tracking changes
}
```

## Sample Data

```json
{
  "sportId": "volleyball",
  "name": "Volleyball",
  "displayName": "Men's Volleyball Championship",
  "description": "Traditional volleyball tournament following international rules",
  "category": "men",
  "status": "active",
  
  "teamConfig": {
    "minPlayers": 6,
    "maxPlayers": 6,
    "maxSubstitutes": 6,
    "totalTeamSize": 12
  },
  
  "eligibility": {
    "genderRestriction": "male",
    "minAge": 18,
    "maxAge": 45,
    "requireSamePanchayat": true,
    "customRules": [
      "All players must be from the same panchayat",
      "Valid Aadhaar card required for all players"
    ]
  },
  
  "eventInfo": {
    "registrationStart": "2025-01-01T00:00:00Z",
    "registrationEnd": "2025-02-15T23:59:59Z",
    "eventStart": "2025-03-01T09:00:00Z",
    "eventEnd": "2025-03-07T18:00:00Z",
    "venue": "Isha Yoga Center Sports Complex",
    "prizePool": {
      "first": 300000,
      "second": 200000,
      "third": 100000,
      "currency": "INR"
    }
  },
  
  "assets": {
    "primaryImage": "/images/sports/volleyball_main.jpg",
    "thumbnailImage": "/images/sports/volleyball_thumb.jpg", 
    "galleryImages": [
      "/images/sports/volleyball_1.jpg",
      "/images/sports/volleyball_2.jpg"
    ],
    "rulesDocument": "/documents/volleyball_rules_2025.pdf"
  },
  
  "createdBy": "admin_user_id",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "version": 1
}
```

## Collection: `sports/{sportId}/seasons` (Subcollection)

For handling different years/seasons:

```typescript
interface SportSeason {
  seasonId: string;         // '2025', '2026'
  year: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  
  // Override sport config for this season
  teamConfigOverride?: Partial<TeamConfig>;
  eligibilityOverride?: Partial<Eligibility>;
  eventInfoOverride?: Partial<EventInfo>;
  
  // Season-specific data
  registeredTeams: number;
  maxTeams?: number;
  
  createdAt: string;
  updatedAt: string;
}
```