'use client';

import { api } from '@/server/trpc/react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { 
  ArrowLeft,
  Trophy,
  Users,
  Clock,
  Play,
  CheckCircle,
  AlertCircle,
  Target,
  Calendar,
  Hash,
  Crown
} from 'lucide-react';

export default function FixtureDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams();
  
  const venueId = params?.venueId as string;
  const fixtureId = params?.fixtureId as string;
  // Get fixture details using tRPC
  const { data: fixture, isLoading: fixtureLoading, error: fixtureError } = api.volunteers.getFixtureDetails.useQuery(
    { fixtureId },
    {
      enabled: !authLoading && !!user && !!fixtureId,
    }
  );
  // Get all team IDs from bracket matches and assigned teams using useMemo for optimization
  const uniqueTeamIds = useMemo(() => {
    if (!fixture) return [];
    
    const allTeamIds = [
      ...(fixture.assignedTeams?.map(team => team.id) || []),
      ...(fixture.bracket?.matches?.flatMap((match: any) => [match?.team1Id, match?.team2Id, match?.winnerId]) || [])
    ].filter(Boolean);

    return Array.from(new Set(allTeamIds));
  }, [fixture]);

  // Get team details using tRPC
  const { data: teams = {}, isLoading: teamsLoading } = api.volunteers.getTeamsByIds.useQuery(
    { teamIds: uniqueTeamIds },
    {
      enabled: !authLoading && !!user && uniqueTeamIds.length > 0,
    }
  );

  // Loading state
  if (authLoading || fixtureLoading || teamsLoading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (fixtureError) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12 bg-white rounded-lg border border-red-200">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Fixture Not Found</h3>
          <p className="text-gray-600">{fixtureError.message}</p>
          <Link href={`/en/volunteer/venues/${venueId}/fixtures`}>
            <button className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors">
              Back to Fixtures
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // No fixture data
  if (!fixture) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Fixture Found</h3>
          <p className="text-gray-600">Unable to load fixture details.</p>
          <Link href={`/en/volunteer/venues/${venueId}/fixtures`}>
            <button className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors">
              Back to Fixtures
            </button>
          </Link>
        </div>
      </div>
    );
  }
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'teams_assigned':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'teams_assigned': return <Users className="w-4 h-4" />;
      case 'draft': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Group matches by round for bracket visualization
  const matchesByRound = useMemo(() => {
    if (!fixture?.bracket?.matches) return {};
    
    return fixture.bracket.matches.reduce((acc: any, match: any) => {
      const round = match.roundName;
      if (!acc[round]) {
        acc[round] = [];
      }
      acc[round].push(match);
      return acc;
    }, {});
  }, [fixture?.bracket?.matches]);

  // Sort rounds in tournament order
  const roundOrder = ['Round of 64', 'Round of 32', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final'];
  const sortedRounds = Object.keys(matchesByRound).sort((a, b) => {
    const aIndex = roundOrder.indexOf(a);
    const bIndex = roundOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return bIndex - aIndex; // Reverse order to show first round first
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Link 
            href={`/en/volunteer/venues/${venueId}/fixtures`} 
            className="text-[#F28C38] hover:text-[#E67A26] flex items-center mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Fixtures
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{fixture.name}</h1>
        <p className="text-gray-600 text-sm">Tournament Bracket & Match Progress</p>
      </div>

      {/* Tournament Info */}
      <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center mb-4 lg:mb-0">
            <Trophy className="w-6 h-6 text-[#F28C38] mr-3" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{fixture.name}</h2>
              <p className="text-gray-600 text-sm">
                {fixture.assignedTeams?.length || 0} teams • {fixture.level} level
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(fixture.status)}`}>
              {getStatusIcon(fixture.status)}
              <span className="ml-1 capitalize">{fixture.status.replace('_', ' ')}</span>
            </span>
            <Link href={`/en/volunteer/venues/${venueId}/matches?fixture=${fixtureId}`}>
              <button className="flex items-center px-4 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors">
                <Play className="w-4 h-4 mr-2" />
                View Matches
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Teams</p>
              <p className="text-2xl font-bold text-gray-900">{fixture.assignedTeams?.length || 0}</p>
            </div>
            <Users className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Matches</p>
              <p className="text-2xl font-bold text-blue-600">{fixture.bracket?.matches?.length || 0}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {fixture.bracket?.matches?.filter((m: any) => m.status === 'completed').length || 0}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Rounds</p>
              <p className="text-2xl font-bold text-purple-600">{sortedRounds.length}</p>
            </div>
            <Target className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Tournament Bracket */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Tournament Bracket</h3>
        
        {/* Tournament Progression */}
        <div className="space-y-8">
          {sortedRounds.map((roundName, roundIndex) => (
            <div key={roundName} className="relative">
              {/* Round Header */}
              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                    roundName === 'Final' ? 'bg-yellow-100 text-yellow-800' :
                    roundName === 'Semi Final' ? 'bg-purple-100 text-purple-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {roundIndex + 1}
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">{roundName}</h4>
                  <span className="ml-3 text-sm text-gray-500">
                    {matchesByRound[roundName].length} match{matchesByRound[roundName].length !== 1 ? 'es' : ''}
                  </span>
                </div>
                {roundName === 'Final' && (
                  <Crown className="w-6 h-6 text-yellow-500 ml-auto" />
                )}
              </div>

              {/* Matches in this round */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchesByRound[roundName].map((match: any, matchIndex: number) => (
                  <div key={match.matchId} className={`border-2 rounded-lg p-4 transition-all ${getMatchStatusColor(match.status)}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Hash className="w-4 h-4 text-gray-500 mr-1" />
                        <span className="text-sm font-medium text-gray-700">
                          Match {matchIndex + 1}
                        </span>
                      </div>
                      <div className="flex items-center text-xs">
                        {match.status === 'completed' && <CheckCircle className="w-3 h-3 text-green-600 mr-1" />}
                        {match.status === 'in_progress' && <Play className="w-3 h-3 text-blue-600 mr-1" />}
                        {match.status === 'scheduled' && <Clock className="w-3 h-3 text-gray-500 mr-1" />}
                        <span className="capitalize">{match.status}</span>
                      </div>
                    </div>

                    {/* Team 1 */}
                    <div className={`p-2 rounded border mb-2 ${
                      match.winnerId === match.team1Id ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          {match.team1Id && teams[match.team1Id] ? (
                            <div>
                              <span className="font-medium text-sm">{teams[match.team1Id].name}</span>
                              {teams[match.team1Id].tournamentNumber && (
                                <span className="ml-1 text-xs text-gray-500">#{teams[match.team1Id].tournamentNumber}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-sm">TBD</span>
                          )}
                        </div>
                        {match.winnerId === match.team1Id && (
                          <Trophy className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    </div>

                    {/* VS */}
                    <div className="text-center text-xs text-gray-400 mb-2">VS</div>

                    {/* Team 2 */}
                    <div className={`p-2 rounded border ${
                      match.winnerId === match.team2Id ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                          {match.team2Id && teams[match.team2Id] ? (
                            <div>
                              <span className="font-medium text-sm">{teams[match.team2Id].name}</span>
                              {teams[match.team2Id].tournamentNumber && (
                                <span className="ml-1 text-xs text-gray-500">#{teams[match.team2Id].tournamentNumber}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-sm">TBD</span>
                          )}
                        </div>
                        {match.winnerId === match.team2Id && (
                          <Trophy className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    </div>

                    {/* Winner advances indicator */}
                    {match.winnerId && roundName !== 'Final' && (
                      <div className="mt-2 text-center">
                        <div className="inline-flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          <ArrowLeft className="w-3 h-3 mr-1 rotate-90" />
                          <span>Advances to {getNextRoundName(roundName)}</span>
                        </div>
                      </div>
                    )}

                    {/* Final winner */}
                    {match.winnerId && roundName === 'Final' && (
                      <div className="mt-2 text-center">
                        <div className="inline-flex items-center text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                          <Crown className="w-3 h-3 mr-1" />
                          <span>Tournament Champion!</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Connection lines to next round (visual indicator) */}
              {roundIndex < sortedRounds.length - 1 && (
                <div className="flex justify-center mt-6 mb-2">
                  <div className="flex items-center text-gray-400">
                    <div className="w-8 h-px bg-gray-300"></div>
                    <ArrowLeft className="w-4 h-4 mx-2 rotate-90" />
                    <div className="w-8 h-px bg-gray-300"></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tournament Winner */}
        {fixture.status === 'completed' && fixture.bracket?.winners && fixture.bracket.winners.length > 0 && (
          <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg">
            <div className="text-center">
              <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Tournament Complete!</h3>
              <div className="space-y-2">
                {fixture.bracket.winners.map((winnerId: string, index: number) => (
                  <div key={winnerId} className="flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
                    <span className="font-semibold text-lg">
                      {index === 0 ? '🥇 Champion: ' : '🥈 Runner-up: '}
                      {teams[winnerId]?.name || 'Unknown Team'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getNextRoundName(currentRound: string): string {
  const rounds = ['Round of 64', 'Round of 32', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final'];
  const currentIndex = rounds.indexOf(currentRound);
  return currentIndex < rounds.length - 1 ? rounds[currentIndex + 1] : 'Next Level';
}