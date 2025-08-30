import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { assignVenueToTeam } from "@/lib/services/venueAssignment";

export const adminTeamsRouter = createTRPCRouter({
  // Get Admin Teams with enhanced filtering
  getAdminTeams: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
      status: z.enum(['all', 'draft', 'pending', 'verified', 'rejected']).default('all'),
      sport: z.string().optional(),
      venue: z.string().optional(),
      district: z.string().optional(),
      searchQuery: z.string().optional(),
      sortBy: z.enum(['teamName', 'createdAt', 'status', 'sport']).default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      includePlayerCount: z.boolean().default(true),
      includeVenueInfo: z.boolean().default(true),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {};
      
      if (input.status !== 'all') {
        where.status = input.status;
      }
      
      if (input.sport) {
        where.sport = { name: { contains: input.sport, mode: 'insensitive' } };
      }
      
      if (input.venue) {
        where.venue = { name: { contains: input.venue, mode: 'insensitive' } };
      }
      
      if (input.district) {
        where.captain = { district: { contains: input.district, mode: 'insensitive' } };
      }
      
      if (input.searchQuery) {
        where.OR = [
          { teamName: { contains: input.searchQuery, mode: 'insensitive' } },
          { captain: { firstName: { contains: input.searchQuery, mode: 'insensitive' } } },
          { captain: { lastName: { contains: input.searchQuery, mode: 'insensitive' } } },
        ];
      }

      const [teams, totalCount] = await Promise.all([
        db.team.findMany({
          where,
          include: {
            captain: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                district: true,
                isVerified: true,
              }
            },
            sport: {
              select: {
                id: true,
                name: true,
                category: true,
              }
            },
            venue: input.includeVenueInfo ? {
              select: {
                id: true,
                name: true,
                level: true,
                district: true,
                taluk: true,
              }
            } : false,
            _count: input.includePlayerCount ? {
              select: {
                players: true,
              }
            } : false,
          },
          orderBy: {
            [input.sortBy]: input.sortOrder,
          },
          skip: input.offset,
          take: input.limit,
        }),
        db.team.count({ where }),
      ]);

      return {
        teams,
        totalCount,
        hasMore: input.offset + input.limit < totalCount,
      };
    }),

  // Get Admin Team Stats
  getAdminTeamStats: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const [
        totalTeams,
        verifiedTeams,
        pendingTeams,
        rejectedTeams,
        draftTeams,
        teamsWithVenues,
        totalPlayers,
        verifiedPlayers,
        pendingPlayers,
        rejectedPlayers,
      ] = await Promise.all([
        db.team.count(),
        db.team.count({ where: { status: 'verified' } }),
        db.team.count({ where: { status: 'pending' } }),
        db.team.count({ where: { status: 'rejected' } }),
        db.team.count({ where: { status: 'draft' } }),
        db.team.count({ where: { venueId: { not: null } } }),
        db.teamPlayer.count(),
        db.teamPlayer.count({ where: { verificationStatus: 'verified' } }),
        db.teamPlayer.count({ where: { verificationStatus: 'pending' } }),
        db.teamPlayer.count({ where: { verificationStatus: 'rejected' } }),
      ]);

      return {
        teams: {
          total: totalTeams,
          verified: verifiedTeams,
          pending: pendingTeams,
          rejected: rejectedTeams,
          draft: draftTeams,
          withVenues: teamsWithVenues,
          withoutVenues: totalTeams - teamsWithVenues,
        },
        players: {
          total: totalPlayers,
          verified: verifiedPlayers,
          pending: pendingPlayers,
          rejected: rejectedPlayers,
        },
      };
    }),

  // Create Team
  createTeam: protectedProcedure
    .input(z.object({
      teamName: z.string().min(1),
      captainId: z.string(),
      sportId: z.string(),
      venueId: z.string().optional(),
      status: z.enum(['draft', 'pending', 'verified']).default('draft'),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const team = await db.team.create({
        data: {
          teamName: input.teamName,
          captainId: input.captainId,
          sportId: input.sportId,
          venueId: input.venueId,
          status: input.status,
        },
        include: {
          captain: true,
          sport: true,
          venue: true,
        },
      });

      return team;
    }),

  // Delete Team
  deleteTeam: protectedProcedure
    .input(z.object({
      teamId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      await db.team.delete({
        where: { id: input.teamId },
      });

      return { success: true };
    }),

  // Get Team By ID
  getTeamById: protectedProcedure
    .input(z.object({
      teamId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const team = await db.team.findUnique({
        where: { id: input.teamId },
        include: {
          captain: true,
          sport: true,
          venue: true,
          players: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      return team;
    }),

  // Add Player to Team
  addPlayerToTeam: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      userId: z.string(),
      position: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const player = await db.teamPlayer.create({
        data: {
          teamId: input.teamId,
          userId: input.userId,
          position: input.position,
          verificationStatus: 'verified',
        },
        include: {
          user: true,
          team: true,
        },
      });

      return player;
    }),

  // Remove Player from Team
  removePlayerFromTeam: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      await db.teamPlayer.delete({
        where: {
          teamId_userId: {
            teamId: input.teamId,
            userId: input.userId,
          },
        },
      });

      return { success: true };
    }),

  // Update Player Position
  updatePlayerPosition: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      userId: z.string(),
      position: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const player = await db.teamPlayer.update({
        where: {
          teamId_userId: {
            teamId: input.teamId,
            userId: input.userId,
          },
        },
        data: {
          position: input.position,
        },
        include: {
          user: true,
          team: true,
        },
      });

      return player;
    }),
});
