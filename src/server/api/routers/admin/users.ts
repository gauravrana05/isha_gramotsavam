import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";

export const adminUsersRouter = createTRPCRouter({
  // Get Users with filtering and pagination
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
            volunteerAssignmentsAsVolunteer: {
              where: {
                event: {
                  status: {
                    in: ['active', 'registration_open', 'registration_closed']
                  }
                },
                deletedAt: null
              },
              select: {
                id: true,
                venueLevelMapping: {
                  select: {
                    id: true,
                    level: true,
                    venue: {
                      select: {
                        id: true,
                        name: true,
                        district: true,
                        taluk: true
                      }
                    }
                  }
                }
              }
            }
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
        users: users.map(user => {
          // Get the first venue assignment for ongoing events
          const venueAssignment = user.volunteerAssignmentsAsVolunteer?.[0];
          const venueData = venueAssignment?.venueLevelMapping;
          
          return {
            id: user.id,
            uid: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phone,
            email: user.email,
            role: user.role,
            gender: user.gender,
            pincode: user.pincode,
            panchayat: user.panchayat,
            district: user.district,
            taluk: user.taluk,
            state: user.state,
            isProfileComplete: user.profileComplete,
            createdAt: user.createdAt?.toISOString() || null,
            venueAssignment: venueData ? `${venueData.venue.name} - ${venueData.level}` : null,
            venueAssignmentId: venueData?.id || null,
          };
        }),
        pagination: {
          total,
          hasMore: input.offset + input.limit < total,
          currentPage: Math.floor(input.offset / input.limit) + 1,
          totalPages: Math.ceil(total / input.limit)
        }
      };
    }),

  // Search User by Phone
  searchUserByPhone: protectedProcedure
    .input(z.object({
      phone: z.string().min(10).max(10),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const user = await db.user.findFirst({
        where: { phone: input.phone },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
          phone: true,
        },
      });

      if (user) {
        // Check if user is already in a team
        const existingTeamMembership = await db.teamPlayer.findFirst({
          where: {
            userId: user.id,
            team: {
              deletedAt: null, // Only check active teams
            },
          },
          include: {
            team: {
              select: {
                name: true,
                sport: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        });

        if (existingTeamMembership) {
          return {
            success: false,
            user,
            conflict: {
              message: `Player is already in team "${existingTeamMembership.team.name}" for ${existingTeamMembership.team.sport.name}`,
              teamName: existingTeamMembership.team.name,
              sportName: existingTeamMembership.team.sport.name,
            }
          };
        }
      }

      return {
        success: true,
        user: user || null,
      };
    }),

  // Update User Role
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

  // Verify User
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

  // Create User (for volunteers)
  createUser: protectedProcedure
    .input(z.object({
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      phone: z.string().min(10).max(20),
      email: z.string().email().optional(),
      gender: z.enum(['M', 'F', 'O']),
      role: z.enum(['general_volunteer', 'technical_volunteer', 'verification_volunteer']),
      whatsappNumber: z.string().min(10).max(20).optional(),
      venueAssignmentId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Check if user with phone number already exists
      const existingUser = await db.user.findUnique({
        where: { phone: input.phone }
      });

      if (existingUser) {
        throw new TRPCError({ 
          code: 'CONFLICT', 
          message: 'A user with this phone number already exists' 
        });
      }

      const user = await db.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          email: input.email,
          gender: input.gender,
          role: input.role,
          whatsappNumber: input.whatsappNumber || input.phone,
          profileComplete: false, // Will be completed when they add more details
        }
      });

      // Create venue assignment if provided
      if (input.venueAssignmentId) {
        // Get the ongoing event
        const ongoingEvent = await db.event.findFirst({
          where: {
            status: {
              in: ['active', 'registration_open', 'registration_closed']
            }
          },
          select: { id: true }
        });

        if (ongoingEvent) {
          // Verify venue mapping exists
          const venueMapping = await db.venueLevelMapping.findUnique({
            where: { id: input.venueAssignmentId },
            include: { venue: true }
          });

          if (venueMapping && venueMapping.venue?.isActive) {
            await db.volunteerAssignment.create({
              data: {
                eventId: ongoingEvent.id,
                volunteerId: user.id,
                venueLevelMappingId: input.venueAssignmentId,
                volunteerType: input.role === 'verification_volunteer' ? 'general_volunteer' : input.role as 'general_volunteer' | 'technical_volunteer',
                contactPhone: user.phone,
                assignedBy: ctx.user.id,
                status: 'assigned'
              }
            });
          }
        }
      }

      return {
        success: true,
        message: 'Volunteer created successfully',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          role: user.role,
        }
      };
    }),

  // Update User (for volunteers)
  updateUser: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      email: z.string().email().optional(),
      gender: z.enum(['M', 'F', 'O']),
      role: z.enum(['general_volunteer', 'technical_volunteer', 'verification_volunteer']),
      venueAssignmentId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      // Update user
      const user = await db.user.update({
        where: { id: input.id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          gender: input.gender,
          role: input.role,
        }
      });

      // Handle venue assignment changes
      if (input.venueAssignmentId) {
        // Get the ongoing event
        const ongoingEvent = await db.event.findFirst({
          where: {
            status: {
              in: ['active', 'registration_open', 'registration_closed']
            }
          },
          select: { id: true }
        });

        if (ongoingEvent) {
          // Remove existing assignments for this user and event
          await db.volunteerAssignment.deleteMany({
            where: {
              volunteerId: input.id,
              eventId: ongoingEvent.id
            }
          });

          // Verify venue mapping exists
          const venueMapping = await db.venueLevelMapping.findUnique({
            where: { id: input.venueAssignmentId },
            include: { venue: true }
          });

          if (venueMapping && venueMapping.venue?.isActive) {
            await db.volunteerAssignment.create({
              data: {
                eventId: ongoingEvent.id,
                volunteerId: input.id,
                venueLevelMappingId: input.venueAssignmentId,
                volunteerType: input.role === 'verification_volunteer' ? 'general_volunteer' : input.role as 'general_volunteer' | 'technical_volunteer',
                contactPhone: user.phone,
                assignedBy: ctx.user.id,
                status: 'assigned'
              }
            });
          }
        }
      } else {
        // Remove venue assignment if none selected
        const ongoingEvent = await db.event.findFirst({
          where: {
            status: {
              in: ['active', 'registration_open', 'registration_closed']
            }
          },
          select: { id: true }
        });

        if (ongoingEvent) {
          await db.volunteerAssignment.deleteMany({
            where: {
              volunteerId: input.id,
              eventId: ongoingEvent.id
            }
          });
        }
      }

      return {
        success: true,
        message: 'Volunteer updated successfully',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          role: user.role,
        }
      };
    }),
});