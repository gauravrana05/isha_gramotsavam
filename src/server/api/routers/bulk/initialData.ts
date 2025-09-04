import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const bulkDataRouter = createTRPCRouter({
  captainInitial: protectedProcedure
    .query(async ({ ctx }) => {
      const { user, db } = ctx;
      
      if (user.role !== 'captain') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only captains can access this endpoint'
        });
      }

      try {
        // Get captain's team with all related data
        const team = await db.team.findFirst({
          where: { captainId: user.id },
          include: {
            sport: { select: { id: true, name: true } },
            teamPlayers: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    profileImages: {
                      select: { profilePhotoPath: true }
                    }
                  }
                }
              }
            },
            teamVenueAssignments: {
              include: {
                clusterVenueMapping: {
                  include: {
                    venue: { 
                      select: { 
                        id: true, 
                        name: true,
                        location: true,
                        capacity: true
                      } 
                    }
                  }
                }
              }
            }
          }
        });

        if (!team) {
          return {
            team: null,
            matches: [],
            notifications: [],
            venueData: null
          };
        }

        // Get all matches for the team
        const matches = await db.match.findMany({
          where: {
            OR: [
              { team1Id: team.id },
              { team2Id: team.id }
            ]
          },
          include: {
            team1: { select: { id: true, name: true } },
            team2: { select: { id: true, name: true } },
            venue: { select: { id: true, name: true } }
          },
          orderBy: { scheduledTime: 'asc' }
        });

        // Get notifications
        const notifications = await db.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 50
        });

        // Get venue data if team is assigned
        const venueId = team.teamVenueAssignments[0]?.clusterVenueMapping?.venue?.id;
        let venueData = null;

        if (venueId) {
          // Get venue participants
          const venueAssignments = await db.teamVenueAssignment.findMany({
            where: {
              clusterVenueMapping: { venueId }
            },
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  captainId: true,
                  teamPlayers: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          firstName: true,
                          lastName: true,
                          role: true
                        }
                      }
                    }
                  }
                }
              }
            }
          });

          // Get recent venue media
          const venueMedia = await db.venueMedia.findMany({
            where: {
              venueId,
              approvalStatus: 'approved'
            },
            include: {
              uploader: {
                select: {
                  firstName: true,
                  lastName: true,
                  role: true
                }
              },
              _count: {
                select: { likes: true, comments: true }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 20
          });

          // Get recent venue chat
          const venueChat = await db.venueChat.findMany({
            where: { venueId },
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
          });

          venueData = {
            venue: team.teamVenueAssignments[0].clusterVenueMapping.venue,
            participants: venueAssignments.flatMap(assignment => 
              assignment.team.teamPlayers.map(tp => ({
                id: tp.user.id,
                name: `${tp.user.firstName} ${tp.user.lastName}`,
                role: tp.user.role,
                teamName: assignment.team.name
              }))
            ),
            media: venueMedia.map(item => ({
              id: item.id,
              type: item.type,
              url: item.url,
              thumbnailUrl: item.thumbnailUrl,
              caption: item.caption,
              likes: item._count.likes,
              comments: item._count.comments,
              uploader: `${item.uploader.firstName} ${item.uploader.lastName}`,
              createdAt: item.createdAt
            })),
            chat: venueChat.map(msg => ({
              id: msg.id,
              senderId: msg.senderId,
              senderName: `${msg.sender.firstName} ${msg.sender.lastName}`,
              senderRole: msg.sender.role,
              content: msg.content,
              type: msg.type,
              createdAt: msg.createdAt
            }))
          };
        }

        return {
          team: {
            id: team.id,
            name: team.name,
            status: team.status,
            sport: team.sport,
            currentPlayers: team.currentPlayers,
            captainId: team.captainId,
            venueId,
            players: team.teamPlayers.map(tp => ({
              id: tp.id,
              userId: tp.userId,
              firstName: tp.firstName,
              lastName: tp.lastName,
              phone: tp.phone,
              position: tp.position,
              verificationStatus: tp.verificationStatus,
              profileImage: tp.user?.profileImages?.profilePhotoPath
            }))
          },
          matches: matches.map(match => ({
            id: match.id,
            team1Id: match.team1Id,
            team2Id: match.team2Id,
            team1Name: match.team1?.name,
            team2Name: match.team2?.name,
            team1Score: match.team1Score,
            team2Score: match.team2Score,
            scheduledTime: match.scheduledTime,
            status: match.status,
            venueId: match.venueId,
            venueName: match.venue?.name
          })),
          notifications: notifications.map(notif => ({
            id: notif.id,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            read: notif.read,
            createdAt: notif.createdAt,
            actionUrl: notif.actionUrl
          })),
          venueData,
          loadTimestamp: new Date()
        };
      } catch (error) {
        console.error('Captain initial data error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load captain initial data'
        });
      }
    }),

  playerInitial: protectedProcedure
    .query(async ({ ctx }) => {
      const { user, db } = ctx;
      
      if (user.role !== 'player') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only players can access this endpoint'
        });
      }

      try {
        // Get player's team memberships
        const teamPlayers = await db.teamPlayer.findMany({
          where: { userId: user.id },
          include: {
            team: {
              include: {
                sport: { select: { id: true, name: true } },
                teamPlayers: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profileImages: {
                          select: { profilePhotoPath: true }
                        }
                      }
                    }
                  }
                },
                teamVenueAssignments: {
                  include: {
                    clusterVenueMapping: {
                      include: {
                        venue: { 
                          select: { 
                            id: true, 
                            name: true,
                            location: true
                          } 
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });

        const teamIds = teamPlayers.map(tp => tp.teamId);

        // Get all matches for player's teams
        const matches = teamIds.length > 0 ? await db.match.findMany({
          where: {
            OR: [
              { team1Id: { in: teamIds } },
              { team2Id: { in: teamIds } }
            ]
          },
          include: {
            team1: { select: { id: true, name: true } },
            team2: { select: { id: true, name: true } },
            venue: { select: { id: true, name: true } }
          },
          orderBy: { scheduledTime: 'asc' }
        }) : [];

        // Get notifications
        const notifications = await db.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 50
        });

        return {
          teams: teamPlayers.map(tp => ({
            id: tp.team.id,
            name: tp.team.name,
            status: tp.team.status,
            sport: tp.team.sport,
            captainId: tp.team.captainId,
            currentPlayers: tp.team.currentPlayers,
            venueId: tp.team.teamVenueAssignments[0]?.clusterVenueMapping?.venue?.id,
            venueName: tp.team.teamVenueAssignments[0]?.clusterVenueMapping?.venue?.name,
            myPosition: tp.position,
            myVerificationStatus: tp.verificationStatus,
            players: tp.team.teamPlayers.map(player => ({
              id: player.id,
              userId: player.userId,
              firstName: player.firstName,
              lastName: player.lastName,
              position: player.position,
              verificationStatus: player.verificationStatus,
              profileImage: player.user?.profileImages?.profilePhotoPath
            }))
          })),
          matches: matches.map(match => ({
            id: match.id,
            team1Id: match.team1Id,
            team2Id: match.team2Id,
            team1Name: match.team1?.name,
            team2Name: match.team2?.name,
            team1Score: match.team1Score,
            team2Score: match.team2Score,
            scheduledTime: match.scheduledTime,
            status: match.status,
            venueId: match.venueId,
            venueName: match.venue?.name,
            isMyTeam: teamIds.includes(match.team1Id) || teamIds.includes(match.team2Id)
          })),
          notifications: notifications.map(notif => ({
            id: notif.id,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            read: notif.read,
            createdAt: notif.createdAt,
            actionUrl: notif.actionUrl
          })),
          loadTimestamp: new Date()
        };
      } catch (error) {
        console.error('Player initial data error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load player initial data'
        });
      }
    })
});
