import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Seed sports data
  const sports = [
    {
      name: 'Kabaddi',
      description: 'Traditional contact sport',
      mainPlayersCount: 7,
      maxSubstitutes: 5,
      genderCategories: ['men', 'women'] as const,
    },
    {
      name: 'Volleyball',
      description: 'Team sport with net',
      mainPlayersCount: 6,
      maxSubstitutes: 6,
      genderCategories: ['men', 'women', 'mixed'] as const,
    },
    {
      name: 'Football',
      description: 'Association football',
      mainPlayersCount: 11,
      maxSubstitutes: 7,
      genderCategories: ['men', 'women'] as const,
    },
    {
      name: 'Cricket',
      description: 'Bat and ball sport',
      mainPlayersCount: 11,
      maxSubstitutes: 4,
      genderCategories: ['men', 'women'] as const,
    },
    {
      name: 'Badminton',
      description: 'Racquet sport',
      mainPlayersCount: 2,
      maxSubstitutes: 1,
      genderCategories: ['men', 'women', 'mixed'] as const,
    },
    {
      name: 'Table Tennis',
      description: 'Indoor racquet sport',
      mainPlayersCount: 1,
      maxSubstitutes: 1,
      genderCategories: ['men', 'women'] as const,
    },
  ]

  console.log('🏃 Seeding sports...')
  
  for (const sport of sports) {
    const { genderCategories, ...sportData } = sport
    
    const createdSport = await prisma.sport.upsert({
      where: { name: sport.name },
      update: sportData,
      create: {
        ...sportData,
        genderCategories: {
          create: genderCategories.map((category) => ({
            genderCategory: category,
          })),
        },
      },
    })
    
    console.log(`✅ Created sport: ${createdSport.name}`)
  }

  // Create system config entries
  const configs = [
    {
      key: 'app_version',
      value: '2.0.0',
      description: 'Application version after PostgreSQL migration',
    },
    {
      key: 'registration_open',
      value: 'true',
      description: 'Global registration toggle',
    },
    {
      key: 'max_teams_per_captain',
      value: '3',
      description: 'Maximum teams a captain can create',
    },
    {
      key: 'verification_required',
      value: 'true',
      description: 'Whether user verification is required',
    },
  ]

  console.log('⚙️  Seeding system configuration...')
  
  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, description: config.description },
      create: config,
    })
    
    console.log(`✅ Created config: ${config.key}`)
  }

  console.log('✨ Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })