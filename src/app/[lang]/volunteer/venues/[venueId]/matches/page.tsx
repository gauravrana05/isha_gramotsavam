'use client'

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAvailableMatches, updateMatchResult } from '@/lib/actions/tournament/matchManagement';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface PageProps {
  params: {
    venueId: string;
    lang: string;
  };
}

interface Match {
  matchId: string;
  team1Id?: string;
  team2Id?: string;
  winnerId?: string;
  roundName: string;
  status: 'scheduled' | 'in_progress' | 'completed';
}

interface Team {
  id: string;
  name: string;
}

export default function MatchesPage({ params }: PageProps) {
  const { venueId } = params;
  const searchParams = useSearchParams();
  const fixtureId = searchParams.get('fixture');
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (fixtureId) {
      loadMatches();
    }
  }, [fixtureId]);

  const loadMatches = async () => {
    if (!fixtureId) return;
    
    setLoading(true);
    const result = await getAvailableMatches(fixtureId);
    
    if (result.success) {
      setMatches(result.matches);
      setTeams(result.teams);
    }
    setLoading(false);
  };

  const handleMatchResult = async (matchId: string, winnerId: string) => {
    if (!fixtureId) return;
    
    setSubmitting(true);
    
    const match = matches.find(m => m.matchId === matchId);
    const loserId = match?.team1Id === winnerId ? match?.team2Id : match?.team1Id;
    
    const result = await updateMatchResult(
      fixtureId,
      matchId,
      {
        winnerId,
        loserId: loserId!,
        scores: {
          team1Score: 0,
          team2Score: 0
        }
      },
      venueId
    );
    
    if (result.success) {
      await loadMatches();
      setSelectedMatch(null);
      
      if (result.tournamentComplete) {
        alert('🏆 Tournament completed! Winners will advance to the next level.');
      }
    } else {
      alert('Error updating match result: ' + result.error);
    }
    
    setSubmitting(false);
  };

  if (!fixtureId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-6 text-center">
          <div className="text-gray-500">
            <div className="text-2xl mb-2">⚽</div>
            <div>No fixture selected</div>
            <Link href={`/volunteer/venues/${venueId}/fixtures`} className="text-blue-600 text-sm">
              Go to fixtures
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div>Loading matches...</div>
        </div>
      </div>
    );
  }

  const availableMatches = matches.filter(m => m.team1Id && m.team2Id && m.status === 'scheduled');
  const completedMatches = matches.filter(m => m.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <Link href={`/volunteer/venues/${venueId}/fixtures`} className="text-blue-600">
            ← Back
          </Link>
          <h1 className="font-semibold">Live Matches</h1>
          <button onClick={loadMatches} className="text-blue-600">
            🔄
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Available Matches */}
        {availableMatches.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold mb-3">Ready to Play ({availableMatches.length})</h2>
            <div className="space-y-3">
              {availableMatches.map(match => (
                <Card key={match.matchId} className="p-4">
                  <div className="text-center mb-3">
                    <div className="text-sm font-medium text-blue-600 mb-2">
                      {match.roundName}
                    </div>
                    <div className="text-lg font-semibold">
                      {teams[match.team1Id!]?.name || 'Team 1'}
                      <div className="text-sm text-gray-400 my-1">vs</div>
                      {teams[match.team2Id!]?.name || 'Team 2'}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => setSelectedMatch(match)}
                    className="w-full"
                  >
                    Enter Result
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Matches */}
        {completedMatches.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold mb-3">Completed ({completedMatches.length})</h2>
            <div className="space-y-3">
              {completedMatches.map(match => (
                <Card key={match.matchId} className="p-4 bg-green-50">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600 mb-2">
                      {match.roundName}
                    </div>
                    <div className="text-sm space-y-1">
                      <div className={match.winnerId === match.team1Id ? 'font-bold text-green-700' : 'text-gray-500'}>
                        {teams[match.team1Id!]?.name || 'Team 1'}
                        {match.winnerId === match.team1Id && ' 🏆'}
                      </div>
                      <div className={match.winnerId === match.team2Id ? 'font-bold text-green-700' : 'text-gray-500'}>
                        {teams[match.team2Id!]?.name || 'Team 2'}
                        {match.winnerId === match.team2Id && ' 🏆'}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {matches.length === 0 && (
          <Card className="p-6 text-center">
            <div className="text-gray-500">
              <div className="text-2xl mb-2">⚽</div>
              <div>No matches available</div>
            </div>
          </Card>
        )}
      </div>

      {/* Match Result Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6 rounded-t-xl">
            <h3 className="font-semibold text-center mb-4">
              {selectedMatch.roundName}
            </h3>
            
            <div className="text-center mb-6">
              <div className="text-sm text-gray-600">Select Winner:</div>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleMatchResult(selectedMatch.matchId, selectedMatch.team1Id!)}
                disabled={submitting}
                className="w-full p-4 border-2 border-green-500 text-green-700 bg-green-50 rounded-lg font-medium"
              >
                🏆 {teams[selectedMatch.team1Id!]?.name}
              </button>
              
              <button
                onClick={() => handleMatchResult(selectedMatch.matchId, selectedMatch.team2Id!)}
                disabled={submitting}
                className="w-full p-4 border-2 border-green-500 text-green-700 bg-green-50 rounded-lg font-medium"
              >
                🏆 {teams[selectedMatch.team2Id!]?.name}
              </button>
            </div>

            <button
              onClick={() => setSelectedMatch(null)}
              disabled={submitting}
              className="w-full py-3 border border-gray-300 rounded-lg"
            >
              Cancel
            </button>

            {submitting && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-xl">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <div className="text-sm">Updating result...</div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
