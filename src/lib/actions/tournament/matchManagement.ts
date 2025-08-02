'use server'

import { adminDb } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import { FixtureMatch } from '@/lib/types/fixtures';

interface MatchResult {
  winnerId: string;
  loserId: string;
  scores?: {
    team1Score: number;
    team2Score: number;
    sets?: Array<{
      team1: number;
      team2: number;
    }>;
  };
  matchDuration?: number; // in minutes
  notes?: string;
}

export async function updateMatchResult(
  fixtureId: string,
  matchId: string,
  result: MatchResult,
  venueId: string
) {
  try {
    const fixtureRef = adminDb.collection('fixtures').doc(fixtureId);
    const fixtureDoc = await fixtureRef.get();
    const fixtureData = fixtureDoc.data();
    
    if (!fixtureData) {
      return { success: false, error: 'Fixture not found' };
    }
    
    // Update match result
    const updatedMatches = fixtureData.bracket.matches.map((match: FixtureMatch) => {
      if (match.matchId === matchId) {
        return {
          ...match,
          winnerId: result.winnerId,
          loserId: result.loserId,
          scores: result.scores,
          matchDuration: result.matchDuration,
          notes: result.notes,
          status: 'completed',
          completedAt: new Date()
        };
      }
      return match;
    });
    
    // Find and update next round match
    const nextRoundMatch = findNextRoundMatch(updatedMatches, matchId, result.winnerId);
    let finalMatches = updatedMatches;
    
    if (nextRoundMatch) {
      finalMatches = updatedMatches.map((match: FixtureMatch) => {
        if (match.matchId === nextRoundMatch.matchId) {
          return nextRoundMatch.updatedMatch;
        }
        return match;
      });
      
      await fixtureRef.update({
        'bracket.matches': finalMatches,
        updatedAt: new Date()
      });
    } else {
      // Tournament might be finished - check for completion
      const completionResult = await checkTournamentCompletion(
        fixtureId, 
        finalMatches, 
        fixtureData,
        venueId
      );
      
      if (completionResult.isComplete) {
        await fixtureRef.update({
          'bracket.matches': finalMatches,
          'bracket.winners': completionResult.winners,
          status: 'completed',
          finalStandings: completionResult.standings,
          completedAt: new Date(),
          updatedAt: new Date()
        });
        
        // Trigger level advancement if applicable
        await checkAndTriggerLevelAdvancement(fixtureId, fixtureData, completionResult.winners);
      } else {
        await fixtureRef.update({
          'bracket.matches': finalMatches,
          updatedAt: new Date()
        });
      }
    }
    
    revalidatePath(`/volunteer/venues/${venueId}/fixtures/${fixtureId}`);
    revalidatePath(`/volunteer/venues/${venueId}/fixtures`);
    
    return { 
      success: true, 
      message: 'Match result updated successfully',
      tournamentComplete: nextRoundMatch === null
    };
  } catch (error) {
    console.error('Error updating match result:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

function findNextRoundMatch(
  matches: FixtureMatch[], 
  currentMatchId: string, 
  winnerId: string
): { matchId: string; updatedMatch: FixtureMatch } | null {
  const currentMatch = matches.find(m => m.matchId === currentMatchId);
  if (!currentMatch) return null;
  
  // Find the next round by looking for matches that don't have both teams set
  const nextRoundMatches = matches.filter(match => 
    match.status === 'scheduled' && 
    (!match.team1Id || !match.team2Id) &&
    match.matchId !== currentMatchId
  );
  
  // Simple logic: assign winner to the first available slot in next round
  for (const nextMatch of nextRoundMatches) {
    if (!nextMatch.team1Id) {
      return {
        matchId: nextMatch.matchId,
        updatedMatch: { ...nextMatch, team1Id: winnerId }
      };
    } else if (!nextMatch.team2Id) {
      return {
        matchId: nextMatch.matchId,
        updatedMatch: { ...nextMatch, team2Id: winnerId }
      };
    }
  }
  
  return null;
}

async function checkTournamentCompletion(
  fixtureId: string,
  matches: FixtureMatch[],
  fixtureData: any,
  venueId: string
) {
  // Check if final match is completed
  const finalMatch = matches.find(match => match.roundName === 'Final');
  
  if (!finalMatch || finalMatch.status !== 'completed') {
    return { isComplete: false, winners: [], standings: [] };
  }
  
  // Tournament is complete
  const champion = finalMatch.winnerId;
  const runnerUp = finalMatch.team1Id === champion ? finalMatch.team2Id : finalMatch.team1Id;
  
  // For cluster/division tournaments, we need top 2 teams
  const winners = [champion];
  if (runnerUp && (fixtureData.level === 'cluster' || fixtureData.level === 'division')) {
    winners.push(runnerUp);
  }
  
  // Generate final standings
  const standings = await generateFinalStandings(matches, fixtureData.assignedTeams);
  
  return {
    isComplete: true,
    winners,
    standings
  };
}

async function generateFinalStandings(matches: FixtureMatch[], teamIds: string[]) {
  const standings = [];
  
  // Get team details
  const teamData = {};
  for (const teamId of teamIds) {
    const teamDoc = await adminDb.collection('teams').doc(teamId).get();
    if (teamDoc.exists) {
      teamData[teamId] = teamDoc.data();
    }
  }
  
  // Find final match for positions 1 and 2
  const finalMatch = matches.find(match => match.roundName === 'Final' && match.status === 'completed');
  if (finalMatch) {
    standings.push({
      teamId: finalMatch.winnerId,
      position: 1,
      qualifiesForNext: true
    });
    
    const runnerUp = finalMatch.team1Id === finalMatch.winnerId ? finalMatch.team2Id : finalMatch.team1Id;
    if (runnerUp) {
      standings.push({
        teamId: runnerUp,
        position: 2,
        qualifiesForNext: true
      });
    }
  }
  
  // Add remaining teams (simplified - could be enhanced with more detailed ranking logic)
  const topTwoTeams = standings.map(s => s.teamId);
  const remainingTeams = teamIds.filter(id => !topTwoTeams.includes(id));
  
  remainingTeams.forEach((teamId, index) => {
    standings.push({
      teamId,
      position: index + 3,
      qualifiesForNext: false
    });
  });
  
  return standings;
}

async function checkAndTriggerLevelAdvancement(
  fixtureId: string,
  fixtureData: any,
  winners: string[]
) {
  try {
    if (fixtureData.level === 'cluster' && winners.length >= 2) {
      // Find division venue mapping
      const mappingSnapshot = await adminDb.collection('clusterDivisionMapping')
        .where('clusterVenueId', '==', fixtureData.venueId)
        .where('isActive', '==', true)
        .get();
      
      if (!mappingSnapshot.empty) {
        const mapping = mappingSnapshot.docs[0].data();
        
        // Update team assignments for division level
        const batch = adminDb.batch();
        
        for (const teamId of winners.slice(0, 2)) { // Top 2 teams only
          const teamAssignmentRef = adminDb.collection('teamVenueAssignment').doc(teamId);
          batch.update(teamAssignmentRef, {
            currentLevel: 'division',
            divisionVenueId: mapping.divisionVenueId,
            divisionVenueName: mapping.divisionVenueName,
            clusterQualified: true,
            qualifiedAt: new Date(),
            updatedAt: new Date()
          });

          // Update team document with division venue info
          const teamRef = adminDb.collection('teams').doc(teamId);
          batch.update(teamRef, {
            currentTournamentLevel: 'division',
            divisionVenueId: mapping.divisionVenueId,
            divisionVenueName: mapping.divisionVenueName,
            clusterQualified: true,
            clusterQualifiedAt: new Date(),
            // Reset for division level
            checkedIn: false,
            tournamentNumber: null
          });
        }
        
        await batch.commit();
        
        // Create advancement notification
        await createAdvancementNotification(
          winners.slice(0, 2), 
          'division', 
          mapping.divisionVenueName,
          fixtureData.sportName,
          fixtureData.genderCategory
        );
        
        console.log(`Teams ${winners.slice(0, 2).join(', ')} advanced to division level at ${mapping.divisionVenueName}`);
      }
    } else if (fixtureData.level === 'division' && winners.length >= 2) {
      // Advance to finals (Isha Yoga Center)
      const batch = adminDb.batch();
      
      for (const teamId of winners.slice(0, 2)) {
        const teamAssignmentRef = adminDb.collection('teamVenueAssignment').doc(teamId);
        batch.update(teamAssignmentRef, {
          currentLevel: 'final',
          finalVenueId: 'isha_yoga_center',
          finalVenueName: 'Isha Yoga Center',
          divisionQualified: true,
          qualifiedAt: new Date(),
          updatedAt: new Date()
        });

        // Update team document for finals
        const teamRef = adminDb.collection('teams').doc(teamId);
        batch.update(teamRef, {
          currentTournamentLevel: 'final',
          finalVenueId: 'isha_yoga_center',
          finalVenueName: 'Isha Yoga Center',
          divisionQualified: true,
          divisionQualifiedAt: new Date(),
          // Reset for final level
          checkedIn: false,
          tournamentNumber: null
        });
      }
      
      await batch.commit();
      
      // Create advancement notification for finals
      await createAdvancementNotification(
        winners.slice(0, 2), 
        'final', 
        'Isha Yoga Center',
        fixtureData.sportName,
        fixtureData.genderCategory
      );
      
      console.log(`Teams ${winners.slice(0, 2).join(', ')} advanced to finals at Isha Yoga Center`);
    }
  } catch (error) {
    console.error('Error in level advancement:', error);
  }
}

async function createAdvancementNotification(
  teamIds: string[], 
  level: string, 
  venueName: string,
  sportName: string,
  genderCategory: string
) {
  try {
    const batch = adminDb.batch();
    
    for (const teamId of teamIds) {
      // Get team captain info
      const teamDoc = await adminDb.collection('teams').doc(teamId).get();
      const teamData = teamDoc.data();
      
      if (teamData?.captainId) {
        const notificationData = {
          userId: teamData.captainId,
          type: 'tournament_advancement',
          title: `🏆 Congratulations! Your team advanced to ${level} level`,
          message: `Your team "${teamData.name}" has qualified for the ${level} level tournament at ${venueName}. Please check in your team on the match day.`,
          data: {
            teamId,
            teamName: teamData.name,
            level,
            venueName,
            sportName,
            genderCategory
          },
          read: false,
          createdAt: new Date()
        };
        
        const notificationRef = adminDb.collection('notifications').doc();
        batch.set(notificationRef, notificationData);
      }
    }
    
    await batch.commit();
  } catch (error) {
    console.error('Error creating advancement notifications:', error);
  }
}

export async function getFixtureDetails(fixtureId: string) {
  try {
    const fixtureDoc = await adminDb.collection('fixtures').doc(fixtureId).get();
    
    if (!fixtureDoc.exists) {
      return { 
        success: false, 
        error: 'Fixture not found',
        fixture: null 
      };
    }
    
    const fixtureData = fixtureDoc.data();
    
    // Get team details for matches
    const teamIds = [...new Set([
      ...fixtureData.assignedTeams,
      ...fixtureData.bracket.matches.flatMap((match: FixtureMatch) => 
        [match.team1Id, match.team2Id].filter(Boolean)
      )
    ])];
    
    const teams = {};
    for (const teamId of teamIds) {
      if (teamId) {
        const teamDoc = await adminDb.collection('teams').doc(teamId).get();
        if (teamDoc.exists) {
          teams[teamId] = {
            id: teamId,
            ...teamDoc.data()
          };
        }
      }
    }
    
    return {
      success: true,
      fixture: {
        id: fixtureId,
        ...fixtureData
      },
      teams
    };
  } catch (error) {
    console.error('Error getting fixture details:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      fixture: null 
    };
  }
}

export async function getAvailableMatches(fixtureId: string) {
  try {
    const result = await getFixtureDetails(fixtureId);
    
    if (!result.success || !result.fixture) {
      return { success: false, error: result.error, matches: [] };
    }
    
    // Get matches that are ready to be played (have both teams assigned)
    const availableMatches = result.fixture.bracket.matches.filter((match: FixtureMatch) => 
      match.team1Id && 
      match.team2Id && 
      match.status === 'scheduled'
    );
    
    return {
      success: true,
      matches: availableMatches,
      teams: result.teams
    };
  } catch (error) {
    console.error('Error getting available matches:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      matches: []
    };
  }
}