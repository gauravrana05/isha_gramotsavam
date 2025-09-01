import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting simplified seed...')

  // 1. Seed Admin User
  console.log('👥 Seeding admin user...')
  const adminUser = await prisma.user.upsert({
    where: { id: '550e8400-e29b-41d4-a716-446655440101' },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440101',
      firstName: 'Admin',
      lastName: 'User',
      fullName: 'Admin User',
      email: 'admin@isha.foundation',
      phone: '+919876543210',
      role: 'admin'
    }
  })
  console.log(`✅ Admin User: ${adminUser.fullName}`)

  // 2. Seed Event
  console.log('📅 Seeding event...')
  const event = await prisma.event.upsert({
    where: { id: '550e8400-e29b-41d4-a716-446655440301' },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440301',
      name: 'Isha Gramotsavam 2024',
      description: 'Annual sports tournament',
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-15'),
      registrationStartDate: new Date('2024-11-01'),
      registrationEndDate: new Date('2024-11-25'),
      status: 'active',
      createdBy: adminUser.id
    }
  })
  console.log(`✅ Event: ${event.name}`)

  // 3. Seed Venues
  console.log('🏟️ Seeding venues...')
  const venues = [
    {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Venue 1",
      address: "venue 1 Address Road",
      district: "ADILABAD",
      state: "Telangana",
      pincode: "504001"
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440002",
      name: "Finals Venue",
      address: "final venue Address",
      district: "COIMBATORE",
      state: "Tamil Nadu",
      pincode: "641114"
    }
  ]

  for (const venue of venues) {
    await prisma.venue.upsert({
      where: { id: venue.id },
      update: venue,
      create: venue
    })
    console.log(`✅ Venue: ${venue.name}`)
  }

  // 4. Seed Sports
  console.log('⚽ Seeding sports...')
  const sports = [
    {
      id: '550e8400-e29b-41d4-a716-446655440701',
      name: 'Throwball',
      description: 'Traditional ball sport',
      mainPlayersCount: 2,
      maxSubstitutes: 1,
      genderCategories: ['men'] as const,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440702',
      name: 'Volleyball',
      description: 'Team sport with net',
      mainPlayersCount: 6,
      maxSubstitutes: 6,
      genderCategories: ['women'] as const,
    },
  ]

  for (const sport of sports) {
    const { genderCategories, ...sportData } = sport
    
    await prisma.sport.upsert({
      where: { id: sport.id },
      update: sportData,
      create: {
        ...sportData,
        sportGenderCategories: {
          create: genderCategories.map((category) => ({
            genderCategory: category,
          })),
        },
      }
    })
    console.log(`✅ Sport: ${sport.name}`)
  }

  // 5. Seed Sample Users
  console.log('👥 Seeding sample users...')
  const sampleUsers = [
    {
      id: "550e8400-e29b-41d4-a716-446655440102",
      firstName: "Team",
      lastName: "Captain",
      fullName: "Team Captain",
      email: "captain@example.com",
      phone: "+919876543211",
      role: "captain"
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440103",
      firstName: "Technical",
      lastName: "Volunteer",
      fullName: "Technical Volunteer",
      email: "tech@isha.foundation",
      phone: "+919876543212",
      role: "technical_volunteer"
    }
  ]

  for (const user of sampleUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user
    })
    console.log(`✅ User: ${user.fullName} (${user.role})`)
  }

  console.log('🎉 Simplified seed completed successfully!')
  console.log('📝 Note: Complex mappings skipped - can be added via admin interface')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
