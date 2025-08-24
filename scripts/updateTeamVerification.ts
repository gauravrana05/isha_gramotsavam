import { updateTeamVerificationRecord } from '../src/lib/actions/verification/verifyTeam';

async function runUpdateTeamVerification() {
  const teamId = process.argv[2];
  
  if (!teamId) {
    process.exit(1);
  }

  try {
    await updateTeamVerificationRecord(teamId);
  } catch (error) {
    process.exit(1);
  }
}

runUpdateTeamVerification();