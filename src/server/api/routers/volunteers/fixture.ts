import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { TRPCError } from '@trpc/server';
import type { GenderCategory } from '@prisma/client';

export const volunteersFixtureRouter = createTRPCRouter({
  // Get venue fixtures
  getVenueFixtures: protectedProcedure
    .input(z.object({
      venueId: z.string()
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      // Check volunteer permissions
      if (!['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      }

      // First check if this user has an assignment for this venue
      const volunteerAssignment = await ctx.db.volunteerAssignment.findFirst({
        where: {
          volunteerId: ctx.user.id,
          deletedAt: null,
          venueLevelMapping: {
            venueId: input.venueId
          }
        },
        include: {
          venueLevelMapping: {
            include: {
              venue: true
            }
          }
        }
      });

      if (!volunteerAssignment) {
        console.warn(`⚠️ Volunteer ${ctx.user.id} has no assignment for venueId: ${input.venueId}`);
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'You are not assigned to this venue' 
        });
      }

      if (!volunteerAssignment.venueLevelMapping) {
        console.error(`❌ Volunteer assignment ${volunteerAssignment.id} has no venueLevelMapping`);
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Invalid venue assignment - no venue level mapping found' 
        });
      }

      // Get venue level mappings for this venue
      const venueLevelMappings = await ctx.db.venueLevelMapping.findMany({
        where: { venueId: input.venueId, isActive: true },
        include: {
          venue: {
            select: { id: true, name: true }
          },
          fixtures: {
            include: {
              sport: true,
              matches: {
                select: { id: true, status: true, roundName: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      // Check if venue level mappings exist
      if (!venueLevelMappings || venueLevelMappings.length === 0) {
        console.warn(`⚠️ No venue level mappings found for venueId: ${input.venueId}`);
        return [];
      }

      // Flatten fixtures from all venue level mappings with proper null checks
      const fixtures = venueLevelMappings
        .filter(vlm => vlm && vlm.fixtures) // Filter out null/undefined mappings
        .flatMap(vlm => 
          vlm.fixtures.map(fixture => ({
            ...fixture,
            level: vlm.level,
            venueName: vlm.venue?.name || 'Unknown Venue'
          }))
        );
      
      return fixtures;
    }),

  // Get available sports for fixture creation
  getAvailableSportsForFixture: protectedProcedure
    .input(z.object({
      venueId: z.string()
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      // First check if this user has an assignment for this venue
      const volunteerAssignment = await ctx.db.volunteerAssignment.findFirst({
        where: {
          volunteerId: ctx.user.id,
          deletedAt: null,
          venueLevelMapping: {
            venueId: input.venueId
          }
        },
        include: {
          venueLevelMapping: {
            include: {
              venue: true
            }
          }
        }
      });

      if (!volunteerAssignment) {
        console.warn(`⚠️ Volunteer ${ctx.user.id} has no assignment for venueId: ${input.venueId}`);
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'You are not assigned to this venue' 
        });
      }

      if (!volunteerAssignment.venueLevelMapping) {
        console.error(`❌ Volunteer assignment ${volunteerAssignment.id} has no venueLevelMapping`);
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Invalid venue assignment - no venue level mapping found' 
        });
      }
      // Get venue level mappings
      const venueLevelMappings = await ctx.db.venueLevelMapping.findMany({
        where: { venueId: input.venueId, isActive: true }
      });

      if (!venueLevelMappings || venueLevelMappings.length === 0) {
        console.warn(`⚠️ No venue level mappings found for venueId: ${input.venueId}`);
        return [];
      }

      // Filter out any null/undefined mappings and extract IDs safely
      const validVenueLevelMappingIds = venueLevelMappings
        .filter(vlm => vlm && vlm.id)
        .map(vlm => vlm.id);

      if (validVenueLevelMappingIds.length === 0) {
        console.warn(`⚠️ No valid venue level mapping IDs found for venueId: ${input.venueId}`);
        return [];
      }

      // Get checked-in teams for this venue (via team venue assignments)
      const teamAssignments = await ctx.db.teamVenueAssignment.findMany({
        where: {
          OR: [
            { clusterVenueMappingId: { in: validVenueLevelMappingIds } },
            { divisionVenueMappingId: { in: validVenueLevelMappingIds } },
            { finalVenueMappingId: { in: validVenueLevelMappingIds } }
          ]
        },
        include: {
          team: {
            include: {
              sport: true
            },
            where: {
              OR: [
                { checkedIn: true },
                { matchDayStatus: 'checked_in' }
              ]
            }
          }
        }
      });

      // Group by sport and gender
      const sportGroups = teamAssignments.reduce((acc, assignment) => {
        if (!assignment.team) return acc;
        
        const key = `${assignment.team.sportId}_${assignment.team.genderCategory}`;
        if (!acc[key]) {
          acc[key] = {
            sportId: assignment.team.sportId,
            sportName: assignment.team.sport.displayName,
            genderCategory: assignment.team.genderCategory,
            teams: []
          };
        }
        acc[key].teams.push(assignment.team);
        return acc;
      }, {} as Record<string, any>);

      // Return only sports with 2+ teams
      return Object.values(sportGroups)
        .filter((group: any) => group.teams.length >= 2)
        .map((group: any) => ({
          sportId: group.sportId,
          sportName: group.sportName,
          genderCategory: group.genderCategory,
          teamCount: group.teams.length
        }));
    }),

  // Create fixture
  createFixture: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      name: z.string(),
      sportId: z.string(),
      genderCategory: z.enum(['men', 'women', 'mixed']),
      level: z.enum(['cluster', 'division', 'final']),
      maxTeams: z.number(),
      description: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Get venue level mapping
      const venueLevelMapping = await ctx.db.venueLevelMapping.findFirst({
        where: {
          venueId: input.venueId,
          level: input.level,
          isActive: true
        },
        include: {
          venue: true,
          event: true
        }
      });

      if (!venueLevelMapping) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Venue level mapping not found' });
      }

      // Get sport details
      const sport = await ctx.db.sport.findUnique({ where: { id: input.sportId } });
      if (!sport) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sport not found' });
      }

      // Create fixture
      const fixture = await ctx.db.fixture.create({
        data: {
          name: input.name,
          eventId: venueLevelMapping.eventId,
          sportId: input.sportId,
          venueLevelMappingId: venueLevelMapping.id,
          genderCategory: input.genderCategory,
          level: input.level,
          status: 'draft'
        }
      });

      return { success: true, fixtureId: fixture.id };
    }),

  // Assign team numbers
  assignTeamNumbers: protectedProcedure
    .input(z.object({
      venueLevelMappingId: z.string(),
      assignments: z.array(z.object({
        teamId: z.string(),
        number: z.number()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      // Update teams with tournament numbers
      await Promise.all(
        input.assignments.map(assignment =>
          ctx.db.team.update({
            where: { id: assignment.teamId },
            data: {
              tournamentNumber: assignment.number,
              tournamentNumberAssignedAt: new Date(),
              tournamentNumberVenueMappingId: input.venueLevelMappingId
            }
          })
        )
      );

      return { success: true };
    }),

  // Create knockout draw
  createKnockoutDraw: protectedProcedure
    .input(z.object({
      fixtureId: z.string(),
      venueLevelMappingId: z.string(),
      sportId: z.string(),
      genderCategory: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Get fixture details
      const fixture = await ctx.db.fixture.findUnique({
        where: { id: input.fixtureId },
        include: {
          venueLevelMapping: {
            include: { venue: true }
          },
          sport: true
        }
      });

      if (!fixture) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Fixture not found' });
      }

      if (!fixture.venueLevelMapping) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Venue level mapping not found for fixture' });
      }

      // Get teams with tournament numbers
      const teams = await ctx.db.team.findMany({
        where: {
          sportId: input.sportId,
          genderCategory: input.genderCategory,
          tournamentNumberVenueMappingId: input.venueLevelMappingId,
          tournamentNumber: { not: null }
        },
        orderBy: { tournamentNumber: 'asc' }
      });

      if (teams.length < 2) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Need at least 2 teams with assigned numbers' });
      }

      // Generate bracket structure
      const bracket = generateKnockoutBracket(teams);

      // Create matches in transaction
      const result = await ctx.db.$transaction(async (tx) => {
        // Update fixture status
        await tx.fixture.update({
          where: { id: input.fixtureId },
          data: { status: 'in_progress' }
        });

        // Create FixtureTeam relationships for all participating teams
        await tx.fixtureTeam.createMany({
          data: teams.map(team => ({
            fixtureId: input.fixtureId,
            teamId: team.id,
            checkedIn: true,
            checkedInAt: new Date()
          })),
          skipDuplicates: true
        });

        // Create matches with proper dependencies
        const matchIdMap = new Map<string, string>();
        const matches = [];

        // First pass: create all matches
        for (let i = 0; i < bracket.matches.length; i++) {
          const bracketMatch = bracket.matches[i];
          const tempId = `temp_${i}`;
          
          // Validate gender category
          const validGenderCategories: GenderCategory[] = ['men', 'women', 'mixed'];

// In the match creation:
          const match = await tx.match.create({
            data: {
              fixtureId: input.fixtureId,
              eventId: fixture.eventId,
              sportId: input.sportId,
              venueLevelMappingId: input.venueLevelMappingId,
              genderCategory: validGenderCategories.includes(input.genderCategory as GenderCategory) 
                ? input.genderCategory as GenderCategory 
                : 'mixed',
              roundName: bracketMatch.roundName,
              matchNumber: i + 1,
              team1Id: bracketMatch.team1Id,
              team2Id: bracketMatch.team2Id,
              status: (bracketMatch.team1Id && bracketMatch.team2Id) ? 'ready' : 'scheduled'
            }
          });

          matchIdMap.set(tempId, match.id);
          matches.push(match);
        }

        // Second pass: update match dependencies
        for (let i = 0; i < bracket.matches.length; i++) {
          const bracketMatch = bracket.matches[i];
          const matchId = matchIdMap.get(`temp_${i}`);
          
          if (bracketMatch.nextMatchId && matchId) {
            const nextMatchIndex = bracket.matches.findIndex(m => m.matchId === bracketMatch.nextMatchId);
            if (nextMatchIndex !== -1) {
              const nextMatchId = matchIdMap.get(`temp_${nextMatchIndex}`);
              
              await tx.match.update({
                where: { id: matchId },
                data: {
                  nextMatchId: nextMatchId,
                  nextSlot: bracketMatch.nextSlot
                }
              });
            }
          }
        }

        return { matches };
      });

      return {
        success: true,
        totalMatches: result.matches.length,
        totalTeams: teams.length
      };
    }),

  // Get fixture details
  getFixtureDetails: protectedProcedure
    .input(z.object({
      fixtureId: z.string()
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const fixture = await ctx.db.fixture.findUnique({
        where: { id: input.fixtureId },
        include: {
          sport: true,
          venueLevelMapping: {
            include: { venue: true }
          },
          matches: {
            include: {
              team1: true,
              team2: true,
              winner: true
            },
            orderBy: { matchNumber: 'asc' }
          }
        }
      });

      if (!fixture) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Fixture not found' });
      }

      if (!fixture.venueLevelMapping) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Venue level mapping not found for fixture' });
      }

      return { fixture };
    }),

  // Get today's matches
  getTodayMatches: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      date: z.string()
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      // First check if this user has an assignment for this venue
      const volunteerAssignment = await ctx.db.volunteerAssignment.findFirst({
        where: {
          volunteerId: ctx.user.id,
          deletedAt: null,
          venueLevelMapping: {
            venueId: input.venueId
          }
        },
        include: {
          venueLevelMapping: {
            include: {
              venue: true
            }
          }
        }
      });

      if (!volunteerAssignment) {
        console.warn(`⚠️ Volunteer ${ctx.user.id} has no assignment for venueId: ${input.venueId}`);
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'You are not assigned to this venue' 
        });
      }

      if (!volunteerAssignment.venueLevelMapping) {
        console.error(`❌ Volunteer assignment ${volunteerAssignment.id} has no venueLevelMapping`);
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Invalid venue assignment - no venue level mapping found' 
        });
      }
      const startDate = new Date(input.date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      // Get venue level mappings
      const venueLevelMappings = await ctx.db.venueLevelMapping.findMany({
        where: { venueId: input.venueId, isActive: true }
      });

      if (!venueLevelMappings || venueLevelMappings.length === 0) {
        console.warn(`⚠️ No venue level mappings found for venueId: ${input.venueId}`);
        return [];
      }

      // Filter out any null/undefined mappings and extract IDs safely
      const validVenueLevelMappingIds = venueLevelMappings
        .filter(vlm => vlm && vlm.id)
        .map(vlm => vlm.id);

      if (validVenueLevelMappingIds.length === 0) {
        console.warn(`⚠️ No valid venue level mapping IDs found for venueId: ${input.venueId}`);
        return [];
      }

      return await ctx.db.match.findMany({
        where: {
          venueLevelMappingId: { in: validVenueLevelMappingIds },
          OR: [
            {
              scheduledTime: {
                gte: startDate,
                lt: endDate
              }
            },
            {
              actualStartTime: {
                gte: startDate,
                lt: endDate
              }
            }
          ]
        },
        include: {
          fixture: {
            select: { name: true }
          },
          team1: { select: { name: true } },
          team2: { select: { name: true } }
        },
        orderBy: { scheduledTime: 'asc' }
      });
    })
});

