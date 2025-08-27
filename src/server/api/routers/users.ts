import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from '../trpc'
import {
  createUserSchema,
  updateUserSchema,
  updateUserProfileSchema,
  createUserVerificationSchema,
  updateUserVerificationSchema,
  uploadProfileImageSchema,
  verifyProfileImagesSchema,
  getUserByIdSchema,
  getUserByPhoneSchema,
  getUsersSchema,
  getUserVerificationsSchema,
  getPendingVerificationsSchema,
} from '@/lib/validations/user'

export const usersRouter = createTRPCRouter({
  // Public procedures
  create: publicProcedure
    .input(createUserSchema)
    .mutation(async ({ input }) => {
      try {
        const existingUser = await db.users.findUnique({
          where: { phone: input.phone },
        })

        if (existingUser) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User with this phone number already exists',
          })
        }

        const user = await db.users.create({
          data: input,
        })

        return user
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user',
        })
      }
    }),

  getByPhone: publicProcedure
    .input(getUserByPhoneSchema)
    .query(async ({ input }) => {
      const user = await db.users.findUnique({
        where: { phone: input.phone },
        include: {
          user_profile_images_user_profile_images_user_idTousers: true,
        },
      })

      return user
    }),

  // Protected procedures
  getById: protectedProcedure
    .input(getUserByIdSchema)
    .query(async ({ input }) => {
      const user = await db.users.findUnique({
        where: { id: input.id },
        include: {
          user_profile_images_user_profile_images_user_idTousers: true,
        },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      return user
    }),

  update: protectedProcedure
    .input(updateUserSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input

      try {
        const user = await db.users.update({
          where: { id },
          data: updateData,
        })

        return user
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }
    }),

  updateProfile: protectedProcedure
    .input(updateUserProfileSchema)
    .mutation(async ({ input }) => {
      const { id, ...profileData } = input

      try {
        const user = await db.users.update({
          where: { id },
          data: {
            ...profileData,
            profile_complete: true,
          },
        })

        return user
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }
    }),

  // Profile image procedures
  uploadProfileImage: protectedProcedure
    .input(uploadProfileImageSchema)
    .mutation(async ({ input }) => {
      try {
        const profileImage = await db.user_profile_images.upsert({
          where: { userId: input.userId },
          create: {
            userId: input.userId,
            profile_photo_path: input.profilePhotoPath,
            aadhaar_front_path: input.aadhaarFrontPath,
            aadhaar_back_path: input.aadhaarBackPath,
            all_images_uploaded: Boolean(
              input.profilePhotoPath && 
              input.aadhaarFrontPath && 
              input.aadhaarBackPath
            ),
          },
          update: {
            profile_photo_path: input.profilePhotoPath,
            aadhaar_front_path: input.aadhaarFrontPath,
            aadhaar_back_path: input.aadhaarBackPath,
            all_images_uploaded: Boolean(
              input.profilePhotoPath && 
              input.aadhaarFrontPath && 
              input.aadhaarBackPath
            ),
          },
        })

        return profileImage
      } catch (error) {
        console.error('uploadProfileImage error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to upload profile images',
        })
      }
    }),

  // Verification procedures
  createVerification: protectedProcedure
    .input(createUserVerificationSchema)
    .mutation(async ({ input }) => {
      try {
        const verification = await db.user_verifications.create({
          data: input,
        })

        return verification
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create verification record',
        })
      }
    }),

  updateVerification: protectedProcedure
    .input(updateUserVerificationSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input

      try {
        const verification = await db.user_verifications.update({
          where: { id },
          data: {
            ...updateData,
            verified_at: updateData.status === 'approved' ? new Date() : null,
          },
        })

        return verification
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Verification record not found',
        })
      }
    }),

  getVerifications: protectedProcedure
    .input(getUserVerificationsSchema)
    .query(async ({ input }) => {
      const verifications = await db.user_verifications.findMany({
        where: { userId: input.userId },
        include: {
          users_user_verifications_verified_byTousers: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return verifications
    }),

  // Admin procedures
  getAll: adminProcedure
    .input(getUsersSchema)
    .query(async ({ input }) => {
      const { page, limit, role, district, state, verificationStatus, search, sortBy, sortOrder } = input

      const skip = (page - 1) * limit

      const where: any = {}

      if (role) where.role = role
      if (district) where.district = district
      if (state) where.state = state
      if (search) {
        where.OR = [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      }

      // Filter by verification status if provided
      if (verificationStatus) {
        where.user_verifications_user_verifications_user_idTousers = {
          some: {
            status: verificationStatus,
          },
        }
      }

      const [users, total] = await Promise.all([
        db.users.findMany({
          where,
          include: {
              user_profile_images_user_profile_images_user_idTousers: true,
          },
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        db.users.count({ where }),
      ])

      return {
        users,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      }
    }),

  verifyProfileImages: adminProcedure
    .input(verifyProfileImagesSchema)
    .mutation(async ({ input }) => {
      try {
        const profileImage = await db.user_profile_images.update({
          where: { userId: input.userId },
          data: {
            verified_by: input.verifiedBy,
            verified_at: input.approved ? new Date() : null,
          },
        })

        // Create or update document verification record
        await db.user_verifications.upsert({
          where: {
            user_id_verification_type: {
              userId: input.userId,
              verification_type: 'document_verification',
            },
          },
          create: {
            userId: input.userId,
            verification_type: 'document_verification',
            status: input.approved ? 'approved' : 'rejected',
            verified_by: input.verifiedBy,
            verified_at: input.approved ? new Date() : null,
          },
          update: {
            status: input.approved ? 'approved' : 'rejected',
            verified_by: input.verifiedBy,
            verified_at: input.approved ? new Date() : null,
          },
        })

        return profileImage
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile images not found',
        })
      }
    }),

  getPendingVerifications: adminProcedure
    .input(getPendingVerificationsSchema)
    .query(async ({ input }) => {
      const { page, limit, verificationType, district, state } = input

      const skip = (page - 1) * limit

      const where: any = {
        status: 'pending',
      }

      if (verificationType) where.verificationType = verificationType

      // Filter by user location if provided
      if (district || state) {
        where.user = {}
        if (district) where.user.district = district
        if (state) where.user.state = state
      }

      const [verifications, total] = await Promise.all([
        db.user_verifications.findMany({
          where,
          include: {
            users_user_verifications_user_idTousers: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                phone: true,
                district: true,
                state: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'asc' },
        }),
        db.user_verifications.count({ where }),
      ])

      return {
        verifications,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      }
    }),

  updateRole: adminProcedure
    .input(z.object({
      userId: z.string().uuid(),
      role: z.enum(['admin', 'captain', 'player', 'volunteer', 'technical_volunteer', 'verification', 'public']),
    }))
    .mutation(async ({ input }) => {
      try {
        const user = await db.users.update({
          where: { id: input.userId },
          data: { role: input.role as any }, 
        })

        return user
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }
    }),

  // Verification procedures
  getVerificationProfile: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const user = ctx.user;
        
        // Check if user has verification role
        if (!user || (user.role !== 'verification_volunteer' && user.role !== 'admin')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to access verification functionality',
          });
        }

        return {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          email: user.email,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get verification profile',
        });
      }
    }),
})