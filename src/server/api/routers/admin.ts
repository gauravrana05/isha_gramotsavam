import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";

export const adminRouter = createTRPCRouter({
  // Dashboard Overview
  getDashboardOverview: protectedProcedure
    .input(z.object({
      level: z.enum(['all', 'cluster', 'division', 'state']).default('all'),
      includeDetailed: z.boolean().default(false),
      refreshCache: z.boolean().default(false),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Teams stats
      const [totalTeams, verifiedTeams, rejectedTeams, draftTeams] = await Promise.all([
        db.team.count(),
        db.team.count({ where: { status: 'verified' } }),
        db.team.count({ where: { status: 'rejected' } }),
        db.team.count({ where: { status: 'draft' } }),
      ]);

      // Players stats  
      const [totalPlayers, verifiedPlayers, pendingPlayers] = await Promise.all([
        db.teamPlayer.count(),
        db.teamPlayer.count({ where: { verificationStatus: 'verified' } }),
        db.teamPlayer.count({ where: { verificationStatus: 'pending' } }),
      ]);

      // Average age calculation
      const playersWithAge = await db.teamPlayer.findMany({
        where: { age: { not: null } },
        select: { age: true }
      });
      const averageAge = playersWithAge.length > 0 
        ? playersWithAge.reduce((sum, p) => sum + (p.age || 0), 0) / playersWithAge.length 
        : 0;

      // Venues stats
      const [totalVenues, activeVenues] = await Promise.all([
        db.venue.count(),
        db.venue.count({ where: { isActive: true } }),
      ]);

      // Matches stats
      const [totalMatches, completedMatches, inProgressMatches, scheduledMatches] = await Promise.all([
        db.match.count(),
        db.match.count({ where: { status: 'completed' } }),
        db.match.count({ where: { status: 'in_progress' } }),
        db.match.count({ where: { status: 'scheduled' } }),
      ]);

      // System health calculation
      const verificationRate = totalTeams > 0 ? (verifiedTeams / totalTeams) * 100 : 0;
      const utilizationRate = totalVenues > 0 ? (activeVenues / totalVenues) * 100 : 0;
      const backlogDays = Math.ceil(pendingPlayers / Math.max(verifiedPlayers / 30, 1)); // Rough estimate

      const systemScore = Math.round(
        (verificationRate * 0.4) + (utilizationRate * 0.3) + (Math.min(100 - backlogDays, 100) * 0.3)
      );
      
      const systemHealth = systemScore >= 80 ? 'healthy' : systemScore >= 60 ? 'warning' : 'critical';

      // Insights
      const insights = [];
      if (verificationRate < 50) {
        insights.push({
          type: 'alert',
          category: 'verification',
          message: `Low verification rate: ${verificationRate.toFixed(1)}%`,
          action: 'Review verification process'
        });
      }
      if (backlogDays > 7) {
        insights.push({
          type: 'warning',
          category: 'backlog',
          message: `High verification backlog: ${backlogDays} days`,
          action: 'Increase verification capacity'
        });
      }

      return {
        success: true,
        overview: {
          teams: {
            total: totalTeams,
            verified: verifiedTeams,
            rejected: rejectedTeams,
            draft: draftTeams,
            verificationRate: Math.round(verificationRate)
          },
          players: {
            total: totalPlayers,
            verified: verifiedPlayers,
            pending: pendingPlayers,
            averageAge: Math.round(averageAge)
          },
          verification: {
            pending: pendingPlayers,
            backlogDays: backlogDays
          },
          venues: {
            total: totalVenues,
            active: activeVenues,
            utilizationRate: Math.round(utilizationRate)
          },
          matches: {
            total: totalMatches,
            completed: completedMatches,
            inProgress: inProgressMatches,
            scheduled: scheduledMatches
          },
          systemHealth: {
            overall: systemHealth,
            score: systemScore,
            issues: insights.map(i => i.message)
          },
          insights
        }
      };
    }),

  // Tournament Overview
  getTournamentOverview: protectedProcedure
    .input(z.object({
      level: z.enum(['all', 'cluster', 'division', 'final']).default('all'),
      status: z.enum(['all', 'active', 'completed']).default('all'),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const [totalFixtures, activeFixtures, completedFixtures] = await Promise.all([
        db.fixture.count(),
        db.fixture.count({ where: { status: 'teams_assigned' } }),
        db.fixture.count({ where: { status: 'completed' } }),
      ]);

      const [totalMatches, completedMatches, inProgressMatches, scheduledMatches] = await Promise.all([
        db.match.count(),
        db.match.count({ where: { status: 'completed' } }),
        db.match.count({ where: { status: 'in_progress' } }),
        db.match.count({ where: { status: 'scheduled' } }),
      ]);

      // Teams progression stats
      // Teams progression stats - Using TeamVenueAssignment for progression tracking
      const clusterToDiv = await db.teamVenueAssignment.count({
        where: { divisionQualified: true }
      });
      const divToFinal = await db.teamVenueAssignment.count({
        where: { finalQualified: true }
      });

      const overallProgress = totalFixtures > 0 ? (completedFixtures / totalFixtures) * 100 : 0;

      return {
        success: true,
        tournament: {
          stats: {
            fixtures: {
              total: totalFixtures,
              active: activeFixtures,
              completed: completedFixtures
            },
            matches: {
              total: totalMatches,
              completed: completedMatches,
              inProgress: inProgressMatches,
              scheduled: scheduledMatches
            },
            progression: {
              clusterToDiv,
              divToFinal
            }
          },
          summary: {
            activeFixtures,
            completedTournaments: completedFixtures,
            teamsAdvanced: clusterToDiv + divToFinal,
            overallProgress: Math.round(overallProgress)
          },
          insights: []
        }
      };
    }),

  // Users Management
  getUsers: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
      role: z.enum(['all', 'admin', 'captain', 'player', 'general_volunteer', 'technical_volunteer', 'verification_volunteer', 'volunteer']).default('all'),
      gender: z.enum(['all', 'M', 'F', 'O']).default('all'),
      district: z.string().optional(),
      isVerified: z.enum(['all', 'verified', 'pending']).default('all'),
      isProfileComplete: z.enum(['all', 'complete', 'incomplete']).default('all'),
      searchQuery: z.string().optional(),
      sortBy: z.enum(['firstName', 'createdAt', 'role']).default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {};

      // Role filter
      if (input.role !== 'all') {
        if (input.role === 'volunteer') {
          where.role = {
            in: ['general_volunteer', 'technical_volunteer', 'verification_volunteer']
          };
        } else {
          where.role = input.role;
        }
      }

      // Gender filter
      if (input.gender !== 'all') {
        where.gender = input.gender;
      }

      // District filter
      if (input.district) {
        where.district = {
          contains: input.district,
          mode: 'insensitive'
        };
      }

      // Verification filter - using UserVerification relation
      if (input.isVerified !== 'all') {
        where.userVerifications = {
          some: {
            status: input.isVerified === 'verified' ? 'verified' : { not: 'verified' }
          }
        };
      }

      // Profile completeness filter
      if (input.isProfileComplete !== 'all') {
        where.profileComplete = input.isProfileComplete === 'complete';
      }

      // Search filter
      if (input.searchQuery) {
        where.OR = [
          { firstName: { contains: input.searchQuery, mode: 'insensitive' } },
          { lastName: { contains: input.searchQuery, mode: 'insensitive' } },
          { phone: { contains: input.searchQuery } },
          { email: { contains: input.searchQuery, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        db.user.findMany({
          where,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            role: true,
            gender: true,
            panchayat: true,
            district: true,
            state: true,
            userVerifications: true,
            profileComplete: true,
            createdAt: true,
          },
          orderBy: {
            [input.sortBy]: input.sortOrder
          },
          skip: input.offset,
          take: input.limit,
        }),
        db.user.count({ where }),
      ]);

      return {
        success: true,
        users: users.map(user => ({
          id: user.id,
          uid: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phone,
          email: user.email,
          role: user.role,
          gender: user.gender,
          panchayat: user.panchayat,
          district: user.district,
          state: user.state,
          isProfileComplete: user.profileComplete,
          createdAt: user.createdAt?.toISOString() || null,
        })),
        pagination: {
          total,
          hasMore: input.offset + input.limit < total,
          currentPage: Math.floor(input.offset / input.limit) + 1,
          totalPages: Math.ceil(total / input.limit)
        }
      };
    }),

  // Admin Teams
  getAdminTeams: protectedProcedure
    .input(z.object({
      limit: z.number().default(25),
      offset: z.number().default(0),
      status: z.enum(['all', 'draft', 'submitted', 'verified', 'rejected', 'checked_in']).default('all'),
      sportName: z.string().optional(),
      district: z.string().optional(),
      genderCategory: z.enum(['all', 'men', 'women', 'mixed']).default('all'),
      searchQuery: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {};

      if (input.status !== 'all') {
        where.status = input.status;
      }

      if (input.sportName) {
        where.sport = {
          name: {
            contains: input.sportName,
            mode: 'insensitive'
          }
        };
      }

      if (input.district) {
        where.district = {
          contains: input.district,
          mode: 'insensitive'
        };
      }

      if (input.genderCategory !== 'all') {
        where.genderCategory = input.genderCategory;
      }

      if (input.searchQuery) {
        where.OR = [
          { name: { contains: input.searchQuery, mode: 'insensitive' } },
          { panchayat: { contains: input.searchQuery, mode: 'insensitive' } },
          { district: { contains: input.searchQuery, mode: 'insensitive' } },
        ];
      }

      const [teams, total] = await Promise.all([
        db.team.findMany({
          where,
          include: {
            sport: { select: { name: true } },
            captainUser: { select: { firstName: true, lastName: true, phone: true } },
            teamPlayers: { select: { id: true } },
            teamVenueAssignments: {
              include: {
                clusterVenueMapping: {
                  include: {
                    venue: { select: { name: true } }
                  }
                }
              },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: input.offset,
          take: input.limit,
        }),
        db.team.count({ where }),
      ]);

      return {
        success: true,
        teams: teams.map(team => ({
          id: team.id,
          name: team.name,
          sportName: team.sport?.name || 'Unknown',
          sportId: team.sportId,
          captainProfile: {
            name: team.captainUser ? `${team.captainUser.firstName} ${team.captainUser.lastName}`.trim() : 'N/A',
            phone: team.captainUser?.phone || 'N/A',
          },
          panchayat: team.panchayat,
          district: team.district,
          state: team.state,
          genderCategory: team.genderCategory,
          currentPlayers: team.teamPlayers.length,
          maxPlayers: team.currentPlayers + team.currentSubstitutes,
          status: team.status,
          createdAt: team.createdAt,
          eventId: team.eventId,
          currentVenueAssignment: team.teamVenueAssignments[0] ? {
            venueId: team.teamVenueAssignments[0].clusterVenueMappingId,
            venueName: team.teamVenueAssignments[0].clusterVenueMapping?.venue?.name || 'Unknown',
            assignmentLevel: team.teamVenueAssignments[0].level,
            assignedAt: team.teamVenueAssignments[0].createdAt?.toISOString() || null,
          } : undefined,
        })),
        pagination: {
          total,
          hasMore: input.offset + input.limit < total,
        }
      };
    }),

  // Admin Team Stats
  getAdminTeamStats: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const [
        total,
        verificationStats,
        playerStats,
        sportStats,
        districtStats
      ] = await Promise.all([
        db.team.count(),
        
        // Verification stats
        db.team.groupBy({
          by: ['status'],
          _count: { _all: true }
        }).then(groups => {
          const stats: any = {};
          groups.forEach(group => {
            stats[group.status] = group._count._all;
          });
          return {
            draft: stats.draft || 0,
            submitted: stats.submitted || 0,
            verified: stats.verified || 0,
            rejected: stats.rejected || 0,
            checkedIn: stats.checked_in || 0,
            fullyVerified: stats.verified || 0,
          };
        }),

        // Player stats
        Promise.all([
          db.teamPlayer.count(),
          db.team.aggregate({
            _avg: { currentPlayers: true, currentSubstitutes: true }
          }),
          db.team.findMany({
            include: { teamPlayers: true }
          }).then(teams => {
            const playersPerTeam = teams.map(t => t.teamPlayers.length);
            return {
              averagePlayersPerTeam: playersPerTeam.length > 0 
                ? playersPerTeam.reduce((a, b) => a + b, 0) / playersPerTeam.length 
                : 0
            };
          })
        ]).then(([totalPlayers, avgMaxPlayers, avgStats]) => ({
          totalPlayers,
          averageMaxPlayers: (avgMaxPlayers._avg.currentPlayers || 0) + (avgMaxPlayers._avg.currentSubstitutes || 0),
          averagePlayersPerTeam: avgStats.averagePlayersPerTeam,
        })),

        // By sport
        db.team.groupBy({
          by: ['sportId'],
          _count: { _all: true }
        }).then(async groups => {
          const bySport: Record<string, number> = {};
          for (const group of groups) {
            const sport = await db.sport.findUnique({
              where: { id: group.sportId },
              select: { name: true }
            });
            if (sport) {
              bySport[sport.name] = group._count._all;
            }
          }
          return bySport;
        }),

        // By district
        db.team.groupBy({
          by: ['district'],
          _count: { _all: true }
        }).then(groups => {
          const byDistrict: Record<string, number> = {};
          groups.forEach(group => {
            if (group.district) {
              byDistrict[group.district] = group._count._all;
            }
          });
          return byDistrict;
        }),
      ]);

      return {
        success: true,
        stats: {
          total,
          verificationStats,
          playerStats,
          bySport: sportStats,
          byDistrict: districtStats,
        }
      };
    }),

  // Venues Management
  getVenues: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
      status: z.enum(['all', 'active', 'inactive']).default('all'),
      district: z.string().optional(),
      searchQuery: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {};

      if (input.status !== 'all') {
        where.isActive = input.status === 'active';
      }

      if (input.district) {
        where.district = {
          contains: input.district,
          mode: 'insensitive'
        };
      }

      if (input.searchQuery) {
        where.OR = [
          { name: { contains: input.searchQuery, mode: 'insensitive' } },
          { address: { contains: input.searchQuery, mode: 'insensitive' } },
        ];
      }

      const [venues, total] = await Promise.all([
        db.venue.findMany({
          where,
          include: {
            venueLocationMappings: {
              include: {
                _count: {
                  select: {
                    teamVenueAssignmentsByCluster: true,
                    teamVenueAssignmentsByDivision: true,
                    teamVenueAssignmentsByFinal: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: input.offset,
          take: input.limit,
        }),
        db.venue.count({ where }),
      ]);

      return {
        success: true,
        venues: venues.map(venue => {
          const totalAssignments = venue.venueLocationMappings.reduce((sum, mapping) => 
            sum + (mapping._count?.teamVenueAssignmentsByCluster || 0) +
            (mapping._count?.teamVenueAssignmentsByDivision || 0) +
            (mapping._count?.teamVenueAssignmentsByFinal || 0), 0
          );
          return {
            id: venue.id,
            name: venue.name,
            address: `${venue.panchayat || ''} ${venue.taluk || ''}`.trim(),
            district: venue.district,
            state: venue.state,
            capacity: venue.capacity,
            status: venue.isActive ? 'active' : 'inactive',
            assignedTeams: totalAssignments,
            createdAt: venue.createdAt?.toISOString() || null,
          };
        }),
        pagination: {
          total,
          hasMore: input.offset + input.limit < total,
        }
      };
    }),

  // Sports Management
  getSports: protectedProcedure
    .input(z.object({
      includeTeamCounts: z.boolean().default(true),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const sports = await db.sport.findMany({
        include: input.includeTeamCounts ? {
          _count: {
            select: {
              teams: true
            }
          }
        } : {},
        orderBy: { name: 'asc' }
      });

      return {
        success: true,
        sports: sports.map(sport => ({
          id: sport.id,
          name: sport.name,
          description: sport.description,
          maxPlayers: sport.mainPlayersCount + sport.maxSubstitutes,
          teamCount: input.includeTeamCounts ? sport._count?.teams || 0 : undefined,
          createdAt: sport.createdAt?.toISOString() || null,
        }))
      };
    }),

  createSport: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      maxPlayers: z.number().int().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const sport = await db.sport.create({
        data: {
          name: input.name,
          description: input.description,
          mainPlayersCount: input.maxPlayers,
          maxSubstitutes: 0,
        }
      });

      return {
        success: true,
        sport: {
          id: sport.id,
          name: sport.name,
          description: sport.description,
          maxPlayers: sport.mainPlayersCount + sport.maxSubstitutes,
        }
      };
    }),

  updateSport: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      maxPlayers: z.number().int().positive().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const updateData: any = {};
      if (input.name) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.maxPlayers) updateData.mainPlayersCount = input.maxPlayers;

      const sport = await db.sport.update({
        where: { id: input.id },
        data: updateData
      });

      return {
        success: true,
        sport: {
          id: sport.id,
          name: sport.name,
          description: sport.description,
          maxPlayers: sport.mainPlayersCount + sport.maxSubstitutes,
        }
      };
    }),

  deleteSport: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Check if sport has teams
      const teamCount = await db.team.count({
        where: { sportId: input.id }
      });

      if (teamCount > 0) {
        throw new TRPCError({ 
          code: 'PRECONDITION_FAILED', 
          message: `Cannot delete sport with ${teamCount} registered teams` 
        });
      }

      await db.sport.delete({
        where: { id: input.id }
      });

      return {
        success: true,
        message: 'Sport deleted successfully'
      };
    }),

  // Fixtures & Matches Management
  getFixtures: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
      status: z.enum(['all', 'draft', 'active', 'completed']).default('all'),
      sportId: z.string().optional(),
      level: z.enum(['all', 'cluster', 'division', 'final']).default('all'),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {};

      if (input.status !== 'all') {
        where.status = input.status;
      }

      if (input.sportId) {
        where.sport_id = input.sportId;
      }

      if (input.level !== 'all') {
        where.level = input.level;
      }

      const [fixtures, total] = await Promise.all([
        db.fixtures.findMany({
          where,
          include: {
            sports: { select: { name: true } },
            events: { select: { name: true } },
            _count: {
              select: {
                matches: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: input.offset,
          take: input.limit,
        }),
        db.fixtures.count({ where }),
      ]);

      return {
        success: true,
        fixtures: fixtures.map(fixture => ({
          id: fixture.id,
          name: fixture.name,
          sportName: fixture.sports?.name || 'Unknown',
          eventName: fixture.events?.name || 'Unknown',
          level: fixture.level,
          status: fixture.status,
          startDate: fixture.start_date?.toISOString() || null,
          endDate: fixture.end_date?.toISOString() || null,
          matchCount: fixture._count.matches,
          createdAt: fixture.createdAt?.toISOString() || null,
        })),
        pagination: {
          total,
          hasMore: input.offset + input.limit < total,
        }
      };
    }),

  // Events Management
  getEvents: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
      status: z.enum(['all', 'draft', 'active', 'completed']).default('all'),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {};

      if (input.status !== 'all') {
        where.status = input.status;
      }

      const [events, total] = await Promise.all([
        db.events.findMany({
          where,
          include: {
            _count: {
              select: {
                teams: true,
                fixtures: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: input.offset,
          take: input.limit,
        }),
        db.events.count({ where }),
      ]);

      return {
        success: true,
        events: events.map(event => ({
          id: event.id,
          name: event.name,
          description: event.description,
          status: event.status,
          startDate: event.start_date?.toISOString() || null,
          endDate: event.end_date?.toISOString() || null,
          registrationDeadline: event.registration_deadline?.toISOString() || null,
          teamCount: event._count.teams,
          fixtureCount: event._count.fixtures,
          createdAt: event.createdAt?.toISOString() || null,
        })),
        pagination: {
          total,
          hasMore: input.offset + input.limit < total,
        }
      };
    }),

  // User Management Actions
  updateUserRole: protectedProcedure
    .input(z.object({
      userId: z.string().uuid(),
      role: z.enum(['admin', 'captain', 'player', 'general_volunteer', 'technical_volunteer', 'verification_volunteer']),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const user = await db.users.update({
        where: { id: input.userId },
        data: { role: input.role }
      });

      return {
        success: true,
        message: `User role updated to ${input.role}`,
        user: {
          id: user.id,
          role: user.role,
        }
      };
    }),

  verifyUser: protectedProcedure
    .input(z.object({
      userId: z.string().uuid(),
      isVerified: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const user = await db.users.update({
        where: { id: input.userId },
        data: { is_verified: input.isVerified }
      });

      return {
        success: true,
        message: `User ${input.isVerified ? 'verified' : 'unverified'} successfully`,
        user: {
          id: user.id,
          isVerified: user.is_verified,
        }
      };
    }),
});