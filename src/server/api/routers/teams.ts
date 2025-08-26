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
              user_id: true,
              team_id: true,
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
              created_at: true,
              users: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  phone: true,
                  role: true,
                  user_profile_images: {
                    select: {
                      user_id: true,
                      profile_photo_path: true,
                      aadhaar_front_path: true,
                      aadhaar_back_path: true,
                      all_images_uploaded: true,
                      verified_by: true,
                      verified_at: true,
                      created_at: true,
                      updated_at: true,
                    },
                  },
                },
              },
            },
            orderBy: [
              { position: 'asc' },
              { created_at: 'asc' },
            ],
          } : false,
          team_venue_assignments: includeVenueAssignments ? {
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

      const [teams, total] = await Promise.all([
        db.teams.findMany({
          where,
          include: {
            sports: {
              select: {
                id: true,
                name: true,
              },
            },
            captain: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
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
                team_players: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        db.teams.count({ where }),
      ])

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
          captain: {
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
      const { venue_location_mapping_id, sportId, genderCategory } = input

      const where: any = {
        venueAssignments: {
          some: {
            OR: [
              { cluster_venue_mapping_id: venue_location_mapping_id },
              { division_venue_mapping_id: venue_location_mapping_id },
              { final_venue_mapping_id: venue_location_mapping_id },
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
          captain: {
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
  create: protectedProcedure
    .input(createTeamSchema)
    .mutation(async ({ input }) => {
      try {
        // Check if captain exists and is not already captain of another team in same event/sport
        const existingCaptain = await db.teams.findFirst({
          where: {
            captainId: input.captainId,
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
          data: input,
          include: {
            sport: true,
            captain: {
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
              team_id: team.id,
              user_id: captainId,
              position: 'main',
              verification_status: 'pending',
              first_name: userProfile.first_name,
              last_name: userProfile.last_name,
              phone: userProfile.phone,
              whatsapp_number: userProfile.whatsapp_number || null,
              date_of_birth: userProfile.date_of_birth,
              age: captainAge || 18,
              gender: userProfile.gender,
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
              user_id: captainId,
              event_id: null, // Global captain role for now, can be event-specific later
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
        let user = await db.users.findUnique({
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
              age: input.age,
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
        const existingPlayer = await db.team_players.findUnique({
          where: {
            team_id_user_id: {
              team_id: input.teamId,
              user_id: userId,
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
            team_id: input.teamId,
            position: 'main',
          },
        })

        const currentSubstitutes = await db.team_players.count({
          where: {
            team_id: input.teamId,
            position: 'substitute',
          },
        })

        // Validate player limits
        if (input.position === 'main' && currentMainPlayers >= team.sport.main_players_count) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Team already has maximum main players (${team.sport.main_players_count})`,
          })
        }

        if (input.position === 'substitute' && currentSubstitutes >= team.sport.max_substitutes) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Team already has maximum substitutes (${team.sport.max_substitutes})`,
          })
        }

        // Create team player record
        const player = await db.team_players.create({
          data: {
            team_id: input.teamId,
            user_id: userId,
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
            current_players: input.position === 'main' ? currentMainPlayers + 1 : currentMainPlayers,
            current_substitutes: input.position === 'substitute' ? currentSubstitutes + 1 : currentSubstitutes,
          },
        })

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
        const player = await db.team_players.findUnique({
          where: {
            team_id_user_id: {
              team_id: input.teamId,
              user_id: input.userId,
            },
          },
        })

        if (!player) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Player not found in team',
          })
        }

        await db.team_players.delete({
          where: {
            team_id_user_id: {
              team_id: input.teamId,
              user_id: input.userId,
            },
          },
        })

        // Update team player counts
        const [mainCount, subCount] = await Promise.all([
          db.team_players.count({
            where: { team_id: input.teamId, position: 'main' },
          }),
          db.team_players.count({
            where: { team_id: input.teamId, position: 'substitute' },
          }),
        ])

        await db.teams.update({
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

      const players = await db.team_players.findMany({
        where,
        include: {
          user: {
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
          where: { team_id: input.teamId },
          create: input,
          update: {
            photo_path: input.photoPath,
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
        const assignment = await db.team_venue_assignments.create({
          data: input,
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
        const assignment = await db.team_venue_assignments.update({
          where: { id },
          data: updateData,
        })

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
            verifiedBy,
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
      team_id: z.string().uuid(),
      tournamentNumber: z.number().min(1),
      venueMappingId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Check if tournament number is already taken for this venue
        const existingTeam = await db.teams.findFirst({
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

        const team = await db.teams.update({
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
})