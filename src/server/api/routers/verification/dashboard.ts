import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, protectedProcedure } from '../../trpc'

export const verificationDashboardRouter = createTRPCRouter({
  // Get verification statistics
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Check if user has verification permissions
      if (!['admin', 'verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions for verification dashboard',
        })
      }

      // Get current date for today's statistics
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Get team statistics
      const [
        totalTeams,
        pendingTeams,
        verifiedTeams, 
        rejectedTeams,
        todayVerifications
      ] = await Promise.all([
        // Total teams
        db.team.count(),
        
        // Teams pending verification (submitted status)
        db.team.count({
          where: { 
            status: { in: ['submitted', 'pending'] }
          }
        }),
        
        // Verified teams
        db.team.count({
          where: { status: 'verified' }
        }),
        
        // Rejected teams
        db.team.count({
          where: { status: 'rejected' }
        }),
        
        // Today's verifications (teams updated today)
        db.team.count({
          where: {
            updatedAt: {
              gte: today,
              lt: tomorrow
            },
            status: { in: ['verified', 'rejected'] }
          }
        })
      ])

      return {
        totalTeams,
        pendingVerification: pendingTeams,
        verifiedTeams,
        rejectedTeams,
        todayVerifications
      }
    }),

  // Get quick actions for verification dashboard
  getQuickActions: protectedProcedure
    .query(async ({ ctx }) => {
      // Check if user has verification permissions
      if (!['admin', 'verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions for verification dashboard',
        })
      }

      // Get teams that need immediate attention
      const urgentTeams = await db.team.findMany({
        where: {
          status: { in: ['submitted', 'pending'] },
          // Teams submitted more than 24 hours ago
          createdAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        include: {
          sport: true,
          captainUser: {
            select: {
              firstName: true,
              lastName: true,
              phone: true
            }
          }
        },
        take: 10,
        orderBy: { createdAt: 'asc' }
      })

      // Get incomplete verifications (teams with some players verified)
      const incompleteVerifications = await db.team.findMany({
        where: {
          status: 'partial_verification'
        },
        include: {
          sport: true,
          captainUser: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              teamPlayers: {
                where: { verificationStatus: 'verified' }
              }
            }
          }
        },
        take: 10,
        orderBy: { updatedAt: 'desc' }
      })

      return {
        urgentTeams,
        incompleteVerifications
      }
    }),

  // Get recent verification activity
  getRecentActivity: protectedProcedure
    .query(async ({ ctx }) => {
      // Check if user has verification permissions
      if (!['admin', 'verification_volunteer', 'technical_volunteer'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions for verification dashboard',
        })
      }

      // Get recent team updates
      const recentActivity = await db.team.findMany({
        where: {
          status: { in: ['verified', 'rejected', 'partial_verification'] },
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: {
          sport: true,
          captainUser: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        take: 20,
        orderBy: { updatedAt: 'desc' }
      })

      return recentActivity
    }),

  // Get verification workload by user
  getWorkloadStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Check if user has admin permissions
      if (!['admin'].includes(ctx.user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions for workload statistics',
        })
      }

      // Get verification stats by user for the current month
      const currentMonth = new Date()
      currentMonth.setDate(1)
      currentMonth.setHours(0, 0, 0, 0)

      const verificationStats = await db.teamPlayer.groupBy({
        by: ['verifiedById'],
        where: {
          verifiedAt: {
            gte: currentMonth
          },
          verificationStatus: { in: ['verified', 'rejected'] }
        },
        _count: {
          verificationStatus: true
        }
      })

      // Get user details for the verifiers
      const verifierIds = verificationStats
        .map(stat => stat.verifiedById)
        .filter(Boolean) as string[]

      const verifiers = await db.user.findMany({
        where: {
          id: { in: verifierIds }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true
        }
      })

      // Combine stats with user details
      const workloadStats = verificationStats.map(stat => {
        const verifier = verifiers.find(v => v.id === stat.verifiedById)
        return {
          verifierId: stat.verifiedById,
          verifierName: verifier ? `${verifier.firstName} ${verifier.lastName}` : 'Unknown',
          verifierRole: verifier?.role || 'unknown',
          verificationsCount: stat._count.verificationStatus
        }
      })

      return workloadStats
    })
})