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

      const team = await db.teams.findUnique({
        where: { id },
        include: {
          sports: true,
          users_teams_captain_idTousers: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
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
          team_photos: includePhotos,
          team_players: includePlayers ? {
            select: {
              id: true,
              userId: true,
              teamId: true,
              first_name: true,
              last_name: true,
              phone: true,
              whatsapp_number: true,
              date_of_birth: true,
              age: true,
              gender: true,
              position: true,
              verification_status: true,
              panchayat: true,
              taluk: true,
              district: true,
              state: true,
              pincode: true,
              added_by: true,
              createdAt: true,
              users: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  phone: true,
                  role: true,
                  profile_complete: true,
                  user_profile_images_user_profile_images_user_idTousers: {
                    select: {
                      userId: true,
                      profile_photo_path: true,
                      aadhaar_front_path: true,
                      aadhaar_back_path: true,
                      all_images_uploaded: true,
                      verified_by: true,
                      verified_at: true,
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
          team_venue_assignments: includeVenueAssignments ? {
            include: {
              events: {
                select: {
                  id: true,
                  name: true,
                },
              },
              venue_location_mappings_team_venue_assignments_cluster_venue_mapping_idTovenue_location_mappings: {
                include: {
                  venues: {
                    select: {
                      id: true,
                      name: true,
                      district: true,
                      state: true,
                    },
                  },
                },
              },
              venue_location_mappings_team_venue_assignments_division_venue_mapping_idTovenue_location_mappings: {
                include: {
                  venues: {
                    select: {
                      id: true,
                      name: true,
                      district: true,
                      state: true,
                    },
                  },
                },
              },
              venue_location_mappings_team_venue_assignments_final_venue_mapping_idTovenue_location_mappings: {
                include: {
                  venues: {
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

      if (sportId) where.sport_id = sportId
      if (eventId) where.eventId = eventId
      if (genderCategory) where.genderCategory = genderCategory
      if (status) where.status = status
      if (captainId) where.captain_id = captainId
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
        'tournamentNumber': 'tournament_number'
      };

      const dbSortBy = sortByMapping[sortBy] || 'createdAt';

      const [teamsFromDb, total] = await Promise.all([
        db.teams.findMany({
          where,
          include: {
            sports: {
              select: {
                id: true,
                name: true,
              },
            },
            users_teams_captain_idTousers: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
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
            team_players: {
              select: {
                position: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { [dbSortBy]: sortOrder },
        }),
        db.teams.count({ where }),
      ]);

      const teams = teamsFromDb.map(team => {
        const mainPlayersCount = team.team_players.filter(p => p.position === 'main').length;
        const substitutePlayersCount = team.team_players.filter(p => p.position === 'substitute').length;
        
        const { team_players, ...restOfTeam } = team;

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
      if (sportId) where.sport_id = sportId
      if (genderCategory) where.genderCategory = genderCategory

      const teams = await db.teams.findMany({
        where,
        include: {
          sports: {
            select: {
              id: true,
              name: true,
            },
          },
          users_teams_captain_idTousers: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              phone: true,
            },
          },
          _count: {
            select: {
              team_players: true,
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

      if (sportId) where.sport_id = sportId
      if (genderCategory) where.genderCategory = genderCategory

      const teams = await db.teams.findMany({
        where,
        include: {
          sports: {
            select: {
              id: true,
              name: true,
            },
          },
          users_teams_captain_idTousers: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              phone: true,
            },
          },
          _count: {
            select: {
              team_players: true,
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

    const team = await db.teams.findFirst({
      where: { captain_id: captainId },
      include: {
        sports: true,
        users_teams_captain_idTousers: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
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
        team_photos: true,
        team_players: {
          select: {
            id: true,
            userId: true,
            teamId: true,
            first_name: true,
            last_name: true,
            phone: true,
            whatsapp_number: true,
            date_of_birth: true,
            age: true,
            gender: true,
            position: true,
            verification_status: true,
            panchayat: true,
            taluk: true,
            district: true,
            state: true,
            pincode: true,
            added_by: true,
            createdAt: true,
            users: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                phone: true,
                role: true,
                profile_complete: true,
                user_profile_images_user_profile_images_user_idTousers: {
                  select: {
                    userId: true,
                    profile_photo_path: true,
                    aadhaar_front_path: true,
                    aadhaar_back_path: true,
                    all_images_uploaded: true,
                    verified_by: true,
                    verified_at: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        },
        team_venue_assignments: {
          include: {
            events: {
              select: {
                id: true,
                name: true,
              },
            },
            venue_location_mappings_team_venue_assignments_cluster_venue_mapping_idTovenue_location_mappings: {
              include: {
                venues: {
                  select: {
                    id: true,
                    name: true,
                    district: true,
                    state: true,
                  },
                },
              },
            },
            venue_location_mappings_team_venue_assignments_division_venue_mapping_idTovenue_location_mappings: {
              include: {
                venues: {
                  select: {
                    id: true,
                    name: true,
                    district: true,
                    state: true,
                  },
                },
              },
            },
            venue_location_mappings_team_venue_assignments_final_venue_mapping_idTovenue_location_mappings: {
              include: {
                venues: {
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
        const existingCaptain = await db.teams.findFirst({
          where: {
            captain_id: input.captainId,
            sport_id: input.sportId,
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

        const team = await db.teams.create({
          data: {
            name: input.name,
            sport_id: input.sportId,
            captain_id: input.captainId,
            captain_name: input.captainName,
            gender_category: input.genderCategory,
            panchayat: input.panchayat,
            taluk: input.taluk,
            district: input.district,
            state: input.state,
            description: input.description,
            eventId: input.eventId,
            pincode: input.pincode,
          },
          include: {
            sports: true,
            users_teams_captain_idTousers: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
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
        const userProfile = await db.users.findUnique({
          where: { id: captainId },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone: true,
            whatsapp_number: true,
            date_of_birth: true,
            gender: true,
            panchayat: true,
            taluk: true,
            district: true,
            state: true,
            pincode: true,
            profile_complete: true,
          }
        });

        if (!userProfile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User profile not found',
          });
        }

        if (!userProfile.first_name || !userProfile.gender || !userProfile.date_of_birth) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Incomplete user profile. Please update your profile before creating a team.',
          });
        }

        // Validate sport exists and get gender requirements
        const sport = await db.sports.findUnique({
          where: { id: teamData.sportId },
          include: {
            sport_gender_categories: {
              select: { gender_category: true }
            }
          }
        });

        if (!sport || !sport.is_active) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Sport not found or inactive',
          });
        }

        // Check gender eligibility
        const supportedCategories = sport.sport_gender_categories.map(gc => gc.gender_category);
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
        const captainAge = calculateAge(userProfile.date_of_birth);

        // Check if user is already captain of a team
        const existingTeam = await db.teams.findFirst({
          where: { captain_id: captainId },
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
          const existingPhoneTeam = await db.teams.findFirst({
            where: {
              users_teams_captain_idTousers: {
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
        const maxPlayers = sport?.main_players_count || 6;
        const maxSubstitutes = sport?.max_substitutes || 3;

        // Create team in transaction
        const result = await db.$transaction(async (tx) => {
          // Create team
          const team = await tx.teams.create({
            data: {
              name: teamData.name,
              description: teamData.description || '',
              captain_id: captainId,
              captain_name: `${userProfile.first_name} ${userProfile.last_name}`,
              sport_id: teamData.sportId,
              gender_category: teamData.genderCategory === 'M' ? 'men' : teamData.genderCategory === 'F' ? 'women' : 'mixed',
              current_players: 1,
              current_substitutes: 0,
              panchayat: teamData.panchayat,
              taluk: teamData.taluk || userProfile.taluk || '',
              district: teamData.district,
              state: teamData.state,
              status: 'draft',
            }
          });

          // Add captain as team member
          await tx.team_players.create({
            data: {
              teamId: team.id,
              userId: captainId,
              position: 'main',
              verification_status: 'pending',
              first_name: userProfile.first_name || '',
              last_name: userProfile.last_name || '',
              phone: userProfile.phone,
              whatsapp_number: userProfile.whatsapp_number || null,
              date_of_birth: userProfile.date_of_birth || '',
              age: captainAge || 18,
              gender: userProfile.gender || 'M',
              panchayat: userProfile.panchayat || '',
              taluk: userProfile.taluk || '',
              district: userProfile.district || '',
              state: userProfile.state || '',
              pincode: userProfile.pincode || '',
              added_by: 'captain',
            }
          });

          // Promote user to captain role - update main role and create role history
          await tx.users.update({
            where: { id: captainId },
            data: { role: 'captain' }
          });

          // Create user role entry for tracking
          await tx.user_roles.create({
            data: {
              userId: captainId,
              eventId: null, // Global captain role for now, can be event-specific later
              role: 'captain',
              assigned_by: null, // Self-assigned through team creation
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
        const team = await db.teams.update({
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
        const team = await db.teams.findUnique({
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
        const user = await db.users.findUnique({
          where: { phone: input.phone },
        })

        let userId: string

        if (user) {
          // User exists - use existing user ID
          userId = user.id
        } else {
          // User doesn't exist - create new user
          const newUser = await db.users.create({
            data: {
              first_name: input.firstName,
              last_name: input.lastName,
              phone: input.phone,
              date_of_birth: input.dateOfBirth,
              gender: input.gender,
              panchayat: input.panchayat,
              taluk: input.taluk,
              district: input.district,
              state: input.state,
              pincode: input.pincode,
              role: 'player',
              profile_complete: false,
            },
          })
          userId = newUser.id
        }

        // Check if user is already in this team
        const existingPlayer = await db.team_players.findUnique({
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
        const currentMainPlayers = await db.team_players.count({
          where: {
            teamId: input.teamId,
            position: 'main',
          },
        })

        const currentSubstitutes = await db.team_players.count({
          where: {
            teamId: input.teamId,
            position: 'substitute',
          },
        })
        // Validate player limits
        if (input.position === 'main' && currentMainPlayers >= team.sports.main_players_count) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Team already has maximum main players (${team.sports.main_players_count})`,
          })
        }

        if (input.position === 'substitute' && currentSubstitutes >= team.sports.max_substitutes) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Team already has maximum substitutes (${team.sports.max_substitutes})`,
          })
        }
        console.log("ctx.user:", ctx.user)
        // Create team player record
        const player = await db.team_players.create({
          data: {
            teamId: input.teamId,
            userId: userId,
            first_name: input.firstName,
            last_name: input.lastName,
            phone: input.phone,
            whatsapp_number: input.whatsappNumber,
            date_of_birth: input.dateOfBirth,
            age: input.age,
            gender: input.gender,
            position: input.position,
            verification_status: input.verificationStatus || 'pending',
            panchayat: input.panchayat,
            taluk: input.taluk,
            district: input.district,
            state: input.state,
            pincode: input.pincode,
            added_by: ctx.user.id,
          },
          include: {
            users: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                phone: true,
              },
            },
          },
        })
        // Update team player counts
        await db.teams.update({
          where: { id: input.teamId },
          data: {
            ...(input.position === 'main'
              ? { current_players: { increment: 1 } }
              : { current_substitutes: { increment: 1 } }),
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
        // The userId being passed is actually the team_players.id
        // Let's find the player by team_players.id instead
        const player = await db.team_players.findUnique({
          where: {
            id: input.userId, // This is actually the team_players.id
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

        await db.team_players.delete({
          where: {
            id: input.userId, // This is actually the team_players.id
          },
        })

        // Update team player counts
        const [mainCount, subCount] = await Promise.all([
          db.team_players.count({
            where: { teamId: input.teamId, position: 'main' },
          }),
          db.team_players.count({
            where: { teamId: input.teamId, position: 'substitute' },
          }),
        ])

        await db.teams.update({
          where: { id: input.teamId },
          data: {
            current_players: mainCount,
            current_substitutes: subCount,
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

      const players = await db.team_players.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
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
        const photo = await db.team_photos.upsert({
          where: { teamId: input.teamId },
          create: {
            teamId: input.teamId,
            photo_path: input.photoPath,
            uploaded_by: input.uploadedBy,
          },
          update: {
            photo_path: input.photoPath,
            uploaded_by: input.uploadedBy,
            uploaded_at: new Date(),
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
        const assignment = await db.team_venue_assignments.create({
          data: {
            teamId: input.teamId,
            eventId: input.eventId,
            cluster_venue_mapping_id: input.clusterVenueMappingId,
            assigned_by: input.assignedBy,
          },
          include: {
            venue_location_mappings_team_venue_assignments_cluster_venue_mapping_idTovenue_location_mappings: {
              include: {
                venues: {
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
        const assignment = await db.team_venue_assignments.update({
          where: { id },
          data: {
            division_venue_mapping_id: updateData.divisionVenueMappingId,
            final_venue_mapping_id: updateData.finalVenueMappingId,
            cluster_qualified: updateData.clusterQualified,
            division_qualified: updateData.divisionQualified,
            final_qualified: updateData.finalQualified,
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
        const team = await db.teams.update({
          where: { id },
          data: {
            status,
            verified_by: verifiedBy,
            verified_at: status === 'verified' ? new Date() : null,
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
        const existingTeam = await db.teams.findFirst({
          where: {
            tournament_number: input.tournamentNumber,
            tournament_number_venue_mapping_id: input.venueMappingId,
            id: { not: input.teamId },
          },
        })

        if (existingTeam) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Tournament number already assigned to another team at this venue',
          })
        }

        const team = await db.teams.update({
          where: { id: input.teamId },
          data: {
            tournament_number: input.tournamentNumber,
            tournament_number_assigned_at: new Date(),
            tournament_number_venue_mapping_id: input.venueMappingId,
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

      const team = await db.teams.findUnique({
        where: { id },
        include: {
          sports: true,
          users_teams_captain_idTousers: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              phone: true,
            },
          },
          team_players: {
            where: { userId: userId }, // Ensure the logged-in user is a player in this team
            select: {
              id: true,
              userId: true,
              teamId: true,
              first_name: true,
              last_name: true,
              phone: true,
              whatsapp_number: true,
              date_of_birth: true,
              age: true,
              gender: true,
              position: true,
              verification_status: true,
              panchayat: true,
              taluk: true,
              district: true,
              state: true,
              pincode: true,
              added_by: true,
              createdAt: true,
              users: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  phone: true,
                  role: true,
                  profile_complete: true,
                  user_profile_images_user_profile_images_user_idTousers: {
                    select: {
                      userId: true,
                      profile_photo_path: true,
                      aadhaar_front_path: true,
                      aadhaar_back_path: true,
                      all_images_uploaded: true,
                      verified_by: true,
                      verified_at: true,
                      createdAt: true,
                      updatedAt: true,
                    },
                  },
                },
              },
            },
          },
          team_venue_assignments: {
            orderBy: { assigned_at: 'desc' },
            take: 1,
            include: {
              venue_location_mappings_team_venue_assignments_cluster_venue_mapping_idTovenue_location_mappings: {
                include: {
                  venues: true,
                },
              },
              venue_location_mappings_team_venue_assignments_division_venue_mapping_idTovenue_location_mappings: {
                include: {
                  venues: true,
                },
              },
              venue_location_mappings_team_venue_assignments_final_venue_mapping_idTovenue_location_mappings: {
                include: {
                  venues: true,
                },
              },
            },
          },
        },
      });

      if (!team || team.team_players.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found or you are not a player in this team',
        });
      }

      // Extract the specific player data for the current user
      const currentPlayerData = team.team_players[0];

      // Transform the team object to match the TeamMembership interface expected by the frontend
      const transformedTeam = {
        teamId: team.id,
        name: team.name,
        sportName: team.sports.name,
        sportId: team.sport_id,
        captainProfile: {
          name: team.users_teams_captain_idTousers.first_name + ' ' + team.users_teams_captain_idTousers.last_name,
          phone: team.users_teams_captain_idTousers.phone,
          userId: team.users_teams_captain_idTousers.id,
        },
        position: currentPlayerData.position,
        status: team.status,
        verificationStatus: currentPlayerData.verification_status,
        joinedAt: currentPlayerData.createdAt.toISOString(),
        panchayat: team.panchayat,
        district: team.district,
        state: team.state,
        genderCategory: team.gender_category,
        maxPlayers: team.sports.main_players_count + team.sports.max_substitutes,
        currentPlayers: team.current_players + team.current_substitutes,
        assignedVenue: team.team_venue_assignments[0] ? {
          venueId: team.team_venue_assignments[0].venue_location_mappings_team_venue_assignments_final_venue_mapping_idTovenue_location_mappings?.venues?.id ||
                   team.team_venue_assignments[0].venue_location_mappings_team_venue_assignments_division_venue_mapping_idTovenue_location_mappings?.venues?.id ||
                   team.team_venue_assignments[0].venue_location_mappings_team_venue_assignments_cluster_venue_mapping_idTovenue_location_mappings?.venues?.id,
          venueName: team.team_venue_assignments[0].venue_location_mappings_team_venue_assignments_final_venue_mapping_idTovenue_location_mappings?.venues?.name ||
                     team.team_venue_assignments[0].venue_location_mappings_team_venue_assignments_division_venue_mapping_idTovenue_location_mappings?.venues?.name ||
                     team.team_venue_assignments[0].venue_location_mappings_team_venue_assignments_cluster_venue_mapping_idTovenue_location_mappings?.venues?.name,
          assignmentLevel: team.team_venue_assignments[0].level,
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
            { captain_name: { contains: searchTerm, mode: 'insensitive' } },
            { panchayat: { contains: searchTerm, mode: 'insensitive' } },
            { district: { contains: searchTerm, mode: 'insensitive' } },
          ];
        }

        const teams = await db.teams.findMany({
          where,
          include: {
            sports: {
              select: {
                id: true,
                name: true,
                main_players_count: true,
              },
            },
            users_teams_captain_idTousers: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
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
            _count: {
              select: {
                team_players: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        // Transform data to match frontend expectations
        const transformedTeams = teams.map(team => ({
          id: team.id,
          name: team.name,
          sportName: team.sports?.name || 'Unknown',
          captainProfile: {
            name: `${team.users_teams_captain_idTousers?.first_name || ''} ${team.users_teams_captain_idTousers?.last_name || ''}`.trim(),
            phone: team.users_teams_captain_idTousers?.phone || '',
          },
          panchayat: team.panchayat,
          district: team.district,
          state: team.state,
          currentPlayers: team._count?.team_players || 0,
          maxPlayers: team.sports?.main_players_count || 0,
          status: team.status,
          submittedAt: team.createdAt,
          genderCategory: team.gender_category,
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

        const team = await db.teams.findUnique({
          where: { id: input.teamId },
          include: {
            sports: {
              select: {
                id: true,
                name: true,
                main_players_count: true,
                max_substitutes: true,
              },
            },
            users_teams_captain_idTousers: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
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
            team_players: {
              select: {
                id: true,
                userId: true,
                first_name: true,
                last_name: true,
                phone: true,
                whatsapp_number: true,
                date_of_birth: true,
                age: true,
                gender: true,
                position: true,
                verification_status: true,
                panchayat: true,
                taluk: true,
                district: true,
                state: true,
                pincode: true,
                createdAt: true,
                users: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    phone: true,
                    user_profile_images_user_profile_images_user_idTousers: {
                      select: {
                        profile_photo_path: true,
                        aadhaar_front_path: true,
                        aadhaar_back_path: true,
                        all_images_uploaded: true,
                        verified_by: true,
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
          sportName: team.sports?.name || 'Unknown',
          sportId: team.sport_id,
          captainProfile: {
            name: `${team.users_teams_captain_idTousers?.first_name || ''} ${team.users_teams_captain_idTousers?.last_name || ''}`.trim(),
            phone: team.users_teams_captain_idTousers?.phone || '',
          },
          panchayat: team.panchayat,
          district: team.district,
          state: team.state,
          currentPlayers: team.team_players.length,
          maxPlayers: (team.sports?.main_players_count || 0) + (team.sports?.max_substitutes || 0),
          status: team.status,
          submittedAt: team.createdAt,
          genderCategory: team.gender_category,
        };

        // Transform players data
        const transformedPlayers = team.team_players.map(player => ({
          playerId: player.id,
          userId: player.userId,
          name: `${player.first_name} ${player.last_name}`.trim(),
          phone: player.phone,
          dob: player.date_of_birth,
          age: player.age,
          gender: player.gender,
          position: player.position,
          profileData: {
            firstName: player.first_name,
            lastName: player.last_name,
            whatsappNumber: player.whatsapp_number || '',
            village: player.taluk || '',
            panchayat: player.panchayat,
            district: player.district,
            state: player.state,
          },
          documents: {
            profilePhoto: {
              url: player.users?.user_profile_images_user_profile_images_user_idTousers?.profile_photo_path || null,
              verified: !!player.users?.user_profile_images_user_profile_images_user_idTousers?.verified_by,
              uploadedAt: null,
              uploadedBy: null,
            },
            aadhaarFront: {
              url: player.users?.user_profile_images_user_profile_images_user_idTousers?.aadhaar_front_path || null,
              verified: !!player.users?.user_profile_images_user_profile_images_user_idTousers?.verified_by,
              uploadedAt: null,
              uploadedBy: null,
            },
            aadhaarBack: {
              url: player.users?.user_profile_images_user_profile_images_user_idTousers?.aadhaar_back_path || null,
              verified: !!player.users?.user_profile_images_user_profile_images_user_idTousers?.verified_by,
              uploadedAt: null,
              uploadedBy: null,
            },
          },
          verificationStatus: player.verification_status || 'pending',
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
        const updatedPlayer = await db.team_players.update({
          where: { id: input.playerId },
          data: {
            verification_status: input.status,
            // Add verification comments if needed (would need additional table)
          },
        });

        // Get team and check if all players are verified
        const team = await db.teams.findUnique({
          where: { id: updatedPlayer.teamId },
          include: {
            team_players: {
              select: {
                verification_status: true,
              },
            },
          },
        });

        if (team) {
          const allPlayersVerified = team.team_players.every(
            player => player.verification_status === 'verified'
          );

          // Update team status if all players are verified
          if (allPlayersVerified && team.status === 'submitted') {
            await db.teams.update({
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
        const updatedPlayers = await db.team_players.updateMany({
          where: { id: { in: input.playerIds } },
          data: {
            verification_status: input.status,
          },
        });

        // Get all affected teams and update their status if needed
        const affectedPlayers = await db.team_players.findMany({
          where: { id: { in: input.playerIds } },
          select: { teamId: true },
        });

        const uniqueTeamIds = [...new Set(affectedPlayers.map(p => p.teamId))];

        // Check each team and update status if all players are verified
        for (const teamId of uniqueTeamIds) {
          const team = await db.teams.findUnique({
            where: { id: teamId },
            include: {
              team_players: {
                select: {
                  verification_status: true,
                },
              },
            },
          });

          if (team) {
            const allPlayersVerified = team.team_players.every(
              player => player.verification_status === 'verified'
            );

            if (allPlayersVerified && team.status === 'submitted') {
              await db.teams.update({
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
        teams = await db.teams.findMany({
          where: { captain_id: ctx.user.id },
          select: {
            id: true,
            name: true,
            sport_id: true,
            gender_category: true,
            status: true,
            team_venue_assignments: {
              select: {
                cluster_venue_mapping_id: true,
                division_venue_mapping_id: true,
                final_venue_mapping_id: true,
              },
            },
          },
        });
      } else if (ctx.user.role === 'player') {
        const playerTeams = await db.team_players.findMany({
          where: { userId: ctx.user.id },
          include: {
            teams: {
              select: {
                id: true,
                name: true,
                sport_id: true,
                gender_category: true,
                status: true,
                team_venue_assignments: {
                  select: {
                    cluster_venue_mapping_id: true,
                    division_venue_mapping_id: true,
                    final_venue_mapping_id: true,
                  },
                },
              },
            },
          },
        });
        teams = playerTeams.map(pt => pt.teams);
      }

      if (teams.length === 0) {
        return [];
      }

      // Get all venue location mapping IDs for these teams
      const venueLocationMappingIds = new Set<string>();
      
      teams.forEach(team => {
        team.team_venue_assignments?.forEach(assignment => {
          if (assignment.cluster_venue_mapping_id) venueLocationMappingIds.add(assignment.cluster_venue_mapping_id);
          if (assignment.division_venue_mapping_id) venueLocationMappingIds.add(assignment.division_venue_mapping_id);
          if (assignment.final_venue_mapping_id) venueLocationMappingIds.add(assignment.final_venue_mapping_id);
        });
      });

      if (venueLocationMappingIds.size === 0) {
        return [];
      }

      // Get fixtures for these venue locations
      const fixtures = await db.fixtures.findMany({
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
                  tournament_number: true,
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
          sportId: fixture.sport_id,
          sportName: fixture.sports?.display_name || fixture.sports?.name || 'Unknown',
          genderCategory: fixture.gender_category,
          level: fixture.level,
          status: fixture.status,
          venue: {
            id: fixture.venue_location_mappings?.venues?.id,
            name: fixture.venue_location_mappings?.venues?.name || 'Unknown Venue',
            address: fixture.venue_location_mappings?.venues?.address || '',
            district: fixture.venue_location_mappings?.venues?.district || '',
            state: fixture.venue_location_mappings?.venues?.state || '',
          },
          assignedTeams: assignedTeams.map(team => ({
            id: team?.id,
            name: team?.name,
            tournamentNumber: team?.tournament_number,
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
        teams = await db.teams.findMany({
          where: { captain_id: ctx.user.id },
          select: { id: true, name: true },
        });
      } else if (ctx.user.role === 'player') {
        const playerTeams = await db.team_players.findMany({
          where: { userId: ctx.user.id },
          include: {
            teams: {
              select: { id: true, name: true },
            },
          },
        });
        teams = playerTeams.map(pt => pt.teams);
      }

      if (teams.length === 0) {
        return [];
      }

      const teamIds = teams.map(t => t.id);

      // Get matches involving these teams
      const matches = await db.matches.findMany({
        where: {
          OR: [
            { team1_id: { in: teamIds } },
            { team2_id: { in: teamIds } },
          ],
        },
        include: {
          teams_matches_team1_idToteams: {
            select: {
              id: true,
              name: true,
              tournament_number: true,
            },
          },
          teams_matches_team2_idToteams: {
            select: {
              id: true,
              name: true,
              tournament_number: true,
            },
          },
          teams_matches_winner_idToteams: {
            select: {
              id: true,
              name: true,
            },
          },
          sports: {
            select: {
              name: true,
              display_name: true,
            },
          },
          fixtures: {
            select: {
              id: true,
              name: true,
              status: true,
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
        },
        orderBy: { createdAt: 'desc' },
      });

      // Transform matches for frontend
      const transformedMatches = matches.map(match => {
        const isCaptainTeam1 = match.team1_id && teamIds.includes(match.team1_id);
        const isCaptainTeam2 = match.team2_id && teamIds.includes(match.team2_id);
        const isCaptainInvolved = isCaptainTeam1 || isCaptainTeam2;
        const captainTeamSide = isCaptainTeam1 ? 'team1' : isCaptainTeam2 ? 'team2' : null;
        const isCaptainTeamWinner = match.winner_id && teamIds.includes(match.winner_id);

        return {
          matchId: match.id,
          fixtureId: match.fixture_id,
          fixtureName: match.fixtures?.name || 'Tournament Match',
          sportName: match.sports?.display_name || match.sports?.name || 'Unknown',
          genderCategory: match.gender_category,
          roundName: match.round_name,
          matchNumber: match.match_number,
          status: match.status,
          team1: match.teams_matches_team1_idToteams ? {
            teamId: match.teams_matches_team1_idToteams.id,
            teamName: match.teams_matches_team1_idToteams.name,
            tournamentNumber: match.teams_matches_team1_idToteams.tournament_number,
          } : null,
          team2: match.teams_matches_team2_idToteams ? {
            teamId: match.teams_matches_team2_idToteams.id,
            teamName: match.teams_matches_team2_idToteams.name,
            tournamentNumber: match.teams_matches_team2_idToteams.tournament_number,
          } : null,
          result: match.teams_matches_winner_idToteams ? {
            winnerName: match.teams_matches_winner_idToteams.name,
            winnerTeamId: match.teams_matches_winner_idToteams.id,
            score: {
              team1Score: match.team1_score || 0,
              team2Score: match.team2_score || 0,
            },
          } : null,
          venue: {
            id: match.venue_location_mappings?.venues?.id,
            name: match.venue_location_mappings?.venues?.name || 'Unknown Venue',
            address: match.venue_location_mappings?.venues?.address || '',
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
        teams = await db.teams.findMany({
          where: { captain_id: ctx.user.id },
          include: {
            sports: {
              select: {
                name: true,
                display_name: true,
                main_players_count: true,
                max_substitutes: true,
              },
            },
            team_players: {
              select: {
                id: true,
              },
            },
            team_venue_assignments: {
              include: {
                venue_location_mappings_team_venue_assignments_cluster_venue_mapping_idTovenue_location_mappings: {
                  include: {
                    venues: {
                      select: {
                        id: true,
                        name: true,
                        address: true,
                      },
                    },
                  },
                },
                venue_location_mappings_team_venue_assignments_division_venue_mapping_idTovenue_location_mappings: {
                  include: {
                    venues: {
                      select: {
                        id: true,
                        name: true,
                        address: true,
                      },
                    },
                  },
                },
                venue_location_mappings_team_venue_assignments_final_venue_mapping_idTovenue_location_mappings: {
                  include: {
                    venues: {
                      select: {
                        id: true,
                        name: true,
                        address: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
      } else if (ctx.user.role === 'player') {
        const playerTeams = await db.team_players.findMany({
          where: { userId: ctx.user.id },
          include: {
            teams: {
              include: {
                sports: {
                  select: {
                    name: true,
                    display_name: true,
                    main_players_count: true,
                    max_substitutes: true,
                  },
                },
                team_players: {
                  select: {
                    id: true,
                  },
                },
                team_venue_assignments: {
                  include: {
                    venue_location_mappings_team_venue_assignments_cluster_venue_mapping_idTovenue_location_mappings: {
                      include: {
                        venues: {
                          select: {
                            id: true,
                            name: true,
                            address: true,
                          },
                        },
                      },
                    },
                    venue_location_mappings_team_venue_assignments_division_venue_mapping_idTovenue_location_mappings: {
                      include: {
                        venues: {
                          select: {
                            id: true,
                            name: true,
                            address: true,
                          },
                        },
                      },
                    },
                    venue_location_mappings_team_venue_assignments_final_venue_mapping_idTovenue_location_mappings: {
                      include: {
                        venues: {
                          select: {
                            id: true,
                            name: true,
                            address: true,
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
        teams = playerTeams.map(pt => pt.teams);
      }

      // Transform teams for frontend
      const transformedTeams = teams.map(team => {
        // Get venue assignment (prefer final > division > cluster)
        const venueAssignment = 
          team.team_venue_assignments?.find(assignment => 
            assignment.venue_location_mappings_team_venue_assignments_final_venue_mapping_idTovenue_location_mappings
          )?.venue_location_mappings_team_venue_assignments_final_venue_mapping_idTovenue_location_mappings ||
          team.team_venue_assignments?.find(assignment => 
            assignment.venue_location_mappings_team_venue_assignments_division_venue_mapping_idTovenue_location_mappings
          )?.venue_location_mappings_team_venue_assignments_division_venue_mapping_idTovenue_location_mappings ||
          team.team_venue_assignments?.find(assignment => 
            assignment.venue_location_mappings_team_venue_assignments_cluster_venue_mapping_idTovenue_location_mappings
          )?.venue_location_mappings_team_venue_assignments_cluster_venue_mapping_idTovenue_location_mappings;

        return {
          teamId: team.id,
          name: team.name,
          sportName: team.sports?.display_name || team.sports?.name || 'Unknown',
          panchayat: team.panchayat,
          district: team.district,
          state: team.state,
          status: team.status,
          currentPlayers: team.team_players?.length || 0,
          maxPlayers: (team.sports?.main_players_count || 0) + (team.sports?.max_substitutes || 0),
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