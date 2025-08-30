import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";

export const adminDashboardRouter = createTRPCRouter({
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
        db.venueLevelMapping.groupBy({
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

  // Team Statistics
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
});