import { createAllClusterVenues, getClusterVenuesCount, deleteAllClusterVenues } from '@/lib/scripts/createClusterVenues';

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'create':
      console.log('🏟️  Creating all cluster venues...');
      const createResult = await createAllClusterVenues();
      if (createResult.success) {
        console.log(`✅ ${createResult.message}`);
        console.log(`📊 Created ${createResult.venueCount} venues`);
      } else {
        console.error(`❌ Error: ${createResult.error}`);
        process.exit(1);
      }
      break;
      
    case 'count':
      console.log('📊 Checking cluster venues count...');
      const countResult = await getClusterVenuesCount();
      if (countResult.success) {
        console.log(`✅ Found ${countResult.count} cluster venues`);
      } else {
        console.error(`❌ Error: ${countResult.error}`);
        process.exit(1);
      }
      break;
      
    case 'delete':
      console.log('🗑️  Deleting all cluster venues...');
      const deleteResult = await deleteAllClusterVenues();
      if (deleteResult.success) {
        console.log(`✅ ${deleteResult.message}`);
      } else {
        console.error(`❌ Error: ${deleteResult.error}`);
        process.exit(1);
      }
      break;
      
    default:
      console.log(`
🏟️  Cluster Venues Management Script

Usage: npx tsx scripts/venues-script.ts <command>

Commands:
  create    Create all cluster venues (113 venues across 4 states)
  count     Check how many cluster venues exist
  delete    Delete all cluster venues

Examples:
  npx tsx scripts/venues-script.ts create
  npx tsx scripts/venues-script.ts count
  npx tsx scripts/venues-script.ts delete
      `);
      break;
  }
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});