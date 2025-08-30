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

  // Import and restore existing production data
  console.log('📥 Restoring existing production data...')
  
  const fs = require('fs')
  const path = require('path')
  
  try {
    const exportedDataPath = path.join(__dirname, '..', 'exported_data.json')
    
    if (fs.existsSync(exportedDataPath)) {
      const exportedData = JSON.parse(fs.readFileSync(exportedDataPath, 'utf8'))
      
      // Restore ALL exported data in the correct order (dependencies first)
      
      // 1. Events (no dependencies)
      for (const event of exportedData.events || []) {
        await prisma.event.upsert({
          where: { id: event.id },
          update: {
            name: event.name,
            description: event.description,
            registrationStartDate: new Date(event.registrationStartDate),
            registrationEndDate: new Date(event.registrationEndDate),
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate),
            status: event.status,
            createdBy: event.createdBy,
          },
          create: {
            id: event.id,
            name: event.name,
            description: event.description,
            registrationStartDate: new Date(event.registrationStartDate),
            registrationEndDate: new Date(event.registrationEndDate),
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate),
            status: event.status,
            createdBy: event.createdBy,
          }
        })
        console.log(`✅ Restored event: ${event.name}`)
      }

      // 2. Venues (no dependencies)
      for (const venue of exportedData.venues || []) {
        await prisma.venue.upsert({
          where: { id: venue.id },
          update: {
            name: venue.name,
            address: venue.address,
            panchayat: venue.panchayat,
            taluk: venue.taluk,
            district: venue.district,
            state: venue.state,
            pincode: venue.pincode,
            isActive: venue.isActive,
          },
          create: {
            id: venue.id,
            name: venue.name,
            address: venue.address,
            panchayat: venue.panchayat,
            taluk: venue.taluk,
            district: venue.district,
            state: venue.state,
            pincode: venue.pincode,
            isActive: venue.isActive,
          }
        })
        console.log(`✅ Restored venue: ${venue.name}`)
      }

      // 3. VenueLevelMappings (depends on events and venues)
      for (const mapping of exportedData.venueLevelMappings || []) {
        await prisma.venueLevelMapping.upsert({
          where: { id: mapping.id },
          update: {
            eventId: mapping.event_id,
            venueId: mapping.venue_id,
            level: mapping.level,
            maxTeams: mapping.max_teams,
            isActive: mapping.is_active,
          },
          create: {
            id: mapping.id,
            eventId: mapping.event_id,
            venueId: mapping.venue_id,
            level: mapping.level,
            maxTeams: mapping.max_teams,
            isActive: mapping.is_active,
          }
        })
        console.log(`✅ Restored venue level mapping: ${mapping.id}`)
      }

      // 4. SportGenderCategories (depends on sports)
      for (const category of exportedData.sportGenderCategories || []) {
        await prisma.sportGenderCategory.upsert({
          where: {
            sportId_genderCategory: {
              sportId: category.sportId,
              genderCategory: category.genderCategory
            }
          },
          update: {},
          create: {
            sportId: category.sportId,
            genderCategory: category.genderCategory,
          }
        })
        console.log(`✅ Restored sport gender category: ${category.sportId} - ${category.genderCategory}`)
      }

      // 5. LocationClusterMappings (depends on events and venue level mappings)
      for (const mapping of exportedData.locationClusterMappings || []) {
        await prisma.locationClusterMapping.upsert({
          where: { id: mapping.id },
          update: {
            eventId: mapping.eventId,
            locationType: mapping.locationType,
            locationName: mapping.locationName,
            state: mapping.state,
            district: mapping.district,
            clusterVenueMappingId: mapping.clusterVenueMappingId,
          },
          create: {
            id: mapping.id,
            eventId: mapping.eventId,
            locationType: mapping.locationType,
            locationName: mapping.locationName,
            state: mapping.state,
            district: mapping.district,
            clusterVenueMappingId: mapping.clusterVenueMappingId,
          }
        })
        console.log(`✅ Restored location cluster mapping: ${mapping.locationName}`)
      }

      // 6. ClusterDivisionMappings (depends on events and venue level mappings)
      for (const mapping of exportedData.clusterDivisionMappings || []) {
        await prisma.clusterDivisionMapping.upsert({
          where: { id: mapping.id },
          update: {
            eventId: mapping.eventId,
            state: mapping.state,
            clusterVenueMappingId: mapping.clusterVenueMappingId,
            divisionVenueMappingId: mapping.divisionVenueMappingId,
            autoAssigned: mapping.autoAssigned,
          },
          create: {
            id: mapping.id,
            eventId: mapping.eventId,
            state: mapping.state,
            clusterVenueMappingId: mapping.clusterVenueMappingId,
            divisionVenueMappingId: mapping.divisionVenueMappingId,
            autoAssigned: mapping.autoAssigned,
          }
        })
        console.log(`✅ Restored cluster division mapping: ${mapping.id}`)
      }

      // 7. Teams (depends on events, sports, and users)
      for (const team of exportedData.teams || []) {
        await prisma.team.upsert({
          where: { id: team.id },
          update: {
            name: team.name,
            description: team.description,
            eventId: team.eventId,
            sportId: team.sportId,
            captainId: team.captainId,
            captainName: team.captainName,
            genderCategory: team.genderCategory,
            status: team.status,
            panchayat: team.panchayat,
            taluk: team.taluk,
            district: team.district,
            state: team.state,
            pincode: team.pincode,
            currentPlayers: team.currentPlayers,
            currentSubstitutes: team.currentSubstitutes,
            tournamentNumber: team.tournamentNumber,
            tournamentNumberAssignedAt: team.tournamentNumberAssignedAt ? new Date(team.tournamentNumberAssignedAt) : null,
            tournamentNumberVenueMappingId: team.tournamentNumberVenueMappingId,
            verifiedBy: team.verifiedBy,
            verifiedAt: team.verifiedAt ? new Date(team.verifiedAt) : null,
          },
          create: {
            id: team.id,
            name: team.name,
            description: team.description,
            eventId: team.eventId,
            sportId: team.sportId,
            captainId: team.captainId,
            captainName: team.captainName,
            genderCategory: team.genderCategory,
            status: team.status,
            panchayat: team.panchayat,
            taluk: team.taluk,
            district: team.district,
            state: team.state,
            pincode: team.pincode,
            currentPlayers: team.currentPlayers,
            currentSubstitutes: team.currentSubstitutes,
            tournamentNumber: team.tournamentNumber,
            tournamentNumberAssignedAt: team.tournamentNumberAssignedAt ? new Date(team.tournamentNumberAssignedAt) : null,
            tournamentNumberVenueMappingId: team.tournamentNumberVenueMappingId,
            verifiedBy: team.verifiedBy,
            verifiedAt: team.verifiedAt ? new Date(team.verifiedAt) : null,
          }
        })
        console.log(`✅ Restored team: ${team.name}`)
      }

      // 8. VolunteerAssignments (depends on events, users, venue level mappings)
      for (const assignment of exportedData.volunteerAssignments || []) {
        await prisma.volunteerAssignment.upsert({
          where: { id: assignment.id },
          update: {
            eventId: assignment.event_id,
            volunteerId: assignment.volunteer_id,
            venueLevelMappingId: assignment.venue_location_mapping_id || assignment.venue_level_mapping_id,
            volunteerType: assignment.volunteer_type,
            contactPhone: assignment.contact_phone,
            status: assignment.status,
            assignedBy: assignment.assigned_by,
            assignedAt: new Date(assignment.assigned_at),
          },
          create: {
            id: assignment.id,
            eventId: assignment.event_id,
            volunteerId: assignment.volunteer_id,
            venueLevelMappingId: assignment.venue_location_mapping_id || assignment.venue_level_mapping_id,
            volunteerType: assignment.volunteer_type,
            contactPhone: assignment.contact_phone,
            status: assignment.status,
            assignedBy: assignment.assigned_by,
            assignedAt: new Date(assignment.assigned_at),
          }
        })
        console.log(`✅ Restored volunteer assignment: ${assignment.id}`)
      }

      // Add other tables as needed (teamPlayers, teamVenueAssignments, etc.)
      // We can skip empty tables for now
      
      console.log('📦 Production data restored successfully!')
    } else {
      console.log('⚠️  No exported data file found, skipping production data restore')
    }
  } catch (error) {
    console.error('❌ Failed to restore production data:', error)
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