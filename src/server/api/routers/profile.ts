import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc'

export const profileRouter = createTRPCRouter({
  test: publicProcedure
    .query(() => {
      return { message: "Profile router working!" }
    }),

  testWithInput: publicProcedure
    .input(z.object({
      userId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      console.log('testWithInput received:', input);
      return { message: "Input received successfully!", userId: input.userId }
    }),

  checkCompletion: protectedProcedure
    .input(z.object({
      userId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      try {
        const user = await db.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            gender: true,
            whatsappNumber: true,
            instagramHandle: true,
            panchayat: true,
            taluk: true,
            district: true,
            state: true,
            pincode: true,
            profileComplete: true,
          },
        })

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          })
        }

        // Check user profile images
        const userProfileImages = await db.userProfileImage.findUnique({
          where: { userId: input.userId },
          select: {
            allImagesUploaded: true,
            profilePhotoPath: true,
            aadhaarFrontPath: true,
            aadhaarBackPath: true,
          }
        })

        // Check if all required fields are filled
        const requiredFields = [
          'firstName',
          'lastName', 
          'phone',
          'dateOfBirth',
          'gender',
          'panchayat',
          'taluk',
          'district',
          'state',
          'pincode'
        ]

        const fieldsComplete = requiredFields.every(field => {
          const value = user[field as keyof typeof user]
          return value !== null && value !== undefined && value !== ''
        })

        // Check if all images are uploaded
        const imagesComplete = userProfileImages?.allImagesUploaded === true

        // Profile is complete only if both fields and images are complete
        const isComplete = fieldsComplete && imagesComplete

        // Update profileComplete if it does&apos;t match current state
        if (user.profileComplete !== isComplete) {
          await db.user.update({
            where: { id: input.userId },
            data: { profileComplete: isComplete },
          })
        }

        return {
          ...user,
          profileComplete: isComplete,
          isProfileComplete: isComplete, // alias for compatibility
          fieldsComplete,
          imagesComplete,
          userProfileImages: userProfileImages || null,
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check profile completion',
        })
      }
    }),

  updateImageUpload: protectedProcedure
    .input(z.object({
      userId: z.string().uuid(),
      imageType: z.enum(['profilePhoto', 'aadhaarFront', 'aadhaarBack']),
      imagePath: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const { userId, imageType, imagePath } = input

        // Map imageType to database field names
        const fieldMapping = {
          profilePhoto: 'profilePhotoPath',
          aadhaarFront: 'aadhaarFrontPath',
          aadhaarBack: 'aadhaarBackPath',
        }

        const fieldName = fieldMapping[imageType]

        // Upsert the user profile images record
        const userProfileImages = await db.userProfileImage.upsert({
          where: { userId: userId },
          create: {
            userId: userId,
            [fieldName]: imagePath,
          },
          update: {
            [fieldName]: imagePath,
          },
        })

        // Check if all images are now uploaded
        const allImagesUploaded = !!(
          userProfileImages.profilePhotoPath &&
          userProfileImages.aadhaarFrontPath &&
          userProfileImages.aadhaarBackPath
        )

        // Update the all_images_uploaded flag
        await db.userProfileImage.update({
          where: { userId: userId },
          data: { allImagesUploaded: allImagesUploaded },
        })

        return {
          success: true,
          allImagesUploaded,
          imagePath,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update image upload',
        })
      }
    }),

  update: protectedProcedure
    .input(z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      whatsappNumber: z.string().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.enum(['M', 'F']).optional(),
      instagramHandle: z.string().optional(),
      pincode: z.string().optional(),
      panchayat: z.string().optional(),
      taluk: z.string().optional(),
      district: z.string().optional(),
      state: z.string().optional(),
      languagePreference: z.enum(['en', 'ta', 'hi', 'ml', 'te', 'kn', 'or']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const updateData: any = { ...input };
        
        // Convert dateOfBirth string to Date if provided
        if (input.dateOfBirth) {
          updateData.dateOfBirth = new Date(input.dateOfBirth);
        }
        
        const updatedUser = await db.user.update({
          where: { id: ctx.user.id },
          data: updateData,
        });

        return {
          success: true,
          user: updatedUser
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile',
        });
      }
    }),

  updateComplete: protectedProcedure
    .input(z.object({
      userId: z.string().uuid(),
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      whatsappNumber: z.string().optional(),
      dateOfBirth: z.string().min(1, 'Date of birth is required'),
      gender: z.enum(['M', 'F', 'O'], { message: 'Gender is required' }),
      instagramHandle: z.string().optional(),
      pincode: z.string().optional(),
      panchayat: z.string().min(1, 'Panchayat is required'),
      taluk: z.string().optional(),
      district: z.string().min(1, 'District is required'),
      state: z.string().min(1, 'State is required'),
      preferredLanguage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { userId, dateOfBirth, ...updateData } = input

      try {
        // Convert dateOfBirth string to Date object and prepare data
        const profileData = {
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          whatsappNumber: updateData.whatsappNumber,
          dateOfBirth: new Date(dateOfBirth),
          gender: updateData.gender,
          instagramHandle: updateData.instagramHandle,
          pincode: updateData.pincode,
          panchayat: updateData.panchayat,
          taluk: updateData.taluk,
          district: updateData.district,
          state: updateData.state,
          profileComplete: true, // Mark as complete when updating
          languagePreference: updateData.preferredLanguage || 'en',
        }

        // Remove undefined/empty fields
        Object.keys(profileData).forEach(key => {
          if (profileData[key as keyof typeof profileData] === '' || 
              profileData[key as keyof typeof profileData] === undefined) {
            delete profileData[key as keyof typeof profileData]
          }
        })

        const user = await db.user.update({
          where: { id: userId },
          data: profileData,
        })

        return user
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile',
        })
      }
    }),

  updateLanguagePreference: protectedProcedure
    .input(z.object({
      language: z.enum(['en', 'ta', 'hi', 'ml', 'te', 'kn', 'or'])
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const updatedUser = await db.user.update({
          where: { id: ctx.user.id },
          data: { 
            languagePreference: input.language,
            updatedAt: new Date()
          },
          select: {
            id: true,
            languagePreference: true,
            firstName: true,
            lastName: true,
            role: true
          }
        });

        return {
          success: true,
          user: updatedUser
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update language preference',
        });
      }
    }),
})