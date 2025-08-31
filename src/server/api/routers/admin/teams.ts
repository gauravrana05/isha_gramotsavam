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
      status: z.enum(['all', 'draft', 'submitted', 'verified', 'rejected', 'checked_in']).default('all'),
      sport: z.string().optional(),
      venue: z.string().optional(),
      district: z.string().optional(),
      searchQuery: z.string().optional(),
      sortBy: z.enum(['name', 'createdAt', 'status', 'sport']).default('createdAt'),
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
        where.teamVenueAssignments = {
          some: {
            clusterVenueMapping: {
              venue: {
                name: { contains: input.venue, mode: 'insensitive' }
              }
            }
          }
        };
      }
      
      if (input.district) {
        where.captainUser = { district: { contains: input.district, mode: 'insensitive' } };
      }
      
      if (input.searchQuery) {
        where.OR = [
          { name: { contains: input.searchQuery, mode: 'insensitive' } },
          { captainUser: { firstName: { contains: input.searchQuery, mode: 'insensitive' } } },
          { captainUser: { lastName: { contains: input.searchQuery, mode: 'insensitive' } } },
        ];
      }

      const [teams, totalCount] = await Promise.all([
        db.team.findMany({
          where,
          include: {
            captainUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                district: true,
                profileComplete: true,
              }
            },
            sport: {
              select: {
                id: true,
                name: true,
                description: true,
              }
            },
            teamVenueAssignments: input.includeVenueInfo ? {
              include: {
                clusterVenueMapping: {
                  include: {
                    venue: {
                      select: {
                        id: true,
                        name: true,
                        district: true,
                        taluk: true,
                      }
                    }
                  }
                }
              }
            } : false,
            _count: input.includePlayerCount ? {
              select: {
                teamPlayers: true,
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
    .input(z.object({}))
    .query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const [
        totalTeams,
        verifiedTeams,
        submittedTeams,
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
        db.team.count({ where: { status: 'submitted' } }),
        db.team.count({ where: { status: 'rejected' } }),
        db.team.count({ where: { status: 'draft' } }),
        db.team.count({ 
          where: { 
            teamVenueAssignments: { 
              some: {} 
            } 
          } 
        }),
        db.teamPlayer.count(),
        db.teamPlayer.count({ where: { verificationStatus: 'verified' } }),
        db.teamPlayer.count({ where: { verificationStatus: 'pending' } }),
        db.teamPlayer.count({ where: { verificationStatus: 'rejected' } }),
      ]);

      return {
        teams: {
          total: totalTeams,
          verified: verifiedTeams,
          submitted: submittedTeams,
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
      name: z.string().min(1),
      captainId: z.string().optional(), // Make optional for new captains
      sportId: z.string(),
      eventId: z.string().optional(),
      genderCategory: z.enum(['men', 'women', 'mixed']),
      panchayat: z.string(),
      taluk: z.string(),
      district: z.string(),
      state: z.string(),
      pincode: z.string().optional(),
      status: z.enum(['draft', 'submitted', 'verified']).default('draft'),
      // Captain details for creation if captainId not provided
      captainPhone: z.string().optional(),
      captainFirstName: z.string().optional(),
      captainLastName: z.string().optional(),
      captainDob: z.string().optional(),
      captainGender: z.enum(['M', 'F']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      let captainId = input.captainId;
      let captain;

      // If captainId not provided, create new captain
      if (!captainId) {
        if (!input.captainPhone || !input.captainFirstName || !input.captainLastName || !input.captainDob || !input.captainGender) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Captain details required for new captain creation' });
        }

        // Check if captain already exists by phone
        const existingCaptain = await db.user.findFirst({
          where: { phone: input.captainPhone }
        });

        if (existingCaptain) {
          captain = existingCaptain;
          captainId = existingCaptain.id;
        } else {
          // Create new captain
          captain = await db.user.create({
            data: {
              phone: input.captainPhone,
              firstName: input.captainFirstName,
              lastName: input.captainLastName,
              dateOfBirth: new Date(input.captainDob),
              gender: input.captainGender,
              panchayat: input.panchayat,
              taluk: input.taluk,
              district: input.district,
              state: input.state,
              pincode: input.pincode,
              role: 'public',
              profileComplete: true,
            }
          });
          captainId = captain.id;
        }
      } else {
        // Get existing captain details
        captain = await db.user.findUnique({
          where: { id: captainId },
          select: { 
            firstName: true, 
            lastName: true,
            phone: true,
            whatsappNumber: true,
            dateOfBirth: true,
            gender: true,
            panchayat: true,
            taluk: true,
            district: true,
            state: true,
            pincode: true,
          }
        });

        if (!captain) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Captain not found' });
        }
      }

      const team = await db.team.create({
        data: {
          name: input.name,
          captainId: captainId!,
          captainName: `${captain.firstName} ${captain.lastName}`,
          sportId: input.sportId,
          eventId: input.eventId,
          genderCategory: input.genderCategory,
          panchayat: input.panchayat,
          taluk: input.taluk,
          district: input.district,
          state: input.state,
          pincode: input.pincode,
          status: input.status,
        },
        include: {
          captainUser: true,
          sport: true,
          event: true,
        },
      });

      // Add captain as team player
      await db.teamPlayer.create({
        data: {
          teamId: team.id,
          userId: captainId!,
          position: 'main', // Captain is a main player
          verificationStatus: 'approved', // Captain is auto-approved
          firstName: captain.firstName!,
          lastName: captain.lastName!,
          phone: captain.phone || input.captainPhone!,
          whatsappNumber: captain.whatsappNumber,
          dateOfBirth: captain.dateOfBirth || new Date(input.captainDob!),
          age: captain.dateOfBirth ? 
            Math.floor((Date.now() - new Date(captain.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) :
            Math.floor((Date.now() - new Date(input.captainDob!).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
          gender: captain.gender || input.captainGender!,
          panchayat: captain.panchayat || input.panchayat,
          taluk: captain.taluk || input.taluk,
          district: captain.district || input.district,
          state: captain.state || input.state,
          pincode: captain.pincode || input.pincode || '',
          addedAt: new Date(),
          addedBy: ctx.user.id,
        }
      });

      // Trigger automatic venue assignment
      let venueAssignment = null;
      console.log('🔍 Team creation - eventId:', input.eventId);
      if (input.eventId) {
        console.log('🎯 Triggering venue assignment for team:', team.id);
        try {
          venueAssignment = await assignVenueToTeam(
            team.id, 
            { 
              panchayat: input.panchayat, 
              district: input.district, 
              state: input.state, 
              taluk: input.taluk 
            }, 
            input.eventId, 
            ctx.user.id
          );
          console.log('✅ Venue assignment result:', venueAssignment);
        } catch (error) {
          console.error('❌ Venue assignment failed:', error);
          // Don't fail team creation if venue assignment fails
        }
      }

      return {
        ...team,
        venueAssignment
      };
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
          captainUser: true,
          sport: true,
          event: true,
          teamVenueAssignments: {
            include: {
              clusterVenueMapping: {
                include: {
                  venue: true
                }
              }
            }
          },
          teamPlayers: {
            include: {
              user: {
                include: {
                  profileImages: true,
                }
              },
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
      phone: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      dateOfBirth: z.string(),
      age: z.number(),
      gender: z.enum(['M', 'F', 'O']),
      whatsappNumber: z.string().optional(),
      position: z.enum(['main', 'substitute']),
      panchayat: z.string(),
      taluk: z.string().optional(),
      district: z.string(),
      state: z.string(),
      pincode: z.string().optional(),
      verificationStatus: z.enum(['pending', 'verified', 'approved', 'rejected']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const { teamId, phone, firstName, lastName, dateOfBirth, age, gender, whatsappNumber, position, panchayat, taluk, district, state, pincode, verificationStatus } = input;

      // Check if user already exists
      let user = await db.user.findUnique({
        where: { phone }
      });

      // Create user if doesn't exist
      if (!user) {
        user = await db.user.create({
          data: {
            phone,
            firstName,
            lastName,
            dateOfBirth: new Date(dateOfBirth),
            gender,
            whatsappNumber: whatsappNumber || phone,
            panchayat,
            taluk: taluk || '',
            district,
            state,
            pincode: pincode || '000000',
          }
        });
      }

      // Check if player already in team
      const existingPlayer = await db.teamPlayer.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: user.id
          }
        }
      });

      if (existingPlayer) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Player is already in this team'
        });
      }

      // Create team player
      const player = await db.teamPlayer.create({
        data: {
          teamId,
          userId: user.id,
          firstName,
          lastName,
          phone,
          whatsappNumber: whatsappNumber || phone,
          dateOfBirth: new Date(dateOfBirth),
          age,
          gender,
          position,
          panchayat,
          taluk: taluk || '',
          district,
          state,
          pincode: pincode || '000000',
          verificationStatus: verificationStatus || 'pending',
          addedBy: ctx.user.id,
        },
        include: {
          user: true,
          team: true,
        },
      });

      // If team status is not draft or submitted, change it to submitted
      // because adding a new player requires re-verification
      const currentTeam = await db.team.findUnique({
        where: { id: teamId },
        select: { status: true }
      });

      if (currentTeam && currentTeam.status !== 'draft' && currentTeam.status !== 'submitted') {
        await db.team.update({
          where: { id: teamId },
          data: { status: 'submitted' }
        });
      }

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

  // Update Player
  updatePlayer: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      userId: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      dateOfBirth: z.string(),
      whatsappNumber: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can update players',
        });
      }

      const { teamId, userId, firstName, lastName, dateOfBirth, whatsappNumber } = input;

      // Update team player record
      await db.teamPlayer.update({
        where: {
          teamId_userId: {
            teamId,
            userId
          }
        },
        data: {
          firstName,
          lastName,
          dateOfBirth: new Date(dateOfBirth),
          whatsappNumber,
        }
      });

      // Update user record
      await db.user.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          dateOfBirth: new Date(dateOfBirth),
          whatsappNumber,
        }
      });

      return { success: true, message: 'Player updated successfully' };
    }),

  // Update Player Status with cascading team status logic
  updatePlayerStatus: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      userId: z.string(),
      status: z.enum(['pending', 'verified', 'approved', 'rejected']),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can update player status',
        });
      }

      const { teamId, userId, status } = input;

      // Update player status
      await db.teamPlayer.update({
        where: {
          teamId_userId: {
            teamId,
            userId
          }
        },
        data: {
          verificationStatus: status,
        }
      });

      // Get all players in the team to determine team status
      const allPlayers = await db.teamPlayer.findMany({
        where: { teamId }
      });

      // Get current team status
      const currentTeam = await db.team.findUnique({
        where: { id: teamId },
        select: { status: true }
      });

      // Determine new team status based on player statuses
      const playerStatuses = allPlayers.map(p => p.verificationStatus);
      let newTeamStatus = currentTeam?.status || 'draft';
      
      // Priority order: rejected > pending > verified > approved (checked_in)
      if (playerStatuses.some(s => s === 'rejected')) {
        newTeamStatus = 'rejected';
      } else if (playerStatuses.some(s => s === 'pending') && currentTeam?.status !== 'draft') {
        newTeamStatus = 'submitted';      // ANY player pending → Team submitted (only if team not draft)
      } else if (playerStatuses.every(s => s === 'approved')) {
        newTeamStatus = 'checked_in';
      } else if (playerStatuses.every(s => s === 'verified')) {
        newTeamStatus = 'verified';
      } else if (playerStatuses.some(s => s === 'verified') && currentTeam?.status === 'checked_in') {
        newTeamStatus = 'verified';       // ANY verified → Team verified (only if team was checked_in)
      }

      // Update team status
      await db.team.update({
        where: { id: teamId },
        data: { status: newTeamStatus }
      });

      return { success: true, message: 'Player status updated successfully' };
    }),

  // Update Team Status with cascading player status logic
  updateTeamStatus: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      status: z.enum(['draft', 'submitted', 'verified', 'rejected', 'checked_in']),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can update team status',
        });
      }

      const { teamId, status } = input;

      // Update team status
      await db.team.update({
        where: { id: teamId },
        data: { status }
      });

      // Determine player status based on team status and update all players
      let playerStatus: 'pending' | 'verified' | 'approved' | 'rejected' | null = null;
      
      if (status === 'checked_in') {
        playerStatus = 'approved' as const;
      } else if (status === 'verified') {
        playerStatus = 'verified' as const;
      } else if (status === 'submitted') {
        playerStatus = 'pending' as const;
      }

      // Only update players if we have a specific status to set
      if (playerStatus) {
        await db.teamPlayer.updateMany({
          where: { teamId },
          data: { verificationStatus: playerStatus }
        });
      }

      return { success: true, message: 'Team status updated successfully' };
    }),

  // Make Captain (Admin)
  makeCaptain: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can change team captains',
        });
      }

      const { teamId, userId } = input;

      // Check if the new captain is a player in this team
      const player = await db.teamPlayer.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId,
          },
        },
      });

      if (!player) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Player not found in this team',
        });
      }

      // Update team captain
      await db.team.update({
        where: { id: teamId },
        data: { captainId: userId },
      });

      return { success: true, message: 'Captain updated successfully' };
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
          position: input.position as 'main' | 'substitute',
        },
        include: {
          user: true,
          team: true,
        },
      });

      return player;
    }),
});
