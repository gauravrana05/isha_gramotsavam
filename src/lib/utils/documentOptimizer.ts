/**
 * Document Structure Optimizer
 * 
 * Utilities to reduce Firestore document payload sizes and optimize data transfer.
 * This helps improve performance by sending only necessary data to the client.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// Define lightweight versions of documents for different use cases
export interface LightweightTeam {
  id: string;
  name: string;
  sportName: string;
  status: string;
  captainProfile: {
    name: string;
    phone: string;
  };
  panchayat: string;
  district: string;
  currentPlayers: number;
  maxPlayers: number;
  genderCategory: string;
}

export interface LightweightPlayer {
  id: string;
  name: string;
  phone: string;
  age?: number;
  gender: string;
  position: string;
  verificationStatus: string;
  panchayat: string;
}

export interface LightweightMatch {
  id: string;
  team1: {
    teamId: string;
    teamName: string;
    tournamentNumber?: number;
  };
  team2: {
    teamId: string;
    teamName: string;
    tournamentNumber?: number;
  };
  status: string;
  roundName: string;
  scheduledAt: string | null;
  result?: {
    winnerId: string;
    winnerName: string;
  };
}

export interface LightweightFixture {
  id: string;
  name?: string;
  level: string;
  status: string;
  sportName: string;
  genderCategory: string;
  venueName?: string;
  assignedTeams: string[];
  totalMatches: number;
  completedMatches: number;
  createdAt: string | null;
}

/**
 * Convert full team document to lightweight version
 */
export function optimizeTeamDocument(teamDoc: any): LightweightTeam {
  return {
    id: teamDoc.id,
    name: teamDoc.name || 'Unknown Team',
    sportName: teamDoc.sportName || 'Unknown Sport',
    status: teamDoc.status || 'draft',
    captainProfile: {
      name: teamDoc.captainProfile?.name || 'Unknown Captain',
      phone: teamDoc.captainProfile?.phone || ''
    },
    panchayat: teamDoc.panchayat || '',
    district: teamDoc.district || '',
    currentPlayers: teamDoc.currentPlayers || 0,
    maxPlayers: teamDoc.maxPlayers || 6,
    genderCategory: teamDoc.genderCategory || 'mixed'
  };
}

/**
 * Convert full player document to lightweight version
 */
export function optimizePlayerDocument(playerDoc: any): LightweightPlayer {
  return {
    id: playerDoc.id,
    name: playerDoc.name || 'Unknown Player',
    phone: playerDoc.phone || '',
    age: playerDoc.age,
    gender: playerDoc.gender || 'M',
    position: playerDoc.position || 'player',
    verificationStatus: playerDoc.verificationStatus || 'pending',
    panchayat: playerDoc.profileData?.panchayat || playerDoc.panchayat || ''
  };
}

/**
 * Convert full match document to lightweight version
 */
export function optimizeMatchDocument(matchDoc: any): LightweightMatch {
  return {
    id: matchDoc.id,
    team1: {
      teamId: matchDoc.team1?.teamId || '',
      teamName: matchDoc.team1?.teamName || 'TBD',
      tournamentNumber: matchDoc.team1?.tournamentNumber
    },
    team2: {
      teamId: matchDoc.team2?.teamId || '',
      teamName: matchDoc.team2?.teamName || 'TBD',
      tournamentNumber: matchDoc.team2?.tournamentNumber
    },
    status: matchDoc.status || 'scheduled',
    roundName: matchDoc.roundName || 'Round',
    scheduledAt: matchDoc.scheduledAt?.toDate?.()?.toISOString() || null,
    result: matchDoc.result ? {
      winnerId: matchDoc.result.winnerId,
      winnerName: matchDoc.result.winnerName
    } : undefined
  };
}

/**
 * Convert full fixture document to lightweight version
 */
export function optimizeFixtureDocument(fixtureDoc: any, matchCount: { total: number, completed: number }): LightweightFixture {
  return {
    id: fixtureDoc.id,
    name: fixtureDoc.name,
    level: fixtureDoc.level || 'unknown',
    status: fixtureDoc.status || 'draft',
    sportName: fixtureDoc.sportName || 'Unknown Sport',
    genderCategory: fixtureDoc.genderCategory || 'mixed',
    venueName: fixtureDoc.venueName,
    assignedTeams: fixtureDoc.assignedTeams || [],
    totalMatches: matchCount.total,
    completedMatches: matchCount.completed,
    createdAt: fixtureDoc.createdAt?.toDate?.()?.toISOString() || null
  };
}

