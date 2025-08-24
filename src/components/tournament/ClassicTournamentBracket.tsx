'use client'

import React from 'react';
import { FixtureMatch } from '@/lib/types/fixtures';

interface TeamInfo {
  id: string;
  name: string;
  tournamentNumber?: number;
}

interface ClassicTournamentBracketProps {
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

const ClassicTournamentBracket: React.FC<ClassicTournamentBracketProps> = ({
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

  if (rounds.length === 0) {
    return (
      <div className="classic-bracket">
        <div className="header">
          <h1>{fixtureName}</h1>
          <p>No tournament data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`classic-bracket ${isPortrait ? 'portrait' : 'landscape'}`}>
      {/* Simple Header */}
      <div className="header">
        <h1>{fixtureName}</h1>
        <div className="details">
          {sportName} • {genderCategory.toUpperCase()} • {venueName} • {level.toUpperCase()}
          {createdAt && <span> • {new Date(createdAt).toLocaleDateString()}</span>}
        </div>
      </div>

      {/* Tournament Grid */}
      <div className="tournament-grid">
        {rounds.map((round, roundIndex) => (
          <div key={round.roundName} className="round-column">
            <div className="round-title">{round.roundName}</div>
            
            <div className="matches-column">
              {round.matches.map((match, matchIndex) => {
                const team1 = getTeamDisplay(match.team1Id, match);
                const team2 = getTeamDisplay(match.team2Id, match);
                
                return (
                  <div key={match.matchId} className="match-pair">
                    {/* Team 1 */}
                    <div className={`team ${team1.isWinner ? 'winner' : ''} ${team1.isEliminated ? 'eliminated' : ''} ${team1.isBye ? 'bye' : ''}`}>
                      {team1.name}
                      {team1.number && <span className="num"> #{team1.number}</span>}
                    </div>
                    
                    {/* Team 2 */}
                    <div className={`team ${team2.isWinner ? 'winner' : ''} ${team2.isEliminated ? 'eliminated' : ''} ${team2.isBye ? 'bye' : ''}`}>
                      {team2.name}
                      {team2.number && <span className="num"> #{team2.number}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Simple Footer */}
      <div className="footer">
        Generated: {new Date().toLocaleDateString()} | Isha Gramotsavam
      </div>

      <style jsx>{`
        .classic-bracket {
          width: 100%;
          height: 100vh;
          background: white;
          color: black;
          font-family: Arial, sans-serif;
          padding: 20px;
          box-sizing: border-box;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid black;
          padding-bottom: 15px;
        }

        .header h1 {
          font-size: 20px;
          font-weight: bold;
          margin: 0 0 10px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .details {
          font-size: 12px;
          font-weight: normal;
        }

        .tournament-grid {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          height: calc(100vh - 120px);
          gap: 40px;
        }

        .round-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .round-title {
          text-align: center;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 20px;
          padding: 8px 0;
          border: 1px solid black;
          background: white;
          text-transform: uppercase;
        }

        .matches-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
        }

        .match-pair {
          margin: 10px 0;
          position: relative;
        }

        .team {
          font-size: 12px;
          line-height: 1.4;
          padding: 4px 0;
          margin: 1px 0;
          position: relative;
          max-width: 150px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .team::before {
          content: '';
          position: absolute;
          left: -20px;
          top: 50%;
          width: 15px;
          height: 1px;
          background: black;
          transform: translateY(-50%);
        }

        .team.winner {
          font-weight: bold;
        }

        .team.eliminated {
          text-decoration: line-through;
          color: #666;
        }

        .team.bye {
          font-style: italic;
          color: #999;
        }

        .num {
          font-size: 10px;
          color: #666;
        }

        .match-pair::after {
          content: '';
          position: absolute;
          right: -25px;
          top: 50%;
          width: 20px;
          height: 1px;
          background: black;
          transform: translateY(-50%);
        }

        .round-column:last-child .match-pair::after {
          display: none;
        }

        .footer {
          text-align: center;
          font-size: 10px;
          margin-top: 20px;
          border-top: 1px solid black;
          padding-top: 10px;
        }

        /* Portrait adjustments */
        .portrait {
          font-size: 90%;
        }

        .portrait .header h1 {
          font-size: 18px;
        }

        .portrait .details {
          font-size: 11px;
        }

        .portrait .round-title {
          font-size: 12px;
          padding: 6px 0;
        }

        .portrait .team {
          font-size: 11px;
          max-width: 130px;
        }

        .portrait .tournament-grid {
          gap: 25px;
        }

        /* Landscape adjustments */
        .landscape .tournament-grid {
          gap: 50px;
        }

        .landscape .team {
          font-size: 13px;
          max-width: 180px;
        }

        /* Print styles */
        @media print {
          .classic-bracket {
            height: auto;
            min-height: 100vh;
            padding: 15px;
          }

          .portrait {
            /* Will use portrait page orientation from print.css */
          }

          .tournament-grid {
            height: auto;
            min-height: 80vh;
          }

          .footer {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

export default ClassicTournamentBracket;