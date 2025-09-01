import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function exportSeedData() {
  try {
    console.log('// Updated seed data from current database\n');

    // Get venues
    const venues = await prisma.venue.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        panchayat: true,
        taluk: true,
        district: true,
        state: true,
        pincode: true,
        isActive: true
      }
    });

    console.log('// VENUES');
    console.log('const venues = [');
    venues.forEach(venue => {
      console.log(`  {`);
      console.log(`    id: "${venue.id}",`);
      console.log(`    name: "${venue.name}",`);
      console.log(`    address: ${venue.address ? `"${venue.address}"` : 'null'},`);
      console.log(`    panchayat: ${venue.panchayat ? `"${venue.panchayat}"` : 'null'},`);
      console.log(`    taluk: ${venue.taluk ? `"${venue.taluk}"` : 'null'},`);
      console.log(`    district: "${venue.district}",`);
      console.log(`    state: "${venue.state}",`);
      console.log(`    pincode: ${venue.pincode ? `"${venue.pincode}"` : 'null'},`);
      console.log(`    isActive: ${venue.isActive}`);
      console.log(`  },`);
    });
    console.log('];\n');

    // Get users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true
      }
    });

    console.log('// USERS');
    console.log('const users = [');
    users.forEach(user => {
      console.log(`  {`);
      console.log(`    id: "${user.id}",`);
      console.log(`    name: "${user.name}",`);
      console.log(`    email: ${user.email ? `"${user.email}"` : 'null'},`);
      console.log(`    phone: ${user.phone ? `"${user.phone}"` : 'null'},`);
      console.log(`    role: "${user.role}",`);
      console.log(`    isActive: ${user.isActive}`);
      console.log(`  },`);
    });
    console.log('];\n');

    // Get venue level mappings
    const venueLevelMappings = await prisma.venueLevelMapping.findMany({
      select: {
        id: true,
        eventId: true,
        venueId: true,
        level: true,
        isActive: true
      }
    });

    console.log('// VENUE LEVEL MAPPINGS');
    console.log('const venueLevelMappings = [');
    venueLevelMappings.forEach(mapping => {
      console.log(`  {`);
      console.log(`    id: "${mapping.id}",`);
      console.log(`    eventId: "${mapping.eventId}",`);
      console.log(`    venueId: "${mapping.venueId}",`);
      console.log(`    level: "${mapping.level}",`);
      console.log(`    isActive: ${mapping.isActive}`);
      console.log(`  },`);
    });
    console.log('];\n');

    // Get cluster division mappings
    const clusterDivisionMappings = await prisma.clusterDivisionMapping.findMany({
      select: {
        id: true,
        eventId: true,
        clusterId: true,
        divisionId: true,
        isActive: true
      }
    });

    console.log('// CLUSTER DIVISION MAPPINGS');
    console.log('const clusterDivisionMappings = [');
    clusterDivisionMappings.forEach(mapping => {
      console.log(`  {`);
      console.log(`    id: "${mapping.id}",`);
      console.log(`    eventId: "${mapping.eventId}",`);
      console.log(`    clusterId: "${mapping.clusterId}",`);
      console.log(`    divisionId: "${mapping.divisionId}",`);
      console.log(`    isActive: ${mapping.isActive}`);
      console.log(`  },`);
    });
    console.log('];\n');

    // Get location cluster mappings
    const locationClusterMappings = await prisma.locationClusterMapping.findMany({
      select: {
        id: true,
        eventId: true,
        district: true,
        state: true,
        clusterId: true,
        isActive: true
      }
    });

    console.log('// LOCATION CLUSTER MAPPINGS');
    console.log('const locationClusterMappings = [');
    locationClusterMappings.forEach(mapping => {
      console.log(`  {`);
      console.log(`    id: "${mapping.id}",`);
      console.log(`    eventId: "${mapping.eventId}",`);
      console.log(`    district: "${mapping.district}",`);
      console.log(`    state: "${mapping.state}",`);
      console.log(`    clusterId: "${mapping.clusterId}",`);
      console.log(`    isActive: ${mapping.isActive}`);
      console.log(`  },`);
    });
    console.log('];\n');

    // Get volunteer assignments
    const volunteerAssignments = await prisma.volunteerAssignment.findMany({
      select: {
        id: true,
        eventId: true,
        userId: true,
        venueId: true,
        role: true,
        isActive: true
      }
    });

    console.log('// VOLUNTEER ASSIGNMENTS');
    console.log('const volunteerAssignments = [');
    volunteerAssignments.forEach(assignment => {
      console.log(`  {`);
      console.log(`    id: "${assignment.id}",`);
      console.log(`    eventId: "${assignment.eventId}",`);
      console.log(`    userId: "${assignment.userId}",`);
      console.log(`    venueId: "${assignment.venueId}",`);
      console.log(`    role: "${assignment.role}",`);
      console.log(`    isActive: ${assignment.isActive}`);
      console.log(`  },`);
    });
    console.log('];\n');

    console.log('// Export all data');
    console.log('export {');
    console.log('  venues,');
    console.log('  users,');
    console.log('  venueLevelMappings,');
    console.log('  clusterDivisionMappings,');
    console.log('  locationClusterMappings,');
    console.log('  volunteerAssignments');
    console.log('};');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportSeedData();
