import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getDatabaseSummary() {
  try {
    console.log('🔍 Database Summary Report\n');

    // Get basic counts
    const [userCount, venueCount, sportCount, teamCount, playerCount, matchCount, fixtureCount, eventCount] = await Promise.all([
      prisma.user.count(),
      prisma.venue.count(),
      prisma.sport.count(),
      prisma.team.count(),
      prisma.teamPlayer.count(),
      prisma.match.count(),
      prisma.fixture.count(),
      prisma.event.count(),
    ]);

    console.log('📊 RECORD COUNTS:');
    console.log(`Users: ${userCount}`);
    console.log(`Venues: ${venueCount}`);
    console.log(`Sports: ${sportCount}`);
    console.log(`Teams: ${teamCount}`);
    console.log(`Team Players: ${playerCount}`);
    console.log(`Matches: ${matchCount}`);
    console.log(`Fixtures: ${fixtureCount}`);
    console.log(`Events: ${eventCount}\n`);

    // Get venue details
    console.log('🏟️ VENUES:');
    const venues = await prisma.venue.findMany({
      select: {
        name: true,
        district: true,
        state: true,
        isActive: true
      }
    });
    venues.forEach((venue, i) => {
      console.log(`${i+1}. ${venue.name} - ${venue.district}, ${venue.state} (${venue.isActive ? 'Active' : 'Inactive'})`);
    });
    console.log('');

    // Get sports details
    console.log('⚽ SPORTS:');
    const sports = await prisma.sport.findMany({
      select: {
        name: true,
        mainPlayersCount: true,
        maxSubstitutes: true,
        _count: { select: { teams: true } }
      }
    });
    sports.forEach((sport, i) => {
      console.log(`${i+1}. ${sport.name} - ${sport.mainPlayersCount} players, ${sport.maxSubstitutes} subs, ${sport._count.teams} teams`);
    });
    console.log('');

    // Get user roles
    console.log('👥 USER ROLES:');
    const roleStats = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true }
    });
    roleStats.forEach(stat => {
      console.log(`${stat.role}: ${stat._count.role}`);
    });
    console.log('');

    // Get team status
    console.log('🏆 TEAM STATUS:');
    const teamStats = await prisma.team.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    teamStats.forEach(stat => {
      console.log(`${stat.status}: ${stat._count.status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getDatabaseSummary();
