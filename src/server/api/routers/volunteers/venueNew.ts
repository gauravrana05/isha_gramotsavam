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
          userId: ctx.user.id, 
          venueId: input.venueId,
          status: 'active'
        }
      });

      if (!assignment) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not assigned to this venue',
        });
      }

      // Get teams through fixture teams relationship
      const fixtureTeams = await db.fixtureTeam.findMany({
        where: {
          fixture: {
            venueLevelMapping: {
              venueId: input.venueId
            }
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

      // Extract unique teams with proper typing
      const uniqueTeams = new Map<string, TeamWithRelations>();
      fixtureTeams.forEach(ft => {
        if (ft.team && !uniqueTeams.has(ft.team.id)) {
          uniqueTeams.set(ft.team.id, ft.team);
        }
      });

      // Get verified players count for each team
      const teamIds = Array.from(uniqueTeams.keys());
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

      return Array.from(uniqueTeams.values()).map(team => ({
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
      eventId: z.string(),
    }).optional().default({}))
    .query(async ({ input }) => {
      const checkedInTeams = await db.fixtureTeam.findMany({
        where: {
          fixture: {
            venueLevelMapping: {
              venueId: input.venueId,
              eventId: input.eventId
            }
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
});
