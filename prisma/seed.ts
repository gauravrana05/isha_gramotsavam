import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Seed sports data
  const sports = [
    {
      name: 'Throwball',
      description: 'Traditional ball sport',
      mainPlayersCount: 2,
      maxSubstitutes: 1,
      genderCategories: ['men'] as const,
    },
    {
      name: 'Volleyball',
      description: 'Team sport with net',
      mainPlayersCount: 6,
      maxSubstitutes: 6,
      genderCategories: ['women'] as const,
    },
  ]

  console.log('🏃 Seeding sports...')
  
  for (const sport of sports) {
    const { genderCategories, ...sportData } = sport
    
    // Check if sport already exists
    const existingSport = await prisma.sport.findFirst({
      where: { name: sport.name }
    })
    
    let createdSport
    if (existingSport) {
      // Update existing sport
      createdSport = await prisma.sport.update({
        where: { id: existingSport.id },
        data: sportData,
      })
      console.log(`✅ Updated sport: ${createdSport.name}`)
    } else {
      // Create new sport
      createdSport = await prisma.sport.create({
        data: {
          ...sportData,
          sportGenderCategories: {
            create: genderCategories.map((category) => ({
              genderCategory: category,
            })),
          },
        },
      })
      console.log(`✅ Created sport: ${createdSport.name}`)
    }
  }

  // Seed users with different roles
  const users = [
    {
      email: 'admin@ishagramotsavam.org',
      firstName: 'Admin',
      lastName: 'User',
      phone: '9876543210',
      whatsappNumber: '9876543210',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'M' as const,
      panchayat: 'Coimbatore Corporation',
      taluk: 'Coimbatore',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641001',
      role: 'admin' as const,
      profileComplete: true,
      languagePreference: 'en',
    },
    {
      email: 'public@ishagramotsavam.org',
      firstName: 'Public',
      lastName: 'User',
      phone: '9876543211',
      whatsappNumber: '9876543211',
      dateOfBirth: new Date('1995-01-01'),
      gender: 'F' as const,
      panchayat: 'Pollachi Municipality',
      taluk: 'Pollachi',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '642001',
      role: 'public' as const,
      profileComplete: true,
      languagePreference: 'en',
    },
    {
      email: 'verification@ishagramotsavam.org',
      firstName: 'Verification',
      lastName: 'Volunteer',
      phone: '9876543212',
      whatsappNumber: '9876543212',
      dateOfBirth: new Date('1988-01-01'),
      gender: 'M' as const,
      panchayat: 'Mettupalayam Municipality',
      taluk: 'Mettupalayam',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641301',
      role: 'verification_volunteer' as const,
      profileComplete: true,
      languagePreference: 'en',
    },
    {
      email: 'technical@ishagramotsavam.org',
      firstName: 'Technical',
      lastName: 'Volunteer',
      phone: '9876543213',
      whatsappNumber: '9876543213',
      dateOfBirth: new Date('1992-01-01'),
      gender: 'F' as const,
      panchayat: 'Udumalpet Municipality',
      taluk: 'Udumalpet',
      district: 'Tirupur',
      state: 'Tamil Nadu',
      pincode: '642126',
      role: 'technical_volunteer' as const,
      profileComplete: true,
      languagePreference: 'en',
    },
  ]

  console.log('👥 Seeding users...')
  
  for (const user of users) {
    const createdUser = await prisma.user.upsert({
      where: { phone: user.phone },
      update: user,
      create: user,
    })
    
    console.log(`✅ Created user: ${createdUser.firstName} ${createdUser.lastName} (${createdUser.role})`)
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