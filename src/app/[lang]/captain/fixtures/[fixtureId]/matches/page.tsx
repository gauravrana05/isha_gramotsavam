'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/server/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Trophy, Clock, Calendar, ArrowLeft, MapPin, Play, CheckCircle, Upload, Medal } from 'lucide-react';
import Link from 'next/link';
import { useNotification } from '@/context/NotificationContext';

export default function CaptainFixtureMatchesPage() {
  const params = useParams();
  const fixtureId = params.fixtureId as string;
  const lang = params.lang as string;
  const { addNotification } = useNotification();
  
  // State for match result submission
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [scoreDetails, setScoreDetails] = useState('');

  // Get fixture details for header info
  const { data: fixture } = api.volunteers.fixture.getFixtureDetails.useQuery({
    fixtureId
  });

  // Get captain's team matches for this fixture
  const { data: myMatches, refetch: refetchMatches } = api.captain.match.getTeamMatches.useQuery({
    fixtureId
  });

  const { data: captainTeams } = api.teams.management.getUserTeams.useQuery();

  // Mutations
  const submitResultMutation = api.captain.match.submitMatchResult.useMutation({
    onSuccess: () => {
      addNotification('Match result submitted successfully!', 'success');
      setShowResultModal(false);
      refetchMatches();
    },
    onError: (error) => {
      addNotification(error.message, 'error');
    }
  });

  const updateMatchStatusMutation = api.captain.match.updateMatchStatus.useMutation({
    onSuccess: () => {
      addNotification('Match status updated!', 'success');
      refetchMatches();
    },
    onError: (error) => {
      addNotification(error.message, 'error');
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-gray-500';
      case 'ready': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getMyTeam = (match: any) => {
    return captainTeams?.find(team => team.id === match.team1Id || team.id === match.team2Id);
  };

  const handleStartMatch = (match: any) => {
    updateMatchStatusMutation.mutate({
      matchId: match.id,
      status: 'in_progress'
    });
  };

  const handleSubmitResult = (match: any) => {
    setSelectedMatch(match);
    setTeam1Score(match.team1Score || 0);
    setTeam2Score(match.team2Score || 0);
    setScoreDetails(match.scoreDetails || '');
    setShowResultModal(true);
  };

  const handleResultSubmission = () => {
    if (!selectedMatch) return;
    
    const winnerId = team1Score > team2Score ? selectedMatch.team1Id : 
                    team2Score > team1Score ? selectedMatch.team2Id : null;

    if (!winnerId) {
      addNotification('Please enter a valid score with a winner', 'error');
      return;
    }

    if (team1Score === team2Score) {
      addNotification('Matches cannot end in a tie. Please enter different scores.', 'error');
      return;
    }

    submitResultMutation.mutate({
      matchId: selectedMatch.id,
      team1Score,
      team2Score,
      scoreDetails: scoreDetails.trim() || undefined,
      winnerId
    });
  };

  const getOpponentTeam = (match: any) => {
    const myTeam = getMyTeam(match);
    if (!myTeam) return null;
    return myTeam.id === match.team1Id ? match.team2 : match.team1;
  };

  if (!fixture) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Link href={`/${lang}/captain/fixtures/${fixtureId}/bracket`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Bracket
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">My Team Matches</h1>
          <p className="text-muted-foreground">
            {fixture.fixture.name} • {fixture.fixture.sport.name}
          </p>
          <div className="flex items-center space-x-2 text-sm text-blue-600 mt-1">
            <MapPin className="h-4 w-4" />
            <span>{fixture.fixture.venueLevelMapping.venue.name}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {myMatches.map((match) => {
          const myTeam = getMyTeam(match);
          const opponent = getOpponentTeam(match);
          const isWinner = match.winnerId === myTeam?.id;
          const isLoser = match.winnerId && match.winnerId !== myTeam?.id;

          return (
            <Card key={match.id} className={`${
              isWinner ? 'border-green-500 bg-green-50' : 
              isLoser ? 'border-red-500 bg-red-50' : 
              'border-blue-500 bg-blue-50'
            }`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {match.roundName} - Match #{match.matchNumber}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {myTeam?.name} vs {opponent?.name || 'TBD'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={getStatusColor(match.status)}>
                      {match.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {isWinner && (
                      <Badge className="bg-green-500">
                        WON
                      </Badge>
                    )}
                    {isLoser && (
                      <Badge className="bg-red-500">
                        LOST
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Match Result */}
                  {match.status === 'completed' && (
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {myTeam?.id === match.team1Id ? match.team1Score : match.team2Score}
                        {' - '}
                        {myTeam?.id === match.team1Id ? match.team2Score : match.team1Score}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {myTeam?.name} vs {opponent?.name}
                      </div>
                    </div>
                  )}

                  {/* Match Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-semibold text-blue-600">My Team</div>
                      <div>{myTeam?.name}</div>
                      {myTeam?.tournamentNumber && (
                        <div className="text-muted-foreground">
                          Tournament #{myTeam.tournamentNumber}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">Opponent</div>
                      <div>{opponent?.name || 'TBD'}</div>
                      {opponent?.tournamentNumber && (
                        <div className="text-muted-foreground">
                          Tournament #{opponent.tournamentNumber}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timing */}
                  {match.scheduledTime && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Scheduled: {new Date(match.scheduledTime).toLocaleString()}</span>
                    </div>
                  )}

                  {match.actualStartTime && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Started: {new Date(match.actualStartTime).toLocaleString()}</span>
                    </div>
                  )}

                  {/* Score Details */}
                  {match.scoreDetails && (
                    <div className="text-xs bg-white p-3 rounded border">
                      <div className="font-semibold mb-1">Match Details:</div>
                      {match.scoreDetails}
                    </div>
                  )}

                  {/* Match Actions */}
                  <div className="flex space-x-2">
                    {match.status === 'ready' && (
                      <Button 
                        onClick={() => handleStartMatch(match)}
                        disabled={updateMatchStatusMutation.isPending}
                        className="flex-1"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Match
                      </Button>
                    )}
                    
                    {match.status === 'in_progress' && (
                      <Button 
                        onClick={() => handleSubmitResult(match)}
                        disabled={submitResultMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Submit Result
                      </Button>
                    )}
                  </div>

                  {/* Next Match Info */}
                  {isWinner && match.nextMatch && (
                    <div className="text-sm text-green-600 font-medium bg-green-100 p-2 rounded">
                      🎉 Congratulations! You advance to {match.nextMatch.roundName}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {myMatches.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No matches found for your teams in this fixture
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Result Submission Modal */}
      {showResultModal && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Submit Match Result
            </h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900">
                {selectedMatch.roundName} - Match #{selectedMatch.matchNumber}
              </div>
              <div className="text-sm text-gray-600">
                {selectedMatch.team1?.name} vs {selectedMatch.team2?.name}
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedMatch.team1?.name} Score
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={team1Score}
                    onChange={(e) => setTeam1Score(parseInt(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedMatch.team2?.name} Score
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={team2Score}
                    onChange={(e) => setTeam2Score(parseInt(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Details (Optional)
                </label>
                <Textarea
                  value={scoreDetails}
                  onChange={(e) => setScoreDetails(e.target.value)}
                  placeholder="Any additional match details, notes, or highlights..."
                  rows={3}
                  className="w-full"
                />
              </div>

              {/* Score Validation */}
              {team1Score === team2Score && (team1Score > 0 || team2Score > 0) && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  ⚠️ Matches cannot end in a tie. Please enter different scores.
                </div>
              )}
              
              {team1Score !== team2Score && (team1Score > 0 || team2Score > 0) && (
                <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                  ✓ Winner: {team1Score > team2Score ? selectedMatch.team1?.name : selectedMatch.team2?.name}
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => setShowResultModal(false)}
                variant="outline"
                className="flex-1"
                disabled={submitResultMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResultSubmission}
                disabled={submitResultMutation.isPending || team1Score === team2Score}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {submitResultMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Result
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
