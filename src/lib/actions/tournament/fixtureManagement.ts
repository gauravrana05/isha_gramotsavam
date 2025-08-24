'use server'

import { adminDb } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import { Fixture, FixtureMatch, Match } from '@/lib/types/fixtures';
import { FieldValue } from 'firebase-admin/firestore';
import { serializeFirestoreData } from '@/lib/utils/firestore';

interface TeamNumberAssignment {
  teamId: string;
  teamName: string;
  number: number;
}

interface BracketGenerationResult {
  matches: FixtureMatch[];
  totalRounds: number;
  bracketSize: number;
  byeTeams: string[];
}

export async function assignTeamNumbers(
  venueId: string, 
  teamNumberAssignments: TeamNumberAssignment[]
) {
  try {
    const batch = adminDb.batch();
    
    for (const assignment of teamNumberAssignments) {
      const teamRef = adminDb.collection('teams').doc(assignment.teamId);
      batch.update(teamRef, {
        tournamentNumber: assignment.number,
        numberAssignedAt: FieldValue.serverTimestamp(),
        numberAssignedVenue: venueId
      });
    }
    
    await batch.commit();
    
    revalidatePath(`/volunteer/venues/${venueId}/fixtures/create-draw`);
    
    return { 
      success: true, 
      message: 'Team numbers assigned successfully' 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function createKnockoutDraw(
  venueId: string, 
  eventId: string, 
  sportId: string,
  genderCategory: 'men' | 'women'
) {
  try {
    // First try to get teams via teamVenueAssignment (more reliable)
    const venueTeamsResult = await getVenueCheckedInTeams(venueId);
    
    if (!venueTeamsResult.success) {
      return {
        success: false,
        error: 'Failed to get venue teams: ' + venueTeamsResult.error
      };
    }
    
    const sportKey = `${sportId}_${genderCategory}`;
    const sportTeams = venueTeamsResult.teamsBySport[sportKey] || [];
    
    if (sportTeams.length === 0) {
      return { 
        success: false, 
        error: `No checked-in teams found for ${sportId} ${genderCategory} at this venue` 
      };
    }
    
    // Use the teams from venue assignment result
    const teams = sportTeams;
    
    // Sort teams by tournament number
    teams.sort((a: any, b: any) => (a.tournamentNumber || 0) - (b.tournamentNumber || 0));
    
    // Generate bracket
    const bracket = generateKnockoutBracket(teams);
    
    // Get venue and sport details
    const venueDoc = await adminDb.collection('venues').doc(venueId).get();
    const sportDoc = await adminDb.collection('sports').doc(sportId).get();
    
    const venueData = venueDoc.data();
    const sportData = sportDoc.data();
    
    // Determine tournament level directly from venue type
    const level = (venueData?.type as 'cluster' | 'division' | 'final') || 'cluster';
    
    // Create fixture
    const fixtureData: Omit<Fixture, 'fixtureId'> = {
      name: `${sportData?.name || 'Tournament'} ${genderCategory} - ${venueData?.name || 'Venue'} ${level}`,
      sportId,
      sportName: sportData?.name || 'Unknown Sport',
      genderCategory,
      level: level as 'cluster' | 'division' | 'final',
      venueId,
      venueName: venueData?.name || 'Unknown Venue',
      assignedTeams: teams.map((t: any) => t.id),
      checkedInTeams: teams.map((t: any) => t.id),
      bracket: {
        matches: bracket.matches,
        winners: []
      },
      status: 'in_progress',
      finalStandings: [],
      createdAt: FieldValue.serverTimestamp() as any,
      updatedAt: FieldValue.serverTimestamp() as any
    };
    
    const fixtureRef = await adminDb.collection('fixtures').add(fixtureData);
    
    // Update the document with its own ID
    await fixtureRef.update({ fixtureId: fixtureRef.id });
    
    // Create standalone match documents for volunteer result updates
    const matchCreationResult = await createMatchesFromBracket(
      fixtureRef.id,
      fixtureData,
      bracket.matches,
      teams
    );
    
    if (matchCreationResult.success && matchCreationResult.matches && matchCreationResult.matches.length > 0) {
      // Create a mapping from bracket match IDs to real match IDs
      const bracketToRealMatchMapping = new Map();
      bracket.matches.forEach((bracketMatch, index) => {
        if (matchCreationResult.matches[index]) {
          bracketToRealMatchMapping.set(bracketMatch.matchId, matchCreationResult.matches[index].matchId);
        }
      });
    
      // Update bracket matches with real IDs and correct nextMatchId references
      const updatedBracketMatches = bracket.matches.map((bracketMatch) => {
        const realMatchId = bracketToRealMatchMapping.get(bracketMatch.matchId);
        const realNextMatchId = bracketMatch.nextMatchId ? bracketToRealMatchMapping.get(bracketMatch.nextMatchId) : null;
        
        return {
          ...bracketMatch,
          matchId: realMatchId || bracketMatch.matchId,
          nextMatchId: realNextMatchId || bracketMatch.nextMatchId
        };
      });
    
      await fixtureRef.update({
          'bracket.matches': updatedBracketMatches
      });
    }
    
    revalidatePath(`/volunteer/venues/${venueId}/fixtures`);
    revalidatePath(`/volunteer/venues/${venueId}/matches`);
    
    return { 
      success: true, 
      message: 'Tournament draw created successfully',
      fixtureId: fixtureRef.id,
      totalMatches: bracket.matches.length,
      totalTeams: teams.length,
      bracketSize: bracket.bracketSize,
      matchesCreated: matchCreationResult.success ? matchCreationResult.matchesCreated : 0
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}



function generateKnockoutBracket(teams: any[]): BracketGenerationResult {
  const teamCount = teams.length;
  if (teamCount < 2) {
      throw new Error('At least 2 teams are required for a tournament.');
  }

  if (teamCount === 2) {
      return {
          matches: [{
              matchId: 'match_1',
              team1Id: teams[0].id,
              team2Id: teams[1].id,
              winnerId: null,
              roundName: 'Final',
              status: 'scheduled',
              nextMatchId: null,
              nextSlot: null,
          }],
          totalRounds: 1,
          bracketSize: 2,
          byeTeams: []
      };
  }

  const bracketSize = Math.pow(2, Math.ceil(Math.log2(teamCount)));
  const byeCount = bracketSize - teamCount;
  const preliminaryTeamsCount = teamCount - byeCount;
  const preliminaryMatchCount = preliminaryTeamsCount / 2;

  const byeTeams = teams.slice(0, byeCount);
  const playingTeams = teams.slice(byeCount);

  let matchCounter = 1;
  const allRounds: FixtureMatch[][] = [];

  // --- Step 1: Create Preliminary Round (if necessary) ---
  if (preliminaryMatchCount > 0) {
      const roundName = getRoundName(bracketSize);
      const preliminaryMatches: FixtureMatch[] = [];
      for (let i = 0; i < preliminaryMatchCount; i++) {
          preliminaryMatches.push({
              matchId: `match_${matchCounter++}`,
              team1Id: playingTeams[i * 2].id,
              team2Id: playingTeams[i * 2 + 1].id,
              winnerId: null,
              roundName: roundName,
              status: 'scheduled',
              nextMatchId: null,
              nextSlot: null,
          });
      }
      allRounds.push(preliminaryMatches);
  }

  // --- Step 2: Create all subsequent rounds with empty matches ---
  let teamsForThisRound = bracketSize / 2;
  while (teamsForThisRound >= 2) {
      const roundName = getRoundName(teamsForThisRound);
      const matchesInThisRoundCount = teamsForThisRound / 2;
      const currentRoundMatches: FixtureMatch[] = [];
      for (let i = 0; i < matchesInThisRoundCount; i++) {
          currentRoundMatches.push({
              matchId: `match_${matchCounter++}`,
              team1Id: null,
              team2Id: null,
              winnerId: null,
              roundName: roundName,
              status: 'scheduled',
              nextMatchId: null,
              nextSlot: null,
          });
      }
      allRounds.push(currentRoundMatches);
      teamsForThisRound /= 2;
  }

  // --- Step 3: Populate the second round with bye teams ---
  const secondRound = allRounds[preliminaryMatchCount > 0 ? 1 : 0];
  const round2Participants = [...byeTeams, ...Array(preliminaryMatchCount).fill(null)];

  for (let i = 0; i < secondRound.length; i++) {
      const team1 = round2Participants[i];
      const team2 = round2Participants[round2Participants.length - 1 - i];
      secondRound[i].team1Id = team1?.id || null;
      secondRound[i].team2Id = team2?.id || null;
  }

  // --- Step 4: Link all matches to their next match ---
  for (let roundIndex = 0; roundIndex < allRounds.length - 1; roundIndex++) {
      const currentRound = allRounds[roundIndex];
      const nextRound = allRounds[roundIndex + 1];
      
      if (currentRound.length === nextRound.length * 2) { // Standard progression (e.g., 8 QF -> 4 SF)
          for (let matchIndex = 0; matchIndex < currentRound.length; matchIndex++) {
              const nextMatch = nextRound[Math.floor(matchIndex / 2)];
              currentRound[matchIndex].nextMatchId = nextMatch.matchId;
              currentRound[matchIndex].nextSlot = (matchIndex % 2 === 0) ? 'team1Id' : 'team2Id';
          }
      } else { // Handle preliminary round to second round progression
           const emptySlotsInNextRound: { matchId: string, slot: 'team1Id' | 'team2Id' }[] = [];
           nextRound.forEach(match => {
              if (match.team1Id === null) emptySlotsInNextRound.push({ matchId: match.matchId, slot: 'team1Id' });
              if (match.team2Id === null) emptySlotsInNextRound.push({ matchId: match.matchId, slot: 'team2Id' });
           });

           for(let matchIndex = 0; matchIndex < currentRound.length; matchIndex++) {
              const targetSlotInfo = emptySlotsInNextRound[matchIndex];
              if(targetSlotInfo) {
                  currentRound[matchIndex].nextMatchId = targetSlotInfo.matchId;
                  currentRound[matchIndex].nextSlot = targetSlotInfo.slot;
              }
           }
      }
  }

  const allMatches = allRounds.flat();

  return {
      matches: allMatches,
      totalRounds: allRounds.length,
      bracketSize,
      byeTeams: byeTeams.map(t => t.id)
  };
}

function getRoundName(roundSize: number): string {
  switch (roundSize) {
    case 2: return 'Final';
    case 4: return 'Semi Final';
    case 8: return 'Quarter Final';
    case 16: return 'Round of 16';
    case 32: return 'Round of 32';
    case 64: return 'Round of 64';
    default: return `Round of ${roundSize}`;
  }
}

export async function getVenueCheckedInTeams(venueId: string, eventId?: string) {
  try {
    const startTime = Date.now();
    
    // Get team venue assignments at different levels
    const [clusterQuery, divisionQuery, finalQuery] = await Promise.all([
      adminDb.collection('teamVenueAssignment')
        .where('clusterVenueId', '==', venueId)
        .get(),
      adminDb.collection('teamVenueAssignment')
        .where('divisionVenueId', '==', venueId)
        .get(),
      adminDb.collection('teamVenueAssignment')
        .where('finalVenueId', '==', venueId)
        .get()
    ]);
    
    // Combine all assignment documents
    const allAssignments = [...clusterQuery.docs, ...divisionQuery.docs, ...finalQuery.docs];
    
    if (allAssignments.length === 0) {
      return { 
        success: true, 
        teams: [],
        teamsBySport: {},
        totalTeams: 0
      };
    }
    
    // Extract team IDs for batch query
    const teamIds = allAssignments.map(doc => doc.data().teamId);
    
    // Batch query all teams at once instead of individual queries
    const teamRefs = teamIds.map(id => adminDb.collection('teams').doc(id));
    const teamDocs = await adminDb.getAll(...teamRefs);
    
    // Create team lookup for fast access
    const teamLookup = new Map();
    teamDocs.forEach(doc => {
      if (doc.exists) {
        teamLookup.set(doc.id, doc.data());
      }
    });
    
    // Process teams in parallel using Promise.all
    const teamProcessingPromises = allAssignments.map(async (assignmentDoc) => {
      const assignment = assignmentDoc.data();
      const teamData = teamLookup.get(assignment.teamId);
      
      if (!teamData) {
        return null; // Team not found
      }
      
      // Check if team is checked in (either via checkedIn field or matchDayStatus)
      const isCheckedIn = teamData.checkedIn === true || teamData.matchDayStatus === 'checked_in';
      
      if (!isCheckedIn) {
        return null; // Team not checked in
      }
      
      // Serialize timestamp fields efficiently
      return serializeTeamData(assignment.teamId, teamData);
    });
    
    // Wait for all team processing to complete
    const processedTeams = await Promise.all(teamProcessingPromises);
    
    // Filter out null values (teams that weren't checked in or didn't exist)
    const checkedInTeams = processedTeams.filter(team => team !== null);
    
    const endTime = Date.now();
    
    // Group by sport and gender
    const teamsBySport = checkedInTeams.reduce((acc, team) => {
      const key = `${team.sportId}_${team.genderCategory}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(team);
      return acc;
    }, {} as Record<string, any[]>);
    
    return { 
      success: true, 
      teams: checkedInTeams,
      teamsBySport,
      totalTeams: checkedInTeams.length
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      teams: [],
      teamsBySport: {},
      totalTeams: 0
    };
  }
}

// Helper function to serialize team data efficiently
function serializeTeamData(teamId: string, teamData: any) {
  return {
    id: teamId,
    ...serializeFirestoreData(teamData)
  };
}

async function createMatchesFromBracket(
  fixtureId: string,
  fixture: Omit<Fixture, 'fixtureId'>,
  bracketMatches: FixtureMatch[],
  teams: any[]
) {
  try {
    const startTime = Date.now();
    
    const batch = adminDb.batch();
    const matches: Match[] = [];
    let matchNumber = 1;
    
    // Create a team lookup for quick access - no additional queries needed since teams are already loaded
    const teamLookup = teams.reduce((acc, team) => {
      acc[team.id] = team;
      return acc;
    }, {} as Record<string, any>);
    
    // Process all bracket matches in parallel (for preparation, then batch write)
    const matchCreationPromises = bracketMatches.map(async (bracketMatch) => {
      // Determine teams for first round matches (those with actual team IDs)
      let team1 = null;
      let team2 = null;
      let status: Match['status'] = 'scheduled';
      
      if (bracketMatch.team1Id && teamLookup[bracketMatch.team1Id]) {
        const team = teamLookup[bracketMatch.team1Id];
        team1 = {
          teamId: team.id,
          teamName: team.name,
          tournamentNumber: team.tournamentNumber
        };
      }
      
      if (bracketMatch.team2Id && teamLookup[bracketMatch.team2Id]) {
        const team = teamLookup[bracketMatch.team2Id];
        team2 = {
          teamId: team.id,
          teamName: team.name,
          tournamentNumber: team.tournamentNumber
        };
      }
      
      // If both teams are assigned, match is ready
      if (team1 && team2) {
        status = 'ready';
      }
      
      return {
        bracketMatch,
        team1,
        team2,
        status
      };
    });
    
    // Wait for all match preparations to complete
    const preparedMatches = await Promise.all(matchCreationPromises);
    
    // Create batch writes for all matches
    for (const { bracketMatch, team1, team2, status } of preparedMatches) {
      const match: Omit<Match, 'matchId'> = {
        fixtureId,
        fixtureName: fixture.name,
        sportId: fixture.sportId,
        sportName: fixture.sportName,
        genderCategory: fixture.genderCategory,
        venueId: fixture.venueId,
        venueName: fixture.venueName,
        roundName: bracketMatch.roundName,
        nextMatchId: bracketMatch.nextMatchId ,
        nextSlot: bracketMatch.nextSlot,
        matchNumber,
        team1,
        team2,
        status,
        createdAt: FieldValue.serverTimestamp() as any,
        updatedAt: FieldValue.serverTimestamp() as any
      };
      
      const matchRef = adminDb.collection('matches').doc();
      batch.set(matchRef, {
        ...match,
        matchId: matchRef.id
      });
      
      matches.push({
        ...match,
        matchId: matchRef.id
      } as Match);
      
      matchNumber++;
    }
    
    // Single batch commit for all matches
    await batch.commit();
    
    const endTime = Date.now();
    
    return {
      success: true,
      matchesCreated: matches.length,
      matches
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      matchesCreated: 0
    };
  }
}

export async function getVenueDetails(venueId: string) {
  try {
    const venueDoc = await adminDb.collection('venues').doc(venueId).get();
    
    if (!venueDoc.exists) {
      return {
        success: false,
        error: 'Venue not found'
      };
    }
    
    const venueData = venueDoc.data();
    
    // Recursively serialize all timestamp fields and other Firestore objects
    const serializeFirestoreData = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      
      // Handle primitive types
      if (typeof obj !== 'object') return obj;
      
      // Handle Firestore Timestamp objects
      if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
        return new Date(obj._seconds * 1000 + obj._nanoseconds / 1000000).toISOString();
      }
      
      // Handle Firestore Timestamp objects with toDate method
      if (typeof obj.toDate === 'function') {
        return obj.toDate().toISOString();
      }
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(serializeFirestoreData);
      }
      
      // Handle regular objects
      const serialized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        serialized[key] = serializeFirestoreData(value);
      }
      return serialized;
    };
    
    return {
      success: true,
      venue: {
        id: venueDoc.id,
        ...serializeFirestoreData(venueData)
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch venue details'
    };
  }
}

export async function getVenueFixtures(venueId: string) {
  try {
    const fixturesSnapshot = await adminDb.collection('fixtures')
      .where('venueId', '==', venueId)
      .get();
    
    // Sort in memory instead of using orderBy to avoid index requirement
    const docs = fixturesSnapshot.docs.sort((a, b) => {
      const aTime = a.data().createdAt?.toDate?.() || new Date(0);
      const bTime = b.data().createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
    
    // Reuse the serialization function from getVenueDetails
    const serializeFirestoreData = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      
      // Handle primitive types
      if (typeof obj !== 'object') return obj;
      
      // Handle Firestore Timestamp objects
      if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
        return new Date(obj._seconds * 1000 + obj._nanoseconds / 1000000).toISOString();
      }
      
      // Handle Firestore Timestamp objects with toDate method
      if (typeof obj.toDate === 'function') {
        return obj.toDate().toISOString();
      }
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(serializeFirestoreData);
      }
      
      // Handle regular objects
      const serialized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        serialized[key] = serializeFirestoreData(value);
      }
      return serialized;
    };
    
    return docs.map(doc => ({
      id: doc.id,
      ...serializeFirestoreData(doc.data())
    }));
  } catch (error) {
    return [];
  }
}

export async function deleteFixture(fixtureId: string, venueId: string) {
  try {
    // Check if fixture has started (has any completed matches)
    const fixtureDoc = await adminDb.collection('fixtures').doc(fixtureId).get();
    const fixtureData = fixtureDoc.data();
    
    if (!fixtureData) {
      return { success: false, error: 'Fixture not found' };
    }
    
    const hasCompletedMatches = fixtureData.bracket.matches.some(
      (match: FixtureMatch) => match.status === 'completed'
    );
    
    if (hasCompletedMatches) {
      return { 
        success: false, 
        error: 'Cannot delete fixture with completed matches' 
      };
    }
    
    // Reset team tournament numbers
    const batch = adminDb.batch();
    for (const teamId of fixtureData.assignedTeams) {
      const teamRef = adminDb.collection('teams').doc(teamId);
      batch.update(teamRef, {
        tournamentNumber: null,
        numberAssignedAt: null,
        numberAssignedVenue: null
      });
    }
    
    // Delete fixture
    batch.delete(adminDb.collection('fixtures').doc(fixtureId));
    
    await batch.commit();
    
    revalidatePath(`/volunteer/venues/${venueId}/fixtures`);
    
    return { 
      success: true, 
      message: 'Fixture deleted successfully' 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}