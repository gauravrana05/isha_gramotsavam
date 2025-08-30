import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { protectedProcedure, createTRPCRouter } from '../trpc';

export const playersRouter = createTRPCRouter({
  getMyDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // 1. Fetch all team memberships for the current user
    const teamPlayers = await db.teamPlayer.findMany({
      where: { userId: userId },
      include: {
        team: {
          include: {
            sport: true, // Include sport details
            captainUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            teamVenueAssignments: {
              orderBy: { assignedAt: 'desc' },
              take: 1,
              include: {
                clusterVenueMapping: {
                  include: {
                    venue: true,
                  },
                },
                divisionVenueMapping: {
                  include: {
                    venue: true,
                  },
                },
                finalVenueMapping: {
                  include: {
                    venue: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const teams = teamPlayers.map(tp => {
      const team = tp.team;
      const assignedVenue = team.teamVenueAssignments[0];

      // Aggregate venue info
      let venueInfo = null;
      if (assignedVenue) {
        const venueMapping = 
          assignedVenue.finalVenueMapping ||
          assignedVenue.divisionVenueMapping ||
          assignedVenue.clusterVenueMapping;
        
        if (venueMapping?.venue) {
          venueInfo = {
            venueId: venueMapping.venue.id,
            venueName: venueMapping.venue.name,
            assignmentLevel: assignedVenue.level,
          };
        }
      }

      return {
        teamId: team.id,
        name: team.name,
        sportName: team.sport.name,
        sportId: team.sportId,
        captainProfile: {
          name: team.captainUser.firstName + ' ' + team.captainUser.lastName,
          phone: team.captainUser.phone,
          userId: team.captainUser.id,
        },
        position: tp.position,
        status: team.status,
        verificationStatus: tp.verificationStatus,
        joinedAt: tp.createdAt,
        panchayat: team.panchayat,
        district: team.district,
        state: team.state,
        genderCategory: team.genderCategory,
        maxPlayers: team.sport.mainPlayersCount + team.sport.maxSubstitutes,
        currentPlayers: team.currentPlayers + team.currentSubstitutes,
        // Note: `players` array is not included here to keep payload small for dashboard
        assignedVenue: venueInfo,
        checkedIn: false, // This data is not directly in Prisma team model, might need separate query or logic
        checkedInAt: null, // Same as above
        checkedInVenue: null, // Same as above
        matchDayStatus: team.status, // Using team status as a proxy for now
      };
    });

    // 2. Fetch user's document completeness status
    const userProfileImages = await db.userProfileImage.findUnique({
      where: { userId: userId },
      select: {
        profilePhotoPath: true,
        aadhaarFrontPath: true,
        aadhaarBackPath: true,
      },
    });

    const documentsComplete = !!(
      userProfileImages?.profilePhotoPath &&
      userProfileImages?.aadhaarFrontPath &&
      userProfileImages?.aadhaarBackPath
    );

    // 3. Calculate player stats
    const verifiedTeams = teams.filter(t => t.verificationStatus === 'verified' || t.verificationStatus === 'approved').length;
    const pendingTeams = teams.filter(t => t.verificationStatus === 'pending').length;

    const stats = {
      totalTeams: teams.length,
      verifiedTeams,
      pendingTeams,
      documentsComplete,
    };

    return {
      teams,
      stats,
    };
  }),
});
