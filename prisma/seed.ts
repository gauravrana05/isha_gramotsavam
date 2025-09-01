import { PrismaClient } from '@prisma/client'
import { 
  venues, 
  users, 
  venueLevelMappings, 
  clusterDivisionMappings, 
  locationClusterMappings, 
  volunteerAssignments
} from './seed-data-updated'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting comprehensive seed...')

  // 1. Seed Users first (needed for event createdBy)
  console.log('👥 Seeding users...')
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user
    })
    console.log(`✅ User: ${user.fullName} (${user.role})`)
  }

  // 2. Seed Event (now that admin user exists)
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
      createdBy: '550e8400-e29b-41d4-a716-446655440101' // Admin user ID
    }
  })
  console.log(`✅ Event: ${event.name}`)

  // 3. Seed Venues
  console.log('🏟️ Seeding venues...')
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
    
    const createdSport = await prisma.sport.upsert({
      where: { id: sport.id },
      update: sportData,
      create: {
        ...sportData,
        sportGenderCategories: {
          create: genderCategories.map((category) => ({
            genderCategory: category,
          })),
        },
      },
      include: {
        sportGenderCategories: true,
      },
    })
    console.log(`✅ Sport: ${createdSport.name}`)
  }

  // 5. Seed Venue Level Mappings
  console.log('🗺️ Seeding venue level mappings...')
  for (const mapping of venueLevelMappings) {
    await prisma.venueLevelMapping.upsert({
      where: { id: mapping.id },
      update: mapping,
      create: mapping
    })
    console.log(`✅ Venue Level Mapping: ${mapping.level}`)
  }

  // 6. Seed Location Cluster Mappings
  console.log('📍 Seeding location cluster mappings...')
  for (const mapping of locationClusterMappings) {
    await prisma.locationClusterMapping.upsert({
      where: { id: mapping.id },
      update: mapping,
      create: mapping
    })
    console.log(`✅ Location Cluster: ${mapping.district}, ${mapping.state}`)
  }

  // 7. Seed Cluster Division Mappings
  console.log('🔗 Seeding cluster division mappings...')
  for (const mapping of clusterDivisionMappings) {
    await prisma.clusterDivisionMapping.upsert({
      where: { id: mapping.id },
      update: mapping,
      create: mapping
    })
    console.log(`✅ Cluster Division Mapping: ${mapping.clusterId} -> ${mapping.divisionId}`)
  }

  // 8. Seed Volunteer Assignments
  console.log('🙋‍♀️ Seeding volunteer assignments...')
  for (const assignment of volunteerAssignments) {
    const assignmentData = {
      ...assignment,
      assignedBy: '550e8400-e29b-41d4-a716-446655440101' // Admin user ID
    }
    await prisma.volunteerAssignment.upsert({
      where: { id: assignment.id },
      update: assignmentData,
      create: assignmentData
    })
    console.log(`✅ Volunteer Assignment: ${assignment.role} at venue`)
  }

  console.log('🎉 Seed completed successfully!')
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
