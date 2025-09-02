import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { TRPCError } from '@trpc/server';

export const captainMatchRouter = createTRPCRouter({
  // Submit match result - captains can only submit results for their team's matches
  submitMatchResult: protectedProcedure
    .input(z.object({
      matchId: z.string(),
      team1Score: z.number().min(0),
      team2Score: z.number().min(0),
      scoreDetails: z.string().optional(),
      winnerId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the match with team details
      const match = await ctx.db.match.findUnique({
        where: { id: input.matchId },
        include: {
          team1: { select: { id: true, captainId: true, name: true } },
          team2: { select: { id: true, captainId: true, name: true } },
          fixture: { select: { id: true, name: true } }
        }
      });

      if (!match) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Match not found' });
      }

      // Check if the current user is captain of one of the teams
      const isTeam1Captain = match.team1?.captainId === ctx.user.id;
      const isTeam2Captain = match.team2?.captainId === ctx.user.id;

      if (!isTeam1Captain && !isTeam2Captain) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'You can only submit results for matches involving your team' 
        });
      }

      // Verify the match is in progress
      if (match.status !== 'in_progress') {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Can only submit results for matches that are in progress' 
        });
      }

      // Verify the winner ID is valid
      if (input.winnerId !== match.team1Id && input.winnerId !== match.team2Id) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Winner must be one of the participating teams' 
        });
      }

      // Verify scores make sense (winner should have higher score)
      const winnerScore = input.winnerId === match.team1Id ? input.team1Score : input.team2Score;
      const loserScore = input.winnerId === match.team1Id ? input.team2Score : input.team1Score;

      if (winnerScore <= loserScore) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Winner score must be higher than loser score' 
        });
      }

      // Update the match
      const updatedMatch = await ctx.db.match.update({
        where: { id: input.matchId },
        data: {
          status: 'completed',
          team1Score: input.team1Score,
          team2Score: input.team2Score,
          winnerId: input.winnerId,
          scoreDetails: input.scoreDetails,
          completedAt: new Date(),
          resultSubmittedBy: ctx.user.id,
          resultSubmittedAt: new Date()
        }
      });

      // If there's a next match, advance the winner
      if (match.nextMatchId) {
        const nextMatchUpdateData: any = {};
        if (match.nextSlot === 'team1Id') {
          nextMatchUpdateData.team1Id = input.winnerId;
        } else if (match.nextSlot === 'team2Id') {
          nextMatchUpdateData.team2Id = input.winnerId;
        }

        if (Object.keys(nextMatchUpdateData).length > 0) {
          await ctx.db.match.update({
            where: { id: match.nextMatchId },
            data: nextMatchUpdateData
          });

          // Check if next match is now ready (both teams assigned)
          const nextMatch = await ctx.db.match.findUnique({
            where: { id: match.nextMatchId },
            select: { team1Id: true, team2Id: true, status: true }
          });

          if (nextMatch?.team1Id && nextMatch?.team2Id && nextMatch?.status === 'scheduled') {
            await ctx.db.match.update({
              where: { id: match.nextMatchId },
              data: { status: 'ready' }
            });
          }
        }
      }

      return {
        success: true,
        match: updatedMatch
      };
    }),

  // Update match status - captains can mark their matches as ready to start
  updateMatchStatus: protectedProcedure
    .input(z.object({
      matchId: z.string(),
      status: z.enum(['ready', 'in_progress'])
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the match with team details
      const match = await ctx.db.match.findUnique({
        where: { id: input.matchId },
        include: {
          team1: { select: { id: true, captainId: true, name: true } },
          team2: { select: { id: true, captainId: true, name: true } }
        }
      });

      if (!match) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Match not found' });
      }

      // Check if the current user is captain of one of the teams
      const isTeam1Captain = match.team1?.captainId === ctx.user.id;
      const isTeam2Captain = match.team2?.captainId === ctx.user.id;

      if (!isTeam1Captain && !isTeam2Captain) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'You can only update status for matches involving your team' 
        });
      }

      // Validate status transitions
      if (input.status === 'in_progress' && match.status !== 'ready') {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Can only start matches that are ready' 
        });
      }

      if (input.status === 'ready' && match.status !== 'scheduled') {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Can only mark scheduled matches as ready' 
        });
      }

      // Update the match
      const updateData: any = { status: input.status };
      
      if (input.status === 'in_progress') {
        updateData.actualStartTime = new Date();
      }

      const updatedMatch = await ctx.db.match.update({
        where: { id: input.matchId },
        data: updateData
      });

      return {
        success: true,
        match: updatedMatch
      };
    }),

  // Get captain's team matches for a specific fixture
  getTeamMatches: protectedProcedure
    .input(z.object({
      fixtureId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      // Get captain's teams
      const captainTeams = await ctx.db.team.findMany({
        where: { captainId: ctx.user.id },
        select: { id: true, name: true }
      });

      if (captainTeams.length === 0) {
        return [];
      }

      const teamIds = captainTeams.map(team => team.id);

      // Get matches for these teams in the specified fixture
      const matches = await ctx.db.match.findMany({
        where: {
          fixtureId: input.fixtureId,
          OR: [
            { team1Id: { in: teamIds } },
            { team2Id: { in: teamIds } }
          ]
        },
        include: {
          team1: { select: { id: true, name: true, tournamentNumber: true } },
          team2: { select: { id: true, name: true, tournamentNumber: true } },
          winner: { select: { id: true, name: true } }
        },
        orderBy: { matchNumber: 'asc' }
      });

      return matches;
    })
});