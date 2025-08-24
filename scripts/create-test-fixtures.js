const { createTestFixtures, createTestMatches } = require('./testDataJS.js');

async function run() {
  try {
    // Use the same venue ID from createTestData.js
    const venueId = 'AsyteU6KNh7b9YehSkYy';
    
    console.log('Creating test fixtures...');
    const fixtureResult = await createTestFixtures(venueId);
    
    if (fixtureResult.success) {
      console.log('✅', fixtureResult.message);
      console.log('Fixture ID:', fixtureResult.fixtureId);
      
      console.log('\nCreating test matches...');
      const matchResult = await createTestMatches(venueId);
      
      if (matchResult.success) {
        console.log('✅', matchResult.message);
        console.log('Match count:', matchResult.matchCount);
      } else {
        console.error('❌ Error creating matches:', matchResult.error);
      }
      
    } else {
      console.error('❌ Error creating fixtures:', fixtureResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error in script:', error.message);
  }
}

run();