'use client';

import React, { useState, useMemo } from 'react';
import { api } from '@/server/trpc/react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
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
  Crown,
  Timer,
  MapPin,
  Edit,
  RefreshCw,
  Loader2,
  Medal,
  Flag
} from 'lucide-react';
import PostFeed from '@/components/posts/PostFeed';

interface MatchData {
  id: string;
  roundName: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  team1Id?: string;
  team2Id?: string;
  team1Score?: number;
  team2Score?: number;
  winnerId?: string;
  scheduledTime?: Date;
  actualStartTime?: Date;
  completedTime?: Date;
  venue?: string;
}

export default function VolunteerFixtureDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();
  const params = useParams();
  const router = useRouter();
  
  const venueId = params?.venueId as string;
  const fixtureId = params?.fixtureId as string;
  const lang = params?.lang as string;

  // State management
  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);

  // Get fixture details
  const { 
    data: fixture, 
    isLoading: fixtureLoading, 
    error: fixtureError,
    refetch: refetchFixture
  } = api.volunteers.venue.getFixtureDetails.useQuery(
    { fixtureId },
    { enabled: !!user && !!fixtureId }
  );

  // Get team details
  const uniqueTeamIds = useMemo(() => {
    if (!fixture) return [];
    
    const allTeamIds = [
      ...(fixture.fixtureTeams?.map((team: any) => team.team.id) || []),
      ...(fixture.bracket?.matches?.flatMap((match: any) => [match?.team1Id, match?.team2Id, match?.winnerId]) || [])
    ].filter(Boolean);

    return Array.from(new Set(allTeamIds));
  }, [fixture]);

  const { data: teams = {}, isLoading: teamsLoading } = api.volunteers.verification.getTeamsByIds.useQuery(
    { teamIds: uniqueTeamIds },
    { enabled: uniqueTeamIds.length > 0 }
  );

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'live': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'live': return <Play className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return <Timer className="w-4 h-4" />;
    }
  };

  const getTeamName = (teamId: string) => {
    return teams[teamId]?.name || `Team ${teamId.slice(-4)}`;
  };

  const formatMatchTime = (scheduledTime?: Date, actualStartTime?: Date) => {
    const time = actualStartTime || scheduledTime;
    if (!time) return 'TBD';
    
    return new Date(time).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Match table columns
  const matchColumns: Column<MatchData>[] = useMemo(() => [
    {
      key: 'round',
      header: 'Round',
      className: 'w-24',
      render: (_value, match) => {
        if (!match) return null;
        return (
          <div className="text-sm font-medium text-gray-900">
            {match.roundName || 'Round'}
          </div>
        );
      }
    },
    {
      key: 'teams',
      header: 'Match',
      className: 'min-w-0 flex-1',
      render: (_value, match) => {
        if (!match) return null;
        
        const team1Name = match.team1Id ? getTeamName(match.team1Id) : 'TBD';
        const team2Name = match.team2Id ? getTeamName(match.team2Id) : 'TBD';
        const isCompleted = match.status === 'completed';
        const winner = match.winnerId;
        
        return (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className={`text-sm truncate ${winner === match.team1Id ? 'font-bold text-green-700' : 'text-gray-900'}`}>
                {team1Name}
                {winner === match.team1Id && <Crown className="w-3 h-3 inline ml-1 text-yellow-500" />}
              </div>
              <span className="text-gray-400 text-sm">vs</span>
              <div className={`text-sm truncate ${winner === match.team2Id ? 'font-bold text-green-700' : 'text-gray-900'}`}>
                {team2Name}
                {winner === match.team2Id && <Crown className="w-3 h-3 inline ml-1 text-yellow-500" />}
              </div>
            </div>
            
            {isCompleted && (match.team1Score !== null || match.team2Score !== null) && (
              <div className="text-sm font-medium text-gray-900 ml-4">
                {match.team1Score || 0} - {match.team2Score || 0}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-28',
      render: (_value, match) => {
        if (!match) return null;
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
            {getStatusIcon(match.status)}
            <span className="ml-1 capitalize">{match.status}</span>
          </span>
        );
      }
    },
    {
      key: 'time',
      header: 'Time',
      className: 'w-32 hidden sm:table-cell',
      headerClassName: 'hidden sm:table-cell',
      render: (_value, match) => {
        if (!match) return null;
        return (
          <div className="text-sm text-gray-600">
            {formatMatchTime(match.scheduledTime, match.actualStartTime)}
          </div>
        );
      }
    }
  ], [teams]);

  // Loading states
  if (authLoading || fixtureLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading fixture details...</p>
        </div>
      </div>
    );
  }

  if (fixtureError || !fixture) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">
            {fixtureError?.message || 'Fixture not found'}
          </p>
          <div className="mt-4 space-x-4">
            <button 
              onClick={() => refetchFixture()}
              className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
            >
              Retry
            </button>
            <Link
              href={`/${lang}/volunteer/venues/${venueId}/fixtures`}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors inline-block"
            >
              Back to Fixtures
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const matches = fixture.bracket?.matches || [];
  const completedMatches = matches.filter((m: any) => m.status === 'completed').length;
  const totalMatches = matches.length;
  const progressPercentage = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

  return (
    <div className="w-full py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            href={`/${lang}/volunteer/venues/${venueId}/fixtures`}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Fixtures
          </Link>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchFixture()}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <Trophy className="w-8 h-8 text-[#F28C38] mr-4 flex-shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {fixture.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <Target className="w-4 h-4 mr-1" />
                  {fixture.sport?.name}
                </span>
                <span className="flex items-center">
                  <Hash className="w-4 h-4 mr-1" />
                  {fixture.level}
                </span>
                <span className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {fixture.assignedTeams?.length || 0} teams
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(fixture.status)}`}>
              {getStatusIcon(fixture.status)}
              <span className="ml-2 capitalize">{fixture.status.replace('_', ' ')}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Matches</p>
              <p className="text-2xl font-bold text-gray-900">{totalMatches}</p>
            </div>
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-2xl font-bold text-green-600">{completedMatches}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">
                {matches.filter((m: any) => m.status === 'live').length}
              </p>
            </div>
            <Play className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Progress</p>
              <p className="text-2xl font-bold text-purple-600">{Math.round(progressPercentage)}%</p>
            </div>
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-purple-400 relative">
                <div 
                  className="absolute inset-0 rounded-full bg-purple-400"
                  style={{ 
                    clipPath: `polygon(50% 50%, 50% 0%, ${progressPercentage > 50 ? '100%' : '50%'} 0%, ${progressPercentage > 50 ? '100%' : '50%'} ${progressPercentage > 50 ? `${(progressPercentage - 50) * 2}%` : '0%'}, 50% 50%)`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Matches Table */}
      <div className="bg-white rounded-lg border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Medal className="w-5 h-5 mr-2 text-[#F28C38]" />
            Tournament Bracket
          </h2>
        </div>
        
        <AdvancedTable
          data={matches}
          columns={matchColumns}
          loading={teamsLoading}
          
          // Row interaction
          onRowClick={(match) => {
            setSelectedMatch(match);
            setShowMatchModal(true);
          }}
          keyExtractor={(match) => match.id}
          
          // Table configuration
          stickyHeader={false}
          compact={true}
          
          // Disable built-in features
          searchable={false}
          filterable={false}
          pagination={{ enabled: false }}
        />
      </div>

      {/* Tournament Teams */}
      {fixture.assignedTeams && fixture.assignedTeams.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-[#F28C38]" />
              Participating Teams
            </h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fixture.assignedTeams.map((teamAssignment: any) => {
                const team = teamAssignment.team;
                const isWinner = matches.some((m: any) => m.winnerId === team.id && m.status === 'completed');
                
                return (
                  <div 
                    key={team.id} 
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isWinner 
                        ? 'border-yellow-300 bg-yellow-50' 
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 flex items-center">
                          {team.name}
                          {isWinner && <Crown className="w-4 h-4 ml-2 text-yellow-500" />}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {team.captainUser ? `${team.captainUser.firstName} ${team.captainUser.lastName}` : 'No captain'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {team._count?.players || 0} players
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          team.status === 'checked_in' ? 'bg-green-100 text-green-800' :
                          team.status === 'verified' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {team.status}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Posts Feed */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Tournament Updates
          </h2>
        </div>
        
        <PostFeed 
          entityType="fixture" 
          entityId={fixtureId}
          showCreatePost={true}
        />
      </div>

      {/* Match Detail Modal */}
      {showMatchModal && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Match Details</h3>
              <button 
                onClick={() => setShowMatchModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedMatch.team1Id ? getTeamName(selectedMatch.team1Id) : 'TBD'} 
                  <span className="mx-4 text-gray-400">vs</span>
                  {selectedMatch.team2Id ? getTeamName(selectedMatch.team2Id) : 'TBD'}
                </div>
                
                {selectedMatch.status === 'completed' && (selectedMatch.team1Score !== null || selectedMatch.team2Score !== null) && (
                  <div className="text-3xl font-bold text-[#F28C38] mb-2">
                    {selectedMatch.team1Score || 0} - {selectedMatch.team2Score || 0}
                  </div>
                )}
                
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedMatch.status)}`}>
                  {getStatusIcon(selectedMatch.status)}
                  <span className="ml-2 capitalize">{selectedMatch.status}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Round:</span>
                  <div className="font-medium">{selectedMatch.roundName || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-500">Scheduled:</span>
                  <div className="font-medium">
                    {selectedMatch.scheduledTime ? 
                      new Date(selectedMatch.scheduledTime).toLocaleString() : 'TBD'}
                  </div>
                </div>
                {selectedMatch.actualStartTime && (
                  <div>
                    <span className="text-gray-500">Started:</span>
                    <div className="font-medium">
                      {new Date(selectedMatch.actualStartTime).toLocaleString()}
                    </div>
                  </div>
                )}
                {selectedMatch.completedTime && (
                  <div>
                    <span className="text-gray-500">Completed:</span>
                    <div className="font-medium">
                      {new Date(selectedMatch.completedTime).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/matches/${selectedMatch.id}`)}
                  className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
                >
                  View Match Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getNextRoundName(currentRound: string): string {
  const rounds = ['Round of 64', 'Round of 32', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final'];
  const currentIndex = rounds.indexOf(currentRound);
  return currentIndex < rounds.length - 1 ? rounds[currentIndex + 1] : 'Next Level';
}