// Helper function for bracket generation
function generateKnockoutBracket(teams: any[]) {
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
        status: 'ready',
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
  const allRounds: any[][] = [];

  // Create preliminary round if necessary
  if (preliminaryMatchCount > 0) {
    const roundName = getRoundName(bracketSize);
    const preliminaryMatches: any[] = [];
    for (let i = 0; i < preliminaryMatchCount; i++) {
      preliminaryMatches.push({
        matchId: `match_${matchCounter++}`,
        team1Id: playingTeams[i * 2].id,
        team2Id: playingTeams[i * 2 + 1].id,
        winnerId: null,
        roundName: roundName,
        status: 'ready',
        nextMatchId: null,
        nextSlot: null,
      });
    }
    allRounds.push(preliminaryMatches);
  }

  // Create subsequent rounds
  let teamsForThisRound = bracketSize / 2;
  while (teamsForThisRound >= 2) {
    const roundName = getRoundName(teamsForThisRound);
    const matchesInThisRoundCount = teamsForThisRound / 2;
    const currentRoundMatches: any[] = [];
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

  // Populate second round with bye teams
  const secondRound = allRounds[preliminaryMatchCount > 0 ? 1 : 0];
  const round2Participants = [...byeTeams, ...Array(preliminaryMatchCount).fill(null)];

  for (let i = 0; i < secondRound.length; i++) {
    const team1 = round2Participants[i];
    const team2 = round2Participants[round2Participants.length - 1 - i];
    secondRound[i].team1Id = team1?.id || null;
    secondRound[i].team2Id = team2?.id || null;
    if (secondRound[i].team1Id && secondRound[i].team2Id) {
      secondRound[i].status = 'ready';
    }
  }

  // Link matches to their next match
  for (let roundIndex = 0; roundIndex < allRounds.length - 1; roundIndex++) {
    const currentRound = allRounds[roundIndex];
    const nextRound = allRounds[roundIndex + 1];
    
    for (let matchIndex = 0; matchIndex < currentRound.length; matchIndex++) {
      const nextMatch = nextRound[Math.floor(matchIndex / 2)];
      currentRound[matchIndex].nextMatchId = nextMatch.matchId;
      currentRound[matchIndex].nextSlot = (matchIndex % 2 === 0) ? 'team1Id' : 'team2Id';
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
