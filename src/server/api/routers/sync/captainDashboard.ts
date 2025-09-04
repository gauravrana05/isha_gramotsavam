import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const captainDashboardRouter = createTRPCRouter({
  sync: protectedProcedure
    .input(z.object({
      lastSyncTimestamp: z.date().optional()
    }))
    .query(async ({ ctx, input }) => {
      const { user, db } = ctx;
      
      if (user.role !== 'captain') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only captains can access this endpoint'
        });
      }

      try {
        // Get captain's team with players
        const team = await db.team.findFirst({
          where: { captainId: user.id },
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
        });

        // Get upcoming matches for the team
        const upcomingMatches = team ? await db.match.findMany({
          where: {
            OR: [
              { team1Id: team.id },
              { team2Id: team.id }
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
          team: team ? {
            id: team.id,
            name: team.name,
            status: team.status,
            sport: team.sport?.name,
            currentPlayers: team.currentPlayers,
            captainId: team.captainId,
            venueId: team.teamVenueAssignments[0]?.clusterVenueMapping?.venue?.id,
            venueName: team.teamVenueAssignments[0]?.clusterVenueMapping?.venue?.name,
            players: team.teamPlayers.map(tp => ({
              id: tp.id,
              userId: tp.userId,
              firstName: tp.firstName,
              lastName: tp.lastName,
              phone: tp.phone,
              position: tp.position,
              verificationStatus: tp.verificationStatus,
              profileImage: tp.user?.profileImages?.profilePhotoPath
            }))
          } : null,
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
            venueName: match.venue?.name
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
        console.error('Captain dashboard sync error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to sync captain dashboard data'
        });
      }
    })
});
