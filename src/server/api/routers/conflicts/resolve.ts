import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const conflictResolutionRouter = createTRPCRouter({
  getTeamVersion: protectedProcedure
    .input(z.object({
      teamId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const { user, db } = ctx;

      try {
        // Verify user has access to this team
        const team = await db.team.findFirst({
          where: {
            id: input.teamId,
            OR: [
              { captainId: user.id },
              { teamPlayers: { some: { userId: user.id } } }
            ]
          },
          include: {
            teamPlayers: {
              select: {
                id: true,
                userId: true,
                verificationStatus: true,
                updatedAt: true
              }
            }
          }
        });

        if (!team) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found or access denied'
          });
        }

        // Create version hash based on team and players data
        const versionData = {
          teamId: team.id,
          teamUpdatedAt: team.updatedAt,
          teamStatus: team.status,
          currentPlayers: team.currentPlayers,
          players: team.teamPlayers.map(p => ({
            id: p.id,
            userId: p.userId,
            verificationStatus: p.verificationStatus,
            updatedAt: p.updatedAt
          }))
        };

        // Simple version hash (in production, use proper hashing)
        const versionHash = Buffer.from(JSON.stringify(versionData)).toString('base64');

        return {
          teamId: input.teamId,
          version: versionHash,
          lastModified: team.updatedAt,
          data: versionData
        };
      } catch (error) {
        console.error('Get team version error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get team version'
        });
      }
    }),

  resolveTeamConflict: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      localVersion: z.object({
        version: z.string(),
        data: z.any()
      }),
      remoteVersion: z.object({
        version: z.string(),
        data: z.any()
      }),
      resolutionStrategy: z.enum(['last-write-wins', 'manual']).default('last-write-wins')
    }))
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;

      try {
        // Verify user has access to this team
        const team = await db.team.findFirst({
          where: {
            id: input.teamId,
            OR: [
              { captainId: user.id },
              { teamPlayers: { some: { userId: user.id } } }
            ]
          }
        });

        if (!team) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found or access denied'
          });
        }

        // Get current server version
        const currentVersion = await db.team.findUnique({
          where: { id: input.teamId },
          include: {
            teamPlayers: true
          }
        });

        if (!currentVersion) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found'
          });
        }

        let resolvedData;

        if (input.resolutionStrategy === 'last-write-wins') {
          // Compare timestamps and use the most recent
          const localTimestamp = new Date(input.localVersion.data.teamUpdatedAt);
          const remoteTimestamp = new Date(input.remoteVersion.data.teamUpdatedAt);
          
          resolvedData = localTimestamp > remoteTimestamp 
            ? input.localVersion.data 
            : input.remoteVersion.data;
        } else {
          // Manual resolution - use remote version as authoritative
          resolvedData = input.remoteVersion.data;
        }

        // Apply resolved data to database
        const updatedTeam = await db.team.update({
          where: { id: input.teamId },
          data: {
            status: resolvedData.teamStatus,
            currentPlayers: resolvedData.currentPlayers
          }
        });

        // Handle player conflicts
        for (const playerData of resolvedData.players) {
          await db.teamPlayer.upsert({
            where: { id: playerData.id },
            update: {
              verificationStatus: playerData.verificationStatus
            },
            create: {
              id: playerData.id,
              teamId: input.teamId,
              userId: playerData.userId,
              verificationStatus: playerData.verificationStatus,
              // Add other required fields with defaults
              position: 'player',
              firstName: 'Unknown',
              lastName: 'Player',
              phone: '0000000000',
              dateOfBirth: new Date(),
              age: 18,
              gender: 'M',
              panchayat: 'Unknown',
              taluk: 'Unknown',
              district: 'Unknown',
              addedBy: user.id
            }
          });
        }

        // Create new version hash
        const newVersionData = {
          teamId: updatedTeam.id,
          teamUpdatedAt: updatedTeam.updatedAt,
          teamStatus: updatedTeam.status,
          currentPlayers: updatedTeam.currentPlayers,
          players: resolvedData.players
        };

        const newVersionHash = Buffer.from(JSON.stringify(newVersionData)).toString('base64');

        return {
          success: true,
          resolvedVersion: {
            version: newVersionHash,
            data: newVersionData
          },
          resolutionStrategy: input.resolutionStrategy,
          conflictResolved: true
        };
      } catch (error) {
        console.error('Resolve team conflict error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to resolve team conflict'
        });
      }
    }),

  detectConflicts: protectedProcedure
    .input(z.object({
      teamId: z.string(),
      localVersion: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const { user, db } = ctx;

      try {
        // Get current server version
        const currentVersionData = await ctx.caller.conflicts.getTeamVersion({
          teamId: input.teamId
        });

        const hasConflict = currentVersionData.version !== input.localVersion;

        return {
          hasConflict,
          localVersion: input.localVersion,
          remoteVersion: currentVersionData.version,
          conflictDetails: hasConflict ? {
            teamId: input.teamId,
            localVersion: input.localVersion,
            remoteVersion: currentVersionData.version,
            lastModified: currentVersionData.lastModified
          } : null
        };
      } catch (error) {
        console.error('Detect conflicts error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to detect conflicts'
        });
      }
    })
});
