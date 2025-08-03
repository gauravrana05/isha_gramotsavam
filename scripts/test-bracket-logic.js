#!/usr/bin/env node

// Test the bracket generation logic without Firebase
function generateKnockoutBracket(teams) {
  const teamCount = teams.length;
  
  if (teamCount < 2) {
    throw new Error('At least 2 teams required for tournament');
  }
  
  // Special case for exactly 2 teams - just create a final match
  if (teamCount === 2) {
    const matches = [{
      matchId: 'match_1',
      team1Id: teams[0].id,
      team2Id: teams[1].id,
      winnerId: null,
      roundName: 'Final',
      status: 'scheduled'
    }];
    
    return {
      matches,
      totalRounds: 1,
      bracketSize: 2,
      byeTeams: []
    };
  }
  
  // Find next power of 2 (e.g., 25 teams → 32 bracket)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(teamCount)));
  const byeCount = bracketSize - teamCount;
  
  console.log(`\n🏆 TOURNAMENT BRACKET GENERATION`);
  console.log(`📊 Teams: ${teamCount}, Bracket Size: ${bracketSize}, Byes: ${byeCount}`);
  
  const matches = [];
  let matchCounter = 1;
  
  // Top seeds get byes (seeded teams 1 through byeCount)
  const byeTeams = teams.slice(0, byeCount);
  const firstRoundTeams = teams.slice(byeCount);
  
  console.log(`\n🎯 BYE TEAMS (Top ${byeCount} seeds):`);
  byeTeams.forEach((team, i) => {
    console.log(`   ${i + 1}. ${team.name} (Seed ${team.tournamentNumber})`);
  });
  
  console.log(`\n⚔️ FIRST ROUND TEAMS (${firstRoundTeams.length} teams, ${firstRoundTeams.length/2} matches):`);
  
  // Calculate total matches needed (teamCount - 1, since each match eliminates one team)
  const totalMatchesNeeded = teamCount - 1;
  
  // Create first round matches (only for non-bye teams)
  const firstRoundMatches = firstRoundTeams.length / 2;
  
  for (let i = 0; i < firstRoundTeams.length; i += 2) {
    if (i + 1 < firstRoundTeams.length) {
      const team1 = firstRoundTeams[i];
      const team2 = firstRoundTeams[i + 1];
      
      console.log(`   Match ${matchCounter}: ${team1.name} (${team1.tournamentNumber}) vs ${team2.name} (${team2.tournamentNumber})`);
      
      const match = {
        matchId: `match_${matchCounter++}`,
        team1Id: team1.id,
        team2Id: team2.id,
        winnerId: null,
        roundName: `Round of ${bracketSize}`,
        status: 'scheduled'
      };
      matches.push(match);
    }
  }
  
  function getRoundName(roundSize) {
    switch (roundSize) {
      case 1: return 'Final';
      case 2: return 'Semi Final';
      case 4: return 'Quarter Final';
      case 8: return 'Round of 16';
      case 16: return 'Round of 32';
      case 32: return 'Round of 64';
      default: return `Round of ${roundSize * 2}`;
    }
  }
  
  // After first round: firstRoundMatches winners + byeCount bye teams = total teams advancing to R16
  let teamsRemaining = firstRoundMatches + byeCount;
  
  console.log(`\n📊 After R32: ${teamsRemaining} teams advance to next round`);
  
  // Create subsequent rounds until we reach the final
  while (teamsRemaining > 1) {
    const roundName = getRoundName(teamsRemaining);
    const matchesThisRound = Math.floor(teamsRemaining / 2);
    
    console.log(`\n🔄 ${roundName.toUpperCase()} (${matchesThisRound} matches, ${teamsRemaining} teams remaining):`);
    
    for (let i = 0; i < matchesThisRound; i++) {
      console.log(`   Match ${matchCounter}: TBD vs TBD`);
      
      const match = {
        matchId: `match_${matchCounter++}`,
        team1Id: null, // Will be filled by winners from previous round or bye teams
        team2Id: null,
        winnerId: null,
        roundName,
        status: 'scheduled'
      };
      matches.push(match);
    }
    
    // Update teams remaining for next round
    teamsRemaining = matchesThisRound;
  }
  
  console.log(`\n📈 SUMMARY:`);
  console.log(`   Total Matches: ${matches.length}`);
  console.log(`   Total Rounds: ${Math.ceil(Math.log2(bracketSize))}`);
  console.log(`   Expected for ${teamCount} teams: ${teamCount - 1} matches`);
  
  return {
    matches,
    totalRounds: Math.ceil(Math.log2(bracketSize)),
    bracketSize,
    byeTeams: byeTeams.map(t => t.id)
  };
}

// Create test teams
const teams = [];
for (let i = 1; i <= 25; i++) {
  teams.push({
    id: `team_${i}`,
    name: `Test Team ${i.toString().padStart(2, '0')}`,
    tournamentNumber: i
  });
}

// Test the bracket generation
try {
  const result = generateKnockoutBracket(teams);
  
  console.log(`\n✅ BRACKET GENERATION SUCCESSFUL!`);
  console.log(`\n🎯 Expected Calculation Check:`);
  console.log(`   - 25 teams need ${25 - 1} = 24 total matches`);
  console.log(`   - Generated: ${result.matches.length} matches`);
  console.log(`   - ✅ ${result.matches.length === 24 ? 'CORRECT!' : 'INCORRECT!'}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
}