'use server'

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Input validation schemas
const MatchResultSchema = z.object({
  winnerId: z.string().min(1, 'Winner ID is required'),
  winnerName: z.string().min(1, 'Winner name is required'),
  score: z.object({
    team1Score: z.number().min(0).optional(),
    team2Score: z.number().min(0).optional(),
    details: z.string().max(200).optional()
  }).optional(),
  resultEnteredBy: z.string().min(1, 'Result entered by is required')
});

const UpdateMatchResultSchema = z.object({
  matchId: z.string().min(1, 'Match ID is required'),
  volunteerId: z.string().min(1, 'Volunteer ID is required'),
  result: MatchResultSchema
});

const StartMatchSchema = z.object({
  matchId: z.string().min(1, 'Match ID is required'),
  volunteerId: z.string().min(1, 'Volunteer ID is required')
});

export async function updateMatchResultTransactional(request: z.infer<typeof UpdateMatchResultSchema>) {
  try {
    // Validate input
    const validatedRequest = UpdateMatchResultSchema.parse(request);
    const { matchId, volunteerId, result } = validatedRequest;

    // Check user permissions
    const userDoc = await adminDb.collection('users').doc(volunteerId).get();
    if (!userDoc.exists) {
      return { success: false, error: 'Volunteer not found' };
    }
    
    const userData = userDoc.data();
    if (!userData || !['technical_volunteer', 'admin'].includes(userData.role)) {
      return { success: false, error: 'Not authorized to update match results' };
    }
    
    // Get match data
    const matchDoc = await adminDb.collection('matches').doc(matchId).get();
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

    // Use transaction for atomic operations
    const updateResult = await adminDb.runTransaction(async (transaction) => {
      // Update match result
      const matchRef = adminDb.collection('matches').doc(matchId);
      transaction.update(matchRef, {
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

      // If this match is part of a fixture, update fixture and advance winner
      if (matchData?.fixtureId) {
        const fixtureRef = adminDb.collection('fixtures').doc(matchData.fixtureId);
        const fixtureDoc = await transaction.get(fixtureRef);
        
        if (fixtureDoc.exists) {
          const fixtureData = fixtureDoc.data();
          let allBracketMatches = fixtureData?.bracket?.matches || [];

          // Find and update the completed match in bracket
          const completedBracketMatch = allBracketMatches.find(m => m.matchId === matchId);
          
          if (completedBracketMatch) {
            // Update match status in bracket
            allBracketMatches = allBracketMatches.map(m => 
              m.matchId === matchId 
                ? { ...m, winnerId: result.winnerId, status: 'completed' } 
                : m
            );

            // Advance winner to next match if defined
            const { nextMatchId, nextSlot } = completedBracketMatch;
            
            if (nextMatchId && nextSlot) {
              // Update bracket with advanced winner
              allBracketMatches = allBracketMatches.map(m => {
                if (m.matchId === nextMatchId) {
                  return { ...m, [nextSlot]: result.winnerId };
                }
                return m;
              });

              // Update the corresponding standalone match document
              const targetMatchRef = adminDb.collection('matches').doc(nextMatchId);
              const targetMatchDoc = await transaction.get(targetMatchRef);
              
              if (targetMatchDoc.exists) {
                const winnerTeamDoc = await adminDb.collection('teams').doc(result.winnerId).get();
                const winnerTeamData = winnerTeamDoc.exists ? winnerTeamDoc.data() : {};
                
                const winnerTeamDetails = {
                  teamId: result.winnerId,
                  teamName: result.winnerName,
                  tournamentNumber: winnerTeamData?.tournamentNumber
                };

                const updatePayload: any = {};
                const teamSlotKey = nextSlot === 'team1Id' ? 'team1' : 'team2';
                updatePayload[teamSlotKey] = winnerTeamDetails;
                
                // Check if the target match is now ready to be played
                const targetMatchData = allBracketMatches.find(m => m.matchId === nextMatchId);
                if (targetMatchData && targetMatchData.team1Id && targetMatchData.team2Id) {
                  updatePayload.status = 'ready';
                }
                
                transaction.update(targetMatchRef, {
                  ...updatePayload,
                  updatedAt: FieldValue.serverTimestamp()
                });
              }
            }

            // Update fixture with new bracket state
            transaction.update(fixtureRef, {
              'bracket.matches': allBracketMatches,
              updatedAt: FieldValue.serverTimestamp()
            });

            // Check if this was the final match
            if (completedBracketMatch.roundName === 'Final') {
              return { isFinalMatch: true, fixtureData, winnerId: result.winnerId };
            }
          }
        }
      }

      return { isFinalMatch: false };
    });

    // Handle tournament completion outside transaction to avoid conflicts
    if (updateResult.isFinalMatch && matchData?.fixtureId) {
      await handleTournamentCompletion(
        matchData.fixtureId, 
        updateResult.fixtureData, 
        result.winnerId, 
        result.winnerName
      );
    }
    
    // Revalidate relevant pages
    if (matchData?.venueId) {
      revalidatePath(`/volunteer/venues/${matchData.venueId}/matches`);
      revalidatePath(`/volunteer/venues/${matchData.venueId}/fixtures`);
    }
    
    console.log(`Match ${matchId} result updated: ${result.winnerName} wins`);
    
    return {
      success: true,
      message: 'Match result updated successfully'
    };
    
  } catch (error) {
    console.error('Error updating match result:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

async function handleTournamentCompletion(
  fixtureId: string, 
  fixtureData: any, 
  winnerId: string, 
  winnerName: string
) {
  try {
    console.log(`Final match completed for fixture ${fixtureId}. Winner: ${winnerName}`);
    
    // Get all completed matches for standings calculation
    const allMatchesSnapshot = await adminDb.collection('matches')
      .where('fixtureId', '==', fixtureId)
      .where('status', '==', 'completed')
      .get();
    
    const finalStandings = await calculateFinalStandings(
      fixtureData,
      allMatchesSnapshot.docs.map(doc => doc.data()),
      winnerId
    );
    
    const winners = [winnerId];
    
    // For cluster and division levels, runner-up also advances
    if ((fixtureData.level === 'cluster' || fixtureData.level === 'division') && finalStandings.length >= 2) {
      winners.push(finalStandings[1].teamId);
    }
    
    // Use transaction for tournament completion
    await adminDb.runTransaction(async (transaction) => {
      const fixtureRef = adminDb.collection('fixtures').doc(fixtureId);
      
      transaction.update(fixtureRef, {
        status: 'completed',
        'bracket.winners': winners,
        finalStandings: finalStandings,
        championTeamId: winnerId,
        championTeamName: winnerName,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    
    // Trigger level advancement outside transaction
    await triggerLevelAdvancement(fixtureData, winners);
    
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
  
  // Get team data for names
  const teamData: { [key: string]: any } = {};
  for (const teamId of fixtureData.assignedTeams || []) {
    try {
      const teamDoc = await adminDb.collection('teams').doc(teamId).get();
      if (teamDoc.exists) {
        teamData[teamId] = teamDoc.data();
      }
    } catch (error) {
      console.error(`Error fetching team ${teamId}:`, error);
    }
  }
  
  // Find final match to determine runner-up
  const finalMatch = completedMatches.find(match => match.roundName === 'Final');
  let runnerUpId = null;
  
  if (finalMatch) {
    runnerUpId = finalMatch.team1?.teamId === championId ? 
      finalMatch.team2?.teamId : finalMatch.team1?.teamId;
  }
  
  // Champion
  standings.push({
    position: 1,
    teamId: championId,
    teamName: teamData[championId]?.name || 'Unknown Team',
    qualifiesForNext: true
  });
  
  // Runner-up
  if (runnerUpId) {
    standings.push({
      position: 2,
      teamId: runnerUpId,
      teamName: teamData[runnerUpId]?.name || 'Unknown Team',
      qualifiesForNext: fixtureData.level === 'cluster' || fixtureData.level === 'division'
    });
  }
  
  // Other teams
  const topTwoTeams = [championId, runnerUpId].filter(Boolean);
  const remainingTeams = (fixtureData.assignedTeams || []).filter(
    (teamId: string) => !topTwoTeams.includes(teamId)
  );
  
  remainingTeams.forEach((teamId: string, index: number) => {
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
      // Advance to division level
      const mappingSnapshot = await adminDb.collection('clusterDivisionMapping')
        .where('clusterVenueId', '==', fixtureData.venueId)
        .where('isActive', '==', true)
        .get();
      
      if (!mappingSnapshot.empty) {
        const mapping = mappingSnapshot.docs[0].data();
        
        // Use transaction for advancement
        await adminDb.runTransaction(async (transaction) => {
          for (const teamId of winners.slice(0, 2)) {
            const teamAssignmentRef = adminDb.collection('teamVenueAssignment').doc(teamId);
            transaction.update(teamAssignmentRef, {
              currentLevel: 'division',
              divisionVenueId: mapping.divisionVenueId,
              divisionVenueName: mapping.divisionVenueName,
              clusterQualified: true,
              qualifiedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp()
            });

            const teamRef = adminDb.collection('teams').doc(teamId);
            transaction.update(teamRef, {
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
        });
        
        console.log(`Teams ${winners.slice(0, 2).join(', ')} advanced to division level at ${mapping.divisionVenueName}`);
      }
    } else if (fixtureData.level === 'division' && winners.length >= 2) {
      // Advance to finals
      await adminDb.runTransaction(async (transaction) => {
        for (const teamId of winners.slice(0, 2)) {
          const teamAssignmentRef = adminDb.collection('teamVenueAssignment').doc(teamId);
          transaction.update(teamAssignmentRef, {
            currentLevel: 'final',
            finalVenueId: 'isha_yoga_center',
            finalVenueName: 'Isha Yoga Center',
            divisionQualified: true,
            qualifiedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });

          const teamRef = adminDb.collection('teams').doc(teamId);
          transaction.update(teamRef, {
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
      });
      
      console.log(`Teams ${winners.slice(0, 2).join(', ')} advanced to finals at Isha Yoga Center`);
    }
  } catch (error) {
    console.error('Error in level advancement:', error);
  }
}

export async function startMatchTransactional(request: z.infer<typeof StartMatchSchema>) {
  try {
    // Validate input
    const validatedRequest = StartMatchSchema.parse(request);
    const { matchId, volunteerId } = validatedRequest;

    // Check user permissions
    const userDoc = await adminDb.collection('users').doc(volunteerId).get();
    if (!userDoc.exists) {
      return { success: false, error: 'Volunteer not found' };
    }
    
    const userData = userDoc.data();
    if (!userData || !['technical_volunteer', 'admin'].includes(userData.role)) {
      return { success: false, error: 'Not authorized to start matches' };
    }
    
    // Use transaction to ensure atomicity
    await adminDb.runTransaction(async (transaction) => {
      const matchRef = adminDb.collection('matches').doc(matchId);
      const matchDoc = await transaction.get(matchRef);
      
      if (!matchDoc.exists) {
        throw new Error('Match not found');
      }
      
      const matchData = matchDoc.data();
      
      if (matchData?.status !== 'ready') {
        throw new Error('Match is not ready to start');
      }
      
      transaction.update(matchRef, {
        status: 'in_progress',
        startedAt: FieldValue.serverTimestamp(),
        startedBy: volunteerId,
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    
    console.log(`Match ${matchId} started by ${volunteerId}`);
    
    return {
      success: true,
      message: 'Match started successfully'
    };
    
  } catch (error) {
    console.error('Error starting match:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}