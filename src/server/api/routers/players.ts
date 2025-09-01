import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { db } from '@/lib/db';

export const playersRouter = createTRPCRouter({
  // Get player statistics
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== 'player') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only players can access player stats',
        });
      }

      const [teamMembership, matchesPlayed, totalTeams] = await Promise.all([
        // Current team membership
        db.teamMember.findFirst({
          where: { 
            playerId: ctx.user.id,
            status: 'active'
          },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                sport: {
                  select: { name: true }
                }
              }
            }
          }
        }),

        // Matches played (approximate based on team fixtures)
        db.fixture.count({
          where: {
            teams: {
              some: {
                teamMembers: {
                  some: {
                    playerId: ctx.user.id,
                    status: 'active'
                  }
                }
              }
            },
            status: 'completed'
          }
        }),

        // Total teams player has been part of
        db.teamMember.count({
          where: { 
            playerId: ctx.user.id 
          },
          distinct: ['teamId']
        })
      ]);

      return {
        currentTeam: teamMembership?.team || null,
        matchesPlayed,
        totalTeams,
        membershipStatus: teamMembership?.status || 'none',
        verificationStatus: teamMembership?.verificationStatus || 'pending'
      };
    }),

  // Get available teams for player to join
  getAvailableTeams: protectedProcedure
    .input(z.object({
      sportId: z.string().optional(),
      district: z.string().optional(),
      limit: z.number().min(1).max(50).default(20)
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'player') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only players can view available teams',
        });
      }

      // Check if player is already in a team
      const existingMembership = await db.teamMember.findFirst({
        where: { 
          playerId: ctx.user.id,
          status: 'active'
        }
      });

      if (existingMembership) {
        return {
          teams: [],
          message: 'You are already a member of a team'
        };
      }

      const where: any = {
        status: 'active',
        // Only show teams that are not full
        currentPlayers: {
          lt: db.team.fields.maxPlayers || 15
        }
      };

      if (input.sportId) {
        where.sportId = input.sportId;
      }

      if (input.district) {
        where.district = input.district;
      }

      const teams = await db.team.findMany({
        where,
        include: {
          sport: {
            select: {
              id: true,
              name: true
            }
          },
          captainUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              teamMembers: true
            }
          }
        },
        orderBy: [
          { district: 'asc' },
          { name: 'asc' }
        ],
        take: input.limit
      });

      return {
        teams: teams.map(team => ({
          id: team.id,
          name: team.name,
          sport: team.sport,
          captain: team.captainUser,
          district: team.district,
          state: team.state,
          currentPlayers: team._count.teamMembers,
          maxPlayers: 15, // Default max players
          description: team.description
        })),
        message: null
      };
    }),

  // Get player's match history
  getMatches: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      status: z.enum(['upcoming', 'completed', 'all']).default('all')
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'player') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only players can view their matches',
        });
      }

      const where: any = {
        teams: {
          some: {
            teamMembers: {
              some: {
                playerId: ctx.user.id,
                status: 'active'
              }
            }
          }
        }
      };

      if (input.status !== 'all') {
        where.status = input.status;
      }

      const matches = await db.fixture.findMany({
        where,
        include: {
          sport: {
            select: { name: true }
          },
          venue: {
            select: { name: true, location: true }
          },
          teams: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          scheduledTime: 'desc'
        },
        take: input.limit
      });

      return matches.map(match => ({
        id: match.id,
        sport: match.sport.name,
        venue: match.venue,
        teams: match.teams,
        scheduledTime: match.scheduledTime,
        status: match.status,
        result: match.result
      }));
    }),

  // Request to join a team
  requestToJoinTeam: protectedProcedure
    .input(z.object({
      teamId: z.string().uuid(),
      message: z.string().max(500).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'player') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only players can request to join teams',
        });
      }

      // Check if player is already in a team
      const existingMembership = await db.teamMember.findFirst({
        where: { 
          playerId: ctx.user.id,
          status: 'active'
        }
      });

      if (existingMembership) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You are already a member of a team',
        });
      }

      // Check if team exists and has space
      const team = await db.team.findUnique({
        where: { id: input.teamId },
        include: {
          _count: {
            select: { teamMembers: true }
          }
        }
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      if (team._count.teamMembers >= 15) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Team is full',
        });
      }

      // Create join request
      const joinRequest = await db.teamJoinRequest.create({
        data: {
          teamId: input.teamId,
          playerId: ctx.user.id,
          message: input.message,
          status: 'pending'
        }
      });

      // Notify team captain
      await db.notification.create({
        data: {
          userId: team.captainId,
          title: 'New Team Join Request',
          message: `${ctx.user.firstName} ${ctx.user.lastName} wants to join your team "${team.name}"`,
          type: 'team_join_request',
          relatedId: joinRequest.id
        }
      });

      return {
        success: true,
        message: 'Join request sent successfully'
      };
    }),

  // Get player's team join requests
  getJoinRequests: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== 'player') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only players can view their join requests',
        });
      }

      const requests = await db.teamJoinRequest.findMany({
        where: { playerId: ctx.user.id },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              sport: {
                select: { name: true }
              },
              captainUser: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return requests;
    })
});
