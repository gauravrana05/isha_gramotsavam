'use client';

import React, { useState } from 'react';
import { api } from '@/server/trpc/react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Trophy,
  Users,
  Clock,
  Play,
  CheckCircle,
  AlertCircle,
  Calendar,
  Loader2,
  Medal
} from 'lucide-react';

interface MatchData {
  id: string;
  roundName: string;
  status: 'scheduled' | 'ready' | 'in_progress' | 'completed' | 'cancelled';
  team1Id?: string;
  team2Id?: string;
  team1Score?: number;
  team2Score?: number;
  winnerId?: string;
  scheduledTime?: Date;
  team1?: { name: string };
  team2?: { name: string };
}

export default function VolunteerFixtureDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();
  const params = useParams();
  const router = useRouter();
  
  const venueId = params?.venueId as string;
  const fixtureId = params?.fixtureId as string;
  const lang = params?.lang as string;

  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);

  // Get fixture details
  const { 
    data: fixture, 
    isLoading: fixtureLoading, 
    error: fixtureError,
    refetch: refetchFixture
  } = api.volunteers.fixture.getFixtureDetails.useQuery(
    { fixtureId },
    { enabled: !!user && !!fixtureId }
  );

  // Mutations
  const createKnockoutDraw = api.volunteers.fixture.createKnockoutDraw.useMutation({
    onSuccess: () => {
      addNotification('Tournament draw created successfully!', 'success');
      refetchFixture();
    },
    onError: (error) => {
      addNotification(error.message, 'error');
    }
  });

  const recordMatchResult = api.volunteers.match.recordMatchResult.useMutation({
    onSuccess: () => {
      addNotification('Match result recorded successfully!', 'success');
      refetchFixture();
      setShowResultModal(false);
    },
    onError: (error) => {
      addNotification(error.message, 'error');
    }
  });

  const updateMatchStatus = api.volunteers.match.updateMatchStatus.useMutation({
    onSuccess: () => {
      addNotification('Match status updated!', 'success');
      refetchFixture();
    },
    onError: (error) => {
      addNotification(error.message, 'error');
    }
  });

  // Helper functions
  const handleCreateDraw = async () => {
    if (!fixture || !venueId) return;
    
    try {
      await createKnockoutDraw.mutateAsync({
        fixtureId: fixture.id,
        venueLevelMappingId: fixture.venueLevelMappingId,
        sportId: fixture.sportId,
        genderCategory: fixture.genderCategory
      });
    } catch (error) {
      console.error('Error creating draw:', error);
    }
  };

  const handleSubmitResult = () => {
    if (!selectedMatch) return;
    
    const winnerId = team1Score > team2Score ? selectedMatch.team1Id : 
                    team2Score > team1Score ? selectedMatch.team2Id : null;

    if (!winnerId) {
      addNotification('Please enter a valid score with a winner', 'error');
      return;
    }

    recordMatchResult.mutate({
      matchId: selectedMatch.id,
      team1Score,
      team2Score,
      winnerId
    });
  };

  const handleStartMatch = (match: MatchData) => {
    updateMatchStatus.mutate({
      matchId: match.id,
      status: 'in_progress'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'ready': return <Clock className="w-4 h-4" />;
      case 'scheduled': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Loading state
  if (authLoading || fixtureLoading) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading fixture details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (fixtureError || !fixture) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Failed to load fixture details</p>
          <button
            onClick={() => refetchFixture()}
            className="px-4 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E07B2A] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const groupedMatches = fixture.matches?.reduce((acc: any, match: any) => {
    const round = match.roundName || 'Unknown Round';
    if (!acc[round]) {
      acc[round] = [];
    }
    acc[round].push(match);
    return acc;
  }, {}) || {};

  const sortedRounds = Object.keys(groupedMatches).sort((a, b) => {
    const roundOrder = ['Round of 64', 'Round of 32', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final'];
    return roundOrder.indexOf(a) - roundOrder.indexOf(b);
  });

  return (
    <div className="min-h-screen bg-[#F3F0E5] font-fira">
      {/* Header */}
      <div className="bg-[#4A2F1D] text-white py-6">
        <div className="max-w-7xl mx-auto px-4">
          <button
            onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/fixtures`)}
            className="flex items-center space-x-2 text-cream-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Fixtures</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{fixture.name}</h1>
              <div className="flex items-center space-x-4 text-cream-200">
                <span className="flex items-center">
                  <Trophy className="w-4 h-4 mr-1" />
                  {fixture.sport?.name}
                </span>
                <span className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {fixture.genderCategory}
                </span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {fixture.level}
                </span>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                fixture.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                fixture.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                fixture.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                'bg-red-100 text-red-800'
              }`}>
                {fixture.status}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tournament Actions */}
        {fixture.status === 'draft' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tournament Setup</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">1. Assign Team Numbers</h3>
                  <p className="text-gray-600 text-sm">Assign tournament numbers to teams before creating the draw</p>
                </div>
                <button
                  onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/${fixtureId}/assign-teams`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Assign Numbers
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">2. Create Tournament Draw</h3>
                  <p className="text-gray-600 text-sm">Generate matches based on team rankings and numbers</p>
                </div>
                <button
                  onClick={handleCreateDraw}
                  disabled={createKnockoutDraw.isPending}
                  className="px-6 py-3 bg-[#F28C38] text-white rounded-lg hover:bg-[#E07B2A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {createKnockoutDraw.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4" />
                      <span>Create Draw</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tournament Bracket */}
        {fixture.matches && fixture.matches.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Tournament Bracket</h2>
              <button
                onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/${fixtureId}/schedule`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Clock className="w-4 h-4" />
                <span>Schedule Matches</span>
              </button>
            </div>
            
            <div className="space-y-8">
              {sortedRounds.map((round) => (
                <div key={round} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">{round}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedMatches[round].map((match: MatchData) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onEnterResult={(match) => {
                          setSelectedMatch(match);
                          setTeam1Score(match.team1Score || 0);
                          setTeam2Score(match.team2Score || 0);
                          setShowResultModal(true);
                        }}
                        onStartMatch={handleStartMatch}
                        isUpdating={updateMatchStatus.isPending || recordMatchResult.isPending}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No matches yet */}
        {(!fixture.matches || fixture.matches.length === 0) && fixture.status !== 'draft' && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Matches Yet</h3>
            <p className="text-gray-500">
              Tournament matches will appear here once the draw is created.
            </p>
          </div>
        )}
      </div>

      {/* Result Modal */}
      {showResultModal && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Enter Match Result
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedMatch.team1?.name} Score
                </label>
                <input
                  type="number"
                  min="0"
                  value={team1Score}
                  onChange={(e) => setTeam1Score(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedMatch.team2?.name} Score
                </label>
                <input
                  type="number"
                  min="0"
                  value={team2Score}
                  onChange={(e) => setTeam2Score(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowResultModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitResult}
                disabled={recordMatchResult.isPending}
                className="flex-1 px-4 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E07B2A] disabled:opacity-50 transition-colors"
              >
                {recordMatchResult.isPending ? 'Saving...' : 'Save Result'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Match Card Component
interface MatchCardProps {
  match: MatchData;
  onEnterResult: (match: MatchData) => void;
  onStartMatch: (match: MatchData) => void;
  isUpdating: boolean;
}

const MatchCard = ({ match, onEnterResult, onStartMatch, isUpdating }: MatchCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '⚡';
      case 'ready': return '🟡';
      case 'scheduled': return '📅';
      default: return '❓';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">
          Match {match.id.slice(-4)}
        </span>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
          {getStatusIcon(match.status)}
          <span className="ml-1 capitalize">{match.status}</span>
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900">
            {match.team1?.name || 'TBD'}
          </span>
          {match.status === 'completed' && (
            <span className="font-bold text-lg">{match.team1Score}</span>
          )}
        </div>
        
        <div className="text-center text-gray-400 text-sm">vs</div>
        
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900">
            {match.team2?.name || 'TBD'}
          </span>
          {match.status === 'completed' && (
            <span className="font-bold text-lg">{match.team2Score}</span>
          )}
        </div>
      </div>

      {match.scheduledTime && (
        <div className="text-sm text-gray-500 mb-3">
          {new Date(match.scheduledTime).toLocaleString()}
        </div>
      )}

      <div className="space-y-2">
        {match.status === 'ready' && match.team1 && match.team2 && (
          <button
            onClick={() => onStartMatch(match)}
            disabled={isUpdating}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
          >
            Start Match
          </button>
        )}

        {match.status === 'in_progress' && (
          <button
            onClick={() => onEnterResult(match)}
            disabled={isUpdating}
            className="w-full px-3 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E07B2A] disabled:opacity-50 transition-colors text-sm"
          >
            Enter Result
          </button>
        )}

        {match.winnerId && (
          <div className="text-center">
            <span className="text-sm font-medium text-green-600 flex items-center justify-center">
              <Medal className="w-4 h-4 mr-1" />
              Winner: {match.winnerId === match.team1Id ? match.team1?.name : match.team2?.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
