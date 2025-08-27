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
        const user = await db.users.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            date_of_birth: true,
            gender: true,
            whatsapp_number: true,
            instagram_handle: true,
            panchayat: true,
            taluk: true,
            district: true,
            state: true,
            pincode: true,
            profile_complete: true,
          },
        })

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          })
        }

        // Check user profile images
        const userProfileImages = await db.user_profile_images.findUnique({
          where: { userId: input.userId },
          select: {
            all_images_uploaded: true,
            profile_photo_path: true,
            aadhaar_front_path: true,
            aadhaar_back_path: true,
          }
        })

        // Check if all required fields are filled
        const requiredFields = [
          'first_name',
          'last_name', 
          'phone',
          'date_of_birth',
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
        const imagesComplete = userProfileImages?.all_images_uploaded === true

        // Profile is complete only if both fields and images are complete
        const isComplete = fieldsComplete && imagesComplete

        // Update profile_complete if it doesn't match current state
        if (user.profile_complete !== isComplete) {
          await db.users.update({
            where: { id: input.userId },
            data: { profile_complete: isComplete },
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
          profilePhoto: 'profile_photo_path',
          aadhaarFront: 'aadhaar_front_path',
          aadhaarBack: 'aadhaar_back_path',
        }

        const fieldName = fieldMapping[imageType]

        // Upsert the user profile images record
        const userProfileImages = await db.user_profile_images.upsert({
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
          userProfileImages.profile_photo_path &&
          userProfileImages.aadhaar_front_path &&
          userProfileImages.aadhaar_back_path
        )

        // Update the all_images_uploaded flag
        await db.user_profile_images.update({
          where: { userId: userId },
          data: { all_images_uploaded: allImagesUploaded },
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

  updateComplete: protectedProcedure
    .input(z.object({
      userId: z.string().uuid(),
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      whatsappNumber: z.string().optional(),
      dateOfBirth: z.string().min(1, 'Date of birth is required'),
      gender: z.enum(['M', 'F'], { required_error: 'Gender is required' }),
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
          first_name: updateData.firstName,
          last_name: updateData.lastName,
          whatsapp_number: updateData.whatsappNumber,
          date_of_birth: new Date(dateOfBirth),
          gender: updateData.gender,
          instagram_handle: updateData.instagramHandle,
          pincode: updateData.pincode,
          panchayat: updateData.panchayat,
          taluk: updateData.taluk,
          district: updateData.district,
          state: updateData.state,
          profile_complete: true, // Mark as complete when updating
          language_preference: updateData.preferredLanguage || 'en',
        }

        // Remove undefined/empty fields
        Object.keys(profileData).forEach(key => {
          if (profileData[key as keyof typeof profileData] === '' || 
              profileData[key as keyof typeof profileData] === undefined) {
            delete profileData[key as keyof typeof profileData]
          }
        })

        const user = await db.users.update({
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
})