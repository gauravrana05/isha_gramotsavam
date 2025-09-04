import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const playerDashboardRouter = createTRPCRouter({
  sync: protectedProcedure
    .input(z.object({
      lastSyncTimestamp: z.date().optional()
    }))
    .query(async ({ ctx, input }) => {
      const { user, db } = ctx;
      
      if (user.role !== 'player') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only players can access this endpoint'
        });
      }

      try {
        // Get player's team memberships
        const teamPlayers = await db.teamPlayer.findMany({
          where: { userId: user.id },
          include: {
            team: {
              include: {
                sport: { select: { name: true } },
                teamPlayers: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        profileImages: {
                          select: { profilePhotoPath: true }
                        }
                      }
                    }
                  }
                },
                teamVenueAssignments: {
                  include: {
                    clusterVenueMapping: {
                      include: {
                        venue: { select: { id: true, name: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        });

        const teamIds = teamPlayers.map(tp => tp.teamId);

        // Get upcoming matches for player's teams
        const upcomingMatches = teamIds.length > 0 ? await db.match.findMany({
          where: {
            OR: [
              { team1Id: { in: teamIds } },
              { team2Id: { in: teamIds } }
            ],
            status: { in: ['scheduled', 'live'] }
          },
          include: {
            team1: { select: { id: true, name: true } },
            team2: { select: { id: true, name: true } },
            venue: { select: { id: true, name: true } }
          },
          orderBy: { scheduledTime: 'asc' },
          take: 10
        }) : [];

        // Get recent notifications
        const notifications = await db.notification.findMany({
          where: {
            userId: user.id,
            ...(input.lastSyncTimestamp && {
              createdAt: { gte: input.lastSyncTimestamp }
            })
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        });

        return {
          teams: teamPlayers.map(tp => ({
            id: tp.team.id,
            name: tp.team.name,
            status: tp.team.status,
            sport: tp.team.sport?.name,
            captainId: tp.team.captainId,
            currentPlayers: tp.team.currentPlayers,
            venueId: tp.team.teamVenueAssignments[0]?.clusterVenueMapping?.venue?.id,
            venueName: tp.team.teamVenueAssignments[0]?.clusterVenueMapping?.venue?.name,
            myPosition: tp.position,
            myVerificationStatus: tp.verificationStatus,
            players: tp.team.teamPlayers.map(player => ({
              id: player.id,
              userId: player.userId,
              firstName: player.firstName,
              lastName: player.lastName,
              position: player.position,
              verificationStatus: player.verificationStatus,
              profileImage: player.user?.profileImages?.profilePhotoPath
            }))
          })),
          upcomingMatches: upcomingMatches.map(match => ({
            id: match.id,
            team1Id: match.team1Id,
            team2Id: match.team2Id,
            team1Name: match.team1?.name,
            team2Name: match.team2?.name,
            team1Score: match.team1Score,
            team2Score: match.team2Score,
            scheduledTime: match.scheduledTime,
            status: match.status,
            venueId: match.venueId,
            venueName: match.venue?.name,
            isMyTeam: teamIds.includes(match.team1Id) || teamIds.includes(match.team2Id)
          })),
          notifications: notifications.map(notif => ({
            id: notif.id,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            read: notif.read,
            createdAt: notif.createdAt,
            actionUrl: notif.actionUrl
          })),
          syncTimestamp: new Date()
        };
      } catch (error) {
        console.error('Player dashboard sync error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to sync player dashboard data'
        });
      }
    })
});
