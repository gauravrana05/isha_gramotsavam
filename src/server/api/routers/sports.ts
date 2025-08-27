import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../trpc'
import { db } from '@/lib/db'
import { TRPCError } from '@trpc/server'

export const sportsRouter = createTRPCRouter({
  // Get all active sports with their gender categories
  getAllWithCategories: publicProcedure
    .query(async () => {
      try {
        const sportsWithCategories = await db.sports.findMany({
          where: { is_active: true },
          include: {
            sport_gender_categories: {
              select: {
                gender_category: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        });

        return sportsWithCategories.map((sport) => {
          const genderCategories = sport.sport_gender_categories.map(gc => gc.gender_category);
          const { sport_gender_categories, ...rest } = sport;
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
        const sport = await db.sports.findFirst({
          where: { 
            AND: [
              { is_active: true },
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
            main_players_count: true,
            max_substitutes: true,
          }
        })

        if (!sport) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Sport not found',
          })
        }

        // Get gender categories for this sport
        const genderCategories = await db.sport_gender_categories.findMany({
          where: { sport_id: sport.id },
          select: { gender_category: true }
        })

        const categories = genderCategories.map(gc => gc.gender_category)
        
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
          can_register: canRegister,
          registration_message: registrationMessage,
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
        // Get sports that support the user's gender
        const sportsQuery = `
          SELECT DISTINCT s.id, s.name, s.description, s.main_players_count, s.max_substitutes
          FROM sports s
          JOIN sport_gender_categories sgc ON s.id = sgc.sport_id
          WHERE s.is_active = true 
          AND (
            sgc.gender_category = 'mixed' OR
            (sgc.gender_category = 'men' AND $1 = 'M') OR
            (sgc.gender_category = 'women' AND $1 = 'F')
          )
          ORDER BY s.name
        `

        const sports = await db.$queryRawUnsafe(sportsQuery, input.gender)

        return sports
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch sports for gender',
        })
      }
    }),
})