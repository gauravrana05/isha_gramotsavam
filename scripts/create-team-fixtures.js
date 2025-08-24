const { createFixturesForRealTeam } = require('./testDataJS.js');

async function run() {
  try {
    // Get team ID from command line argument or use default
    const teamId = process.argv[2] || 'uPlbzxI0f6jYCMEHeFp4'; // Team Bela ID from your data
    
    console.log(`🏆 Creating tournament fixtures for team: ${teamId}\n`);
    
    const result = await createFixturesForRealTeam(teamId);
    
    if (result.success) {
      console.log('\n✅ Tournament creation completed successfully!');
      console.log('📊 Summary:');
      console.log(`   - Fixture ID: ${result.fixtureId}`);
      console.log(`   - Matches created: ${result.matchCount}`);
      console.log(`   - Teams in tournament: ${result.teamsInTournament}`);
      console.log('\n👉 You can now test the fixtures and matches pages with your real team account!');
    } else {
      console.error('\n❌ Tournament creation failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error in script:', error.message);
  }
}

run();