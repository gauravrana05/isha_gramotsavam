import { z } from 'zod'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc'
import { db } from '@/lib/db'
import { TRPCError } from '@trpc/server'

export const sportsRouter = createTRPCRouter({
  // Get all active sports with their gender categories
  getAllWithCategories: publicProcedure
    .query(async () => {
      try {
        const sportsWithCategories = await db.sport.findMany({
          where: { isActive: true },
          include: {
            sportGenderCategories: {
              select: {
                genderCategory: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        });

        return sportsWithCategories.map((sport) => {
          const genderCategories = sport.sportGenderCategories.map(gc => gc.genderCategory);
          const { sportGenderCategories, ...rest } = sport;
          return {
            ...rest,
            gender_categories: genderCategories,
            supports_men: genderCategories.includes('men'),
            supports_women: genderCategories.includes('women'),
            supports_mixed: genderCategories.includes('mixed'),
          };
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch sports',
        })
      }
    }),

  // Get sport by ID or name with gender validation
  getByIdOrName: publicProcedure
    .input(z.object({
      identifier: z.string(),
      userGender: z.enum(['M', 'F', 'O']).optional(),
    }))
    .query(async ({ input }) => {
      try {
        // Try to find by ID first, then by name
        const sport = await db.sport.findFirst({
          where: { 
            AND: [
              { isActive: true },
              {
                OR: [
                  { id: input.identifier },
                  { name: { contains: input.identifier, mode: 'insensitive' } }
                ]
              }
            ]
          },
          select: {
            id: true,
            name: true,
            description: true,
            mainPlayersCount: true,
            maxSubstitutes: true,
          }
        })

        if (!sport) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Sport not found',
          })
        }

        // Get gender categories for this sport
        const genderCategories = await db.sportGenderCategory.findMany({
          where: { sportId: sport.id },
          select: { genderCategory: true }
        })

        const categories = genderCategories.map(gc => gc.genderCategory)
        
        // Determine if user can register based on gender
        let canRegister = true
        let registrationMessage = ''

        if (input.userGender) {
          const userCanRegister = 
            categories.includes('mixed') || 
            (input.userGender === 'M' && categories.includes('men')) ||
            (input.userGender === 'F' && categories.includes('women'))

          if (!userCanRegister) {
            canRegister = false
            const supportedGenders = []
            if (categories.includes('men')) supportedGenders.push('men')
            if (categories.includes('women')) supportedGenders.push('women')
            if (categories.includes('mixed')) supportedGenders.push('mixed teams')
            
            registrationMessage = `This sport is only available for ${supportedGenders.join(' and ')}`
          }
        }

        return {
          ...sport,
          gender_categories: categories,
          supports_men: categories.includes('men'),
          supports_women: categories.includes('women'),
          supports_mixed: categories.includes('mixed'),
          canRegister: canRegister,
          registrationMessage: registrationMessage,
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch sport details',
        })
      }
    }),

  // Get sports for specific gender
  getForGender: publicProcedure
    .input(z.object({
      gender: z.enum(['M', 'F', 'O']),
    }))
    .query(async ({ input }) => {
      try {
        // Determine which gender categories to look for
        const genderCategories = ['mixed']
        if (input.gender === 'M') genderCategories.push('men')
        if (input.gender === 'F') genderCategories.push('women')

        // Get sports that support the user's gender using Prisma
        const sports = await db.sport.findMany({
          where: {
            isActive: true,
            sportGenderCategories: {
              some: {
                genderCategory: {
                  in: genderCategories
                }
              }
            }
          },
          select: {
            id: true,
            name: true,
            description: true,
            mainPlayersCount: true,
            maxSubstitutes: true,
            sportGenderCategories: {
              select: {
                genderCategory: true
              }
            }
          },
          orderBy: { name: 'asc' }
        })

        return sports.map(sport => ({
          ...sport,
          gender_categories: sport.sportGenderCategories.map(gc => gc.genderCategory)
        }))
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch sports for gender',
        })
      }
    }),

  // Update Sport
  updateSport: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      mainPlayersCount: z.number().optional(),
      maxSubstitutes: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      const { id, ...updateData } = input;
      const sport = await db.sport.update({
        where: { id },
        data: updateData,
      });

      return sport;
    }),
})