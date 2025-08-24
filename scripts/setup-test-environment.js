const { createTestTeams, createTestFixtures, createTestMatches, getTestTeamsCount } = require('./testDataJS.js');

async function setupTestEnvironment() {
  try {
    const venueId = 'AsyteU6KNh7b9YehSkYy';
    
    console.log('🚀 Setting up test environment for fixtures and matches...\n');
    
    // Step 1: Check if teams exist, if not create them
    console.log('1. Checking existing teams...');
    const teamsCountResult = await getTestTeamsCount(venueId);
    
    if (teamsCountResult.success && teamsCountResult.count > 0) {
      console.log(`✅ Found ${teamsCountResult.count} existing test teams`);
    } else {
      console.log('⚠️  No test teams found. Creating test teams...');
      const teamsResult = await createTestTeams(venueId, 16); // Create 16 teams for good tournament size
      
      if (teamsResult.success) {
        console.log(`✅ ${teamsResult.message}`);
        console.log(`Created teams: ${teamsResult.teamIds.length}`);
      } else {
        console.error('❌ Error creating teams:', teamsResult.error);
        return;
      }
    }
    
    // Step 2: Create test fixtures
    console.log('\n2. Creating test fixtures...');
    const fixtureResult = await createTestFixtures(venueId);
    
    if (fixtureResult.success) {
      console.log('✅', fixtureResult.message);
      console.log('Fixture ID:', fixtureResult.fixtureId);
    } else {
      console.error('❌ Error creating fixtures:', fixtureResult.error);
      // Continue anyway, maybe fixtures already exist
    }
    
    // Step 3: Create test matches
    console.log('\n3. Creating test matches...');
    const matchResult = await createTestMatches(venueId);
    
    if (matchResult.success) {
      console.log('✅', matchResult.message);
      console.log('Match count:', matchResult.matchCount);
    } else {
      console.error('❌ Error creating matches:', matchResult.error);
    }
    
    console.log('\n🎉 Test environment setup complete!');
    console.log('\n📋 What was created:');
    console.log('- Test teams with venue assignments');
    console.log('- Tournament fixtures');
    console.log('- Sample matches (completed, in-progress, and ready)');
    console.log('\n👉 You can now test:');
    console.log('- Captain/Fixtures page');
    console.log('- Player/Fixtures page');
    console.log('- Player/Matches page');
    
  } catch (error) {
    console.error('❌ Error in setup script:', error.message);
  }
}

setupTestEnvironment();