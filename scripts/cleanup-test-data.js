const { cleanupAllTestData } = require('./testDataJS.js');

async function run() {
  try {
    console.log('🧹 Starting cleanup of all test data...\n');
    
    const result = await cleanupAllTestData();
    
    if (result.success) {
      console.log('\n✅ Cleanup completed successfully!');
      console.log(`📊 Total documents deleted: ${result.deletedCount}`);
    } else {
      console.error('\n❌ Cleanup failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error in cleanup script:', error.message);
  }
}

run();