import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectDatabase() {
  try {
    console.log('🔍 Database Inspection Report\n');

    // Count records in key tables
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.venue.count(),
      prisma.sport.count(),
      prisma.team.count(),
      prisma.teamPlayer.count(),
      prisma.match.count(),
      prisma.fixture.count(),
      prisma.event.count(),
    ]);

    const [userCount, venueCount, sportCount, teamCount, playerCount, matchCount, fixtureCount, eventCount] = counts;

    console.log('📊 Record Counts:');
    console.log(`Users: ${userCount}`);
    console.log(`Venues: ${venueCount}`);
    console.log(`Sports: ${sportCount}`);
    console.log(`Teams: ${teamCount}`);
    console.log(`Team Players: ${playerCount}`);
    console.log(`Matches: ${matchCount}`);
    console.log(`Fixtures: ${fixtureCount}`);
    console.log(`Events: ${eventCount}\n`);

    // Fetch venue data
    if (venueCount > 0) {
      console.log('🏟️ Venue Details:');
      const venues = await prisma.venue.findMany({
        select: {
          id: true,
          name: true,
          address: true,
          district: true,
          state: true,
          pincode: true,
          isActive: true,
          createdAt: true,
        }
      });

      venues.forEach((venue, index) => {
        console.log(`${index + 1}. ${venue.name}`);
        console.log(`   Address: ${venue.address || 'Not set'}`);
        console.log(`   Location: ${venue.district}, ${venue.state}`);
        console.log(`   Pincode: ${venue.pincode || 'Not set'}`);
        console.log(`   Active: ${venue.isActive}`);
        console.log(`   Created: ${venue.createdAt.toLocaleDateString()}\n`);
      });
    }

    // Fetch user role distribution
    if (userCount > 0) {
      console.log('👥 User Role Distribution:');
      const roleStats = await prisma.user.groupBy({
        by: ['role'],
        _count: {
          role: true
        }
      });

      roleStats.forEach(stat => {
        console.log(`${stat.role}: ${stat._count.role}`);
      });
      console.log('');
    }

    // Fetch recent activity
    console.log('📅 Recent Activity:');
    const recentUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    const recentTeams = await prisma.team.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    console.log(`New users (last 7 days): ${recentUsers}`);
    console.log(`New teams (last 7 days): ${recentTeams}\n`);

    // Check for any sports data
    if (sportCount > 0) {
      console.log('⚽ Sports Available:');
      const sports = await prisma.sport.findMany({
        select: {
          name: true,
          category: true,
          teamSize: true,
          _count: {
            select: {
              teams: true
            }
          }
        }
      });

      sports.forEach(sport => {
        console.log(`${sport.name} (${sport.category}) - Team size: ${sport.teamSize}, Teams: ${sport._count.teams}`);
      });
      console.log('');
    }

    // Check team details
    if (teamCount > 0) {
      console.log('🏆 Team Details:');
      const teams = await prisma.team.findMany({
        select: {
          name: true,
          status: true,
          sport: {
            select: { name: true }
          },
          captain: {
            select: { name: true }
          },
          _count: {
            select: { players: true }
          }
        },
        take: 5
      });

      teams.forEach(team => {
        console.log(`${team.name} (${team.sport.name}) - Captain: ${team.captain.name}, Players: ${team._count.players}, Status: ${team.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Database inspection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectDatabase();
