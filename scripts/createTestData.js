const { createTestTeams } = require('../src/lib/scripts/testData.ts');

async function run() {
  try {
    const venueId = 'AsyteU6KNh7b9YehSkYy';
    const result = await createTestTeams(venueId, 25);
    console.log('Test teams creation result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error creating test teams:', error);
  }
}

run();