import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

const playerSchema = z.object({
  userId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  whatsappNumber: z.string().optional(),
  dateOfBirth: z.string(),
  age: z.number(),
  gender: z.enum(['M', 'F', 'O']),
  panchayat: z.string(),
  taluk: z.string(),
  district: z.string(),
  position: z.enum(['captain', 'player']).default('player')
});

export const teamBatchOperationsRouter = createTRPCRouter({
  batchAddPlayers: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      players: z.array(playerSchema)
    }))
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;

      if (user.role !== 'captain') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only captains can add players'
        });
      }

      try {
        // Verify team ownership
        const team = await db.team.findFirst({
          where: { 
            id: input.teamId,
            captainId: user.id 
          }
        });

        if (!team) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found or not owned by user'
          });
        }

        // Check team capacity
        if (team.currentPlayers + input.players.length > 15) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Adding these players would exceed team capacity (15 players max)'
          });
        }

        // Check for duplicate players
        const existingPlayers = await db.teamPlayer.findMany({
          where: {
            teamId: input.teamId,
            userId: { in: input.players.map(p => p.userId) }
          }
        });

        if (existingPlayers.length > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Some players are already in the team'
          });
        }

        // Add players in batch
        const addedPlayers = await db.teamPlayer.createMany({
          data: input.players.map(player => ({
            teamId: input.teamId,
            userId: player.userId,
            position: player.position,
            firstName: player.firstName,
            lastName: player.lastName,
            phone: player.phone,
            whatsappNumber: player.whatsappNumber,
            dateOfBirth: new Date(player.dateOfBirth),
            age: player.age,
            gender: player.gender,
            panchayat: player.panchayat,
            taluk: player.taluk,
            district: player.district,
            addedBy: user.id
          }))
        });

        // Update team player count
        await db.team.update({
          where: { id: input.teamId },
          data: { currentPlayers: { increment: input.players.length } }
        });

        return {
          success: true,
          addedCount: addedPlayers.count,
          teamId: input.teamId
        };
      } catch (error) {
        console.error('Batch add players error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add players'
        });
      }
    }),

  batchRemovePlayers: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      playerIds: z.array(z.string())
    }))
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;

      if (user.role !== 'captain') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only captains can remove players'
        });
      }

      try {
        // Verify team ownership and get players
        const teamPlayers = await db.teamPlayer.findMany({
          where: { 
            id: { in: input.playerIds },
            team: { captainId: user.id }
          }
        });

        if (teamPlayers.length !== input.playerIds.length) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Some players not found or not in your team'
          });
        }

        // Check if trying to remove captain
        const captainPlayer = teamPlayers.find(p => p.position === 'captain');
        if (captainPlayer) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot remove team captain'
          });
        }

        // Remove players in batch
        const removedPlayers = await db.teamPlayer.deleteMany({
          where: {
            id: { in: input.playerIds },
            teamId: input.teamId
          }
        });

        // Update team player count
        await db.team.update({
          where: { id: input.teamId },
          data: { currentPlayers: { decrement: removedPlayers.count } }
        });

        return {
          success: true,
          removedCount: removedPlayers.count,
          teamId: input.teamId
        };
      } catch (error) {
        console.error('Batch remove players error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove players'
        });
      }
    }),

  batchUpdatePlayerStatus: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      updates: z.array(z.object({
        playerId: z.string(),
        verificationStatus: z.enum(['pending', 'verified', 'rejected'])
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;

      if (user.role !== 'captain') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only captains can update player status'
        });
      }

      try {
        // Verify team ownership
        const team = await db.team.findFirst({
          where: { 
            id: input.teamId,
            captainId: user.id 
          }
        });

        if (!team) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found or not owned by user'
          });
        }

        // Update players in batch
        const updatePromises = input.updates.map(update =>
          db.teamPlayer.update({
            where: {
              id: update.playerId,
              teamId: input.teamId
            },
            data: {
              verificationStatus: update.verificationStatus
            }
          })
        );

        await Promise.all(updatePromises);

        return {
          success: true,
          updatedCount: input.updates.length,
          teamId: input.teamId
        };
      } catch (error) {
        console.error('Batch update player status error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update player status'
        });
      }
    })
});
