import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting fixed seed with proper dependencies...')

  // 1. Seed Admin User (needed for event createdBy)
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
      name: "Cluster Venue 1",
      address: "venue 1 Address Road",
      district: "ADILABAD",
      state: "Telangana",
      pincode: "504001"
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440002",
      name: "Cluster Venue 2", 
      address: "venue 2 Address Road",
      district: "ADILABAD",
      state: "Telangana",
      pincode: "504001"
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440003",
      name: "Division Venue",
      address: "division venue Address",
      district: "JOGULAMBA GADWAL",
      state: "Telangana",
      pincode: "504001"
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440004",
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

  // 4. STEP 1: Create VenueLevelMapping records first
  console.log('🗺️ Seeding venue level mappings...')
  const venueLevelMappings = [
    {
      id: "550e8400-e29b-41d4-a716-446655440201",
      eventId: event.id,
      venueId: "550e8400-e29b-41d4-a716-446655440001",
      level: "cluster"
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440202", 
      eventId: event.id,
      venueId: "550e8400-e29b-41d4-a716-446655440002",
      level: "cluster"
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440203",
      eventId: event.id,
      venueId: "550e8400-e29b-41d4-a716-446655440003",
      level: "division"
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440204",
      eventId: event.id,
      venueId: "550e8400-e29b-41d4-a716-446655440004",
      level: "final"
    }
  ]

  for (const mapping of venueLevelMappings) {
    await prisma.venueLevelMapping.upsert({
      where: { id: mapping.id },
      update: mapping,
      create: { ...mapping, isActive: true }
    })
    console.log(`✅ Venue Level Mapping: ${mapping.level}`)
  }

  // 5. STEP 2: Use VenueLevelMapping IDs in LocationClusterMapping
  console.log('📍 Seeding location cluster mappings...')
  const locationClusterMappings = [
    {
      id: "550e8400-e29b-41d4-a716-446655440501",
      eventId: event.id,
      locationType: "district",
      locationName: "ADILABAD",
      state: "Telangana",
      district: "ADILABAD",
      clusterVenueMappingId: "550e8400-e29b-41d4-a716-446655440201" // Cluster Venue 1
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440502",
      eventId: event.id,
      locationType: "district", 
      locationName: "JOGULAMBA GADWAL",
      state: "Telangana",
      district: "JOGULAMBA GADWAL",
      clusterVenueMappingId: "550e8400-e29b-41d4-a716-446655440202" // Cluster Venue 2
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440503",
      eventId: event.id,
      locationType: "district",
      locationName: "COIMBATORE", 
      state: "Tamil Nadu",
      district: "COIMBATORE",
      clusterVenueMappingId: "550e8400-e29b-41d4-a716-446655440201" // Cluster Venue 1
    }
  ]

  for (const mapping of locationClusterMappings) {
    await prisma.locationClusterMapping.upsert({
      where: { id: mapping.id },
      update: mapping,
      create: mapping
    })
    console.log(`✅ Location Cluster: ${mapping.locationName}, ${mapping.state}`)
  }

  // 6. STEP 3: Use VenueLevelMapping IDs in ClusterDivisionMapping
  console.log('🔗 Seeding cluster division mappings...')
  const clusterDivisionMappings = [
    {
      id: "550e8400-e29b-41d4-a716-446655440401",
      eventId: event.id,
      state: "Telangana",
      clusterVenueMappingId: "550e8400-e29b-41d4-a716-446655440201", // Cluster Venue 1
      divisionVenueMappingId: "550e8400-e29b-41d4-a716-446655440203" // Division Venue
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440402",
      eventId: event.id,
      state: "Tamil Nadu",
      clusterVenueMappingId: "550e8400-e29b-41d4-a716-446655440202", // Cluster Venue 2  
      divisionVenueMappingId: "550e8400-e29b-41d4-a716-446655440203" // Division Venue
    }
  ]

  for (const mapping of clusterDivisionMappings) {
    await prisma.clusterDivisionMapping.upsert({
      where: { id: mapping.id },
      update: mapping,
      create: mapping
    })
    console.log(`✅ Cluster Division Mapping: ${mapping.state}`)
  }

  // 7. Seed Sports
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

  // 8. Seed Additional Users
  console.log('👥 Seeding additional users...')
  const users = [
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
      lastName: "Volunteer 1",
      fullName: "Technical Volunteer 1",
      email: "tech1@isha.foundation",
      phone: "+919876543212",
      role: "technical_volunteer"
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440104",
      firstName: "Technical",
      lastName: "Volunteer 2", 
      fullName: "Technical Volunteer 2",
      email: "tech2@isha.foundation",
      phone: "+919876543213",
      role: "technical_volunteer"
    }
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user
    })
    console.log(`✅ User: ${user.fullName} (${user.role})`)
  }

  // 9. Seed Volunteer Assignments (using existing VenueLevelMapping IDs)
  console.log('🙋‍♀️ Seeding volunteer assignments...')
  const volunteerAssignments = [
    {
      id: "550e8400-e29b-41d4-a716-446655440601",
      eventId: event.id,
      userId: "550e8400-e29b-41d4-a716-446655440103", // Tech Volunteer 1
      venueId: "550e8400-e29b-41d4-a716-446655440001", // Cluster Venue 1
      role: "technical_volunteer",
      volunteerType: "technical_volunteer",
      assignedBy: adminUser.id
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440602",
      eventId: event.id,
      userId: "550e8400-e29b-41d4-a716-446655440104", // Tech Volunteer 2
      venueId: "550e8400-e29b-41d4-a716-446655440002", // Cluster Venue 2
      role: "technical_volunteer",
      volunteerType: "technical_volunteer", 
      assignedBy: adminUser.id
    }
  ]

  for (const assignment of volunteerAssignments) {
    await prisma.volunteerAssignment.upsert({
      where: { id: assignment.id },
      update: assignment,
      create: { ...assignment, isActive: true }
    })
    console.log(`✅ Volunteer Assignment: ${assignment.role}`)
  }

  console.log('🎉 Fixed seed completed successfully!')
  console.log('✅ All dependencies resolved in correct order')
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
