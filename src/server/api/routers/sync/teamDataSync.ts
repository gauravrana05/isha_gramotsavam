import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const teamDataSyncRouter = createTRPCRouter({
  sync: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      lastSyncTimestamp: z.date().optional()
    }))
    .query(async ({ ctx, input }) => {
      const { user, db } = ctx;

      try {
        // Verify user has access to this team
        const hasAccess = await db.team.findFirst({
          where: {
            id: input.teamId,
            OR: [
              { captainId: user.id },
              { teamPlayers: { some: { userId: user.id } } }
            ]
          }
        });

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this team'
          });
        }

        // Get complete team data
        const team = await db.team.findUnique({
          where: { id: input.teamId },
          include: {
            sport: { select: { id: true, name: true } },
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
              },
              ...(input.lastSyncTimestamp && {
                where: {
                  updatedAt: { gte: input.lastSyncTimestamp }
                }
              })
            },
            teamVenueAssignments: {
              include: {
                clusterVenueMapping: {
                  include: {
                    venue: { select: { id: true, name: true, location: true } }
                  }
                }
              }
            }
          }
        });

        if (!team) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found'
          });
        }

        return {
          team: {
            id: team.id,
            name: team.name,
            description: team.description,
            status: team.status,
            sport: team.sport,
            captainId: team.captainId,
            captainName: team.captainName,
            currentPlayers: team.currentPlayers,
            genderCategory: team.genderCategory,
            panchayat: team.panchayat,
            taluk: team.taluk,
            district: team.district,
            state: team.state,
            venueAssignment: team.teamVenueAssignments[0] ? {
              venueId: team.teamVenueAssignments[0].clusterVenueMapping.venue.id,
              venueName: team.teamVenueAssignments[0].clusterVenueMapping.venue.name,
              venueLocation: team.teamVenueAssignments[0].clusterVenueMapping.venue.location
            } : null,
            updatedAt: team.updatedAt
          },
          players: team.teamPlayers.map(tp => ({
            id: tp.id,
            teamId: tp.teamId,
            userId: tp.userId,
            position: tp.position,
            verificationStatus: tp.verificationStatus,
            firstName: tp.firstName,
            lastName: tp.lastName,
            phone: tp.phone,
            whatsappNumber: tp.whatsappNumber,
            dateOfBirth: tp.dateOfBirth,
            age: tp.age,
            gender: tp.gender,
            panchayat: tp.panchayat,
            taluk: tp.taluk,
            district: tp.district,
            addedBy: tp.addedBy,
            profileImage: tp.user?.profileImages?.profilePhotoPath,
            createdAt: tp.createdAt,
            updatedAt: tp.updatedAt
          })),
          syncTimestamp: new Date()
        };
      } catch (error) {
        console.error('Team data sync error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to sync team data'
        });
      }
    })
});
