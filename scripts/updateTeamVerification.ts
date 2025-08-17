import { updateTeamVerificationRecord } from '../src/lib/actions/verification/verifyTeam';

async function runUpdateTeamVerification() {
  const teamId = process.argv[2];
  
  if (!teamId) {
    console.error('Usage: npx ts-node scripts/updateTeamVerification.ts <teamId>');
    console.error('Example: npx ts-node scripts/updateTeamVerification.ts team123');
    process.exit(1);
  }

  console.log(`🔄 Running updateTeamVerificationRecord for team: ${teamId}`);
  
  try {
    await updateTeamVerificationRecord(teamId);
    console.log('✅ Team verification record updated successfully');
    console.log('📍 Check the console logs above for venue assignment details');
  } catch (error) {
    console.error('❌ Error updating team verification record:', error);
    process.exit(1);
  }
}

runUpdateTeamVerification();