'use server'

import { adminDb } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import { FixtureMatch, Match } from '@/lib/types/fixtures';
import { FieldValue } from 'firebase-admin/firestore';

// --- INTERFACES ---

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

interface NewMatchResult {
  winnerId: string;
  winnerName: string;
  score?: {
    team1Score?: number;
    team2Score?: number;
    details?: string;
  };
  resultEnteredBy: string;
}

// --- OLD SYSTEM (for reference, contains flawed logic) ---

export async function updateMatchResult(
  fixtureId: string,
  matchId: string,
  result: MatchResult,
  venueId: string
) {
  // NOTE: This function contains the original, flawed logic for advancing winners.
  // It is recommended to use the new `updateStandaloneMatchResult` function which uses a corrected advancement algorithm.
  try {
    const fixtureRef = adminDb.collection('fixtures').doc(fixtureId);
    const fixtureDoc = await fixtureRef.get();
    const fixtureData = fixtureDoc.data();
    
    if (!fixtureData) {
      return { success: false, error: 'Fixture not found' };
    }
    
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
  
  const nextRoundMatches = matches.filter(match => 
    match.status === 'scheduled' && 
    (!match.team1Id || !match.team2Id) &&
    match.matchId !== currentMatchId
  );
  
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
  const finalMatch = matches.find(match => match.roundName === 'Final');
  
  if (!finalMatch || finalMatch.status !== 'completed') {
    return { isComplete: false, winners: [], standings: [] };
  }
  
  const champion = finalMatch.winnerId;
  const runnerUp = finalMatch.team1Id === champion ? finalMatch.team2Id : finalMatch.team1Id;
  
  const winners = [champion];
  if (runnerUp && (fixtureData.level === 'cluster' || fixtureData.level === 'division')) {
    winners.push(runnerUp);
  }
  
  const standings = await generateFinalStandings(matches, fixtureData.assignedTeams);
  
  return {
    isComplete: true,
    winners,
    standings
  };
}

async function generateFinalStandings(matches: FixtureMatch[], teamIds: string[]) {
  const standings = [];
  const teamData = {};
  for (const teamId of teamIds) {
    const teamDoc = await adminDb.collection('teams').doc(teamId).get();
    if (teamDoc.exists) {
      teamData[teamId] = teamDoc.data();
    }
  }
  
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
      const mappingSnapshot = await adminDb.collection('clusterDivisionMapping')
        .where('clusterVenueId', '==', fixtureData.venueId)
        .where('isActive', '==', true)
        .get();
      
      if (!mappingSnapshot.empty) {
        const mapping = mappingSnapshot.docs[0].data();
        const batch = adminDb.batch();
        
        for (const teamId of winners.slice(0, 2)) {
          const teamAssignmentRef = adminDb.collection('teamVenueAssignment').doc(teamId);
          batch.update(teamAssignmentRef, {
            currentLevel: 'division',
            divisionVenueId: mapping.divisionVenueId,
            divisionVenueName: mapping.divisionVenueName,
            clusterQualified: true,
            qualifiedAt: new Date(),
            updatedAt: new Date()
          });

          const teamRef = adminDb.collection('teams').doc(teamId);
          batch.update(teamRef, {
            currentTournamentLevel: 'division',
            divisionVenueId: mapping.divisionVenueId,
            divisionVenueName: mapping.divisionVenueName,
            clusterQualified: true,
            clusterQualifiedAt: new Date(),
            checkedIn: false,
            tournamentNumber: null
          });
        }
        
        await batch.commit();
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

        const teamRef = adminDb.collection('teams').doc(teamId);
        batch.update(teamRef, {
          currentTournamentLevel: 'final',
          finalVenueId: 'isha_yoga_center',
          finalVenueName: 'Isha Yoga Center',
          divisionQualified: true,
          divisionQualifiedAt: new Date(),
          checkedIn: false,
          tournamentNumber: null
        });
      }
      
      await batch.commit();
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

// --- NEW, CORRECTED SYSTEM ---

export async function updateStandaloneMatchResult(
  matchId: string,
  result: NewMatchResult,
  volunteerId: string
) {
  try {
    const userDoc = await adminDb.collection('users').doc(volunteerId).get();
    if (!userDoc.exists) {
      return { success: false, error: 'Volunteer not found' };
    }
    
    const userData = userDoc.data();
    if (!userData || !['technical_volunteer', 'admin'].includes(userData.role)) {
      return { success: false, error: 'Not authorized to update match results' };
    }
    
    const matchRef = adminDb.collection('matches').doc(matchId);
    const matchDoc = await matchRef.get();
    if (!matchDoc.exists) {
      return { success: false, error: 'Match not found' };
    }
    
    const matchData = matchDoc.data();
    
    if (matchData?.status !== 'ready' && matchData?.status !== 'in_progress') {
      return { 
        success: false, 
        error: 'Match is not ready to be played or already completed' 
      };
    }
    
    const validWinners = [matchData?.team1?.teamId, matchData?.team2?.teamId].filter(Boolean);
    if (!validWinners.includes(result.winnerId)) {
      return { 
        success: false, 
        error: 'Winner must be one of the participating teams' 
      };
    }
    
    await matchRef.update({
      result: {
        winnerId: result.winnerId,
        winnerName: result.winnerName,
        score: result.score || null,
        resultEnteredBy: volunteerId,
        resultEnteredAt: FieldValue.serverTimestamp()
      },
      status: 'completed',
      updatedAt: FieldValue.serverTimestamp()
    });
    
    if (matchData?.fixtureId) {
      await updateFixtureAndAdvanceWinner(matchData.fixtureId, matchData, result.winnerId, result.winnerName);
    }
    
    if (matchData?.fixtureId) {
      await checkAndCompleteTournament(matchData.fixtureId, matchData, result.winnerId, result.winnerName);
    }
    
    revalidatePath(`/volunteer/venues/${matchData?.venueId}/matches`);
    revalidatePath(`/volunteer/venues/${matchData?.venueId}/fixtures`);
    
    console.log(`Match ${matchId} result updated: ${result.winnerName} wins`);
    
    return {
      success: true,
      message: 'Match result updated successfully'
    };
    
  } catch (error) {
    console.error('Error updating match result:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

async function updateFixtureAndAdvanceWinner(
    fixtureId: string,
    completedMatchData: any,
    winnerId: string,
    winnerName: string
) {
    try {
        const fixtureRef = adminDb.collection('fixtures').doc(fixtureId);
        const fixtureDoc = await fixtureRef.get();
        if (!fixtureDoc.exists) {
            console.error(`[Advancement] Fixture ${fixtureId} not found.`);
            return;
        }

        const fixtureData = fixtureDoc.data();
        let allBracketMatches: any[] = fixtureData?.bracket?.matches || [];

        // Find the completed match in the bracket to get its pre-defined advancement path
        const completedBracketMatch = allBracketMatches.find(m => m.matchId === completedMatchData.matchId);

        if (!completedBracketMatch) {
            console.error(`Could not find match ${completedMatchData.matchId} in the fixture's bracket.`);
            return;
        }

        // Part 1: Mark the match as completed in the bracket
        allBracketMatches = allBracketMatches.map(m => 
            m.matchId === completedMatchData.matchId 
                ? { ...m, winnerId: winnerId, status: 'completed' } 
                : m
        );

        // Part 2: Advance the winner if a next match is defined
        const { nextMatchId, nextSlot } = completedBracketMatch;

        if (nextMatchId && nextSlot) {
            // Update the team slot in the next match within the bracket
            allBracketMatches = allBracketMatches.map(m => {
                if (m.matchId === nextMatchId) {
                    console.log(`[Advancement] Advancing winner to ${nextSlot} in fixture bracket match ${nextMatchId}`);
                    return { ...m, [nextSlot]: winnerId };
                }
                return m;
            });

            // Update the corresponding standalone match document
            const targetMatchRef = adminDb.collection('matches').doc(nextMatchId);
            const winnerTeamDetails = {
                teamId: winnerId,
                teamName: winnerName,
                tournamentNumber: (await adminDb.collection('teams').doc(winnerId).get()).data()?.tournamentNumber
            };

            const updatePayload: any = {};
            const teamSlotKey = nextSlot === 'team1Id' ? 'team1' : 'team2';
            updatePayload[teamSlotKey] = winnerTeamDetails;
            
            // Check if the target match is now ready to be played
            const targetMatchData = allBracketMatches.find(m => m.matchId === nextMatchId);
            if (targetMatchData && targetMatchData.team1Id && targetMatchData.team2Id) {
                updatePayload.status = 'ready';
                console.log(`[Advancement] Standalone match ${nextMatchId} is now ready.`);
            }
            
            await targetMatchRef.update({ ...updatePayload, updatedAt: FieldValue.serverTimestamp() });
        }

        // Part 3: Commit all changes to the fixture document
        await fixtureRef.update({
            'bracket.matches': allBracketMatches,
            updatedAt: FieldValue.serverTimestamp()
        });

        console.log(`[Advancement] Fixture ${fixtureId} updated successfully.`);

    } catch (error) {
        console.error('Error during fixture update and winner advancement:', error);
    }
}

async function checkAndCompleteTournament(
  fixtureId: string, 
  matchData: any, 
  winnerId: string, 
  winnerName: string
) {
  try {
    const fixtureDoc = await adminDb.collection('fixtures').doc(fixtureId).get();
    if (!fixtureDoc.exists) return;
    
    const fixtureData = fixtureDoc.data();
    
    if (matchData.roundName !== 'Final') {
      return;
    }
    
    console.log(`Final match completed for fixture ${fixtureId}. Winner: ${winnerName}`);
    
    const allMatches = await adminDb.collection('matches')
      .where('fixtureId', '==', fixtureId)
      .where('status', '==', 'completed')
      .get();
    
    const finalStandings = await calculateFinalStandings(
      fixtureData,
      allMatches.docs.map(doc => doc.data()),
      winnerId
    );
    
    const winners = [winnerId];
    
    if ((fixtureData.level === 'cluster' || fixtureData.level === 'division') && finalStandings.length >= 2) {
      winners.push(finalStandings[1].teamId);
    }
    
    await adminDb.collection('fixtures').doc(fixtureId).update({
      status: 'completed',
      'bracket.winners': winners,
      finalStandings: finalStandings,
      championTeamId: winnerId,
      championTeamName: winnerName,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    await triggerLevelAdvancement(fixtureData, winners);
    
    revalidatePath(`/volunteer/venues/${fixtureData.venueId}/fixtures`);
    revalidatePath(`/volunteer/venues/${fixtureData.venueId}/fixtures/${fixtureId}`);
    
    console.log(`Tournament ${fixtureId} completed. Champion: ${winnerName}, Winners advancing: ${winners.length}`);
    
  } catch (error) {
    console.error('Error completing tournament:', error);
  }
}

async function calculateFinalStandings(
  fixtureData: any,
  completedMatches: any[],
  championId: string
) {
  const standings = [];
  
  const teamData = {};
  for (const teamId of fixtureData.assignedTeams) {
    const teamDoc = await adminDb.collection('teams').doc(teamId).get();
    if (teamDoc.exists) {
      teamData[teamId] = teamDoc.data();
    }
  }
  
  const finalMatch = completedMatches.find(match => match.roundName === 'Final');
  let runnerUpId = null;
  
  if (finalMatch) {
    runnerUpId = finalMatch.team1?.teamId === championId ? 
      finalMatch.team2?.teamId : finalMatch.team1?.teamId;
  }
  
  standings.push({
    position: 1,
    teamId: championId,
    teamName: teamData[championId]?.name || 'Unknown Team',
    qualifiesForNext: true
  });
  
  if (runnerUpId) {
    standings.push({
      position: 2,
      teamId: runnerUpId,
      teamName: teamData[runnerUpId]?.name || 'Unknown Team',
      qualifiesForNext: fixtureData.level === 'cluster' || fixtureData.level === 'division'
    });
  }
  
  const topTwoTeams = [championId, runnerUpId].filter(Boolean);
  const remainingTeams = fixtureData.assignedTeams.filter(teamId => !topTwoTeams.includes(teamId));
  
  remainingTeams.forEach((teamId, index) => {
    standings.push({
      position: index + 3,
      teamId,
      teamName: teamData[teamId]?.name || 'Unknown Team',
      qualifiesForNext: false
    });
  });
  
  return standings;
}

async function triggerLevelAdvancement(fixtureData: any, winners: string[]) {
  try {
    if (fixtureData.level === 'cluster' && winners.length >= 2) {
      const mappingSnapshot = await adminDb.collection('clusterDivisionMapping')
        .where('clusterVenueId', '==', fixtureData.venueId)
        .where('isActive', '==', true)
        .get();
      
      if (!mappingSnapshot.empty) {
        const mapping = mappingSnapshot.docs[0].data();
        const batch = adminDb.batch();
        
        for (const teamId of winners.slice(0, 2)) {
          const teamAssignmentRef = adminDb.collection('teamVenueAssignment').doc(teamId);
          batch.update(teamAssignmentRef, {
            currentLevel: 'division',
            divisionVenueId: mapping.divisionVenueId,
            divisionVenueName: mapping.divisionVenueName,
            clusterQualified: true,
            qualifiedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });

          const teamRef = adminDb.collection('teams').doc(teamId);
          batch.update(teamRef, {
            currentTournamentLevel: 'division',
            divisionVenueId: mapping.divisionVenueId,
            divisionVenueName: mapping.divisionVenueName,
            clusterQualified: true,
            clusterQualifiedAt: FieldValue.serverTimestamp(),
            checkedIn: false,
            tournamentNumber: null,
            matchDayStatus: 'pending'
          });
        }
        
        await batch.commit();
        console.log(`Teams ${winners.slice(0, 2).join(', ')} advanced to division level at ${mapping.divisionVenueName}`);
      }
    } else if (fixtureData.level === 'division' && winners.length >= 2) {
      const batch = adminDb.batch();
      
      for (const teamId of winners.slice(0, 2)) {
        const teamAssignmentRef = adminDb.collection('teamVenueAssignment').doc(teamId);
        batch.update(teamAssignmentRef, {
          currentLevel: 'final',
          finalVenueId: 'isha_yoga_center',
          finalVenueName: 'Isha Yoga Center',
          divisionQualified: true,
          qualifiedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });

        const teamRef = adminDb.collection('teams').doc(teamId);
        batch.update(teamRef, {
          currentTournamentLevel: 'final',
          finalVenueId: 'isha_yoga_center',
          finalVenueName: 'Isha Yoga Center',
          divisionQualified: true,
          divisionQualifiedAt: FieldValue.serverTimestamp(),
          checkedIn: false,
          tournamentNumber: null,
          matchDayStatus: 'pending'
        });
      }
      
      await batch.commit();
      console.log(`Teams ${winners.slice(0, 2).join(', ')} advanced to finals at Isha Yoga Center`);
    }
  } catch (error) {
    console.error('Error in level advancement:', error);
  }
}

// --- OTHER UTILITY FUNCTIONS ---

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
    
    const teamIds = [...new Set([
      ...fixtureData.assignedTeams,
      ...fixtureData.bracket.matches.flatMap((match: FixtureMatch) => 
        [match.team1Id, match.team2Id].filter(Boolean)
      )
    ])];
    
    const teams = {};
    if (teamIds.length > 0) {
      const teamRefs = teamIds.map(id => adminDb.collection('teams').doc(id));
      const teamDocs = await adminDb.getAll(...teamRefs);
      
      teamDocs.forEach(doc => {
        if (doc.exists) {
          const teamData = doc.data();
          teams[doc.id] = {
            id: doc.id,
            ...teamData
          };
        }
      });
    }
    
    const serializedFixture = {
      id: fixtureId,
      ...fixtureData,
      createdAt: fixtureData?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: fixtureData?.updatedAt?.toDate?.()?.toISOString() || null,
      completedAt: fixtureData?.completedAt?.toDate?.()?.toISOString() || null
    };

    return {
      success: true,
      fixture: serializedFixture,
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

export async function getMatchDetails(matchId: string) {
  try {
    const matchDoc = await adminDb.collection('matches').doc(matchId).get();
    
    if (!matchDoc.exists) {
      return {
        success: false,
        error: 'Match not found'
      };
    }
    
    const matchData = matchDoc.data();
    
    const serializedMatch = {
      matchId: matchDoc.id,
      ...matchData,
      createdAt: matchData?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: matchData?.updatedAt?.toDate?.()?.toISOString() || null,
      result: matchData?.result ? {
        ...matchData.result,
        resultEnteredAt: matchData.result.resultEnteredAt?.toDate?.()?.toISOString() || null
      } : undefined
    };
    
    return {
      success: true,
      match: serializedMatch
    };
  } catch (error) {
    console.error('Error getting match details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function startMatch(matchId: string, volunteerId: string) {
  try {
    const userDoc = await adminDb.collection('users').doc(volunteerId).get();
    if (!userDoc.exists) {
      return { success: false, error: 'Volunteer not found' };
    }
    
    const userData = userDoc.data();
    if (!userData || !['technical_volunteer', 'admin'].includes(userData.role)) {
      return { success: false, error: 'Not authorized to start matches' };
    }
    
    const matchDoc = await adminDb.collection('matches').doc(matchId).get();
    if (!matchDoc.exists) {
      return { success: false, error: 'Match not found' };
    }
    
    const matchData = matchDoc.data();
    
    if (matchData?.status !== 'ready') {
      return { 
        success: false, 
        error: 'Match is not ready to start' 
      };
    }
    
    await adminDb.collection('matches').doc(matchId).update({
      status: 'in_progress',
      updatedAt: FieldValue.serverTimestamp()
    });
    
    revalidatePath(`/volunteer/venues/${matchData?.venueId}/matches`);
    
    return {
      success: true,
      message: 'Match started successfully'
    };
    
  } catch (error) {
    console.error('Error starting match:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

