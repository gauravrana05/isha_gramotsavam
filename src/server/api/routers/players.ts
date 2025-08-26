import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { protectedProcedure, createTRPCRouter } from '../trpc';

export const playersRouter = createTRPCRouter({
  getMyDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // 1. Fetch all team memberships for the current user
    const teamPlayers = await db.team_players.findMany({
      where: { user_id: userId },
      include: {
        teams: {
          include: {
            sports: true, // Include sport details
            users_teams_captain_idTousers: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                phone: true,
              },
            },
            team_venue_assignments: {
              orderBy: { assigned_at: 'desc' },
              take: 1,
              include: {
                venue_location_mappings_team_venue_assignments_cluster_venue_mapping_idTovenue_location_mappings: {
                  include: {
                    venues: true,
                  },
                },
                venue_location_mappings_team_venue_assignments_division_venue_mapping_idTovenue_location_mappings: {
                  include: {
                    venues: true,
                  },
                },
                venue_location_mappings_team_venue_assignments_final_venue_mapping_idTovenue_location_mappings: {
                  include: {
                    venues: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const teams = teamPlayers.map(tp => {
      const team = tp.teams;
      const assignedVenue = team.team_venue_assignments[0];

      // Aggregate venue info
      let venueInfo = null;
      if (assignedVenue) {
        const venueMapping = 
          assignedVenue.venue_location_mappings_team_venue_assignments_final_venue_mapping_idTovenue_location_mappings ||
          assignedVenue.venue_location_mappings_team_venue_assignments_division_venue_mapping_idTovenue_location_mappings ||
          assignedVenue.venue_location_mappings_team_venue_assignments_cluster_venue_mapping_idTovenue_location_mappings;
        
        if (venueMapping?.venues) {
          venueInfo = {
            venueId: venueMapping.venues.id,
            venueName: venueMapping.venues.name,
            assignmentLevel: assignedVenue.level,
          };
        }
      }

      return {
        teamId: team.id,
        name: team.name,
        sportName: team.sports.name,
        sportId: team.sport_id,
        captainProfile: {
          name: team.users_teams_captain_idTousers.first_name + ' ' + team.users_teams_captain_idTousers.last_name,
          phone: team.users_teams_captain_idTousers.phone,
          userId: team.users_teams_captain_idTousers.id,
        },
        position: tp.position,
        status: team.status,
        verificationStatus: tp.verification_status,
        joinedAt: tp.created_at,
        panchayat: team.panchayat,
        district: team.district,
        state: team.state,
        genderCategory: team.gender_category,
        maxPlayers: team.sports.main_players_count + team.sports.max_substitutes,
        currentPlayers: team.current_players + team.current_substitutes,
        // Note: `players` array is not included here to keep payload small for dashboard
        assignedVenue: venueInfo,
        checkedIn: false, // This data is not directly in Prisma team model, might need separate query or logic
        checkedInAt: null, // Same as above
        checkedInVenue: null, // Same as above
        matchDayStatus: team.status, // Using team status as a proxy for now
      };
    });

    // 2. Fetch user's document completeness status
    const userProfileImages = await db.user_profile_images.findUnique({
      where: { user_id: userId },
      select: {
        profile_photo_path: true,
        aadhaar_front_path: true,
        aadhaar_back_path: true,
      },
    });

    const documentsComplete = !!(
      userProfileImages?.profile_photo_path &&
      userProfileImages?.aadhaar_front_path &&
      userProfileImages?.aadhaar_back_path
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
