import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, protectedProcedure } from '../../trpc'
import type { Team, User, Sport } from '@prisma/client'

// Define proper types for the response data
type TeamWithRelations = Team & {
  captainUser: Pick<User, 'firstName' | 'lastName' | 'phone'> | null;
  sport: Pick<Sport, 'name'> | null;
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
          players: {
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
              clusterVenueMapping: {
                venueId: input.venueId
              }
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
      // Fixed: Query through teamVenueAssignment instead of fixtureTeam
      const teamAssignments = await db.teamVenueAssignment.findMany({
        where: {
          clusterVenueMapping: {
            venueId: input.venueId
          }
        },
        include: {
          team: {
            include: {
              captainUser: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
              sport: {
                select: {
                  name: true,
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
            profileCompleted: true
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

      // Create team
      const team = await db.team.create({
        data: {
          name: teamData.name,
          description: teamData.description,
          sportId: teamData.sportId,
          captainId: captain.id,
          captainName: `${captainDetails.firstName} ${captainDetails.lastName}`,
          panchayat: location.panchayat,
          district: location.district,
          state: location.state,
          taluk: location.taluk,
          status: 'submitted',
          currentPlayers: 1,
          genderCategory: captainDetails.gender === 'F' ? 'women' : 'men'
        }
      });

      return { success: true, teamId: team.id };
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

      // Get checked-in teams grouped by sport for tournament creation
      const checkedInTeams = await db.team.findMany({
        where: {
          status: 'checked_in',
          teamVenueAssignments: {
            some: {
              clusterVenueMapping: {
                venueId: input.venueId
              }
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
        totalTeams: 0,
        matchesCompleted: 0,
        matchesTotal: 0,
        progress: 0
      };

      if (tournament) {
        stats.totalTeams = tournament.fixtureTeams.length;
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
          teams: stats.totalTeams,
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
});
