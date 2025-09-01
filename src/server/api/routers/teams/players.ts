import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, protectedProcedure } from '../../trpc'
import {
  addTeamPlayerSchema,
  removeTeamPlayerSchema,
  getTeamPlayersSchema,
} from '@/lib/validations/team'

export const teamsPlayersRouter = createTRPCRouter({
  // Get team players
  getPlayers: protectedProcedure
    .input(getTeamPlayersSchema)
    .query(async ({ input }) => {
      const { teamId, position } = input

      const where: any = { teamId }
      if (position) {
        where.position = position
      }

      const players = await db.teamPlayer.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              age: true,
              gender: true,
              district: true,
              taluk: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      })

      return players
    }),

  // Add player to team
  addPlayer: protectedProcedure
    .input(addTeamPlayerSchema)
    .mutation(async ({ input, ctx }) => {
      const { teamId, position, firstName, lastName, phone, dateOfBirth, age, gender, panchayat, taluk, district, state, pincode, verificationStatus } = input

      // Check if user is captain of this team
      const team = await db.team.findUnique({
        where: { id: teamId },
        select: { captainId: true },
      })

      if (!team || team.captainId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only add players to your own team',
        })
      }

      // Check if player is already in the team
      // Check if player with same phone already exists in team
      const existingPlayer = await db.teamPlayer.findFirst({
        where: {
          teamId,
          phone,
        },
      })

      if (existingPlayer) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Player is already in this team',
        })
      }

      // Create user first
      const user = await db.user.create({
        data: {
          firstName,
          lastName,
          phone,
          dateOfBirth,
          age,
          gender,
          panchayat,
          taluk,
          district,
          state,
          pincode,
        },
      })

      const teamPlayer = await db.teamPlayer.create({
        data: {
          teamId,
          userId: user.id,
          position,
          firstName,
          lastName,
          phone,
          dateOfBirth,
          age,
          gender,
          panchayat,
          taluk,
          district,
          state,
          pincode,
          addedBy: 'captain',
          verificationStatus: verificationStatus || 'pending',
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              age: true,
              gender: true,
            },
          },
        },
      })

      return teamPlayer
    }),

  // Remove player from team
  removePlayer: protectedProcedure
    .input(removeTeamPlayerSchema)
    .mutation(async ({ input, ctx }) => {
      const { teamId, userId } = input

      // Check if user is captain of this team
      const team = await db.team.findUnique({
        where: { id: teamId },
        select: { captainId: true },
      })

      if (!team || team.captainId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only remove players from your own team',
        })
      }

      // Use transaction for atomic operations
      await db.$transaction(async (tx) => {
        await tx.teamPlayer.delete({
          where: {
            teamId_userId: {
              teamId,
              userId,
            },
          },
        });

        // Update user's current team if this was their active team
        await tx.user.updateMany({
          where: { 
            id: userId,
            currentTeamId: teamId
          },
          data: { currentTeamId: null }
        });
      });

      return { success: true }
    }),

  // Make player captain
  makeCaptain: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { teamId, userId } = input

      // Check if current user is captain of this team
      const team = await db.team.findUnique({
        where: { id: teamId },
        select: { captainId: true },
      })

      if (!team || team.captainId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only transfer captaincy of your own team',
        })
      }

      // Check if the new captain is a player in this team
      const player = await db.teamPlayer.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId,
          },
        },
      })

      if (!player) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Player not found in this team',
        })
      }

      const result = await db.$transaction(async (tx) => {
        // Update team captain
        await tx.team.update({
          where: { id: teamId },
          data: { captainId: userId },
        })

        // Update new captain's role
        await tx.user.update({
          where: { id: userId },
          data: { role: 'captain' },
        })

        // Update old captain's role to player (if they're still in the team)
        const oldCaptainInTeam = await tx.teamPlayer.findUnique({
          where: {
            teamId_userId: {
              teamId,
              userId: ctx.user.id,
            },
          },
        })

        if (oldCaptainInTeam) {
          await tx.user.update({
            where: { id: ctx.user.id },
            data: { role: 'player' },
          })
        }

        return { success: true }
      })

      return result
    }),

  // Get player team by ID
  getPlayerTeamById: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      userId: z.string(),
    }).optional().default({}))
    .query(async ({ input }) => {
      const { teamId, userId } = input

      const teamPlayer = await db.teamPlayer.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              age: true,
              gender: true,
            },
          },
          team: {
            include: {
              sport: true,
              captainUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
        },
      })

      if (!teamPlayer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Player not found in this team',
        })
      }

      return teamPlayer
    }),

  // Add missing methods
  getTeamPlayers: protectedProcedure
    .input(z.object({
      teamId: z.string(),
    }).optional().default({}))
    .query(async ({ input, ctx }) => {
      return await db.teamPlayer.findMany({
        where: {
          teamId: input.teamId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              age: true,
              gender: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
              captainId: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    }),

  getPlayerTeams: protectedProcedure
    .query(async ({ ctx }) => {
      return await db.teamPlayer.findMany({
        where: {
          userId: ctx.user.id,
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              sport: {
                select: {
                  id: true,
                  name: true,
                },
              },
              event: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
              captainUser: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }),
});
