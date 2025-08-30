import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const volunteersDashboardRouter = createTRPCRouter({
  getDashboardStats: protectedProcedure
    .input(z.object({
      venueId: z.string().uuid()
    }))
    .query(async ({ ctx, input }) => {
      const { venueId } = input;
      const { db, session } = ctx;

      try {
        // Verify user is a volunteer assigned to this venue
        const volunteerAssignment = await db.volunteerAssignment.findFirst({
          where: {
            volunteerId: session.user.id,
            venueLocationMapping: {
              venue: {
                id: venueId
              }
            },
            deletedAt: null
          },
          include: {
            event: true,
            venueLocationMapping: {
              include: {
                venue: true
              }
            }
          }
        });

        if (!volunteerAssignment) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not assigned to this venue"
          });
        }

        // Get teams statistics for this venue
        const teamStats = await db.$transaction(async (tx) => {
          // Get all teams assigned to this venue
          const teams = await tx.team.findMany({
            where: {
              venueId: venueId,
              eventId: volunteerAssignment.eventId,
              deletedAt: null
            },
            select: {
              id: true,
              status: true,
              currentPlayers: true,
              verifiedPlayersCount: true
            }
          });

          return {
            totalTeams: teams.length,
            checkedInCount: teams.filter(t => t.status === 'checked_in').length,
            verifiedCount: teams.filter(t => t.status === 'verified').length,
            submittedCount: teams.filter(t => t.status === 'submitted').length,
            pendingCount: teams.filter(t => !t.status || t.status === 'pending').length,
            totalPlayers: teams.reduce((sum, team) => sum + (team.currentPlayers || 0), 0),
            verifiedPlayers: teams.reduce((sum, team) => sum + (team.verifiedPlayersCount || 0), 0)
          };
        });

        // Get fixtures statistics for this venue
        const fixtureStats = await db.fixture.aggregate({
          where: {
            venueId: venueId,
            eventId: volunteerAssignment.eventId,
            deletedAt: null
          },
          _count: {
            id: true
          }
        });

        const fixturesByStatus = await db.fixture.groupBy({
          by: ['status'],
          where: {
            venueId: venueId,
            eventId: volunteerAssignment.eventId,
            deletedAt: null
          },
          _count: {
            id: true
          }
        });

        const fixtureStatusCounts = fixturesByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {} as Record<string, number>);

        // Get matches statistics
        const matchStats = await db.match.aggregate({
          where: {
            fixture: {
              venueId: venueId,
              eventId: volunteerAssignment.eventId,
              deletedAt: null
            },
            deletedAt: null
          },
          _count: {
            id: true
          }
        });

        const matchesByStatus = await db.match.groupBy({
          by: ['status'],
          where: {
            fixture: {
              venueId: venueId,
              eventId: volunteerAssignment.eventId,
              deletedAt: null
            },
            deletedAt: null
          },
          _count: {
            id: true
          }
        });

        const matchStatusCounts = matchesByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {} as Record<string, number>);

        return {
          success: true,
          venue: {
            id: volunteerAssignment.venueLocationMapping.venue.id,
            name: volunteerAssignment.venueLocationMapping.venue.name,
            location: volunteerAssignment.venueLocationMapping.venue.address
          },
          event: {
            id: volunteerAssignment.event.id,
            name: volunteerAssignment.event.name
          },
          stats: {
            teams: teamStats,
            fixtures: {
              total: fixtureStats._count.id,
              byStatus: fixtureStatusCounts
            },
            matches: {
              total: matchStats._count.id,
              byStatus: matchStatusCounts
            }
          }
        };
      } catch (error) {
        console.error('Dashboard stats error:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch dashboard statistics"
        });
      }
    }),

  getQuickActions: protectedProcedure
    .input(z.object({
      venueId: z.string().uuid()
    }))
    .query(async ({ ctx, input }) => {
      const { venueId } = input;
      const { db, session } = ctx;

      try {
        // Verify user is a volunteer assigned to this venue
        const volunteerAssignment = await db.volunteerAssignment.findFirst({
          where: {
            volunteerId: session.user.id,
            venueLocationMapping: {
              venue: {
                id: venueId
              }
            },
            deletedAt: null
          },
          include: {
            event: true,
            venueLocationMapping: {
              include: {
                venue: true
              }
            }
          }
        });

        if (!volunteerAssignment) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not assigned to this venue"
          });
        }

        // Get available actions based on current venue state
        const [teamsCount, fixturesCount, pendingMatches] = await Promise.all([
          db.team.count({
            where: {
              venueId: venueId,
              eventId: volunteerAssignment.eventId,
              deletedAt: null
            }
          }),
          db.fixture.count({
            where: {
              venueId: venueId,
              eventId: volunteerAssignment.eventId,
              deletedAt: null
            }
          }),
          db.match.count({
            where: {
              fixture: {
                venueId: venueId,
                eventId: volunteerAssignment.eventId,
                deletedAt: null
              },
              status: {
                in: ['ready', 'in_progress']
              },
              deletedAt: null
            }
          })
        ]);

        return {
          success: true,
          actions: [
            {
              id: 'teams',
              title: 'Team Verification',
              description: 'Verify and check-in teams for tournaments',
              count: teamsCount,
              priority: 'high',
              enabled: true
            },
            {
              id: 'fixtures',
              title: 'Tournament Management',
              description: 'Create and manage tournament brackets',
              count: fixturesCount,
              priority: 'medium',
              enabled: teamsCount > 0
            },
            {
              id: 'matches',
              title: 'Match Management',
              description: 'Score matches and update results',
              count: pendingMatches,
              priority: pendingMatches > 0 ? 'high' : 'low',
              enabled: fixturesCount > 0
            },
            {
              id: 'media',
              title: 'Media Upload',
              description: 'Upload photos and videos',
              count: 0,
              priority: 'low',
              enabled: true
            }
          ]
        };
      } catch (error) {
        console.error('Quick actions error:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch quick actions"
        });
      }
    }),

  getRecentActivity: protectedProcedure
    .input(z.object({
      venueId: z.string().uuid(),
      limit: z.number().min(1).max(50).optional().default(10)
    }))
    .query(async ({ ctx, input }) => {
      const { venueId, limit } = input;
      const { db, session } = ctx;

      try {
        // Verify user is a volunteer assigned to this venue
        const volunteerAssignment = await db.volunteerAssignment.findFirst({
          where: {
            volunteerId: session.user.id,
            venueLocationMapping: {
              venue: {
                id: venueId
              }
            },
            deletedAt: null
          }
        });

        if (!volunteerAssignment) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not assigned to this venue"
          });
        }

        // Get recent audit logs for venue-related activities
        const recentActivities = await db.auditLog.findMany({
          where: {
            entityType: {
              in: ['team', 'fixture', 'match', 'player']
            },
            // Filter by venue-related entities (this would need to be enhanced based on your audit log structure)
            deletedAt: null
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        return {
          success: true,
          activities: recentActivities.map(activity => ({
            id: activity.id,
            action: activity.action,
            entityType: activity.entityType,
            entityId: activity.entityId,
            user: activity.user,
            timestamp: activity.createdAt,
            metadata: activity.metadata as any
          }))
        };
      } catch (error) {
        console.error('Recent activity error:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch recent activity"
        });
      }
    })
});