import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, protectedProcedure } from '../../trpc'
import type { Team, User, Sport } from '@prisma/client'

// Define proper types for the response data
type TeamWithRelations = Team & {
  captainUser: Pick<User, 'firstName' | 'lastName' | 'phone' | 'panchayat' | 'district'> | null;
  sport: Pick<Sport, 'name'> | null;
}

// Helper functions for status cascading
async function cascadeTeamStatusToPlayers(teamId: string, teamStatus: string) {
  let playerStatus: string | null = null;
  
  if (teamStatus === 'checked_in') {
    playerStatus = 'approved';
  } else if (teamStatus === 'verified') {
    playerStatus = 'verified';
  } else if (teamStatus === 'submitted') {
    playerStatus = 'pending';
  }
  
  if (playerStatus) {
    await db.teamPlayer.updateMany({
      where: { teamId },
      data: { verificationStatus: playerStatus as any },
    });
    console.log(`🔄 Team ${teamId} (${teamStatus}) cascaded to players (${playerStatus})`);
  }
}

async function cascadePlayerStatusToTeam(teamId: string) {
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { teamPlayers: true },
  });
  
  if (!team) return;
  
  const playerStatuses = team.teamPlayers.map(p => p.verificationStatus);
  const currentTeamStatus = team.status;
  let newTeamStatus = currentTeamStatus;
  
  // Priority-based status resolution
  if (playerStatuses.some(s => s === 'rejected')) {
    newTeamStatus = 'rejected';
  } else if (playerStatuses.some(s => s === 'pending') && currentTeamStatus !== 'draft') {
    newTeamStatus = 'submitted';
  } else if (playerStatuses.every(s => s === 'approved')) {
    newTeamStatus = 'checked_in';
  } else if (playerStatuses.every(s => s === 'verified')) {
    newTeamStatus = 'verified';
  } else if (playerStatuses.some(s => s === 'verified') && currentTeamStatus === 'checked_in') {
    newTeamStatus = 'verified';
  }
  
  if (newTeamStatus !== currentTeamStatus) {
    await db.team.update({
      where: { id: teamId },
      data: { status: newTeamStatus as any },
    });
    console.log(`🔄 Team ${teamId} status: ${currentTeamStatus} → ${newTeamStatus}`);
  }
}

