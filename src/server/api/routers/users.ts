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
        const existingUser = await db.user.findUnique({
          where: { phone: input.phone },
        })

        if (existingUser) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User with this phone number already exists',
          })
        }

        const user = await db.user.create({
          data: input as any,
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
      const user = await db.user.findUnique({
        where: { phone: input.phone },
        include: {
          profileImages: true,
        },
      })

      return user
    }),

  // Protected procedures
  getById: protectedProcedure
    .input(getUserByIdSchema)
    .query(async ({ input }) => {
      const user = await db.user.findUnique({
        where: { id: input.id },
        include: {
          profileImages: true,
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
        const user = await db.user.update({
          where: { id },
          data: updateData as any,
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
        const user = await db.user.update({
          where: { id },
          data: {
            ...profileData,
            profileComplete: true,
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
        const profileImages = await db.userProfileImage.upsert({
          where: { userId: input.userId },
          create: {
            userId: input.userId,
            profilePhotoPath: input.profilePhotoPath,
            aadhaarFrontPath: input.aadhaarFrontPath,
            aadhaarBackPath: input.aadhaarBackPath,
            allImagesUploaded: Boolean(
              input.profilePhotoPath && 
              input.aadhaarFrontPath && 
              input.aadhaarBackPath
            ),
          },
          update: {
            profilePhotoPath: input.profilePhotoPath,
            aadhaarFrontPath: input.aadhaarFrontPath,
            aadhaarBackPath: input.aadhaarBackPath,
            allImagesUploaded: Boolean(
              input.profilePhotoPath && 
              input.aadhaarFrontPath && 
              input.aadhaarBackPath
            ),
          },
        })

        return profileImages
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
        const verification = await db.userVerification.create({
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
        const verification = await db.userVerification.update({
          where: { id },
          data: {
            ...updateData,
            verifiedAt: updateData.status === 'approved' ? new Date() : null,
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
      const verifications = await db.userVerification.findMany({
        where: { userId: input.userId },
        include: {
          verifiedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
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
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      }

      // Filter by verification status if provided
      if (verificationStatus) {
        where.userVerifications = {
          some: {
            status: verificationStatus,
          },
        }
      }

      const [users, total] = await Promise.all([
        db.user.findMany({
          where,
          include: {
              profileImages: true,
          },
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        db.user.count({ where }),
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
        const profileImages = await db.userProfileImage.update({
          where: { userId: input.userId },
          data: {
            verifiedBy: input.verifiedBy,
            verifiedAt: input.approved ? new Date() : null,
          },
        })

        // Create or update document verification record
        const existingVerification = await db.userVerification.findFirst({
          where: {
            userId: input.userId,
            verificationType: 'document_verification',
          },
        })

        if (existingVerification) {
          await db.userVerification.update({
            where: { id: existingVerification.id },
            data: {
              status: input.approved ? 'approved' : 'rejected',
              verifiedBy: input.verifiedBy,
              verifiedAt: input.approved ? new Date() : null,
            },
          })
        } else {
          await db.userVerification.create({
            data: {
              userId: input.userId,
              verificationType: 'document_verification',
              status: input.approved ? 'approved' : 'rejected',
              verifiedBy: input.verifiedBy,
              verifiedAt: input.approved ? new Date() : null,
            },
          })
        }

        return profileImages
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
        db.userVerification.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
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
        db.userVerification.count({ where }),
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
      role: z.enum(['admin', 'captain', 'player', 'general_volunteer', 'technical_volunteer', 'verification_volunteer', 'public']),
    }))
    .mutation(async ({ input }) => {
      try {
        const user = await db.user.update({
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
          firstName: user.firstName,
          lastName: user.lastName,
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