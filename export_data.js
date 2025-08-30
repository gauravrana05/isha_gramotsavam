const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportData() {
  console.log('📤 Exporting existing data...');

  try {
    // Fetch data from all important tables that exist
    let events = [];
    let venues = [];
    let venueLevelMappings = [];
    let users = [];
    let volunteerAssignments = [];
    let sports = [];
    let systemConfigs = [];
    let teams = [];
    let teamPlayers = [];
    let teamVenueAssignments = [];

    // Try to fetch each table, skip if doesn't exist
    try {
      events = await prisma.event.findMany();
      console.log('✅ Events fetched');
    } catch (e) { console.log('⚠️  Events table not found'); }

    try {
      venues = await prisma.venue.findMany();
      console.log('✅ Venues fetched');
    } catch (e) { console.log('⚠️  Venues table not found'); }

    try {
      users = await prisma.user.findMany();
      console.log('✅ Users fetched');
    } catch (e) { console.log('⚠️  Users table not found'); }

    try {
      sports = await prisma.sport.findMany();
      console.log('✅ Sports fetched');
    } catch (e) { console.log('⚠️  Sports table not found'); }

    try {
      systemConfigs = await prisma.systemConfig.findMany();
      console.log('✅ SystemConfigs fetched');
    } catch (e) { console.log('⚠️  SystemConfigs table not found'); }

    try {
      teams = await prisma.team.findMany();
      console.log('✅ Teams fetched');
    } catch (e) { console.log('⚠️  Teams table not found'); }

    try {
      teamPlayers = await prisma.teamPlayer.findMany();
      console.log('✅ TeamPlayers fetched');
    } catch (e) { console.log('⚠️  TeamPlayers table not found'); }

    try {
      teamVenueAssignments = await prisma.teamVenueAssignment.findMany();
      console.log('✅ TeamVenueAssignments fetched');
    } catch (e) { console.log('⚠️  TeamVenueAssignments table not found'); }

    // Try raw queries for tables that might have different names
    try {
      venueLevelMappings = await prisma.$queryRaw`SELECT * FROM venue_location_mappings`;
      console.log('✅ VenueLevelMappings fetched (from venue_location_mappings)');
    } catch (e) {
      try {
        venueLevelMappings = await prisma.$queryRaw`SELECT * FROM venue_level_mappings`;
        console.log('✅ VenueLevelMappings fetched (from venue_level_mappings)');
      } catch (e2) {
        console.log('⚠️  VenueLevelMappings table not found');
      }
    }

    try {
      volunteerAssignments = await prisma.$queryRaw`SELECT * FROM volunteer_assignments`;
      console.log('✅ VolunteerAssignments fetched');
    } catch (e) { console.log('⚠️  VolunteerAssignments table not found'); }

    // Create export object
    const exportData = {
      events,
      venues,
      venueLevelMappings,
      users,
      volunteerAssignments,
      sports,
      systemConfigs,
      teams,
      teamPlayers,
      teamVenueAssignments,
      exportedAt: new Date().toISOString()
    };

    // Write to file
    fs.writeFileSync('exported_data.json', JSON.stringify(exportData, null, 2));
    
    console.log('✅ Data exported successfully to exported_data.json');
    console.log(`📊 Exported:`);
    console.log(`   Events: ${events.length}`);
    console.log(`   Venues: ${venues.length}`);
    console.log(`   Venue Level Mappings: ${venueLevelMappings.length}`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Volunteer Assignments: ${volunteerAssignments.length}`);
    console.log(`   Sports: ${sports.length}`);
    console.log(`   System Configs: ${systemConfigs.length}`);
    console.log(`   Teams: ${teams.length}`);
    console.log(`   Team Players: ${teamPlayers.length}`);
    console.log(`   Team Venue Assignments: ${teamVenueAssignments.length}`);

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();