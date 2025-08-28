import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const volunteersRouter = createTRPCRouter({
  // Get volunteer assignments for dashboard
  getMyAssignments: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Check if user has volunteer role
      if (!ctx.user || !['general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to access volunteer functionality',
        });
      }

      const assignments = await db.volunteer_assignments.findMany({
        where: { volunteer_id: ctx.user.id },
        include: {
          events: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          venue_location_mappings: {
            include: {
              venues: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  district: true,
                  state: true,
                  venue_type: true,
                  venue_sports: {
                    include: {
                      sports: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          users: {
            select: {
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      // Transform data to match frontend expectations
      const transformedAssignments = assignments.map(assignment => ({
        id: assignment.venue_location_mapping_id,
        assignmentId: assignment.id,
        volunteerId: assignment.volunteer_id,
        volunteerName: `${assignment.users.firstName} ${assignment.users.lastName}`,
        volunteerType: assignment.users.role,
        venueId: assignment.venue_location_mappings?.venues?.id,
        venueName: assignment.venue_location_mappings?.venues?.name || 'Unknown Venue',
        venueAddress: assignment.venue_location_mappings?.venues?.address || '',
        venueDistrict: assignment.venue_location_mappings?.venues?.district || '',
        venueType: assignment.venue_location_mappings?.venues?.venue_type || 'standard',
        supportedSports: assignment.venue_location_mappings?.venues?.venue_sports?.map(vs => vs.sports.name) || [],
        status: 'assigned', // Default status
        assignedAt: assignment.assigned_at?.toISOString() || null,
      }));

      return {
        success: true,
        assignments: transformedAssignments,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch volunteer assignments',
      });
    }
  }),

  // Get venue teams for match day verification
  getVenueTeams: protectedProcedure
    .input(z.object({
      venueId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Check if user has volunteer role
        if (!ctx.user || !['general_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to access volunteer functionality',
          });
        }

        // Get venue location mapping for this venue
        const venueLocationMapping = await db.venue_location_mappings.findFirst({
          where: { venue_id: input.venueId },
        });

        if (!venueLocationMapping) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Venue location mapping not found',
          });
        }

        // Get teams assigned to this venue
        const teams = await db.teams.findMany({
          where: {
            teamVenueAssignments: {
              some: {
                OR: [
                  { cluster_venue_mapping_id: venueLocationMapping.id },
                  { division_venue_mapping_id: venueLocationMapping.id },
                  { final_venue_mapping_id: venueLocationMapping.id },
                ],
              },
            },
          },
          include: {
            sports: {
              select: {
                id: true,
                name: true,
                mainPlayersCount: true,
                maxSubstitutes: true,
              },
            },
            captainUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            teamPlayers: {
              select: {
                id: true,
                verificationStatus: true,
              },
            },
            team_photos: {
              select: {
                photoPath: true,
              },
            },
          },
        });

        // Transform teams for frontend
        const transformedTeams = teams.map(team => ({
          id: team.id,
          name: team.name,
          sportName: team.sports?.name || 'Unknown',
          captainProfile: {
            name: `${team.captainUser?.firstName || ''} ${team.captainUser?.lastName || ''}`.trim(),
            phone: team.captainUser?.phone || '',
          },
          panchayat: team.panchayat,
          district: team.district,
          state: team.state,
          currentPlayers: team.teamPlayers?.length || 0,
          maxPlayers: (team.sports?.mainPlayersCount || 0) + (team.sports?.maxSubstitutes || 0),
          verifiedPlayersCount: team.teamPlayers?.filter(p => p.verificationStatus === 'approved').length || 0,
          status: team.status,
          matchDayStatus: team.status === 'checked_in' ? 'checked_in' : 
                          team.teamPlayers?.every(p => p.verificationStatus === 'approved') ? 'verified' : 'pending',
          teamImageUrl: team.team_photos?.[0]?.photoPath || null,
        }));

        return {
          success: true,
          teams: transformedTeams,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch venue teams',
        });
      }
    }),

  // Get team details for match day verification
  getTeamForMatchDay: protectedProcedure
    .input(z.object({
      teamId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Check if user has volunteer role
        if (!ctx.user || !['general_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to access volunteer functionality',
          });
        }

        const team = await db.teams.findUnique({
          where: { id: input.teamId },
          include: {
            sports: {
              select: {
                id: true,
                name: true,
                mainPlayersCount: true,
                maxSubstitutes: true,
              },
            },
            captainUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            teamPlayers: {
              select: {
                id: true,
                userId: true,
                firstName: true,
                lastName: true,
                phone: true,
                age: true,
                gender: true,
                position: true,
                verificationStatus: true,
                users: {
                  select: {
                    id: true,
                    profileImages: {
                      select: {
                        profilePhotoPath: true,
                        aadhaarFrontPath: true,
                        aadhaarBackPath: true,
                        verifiedBy: true,
                        verified_at: true,
                      },
                    },
                  },
                },
              },
              orderBy: [
                { position: 'asc' },
                { createdAt: 'asc' },
              ],
            },
            team_photos: {
              select: {
                photoPath: true,
              },
            },
          },
        });

        if (!team) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found',
          });
        }

        // Transform team data
        const transformedTeam = {
          id: team.id,
          name: team.name,
          sportName: team.sports?.name || 'Unknown',
          captainProfile: {
            name: `${team.captainUser?.firstName || ''} ${team.captainUser?.lastName || ''}`.trim(),
            phone: team.captainUser?.phone || '',
          },
          panchayat: team.panchayat,
          district: team.district,
          state: team.state,
          currentPlayers: team.teamPlayers?.length || 0,
          maxPlayers: (team.sports?.mainPlayersCount || 0) + (team.sports?.maxSubstitutes || 0),
          status: team.status,
          matchDayStatus: team.status === 'checked_in' ? 'checked_in' : 
                          team.teamPlayers?.every(p => p.verificationStatus === 'approved') ? 'verified' : 'pending',
          teamImageUrl: team.team_photos?.[0]?.photoPath || null,
        };

        // Transform players data
        const transformedPlayers = team.teamPlayers?.map(player => ({
          id: player.id,
          userId: player.userId,
          name: `${player.firstName} ${player.lastName}`.trim(),
          phone: player.phone,
          age: player.age,
          gender: player.gender,
          position: player.position,
          documents: {
            profilePhoto: {
              url: player.users?.profileImages?.profilePhotoPath || null,
              verified: !!player.users?.profileImages?.verifiedBy,
              uploadedAt: null,
              uploadedBy: null,
            },
            aadhaarFront: {
              url: player.users?.profileImages?.aadhaarFrontPath || null,
              verified: !!player.users?.profileImages?.verifiedBy,
              uploadedAt: null,
              uploadedBy: null,
            },
            aadhaarBack: {
              url: player.users?.profileImages?.aadhaarBackPath || null,
              verified: !!player.users?.profileImages?.verifiedBy,
              uploadedAt: null,
              uploadedBy: null,
            },
          },
          verificationStatus: player.verificationStatus || 'pending',
          matchDayVerificationStatus: player.verificationStatus || 'pending',
          matchDayComments: '', // Would need separate comments table
        })) || [];

        return {
          success: true,
          team: transformedTeam,
          players: transformedPlayers,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch team for match day verification',
        });
      }
    }),

  // Verify player for match day (approve player)
  verifyPlayerForMatchDay: protectedProcedure
    .input(z.object({
      playerId: z.string().uuid(),
      status: z.enum(['approved', 'rejected']),
      comments: z.string().optional(),
      teamId: z.string().uuid(),
      venueId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if user has volunteer role
        if (!ctx.user || !['general_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to verify players for match day',
          });
        }

        // Update player verification status to approved/rejected
        const updatedPlayer = await db.teamPlayers.update({
          where: { id: input.playerId },
          data: {
            verificationStatus: input.status,
            // Note: Comments would need to be stored in a separate table
          },
        });

        // Get team and check if all players are approved for auto check-in
        const team = await db.teams.findUnique({
          where: { id: input.teamId },
          include: {
            teamPlayers: {
              select: {
                verificationStatus: true,
              },
            },
          },
        });

        let teamAutoCheckedIn = false;

        if (team) {
          const allPlayersApproved = team.teamPlayers.every(
            player => player.verificationStatus === 'approved'
          );

          // Auto check-in team if all players are approved and team was verified
          if (allPlayersApproved && team.status === 'verified') {
            await db.teams.update({
              where: { id: team.id },
              data: { status: 'checked_in' },
            });
            teamAutoCheckedIn = true;
          }
        }

        return {
          success: true,
          player: updatedPlayer,
          teamAutoCheckedIn,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify player for match day',
        });
      }
    }),

  // Bulk verify players for match day
  verifyPlayersForMatchDayBulk: protectedProcedure
    .input(z.object({
      playerIds: z.array(z.string().uuid()),
      status: z.enum(['approved', 'rejected']),
      comments: z.string().optional(),
      teamId: z.string().uuid(),
      venueId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if user has volunteer role
        if (!ctx.user || !['general_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to verify players for match day',
          });
        }

        // Update all players
        const updatedPlayers = await db.teamPlayers.updateMany({
          where: { id: { in: input.playerIds } },
          data: {
            verificationStatus: input.status,
          },
        });

        // Check if team should be auto checked-in
        const team = await db.teams.findUnique({
          where: { id: input.teamId },
          include: {
            teamPlayers: {
              select: {
                verificationStatus: true,
              },
            },
          },
        });

        let teamAutoCheckedIn = false;

        if (team) {
          const allPlayersApproved = team.teamPlayers.every(
            player => player.verificationStatus === 'approved'
          );

          if (allPlayersApproved && team.status === 'verified') {
            await db.teams.update({
              where: { id: team.id },
              data: { status: 'checked_in' },
            });
            teamAutoCheckedIn = true;
          }
        }

        return {
          success: true,
          updated: updatedPlayers.count,
          teamAutoCheckedIn,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to bulk verify players for match day',
        });
      }
    }),

  // Get venue checked-in teams for fixture creation
  getVenueCheckedInTeams: protectedProcedure
    .input(z.object({
      venueId: z.string().uuid(),
      eventId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Check if user has volunteer role
        if (!ctx.user || !['general_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to access fixture management',
          });
        }

        // Get venue location mapping for this venue
        const venueLocationMapping = await db.venue_location_mappings.findFirst({
          where: { venue_id: input.venueId },
        });

        if (!venueLocationMapping) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Venue location mapping not found',
          });
        }

        // Get teams that are checked-in for this venue
        const teams = await db.teams.findMany({
          where: {
            status: 'checked_in',
            teamVenueAssignments: {
              some: {
                OR: [
                  { cluster_venue_mapping_id: venueLocationMapping.id },
                  { division_venue_mapping_id: venueLocationMapping.id },
                  { final_venue_mapping_id: venueLocationMapping.id },
                ],
              },
            },
          },
          include: {
            sports: {
              select: {
                id: true,
                name: true,
                display_name: true,
              },
            },
            captainUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        });

        // Group teams by sport and gender
        const teamsBySport: Record<string, any[]> = {};
        
        teams.forEach(team => {
          const sportKey = `${team.sport_id}_${team.genderCategory}`;
          
          if (!teamsBySport[sportKey]) {
            teamsBySport[sportKey] = [];
          }
          
          teamsBySport[sportKey].push({
            id: team.id,
            name: team.name,
            sportId: team.sport_id,
            sportName: team.sports?.name || team.sports?.display_name || 'Unknown',
            displayName: team.sports?.display_name || team.sports?.name || 'Unknown',
            genderCategory: team.genderCategory,
            tournamentNumber: team.tournamentNumber,
            captainProfile: {
              name: `${team.captainUser?.firstName || ''} ${team.captainUser?.lastName || ''}`.trim(),
              phone: team.captainUser?.phone || '',
            },
            panchayat: team.panchayat,
            district: team.district,
            state: team.state,
          });
        });

        return {
          success: true,
          teams: teams.map(team => ({
            id: team.id,
            name: team.name,
            sportId: team.sport_id,
            sportName: team.sports?.name || team.sports?.display_name || 'Unknown',
            genderCategory: team.genderCategory,
            tournamentNumber: team.tournamentNumber,
          })),
          teamsBySport,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch checked-in teams',
        });
      }
    }),

  // Get venue fixtures
  getVenueFixtures: protectedProcedure
    .input(z.object({
      venueId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Check if user has volunteer role
        if (!ctx.user || !['general_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to access fixture management',
          });
        }

        // Get venue location mapping
        const venueLocationMapping = await db.venue_location_mappings.findFirst({
          where: { venue_id: input.venueId },
        });

        if (!venueLocationMapping) {
          return [];
        }

        // Get fixtures for this venue
        const fixtures = await db.fixtures.findMany({
          where: { venue_location_mapping_id: venueLocationMapping.id },
          include: {
            sports: {
              select: {
                id: true,
                name: true,
                display_name: true,
              },
            },
            fixture_teams: {
              include: {
                teams: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            matches: {
              select: {
                id: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        // Transform fixtures for frontend
        const transformedFixtures = fixtures.map(fixture => ({
          id: fixture.id,
          name: fixture.name,
          sportId: fixture.sport_id,
          sportName: fixture.sports?.display_name || fixture.sports?.name || 'Unknown',
          genderCategory: fixture.genderCategory,
          level: fixture.level,
          status: fixture.status,
          assignedTeams: fixture.fixture_teams?.map(ft => ({
            id: ft.teams?.id,
            name: ft.teams?.name,
          })) || [],
          bracket: {
            matches: fixture.matches?.map(match => ({
              id: match.id,
              status: match.status,
            })) || [],
          },
          createdAt: fixture.createdAt?.toISOString(),
          updatedAt: fixture.updatedAt?.toISOString(),
        }));

        return transformedFixtures;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch venue fixtures',
        });
      }
    }),

  // Get venue matches
  getVenueMatches: protectedProcedure
    .input(z.object({
      venueId: z.string().uuid(),
      fixtureId: z.string().uuid().optional(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Check if user has volunteer role
        if (!ctx.user || !['general_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to access match management',
          });
        }

        // Get venue location mapping
        const venueLocationMapping = await db.venue_location_mappings.findFirst({
          where: { venue_id: input.venueId },
        });

        if (!venueLocationMapping) {
          return [];
        }

        // Build query conditions
        const whereConditions: any = {
          venue_location_mapping_id: venueLocationMapping.id,
        };

        if (input.fixtureId) {
          whereConditions.fixture_id = input.fixtureId;
        }

        // Get matches for this venue
        const matches = await db.matches.findMany({
          where: whereConditions,
          include: {
            teams_matches_team1_idToteams: {
              select: {
                id: true,
                name: true,
                tournamentNumber: true,
              },
            },
            teams_matches_team2_idToteams: {
              select: {
                id: true,
                name: true,
                tournamentNumber: true,
              },
            },
            teams_matches_winner_idToteams: {
              select: {
                id: true,
                name: true,
              },
            },
            sports: {
              select: {
                name: true,
                display_name: true,
              },
            },
            fixtures: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        // Transform matches for frontend
        const transformedMatches = matches.map(match => ({
          matchId: match.id,
          matchNumber: match.match_number,
          roundName: match.round_name,
          status: match.status,
          team1: match.teams_matches_team1_idToteams ? {
            teamId: match.teams_matches_team1_idToteams.id,
            teamName: match.teams_matches_team1_idToteams.name,
            tournamentNumber: match.teams_matches_team1_idToteams.tournamentNumber,
          } : null,
          team2: match.teams_matches_team2_idToteams ? {
            teamId: match.teams_matches_team2_idToteams.id,
            teamName: match.teams_matches_team2_idToteams.name,
            tournamentNumber: match.teams_matches_team2_idToteams.tournamentNumber,
          } : null,
          result: match.teams_matches_winner_idToteams ? {
            winnerId: match.teams_matches_winner_idToteams.id,
            winnerName: match.teams_matches_winner_idToteams.name,
            score: {
              team1Score: match.team1_score || 0,
              team2Score: match.team2_score || 0,
            },
          } : null,
          fixtureId: match.fixture_id,
          fixtureName: match.fixtures?.name,
          sportName: match.sports?.display_name || match.sports?.name,
          createdAt: match.createdAt?.toISOString(),
          updatedAt: match.updatedAt?.toISOString(),
        }));

        return transformedMatches;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch venue matches',
        });
      }
    }),

  // Get single fixture details
  getFixtureDetails: protectedProcedure
    .input(z.object({
      fixtureId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Check if user has volunteer role
        if (!ctx.user || !['general_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to access fixture details',
          });
        }

        const fixture = await db.fixtures.findUnique({
          where: { id: input.fixtureId },
          include: {
            sports: {
              select: {
                id: true,
                name: true,
                display_name: true,
              },
            },
            fixture_teams: {
              include: {
                teams: {
                  select: {
                    id: true,
                    name: true,
                    tournamentNumber: true,
                  },
                },
              },
            },
          },
        });

        if (!fixture) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Fixture not found',
          });
        }

        // Get matches for this fixture to create bracket structure
        const matches = await db.matches.findMany({
          where: { fixture_id: input.fixtureId },
          include: {
            teams_matches_team1_idToteams: {
              select: {
                id: true,
                name: true,
                tournamentNumber: true,
              },
            },
            teams_matches_team2_idToteams: {
              select: {
                id: true,
                name: true,
                tournamentNumber: true,
              },
            },
            teams_matches_winner_idToteams: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        });

        // Transform matches for bracket structure
        const bracketMatches = matches.map(match => ({
          matchId: match.id,
          matchNumber: match.match_number,
          roundName: match.round_name,
          status: match.status,
          team1Id: match.team1Id,
          team2Id: match.team2Id,
          winnerId: match.winner_id,
          winnerName: match.winner_name,
          team1Score: match.team1_score,
          team2Score: match.team2_score,
          dependsOnMatch1Id: match.depends_on_match1_id,
          dependsOnMatch2Id: match.depends_on_match2_id,
          nextMatchId: match.next_match_id,
          nextSlot: match.next_slot,
        }));

        // Determine winners from final matches
        const finalMatches = matches.filter(m => m.round_name === 'Final');
        const winners = finalMatches
          .filter(m => m.winner_id)
          .map(m => m.winner_id!)
          .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

        return {
          id: fixture.id,
          name: fixture.name,
          sportId: fixture.sport_id,
          sportName: fixture.sports?.display_name || fixture.sports?.name || 'Unknown',
          genderCategory: fixture.genderCategory,
          level: fixture.level,
          status: fixture.status,
          assignedTeams: fixture.fixture_teams?.map(ft => ({
            id: ft.teams?.id,
            name: ft.teams?.name,
            tournamentNumber: ft.teams?.tournamentNumber,
          })) || [],
          bracket: {
            matches: bracketMatches,
            winners: winners,
          },
          createdAt: fixture.createdAt?.toISOString(),
          updatedAt: fixture.updatedAt?.toISOString(),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch fixture details',
        });
      }
    }),

  // Get team details by IDs for bracket visualization
  getTeamsByIds: protectedProcedure
    .input(z.object({
      teamIds: z.array(z.string().uuid()),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Check if user has volunteer role
        if (!ctx.user || !['general_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to access team details',
          });
        }

        if (input.teamIds.length === 0) {
          return {};
        }

        const teams = await db.teams.findMany({
          where: {
            id: { in: input.teamIds },
          },
          select: {
            id: true,
            name: true,
            tournamentNumber: true,
            sport_id: true,
            genderCategory: true,
            status: true,
            captainUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            teamPlayers: {
              select: {
                id: true,
              },
            },
            sports: {
              select: {
                name: true,
                display_name: true,
                mainPlayersCount: true,
                maxSubstitutes: true,
              },
            },
          },
        });

        // Transform to object with team ID as key for efficient lookup
        const teamsById: Record<string, any> = {};
        
        teams.forEach(team => {
          teamsById[team.id] = {
            id: team.id,
            name: team.name,
            tournamentNumber: team.tournamentNumber,
            sportName: team.sports?.display_name || team.sports?.name || 'Unknown',
            genderCategory: team.genderCategory,
            currentPlayers: team.teamPlayers?.length || 0,
            maxPlayers: (team.sports?.mainPlayersCount || 0) + (team.sports?.maxSubstitutes || 0),
            matchDayStatus: team.status,
            captainProfile: {
              name: `${team.captainUser?.firstName || ''} ${team.captainUser?.lastName || ''}`.trim(),
              phone: team.captainUser?.phone || '',
            },
          };
        });

        return teamsById;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch team details',
        });
      }
    }),
})