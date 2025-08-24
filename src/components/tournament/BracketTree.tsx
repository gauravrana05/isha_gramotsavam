'use client'

import React from 'react';
import { FixtureMatch } from '@/lib/types/fixtures';

interface TeamInfo {
  id: string;
  name: string;
  tournamentNumber?: number;
}

interface BracketTreeProps {
  matches: FixtureMatch[];
  teams: Record<string, TeamInfo>;
}

interface ProcessedMatch extends FixtureMatch {
  position: {
    round: number;
    matchInRound: number;
  };
}

interface RoundData {
  roundName: string;
  matches: ProcessedMatch[];
  roundIndex: number;
}

const BracketTree: React.FC<BracketTreeProps> = ({ matches, teams }) => {
  // Process and organize matches into a tournament tree structure
  const processMatches = (): RoundData[] => {
    const roundOrder = ['Round of 64', 'Round of 32', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final'];
    
    // Group matches by round
    const groupedMatches = matches.reduce((acc, match) => {
      if (!acc[match.roundName]) {
        acc[match.roundName] = [];
      }
      acc[match.roundName].push(match);
      return acc;
    }, {} as Record<string, FixtureMatch[]>);

    // Create ordered rounds with position data
    const rounds: RoundData[] = roundOrder
      .map((roundName, roundIndex) => {
        const roundMatches = groupedMatches[roundName] || [];
        
        // Sort matches within round and add position data
        const processedMatches: ProcessedMatch[] = roundMatches
          .sort((a, b) => {
            // Try to sort by match ID number if available
            const aNum = parseInt(a.matchId.replace(/\D/g, '')) || 0;
            const bNum = parseInt(b.matchId.replace(/\D/g, '')) || 0;
            return aNum - bNum;
          })
          .map((match, matchIndex) => ({
            ...match,
            position: {
              round: roundIndex,
              matchInRound: matchIndex
            }
          }));

        return {
          roundName,
          matches: processedMatches,
          roundIndex
        };
      })
      .filter(round => round.matches.length > 0);

    return rounds;
  };

  const getTeamDisplay = (teamId: string | null) => {
    if (!teamId || !teams[teamId]) {
      return { name: 'TBD', number: null, isPlaceholder: true };
    }
    const team = teams[teamId];
    return {
      name: team.name,
      number: team.tournamentNumber,
      isPlaceholder: false
    };
  };

  const isWinner = (match: FixtureMatch, teamId: string | null) => {
    return match.winnerId === teamId && teamId !== null && teamId !== undefined;
  };

  const getMatchHeight = (roundIndex: number, totalRounds: number) => {
    // Increase spacing between matches in later rounds
    const baseHeight = 80;
    const multiplier = Math.pow(2, roundIndex);
    return Math.max(baseHeight, baseHeight * multiplier);
  };

  const getVerticalSpacing = (roundIndex: number) => {
    // Add vertical offset for better tree alignment
    return roundIndex * 20;
  };

  const rounds = processMatches();
  const totalRounds = rounds.length;

  if (rounds.length === 0) {
    return (
      <div className="bracket-tree-empty">
        <p>No tournament bracket data available</p>
      </div>
    );
  }

  return (
    <div className="bracket-tree">
      <div 
        className="bracket-tree-container"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${totalRounds}, minmax(200px, 1fr))`,
          gap: '40px',
          alignItems: 'start',
          width: 'fit-content',
          minWidth: '100%'
        }}
      >
        {rounds.map((round, roundIndex) => {
          const matchHeight = getMatchHeight(roundIndex, totalRounds);
          const verticalSpacing = getVerticalSpacing(roundIndex);

          return (
            <div 
              key={round.roundName} 
              className="bracket-round"
              style={{
                marginTop: `${verticalSpacing}px`
              }}
            >
              <div className="round-header">
                <h4 className="round-title">{round.roundName}</h4>
                <span className="round-count">({round.matches.length} matches)</span>
              </div>
              
              <div 
                className="round-matches"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: `${Math.max(20, matchHeight - 80)}px`
                }}
              >
                {round.matches.map((match, matchIndex) => {
                  const team1 = getTeamDisplay(match.team1Id);
                  const team2 = getTeamDisplay(match.team2Id);
                  const isTeam1Winner = isWinner(match, match.team1Id);
                  const isTeam2Winner = isWinner(match, match.team2Id);
                  const hasWinner = match.winnerId && match.status === 'completed';

                  return (
                    <div 
                      key={match.matchId} 
                      className="bracket-match"
                      style={{
                        height: `${matchHeight}px`,
                        position: 'relative'
                      }}
                    >
                      {/* Match container */}
                      <div className="match-container">
                        {/* Team 1 */}
                        <div className={`team-slot team-1 ${isTeam1Winner ? 'winner' : ''} ${team1.isPlaceholder ? 'placeholder' : ''}`}>
                          <div className="team-info">
                            <span className="team-name">{team1.name}</span>
                            {team1.number && (
                              <span className="team-number">#{team1.number}</span>
                            )}
                          </div>
                          {isTeam1Winner && <div className="winner-indicator">✓</div>}
                        </div>

                        {/* Match separator */}
                        <div className="match-separator">
                          <div className="vs-line"></div>
                          {match.status === 'completed' && hasWinner && (
                            <div className="completed-indicator">✓</div>
                          )}
                        </div>

                        {/* Team 2 */}
                        <div className={`team-slot team-2 ${isTeam2Winner ? 'winner' : ''} ${team2.isPlaceholder ? 'placeholder' : ''}`}>
                          <div className="team-info">
                            <span className="team-name">{team2.name}</span>
                            {team2.number && (
                              <span className="team-number">#{team2.number}</span>
                            )}
                          </div>
                          {isTeam2Winner && <div className="winner-indicator">✓</div>}
                        </div>
                      </div>

                      {/* Connection line to next round */}
                      {roundIndex < totalRounds - 1 && (
                        <div className="connection-line">
                          <div className="horizontal-line"></div>
                          <div className="vertical-connector"></div>
                        </div>
                      )}

                      {/* Match metadata */}
                      <div className="match-metadata">
                        <span className="match-status">{match.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .bracket-tree {
          width: 100%;
          overflow-x: auto;
          padding: 20px 0;
        }

        .bracket-tree-container {
          min-height: 400px;
          padding: 20px;
        }

        .bracket-round {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 200px;
        }

        .round-header {
          text-align: center;
          margin-bottom: 24px;
          padding: 8px 16px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }

        .round-title {
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }

        .round-count {
          font-size: 12px;
          color: #666;
          display: block;
          margin-top: 2px;
        }

        .bracket-match {
          position: relative;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .match-container {
          background: white;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.08);
          transition: all 0.2s ease;
        }

        .match-container:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.12);
          transform: translateY(-1px);
        }

        .team-slot {
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-height: 44px;
          background: #fafafa;
          border-bottom: 1px solid #e1e5e9;
          position: relative;
          transition: all 0.2s ease;
        }

        .team-slot:last-child {
          border-bottom: none;
        }

        .team-slot.winner {
          background: #e8f5e8;
          color: #1e5e1e;
          font-weight: 600;
          border-left: 4px solid #28a745;
        }

        .team-slot.placeholder {
          background: #f8f9fa;
          color: #999;
          font-style: italic;
        }

        .team-info {
          display: flex;
          align-items: center;
          flex: 1;
          gap: 8px;
        }

        .team-name {
          font-size: 13px;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .team-number {
          font-size: 11px;
          color: #666;
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .winner-indicator {
          color: #28a745;
          font-weight: bold;
          font-size: 14px;
        }

        .match-separator {
          height: 1px;
          background: #e1e5e9;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vs-line {
          width: 100%;
          height: 1px;
          background: #e1e5e9;
        }

        .completed-indicator {
          position: absolute;
          background: #28a745;
          color: white;
          font-size: 10px;
          padding: 2px 4px;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .connection-line {
          position: absolute;
          right: -40px;
          top: 50%;
          transform: translateY(-50%);
          width: 40px;
          height: 2px;
        }

        .horizontal-line {
          width: 100%;
          height: 2px;
          background: #F28C38;
        }

        .vertical-connector {
          position: absolute;
          right: 0;
          top: 50%;
          width: 2px;
          height: 40px;
          background: #F28C38;
          transform: translateY(-50%);
        }

        .match-metadata {
          text-align: center;
          margin-top: 8px;
        }

        .match-status {
          font-size: 10px;
          color: #666;
          text-transform: capitalize;
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .bracket-tree-empty {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
        }

        /* Print optimizations */
        @media print {
          .bracket-tree-container {
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important;
            gap: 30px !important;
            padding: 10px !important;
          }

          .round-header {
            margin-bottom: 16px !important;
          }

          .team-slot {
            padding: 8px 12px !important;
            min-height: 36px !important;
          }

          .team-name {
            font-size: 11px !important;
          }

          .connection-line {
            right: -30px !important;
            width: 30px !important;
          }

          .match-metadata {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BracketTree;