/**
 * Serialize Firestore timestamps to ISO strings
 */
export function serializeTimestamp(timestamp: any): string | null {
  if (!timestamp) return null;
  
  try {
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toISOString();
    }
  } catch (error) {
    console.error('Error serializing timestamp:', error);
  }
  
  return null;
}

/**
 * Remove undefined and null values from objects to reduce payload size
 */
export function cleanObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
        const cleanedNested = cleanObject(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key as keyof T] = cleanedNested as T[keyof T];
        }
      } else {
        cleaned[key as keyof T] = value;
      }
    }
  }
  
  return cleaned;
}

/**
 * Extract only essential fields from user profile for public display
 */
export function getPublicUserProfile(userProfile: any) {
  return cleanObject({
    uid: userProfile.uid,
    firstName: userProfile.firstName,
    lastName: userProfile.lastName,
    panchayat: userProfile.panchayat,
    district: userProfile.district,
    state: userProfile.state,
    role: userProfile.role,
    profilePhotoURL: userProfile.documents?.profilePhoto?.url,
    isVerified: userProfile.isVerified
  });
}

/**
 * Create summary statistics objects to reduce data transfer
 */
export function createTeamSummary(teams: any[]) {
  return {
    total: teams.length,
    byStatus: teams.reduce((acc, team) => {
      const status = team.status || 'draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    bySport: teams.reduce((acc, team) => {
      const sport = team.sportName || 'unknown';
      acc[sport] = (acc[sport] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byPanchayat: teams.reduce((acc, team) => {
      const panchayat = team.panchayat || 'unknown';
      acc[panchayat] = (acc[panchayat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}

/**
 * Batch optimize multiple documents
 */
export function batchOptimizeDocuments<T>(
  documents: any[], 
  optimizer: (doc: any) => T
): T[] {
  return documents.map(optimizer);
}

/**
 * Create paginated response with metadata
 */
export function createPaginatedResponse<T>(
  data: T[],
  limit: number,
  offset: number,
  total?: number
) {
  return {
    data,
    pagination: {
      limit,
      offset,
      count: data.length,
      hasMore: data.length === limit,
      total: total || data.length
    }
  };
}

/**
 * Compress large text fields by removing extra whitespace
 */
export function compressTextFields(obj: any): any {
  if (typeof obj === 'string') {
    return obj.trim().replace(/\s+/g, ' ');
  }
  
  if (Array.isArray(obj)) {
    return obj.map(compressTextFields);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const compressed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      compressed[key] = compressTextFields(value);
    }
    return compressed;
  }
  
  return obj;
}

/**
 * Create minimal notification objects for efficient transfer
 */
export function optimizeNotification(notification: any) {
  return cleanObject({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message?.substring(0, 200), // Truncate long messages
    read: notification.read,
    createdAt: serializeTimestamp(notification.createdAt),
    data: notification.data ? {
      teamId: notification.data.teamId,
      teamName: notification.data.teamName,
      status: notification.data.status
    } : undefined
  });
}

/**
 * Optimize arrays by removing duplicates and sorting
 */
export function optimizeArray<T>(arr: T[], keyFn?: (item: T) => any): T[] {
  if (!keyFn) {
    const result: T[] = [];
    const seen = new Set<T>();
    for (const item of arr) {
      if (!seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
    return result;
  }

  const seen = new Set();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Create efficient lookup maps for related data
 */
export function createLookupMap<T extends { id: string }>(
  items: T[]
): Map<string, T> {
  return new Map(items.map(item => [item.id, item]));
}

/**
 * Bundle related documents for efficient transfer
 */
export function bundleRelatedDocuments(
  mainDocuments: any[],
  relatedCollections: { [key: string]: any[] }
) {
  return {
    main: mainDocuments,
    related: Object.fromEntries(
      Object.entries(relatedCollections).map(([key, docs]) => [
        key,
        createLookupMap(docs)
      ])
    ),
    meta: {
      mainCount: mainDocuments.length,
      relatedCounts: Object.fromEntries(
        Object.entries(relatedCollections).map(([key, docs]) => [key, docs.length])
      )
    }
  };
}