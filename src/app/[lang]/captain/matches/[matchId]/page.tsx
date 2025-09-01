'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { ArrowLeft, Trophy, Clock, MapPin, Users, Loader2, AlertCircle } from 'lucide-react';

export default function CaptainMatchDetailPage() {
  const { matchId, lang } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const { data: match, isLoading, error } = api.volunteers.match.getMatchDetails.useQuery(
    { matchId: matchId as string },
    { enabled: !!matchId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Match not found</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F0E5] font-fira">
      {/* Header */}
      <div className="bg-[#4A2F1D] text-white py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.push(`/${lang}/captain/matches`)}
            className="flex items-center space-x-2 text-cream-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Matches</span>
          </button>
          
          <h1 className="text-3xl font-bold mb-2">Match Details</h1>
          <p className="text-cream-200">{match.fixture?.name}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Match Info Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Trophy className="w-6 h-6 text-[#F28C38]" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">{match.fixture?.sport?.name}</h2>
                <p className="text-gray-600">{match.roundName}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(match.status)}`}>
              {match.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {match.scheduledTime ? new Date(match.scheduledTime).toLocaleString() : 'Not scheduled'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {match.fixture?.venueLevelMapping?.venue?.name || 'Venue TBD'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {match.fixture?.genderCategory}
              </span>
            </div>
          </div>

          {/* Teams */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                {match.team1?.name || 'TBD'}
              </h3>
              {match.team1?.tournamentNumber && (
                <p className="text-sm text-gray-500 mb-2">#{match.team1.tournamentNumber}</p>
              )}
              {match.status === 'completed' && (
                <div className="text-3xl font-bold text-[#F28C38]">
                  {match.team1Score || 0}
                </div>
              )}
            </div>

            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                {match.team2?.name || 'TBD'}
              </h3>
              {match.team2?.tournamentNumber && (
                <p className="text-sm text-gray-500 mb-2">#{match.team2.tournamentNumber}</p>
              )}
              {match.status === 'completed' && (
                <div className="text-3xl font-bold text-[#F28C38]">
                  {match.team2Score || 0}
                </div>
              )}
            </div>
          </div>

          {/* Winner */}
          {match.winner && (
            <div className="mt-6 text-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <Trophy className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 font-medium">
                Winner: {match.winner.name}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
