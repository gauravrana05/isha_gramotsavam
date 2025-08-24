import { createAllClusterVenues, getClusterVenuesCount, deleteAllClusterVenues } from '@/lib/scripts/createClusterVenues';

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'create':
      const createResult = await createAllClusterVenues();
      if (!createResult.success) {
        process.exit(1);
      }
      break;
      
    case 'count':
      const countResult = await getClusterVenuesCount();
      if (!countResult.success) {
        process.exit(1);
      }
      break;
      
    case 'delete':
      const deleteResult = await deleteAllClusterVenues();
      if (!deleteResult.success) {
        process.exit(1);
      }
      break;
      
    default:
      // Usage: npx tsx scripts/venues-script.ts <command>
      // Commands: create, count, delete
      break;
  }
}

main().catch(error => {
  process.exit(1);
});