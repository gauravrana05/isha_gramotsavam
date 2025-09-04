'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOfflineMatchDetails } from '@/hooks/useOfflineMatches';
import { useOfflineActions } from '@/hooks/useOfflineActions';
import { api } from '@/server/trpc/react';
import { useAlert } from '@/hooks/useAlert';
import { AlertModal } from '@/components/ui/Modal';
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  Play, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Timer,
  Crown,
  Target,
  Loader2,
  Plus,
  Minus,
  Save,
  ArrowRight,
  Medal
} from 'lucide-react';

interface LevelProgressionInfo {
  nextLevel?: 'division' | 'final';
  requiresConfirmation?: boolean;
  fixtureId?: string;
  qualifiedTeams?: Array<{
    id: string;
    name: string;
    position: string;
  }>;
}

export default function MatchScoringPage() {
  const router = useRouter();
  const params = useParams();
  const { venueId, matchId, lang } = params as { venueId: string; matchId: string; lang: string };
  const { user } = useAuth();
  const { alertState, showError, showSuccess, hideAlert } = useAlert();

  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [winnerId, setWinnerId] = useState<string>('');
  const [scoreDetails, setScoreDetails] = useState('');
  const [showProgressionDialog, setShowProgressionDialog] = useState(false);
  const [progressionInfo, setProgressionInfo] = useState<LevelProgressionInfo | null>(null);
  const [step, setStep] = useState<'scoring' | 'confirmation' | 'progression' | 'success'>('scoring');

  // Get match details from offline storage
  const { data: match, isLoading, error, refetch } = useOfflineMatchDetails(matchId);
  const { updateMatchScore, updateTeamStatus } = useOfflineActions();

  // Replace mutations with offline actions
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRecordingResult, setIsRecordingResult] = useState(false);

  const handleUpdateStatus = async (status: string) => {
    try {
      setIsUpdatingStatus(true);
      await updateTeamStatus(matchId, status);
      showSuccess('Match status updated');
    } catch (error: any) {
      showError(`Failed to update match status: ${error.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRecordResult = async (teamScores?: any[]) => {
    if (teamScores) {
      // Handle with team scores
      try {
        setIsRecordingResult(true);
        await updateMatchScore(matchId, teamScores);
        showSuccess('Match result recorded successfully');
      } catch (error: any) {
        showError(`Failed to record match result: ${error.message}`);
      } finally {
        setIsRecordingResult(false);
      }
    } else {
      // Handle winner selection
      if (!winnerId) {
        showError('Please select a winner');
        return;
      }
      setStep('confirmation');
    }
  };

  // Initialize scores from existing match data
  useEffect(() => {
    if (match && match.team1Score !== null && match.team2Score !== null) {
      setTeam1Score(match.team1Score);
      setTeam2Score(match.team2Score);
      if (match.winnerId) {
        setWinnerId(match.winnerId);
      }
    }
  }, [match]);

  // Auto-determine winner based on scores
  useEffect(() => {
    if (!match) return;
    
    if (team1Score > team2Score && match.team1) {
      setWinnerId(match.team1.id);
    } else if (team2Score > team1Score && match.team2) {
      setWinnerId(match.team2.id);
    } else {
      setWinnerId('');
    }
  }, [team1Score, team2Score, match]);

  const handleStartMatch = () => {
    updateStatusMutation.mutate({
      matchId,
      status: 'in_progress'
    });
  };

  const confirmResult = (confirmProgression = false) => {
    recordResultMutation.mutate({
      matchId,
      team1Score,
      team2Score,
      winnerId,
      scoreDetails,
      confirmProgression
    });
    setStep('scoring');
  };

  const handleProgressionConfirmation = (confirm: boolean) => {
    setShowProgressionDialog(false);
    confirmResult(confirm);
  };

  // Content loading state (keeps sidebar visible)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] py-4 sm:py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Loading Header Skeleton */}
          <div className="mb-8">
            <div className="animate-pulse">
              <div className="flex items-center mb-4">
                <div className="w-6 h-6 bg-gray-200 rounded mr-3"></div>
                <div className="h-6 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>

          {/* Loading Match Card */}
          <div className="bg-white rounded-lg border shadow-sm p-6 mb-8">
            <div className="animate-pulse">
              {/* Match Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="h-5 bg-gray-200 rounded w-24"></div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>

              {/* Teams */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="h-16 bg-gray-200 rounded-full w-16 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="h-8 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="text-center">
                  <div className="h-16 bg-gray-200 rounded-full w-16 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                </div>
              </div>

              {/* Loading Controls */}
              <div className="space-y-4">
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>

          {/* Loading Main Content */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="animate-pulse">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F28C38] mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center p-6">
        <div className="text-center bg-white rounded-lg p-8 shadow-sm border max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Match Not Found</h1>
          <p className="text-gray-600 mb-6">{error?.message || 'Match not found'}</p>
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'scheduled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5" />;
      case 'in_progress': return <Play className="w-5 h-5" />;
      case 'ready': return <Timer className="w-5 h-5" />;
      case 'scheduled': return <Clock className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F0E5] py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button 
              onClick={() => router.back()} 
              className="text-[#F28C38] hover:text-[#E67A26] flex items-center mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Back to Matches
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Match #{match.matchNumber}</h1>
          <p className="text-gray-600">{match.roundName} • {match.fixture.name}</p>
        </div>

        {/* Match Info Card */}
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Trophy className="w-6 h-6 text-[#F28C38] mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{match.fixture.name}</h2>
                <p className="text-gray-600">{match.fixture.sport.name} • {match.roundName}</p>
              </div>
            </div>
            <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium border ${getStatusColor(match.status)}`}>
              {getStatusIcon(match.status)}
              <span className="ml-2 capitalize">{match.status.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Teams Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Team 1 */}
            <div className={`p-4 border-2 rounded-lg transition-colors ${
              winnerId === match.team1?.id ? 'border-green-400 bg-green-50' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <h3 className="font-semibold text-gray-900">{match.team1?.name || 'TBD'}</h3>
                </div>
                {winnerId === match.team1?.id && (
                  <Crown className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              
              {match.status !== 'completed' && match.status !== 'scheduled' && match.team1 && (
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => setTeam1Score(Math.max(0, team1Score - 1))}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="text-3xl font-bold text-gray-900 mx-4 min-w-[3rem] text-center">
                    {team1Score}
                  </span>
                  <button
                    onClick={() => setTeam1Score(team1Score + 1)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              )}
              
              {match.status === 'completed' && (
                <div className="text-center">
                  <span className="text-3xl font-bold text-gray-900">{match.team1Score}</span>
                </div>
              )}
            </div>

            {/* VS */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400 mb-2">VS</div>
                {match.nextMatch && (
                  <div className="flex items-center text-sm text-gray-500">
                    <ArrowRight className="w-4 h-4 mr-1" />
                    <span>Winner → {match.nextMatch.roundName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Team 2 */}
            <div className={`p-4 border-2 rounded-lg transition-colors ${
              winnerId === match.team2?.id ? 'border-green-400 bg-green-50' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <h3 className="font-semibold text-gray-900">{match.team2?.name || 'TBD'}</h3>
                </div>
                {winnerId === match.team2?.id && (
                  <Crown className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              
              {match.status !== 'completed' && match.status !== 'scheduled' && match.team2 && (
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => setTeam2Score(Math.max(0, team2Score - 1))}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="text-3xl font-bold text-gray-900 mx-4 min-w-[3rem] text-center">
                    {team2Score}
                  </span>
                  <button
                    onClick={() => setTeam2Score(team2Score + 1)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              )}
              
              {match.status === 'completed' && (
                <div className="text-center">
                  <span className="text-3xl font-bold text-gray-900">{match.team2Score}</span>
                </div>
              )}
            </div>
          </div>

          {/* Match Details */}
          {(match.status === 'in_progress' || match.status === 'completed') && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Score Details (Optional)
              </label>
              <textarea
                value={scoreDetails}
                onChange={(e) => setScoreDetails(e.target.value)}
                placeholder="Add score breakdown, penalties, or other details..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#F28C38] focus:border-[#F28C38]"
                disabled={match.status === 'completed'}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {match.status === 'ready' && match.team1 && match.team2 && (
              <button
                onClick={handleStartMatch}
                disabled={updateStatusMutation.isLoading}
                className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updateStatusMutation.isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Start Match
              </button>
            )}

            {match.status === 'in_progress' && winnerId && (
              <button
                onClick={handleRecordResult}
                disabled={recordResultMutation.isLoading || !winnerId}
                className="flex-1 flex items-center justify-center px-6 py-3 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {recordResultMutation.isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Record Result
              </button>
            )}

            {match.status === 'completed' && (
              <div className="flex-1 text-center py-3 text-green-600 font-medium">
                <CheckCircle className="w-5 h-5 inline mr-2" />
                Match Completed
              </div>
            )}
          </div>
        </div>

        {/* Result Confirmation Dialog */}
        {step === 'confirmation' && (
          <div className="bg-white rounded-lg border shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Match Result</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="font-medium text-gray-900">{match.team1?.name}</div>
                  <div className="text-2xl font-bold text-gray-900">{team1Score}</div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-gray-400 font-medium">VS</div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{match.team2?.name}</div>
                  <div className="text-2xl font-bold text-gray-900">{team2Score}</div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <Crown className="w-4 h-4 mr-1" />
                  Winner: {winnerId === match.team1?.id ? match.team1?.name : match.team2?.name}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep('scoring')}
                className="flex items-center justify-center px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => confirmResult(false)}
                disabled={recordResultMutation.isLoading}
                className="flex-1 flex items-center justify-center px-6 py-3 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {recordResultMutation.isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Confirm Result
              </button>
            </div>
          </div>
        )}

        {/* Tournament Progression Success */}
        {step === 'progression' && progressionInfo && (
          <div className="bg-white rounded-lg border shadow-sm p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Tournament Level Progression!</h3>
              <p className="text-gray-600 mb-6">
                Top 2 teams have advanced to {progressionInfo.nextLevel} level
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6 max-w-sm mx-auto">
                <h4 className="font-medium text-gray-900 mb-3">Qualified Teams</h4>
                {progressionInfo.qualifiedTeams?.map((team, index) => (
                  <div key={team.id} className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Medal className={`w-4 h-4 mr-2 ${index === 0 ? 'text-yellow-500' : 'text-gray-400'}`} />
                      <span className="text-sm font-medium">{team.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{team.position}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center text-sm text-gray-500 mb-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Redirecting to {progressionInfo.nextLevel} tournament...
              </div>
            </div>
          </div>
        )}

        {/* Match Success */}
        {step === 'success' && (
          <div className="bg-white rounded-lg border shadow-sm p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Match Completed!</h3>
              <p className="text-gray-600 mb-4">Result recorded successfully</p>
              
              <div className="flex items-center justify-center text-sm text-gray-500 mb-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Redirecting to matches...
              </div>
            </div>
          </div>
        )}

        {/* Level Progression Confirmation Dialog */}
        {showProgressionDialog && progressionInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Progression</h3>
              <p className="text-gray-600 mb-6">
                This tournament is complete! Would you like to create a {progressionInfo.nextLevel} level tournament 
                with the top 2 teams?
              </p>
              
              <div className="space-y-3 mb-6">
                {progressionInfo.qualifiedTeams?.map((team, index) => (
                  <div key={team.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Medal className={`w-5 h-5 mr-3 ${index === 0 ? 'text-yellow-500' : 'text-gray-400'}`} />
                    <div>
                      <div className="font-medium text-gray-900">{team.name}</div>
                      <div className="text-sm text-gray-500">{team.position}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleProgressionConfirmation(false)}
                  className="flex items-center justify-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Just Complete Tournament
                </button>
                <button
                  onClick={() => handleProgressionConfirmation(true)}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Create {progressionInfo.nextLevel} Tournament
                </button>
              </div>
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
    </div>
  );
}