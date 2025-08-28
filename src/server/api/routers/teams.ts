import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from '../trpc'
import {
  createTeamSchema,
  updateTeamSchema,
  verifyTeamSchema,
  addTeamPlayerSchema,
  removeTeamPlayerSchema,
  updateTeamPlayerSchema,
  uploadTeamPhotoSchema,
  createTeamVenueAssignmentSchema,
  updateTeamVenueAssignmentSchema,
  getTeamByIdSchema,
  getTeamsSchema,
  getTeamPlayersSchema,
  getTeamsByLocationSchema,
  getTeamsByVenueSchema,
} from '@/lib/validations/team'
export const teamsRouter = createTRPCRouter({
  // Public procedures
  getById: publicProcedure
    .input(getTeamByIdSchema)
    .query(async ({ input }) => {
      const { id, includePhotos, includePlayers, includeVenueAssignments } = input

      const team = await db.team.findUnique({
        where: { id },
        include: {
          sport: true,
          captainUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          event: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          teamPhoto: includePhotos,
          teamPlayers: includePlayers ? {
            select: {
              id: true,
              userId: true,
              teamId: true,
              firstName: true,
              lastName: true,
              phone: true,
              whatsappNumber: true,
              dateOfBirth: true,
              age: true,
              gender: true,
              position: true,
              verificationStatus: true,
              panchayat: true,
              taluk: true,
              district: true,
              state: true,
              pincode: true,
              addedBy: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  role: true,
                  profileComplete: true,
                  profileImages: {
                    select: {
                      userId: true,
                      profilePhotoPath: true,
                      aadhaarFrontPath: true,
                      aadhaarBackPath: true,
                      allImagesUploaded: true,
                      verifiedBy: true,
                      verifiedAt: true,
                      createdAt: true,
                      updatedAt: true,
                    },
                  },
                },
              },
            },
            orderBy: [
              { position: 'asc' },
              { createdAt: 'asc' },
            ],
          } : false,
          teamVenueAssignments: includeVenueAssignments ? {
            include: {
              event: {
                select: {
                  id: true,
                  name: true,
                },
              },
              clusterVenueMapping: {
                include: {
                  venue: {
                    select: {
                      id: true,
                      name: true,
                      district: true,
                      state: true,
                    },
                  },
                },
              },
              divisionVenueMapping: {
                include: {
                  venue: {
                    select: {
                      id: true,
                      name: true,
                      district: true,
                      state: true,
                    },
                  },
                },
              },
              finalVenueMapping: {
                include: {
                  venue: {
                    select: {
                      id: true,
                      name: true,
                      district: true,
                      state: true,
                    },
                  },
                },
              },
            },
          } : false,
        },
      })

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        })
      }

      return team
    }),

  getAll: publicProcedure
    .input(getTeamsSchema)
    .query(async ({ input }) => {
      const { 
        page, 
        limit, 
        sportId, 
        eventId, 
        genderCategory, 
        status, 
        captainId, 
        district, 
        state, 
        search, 
        sortBy, 
        sortOrder 
      } = input

      const skip = (page - 1) * limit

      const where: any = {}

      if (sportId) where.sportId = sportId
      if (eventId) where.eventId = eventId
      if (genderCategory) where.genderCategory = genderCategory
      if (status) where.status = status
      if (captainId) where.captainId = captainId
      if (district) where.district = district
      if (state) where.state = state
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { captainName: { contains: search, mode: 'insensitive' } },
        ]
      }

      // Map sortBy values to database field names
      const sortByMapping: Record<string, string> = {
        'createdAt': 'createdAt',
        'name': 'name',
        'status': 'status',
        'tournamentNumber': 'tournamentNumber'
      };

      const dbSortBy = sortByMapping[sortBy] || 'createdAt';

      const [teamsFromDb, total] = await Promise.all([
        db.team.findMany({
          where,
          include: {
            sport: {
              select: {
                id: true,
                name: true,
              },
            },
            captainUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            event: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
            teamPlayers: {
              select: {
                position: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { [dbSortBy]: sortOrder },
        }),
        db.team.count({ where }),
      ]);

      const teams = teamsFromDb.map(team => {
        const mainPlayersCount = team.teamPlayers.filter(p => p.position === 'main').length;
        const substitutePlayersCount = team.teamPlayers.filter(p => p.position === 'substitute').length;
        
        const { teamPlayers, ...restOfTeam } = team;

        return {
          ...restOfTeam,
          mainPlayersCount,
          substitutePlayersCount,
        };
      });

      return {
        teams,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      }
    }),

  getByLocation: publicProcedure
    .input(getTeamsByLocationSchema)
    .query(async ({ input }) => {
      const { district, state, taluk, sportId, genderCategory } = input

      const where: any = {
        district,
        state,
      }

      if (taluk) where.taluk = taluk
      if (sportId) where.sportId = sportId
      if (genderCategory) where.genderCategory = genderCategory

      const teams = await db.team.findMany({
        where,
        include: {
          sport: {
            select: {
              id: true,
              name: true,
            },
          },
          captainUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          _count: {
            select: {
              teamPlayers: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      })

      return teams
    }),

  getByVenue: publicProcedure
    .input(getTeamsByVenueSchema)
    .query(async ({ input }) => {
      const { venueLocationMappingId, sportId, genderCategory } = input

      const where: any = {
        venueAssignments: {
          some: {
            OR: [
              { cluster_venue_mapping_id: venueLocationMappingId },
              { division_venue_mapping_id: venueLocationMappingId },
              { final_venue_mapping_id: venueLocationMappingId },
            ],
          },
        },
      }

      if (sportId) where.sportId = sportId
      if (genderCategory) where.genderCategory = genderCategory

      const teams = await db.team.findMany({
        where,
        include: {
          sport: {
            select: {
              id: true,
              name: true,
            },
          },
          captainUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          _count: {
            select: {
              teamPlayers: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      })

      return teams
    }),

  // Protected procedures
  getMyTeam: protectedProcedure.query(async ({ ctx }) => {
    const captainId = ctx.user.id;

    const team = await db.team.findFirst({
      where: { captainId: captainId },
      include: {
        sport: true,
        captainUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        teamPhoto: true,
        teamPlayers: {
          select: {
            id: true,
            userId: true,
            teamId: true,
            firstName: true,
            lastName: true,
            phone: true,
            whatsappNumber: true,
            dateOfBirth: true,
            age: true,
            gender: true,
            position: true,
            verificationStatus: true,
            panchayat: true,
            taluk: true,
            district: true,
            state: true,
            pincode: true,
            addedBy: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                profileComplete: true,
                profileImages: {
                  select: {
                    userId: true,
                    profilePhotoPath: true,
                    aadhaarFrontPath: true,
                    aadhaarBackPath: true,
                    allImagesUploaded: true,
                    verifiedBy: true,
                    verifiedAt: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        },
        teamVenueAssignments: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
              },
            },
            clusterVenueMapping: {
              include: {
                venue: {
                  select: {
                    id: true,
                    name: true,
                    district: true,
                    state: true,
                  },
                },
              },
            },
            divisionVenueMapping: {
              include: {
                venue: {
                  select: {
                    id: true,
                    name: true,
                    district: true,
                    state: true,
                  },
                },
              },
            },
            finalVenueMapping: {
              include: {
                venue: {
                  select: {
                    id: true,
                    name: true,
                    district: true,
                    state: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return team;
  }),

  create: protectedProcedure
    .input(createTeamSchema)
    .mutation(async ({ input }) => {
      try {
        // Check if captain exists and is not already captain of another team in same event/sport
        const existingCaptain = await db.team.findFirst({
          where: {
            captainId: input.captainId,
            sportId: input.sportId,
            eventId: input.eventId,
            status: { not: 'rejected' },
          },
        })

        if (existingCaptain) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User is already captain of another team in this sport/event',
          })
        }

        const team = await db.team.create({
          data: {
            name: input.name,
            sportId: input.sportId,
            captainId: input.captainId,
            captainName: input.captainName,
            genderCategory: input.genderCategory,
            panchayat: input.panchayat,
            taluk: input.taluk,
            district: input.district,
            state: input.state,
            description: input.description,
            eventId: input.eventId,
            pincode: input.pincode,
          },
          include: {
            sport: true,
            captainUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        })

        return team
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create team',
        })
      }
    }),

  // Create team and promote captain (matches server action functionality)
  createAndPromoteCaptain: protectedProcedure
    .input(z.object({
      teamData: z.object({
        name: z.string().min(3, 'Team name must be at least 3 characters'),
        sportName: z.string().min(1, 'Sport name is required'),
        sportId: z.string().min(1, 'Sport ID is required'),
        description: z.string().optional(),
        panchayat: z.string().min(1, 'Panchayat is required'),
        district: z.string().min(1, 'District is required'),
        state: z.string().min(1, 'State is required'),
        taluk: z.string().optional(), // Add taluk field
        genderCategory: z.enum(['M', 'F', 'mixed']),
      }),
      captainId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const { teamData, captainId } = input;

      try {
        // Helper function to calculate age
        const calculateAge = (dob: Date | string): number | null => {
          if (!dob) return null;
          const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
          const today = new Date();

          if (isNaN(birthDate.getTime())) return null;

          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }

          return age;
        };

        // Get user profile
        const userProfile = await db.user.findUnique({
          where: { id: captainId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            whatsappNumber: true,
            dateOfBirth: true,
            gender: true,
            panchayat: true,
            taluk: true,
            district: true,
            state: true,
            pincode: true,
            profileComplete: true,
          }
        });

        if (!userProfile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User profile not found',
          });
        }

        if (!userProfile.firstName || !userProfile.gender || !userProfile.dateOfBirth) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Incomplete user profile. Please update your profile before creating a team.',
          });
        }

        // Validate sport exists and get gender requirements
        const sport = await db.sport.findUnique({
          where: { id: teamData.sportId },
          include: {
            sportGenderCategories: {
              select: { genderCategory: true }
            }
          }
        });

        if (!sport || !sport.isActive) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Sport not found or inactive',
          });
        }

        // Check gender eligibility
        const supportedCategories = sport.sportGenderCategories.map(gc => gc.genderCategory);
        const userCanRegister = 
          supportedCategories.includes('mixed') || 
          (userProfile.gender === 'M' && supportedCategories.includes('men')) ||
          (userProfile.gender === 'F' && supportedCategories.includes('women'));

        if (!userCanRegister) {
          const supportedGenders = [];
          if (supportedCategories.includes('men')) supportedGenders.push('men');
          if (supportedCategories.includes('women')) supportedGenders.push('women');
          if (supportedCategories.includes('mixed')) supportedGenders.push('mixed teams');
          
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `This sport is only available for ${supportedGenders.join(' and ')}`,
          });
        }

        // Age checks
        const captainAge = calculateAge(userProfile.dateOfBirth);

        // Check if user is already captain of a team
        const existingTeam = await db.team.findFirst({
          where: { captainId: captainId },
          select: { id: true, name: true }
        });

        if (existingTeam) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `You are already registered in team "${existingTeam.name}".`,
          });
        }

        // Check if phone number is already used as captain
        if (userProfile.phone) {
          const existingPhoneTeam = await db.team.findFirst({
            where: {
              captainUser: {
                phone: userProfile.phone
              }
            },
            select: { id: true, name: true }
          });

          if (existingPhoneTeam) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: `A player with your phone number is already registered in team "${existingPhoneTeam.name}".`,
            });
          }
        }

        // Sport info already available from earlier validation
        const maxPlayers = sport?.mainPlayersCount || 6;
        const maxSubstitutes = sport?.maxSubstitutes || 3;

        // Create team in transaction
        const result = await db.$transaction(async (tx) => {
          // Create team
          const team = await tx.team.create({
            data: {
              name: teamData.name,
              description: teamData.description || '',
              captainId: captainId,
              captainName: `${userProfile.firstName} ${userProfile.lastName}`,
              sportId: teamData.sportId,
              genderCategory: teamData.genderCategory === 'M' ? 'men' : teamData.genderCategory === 'F' ? 'women' : 'mixed',
              currentPlayers: 1,
              currentSubstitutes: 0,
              panchayat: teamData.panchayat,
              taluk: teamData.taluk || userProfile.taluk || '',
              district: teamData.district,
              state: teamData.state,
              status: 'draft',
            }
          });

          // Add captain as team member
          await tx.teamPlayer.create({
            data: {
              teamId: team.id,
              userId: captainId,
              position: 'main',
              verificationStatus: 'pending',
              firstName: userProfile.firstName || '',
              lastName: userProfile.lastName || '',
              phone: userProfile.phone,
              whatsappNumber: userProfile.whatsappNumber || null,
              dateOfBirth: userProfile.dateOfBirth || '',
              age: captainAge || 18,
              gender: userProfile.gender || 'M',
              panchayat: userProfile.panchayat || '',
              taluk: userProfile.taluk || '',
              district: userProfile.district || '',
              state: userProfile.state || '',
              pincode: userProfile.pincode || '',
              addedBy: 'captain',
            }
          });

          // Promote user to captain role - update main role and create role history
          await tx.user.update({
            where: { id: captainId },
            data: { role: 'captain' }
          });

          // Create user role entry for tracking
          await tx.userRoleAssignment.create({
            data: {
              userId: captainId,
              eventId: null, // Global captain role for now, can be event-specific later
              role: 'captain',
              assignedBy: null, // Self-assigned through team creation
            }
          });

          return team;
        });

        return {
          success: true,
          teamId: result.id,
        };

      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create team. Please try again.',
        });
      }
    }),

  update: protectedProcedure
    .input(updateTeamSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input

      try {
        const team = await db.team.update({
          where: { id },
          data: updateData,
        })

        return team
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        })
      }
    }),

  // Team player management
  addPlayer: protectedProcedure
    .input(addTeamPlayerSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Get team and sport info for validation
        const team = await db.team.findUnique({
          where: { id: input.teamId },
          include: { sports: true },
        })
        if (!team) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found',
          })
        }

        // Check if user already exists by phone number
        const user = await db.user.findUnique({
          where: { phone: input.phone },
        })

        let userId: string

        if (user) {
          // User exists - use existing user ID
          userId = user.id
        } else {
          // User doesn't exist - create new user
          const newUser = await db.user.create({
            data: {
              firstName: input.firstName,
              lastName: input.lastName,
              phone: input.phone,
              dateOfBirth: input.dateOfBirth,
              gender: input.gender,
              panchayat: input.panchayat,
              taluk: input.taluk,
              district: input.district,
              state: input.state,
              pincode: input.pincode,
              role: 'player',
              profileComplete: false,
            },
          })
          userId = newUser.id
        }

        // Check if user is already in this team
        const existingPlayer = await db.teamPlayer.findUnique({
          where: {
            team_id_user_id: {
              teamId: input.teamId,
              userId: userId,
            },
          },
        })

        if (existingPlayer) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User is already in this team',
          })
        }

        // Check current player counts
        const currentMainPlayers = await db.teamPlayer.count({
          where: {
            teamId: input.teamId,
            position: 'main',
          },
        })

        const currentSubstitutes = await db.teamPlayer.count({
          where: {
            teamId: input.teamId,
            position: 'substitute',
          },
        })
        // Validate player limits
        if (input.position === 'main' && currentMainPlayers >= team.sport.mainPlayersCount) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Team already has maximum main players (${team.sport.mainPlayersCount})`,
          })
        }

        if (input.position === 'substitute' && currentSubstitutes >= team.sport.maxSubstitutes) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Team already has maximum substitutes (${team.sport.maxSubstitutes})`,
          })
        }
        console.log("ctx.user:", ctx.user)
        // Create team player record
        const player = await db.teamPlayer.create({
          data: {
            teamId: input.teamId,
            userId: userId,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            whatsappNumber: input.whatsappNumber,
            dateOfBirth: input.dateOfBirth,
            age: input.age,
            gender: input.gender,
            position: input.position,
            verificationStatus: input.verificationStatus || 'pending',
            panchayat: input.panchayat,
            taluk: input.taluk,
            district: input.district,
            state: input.state,
            pincode: input.pincode,
            addedBy: ctx.user.id,
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
        })
        // Update team player counts
        await db.team.update({
          where: { id: input.teamId },
          data: {
            ...(input.position === 'main'
              ? { currentPlayers: { increment: 1 } }
              : { currentSubstitutes: { increment: 1 } }),
          },
        });
        return player
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add player to team',
        })
      }
    }),

  removePlayer: protectedProcedure
    .input(removeTeamPlayerSchema)
    .mutation(async ({ input }) => {
      try {
        // The userId being passed is actually the teamPlayers.id
        // Let's find the player by teamPlayers.id instead
        const player = await db.teamPlayer.findUnique({
          where: {
            id: input.userId, // This is actually the teamPlayers.id
          },
        })

        if (!player) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Player not found in team',
          })
        }

        // Verify the player belongs to the correct team
        if (player.teamId !== input.teamId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Player does not belong to this team',
          })
        }

        await db.teamPlayer.delete({
          where: {
            id: input.userId, // This is actually the teamPlayers.id
          },
        })

        // Update team player counts
        const [mainCount, subCount] = await Promise.all([
          db.teamPlayer.count({
            where: { teamId: input.teamId, position: 'main' },
          }),
          db.teamPlayer.count({
            where: { teamId: input.teamId, position: 'substitute' },
          }),
        ])

        await db.team.update({
          where: { id: input.teamId },
          data: {
            currentPlayers: mainCount,
            currentSubstitutes: subCount,
          },
        })

        return { success: true }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove player from team',
        })
      }
    }),

  getPlayers: protectedProcedure
    .input(getTeamPlayersSchema)
    .query(async ({ input }) => {
      const { teamId, position } = input

      const where: any = { teamId }
      if (position) where.position = position

      const players = await db.teamPlayer.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
        orderBy: [
          { position: 'asc' },
          { createdAt: 'asc' },
        ],
      })

      return players
    }),

  // Team photo management
  uploadPhoto: protectedProcedure
    .input(uploadTeamPhotoSchema)
    .mutation(async ({ input }) => {
      try {
        const photo = await db.teamPhoto.upsert({
          where: { teamId: input.teamId },
          create: {
            teamId: input.teamId,
            photoPath: input.photoPath,
            uploadedBy: input.uploadedBy,
          },
          update: {
            photoPath: input.photoPath,
            uploadedBy: input.uploadedBy,
            uploadedAt: new Date(),
          },
        })

        return photo
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to upload team photo',
        })
      }
    }),

  // Venue assignment management
  createVenueAssignment: protectedProcedure
    .input(createTeamVenueAssignmentSchema)
    .mutation(async ({ input }) => {
      try {
        const assignment = await db.teamVenueAssignment.create({
          data: {
            teamId: input.teamId,
            eventId: input.eventId,
            clusterVenueMappingId: input.clusterVenueMappingId,
            assignedBy: input.assignedBy,
          },
          include: {
            clusterVenueMapping: {
              include: {
                venue: {
                  select: {
                    id: true,
                    name: true,
                    district: true,
                    state: true,
                  },
                },
              },
            },
          },
        })

        return assignment
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create venue assignment',
        })
      }
    }),

  updateVenueAssignment: protectedProcedure
    .input(updateTeamVenueAssignmentSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input

      try {
        const assignment = await db.teamVenueAssignment.update({
          where: { id },
          data: {
            divisionVenueMappingId: updateData.divisionVenueMappingId,
            finalVenueMappingId: updateData.finalVenueMappingId,
            clusterQualified: updateData.clusterQualified,
            divisionQualified: updateData.divisionQualified,
            finalQualified: updateData.finalQualified,
          },
        });

        return assignment
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Venue assignment not found',
        })
      }
    }),

  // Admin procedures
  verify: adminProcedure
    .input(verifyTeamSchema)
    .mutation(async ({ input }) => {
      const { id, status, verifiedBy } = input

      try {
        const team = await db.team.update({
          where: { id },
          data: {
            status,
            verifiedBy: verifiedBy,
            verifiedAt: status === 'verified' ? new Date() : null,
          },
        })

        return team
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        })
      }
    }),

  assignTournamentNumber: adminProcedure
    .input(z.object({
      teamId: z.string().uuid(),
      tournamentNumber: z.number().min(1),
      venueMappingId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Check if tournament number is already taken for this venue
        const existingTeam = await db.team.findFirst({
          where: {
            tournamentNumber: input.tournamentNumber,
            tournamentNumberVenueMappingId: input.venueMappingId,
            id: { not: input.teamId },
          },
        })

        if (existingTeam) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Tournament number already assigned to another team at this venue',
          })
        }

        const team = await db.team.update({
          where: { id: input.teamId },
          data: {
            tournamentNumber: input.tournamentNumber,
            tournamentNumberAssignedAt: new Date(),
            tournamentNumberVenueMappingId: input.venueMappingId,
          },
        })

        return team
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        })
      }
    }),

  getPlayerTeamById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const userId = ctx.user.id;

      const team = await db.team.findUnique({
        where: { id },
        include: {
          sport: true,
          captainUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          teamPlayers: {
            where: { userId: userId }, // Ensure the logged-in user is a player in this team
            select: {
              id: true,
              userId: true,
              teamId: true,
              firstName: true,
              lastName: true,
              phone: true,
              whatsappNumber: true,
              dateOfBirth: true,
              age: true,
              gender: true,
              position: true,
              verificationStatus: true,
              panchayat: true,
              taluk: true,
              district: true,
              state: true,
              pincode: true,
              addedBy: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  role: true,
                  profileComplete: true,
                  profileImages: {
                    select: {
                      userId: true,
                      profilePhotoPath: true,
                      aadhaarFrontPath: true,
                      aadhaarBackPath: true,
                      allImagesUploaded: true,
                      verifiedBy: true,
                      verifiedAt: true,
                      createdAt: true,
                      updatedAt: true,
                    },
                  },
                },
              },
            },
          },
          teamVenueAssignments: {
            orderBy: { assignedAt: 'desc' },
            take: 1,
            include: {
              clusterVenueMapping: {
                include: {
                  venue: true,
                },
              },
              divisionVenueMapping: {
                include: {
                  venue: true,
                },
              },
              finalVenueMapping: {
                include: {
                  venue: true,
                },
              },
            },
          },
        },
      });

      if (!team || team.teamPlayers.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found or you are not a player in this team',
        });
      }

      // Extract the specific player data for the current user
      const currentPlayerData = team.teamPlayers[0];

      // Transform the team object to match the TeamMembership interface expected by the frontend
      const transformedTeam = {
        teamId: team.id,
        name: team.name,
        sportName: team.sport.name,
        sportId: team.sportId,
        captainProfile: {
          name: team.captainUser.firstName + ' ' + team.captainUser.lastName,
          phone: team.captainUser.phone,
          userId: team.captainUser.id,
        },
        position: currentPlayerData.position,
        status: team.status,
        verificationStatus: currentPlayerData.verificationStatus,
        joinedAt: currentPlayerData.createdAt.toISOString(),
        panchayat: team.panchayat,
        district: team.district,
        state: team.state,
        genderCategory: team.genderCategory,
        maxPlayers: team.sport.mainPlayersCount + team.sport.maxSubstitutes,
        currentPlayers: team.currentPlayers + team.currentSubstitutes,
        assignedVenue: team.teamVenueAssignments[0] ? {
          venueId: team.teamVenueAssignments[0].finalVenueMapping?.venue?.id ||
                   team.teamVenueAssignments[0].divisionVenueMapping?.venue?.id ||
                   team.teamVenueAssignments[0].clusterVenueMapping?.venue?.id,
          venueName: team.teamVenueAssignments[0].finalVenueMapping?.venue?.name ||
                     team.teamVenueAssignments[0].divisionVenueMapping?.venue?.name ||
                     team.teamVenueAssignments[0].clusterVenueMapping?.venue?.name,
          assignmentLevel: team.teamVenueAssignments[0].level,
        } : undefined,
        checkedIn: false, // Placeholder, as this is not directly in Prisma team model
        checkedInAt: null, // Placeholder
        checkedInVenue: null, // Placeholder
        matchDayStatus: team.status, // Using team status as a proxy
      };

      return transformedTeam;
    }),

  // Verification procedures
  getForVerification: protectedProcedure
    .input(z.object({
      searchTerm: z.string().optional(),
      statusFilter: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Check if user has verification role
        if (!ctx.user || (ctx.user.role !== 'verification_volunteer' && ctx.user.role !== 'admin')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to access verification functionality',
          });
        }

        const { searchTerm = '', statusFilter = 'all' } = input;

        // Build where conditions
        const where: any = {};

        // Filter by status
        if (statusFilter && statusFilter !== 'all') {
          switch (statusFilter) {
            case 'pending':
              where.status = { in: ['submitted', 'pending'] };
              break;
            case 'verified':
              where.status = 'verified';
              break;
            case 'rejected':
              where.status = 'rejected';
              break;
            case 'partial':
              where.status = 'partial_verification';
              break;
            default:
              break;
          }
        }

        // Add search functionality
        if (searchTerm.trim()) {
          where.OR = [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { captainName: { contains: searchTerm, mode: 'insensitive' } },
            { panchayat: { contains: searchTerm, mode: 'insensitive' } },
            { district: { contains: searchTerm, mode: 'insensitive' } },
          ];
        }

        const teams = await db.team.findMany({
          where,
          include: {
            sport: {
              select: {
                id: true,
                name: true,
                mainPlayersCount: true,
              },
            },
            captainUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            event: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
            _count: {
              select: {
                teamPlayers: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        // Transform data to match frontend expectations
        const transformedTeams = teams.map(team => ({
          id: team.id,
          name: team.name,
          sportName: team.sport?.name || 'Unknown',
          captainProfile: {
            name: `${team.captainUser?.firstName || ''} ${team.captainUser?.lastName || ''}`.trim(),
            phone: team.captainUser?.phone || '',
          },
          panchayat: team.panchayat,
          district: team.district,
          state: team.state,
          currentPlayers: team._count?.teamPlayer || 0,
          maxPlayers: team.sport?.mainPlayersCount || 0,
          status: team.status,
          submittedAt: team.createdAt,
          genderCategory: team.genderCategory,
        }));

        // Apply client-side filtering if needed
        const filteredTeams = [...transformedTeams];

        return {
          teams: transformedTeams,
          filteredTeams,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch teams for verification',
        });
      }
    }),

  getForVerificationDetail: protectedProcedure
    .input(z.object({
      teamId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Check if user has verification role
        if (!ctx.user || (ctx.user.role !== 'verification_volunteer' && ctx.user.role !== 'admin')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to access verification functionality',
          });
        }

        const team : any = await db.team.findUnique({
          where: { id: input.teamId },
          include: {
            sport: {
              select: {
                id: true,
                name: true,
                mainPlayersCount: true,
                maxSubstitutes: true,
              },
            },
            captainUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            events: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
            teamPlayers: {
              select: {
                id: true,
                userId: true,
                firstName: true,
                lastName: true,
                phone: true,
                whatsappNumber: true,
                dateOfBirth: true,
                age: true,
                gender: true,
                position: true,
                verificationStatus: true,
                panchayat: true,
                taluk: true,
                district: true,
                state: true,
                pincode: true,
                createdAt: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    profileImages: {
                      select: {
                        profilePhotoPath: true,
                        aadhaarFrontPath: true,
                        aadhaarBackPath: true,
                        all_images_uploaded: true,
                        verifiedBy: true,
                        verified_at: true,
                      },
                    },
                  },
                },
              },
              orderBy: [
                { position: 'asc' },
                { createdAt: 'asc' },
              ],
            },
          },
        });

        if (!team) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found',
          });
        }

        // Transform team data
        const transformedTeam = {
          id: team.id,
          name: team.name,
          sportName: team.sport?.name || 'Unknown',
          sportId: team.sportId,
          captainProfile: {
            name: `${team.captainUser?.firstName || ''} ${team.captainUser?.lastName || ''}`.trim(),
            phone: team.captainUser?.phone || '',
          },
          panchayat: team.panchayat,
          district: team.district,
          state: team.state,
          currentPlayers: team.teamPlayers.length,
          maxPlayers: (team.sport?.mainPlayersCount || 0) + (team.sport?.maxSubstitutes || 0),
          status: team.status,
          submittedAt: team.createdAt,
          genderCategory: team.genderCategory,
        };

        // Transform players data
        const transformedPlayers = (team as any).teamPlayer?.map((player: any) => ({
          playerId: player.id,
          userId: player.userId,
          name: `${player.firstName} ${player.lastName}`.trim(),
          phone: player.phone,
          dob: player.dateOfBirth,
          age: player.age,
          gender: player.gender,
          position: player.position,
          profileData: {
            firstName: player.firstName,
            lastName: player.lastName,
            whatsappNumber: player.whatsapp_number || '',
            village: player.taluk || '',
            panchayat: player.panchayat,
            district: player.district,
            state: player.state,
          },
          documents: {
            profilePhoto: {
              url: player.users?.profileImages?.profilePhotoPath || null,
              verified: !!player.users?.profileImages?.verifiedBy,
              uploadedAt: null,
              uploadedBy: null,
            },
            aadhaarFront: {
              url: player.users?.profileImages?.aadhaarFrontPath || null,
              verified: !!player.users?.profileImages?.verifiedBy,
              uploadedAt: null,
              uploadedBy: null,
            },
            aadhaarBack: {
              url: player.users?.profileImages?.aadhaarBackPath || null,
              verified: !!player.users?.profileImages?.verifiedBy,
              uploadedAt: null,
              uploadedBy: null,
            },
          },
          verificationStatus: player.verificationStatus || 'pending',
          verificationComments: [], // Would need separate comments table
        }));

        return {
          team: transformedTeam,
          players: transformedPlayers,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch team details for verification',
        });
      }
    }),

  // Player verification procedures
  verifyPlayer: protectedProcedure
    .input(z.object({
      playerId: z.string().uuid(),
      status: z.enum(['verified', 'rejected']),
      comments: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if user has verification role
        if (!ctx.user || (ctx.user.role !== 'verification_volunteer' && ctx.user.role !== 'admin')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to verify players',
          });
        }

        // Update player verification status
        const updatedPlayer = await db.teamPlayer.update({
          where: { id: input.playerId },
          data: {
            verificationStatus: input.status,
            // Add verification comments if needed (would need additional table)
          },
        });

        // Get team and check if all players are verified
        const team = await db.team.findUnique({
          where: { id: updatedPlayer.teamId },
          include: {
            teamPlayers: {
              select: {
                verificationStatus: true,
              },
            },
          },
        });

        if (team) {
          const allPlayersVerified = team.teamPlayers.every(
            player => player.verificationStatus === 'verified'
          );

          // Update team status if all players are verified
          if (allPlayersVerified && team.status === 'submitted') {
            await db.team.update({
              where: { id: team.id },
              data: { status: 'verified' },
            });
          }
        }

        return updatedPlayer;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify player',
        });
      }
    }),

  verifyPlayersBulk: protectedProcedure
    .input(z.object({
      playerIds: z.array(z.string().uuid()),
      status: z.enum(['verified', 'rejected']),
      comments: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if user has verification role
        if (!ctx.user || (ctx.user.role !== 'verification_volunteer' && ctx.user.role !== 'admin')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to verify players',
          });
        }

        // Update all players
        const updatedPlayers = await db.teamPlayer.updateMany({
          where: { id: { in: input.playerIds } },
          data: {
            verificationStatus: input.status,
          },
        });

        // Get all affected teams and update their status if needed
        const affectedPlayers = await db.teamPlayer.findMany({
          where: { id: { in: input.playerIds } },
          select: { teamId: true },
        });

        const uniqueTeamIds = [...new Set(affectedPlayers.map(p => p.teamId))];

        // Check each team and update status if all players are verified
        for (const teamId of uniqueTeamIds) {
          const team = await db.team.findUnique({
            where: { id: teamId },
            include: {
              teamPlayers: {
                select: {
                  verificationStatus: true,
                },
              },
            },
          });

          if (team) {
            const allPlayersVerified = team.teamPlayers.every(
              player => player.verificationStatus === 'verified'
            );

            if (allPlayersVerified && team.status === 'submitted') {
              await db.team.update({
                where: { id: team.id },
                data: { status: 'verified' },
              });
            }
          }
        }

        return { updated: updatedPlayers.count };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify players in bulk',
        });
      }
    }),

  // Get fixtures for captain/player teams
  getMyTeamFixtures: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to view team fixtures',
        });
      }

      // Get teams where user is captain or player
      let teams = [];
      
      if (ctx.user.role === 'captain') {
        teams = await db.team.findMany({
          where: { captainId: ctx.user.id },
          select: {
            id: true,
            name: true,
            sportId: true,
            genderCategory: true,
            status: true,
            teamVenueAssignments: {
              select: {
                clusterVenueMappingId: true,
                divisionVenueMappingId: true,
                finalVenueMappingId: true,
              },
            },
          },
        });
      } else if (ctx.user.role === 'player') {
        const playerTeams = await db.teamPlayer.findMany({
          where: { userId: ctx.user.id },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                sportId: true,
                genderCategory: true,
                status: true,
                teamVenueAssignments: {
                  select: {
                    clusterVenueMappingId: true,
                    divisionVenueMappingId: true,
                    finalVenueMappingId: true,
                  },
                },
              },
            },
          },
        });
        teams = playerTeams.map(pt => pt.team);
      }

      if (teams.length === 0) {
        return [];
      }

      // Get all venue location mapping IDs for these teams
      const venueLocationMappingIds = new Set<string>();
      
      teams.forEach(team => {
        team.teamVenueAssignments?.forEach(assignment => {
          if (assignment.cluster_venue_mapping_id) venueLocationMappingIds.add(assignment.cluster_venue_mapping_id);
          if (assignment.division_venue_mapping_id) venueLocationMappingIds.add(assignment.division_venue_mapping_id);
          if (assignment.final_venue_mapping_id) venueLocationMappingIds.add(assignment.final_venue_mapping_id);
        });
      });

      if (venueLocationMappingIds.size === 0) {
        return [];
      }

      // Get fixtures for these venue locations
      const fixtures = await db.fixture.findMany({
        where: {
          venue_location_mapping_id: { in: Array.from(venueLocationMappingIds) },
        },
        include: {
          sports: {
            select: {
              id: true,
              name: true,
              display_name: true,
            },
          },
          venue_location_mappings: {
            include: {
              venues: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  district: true,
                  state: true,
                },
              },
            },
          },
          fixture_teams: {
            include: {
              teams: {
                select: {
                  id: true,
                  name: true,
                  tournamentNumber: true,
                },
              },
            },
          },
          matches: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const teamIds = teams.map(t => t.id);

      // Transform fixtures for frontend
      const transformedFixtures = fixtures.map(fixture => {
        const assignedTeams = fixture.fixture_teams?.map(ft => ft.teams) || [];
        const hasCaptainTeam = assignedTeams.some(team => team && teamIds.includes(team.id));
        const captainTeamNames = assignedTeams
          .filter(team => team && teamIds.includes(team.id))
          .map(team => team?.name || '');

        return {
          id: fixture.id,
          name: fixture.name,
          sportId: fixture.sportId,
          sportName: fixture.sport?.display_name || fixture.sport?.name || 'Unknown',
          genderCategory: fixture.genderCategory,
          level: fixture.level,
          status: fixture.status,
          venue: {
            id: fixture.venueLocationMapping?.venues?.id,
            name: fixture.venueLocationMapping?.venues?.name || 'Unknown Venue',
            address: fixture.venueLocationMapping?.venues?.address || '',
            district: fixture.venueLocationMapping?.venues?.district || '',
            state: fixture.venueLocationMapping?.venues?.state || '',
          },
          assignedTeams: assignedTeams.map(team => ({
            id: team?.id,
            name: team?.name,
            tournamentNumber: team?.tournamentNumber,
          })),
          hasCaptainTeam,
          captainTeamNames,
          totalMatches: fixture.matches?.length || 0,
          completedMatches: fixture.matches?.filter(m => m.status === 'completed').length || 0,
          createdAt: fixture.createdAt?.toISOString(),
          updatedAt: fixture.updatedAt?.toISOString(),
        };
      });

      return transformedFixtures;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch team fixtures',
      });
    }
  }),

  // Get matches for captain/player teams
  getMyTeamMatches: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to view team matches',
        });
      }

      // Get teams where user is captain or player
      let teams = [];
      
      if (ctx.user.role === 'captain') {
        teams = await db.team.findMany({
          where: { captainId: ctx.user.id },
          select: { id: true, name: true },
        });
      } else if (ctx.user.role === 'player') {
        const playerTeams = await db.teamPlayer.findMany({
          where: { userId: ctx.user.id },
          include: {
            team: {
              select: { id: true, name: true },
            },
          },
        });
        teams = playerTeams.map(pt => pt.team);
      }

      if (teams.length === 0) {
        return [];
      }

      const teamIds = teams.map(t => t.id);

      // Get matches involving these teams
      const matches = await db.match.findMany({
        where: {
          OR: [
            { team1Id: { in: teamIds } },
            { team2Id: { in: teamIds } },
          ],
        },
        include: {
          team1: {
            select: {
              id: true,
              name: true,
              tournamentNumber: true,
            },
          },
          team2: {
            select: {
              id: true,
              name: true,
              tournamentNumber: true,
            },
          },
          winner: {
            select: {
              id: true,
              name: true,
            },
          },
          sport: {
            select: {
              name: true,
            },
          },
          fixture: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          venueLocationMapping: {
            include: {
              venue: {
                select: {
                  id: true,
                  name: true,
                  district: true,
                  state: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Transform matches for frontend
      const transformedMatches = matches.map(match => {
        const isCaptainTeam1 = match.team1Id && teamIds.includes(match.team1Id);
        const isCaptainTeam2 = match.team2Id && teamIds.includes(match.team2Id);
        const isCaptainInvolved = isCaptainTeam1 || isCaptainTeam2;
        const captainTeamSide = isCaptainTeam1 ? 'team1' : isCaptainTeam2 ? 'team2' : null;
        const isCaptainTeamWinner = match.winnerId && teamIds.includes(match.winnerId);

        return {
          matchId: match.id,
          fixtureId: match.fixtureId,
          fixtureName: match.fixture?.name || 'Tournament Match',
          sportName: match.sport?.name || 'Unknown',
          genderCategory: match.genderCategory,
          roundName: match.roundName,
          matchNumber: match.matchNumber,
          status: match.status,
          team1: match.team1 ? {
            teamId: match.team1.id,
            teamName: match.team1.name,
            tournamentNumber: match.team1.tournamentNumber,
          } : null,
          team2: match.team2 ? {
            teamId: match.team2.id,
            teamName: match.team2.name,
            tournamentNumber: match.team2.tournamentNumber,
          } : null,
          result: match.winner ? {
            winnerName: match.winner.name,
            winnerTeamId: match.winner.id,
            score: {
              team1Score: match.team1Score || 0,
              team2Score: match.team2Score || 0,
            },
          } : null,
          venue: {
            id: match.venueLocationMapping?.venue?.id,
            name: match.venueLocationMapping?.venue?.name || 'Unknown Venue'
          },
          isCaptainInvolved,
          captainTeamSide,
          isCaptainTeamWinner,
          createdAt: match.createdAt?.toISOString(),
          updatedAt: match.updatedAt?.toISOString(),
        };
      });

      return transformedMatches;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch team matches',
      });
    }
  }),

  // Get teams for current user (captain or player)
  getMyTeams: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to view teams',
        });
      }

      let teams = [];

      if (ctx.user.role === 'captain') {
        teams = await db.team.findMany({
          where: { captainId: ctx.user.id },
          include: {
            sports: {
              select: {
                name: true,
                display_name: true,
                mainPlayersCount: true,
                maxSubstitutes: true,
              },
            },
            teamPlayers: {
              select: {
                id: true,
              },
            },
            teamVenueAssignments: {
              include: {
                clusterVenueMapping: {
                  include: {
                    venue: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                divisionVenueMapping: {
                  include: {
                    venue: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                finalVenueMapping: {
                  include: {
                    venue: {
                      select: {
                        id: true,
                        name: true
                      },
                    },
                  },
                },
              },
            },
          },
        });
      } else if (ctx.user.role === 'player') {
        const playerTeams = await db.teamPlayer.findMany({
          where: { userId: ctx.user.id },
          include: {
            team: {
              include: {
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
                  },
                },
                teamVenueAssignments: {
                  include: {
                    clusterVenueMapping: {
                      include: {
                        venue: {
                          select: {
                            id: true,
                            name: true,

                          },
                        },
                      },
                    },
                    divisionVenueMapping: {
                      include: {
                        venue: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                      },
                    },
                    finalVenueMapping: {
                      include: {
                        venue: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });
        teams = playerTeams.map(pt => pt.team);
      }

      // Transform teams for frontend
      const transformedTeams = teams.map(team => {
        // Get venue assignment (prefer final > division > cluster)
        const venueAssignment = 
          team.teamVenueAssignments?.find(assignment => 
            assignment.teamVenueAssignmentsByFinal
          )?.teamVenueAssignmentsByFinal ||
          team.teamVenueAssignments?.find(assignment => 
            assignment.teamVenueAssignmentsByDivision
          )?.teamVenueAssignmentsByDivision ||
          team.teamVenueAssignments?.find(assignment => 
            assignment.teamVenueAssignmentsByCluster
          )?.teamVenueAssignmentsByCluster;

        return {
          teamId: team.id,
          name: team.name,
          sportName: team.sports?.display_name || team.sports?.name || 'Unknown',
          panchayat: team.panchayat,
          district: team.district,
          state: team.state,
          status: team.status,
          currentPlayers: team.teamPlayers?.length || 0,
          maxPlayers: (team.sports?.mainPlayersCount || 0) + (team.sports?.maxSubstitutes || 0),
          venue: venueAssignment?.venues ? {
            id: venueAssignment.venues.id,
            name: venueAssignment.venues.name,
            address: venueAssignment.venues.address || '',
          } : undefined,
        };
      });

      return transformedTeams;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch teams',
      });
    }
  }),
})