'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getMatchDetails, updateStandaloneMatchResult, startMatch } from '@/lib/actions/tournament/matchManagement';
import { 
  ArrowLeft,
  Trophy,
  Users,
  Clock,
  Play,
  CheckCircle,
  Loader2,
  Target,
  Hash
} from 'lucide-react';
import { AlertModal } from '@/components/ui/Modal';
import { useAlert } from '@/hooks/useAlert';

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { venueId, matchId, lang } = params as { venueId: string; matchId: string; lang: string };
  
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const { alertState, showError, hideAlert } = useAlert();
  const [scoreInput, setScoreInput] = useState({
    team1Score: '',
    team2Score: '',
    details: ''
  });

  useEffect(() => {
    if (matchId) {
      loadMatch();
    }
  }, [matchId]);

  const loadMatch = async () => {
    setLoading(true);
    setError('');
    
    const result = await getMatchDetails(matchId);
    
    if (result.success) {
      setMatch(result.match);
    } else {
      setError(result.error || 'Failed to load match');
    }
    
    setLoading(false);
  };

  const handleStartMatch = async () => {
    if (!user) return;
    
    setStarting(true);
    const result = await startMatch(matchId, user.uid);
    
    if (result.success) {
      await loadMatch(); // Reload to get updated status
    } else {
      showError('Error starting match: ' + result.error);
    }
    
    setStarting(false);
  };

  const handleMatchResult = async (winnerId: string, winnerName: string) => {
    if (!user) return;
    
    setUpdating(true);
    
    // Prepare score data if provided
    const score = (scoreInput.team1Score && scoreInput.team2Score) ? {
      team1Score: parseInt(scoreInput.team1Score) || 0,
      team2Score: parseInt(scoreInput.team2Score) || 0,
      details: scoreInput.details || undefined
    } : undefined;
    
    const result = await updateStandaloneMatchResult(
      matchId,
      {
        winnerId,
        winnerName,
        score,
        resultEnteredBy: user.uid
      },
      user.uid
    );
    
    if (result.success) {
      await loadMatch(); // Reload to show result
      // Navigate back to matches page after a short delay
      setTimeout(() => {
        router.push(`/${lang}/volunteer/venues/${venueId}/matches${match?.fixtureId ? `?fixture=${match.fixtureId}` : ''}`);
      }, 2000);
    } else {
      showError('Error updating match result: ' + result.error);
    }
    
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading match details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 mb-4">
            <CheckCircle className="w-12 h-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Error Loading Match</h3>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => router.back()}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
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
      case 'scheduled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'ready': return <Clock className="w-4 h-4" />;
      case 'scheduled': return <Target className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button 
            onClick={() => router.back()}
            className="text-[#F28C38] hover:text-[#E67A26] flex items-center mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Matches
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Match #{match.matchNumber}</h1>
        <p className="text-gray-600 text-sm">{match.roundName} - {match.fixtureName}</p>
      </div>

      {/* Match Info Card */}
      <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Trophy className="w-6 h-6 text-[#F28C38] mr-3" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{match.fixtureName}</h2>
              <p className="text-gray-600 text-sm">{match.roundName} • {match.venueName}</p>
            </div>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(match.status)}`}>
            {getStatusIcon(match.status)}
            <span className="ml-1 capitalize">{match.status.replace('_', ' ')}</span>
          </span>
        </div>
      </div>

      {/* Teams Display */}
      <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Teams</h3>
        
        {/* Team 1 */}
        <div className="mb-4 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
              <div>
                {match.team1 ? (
                  <>
                    <h4 className="font-medium text-gray-900">{match.team1.teamName}</h4>
                    {match.team1.tournamentNumber && (
                      <p className="text-sm text-gray-500">Seed #{match.team1.tournamentNumber}</p>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400 italic">To be determined</span>
                )}
              </div>
            </div>
            {match.result && match.result.winnerId === match.team1?.teamId && (
              <div className="flex items-center text-green-600">
                <Trophy className="w-5 h-5 mr-1" />
                <span className="font-medium">Winner</span>
              </div>
            )}
          </div>
        </div>

        {/* VS Divider */}
        <div className="text-center py-2">
          <span className="text-gray-400 font-medium">VS</span>
        </div>

        {/* Team 2 */}
        <div className="mb-4 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="w-3 h-3 bg-red-500 rounded-full mr-3"></span>
              <div>
                {match.team2 ? (
                  <>
                    <h4 className="font-medium text-gray-900">{match.team2.teamName}</h4>
                    {match.team2.tournamentNumber && (
                      <p className="text-sm text-gray-500">Seed #{match.team2.tournamentNumber}</p>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400 italic">To be determined</span>
                )}
              </div>
            </div>
            {match.result && match.result.winnerId === match.team2?.teamId && (
              <div className="flex items-center text-green-600">
                <Trophy className="w-5 h-5 mr-1" />
                <span className="font-medium">Winner</span>
              </div>
            )}
          </div>
        </div>

        {/* Score Display */}
        {match.result?.score && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Final Score</h4>
            <div className="text-green-700">
              <span className="font-bold">{match.result.score.team1Score} - {match.result.score.team2Score}</span>
              {match.result.score.details && (
                <p className="text-sm mt-1">{match.result.score.details}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {match.status === 'ready' && (
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Start Match</h3>
          <p className="text-gray-600 mb-4">Both teams are ready. Click the button below to start the match.</p>
          <button
            onClick={handleStartMatch}
            disabled={starting}
            className="flex items-center px-6 py-3 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {starting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting Match...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Match
              </>
            )}
          </button>
        </div>
      )}

      {match.status === 'in_progress' && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Record Match Result</h3>
          
          {/* Optional Score Input */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Score (Optional)</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {match.team1?.teamName} Score
                </label>
                <input
                  type="number"
                  min="0"
                  value={scoreInput.team1Score}
                  onChange={(e) => setScoreInput(prev => ({ ...prev, team1Score: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#F28C38] focus:border-[#F28C38]"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {match.team2?.teamName} Score
                </label>
                <input
                  type="number"
                  min="0"
                  value={scoreInput.team2Score}
                  onChange={(e) => setScoreInput(prev => ({ ...prev, team2Score: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#F28C38] focus:border-[#F28C38]"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Additional Details (Optional)
              </label>
              <input
                type="text"
                value={scoreInput.details}
                onChange={(e) => setScoreInput(prev => ({ ...prev, details: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#F28C38] focus:border-[#F28C38]"
                placeholder="e.g., Set scores, penalties, etc."
              />
            </div>
          </div>

          {/* Winner Selection */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Select Winner</h4>
            <div className="space-y-3">
              {match.team1 && (
                <button
                  onClick={() => handleMatchResult(match.team1.teamId, match.team1.teamName)}
                  disabled={updating}
                  className="w-full flex items-center justify-center p-4 border-2 border-green-500 text-green-700 bg-green-50 rounded-lg font-medium hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  {match.team1.teamName} Wins
                </button>
              )}
              
              {match.team2 && (
                <button
                  onClick={() => handleMatchResult(match.team2.teamId, match.team2.teamName)}
                  disabled={updating}
                  className="w-full flex items-center justify-center p-4 border-2 border-green-500 text-green-700 bg-green-50 rounded-lg font-medium hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  {match.team2.teamName} Wins
                </button>
              )}
            </div>
          </div>

          {updating && (
            <div className="text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#F28C38] mx-auto mb-2" />
              <p className="text-gray-600">Recording match result...</p>
            </div>
          )}
        </div>
      )}

      {match.status === 'completed' && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Match Completed!</h3>
            <p className="text-gray-600 mb-4">
              Winner: <span className="font-semibold text-green-600">{match.result?.winnerName}</span>
            </p>
            
            {match.result?.score && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4 max-w-sm mx-auto">
                <p className="text-sm text-gray-600">Final Score</p>
                <p className="font-bold text-gray-900">
                  {match.result.score.team1Score} - {match.result.score.team2Score}
                </p>
                {match.result.score.details && (
                  <p className="text-sm text-gray-600 mt-1">{match.result.score.details}</p>
                )}
              </div>
            )}
            
            <button
              onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/matches${match.fixtureId ? `?fixture=${match.fixtureId}` : ''}`)}
              className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
            >
              Back to Matches
            </button>
          </div>
        </div>
      )}

      {(match.status === 'scheduled') && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Match Not Ready</h3>
            <p className="text-gray-600">
              This match is waiting for teams to be determined from previous round results.
            </p>
          </div>
        </div>
      )}
      
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={hideAlert}
        message={alertState.message}
        type={alertState.type}
        title={alertState.title}
      />
    </div>
  );
}
