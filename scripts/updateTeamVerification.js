#!/usr/bin/env node

// Script to manually run updateTeamVerificationRecord for a specific team
const { updateTeamVerificationRecord } = require('../src/lib/actions/verification/verifyTeam');

async function runUpdateTeamVerification() {
  const teamId = process.argv[2];
  
  if (!teamId) {
    console.error('Usage: node scripts/updateTeamVerification.js <teamId>');
    process.exit(1);
  }

  console.log(`Running updateTeamVerificationRecord for team: ${teamId}`);
  
  try {
    await updateTeamVerificationRecord(teamId);
    console.log('✅ Team verification record updated successfully');
  } catch (error) {
    console.error('❌ Error updating team verification record:', error);
    process.exit(1);
  }
}

runUpdateTeamVerification();