'use server'

import { adminDb } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import { Fixture, FixtureMatch } from '@/lib/types/fixtures';

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
        numberAssignedAt: new Date(),
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
    console.error('Error assigning team numbers:', error);
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
    // Get checked-in teams for this venue
    const teamsSnapshot = await adminDb.collection('teams')
      .where('checkedInVenue', '==', venueId)
      .where('checkedIn', '==', true)
      .where('eventId', '==', eventId)
      .where('sportId', '==', sportId)
      .where('genderCategory', '==', genderCategory)
      .get();
    
    if (teamsSnapshot.empty) {
      return { 
        success: false, 
        error: 'No checked-in teams found for this venue and sport' 
      };
    }
    
    const teams = teamsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort teams by tournament number
    teams.sort((a, b) => (a.tournamentNumber || 0) - (b.tournamentNumber || 0));
    
    // Generate bracket
    const bracket = generateKnockoutBracket(teams);
    
    // Get venue and sport details
    const venueDoc = await adminDb.collection('venues').doc(venueId).get();
    const sportDoc = await adminDb.collection('sports').doc(sportId).get();
    
    const venueData = venueDoc.data();
    const sportData = sportDoc.data();
    
    // Determine tournament level based on venue type
    const venueLocationMappingQuery = await adminDb.collection('venueLocationMapping')
      .where('venueId', '==', venueId)
      .where('isActive', '==', true)
      .get();
    
    const level = !venueLocationMappingQuery.empty ? 
      venueLocationMappingQuery.docs[0].data().venueType : 'cluster';
    
    // Create fixture
    const fixtureData: Omit<Fixture, 'fixtureId'> = {
      name: `${sportData?.name || 'Tournament'} ${genderCategory} - ${venueData?.name || 'Venue'} ${level}`,
      eventId,
      sportId,
      sportName: sportData?.name || 'Unknown Sport',
      genderCategory,
      level: level as 'cluster' | 'division' | 'final',
      venueId,
      venueName: venueData?.name || 'Unknown Venue',
      assignedTeams: teams.map(t => t.id),
      checkedInTeams: teams.map(t => t.id),
      bracket: {
        matches: bracket.matches,
        winners: []
      },
      status: 'in_progress',
      finalStandings: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const fixtureRef = await adminDb.collection('fixtures').add(fixtureData);
    
    // Update the document with its own ID
    await fixtureRef.update({ fixtureId: fixtureRef.id });
    
    revalidatePath(`/volunteer/venues/${venueId}/fixtures`);
    
    return { 
      success: true, 
      message: 'Tournament draw created successfully',
      fixtureId: fixtureRef.id,
      totalMatches: bracket.matches.length,
      totalTeams: teams.length,
      bracketSize: bracket.bracketSize
    };
  } catch (error) {
    console.error('Error creating knockout draw:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

function generateKnockoutBracket(teams: any[]): BracketGenerationResult {
  const teamCount = teams.length;
  
  if (teamCount < 2) {
    throw new Error('At least 2 teams required for tournament');
  }
  
  // Find next power of 2 (e.g., 27 teams → 32 bracket)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(teamCount)));
  const byeCount = bracketSize - teamCount;
  
  const matches: FixtureMatch[] = [];
  let matchCounter = 1;
  
  // Teams that get byes (advance directly to next round)
  const byeTeams = teams.slice(0, byeCount).map(t => t.id);
  const firstRoundTeams = teams.slice(byeCount);
  
  // Create first round matches
  const firstRoundMatches = [];
  for (let i = 0; i < firstRoundTeams.length; i += 2) {
    const match: FixtureMatch = {
      matchId: `match_${matchCounter++}`,
      team1Id: firstRoundTeams[i]?.id,
      team2Id: firstRoundTeams[i + 1]?.id,
      winnerId: undefined,
      roundName: bracketSize === 2 ? 'Final' : `Round of ${bracketSize}`,
      status: 'scheduled'
    };
    matches.push(match);
    firstRoundMatches.push(match);
  }
  
  // Create subsequent rounds
  let currentRoundSize = bracketSize / 2;
  let previousRoundMatches = firstRoundMatches;
  
  while (currentRoundSize >= 1) {
    const roundName = getRoundName(currentRoundSize);
    const roundMatches = [];
    
    // For the first round after byes, we need to pair bye teams with first round winners
    if (currentRoundSize === bracketSize / 2 && byeCount > 0) {
      // Mix bye teams with winners from first round
      const slotsToFill = currentRoundSize;
      
      for (let i = 0; i < slotsToFill; i++) {
        const match: FixtureMatch = {
          matchId: `match_${matchCounter++}`,
          team1Id: undefined,
          team2Id: undefined,
          winnerId: undefined,
          roundName,
          status: 'scheduled'
        };
        matches.push(match);
        roundMatches.push(match);
      }
    } else {
      // Regular rounds
      for (let i = 0; i < currentRoundSize; i++) {
        const match: FixtureMatch = {
          matchId: `match_${matchCounter++}`,
          team1Id: undefined,
          team2Id: undefined,
          winnerId: undefined,
          roundName,
          status: 'scheduled'
        };
        matches.push(match);
        roundMatches.push(match);
      }
    }
    
    previousRoundMatches = roundMatches;
    currentRoundSize /= 2;
  }
  
  return {
    matches,
    totalRounds: Math.ceil(Math.log2(bracketSize)),
    bracketSize,
    byeTeams
  };
}

function getRoundName(roundSize: number): string {
  switch (roundSize) {
    case 1: return 'Final';
    case 2: return 'Semi Final';
    case 4: return 'Quarter Final';
    case 8: return 'Round of 16';
    case 16: return 'Round of 32';
    case 32: return 'Round of 64';
    default: return `Round of ${roundSize * 2}`;
  }
}

export async function getVenueCheckedInTeams(venueId: string, eventId: string) {
  try {
    console.log(`Getting checked-in teams for venue: ${venueId}, event: ${eventId}`);
    
    // First, let's also check teams assigned to this venue via teamVenueAssignment
    const venueAssignmentsSnapshot = await adminDb.collection('teamVenueAssignment')
      .where('venueId', '==', venueId)
      .where('eventId', '==', eventId)
      .get();
    
    console.log(`Found ${venueAssignmentsSnapshot.docs.length} team assignments for venue`);
    
    const checkedInTeams = [];
    
    // Check each assigned team's status
    for (const assignmentDoc of venueAssignmentsSnapshot.docs) {
      const assignment = assignmentDoc.data();
      const teamDoc = await adminDb.collection('teams').doc(assignment.teamId).get();
      
      if (teamDoc.exists) {
        const teamData = teamDoc.data();
        console.log(`Team ${assignment.teamId}: checkedIn=${teamData?.checkedIn}, matchDayStatus=${teamData?.matchDayStatus}, checkedInVenue=${teamData?.checkedInVenue}`);
        
        // Check if team is checked in (either via checkedIn field or matchDayStatus)
        if (teamData?.checkedIn === true || teamData?.matchDayStatus === 'checked_in') {
          checkedInTeams.push({
            id: teamDoc.id,
            ...teamData
          });
        }
      }
    }
    
    console.log(`Found ${checkedInTeams.length} checked-in teams for venue`);
    
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
    console.error('Error getting venue checked-in teams:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      teams: [],
      teamsBySport: {},
      totalTeams: 0
    };
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
    console.error('Error deleting fixture:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}