export const volunteersVenueRouter = createTRPCRouter({
  getAllSports: protectedProcedure.query(async ({ ctx }) => {
    // Verify volunteer role
    if (!['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only volunteers can access sports data',
      });
    }

    const sports = await db.sport.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return sports;
  }),

  getTeamForVerification: protectedProcedure
    .input(z.object({
      teamId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      // Verify volunteer role
      if (!['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only volunteers can access team verification data',
        });
      }

      const team = await db.team.findUnique({
        where: { id: input.teamId },
        include: {
          sport: {
            select: {
              id: true,
              name: true,
              mainPlayersCount: true,
              maxSubstitutes: true,
            }
          },
          captainUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            }
          },
          teamPhoto: {
            select: {
              photoPath: true,
              uploadedAt: true,
            }
          },
          teamPlayers: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  email: true,
                  dateOfBirth: true,
                  gender: true,
                  profileImages: {
                    select: {
                      profilePhotoPath: true,
                      aadhaarFrontPath: true,
                      aadhaarBackPath: true,
                    }
                  }
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      return team;
    }),

  getVenueDetails: protectedProcedure
    .input(z.object({
      venueId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      // Verify volunteer role
      if (!['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only volunteers can access venue details',
        });
      }

      // Verify venue assignment
      const assignment = await db.volunteerAssignment.findFirst({
        where: { 
          volunteerId: ctx.user.id,
          deletedAt: null,
          venueLevelMapping: {
            venueId: input.venueId
          }
        }
      });

      if (!assignment) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not assigned to this venue',
        });
      }

      // Get venue details
      const venue = await db.venue.findUnique({
        where: { id: input.venueId },
        include: {
          venueLevelMappings: {
            include: {
              teams: {
                include: {
                  sport: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!venue) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Venue not found',
        });
      }

      return {
        id: venue.id,
        name: venue.name,
        address: venue.address,
        city: venue.city,
        state: venue.state,
        capacity: venue.capacity,
        coordinator: venue.coordinator,
        phone: venue.phone,
        email: venue.email,
        description: venue.description,
        updatedAt: venue.updatedAt,
        sports: venue.venueLevelMappings
          .flatMap(mapping => mapping.teams.map(team => team.sport))
          .filter((sport, index, self) => sport && self.findIndex(s => s?.id === sport.id) === index)
      };
    }),

  getVenueStats: protectedProcedure
    .input(z.object({
      venueId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      // Verify volunteer role
      if (!['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only volunteers can access venue stats',
        });
      }

      // Verify venue assignment
      const assignment = await db.volunteerAssignment.findFirst({
        where: { 
          volunteerId: ctx.user.id,
          deletedAt: null,
          venueLevelMapping: {
            venueId: input.venueId
          }
        }
      });

      if (!assignment) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not assigned to this venue',
        });
      }

      // Get team stats
      const teamStats = await db.team.groupBy({
        by: ['status'],
        where: {
          teamVenueAssignments: {
            some: {
              OR: [
                {
                  clusterVenueMapping: {
                    venueId: input.venueId
                  }
                },
                {
                  divisionVenueMapping: {
                    venueId: input.venueId
                  }
                },
                {
                  finalVenueMapping: {
                    venueId: input.venueId
                  }
                }
              ]
            }
          }
        },
        _count: {
          id: true
        }
      });

      const totalTeams = teamStats.reduce((sum, stat) => sum + stat._count.id, 0);
      const verifiedTeams = teamStats.find(stat => stat.status === 'verified')?._count.id || 0;

      // Get fixture stats
      const fixtureStats = await db.fixture.groupBy({
        by: ['status'],
        where: {
          venueLevelMapping: {
            venueId: input.venueId
          }
        },
        _count: {
          id: true
        }
      });

      const totalFixtures = fixtureStats.reduce((sum, stat) => sum + stat._count.id, 0);
      const activeFixtures = fixtureStats.find(stat => stat.status === 'in_progress')?._count.id || 0;

      // Get match stats
      const totalMatches = await db.match.count({
        where: {
          fixture: {
            venueLevelMapping: {
              venueId: input.venueId
            }
          }
        }
      });

      return {
        totalTeams,
        verifiedTeams,
        activeFixtures,
        totalFixtures,
        totalMatches
      };
    }),

  getVenueTeams: protectedProcedure
    .input(z.object({
      venueId: z.string().uuid(),
    }).optional().default({}))
    .query(async ({ input, ctx }) => {
      // Verify volunteer role
      if (!['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only volunteers can access venue operations',
        });
      }

      // Verify venue assignment
      const assignment = await db.volunteerAssignment.findFirst({
        where: { 
          volunteerId: ctx.user.id,
          deletedAt: null,
          venueLevelMapping: {
            venueId: input.venueId
          }
        }
      });

      if (!assignment) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not assigned to this venue',
        });
      }

      // Get teams assigned to this venue through TeamVenueAssignment
      // Fixed: Query through teamVenueAssignment for all venue levels
      const teamAssignments = await db.teamVenueAssignment.findMany({
        where: {
          OR: [
            {
              clusterVenueMapping: {
                venueId: input.venueId
              }
            },
            {
              divisionVenueMapping: {
                venueId: input.venueId
              }
            },
            {
              finalVenueMapping: {
                venueId: input.venueId
              }
            }
          ]
        },
        include: {
          team: {
            include: {
              captainUser: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  panchayat: true,
                  district: true,
                },
              },
              sport: {
                select: {
                  name: true,
                  mainPlayersCount: true,
                  maxSubstitutes: true,
                },
              },
              teamPlayers: {
                select: {
                  id: true,
                  verificationStatus: true,
                },
              },
            }
          }
        },
      });

      // Extract teams with proper typing
      const teams: TeamWithRelations[] = teamAssignments
        .map(assignment => assignment.team)
        .filter((team): team is TeamWithRelations => team !== null);

      // Get verified players count for each team
      const teamIds = teams.map(team => team.id);
      const verifiedPlayersCounts = await db.teamPlayer.groupBy({
        by: ['teamId'],
        where: {
          teamId: { in: teamIds },
          verificationStatus: 'verified'
        },
        _count: {
          id: true
        }
      });

      const verifiedCountsMap = new Map(
        verifiedPlayersCounts.map(item => [item.teamId, item._count.id])
      );

      return teams.map(team => ({
        id: team.id,
        name: team.name,
        status: team.status,
        captainUser: team.captainUser,
        sport: team.sport,
        currentPlayers: team.currentPlayers,
        verifiedPlayersCount: verifiedCountsMap.get(team.id) || 0,
      }));
    }),

  getVenueFixtures: protectedProcedure
    .input(z.object({ venueId: z.string() }).optional().default({}))
    .query(async ({ input }) => {
      const fixtures = await db.fixture.findMany({
        where: { 
          venueLevelMapping: {
            venueId: input.venueId
          }
        },
        include: {
          sport: { select: { name: true } },
          fixtureTeams: {
            include: {
              team: {
                select: { id: true, name: true }
              }
            }
          }
        },
      });

      return fixtures.map(fixture => ({
        id: fixture.id,
        name: fixture.name,
        sport: fixture.sport,
        level: fixture.level,
        status: fixture.status,
        assignedTeams: fixture.fixtureTeams.map(ft => ft.team),
        completedAt: fixture.completedAt
      }));
    }),

  getTodayMatches: protectedProcedure
    .input(z.object({ 
      venueId: z.string(),
      date: z.string()
    }).optional().default({}))
    .query(async ({ input }) => {
      const startOfDay = new Date(input.date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(input.date);
      endOfDay.setHours(23, 59, 59, 999);

      const matches = await db.match.findMany({
        where: {
          fixture: { venueId: input.venueId },
          scheduledTime: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          fixture: {
            select: { name: true }
          },
          team1: {
            select: { id: true, name: true }
          },
          team2: {
            select: { id: true, name: true }
          }
        },
      });

      return matches;
    }),

  getVenueCheckedInTeams: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      eventId: z.string().optional(),
    }).optional().default({}))
    .query(async ({ input }) => {
      // Get eventId from input or find current ongoing event
      let eventId = input.eventId;
      if (!eventId) {
        const ongoingEvent = await db.event.findFirst({
          where: {
            status: {
              in: ['registration_open', 'registration_closed', 'active']
            }
          },
          select: { id: true }
        });
        eventId = ongoingEvent?.id;
      }

      if (!eventId) {
        return [];
      }

      const checkedInTeams = await db.fixtureTeam.findMany({
        where: {
          fixture: {
            venueLevelMapping: {
              venueId: input.venueId,
            },
            eventId: eventId,
          },
          team: {
            status: 'checked_in'
          }
        },
        include: {
          team: {
            include: {
              captainUser: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true
                }
              },
              sport: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      return checkedInTeams.map(ft => ({
        id: ft.team.id,
        name: ft.team.name,
        status: ft.team.status,
        captainUser: ft.team.captainUser,
        currentPlayers: ft.team.currentPlayers,
        verifiedPlayersCount: ft.team.verifiedPlayersCount,
        sport: ft.team.sport
      }));
    }),

  // Team management endpoints
  searchUserByPhone: protectedProcedure
    .input(z.object({ phone: z.string() }).optional().default({}))
    .query(async ({ input }) => {
      const user = await db.user.findFirst({
        where: {
          OR: [
            { phone: input.phone },
            { phone: `+91${input.phone}` }
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          dateOfBirth: true,
          gender: true
        }
      });

      return user;
    }),

  createTeam: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      sportId: z.string(),
      captainPhone: z.string(),
      captainDetails: z.object({
        firstName: z.string(),
        lastName: z.string(),
        dateOfBirth: z.string(),
        gender: z.enum(['M', 'F'])
      }),
      location: z.object({
        panchayat: z.string(),
        district: z.string(),
        state: z.string(),
        taluk: z.string().optional()
      }),
      venueId: z.string()
    }).optional().default({}))
    .mutation(async ({ input, ctx }) => {
      const { captainPhone, captainDetails, location, ...teamData } = input;

      // Find or create captain user
      let captain = await db.user.findFirst({
        where: {
          OR: [
            { phone: captainPhone },
            { phone: `+91${captainPhone}` }
          ]
        }
      });

      if (!captain) {
        // Create new user
        captain = await db.user.create({
          data: {
            phone: captainPhone,
            firstName: captainDetails.firstName,
            lastName: captainDetails.lastName,
            dateOfBirth: new Date(captainDetails.dateOfBirth),
            gender: captainDetails.gender,
            role: 'captain',
            profileComplete: true
          }
        });
      } else {
        // Update existing user if needed
        await db.user.update({
          where: { id: captain.id },
          data: {
            firstName: captain.firstName || captainDetails.firstName,
            lastName: captain.lastName || captainDetails.lastName,
            dateOfBirth: captain.dateOfBirth || new Date(captainDetails.dateOfBirth),
            gender: captain.gender || captainDetails.gender,
          }
        });
      }

      // Get current ongoing event (registration_open, registration_closed, or active)
      const ongoingEvent = await db.event.findFirst({
        where: {
          status: {
            in: ['registration_open', 'registration_closed', 'active']
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Create team
      const team = await db.team.create({
        data: {
          name: teamData.name,
          description: teamData.description,
          sportId: teamData.sportId,
          eventId: ongoingEvent?.id,
          captainId: captain.id,
          captainName: `${captainDetails.firstName} ${captainDetails.lastName}`,
          panchayat: location.panchayat,
          district: location.district,
          state: location.state,
          taluk: location.taluk,
          pincode: location.pincode || '600001',
          status: 'draft',
          currentPlayers: 1,
          genderCategory: captainDetails.gender === 'F' ? 'women' : 'men'
        }
      });

      // Add captain as team player with pending status
      await db.teamPlayer.create({
        data: {
          teamId: team.id,
          userId: captain.id,
          position: 'main',
          verificationStatus: 'pending',
          firstName: captain.firstName!,
          lastName: captain.lastName!,
          dateOfBirth: captain.dateOfBirth!,
          age: new Date().getFullYear() - captain.dateOfBirth!.getFullYear(),
          gender: captain.gender!,
          phone: captain.phone!,
          panchayat: location.panchayat,
          district: location.district,
          state: location.state,
          taluk: location.taluk,
          pincode: location.pincode || '600001',
          addedBy: ctx.user.id,
        }
      });

      // Find the venue level mapping for this venue
      const venueLevelMapping = await db.venueLevelMapping.findFirst({
        where: {
          venueId: input.venueId,
          eventId: ongoingEvent!.id,
          level: 'cluster'
        }
      });

      if (!venueLevelMapping) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Venue level mapping not found for this venue'
        });
      }

      // Assign team to the current venue
      await db.teamVenueAssignment.create({
        data: {
          teamId: team.id,
          eventId: ongoingEvent!.id,
          assignmentMethod: 'manual_assigned',
          assignedBy: ctx.user.id,
          clusterVenueMappingId: venueLevelMapping.id
        }
      });

      return { success: true, teamId: team.id };
    }),

  // Get team details
  getTeamDetails: protectedProcedure
    .input(z.object({
      teamId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      // Verify volunteer role
      if (!['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only volunteers can access team details',
        });
      }

      const team = await db.team.findUnique({
        where: { id: input.teamId },
        include: {
          captainUser: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              panchayat: true,
              district: true,
              state: true,
              profileImages: true,
            },
          },
          sport: {
            select: {
              name: true,
              mainPlayersCount: true,
              maxSubstitutes: true,
            },
          },
          teamPhoto: {
            select: {
              photoPath: true,
            },
          },
          teamPlayers: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  dateOfBirth: true,
                  gender: true,
                  profileImages: true,
                }
              }
            }
          }
        }
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      return team;
    }),

  // Get venue media and posts for technical volunteers
  getVenueMediaAndPosts: protectedProcedure
    .input(z.object({
      venueId: z.string().uuid(),
    }).optional().default({}))
    .query(async ({ input, ctx }) => {
      // Check if user is technical volunteer or admin
      if (!['admin', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only technical volunteers and admins can access venue media',
        });
      }

      // For technical volunteers, verify they're assigned to this venue
      if (ctx.user.role === 'technical_volunteer') {
        const assignment = await db.volunteerAssignment.findFirst({
          where: {
            volunteerId: ctx.user.id,
            venueLevelMapping: {
              venueId: input.venueId
            }
          }
        });

        if (!assignment) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not assigned to this venue',
          });
        }
      }

      // Get venue media
      const venueMedia = await db.media.findMany({
        where: {
          entityType: 'venue',
          entityId: input.venueId,
          status: 'approved'
        },
        include: {
          uploadedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Get venue posts (from fixtures at this venue)
      const venuePosts = await db.post.findMany({
        where: {
          entityType: 'fixture',
          entityId: {
            in: await db.fixture.findMany({
              where: {
                venueLevelMapping: {
                  venueId: input.venueId
                }
              },
              select: { id: true }
            }).then(fixtures => fixtures.map(f => f.id))
          }
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          },
          media: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return {
        venueMedia,
        posts: venuePosts,
      };
    }),

  // Get public posts from other volunteers
  getPublicPosts: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }).optional().default({}))
    .query(async ({ input, ctx }) => {
      if (!['admin', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only technical volunteers and admins can view public posts',
        });
      }

      const posts = await db.post.findMany({
        where: {
          visibility: 'public',
          authorId: {
            not: ctx.user.id // Exclude own posts
          },
          author: {
            role: {
              in: ['technical_volunteer', 'admin']
            }
          }
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          },
          media: true,
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: input.limit,
        skip: input.offset,
      });

      return posts;
    }),

  // Get venue posts
  getVenuePosts: protectedProcedure
    .input(z.object({
      venueId: z.string(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      // Note: PostEntity enum only supports 'fixture' and 'match', not 'venue'
      // For now, return fixture posts related to this venue
      const posts = await db.post.findMany({
        where: {
          entityType: 'fixture',
          // Get fixtures for this venue and then their posts
          event: {
            venueLevelMappings: {
              some: {
                venueId: input.venueId,
              },
            },
          },
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: input.limit,
        skip: input.offset,
      });

      return posts;
    }),

  // Get venue tournament data (simplified for single tournament per venue)
  getVenueTournament: protectedProcedure
    .input(z.object({
      venueId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      // Verify volunteer role
      if (!['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only volunteers can access venue tournament data',
        });
      }

      // Verify venue assignment
      const assignment = await db.volunteerAssignment.findFirst({
        where: { 
          volunteerId: ctx.user.id,
          deletedAt: null,
          venueLevelMapping: {
            venueId: input.venueId
          }
        }
      });

      if (!assignment) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not assigned to this venue',
        });
      }

      // Get active tournament for this venue
      const tournament = await db.fixture.findFirst({
        where: {
          venueLevelMapping: {
            venueId: input.venueId
          }
        },
        include: {
          sport: {
            select: {
              id: true,
              name: true
            }
          },
          fixtureTeams: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  status: true
                }
              }
            }
          },
          matches: {
            select: {
              id: true,
              status: true,
              team1Score: true,
              team2Score: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Get teams ready for tournaments (only checked-in teams)
      const checkedInTeams = await db.team.findMany({
        where: {
          status: 'checked_in', // Only teams that are checked in and ready for tournaments
          teamVenueAssignments: {
            some: {
              OR: [
                {
                  clusterVenueMapping: {
                    venueId: input.venueId
                  }
                },
                {
                  divisionVenueMapping: {
                    venueId: input.venueId
                  }
                },
                {
                  finalVenueMapping: {
                    venueId: input.venueId
                  }
                }
              ]
            }
          }
        },
        include: {
          sport: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Group teams by sport and gender category
      const teamsBySport = checkedInTeams.reduce((acc: any, team) => {
        const sportKey = `${team.sportId}_${team.genderCategory}`;
        if (!acc[sportKey]) {
          acc[sportKey] = {
            sportId: team.sportId,
            sportName: team.sport?.name || 'Unknown',
            genderCategory: team.genderCategory,
            teams: []
          };
        }
        acc[sportKey].teams.push(team);
        return acc;
      }, {});

      // Calculate tournament stats
      let stats = {
        totalTeams: checkedInTeams.length, // Use actual checked-in teams count, not tournament teams
        matchesCompleted: 0,
        matchesTotal: 0,
        progress: 0
      };

      if (tournament) {
        stats.matchesTotal = tournament.matches.length;
        stats.matchesCompleted = tournament.matches.filter(m => m.status === 'completed').length;
        stats.progress = stats.matchesTotal > 0 ? Math.round((stats.matchesCompleted / stats.matchesTotal) * 100) : 0;
      }

      return {
        tournament: tournament ? {
          id: tournament.id,
          name: tournament.name,
          sport: tournament.sport,
          level: tournament.level,
          status: tournament.status,
          genderCategory: tournament.genderCategory,
          teams: tournament.fixtureTeams.length, // Tournament teams count
          stats
        } : null,
        teamsBySport: Object.values(teamsBySport),
        checkedInTeams,
        stats
      };
    }),

  // Get venue matches (optimized for match management)
  getVenueMatches: protectedProcedure
    .input(z.object({
      venueId: z.string().uuid(),
      fixtureId: z.string().optional()
    }))
    .query(async ({ input, ctx }) => {
      // Verify volunteer role
      if (!['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only volunteers can access venue matches',
        });
      }

      // Verify venue assignment
      const assignment = await db.volunteerAssignment.findFirst({
        where: { 
          volunteerId: ctx.user.id,
          deletedAt: null,
          venueLevelMapping: {
            venueId: input.venueId
          }
        }
      });

      if (!assignment) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not assigned to this venue',
        });
      }

      // Build match query conditions
      const matchWhere: any = {
        fixture: {
          venueLevelMapping: {
            venueId: input.venueId
          }
        }
      };

      // Filter by fixture if provided
      if (input.fixtureId) {
        matchWhere.fixtureId = input.fixtureId;
      }

      // Get matches with team and fixture info
      const matches = await db.match.findMany({
        where: matchWhere,
        include: {
          fixture: {
            select: {
              id: true,
              name: true,
              sport: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          team1: {
            select: {
              id: true,
              name: true
            }
          },
          team2: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [
          { fixture: { name: 'asc' } },
          { createdAt: 'asc' }
        ]
      });

      // Get fixture info if filtering by specific fixture
      let fixtureInfo = null;
      if (input.fixtureId) {
        fixtureInfo = await db.fixture.findUnique({
          where: { id: input.fixtureId },
          select: {
            id: true,
            name: true,
            sport: {
              select: {
                id: true,
                name: true
              }
            },
            level: true,
            genderCategory: true
          }
        });
      }

      // Calculate match statistics
      const stats = {
        total: matches.length,
        scheduled: matches.filter(m => m.status === 'scheduled').length,
        ready: matches.filter(m => m.status === 'ready').length,
        inProgress: matches.filter(m => m.status === 'in_progress').length,
        completed: matches.filter(m => m.status === 'completed').length
      };

      return {
        matches: matches.map((match, index) => ({
          id: match.id,
          matchNumber: index + 1, // Generate match number from index
          round: 1, // Default round
          roundName: `Match ${index + 1}`,
          status: match.status,
          scheduledTime: match.scheduledTime,
          actualStartTime: match.actualStartTime,
          team1Score: match.team1Score,
          team2Score: match.team2Score,
          winnerId: match.winnerId,
          fixture: match.fixture,
          team1: match.team1,
          team2: match.team2
        })),
        fixtureInfo,
        stats
      };
    }),

  // Remove player mutation for volunteers
  removePlayer: protectedProcedure
    .input(z.object({
      playerId: z.string(),
      teamId: z.string(),
      venueId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify volunteer role
      if (!['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only volunteers can remove players',
        });
      }

      // Verify venue assignment
      const assignment = await db.volunteerAssignment.findFirst({
        where: { 
          volunteerId: ctx.user.id,
          deletedAt: null,
          venueLevelMapping: {
            venueId: input.venueId
          }
        }
      });

      if (!assignment) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not assigned to this venue',
        });
      }

      const teamPlayer = await db.teamPlayer.findUnique({
        where: { id: input.playerId },
        include: { team: true }
      });

      if (!teamPlayer || teamPlayer.teamId !== input.teamId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Player not found in this team',
        });
      }

      await db.teamPlayer.delete({
        where: { id: input.playerId },
      });

      return { success: true };
    }),

  // Update player mutation for volunteers
  updatePlayer: protectedProcedure
    .input(z.object({
      playerId: z.string(),
      teamId: z.string(),
      venueId: z.string(),
      position: z.enum(['main', 'substitute']),
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      phone: z.string(),
      dateOfBirth: z.string(), // Change to string to match form input
      gender: z.enum(['M', 'F']),
      panchayat: z.string().optional(),
      district: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify volunteer role
      if (!['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only volunteers can update players',
        });
      }

      // Verify venue assignment
      const assignment = await db.volunteerAssignment.findFirst({
        where: { 
          volunteerId: ctx.user.id,
          deletedAt: null,
          venueLevelMapping: {
            venueId: input.venueId
          }
        }
      });

      if (!assignment) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not assigned to this venue',
        });
      }

      const { playerId, teamId, venueId, ...updateData } = input;

      const teamPlayer = await db.teamPlayer.findUnique({
        where: { id: playerId },
        include: { team: true, user: true }
      });

      if (!teamPlayer || teamPlayer.teamId !== teamId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Player not found in this team',
        });
      }

      // Update both TeamPlayer and User records
      const updatedPlayer = await db.$transaction(async (tx) => {
        // Update TeamPlayer record
        await tx.teamPlayer.update({
          where: { id: playerId },
          data: {
            position: updateData.position,
            firstName: updateData.firstName,
            lastName: updateData.lastName,
            phone: updateData.phone,
            dateOfBirth: new Date(updateData.dateOfBirth),
            age: Math.floor((new Date().getTime() - new Date(updateData.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
            gender: updateData.gender,
            panchayat: updateData.panchayat || 'Default Panchayat',
            district: updateData.district || 'Default District',
            taluk: updateData.district || 'Default District',
            state: 'Tamil Nadu',
            pincode: '600001',
          },
        });

        // Update User record if user exists
        if (teamPlayer.user) {
          await tx.user.update({
            where: { id: teamPlayer.user.id },
            data: {
              firstName: updateData.firstName,
              lastName: updateData.lastName,
              phone: updateData.phone,
              dateOfBirth: new Date(updateData.dateOfBirth),
              gender: updateData.gender,
            },
          });
        }

        return await tx.teamPlayer.findUnique({
          where: { id: playerId },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        });
      });

      return updatedPlayer;
    }),

  // Upload team image mutation for volunteers
  uploadTeamImage: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      imageUrl: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify volunteer role
      if (!['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only volunteers can upload team images',
        });
      }

      // Create or update team photo record
      const teamPhoto = await db.teamPhoto.upsert({
        where: { teamId: input.teamId },
        update: { 
          photoPath: input.imageUrl,
          uploadedBy: ctx.user.id,
          uploadedAt: new Date()
        },
        create: { 
          teamId: input.teamId,
          photoPath: input.imageUrl,
          uploadedBy: ctx.user.id
        },
      });

      return teamPhoto;
    }),

  // Add Player Mutation
  addPlayer: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      playerData: z.object({
        name: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        phone: z.string(),
        dateOfBirth: z.string(),
        gender: z.string(),
        whatsappNumber: z.string().optional(),
        village: z.string(),
        panchayat: z.string(),
        district: z.string(),
        position: z.enum(['main', 'substitute'])
      })
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify volunteer role
      if (!['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only volunteers can add players',
        });
      }

      const { teamId, playerData } = input;
      const { firstName, lastName, phone, dateOfBirth, gender, village, panchayat, district, position } = playerData;

      return await db.$transaction(async (tx) => {
        // Check if team exists
        const team = await tx.team.findUnique({
          where: { id: teamId },
          include: {
            sport: true,
            teamPlayers: true,
          },
        });

        if (!team) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found',
          });
        }

        // Check if player with same phone already exists in team
        const existingPlayer = await tx.teamPlayer.findFirst({
          where: { teamId, phone },
        });

        if (existingPlayer) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Player is already in this team',
          });
        }

        // Validate team composition limits
        const currentMainPlayers = team.teamPlayers.filter(p => p.position === 'main').length;
        const currentSubPlayers = team.teamPlayers.filter(p => p.position === 'substitute').length;
        
        if (position === 'main' && currentMainPlayers >= team.sport.mainPlayersCount) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Maximum ${team.sport.mainPlayersCount} main players allowed`,
          });
        }
        
        if (position === 'substitute' && currentSubPlayers >= team.sport.maxSubstitutes) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Maximum ${team.sport.maxSubstitutes} substitute players allowed`,
          });
        }

        // Check if user already exists
        let user = await tx.user.findUnique({
          where: { phone },
        });

        // If user doesn't exist, create new user
        if (!user) {
          user = await tx.user.create({
            data: {
              firstName,
              lastName,
              phone,
              dateOfBirth: new Date(dateOfBirth),
              age: Math.floor((new Date().getTime() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
              gender,
              panchayat,
              district,
            },
          });
        }

        const teamPlayer = await tx.teamPlayer.create({
          data: {
            teamId,
            userId: user.id,
            position,
            firstName,
            lastName,
            phone,
            dateOfBirth: new Date(dateOfBirth),
            age: Math.floor((new Date().getTime() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
            gender,
            panchayat,
            district,
            taluk: district, // Use district as taluk for now
            state: 'Tamil Nadu', // Default state
            pincode: '600001', // Default pincode
            addedBy: 'volunteer',
            verificationStatus: 'pending',
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                gender: true,
              },
            },
          },
        });

        return teamPlayer;
      });
    }),

  // Verify Player Mutation
  verifyPlayer: protectedProcedure
    .input(z.object({
      playerId: z.string(),
      status: z.enum(['pending', 'verified', 'approved', 'rejected']),
      comments: z.string(),
      teamId: z.string(),
      venueId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify volunteer role
      if (!['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only volunteers can verify players',
        });
      }

      // Verify venue assignment
      const assignment = await db.volunteerAssignment.findFirst({
        where: { 
          volunteerId: ctx.user.id,
          deletedAt: null,
          venueLevelMapping: {
            venueId: input.venueId
          }
        }
      });

      if (!assignment) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not assigned to this venue',
        });
      }

      const teamPlayer = await db.teamPlayer.findUnique({
        where: { id: input.playerId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      });

      if (!teamPlayer || teamPlayer.teamId !== input.teamId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Player not found in this team',
        });
      }

      const updatedPlayer = await db.teamPlayer.update({
        where: { id: input.playerId },
        data: {
          verificationStatus: input.status,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      });

      // CASCADE: Players → Team
      await cascadePlayerStatusToTeam(updatedPlayer.teamId);

      return updatedPlayer;
    }),

  // Promote Captain Mutation
  promoteCaptain: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      newCaptainId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify volunteer role
      if (!['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only volunteers can promote captains',
        });
      }

      const { teamId, newCaptainId } = input;

      return await db.$transaction(async (tx) => {
        // Check if team exists
        const team = await tx.team.findUnique({
          where: { id: teamId },
          include: {
            teamPlayers: {
              include: {
                user: true,
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

        // Find the new captain in team players
        const newCaptainPlayer = team.teamPlayers.find(
          (player) => player.userId === newCaptainId
        );

        if (!newCaptainPlayer) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'New captain must be a player in this team',
          });
        }

        // Update user role to captain
        await tx.user.update({
          where: { id: newCaptainId },
          data: { role: 'captain' },
        });

        // Update team captain
        const updatedTeam = await tx.team.update({
          where: { id: teamId },
          data: {
            captainId: newCaptainId,
            captainName: `${newCaptainPlayer.firstName} ${newCaptainPlayer.lastName}`,
          },
        });

        return updatedTeam;
      });
    }),

  // Update Team Status Mutation
  updateTeamStatus: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      status: z.enum(['draft', 'submitted', 'verified', 'rejected', 'checked_in']),
      venueId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify volunteer role
      if (!['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only volunteers can update team status',
        });
      }

      // Verify venue assignment
      const assignment = await db.volunteerAssignment.findFirst({
        where: { 
          volunteerId: ctx.user.id,
          deletedAt: null,
          venueLevelMapping: {
            venueId: input.venueId
          }
        }
      });

      if (!assignment) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not assigned to this venue',
        });
      }

      const updatedTeam = await db.team.update({
        where: { id: input.teamId },
        data: { status: input.status },
        include: {
          sport: true,
          captainUser: true,
          teamPlayers: true
        }
      });

      // CASCADE: Team → Players
      await cascadeTeamStatusToPlayers(input.teamId, input.status);

      return updatedTeam;
    }),

  // Team Check-in with cascading
  checkInTeam: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      venueId: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify volunteer role
      if (!['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only volunteers can check in teams',
        });
      }

      // Verify venue assignment
      const assignment = await db.volunteerAssignment.findFirst({
        where: { 
          volunteerId: ctx.user.id,
          deletedAt: null,
          venueLevelMapping: {
            venueId: input.venueId
          }
        }
      });

      if (!assignment) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not assigned to this venue',
        });
      }

      // Update team to checked_in
      const updatedTeam = await db.team.update({
        where: { id: input.teamId },
        data: { 
          status: 'checked_in',
        },
        include: {
          sport: true,
          captainUser: true,
          teamPlayers: true
        }
      });

      // CASCADE: Team → Players (checked_in → approved)
      await cascadeTeamStatusToPlayers(input.teamId, 'checked_in');

      return updatedTeam;
    }),
});
