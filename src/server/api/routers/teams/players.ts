import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, protectedProcedure } from '../../trpc'
import { canModifyTeam } from '@/lib/utils/teamStatus'
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

      return await db.$transaction(async (tx) => {
        // Check if user is captain of this team
        const team = await tx.team.findUnique({
          where: { id: teamId },
          include: {
            sport: true,
            captainUser: {
              select: { panchayat: true, taluk: true, district: true },
            },
            teamPlayers: true,
          },
        })

        if (!team || team.captainId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only add players to your own team',
          })
        }

        // Check if team is still in draft status
        if (team.status !== 'draft') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot modify players after team submission',
          })
        }

        // Check if player with same phone already exists in team
        const existingPlayer = await tx.teamPlayer.findFirst({
          where: { teamId, phone },
        })

        if (existingPlayer) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Player is already in this team',
          })
        }

        // Check if player is already in another team for the same sport
        const existingTeamPlayer = await tx.teamPlayer.findFirst({
          where: {
            phone,
            team: {
              sportId: team.sportId,
              status: { in: ['draft', 'submitted', 'verified', 'checked_in'] },
            },
          },
          include: { team: true },
        })

        if (existingTeamPlayer) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Player is already registered in team "${existingTeamPlayer.team.name}" for this sport`,
          })
        }

        // Validate team composition limits
        const currentMainPlayers = team.teamPlayers.filter(p => p.position === 'main').length
        const currentSubPlayers = team.teamPlayers.filter(p => p.position === 'substitute').length
        
        if (position === 'main' && currentMainPlayers >= team.sport.mainPlayersCount) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Maximum ${team.sport.mainPlayersCount} main players allowed`,
          })
        }
        
        if (position === 'substitute' && currentSubPlayers >= team.sport.maxSubstitutes) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Maximum ${team.sport.maxSubstitutes} substitute players allowed`,
          })
        }

        // Note: Age validation would need to be implemented at application level
        // as Sport model doesn't have age restrictions in the schema

        // Validate geographic restrictions (same panchayat requirement)
        if (team.captainUser.panchayat && panchayat !== team.captainUser.panchayat) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'All players must be from the same panchayat as the captain',
          })
        }

        // Check if user already exists
        let user = await tx.user.findUnique({
          where: { phone },
        })

        // If user doesn't exist, create new user
        if (!user) {
          user = await tx.user.create({
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
        }

        const teamPlayer = await tx.teamPlayer.create({
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
      })
    }),

  // Update player in team
  updatePlayer: protectedProcedure
    .input(z.object({
      playerId: z.string(),
      position: z.enum(['main', 'substitute']),
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      phone: z.string(),
      dateOfBirth: z.date(),
      age: z.number(),
      gender: z.enum(['M', 'F']),
      panchayat: z.string(),
      taluk: z.string(),
      district: z.string(),
      state: z.string(),
      pincode: z.string(),
      verificationStatus: z.enum(['pending', 'verified', 'rejected']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { playerId, ...updateData } = input

      // Check if user is captain of the team this player belongs to
      const teamPlayer = await db.teamPlayer.findUnique({
        where: { id: playerId },
        include: { team: true }
      })

      if (!teamPlayer || teamPlayer.team.captainId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update players in your own team',
        })
      }

      // Update both TeamPlayer and User records
      const updatedPlayer = await db.$transaction(async (tx) => {
        // Update TeamPlayer record
        const updatedTeamPlayer = await tx.teamPlayer.update({
          where: { id: playerId },
          data: updateData,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                profileImages: true,
              },
            },
          },
        })

        // Update User record
        await tx.user.update({
          where: { id: updatedTeamPlayer.userId },
          data: {
            firstName: updateData.firstName,
            lastName: updateData.lastName,
            phone: updateData.phone,
            dateOfBirth: updateData.dateOfBirth,
            age: updateData.age,
            gender: updateData.gender,
            panchayat: updateData.panchayat,
            taluk: updateData.taluk,
            district: updateData.district,
            state: updateData.state,
            pincode: updateData.pincode,
          }
        })

        return updatedTeamPlayer
      })

      return updatedPlayer
    }),

  // Remove player from team
  removePlayer: protectedProcedure
    .input(z.object({
      playerId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { playerId } = input

      // Get player and team info
      const teamPlayer = await db.teamPlayer.findUnique({
        where: { id: playerId },
        include: { team: true }
      })

      if (!teamPlayer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Player not found',
        })
      }

      // Check if user is captain of this team
      if (teamPlayer.team.captainId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only remove players from your own team',
        })
      }

      // Check if team can be modified based on current status
      if (!canModifyTeam(teamPlayer.team.status as any)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot remove players after team submission',
        })
      }

      // Use transaction for atomic operations
      await db.$transaction(async (tx) => {
        await tx.teamPlayer.delete({
          where: { id: playerId },
        });

        // Update user's current team if this was their active team
        await tx.user.updateMany({
          where: { 
            id: teamPlayer.userId,
            currentTeamId: teamPlayer.teamId
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
