'use client'

import React from 'react';
import { FixtureMatch } from '@/lib/types/fixtures';

interface TeamInfo {
  id: string;
  name: string;
  tournamentNumber?: number;
}

interface SimpleTournamentBracketProps {
  fixtureName: string;
  sportName: string;
  genderCategory: string;
  venueName: string;
  level: string;
  matches: FixtureMatch[];
  teams: Record<string, TeamInfo>;
  createdAt?: string;
}

interface ProcessedRound {
  roundName: string;
  matches: FixtureMatch[];
  roundIndex: number;
}

const SimpleTournamentBracket: React.FC<SimpleTournamentBracketProps> = ({
  fixtureName,
  sportName,
  genderCategory,
  venueName,
  level,
  matches,
  teams,
  createdAt
}) => {
  // Process matches into rounds
  const processMatches = (): ProcessedRound[] => {
    const roundOrder = ['Round of 64', 'Round of 32', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final'];
    
    const groupedMatches = matches.reduce((acc, match) => {
      if (!acc[match.roundName]) {
        acc[match.roundName] = [];
      }
      acc[match.roundName].push(match);
      return acc;
    }, {} as Record<string, FixtureMatch[]>);

    return roundOrder
      .map((roundName, index) => ({
        roundName,
        matches: groupedMatches[roundName] || [],
        roundIndex: index
      }))
      .filter(round => round.matches.length > 0);
  };

  const getTeamDisplay = (teamId: string | null, match: FixtureMatch) => {
    if (!teamId) {
      return { name: 'BYE', number: null, isBye: true, isEliminated: false };
    }
    
    if (!teams[teamId]) {
      return { name: 'TBD', number: null, isBye: false, isEliminated: false };
    }
    
    const team = teams[teamId];
    const isWinner = match.winnerId === teamId;
    const isEliminated = match.status === 'completed' && match.winnerId && match.winnerId !== teamId;
    
    return {
      name: team.name,
      number: team.tournamentNumber,
      isBye: false,
      isEliminated,
      isWinner
    };
  };

  const rounds = processMatches();
  const totalTeams = Object.keys(teams).length;
  
  // Determine orientation based on team count
  const isPortrait = totalTeams > 16;
  const pageClass = isPortrait ? 'portrait-layout' : 'landscape-layout';

  if (rounds.length === 0) {
    return (
      <div className={`tournament-bracket ${pageClass}`}>
        <div className="bracket-header">
          <h1>{fixtureName}</h1>
          <p>No tournament data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`tournament-bracket ${pageClass}`}>
      {/* Header */}
      <div className="bracket-header">
        <h1>{fixtureName}</h1>
        <div className="tournament-info">
          <span>{sportName} • {genderCategory.charAt(0).toUpperCase() + genderCategory.slice(1)}</span>
          <span>{venueName} • {level.charAt(0).toUpperCase() + level.slice(1)} Level</span>
          {createdAt && <span>{new Date(createdAt).toLocaleDateString()}</span>}
        </div>
      </div>

      {/* Tournament Bracket */}
      <div className="bracket-container">
        <div className="bracket-rounds">
          {rounds.map((round, roundIndex) => (
            <div key={round.roundName} className="tournament-round">
              <div className="round-header">
                <h3>{round.roundName}</h3>
              </div>
              
              <div className="round-matches">
                {round.matches.map((match, matchIndex) => {
                  const team1 = getTeamDisplay(match.team1Id, match);
                  const team2 = getTeamDisplay(match.team2Id, match);
                  
                  return (
                    <div key={match.matchId} className="match-container">
                      {/* Team 1 */}
                      <div className={`team-line ${team1.isWinner ? 'winner' : ''} ${team1.isEliminated ? 'eliminated' : ''} ${team1.isBye ? 'bye' : ''}`}>
                        <span className="team-name">{team1.name}</span>
                        {team1.number && <span className="team-number">#{team1.number}</span>}
                      </div>
                      
                      {/* Divider line */}
                      <div className="match-divider"></div>
                      
                      {/* Team 2 */}
                      <div className={`team-line ${team2.isWinner ? 'winner' : ''} ${team2.isEliminated ? 'eliminated' : ''} ${team2.isBye ? 'bye' : ''}`}>
                        <span className="team-name">{team2.name}</span>
                        {team2.number && <span className="team-number">#{team2.number}</span>}
                      </div>
                      
                      {/* Connection to next round */}
                      {roundIndex < rounds.length - 1 && (
                        <div className="next-round-connector"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bracket-footer">
        <span>Generated: {new Date().toLocaleDateString()}</span>
        <span>Isha Gramotsavam Tournament System</span>
      </div>

      <style jsx>{`
        .tournament-bracket {
          width: 100%;
          height: 100vh;
          background: white;
          color: black;
          font-family: Arial, sans-serif;
          padding: 15mm;
          box-sizing: border-box;
          overflow: hidden;
        }

        .bracket-header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid black;
          padding-bottom: 10px;
        }

        .bracket-header h1 {
          font-size: 18px;
          font-weight: bold;
          margin: 0 0 8px 0;
          text-transform: uppercase;
        }

        .tournament-info {
          font-size: 12px;
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .bracket-container {
          flex: 1;
          overflow: hidden;
        }

        .bracket-rounds {
          display: flex;
          justify-content: space-between;
          height: 100%;
          gap: 15px;
        }

        .tournament-round {
          flex: 1;
          display: flex;
          flex-direction: column;
          max-width: calc(100% / 6);
        }

        .round-header {
          text-align: center;
          margin-bottom: 15px;
        }

        .round-header h3 {
          font-size: 14px;
          font-weight: bold;
          margin: 0;
          padding: 5px 0;
          border: 1px solid black;
          background: white;
        }

        .round-matches {
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          flex: 1;
          gap: 15px;
        }

        .match-container {
          position: relative;
          min-height: 40px;
        }

        .team-line {
          padding: 0;
          border: none;
          display: flex;
          justify-content: flex-start;
          align-items: center;
          font-size: 11px;
          line-height: 1.3;
          margin: 2px 0;
          position: relative;
        }

        .team-line::before {
          content: '';
          position: absolute;
          left: -15px;
          top: 50%;
          width: 12px;
          height: 1px;
          background: black;
          transform: translateY(-50%);
        }

        .team-line.winner {
          font-weight: bold;
        }

        .team-line.eliminated .team-name {
          text-decoration: line-through;
        }

        .team-line.bye {
          font-style: italic;
          color: #666;
        }

        .team-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }

        .team-number {
          font-size: 9px;
          margin-left: 5px;
          color: #666;
        }

        .next-round-connector {
          position: absolute;
          right: -15px;
          top: 50%;
          transform: translateY(-50%);
          width: 15px;
          height: 1px;
          background: black;
        }

        .next-round-connector::after {
          content: '';
          position: absolute;
          right: 0;
          top: 0;
          width: 1px;
          height: 25px;
          background: black;
          transform: translateY(-50%);
        }

        .bracket-footer {
          margin-top: 15px;
          text-align: center;
          font-size: 10px;
          display: flex;
          justify-content: space-between;
          border-top: 1px solid black;
          padding-top: 5px;
        }

        /* Portrait layout for larger tournaments */
        .portrait-layout {
          font-size: 90%;
        }

        .portrait-layout .bracket-header h1 {
          font-size: 16px;
        }

        .portrait-layout .tournament-info {
          font-size: 10px;
        }

        .portrait-layout .round-header h3 {
          font-size: 12px;
          padding: 3px 0;
        }

        .portrait-layout .team-line {
          padding: 6px 8px;
          font-size: 10px;
          min-height: 24px;
        }

        .portrait-layout .bracket-rounds {
          gap: 10px;
        }

        .portrait-layout .round-matches {
          gap: 8px;
        }

        /* Landscape layout for smaller tournaments */
        .landscape-layout .round-matches {
          gap: 15px;
        }

        .landscape-layout .match-container {
          min-height: 70px;
        }

        .landscape-layout .team-line {
          padding: 10px 12px;
          font-size: 12px;
          min-height: 32px;
        }

        /* Print styles */
        @media print {
          .tournament-bracket {
            height: auto;
            min-height: 100vh;
            margin: 0;
            padding: 10mm;
          }

          .portrait-layout {
            /* Portrait orientation for R32+ */
          }

          .landscape-layout {
            /* Landscape orientation for smaller tournaments */
          }
        }
      `}</style>
    </div>
  );
};

export default SimpleTournamentBracket;