import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

const mutationSchema = z.object({
  id: z.string(),
  type: z.enum(['addPlayer', 'removePlayer', 'updateTeam', 'sendMessage', 'likeMedia', 'markNotificationRead']),
  data: z.any(),
  timestamp: z.date(),
  retryCount: z.number().default(0)
});

export const mutationQueueRouter = createTRPCRouter({
  processMutations: protectedProcedure
    .input(z.object({
      mutations: z.array(mutationSchema)
    }))
    .mutation(async ({ ctx, input }) => {
      const { user, db } = ctx;
      const results = [];

      for (const mutation of input.mutations) {
        try {
          let result;

          switch (mutation.type) {
            case 'addPlayer':
              result = await processAddPlayer(db, user, mutation.data);
              break;
            
            case 'removePlayer':
              result = await processRemovePlayer(db, user, mutation.data);
              break;
            
            case 'updateTeam':
              result = await processUpdateTeam(db, user, mutation.data);
              break;
            
            case 'sendMessage':
              result = await processSendMessage(db, user, mutation.data);
              break;
            
            case 'likeMedia':
              result = await processLikeMedia(db, user, mutation.data);
              break;
            
            case 'markNotificationRead':
              result = await processMarkNotificationRead(db, user, mutation.data);
              break;
            
            default:
              throw new Error(`Unknown mutation type: ${mutation.type}`);
          }

          results.push({
            id: mutation.id,
            status: 'success',
            result
          });
        } catch (error) {
          console.error(`Mutation ${mutation.id} failed:`, error);
          results.push({
            id: mutation.id,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return { results };
    })
});

// Helper functions for processing different mutation types
async function processAddPlayer(db: any, user: any, data: any) {
  if (user.role !== 'captain') {
    throw new Error('Only captains can add players');
  }

  // Verify team ownership
  const team = await db.team.findFirst({
    where: { 
      id: data.teamId,
      captainId: user.id 
    }
  });

  if (!team) {
    throw new Error('Team not found or not owned by user');
  }

  // Check if player already exists
  const existingPlayer = await db.teamPlayer.findFirst({
    where: {
      teamId: data.teamId,
      userId: data.userId
    }
  });

  if (existingPlayer) {
    throw new Error('Player already exists in team');
  }

  // Add player
  const teamPlayer = await db.teamPlayer.create({
    data: {
      teamId: data.teamId,
      userId: data.userId,
      position: data.position || 'player',
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      dateOfBirth: new Date(data.dateOfBirth),
      age: data.age,
      gender: data.gender,
      panchayat: data.panchayat,
      taluk: data.taluk,
      district: data.district,
      addedBy: user.id
    }
  });

  // Update team player count
  await db.team.update({
    where: { id: data.teamId },
    data: { currentPlayers: { increment: 1 } }
  });

  return { playerId: teamPlayer.id };
}

async function processRemovePlayer(db: any, user: any, data: any) {
  if (user.role !== 'captain') {
    throw new Error('Only captains can remove players');
  }

  // Verify team ownership
  const teamPlayer = await db.teamPlayer.findFirst({
    where: { 
      id: data.playerId,
      team: { captainId: user.id }
    }
  });

  if (!teamPlayer) {
    throw new Error('Player not found or not in your team');
  }

  // Remove player
  await db.teamPlayer.delete({
    where: { id: data.playerId }
  });

  // Update team player count
  await db.team.update({
    where: { id: teamPlayer.teamId },
    data: { currentPlayers: { decrement: 1 } }
  });

  return { success: true };
}

async function processUpdateTeam(db: any, user: any, data: any) {
  if (user.role !== 'captain') {
    throw new Error('Only captains can update teams');
  }

  // Verify team ownership
  const team = await db.team.findFirst({
    where: { 
      id: data.teamId,
      captainId: user.id 
    }
  });

  if (!team) {
    throw new Error('Team not found or not owned by user');
  }

  // Update team
  const updatedTeam = await db.team.update({
    where: { id: data.teamId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description && { description: data.description }),
      ...(data.status && { status: data.status })
    }
  });

  return { team: updatedTeam };
}

async function processSendMessage(db: any, user: any, data: any) {
  // Verify venue access
  const hasAccess = await db.teamVenueAssignment.findFirst({
    where: {
      clusterVenueMapping: { venueId: data.venueId },
      team: {
        OR: [
          { captainId: user.id },
          { teamPlayers: { some: { userId: user.id } } }
        ]
      }
    }
  });

  if (!hasAccess) {
    throw new Error('No access to venue chat');
  }

  // Create message
  const message = await db.venueChat.create({
    data: {
      venueId: data.venueId,
      senderId: user.id,
      content: data.content,
      type: data.type || 'text',
      mediaUrl: data.mediaUrl
    }
  });

  return { messageId: message.id };
}

async function processLikeMedia(db: any, user: any, data: any) {
  // Create or remove like
  if (data.action === 'like') {
    await db.venueMediaLike.create({
      data: {
        mediaId: data.mediaId,
        userId: user.id
      }
    });
  } else {
    await db.venueMediaLike.delete({
      where: {
        mediaId_userId: {
          mediaId: data.mediaId,
          userId: user.id
        }
      }
    });
  }

  return { success: true };
}

async function processMarkNotificationRead(db: any, user: any, data: any) {
  await db.notification.update({
    where: {
      id: data.notificationId,
      userId: user.id
    },
    data: { read: true }
  });

  return { success: true };
}
