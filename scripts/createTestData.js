const { createTestTeams } = require('../src/lib/scripts/testData.ts');

async function run() {
  try {
    const venueId = 'AsyteU6KNh7b9YehSkYy';
    const result = await createTestTeams(venueId, 25);
    // Test teams creation completed
  } catch (error) {
    // Error creating test teams
  }
}

run();