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
        where: { 
          age: { 
            gt: 0 
          } 
        },
        select: { age: true }
      });
      const averageAge = playersWithAge.length > 0 
        ? Math.round(playersWithAge.reduce((sum, p) => sum + (p.age || 0), 0) / playersWithAge.length)
        : 0;

      // Enhanced Venues stats with multi-level mapping
      const [totalVenues, activeVenues, venueLocationMappings] = await Promise.all([
        db.venue.count(),
        db.venue.count({ where: { isActive: true } }),
        db.venueLocationMapping.groupBy({
          by: ['level'],
          where: { isActive: true },
          _count: { _all: true }
        })
      ]);

      const venuesByLevel = venueLocationMappings.reduce((acc, mapping) => {
        acc[mapping.level] = mapping._count._all;
        return acc;
      }, {} as Record<string, number>);

      // Team venue assignment stats
      const teamVenueStats = await db.teamVenueAssignment.groupBy({
        by: ['level'],
        _count: { _all: true }
      });

      const teamsAssignedByLevel = teamVenueStats.reduce((acc, stat) => {
        acc[stat.level] = stat._count._all;
        return acc;
      }, {} as Record<string, number>);

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
            utilizationRate: Math.round(utilizationRate),
            byLevel: venuesByLevel,
            mappings: {
              cluster: venuesByLevel.cluster || 0,
              division: venuesByLevel.division || 0,
              final: venuesByLevel.final || 0
            }
          },
          venueAssignments: {
            byLevel: teamsAssignedByLevel,
            cluster: teamsAssignedByLevel.cluster || 0,
            division: teamsAssignedByLevel.division || 0,
            final: teamsAssignedByLevel.final || 0
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

      const where: any = {
        deletedAt: null // Only show non-deleted venues
      };

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
      includeGenderCategories: z.boolean().default(true),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const whereCondition: any = {
        deletedAt: null // Only show non-deleted sports
      };
      if (input.isActive !== undefined) {
        whereCondition.isActive = input.isActive;
      }

      const sports = await db.sport.findMany({
        where: whereCondition,
        include: {
          ...(input.includeTeamCounts ? {
            _count: {
              select: {
                teams: true,
                fixtures: true,
                matches: true
              }
            }
          } : {}),
          ...(input.includeGenderCategories ? {
            sportGenderCategories: {
              select: {
                genderCategory: true
              }
            }
          } : {})
        },
        orderBy: { name: 'asc' }
      });

      return {
        success: true,
        sports: sports.map(sport => ({
          id: sport.id,
          name: sport.name,
          description: sport.description,
          mainPlayersCount: sport.mainPlayersCount,
          maxSubstitutes: sport.maxSubstitutes,
          maxPlayers: sport.mainPlayersCount + sport.maxSubstitutes,
          isActive: sport.isActive,
          genderCategories: input.includeGenderCategories 
            ? sport.sportGenderCategories?.map(sg => sg.genderCategory) || []
            : undefined,
          teamCount: input.includeTeamCounts ? sport._count?.teams || 0 : undefined,
          fixtureCount: input.includeTeamCounts ? sport._count?.fixtures || 0 : undefined,
          matchCount: input.includeTeamCounts ? sport._count?.matches || 0 : undefined,
          createdAt: sport.createdAt?.toISOString() || null,
          updatedAt: sport.updatedAt?.toISOString() || null,
        }))
      };
    }),

  createSport: protectedProcedure
    .input(z.object({
      name: z.string().min(1, 'Sport name is required'),
      description: z.string().optional(),
      mainPlayersCount: z.number().int().min(1, 'Must have at least 1 main player').max(50, 'Too many players'),
      maxSubstitutes: z.number().int().min(0).max(20, 'Too many substitutes').default(0),
      genderCategories: z.array(z.enum(['men', 'women', 'mixed'])).min(1, 'At least one gender category required').default(['men', 'women']),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Check if sport with same name exists
      const existingSport = await db.sport.findFirst({
        where: { name: { equals: input.name, mode: 'insensitive' } }
      });

      if (existingSport) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Sport with this name already exists' });
      }

      // Create sport with gender categories
      const sport = await db.sport.create({
        data: {
          name: input.name,
          description: input.description,
          mainPlayersCount: input.mainPlayersCount,
          maxSubstitutes: input.maxSubstitutes,
          isActive: input.isActive,
          sportGenderCategories: {
            create: input.genderCategories.map(category => ({
              genderCategory: category
            }))
          }
        },
        include: {
          sportGenderCategories: {
            select: { genderCategory: true }
          }
        }
      });

      return {
        success: true,
        sport: {
          id: sport.id,
          name: sport.name,
          description: sport.description,
          mainPlayersCount: sport.mainPlayersCount,
          maxSubstitutes: sport.maxSubstitutes,
          maxPlayers: sport.mainPlayersCount + sport.maxSubstitutes,
          isActive: sport.isActive,
          genderCategories: sport.sportGenderCategories.map(sg => sg.genderCategory),
          createdAt: sport.createdAt?.toISOString() || null,
        }
      };
    }),

  updateSport: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      mainPlayersCount: z.number().int().min(1).max(50).optional(),
      maxSubstitutes: z.number().int().min(0).max(20).optional(),
      genderCategories: z.array(z.enum(['men', 'women', 'mixed'])).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Check if sport exists
      const existingSport = await db.sport.findUnique({
        where: { id: input.id },
        include: { sportGenderCategories: true }
      });

      if (!existingSport) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sport not found' });
      }

      // Check name uniqueness if name is being updated
      if (input.name && input.name !== existingSport.name) {
        const duplicateName = await db.sport.findFirst({
          where: { 
            name: { equals: input.name, mode: 'insensitive' },
            id: { not: input.id }
          }
        });

        if (duplicateName) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Sport with this name already exists' });
        }
      }

      const updateData: any = {};
      if (input.name) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.mainPlayersCount) updateData.mainPlayersCount = input.mainPlayersCount;
      if (input.maxSubstitutes !== undefined) updateData.maxSubstitutes = input.maxSubstitutes;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      // Handle gender categories update
      if (input.genderCategories) {
        updateData.sportGenderCategories = {
          deleteMany: {},
          create: input.genderCategories.map(category => ({
            genderCategory: category
          }))
        };
      }

      const sport = await db.sport.update({
        where: { id: input.id },
        data: updateData,
        include: {
          sportGenderCategories: {
            select: { genderCategory: true }
          }
        }
      });

      return {
        success: true,
        sport: {
          id: sport.id,
          name: sport.name,
          description: sport.description,
          mainPlayersCount: sport.mainPlayersCount,
          maxSubstitutes: sport.maxSubstitutes,
          maxPlayers: sport.mainPlayersCount + sport.maxSubstitutes,
          isActive: sport.isActive,
          genderCategories: sport.sportGenderCategories.map(sg => sg.genderCategory),
          updatedAt: sport.updatedAt?.toISOString() || null,
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

      // Check if sport exists and is not already deleted
      const existingSport = await db.sport.findFirst({
        where: { 
          id: input.id,
          deletedAt: null 
        }
      });

      if (!existingSport) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Sport not found or already deleted' 
        });
      }

      // Perform soft delete
      await db.sport.update({
        where: { id: input.id },
        data: { 
          deletedAt: new Date(),
          // Note: Sport model does&apos;t have deletedBy field in schema
        }
      });

      return {
        success: true,
        message: 'Sport deleted successfully'
      };
    }),

  getSportById: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const sport = await db.sport.findUnique({
        where: { id: input.id },
        include: {
          sportGenderCategories: {
            select: { genderCategory: true }
          },
          _count: {
            select: {
              teams: true,
              fixtures: true,
              matches: true
            }
          }
        }
      });

      if (!sport) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sport not found' });
      }

      return {
        success: true,
        sport: {
          id: sport.id,
          name: sport.name,
          description: sport.description,
          mainPlayersCount: sport.mainPlayersCount,
          maxSubstitutes: sport.maxSubstitutes,
          maxPlayers: sport.mainPlayersCount + sport.maxSubstitutes,
          isActive: sport.isActive,
          genderCategories: sport.sportGenderCategories.map(sg => sg.genderCategory),
          teamCount: sport._count.teams,
          fixtureCount: sport._count.fixtures,
          matchCount: sport._count.matches,
          createdAt: sport.createdAt?.toISOString() || null,
          updatedAt: sport.updatedAt?.toISOString() || null,
        }
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
        where.sportId = input.sportId;
      }

      if (input.level !== 'all') {
        where.level = input.level;
      }

      const [fixtures, total] = await Promise.all([
        db.fixture.findMany({
          where,
          include: {
            sport: { select: { name: true } },
            event: { select: { name: true } },
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
        db.fixture.count({ where }),
      ]);

      return {
        success: true,
        fixtures: fixtures.map(fixture => ({
          id: fixture.id,
          name: fixture.name,
          sportName: fixture.sport?.name || 'Unknown',
          eventName: fixture.event?.name || 'Unknown',
          level: fixture.level,
          status: fixture.status,
          startDate: fixture.startDate?.toISOString() || null,
          endDate: fixture.endDate?.toISOString() || null,
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
      status: z.enum(['all', 'draft', 'registration_open', 'registration_closed', 'active', 'completed', 'cancelled']).default('all'),
      searchQuery: z.string().optional(),
      includeStats: z.boolean().default(true),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {
        deletedAt: null // Only show non-deleted events
      };

      if (input.status !== 'all') {
        where.status = input.status;
      }

      if (input.searchQuery) {
        where.OR = [
          { name: { contains: input.searchQuery, mode: 'insensitive' } },
          { description: { contains: input.searchQuery, mode: 'insensitive' } }
        ];
      }

      const [events, total] = await Promise.all([
        db.event.findMany({
          where,
          include: {
            createdByUser: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            ...(input.includeStats ? {
              _count: {
                select: {
                  teams: true,
                  fixtures: true,
                  matches: true,
                  venueLocationMappings: true
                }
              }
            } : {})
          },
          orderBy: { createdAt: 'desc' },
          skip: input.offset,
          take: input.limit,
        }),
        db.event.count({ where }),
      ]);

      return {
        success: true,
        events: events.map(event => ({
          id: event.id,
          name: event.name,
          description: event.description,
          status: event.status,
          registrationStartDate: event.registrationStartDate?.toISOString() || null,
          registrationEndDate: event.registrationEndDate?.toISOString() || null,
          startDate: event.startDate?.toISOString() || null,
          endDate: event.endDate?.toISOString() || null,
          createdBy: event.createdBy,
          createdByName: event.createdByUser ? `${event.createdByUser.firstName} ${event.createdByUser.lastName}`.trim() : 'Unknown',
          teamCount: input.includeStats ? event._count?.teams || 0 : undefined,
          fixtureCount: input.includeStats ? event._count?.fixtures || 0 : undefined,
          matchCount: input.includeStats ? event._count?.matches || 0 : undefined,
          venueCount: input.includeStats ? event._count?.venueLocationMappings || 0 : undefined,
          createdAt: event.createdAt?.toISOString() || null,
          updatedAt: event.updatedAt?.toISOString() || null,
        })),
        pagination: {
          total,
          hasMore: input.offset + input.limit < total,
        }
      };
    }),

  createEvent: protectedProcedure
    .input(z.object({
      name: z.string().min(1, 'Event name is required').max(200, 'Event name too long'),
      description: z.string().optional(),
      registrationStartDate: z.string().datetime('Invalid registration start date'),
      registrationEndDate: z.string().datetime('Invalid registration end date'),
      startDate: z.string().datetime('Invalid start date'),
      endDate: z.string().datetime('Invalid end date'),
      status: z.enum(['draft', 'registration_open', 'registration_closed', 'active', 'completed', 'cancelled']).default('draft'),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Validate date logic
      const regStart = new Date(input.registrationStartDate);
      const regEnd = new Date(input.registrationEndDate);
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);

      if (regEnd <= regStart) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Registration end date must be after start date' });
      }

      if (start < regStart) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Event start date must be after registration start date' });
      }

      if (end <= start) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Event end date must be after start date' });
      }

      const event = await db.event.create({
        data: {
          name: input.name,
          description: input.description,
          registrationStartDate: regStart,
          registrationEndDate: regEnd,
          startDate: start,
          endDate: end,
          status: input.status,
          createdBy: ctx.user.id,
        },
        include: {
          createdByUser: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return {
        success: true,
        event: {
          id: event.id,
          name: event.name,
          description: event.description,
          status: event.status,
          registrationStartDate: event.registrationStartDate?.toISOString() || null,
          registrationEndDate: event.registrationEndDate?.toISOString() || null,
          startDate: event.startDate?.toISOString() || null,
          endDate: event.endDate?.toISOString() || null,
          createdBy: event.createdBy,
          createdByName: event.createdByUser ? `${event.createdByUser.firstName} ${event.createdByUser.lastName}`.trim() : 'Unknown',
          createdAt: event.createdAt?.toISOString() || null,
        }
      };
    }),

  updateEvent: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().optional(),
      registrationStartDate: z.string().datetime().optional(),
      registrationEndDate: z.string().datetime().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      status: z.enum(['draft', 'registration_open', 'registration_closed', 'active', 'completed', 'cancelled']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Check if event exists and is not deleted
      const existingEvent = await db.event.findFirst({
        where: { 
          id: input.id,
          deletedAt: null 
        }
      });

      if (!existingEvent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found or has been deleted' });
      }

      const updateData: any = {};
      if (input.name) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.status) updateData.status = input.status;

      // Handle date updates with validation
      if (input.registrationStartDate) updateData.registrationStartDate = new Date(input.registrationStartDate);
      if (input.registrationEndDate) updateData.registrationEndDate = new Date(input.registrationEndDate);
      if (input.startDate) updateData.startDate = new Date(input.startDate);
      if (input.endDate) updateData.endDate = new Date(input.endDate);

      // Simple date validation (can be enhanced)
      if (updateData.registrationEndDate && updateData.registrationStartDate && 
          updateData.registrationEndDate <= updateData.registrationStartDate) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Registration end date must be after start date' });
      }

      const event = await db.event.update({
        where: { id: input.id },
        data: updateData,
        include: {
          createdByUser: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return {
        success: true,
        event: {
          id: event.id,
          name: event.name,
          description: event.description,
          status: event.status,
          registrationStartDate: event.registrationStartDate?.toISOString() || null,
          registrationEndDate: event.registrationEndDate?.toISOString() || null,
          startDate: event.startDate?.toISOString() || null,
          endDate: event.endDate?.toISOString() || null,
          createdBy: event.createdBy,
          createdByName: event.createdByUser ? `${event.createdByUser.firstName} ${event.createdByUser.lastName}`.trim() : 'Unknown',
          updatedAt: event.updatedAt?.toISOString() || null,
        }
      };
    }),

  deleteEvent: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Check if event exists and is not already deleted
      const existingEvent = await db.event.findFirst({
        where: { 
          id: input.id,
          deletedAt: null 
        }
      });

      if (!existingEvent) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Event not found or already deleted' 
        });
      }

      // Perform soft delete
      await db.event.update({
        where: { id: input.id },
        data: { 
          deletedAt: new Date(),
          deletedBy: ctx.user.id
        }
      });

      return {
        success: true,
        message: 'Event removed successfully'
      };
    }),

  getEventById: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const event = await db.event.findFirst({
        where: { 
          id: input.id,
          deletedAt: null 
        },
        include: {
          createdByUser: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              teams: true,
              fixtures: true,
              matches: true,
              venueLocationMappings: true,
              talukClusterMappings: true
            }
          }
        }
      });

      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }

      return {
        success: true,
        event: {
          id: event.id,
          name: event.name,
          description: event.description,
          status: event.status,
          registrationStartDate: event.registrationStartDate?.toISOString() || null,
          registrationEndDate: event.registrationEndDate?.toISOString() || null,
          startDate: event.startDate?.toISOString() || null,
          endDate: event.endDate?.toISOString() || null,
          createdBy: event.createdBy,
          createdByName: event.createdByUser ? `${event.createdByUser.firstName} ${event.createdByUser.lastName}`.trim() : 'Unknown',
          teamCount: event._count.teams,
          fixtureCount: event._count.fixtures,
          matchCount: event._count.matches,
          venueCount: event._count.venueLocationMappings,
          mappingCount: event._count.talukClusterMappings,
          createdAt: event.createdAt?.toISOString() || null,
          updatedAt: event.updatedAt?.toISOString() || null,
        }
      };
    }),

  // VenueLocationMapping Management
  getVenueLocationMappings: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid().optional(),
      level: z.enum(['all', 'cluster', 'division', 'final']).default('all'),
      isActive: z.boolean().optional(),
      venueId: z.string().uuid().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {
        deletedAt: null // Only show non-deleted venue location mappings
      };
      if (input.eventId) where.eventId = input.eventId;
      if (input.level !== 'all') where.level = input.level;
      if (input.isActive !== undefined) where.isActive = input.isActive;
      if (input.venueId) where.venueId = input.venueId;

      const [mappings, total] = await Promise.all([
        db.venueLocationMapping.findMany({
          where,
          include: {
            event: {
              select: {
                name: true
              }
            },
            venue: {
              select: {
                name: true,
                district: true,
                state: true,
                capacity: true
              }
            },
            _count: {
              select: {
                teamVenueAssignmentsByCluster: true,
                teamVenueAssignmentsByDivision: true,
                teamVenueAssignmentsByFinal: true,
                fixtures: true,
                matches: true
              }
            }
          },
          orderBy: [
            { level: 'asc' },
            { venue: { name: 'asc' } }
          ],
          skip: input.offset,
          take: input.limit,
        }),
        db.venueLocationMapping.count({ where }),
      ]);

      return {
        success: true,
        mappings: mappings.map(mapping => ({
          id: mapping.id,
          eventId: mapping.eventId,
          eventName: mapping.event?.name || 'Unknown',
          venueId: mapping.venueId,
          venueName: mapping.venue?.name || 'Unknown',
          venueDistrict: mapping.venue?.district || '',
          venueState: mapping.venue?.state || '',
          venueCapacity: mapping.venue?.capacity || null,
          level: mapping.level,
          maxTeams: mapping.maxTeams || 64, // Default as requested
          isActive: mapping.isActive,
          assignedTeams: {
            cluster: mapping._count.teamVenueAssignmentsByCluster,
            division: mapping._count.teamVenueAssignmentsByDivision,
            final: mapping._count.teamVenueAssignmentsByFinal
          },
          fixtureCount: mapping._count.fixtures,
          matchCount: mapping._count.matches,
          createdAt: mapping.createdAt?.toISOString() || null,
          updatedAt: mapping.updatedAt?.toISOString() || null,
        })),
        pagination: {
          total,
          hasMore: input.offset + input.limit < total,
        }
      };
    }),

  createVenueLocationMapping: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      venueId: z.string().uuid(),
      level: z.enum(['cluster', 'division', 'final']),
      maxTeams: z.number().int().min(1).max(100).default(64),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Check if event and venue exist
      const [event, venue] = await Promise.all([
        db.event.findUnique({ where: { id: input.eventId } }),
        db.venue.findUnique({ where: { id: input.venueId } }),
      ]);

      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }

      if (!venue) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Venue not found' });
      }

      // Check for duplicate mapping
      const existingMapping = await db.venueLocationMapping.findFirst({
        where: {
          eventId: input.eventId,
          venueId: input.venueId,
          level: input.level
        }
      });

      if (existingMapping) {
        throw new TRPCError({ 
          code: 'CONFLICT', 
          message: `Venue already mapped to ${input.level} level for this event` 
        });
      }

      const mapping = await db.venueLocationMapping.create({
        data: {
          eventId: input.eventId,
          venueId: input.venueId,
          level: input.level,
          maxTeams: input.maxTeams,
          isActive: input.isActive,
        },
        include: {
          event: { select: { name: true } },
          venue: { select: { name: true, district: true, state: true } }
        }
      });

      return {
        success: true,
        mapping: {
          id: mapping.id,
          eventId: mapping.eventId,
          eventName: mapping.event?.name || 'Unknown',
          venueId: mapping.venueId,
          venueName: mapping.venue?.name || 'Unknown',
          venueDistrict: mapping.venue?.district || '',
          venueState: mapping.venue?.state || '',
          level: mapping.level,
          maxTeams: mapping.maxTeams,
          isActive: mapping.isActive,
          createdAt: mapping.createdAt?.toISOString() || null,
        }
      };
    }),

  updateVenueLocationMapping: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      level: z.enum(['cluster', 'division', 'final']).optional(),
      maxTeams: z.number().int().min(1).max(100).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Check if mapping exists
      const existingMapping = await db.venueLocationMapping.findUnique({
        where: { id: input.id }
      });

      if (!existingMapping) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Venue location mapping not found' });
      }

      const updateData: any = {};
      if (input.level) updateData.level = input.level;
      if (input.maxTeams !== undefined) updateData.maxTeams = input.maxTeams;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      const mapping = await db.venueLocationMapping.update({
        where: { id: input.id },
        data: updateData,
        include: {
          event: { select: { name: true } },
          venue: { select: { name: true, district: true, state: true } }
        }
      });

      return {
        success: true,
        mapping: {
          id: mapping.id,
          eventId: mapping.eventId,
          eventName: mapping.event?.name || 'Unknown',
          venueId: mapping.venueId,
          venueName: mapping.venue?.name || 'Unknown',
          venueDistrict: mapping.venue?.district || '',
          venueState: mapping.venue?.state || '',
          level: mapping.level,
          maxTeams: mapping.maxTeams,
          isActive: mapping.isActive,
          updatedAt: mapping.updatedAt?.toISOString() || null,
        }
      };
    }),

  deleteVenueLocationMapping: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Check if mapping exists and is not already deleted
      const existingMapping = await db.venueLocationMapping.findFirst({
        where: { 
          id: input.id,
          deletedAt: null 
        }
      });

      if (!existingMapping) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Venue location mapping not found or already deleted' 
        });
      }

      // Perform soft delete
      await db.venueLocationMapping.update({
        where: { id: input.id },
        data: { 
          deletedAt: new Date(),
          // Note: VenueLocationMapping model does&apos;t have deletedBy field in schema
        }
      });

      return {
        success: true,
        message: 'Venue location mapping deleted successfully'
      };
    }),

  getVenuesByLevel: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      level: z.enum(['cluster', 'division', 'final']),
      isActive: z.boolean().default(true),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const venues = await db.venueLocationMapping.findMany({
        where: {
          eventId: input.eventId,
          level: input.level,
          isActive: input.isActive,
        },
        include: {
          venue: {
            select: {
              id: true,
              name: true,
              district: true,
              state: true,
              capacity: true,
            }
          },
          _count: {
            select: {
              teamVenueAssignmentsByCluster: true,
              teamVenueAssignmentsByDivision: true,
              teamVenueAssignmentsByFinal: true
            }
          }
        },
        orderBy: {
          venue: { name: 'asc' }
        }
      });

      return {
        success: true,
        venues: venues.map(mapping => ({
          mappingId: mapping.id,
          venue: {
            id: mapping.venue.id,
            name: mapping.venue.name,
            district: mapping.venue.district,
            state: mapping.venue.state,
            capacity: mapping.venue.capacity,
          },
          level: mapping.level,
          maxTeams: mapping.maxTeams || 64,
          assignedTeamsCount: mapping._count.teamVenueAssignmentsByCluster + 
                            mapping._count.teamVenueAssignmentsByDivision + 
                            mapping._count.teamVenueAssignmentsByFinal,
          availableCapacity: (mapping.maxTeams || 64) - (
            mapping._count.teamVenueAssignmentsByCluster + 
            mapping._count.teamVenueAssignmentsByDivision + 
            mapping._count.teamVenueAssignmentsByFinal
          )
        }))
      };
    }),

  // 3-Tier Venue Assignment Routing Logic
  getAvailableVenuesForTeam: protectedProcedure
    .input(z.object({
      teamId: z.string().uuid(),
      eventId: z.string().uuid(),
      level: z.enum(['cluster', 'division', 'final']).default('cluster'),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Get team details for routing logic
      const team = await db.team.findUnique({
        where: { id: input.teamId },
        select: {
          district: true,
          taluk: true,
          state: true
        }
      });

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      let availableVenues = [];

      // Tier 1: Check for direct taluk → cluster mapping
      const talukMapping = await db.talukClusterMapping.findFirst({
        where: {
          eventId: input.eventId,
          district: team.district,
          taluk: team.taluk,
        },
        include: {
          venueLocationMapping: {
            where: {
              level: input.level,
              isActive: true
            },
            include: {
              venue: {
                select: {
                  id: true,
                  name: true,
                  district: true,
                  state: true,
                  capacity: true
                }
              },
              _count: {
                select: {
                  teamVenueAssignmentsByCluster: true,
                  teamVenueAssignmentsByDivision: true,
                  teamVenueAssignmentsByFinal: true
                }
              }
            }
          }
        }
      });

      if (talukMapping?.venueLocationMapping) {
        availableVenues.push({
          mappingId: talukMapping.venueLocationMapping.id,
          venue: talukMapping.venueLocationMapping.venue,
          level: talukMapping.venueLocationMapping.level,
          maxTeams: talukMapping.venueLocationMapping.maxTeams || 64,
          assignedTeamsCount: talukMapping.venueLocationMapping._count.teamVenueAssignmentsByCluster + 
                            talukMapping.venueLocationMapping._count.teamVenueAssignmentsByDivision + 
                            talukMapping.venueLocationMapping._count.teamVenueAssignmentsByFinal,
          routingTier: 1,
          routingReason: `Direct taluk mapping: ${team.taluk} → cluster venue`
        });
      }

      // Tier 2: Check district-level cluster venues
      if (availableVenues.length === 0) {
        const districtVenues = await db.venueLocationMapping.findMany({
          where: {
            eventId: input.eventId,
            level: input.level,
            isActive: true,
            venue: {
              district: team.district,
              state: team.state
            }
          },
          include: {
            venue: {
              select: {
                id: true,
                name: true,
                district: true,
                state: true,
                capacity: true
              }
            },
            _count: {
              select: {
                teamVenueAssignmentsByCluster: true,
                teamVenueAssignmentsByDivision: true,
                teamVenueAssignmentsByFinal: true
              }
            }
          },
          orderBy: {
            venue: { name: 'asc' }
          }
        });

        if (districtVenues.length === 1) {
          // Single cluster in district → auto-assign
          const venue = districtVenues[0];
          availableVenues.push({
            mappingId: venue.id,
            venue: venue.venue,
            level: venue.level,
            maxTeams: venue.maxTeams || 64,
            assignedTeamsCount: venue._count.teamVenueAssignmentsByCluster + 
                              venue._count.teamVenueAssignmentsByDivision + 
                              venue._count.teamVenueAssignmentsByFinal,
            routingTier: 2,
            routingReason: `Single cluster venue in district: ${team.district}`
          });
        } else if (districtVenues.length > 1) {
          // Multiple clusters → manual mapping required
          availableVenues = districtVenues.map(venue => ({
            mappingId: venue.id,
            venue: venue.venue,
            level: venue.level,
            maxTeams: venue.maxTeams || 64,
            assignedTeamsCount: venue._count.teamVenueAssignmentsByCluster + 
                              venue._count.teamVenueAssignmentsByDivision + 
                              venue._count.teamVenueAssignmentsByFinal,
            routingTier: 2,
            routingReason: `Multiple clusters in district: ${team.district} - requires manual selection`
          }));
        }
      }

      // Tier 3: Fallback to any available cluster venue
      if (availableVenues.length === 0) {
        const fallbackVenues = await db.venueLocationMapping.findMany({
          where: {
            eventId: input.eventId,
            level: input.level,
            isActive: true,
          },
          include: {
            venue: {
              select: {
                id: true,
                name: true,
                district: true,
                state: true,
                capacity: true
              }
            },
            _count: {
              select: {
                teamVenueAssignmentsByCluster: true,
                teamVenueAssignmentsByDivision: true,
                teamVenueAssignmentsByFinal: true
              }
            }
          },
          orderBy: [
            { venue: { state: 'asc' } },
            { venue: { district: 'asc' } },
            { venue: { name: 'asc' } }
          ]
        });

        availableVenues = fallbackVenues.map(venue => ({
          mappingId: venue.id,
          venue: venue.venue,
          level: venue.level,
          maxTeams: venue.maxTeams || 64,
          assignedTeamsCount: venue._count.teamVenueAssignmentsByCluster + 
                            venue._count.teamVenueAssignmentsByDivision + 
                            venue._count.teamVenueAssignmentsByFinal,
          routingTier: 3,
          routingReason: `Fallback assignment - no district-specific clusters available`
        }));
      }

      return {
        success: true,
        teamDetails: {
          id: team.district,
          district: team.district,
          taluk: team.taluk,
          state: team.state
        },
        availableVenues: availableVenues.map(v => ({
          ...v,
          availableCapacity: v.maxTeams - v.assignedTeamsCount,
          isAtCapacity: v.assignedTeamsCount >= v.maxTeams
        })),
        routingExplanation: {
          tier1: "Direct taluk → cluster mapping",
          tier2: "District-level cluster assignment",
          tier3: "Fallback to any available cluster"
        }
      };
    }),

  autoAssignTeamVenue: protectedProcedure
    .input(z.object({
      teamId: z.string().uuid(),
      eventId: z.string().uuid(),
      level: z.enum(['cluster', 'division', 'final']).default('cluster'),
      forceVenueMappingId: z.string().uuid().optional(), // For manual override
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Check if team already has assignment
      const existingAssignment = await db.teamVenueAssignment.findFirst({
        where: {
          teamId: input.teamId,
          eventId: input.eventId
        }
      });

      if (existingAssignment) {
        throw new TRPCError({ 
          code: 'CONFLICT', 
          message: 'Team already has venue assignment' 
        });
      }

      let selectedVenueMapping = null;

      if (input.forceVenueMappingId) {
        // Manual override
        selectedVenueMapping = await db.venueLocationMapping.findUnique({
          where: { id: input.forceVenueMappingId }
        });

        if (!selectedVenueMapping) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Venue mapping not found' });
        }
      } else {
        // Auto assignment using 3-tier logic
        const availableVenues = await ctx.caller.admin.getAvailableVenuesForTeam({
          teamId: input.teamId,
          eventId: input.eventId,
          level: input.level
        });

        // Find first available venue (not at capacity) with highest priority tier
        const suitableVenue = availableVenues.availableVenues
          .filter(v => !v.isAtCapacity)
          .sort((a, b) => a.routingTier - b.routingTier)[0];

        if (!suitableVenue) {
          throw new TRPCError({ 
            code: 'PRECONDITION_FAILED', 
            message: 'No available venues with capacity' 
          });
        }

        selectedVenueMapping = await db.venueLocationMapping.findUnique({
          where: { id: suitableVenue.mappingId }
        });
      }

      // Create team venue assignment
      const assignment = await db.teamVenueAssignment.create({
        data: {
          teamId: input.teamId,
          eventId: input.eventId,
          level: input.level,
          clusterVenueMappingId: input.level === 'cluster' ? selectedVenueMapping!.id : undefined,
          divisionVenueMappingId: input.level === 'division' ? selectedVenueMapping!.id : undefined,
          finalVenueMappingId: input.level === 'final' ? selectedVenueMapping!.id : undefined,
          assignmentMethod: input.forceVenueMappingId ? 'manual_assigned' : 'auto_assigned',
          assignedBy: ctx.user.id,
        },
        include: {
          team: {
            select: { name: true, district: true, taluk: true }
          },
          clusterVenueMapping: {
            include: { venue: { select: { name: true, district: true } } }
          },
          divisionVenueMapping: {
            include: { venue: { select: { name: true, district: true } } }
          },
          finalVenueMapping: {
            include: { venue: { select: { name: true, district: true } } }
          }
        }
      });

      const venueMapping = assignment.clusterVenueMapping || 
                         assignment.divisionVenueMapping || 
                         assignment.finalVenueMapping;

      return {
        success: true,
        assignment: {
          id: assignment.id,
          teamId: assignment.teamId,
          teamName: assignment.team?.name,
          teamLocation: `${assignment.team?.taluk}, ${assignment.team?.district}`,
          level: assignment.level,
          venueMapping: {
            id: venueMapping?.id,
            venueName: venueMapping?.venue?.name,
            venueDistrict: venueMapping?.venue?.district,
          },
          assignmentMethod: assignment.assignmentMethod,
          assignedAt: assignment.assignedAt?.toISOString() || null,
        }
      };
    }),

  // TalukClusterMapping Management (Tier 1 routing)
  getTalukClusterMappings: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid().optional(),
      district: z.string().optional(),
      state: z.string().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const where: any = {
        deletedAt: null // Only show non-deleted taluk cluster mappings
      };
      if (input.eventId) where.eventId = input.eventId;
      if (input.district) where.district = { contains: input.district, mode: 'insensitive' };
      if (input.state) where.state = { contains: input.state, mode: 'insensitive' };

      const [mappings, total] = await Promise.all([
        db.talukClusterMapping.findMany({
          where,
          include: {
            event: {
              select: { name: true }
            },
            venueLocationMapping: {
              include: {
                venue: {
                  select: {
                    name: true,
                    district: true,
                    state: true
                  }
                }
              }
            }
          },
          orderBy: [
            { state: 'asc' },
            { district: 'asc' },
            { taluk: 'asc' }
          ],
          skip: input.offset,
          take: input.limit,
        }),
        db.talukClusterMapping.count({ where }),
      ]);

      return {
        success: true,
        mappings: mappings.map(mapping => ({
          id: mapping.id,
          eventId: mapping.eventId,
          eventName: mapping.event?.name || 'Unknown',
          district: mapping.district,
          state: mapping.state,
          taluk: mapping.taluk,
          clusterVenueMapping: {
            id: mapping.venueLocationMapping.id,
            venueName: mapping.venueLocationMapping.venue?.name || 'Unknown',
            venueDistrict: mapping.venueLocationMapping.venue?.district || '',
            venueState: mapping.venueLocationMapping.venue?.state || '',
          },
          createdAt: mapping.createdAt?.toISOString() || null,
          updatedAt: mapping.updatedAt?.toISOString() || null,
        })),
        pagination: {
          total,
          hasMore: input.offset + input.limit < total,
        }
      };
    }),

  createTalukClusterMapping: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      district: z.string().min(1, 'District is required').max(100),
      state: z.string().min(1, 'State is required').max(100),
      taluk: z.string().min(1, 'Taluk is required').max(100),
      clusterVenueMappingId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Verify event exists
      const event = await db.event.findUnique({ where: { id: input.eventId } });
      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }

      // Verify cluster venue mapping exists and is for cluster level
      const clusterVenueMapping = await db.venueLocationMapping.findFirst({
        where: {
          id: input.clusterVenueMappingId,
          eventId: input.eventId,
          level: 'cluster',
          isActive: true
        }
      });

      if (!clusterVenueMapping) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Cluster venue mapping not found or not active' 
        });
      }

      // Check for existing mapping
      const existingMapping = await db.talukClusterMapping.findFirst({
        where: {
          eventId: input.eventId,
          district: input.district,
          taluk: input.taluk
        }
      });

      if (existingMapping) {
        throw new TRPCError({ 
          code: 'CONFLICT', 
          message: `Taluk ${input.taluk} in ${input.district} already mapped to a cluster` 
        });
      }

      const mapping = await db.talukClusterMapping.create({
        data: {
          eventId: input.eventId,
          district: input.district,
          state: input.state,
          taluk: input.taluk,
          clusterVenueMappingId: input.clusterVenueMappingId,
        },
        include: {
          event: { select: { name: true } },
          venueLocationMapping: {
            include: {
              venue: { select: { name: true, district: true, state: true } }
            }
          }
        }
      });

      return {
        success: true,
        mapping: {
          id: mapping.id,
          eventId: mapping.eventId,
          eventName: mapping.event?.name || 'Unknown',
          district: mapping.district,
          state: mapping.state,
          taluk: mapping.taluk,
          clusterVenueMapping: {
            id: mapping.venueLocationMapping.id,
            venueName: mapping.venueLocationMapping.venue?.name || 'Unknown',
            venueDistrict: mapping.venueLocationMapping.venue?.district || '',
            venueState: mapping.venueLocationMapping.venue?.state || '',
          },
          createdAt: mapping.createdAt?.toISOString() || null,
        }
      };
    }),

  updateTalukClusterMapping: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      clusterVenueMappingId: z.string().uuid().optional(),
      district: z.string().min(1).max(100).optional(),
      state: z.string().min(1).max(100).optional(),
      taluk: z.string().min(1).max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Check if mapping exists
      const existingMapping = await db.talukClusterMapping.findUnique({
        where: { id: input.id }
      });

      if (!existingMapping) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Taluk cluster mapping not found' });
      }

      // Verify new cluster venue mapping if provided
      if (input.clusterVenueMappingId) {
        const clusterVenueMapping = await db.venueLocationMapping.findFirst({
          where: {
            id: input.clusterVenueMappingId,
            eventId: existingMapping.eventId,
            level: 'cluster',
            isActive: true
          }
        });

        if (!clusterVenueMapping) {
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'Cluster venue mapping not found or not active' 
          });
        }
      }

      const updateData: any = {};
      if (input.clusterVenueMappingId) updateData.clusterVenueMappingId = input.clusterVenueMappingId;
      if (input.district) updateData.district = input.district;
      if (input.state) updateData.state = input.state;
      if (input.taluk) updateData.taluk = input.taluk;

      const mapping = await db.talukClusterMapping.update({
        where: { id: input.id },
        data: updateData,
        include: {
          event: { select: { name: true } },
          venueLocationMapping: {
            include: {
              venue: { select: { name: true, district: true, state: true } }
            }
          }
        }
      });

      return {
        success: true,
        mapping: {
          id: mapping.id,
          eventId: mapping.eventId,
          eventName: mapping.event?.name || 'Unknown',
          district: mapping.district,
          state: mapping.state,
          taluk: mapping.taluk,
          clusterVenueMapping: {
            id: mapping.venueLocationMapping.id,
            venueName: mapping.venueLocationMapping.venue?.name || 'Unknown',
            venueDistrict: mapping.venueLocationMapping.venue?.district || '',
            venueState: mapping.venueLocationMapping.venue?.state || '',
          },
          updatedAt: mapping.updatedAt?.toISOString() || null,
        }
      };
    }),

  deleteTalukClusterMapping: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Check if mapping exists and is not already deleted
      const existingMapping = await db.talukClusterMapping.findFirst({
        where: { 
          id: input.id,
          deletedAt: null 
        }
      });

      if (!existingMapping) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Taluk cluster mapping not found or already deleted' 
        });
      }

      // Perform soft delete
      await db.talukClusterMapping.update({
        where: { id: input.id },
        data: { 
          deletedAt: new Date(),
          // Note: TalukClusterMapping model does&apos;t have deletedBy field in schema
        }
      });

      return {
        success: true,
        message: 'Taluk cluster mapping deleted successfully'
      };
    }),

  bulkCreateTalukMappings: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      clusterVenueMappingId: z.string().uuid(),
      taluks: z.array(z.object({
        district: z.string().min(1).max(100),
        state: z.string().min(1).max(100),
        taluk: z.string().min(1).max(100),
      })).min(1, 'At least one taluk required').max(50, 'Too many taluks'),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Verify event and cluster venue mapping
      const [event, clusterVenueMapping] = await Promise.all([
        db.event.findUnique({ where: { id: input.eventId } }),
        db.venueLocationMapping.findFirst({
          where: {
            id: input.clusterVenueMappingId,
            eventId: input.eventId,
            level: 'cluster',
            isActive: true
          }
        })
      ]);

      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }

      if (!clusterVenueMapping) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Cluster venue mapping not found or not active' 
        });
      }

      // Check for existing mappings
      const existingMappings = await db.talukClusterMapping.findMany({
        where: {
          eventId: input.eventId,
          OR: input.taluks.map(t => ({
            district: t.district,
            taluk: t.taluk
          }))
        }
      });

      if (existingMappings.length > 0) {
        const conflicts = existingMappings.map(m => `${m.taluk}, ${m.district}`);
        throw new TRPCError({ 
          code: 'CONFLICT', 
          message: `These taluks are already mapped: ${conflicts.join('; ')}` 
        });
      }

      // Bulk create mappings
      const createdMappings = await db.talukClusterMapping.createMany({
        data: input.taluks.map(taluk => ({
          eventId: input.eventId,
          district: taluk.district,
          state: taluk.state,
          taluk: taluk.taluk,
          clusterVenueMappingId: input.clusterVenueMappingId,
        }))
      });

      return {
        success: true,
        message: `Successfully created ${createdMappings.count} taluk cluster mappings`,
        createdCount: createdMappings.count
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

      const user = await db.user.update({
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

      const user = await db.user.update({
        where: { id: input.userId },
        data: { /* is_verified: input.isVerified */ } // TODO: Clarify mapping for is_verified
      });

      return {
        success: true,
        message: `User ${input.isVerified ? 'verified' : 'unverified'} successfully`,
        user: {
          id: user.id,
          // isVerified: user.is_verified, // TODO: Clarify mapping for is_verified
        }
      };
    }),
});