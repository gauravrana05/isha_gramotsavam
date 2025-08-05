import { adminDb } from '@/lib/firebase/admin';
import Link from 'next/link';
import { 
  ArrowLeft,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  MapPin,
  Trophy,
  Hash,
  Target,
  Calendar,
  Crown,
  Eye,
  ExternalLink
} from 'lucide-react';

interface PageProps {
  params: Promise<{
    matchId: string;
    lang: string;
  }>;
}

async function getMatchDetails(matchId: string) {
  try {
    const matchDoc = await adminDb.collection('matches').doc(matchId).get();
    
    if (!matchDoc.exists) {
      return { success: false, error: 'Match not found' };
    }
    
    const matchData = matchDoc.data();
    
    // Serialize timestamps
    const serializedMatch = {
      id: matchDoc.id,
      ...matchData,
      createdAt: matchData?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: matchData?.updatedAt?.toDate?.()?.toISOString() || null,
      resultEnteredAt: matchData?.result?.resultEnteredAt?.toDate?.()?.toISOString() || null
    };
    
    return { success: true, match: serializedMatch };
  } catch (error) {
    console.error('Error fetching match:', error);
    return { success: false, error: 'Failed to fetch match' };
  }
}

async function getFixtureInfo(fixtureId: string) {
  try {
    const fixtureDoc = await adminDb.collection('fixtures').doc(fixtureId).get();
    
    if (!fixtureDoc.exists) {
      return null;
    }
    
    const fixtureData = fixtureDoc.data();
    return {
      id: fixtureDoc.id,
      name: fixtureData?.name,
      level: fixtureData?.level,
      status: fixtureData?.status
    };
  } catch (error) {
    console.error('Error fetching fixture:', error);
    return null;
  }
}

export default async function AdminMatchDetailPage({ params }: PageProps) {
  const { matchId, lang } = await params;
  
  const matchResult = await getMatchDetails(matchId);
  
  if (!matchResult.success) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Match Not Found</h3>
          <p className="text-gray-600">{matchResult.error}</p>
          <Link href={`/${lang}/admin/matches`}>
            <button className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors">
              Back to Matches
            </button>
          </Link>
        </div>
      </div>
    );
  }
  
  const { match } = matchResult;
  const fixture = await getFixtureInfo((match as any)?.fixtureId);
  
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
      case 'completed': return <CheckCircle className="w-5 h-5" />;
      case 'in_progress': return <Play className="w-5 h-5" />;
      case 'ready': return <Users className="w-5 h-5" />;
      case 'scheduled': return <Clock className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const formatTeamName = (team: any) => {
    if (!team) return 'TBD';
    const number = team.tournamentNumber ? ` (#${team.tournamentNumber})` : '';
    return `${team.teamName}${number}`;
  };

  const isWinner = (teamId: string) => {
    return (match as any)?.result?.winnerId === teamId;
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Link 
            href={`/${lang}/admin/matches`}
            className="text-[#F28C38] hover:text-[#E67A26] flex items-center mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Matches
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Match #{(match as any)?.matchNumber}</h1>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {(match as any)?.venueName}
              </div>
              <div className="flex items-center">
                <Target className="w-4 h-4 mr-1" />
                {(match as any)?.roundName}
              </div>
              <div>{(match as any)?.sportName} • {(match as any)?.genderCategory}</div>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor((match as any)?.status)}`}>
              {getStatusIcon((match as any)?.status)}
              <span className="ml-2 capitalize">{(match as any)?.status?.replace('_', ' ')}</span>
            </span>
            {(match as any)?.createdAt && (
              <div className="text-xs text-gray-500 mt-1">
                Created: {new Date((match as any)?.createdAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Match Result Banner */}
      {(match as any)?.result && (
        <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-center">
            <Crown className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-green-900">Match Complete</h3>
              <p className="text-green-800">Winner: {(match as any)?.result.winnerName}</p>
              {(match as any)?.result.resultEnteredAt && (
                <p className="text-sm text-green-700">
                  Completed: {new Date((match as any)?.result.resultEnteredAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Match Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Teams */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Match Details</h3>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Team 1 */}
                <div className={`p-4 rounded-lg border ${isWinner((match as any)?.team1?.teamId) ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">
                        {formatTeamName((match as any)?.team1)}
                      </h4>
                      {(match as any)?.team1?.teamName && (match as any)?.team1?.teamName !== 'TBD' && (
                        <p className="text-sm text-gray-600 mt-1">Team 1</p>
                      )}
                    </div>
                    {isWinner((match as any)?.team1?.teamId) && (
                      <div className="flex items-center text-green-600">
                        <Crown className="w-5 h-5 mr-1" />
                        <span className="font-medium">Winner</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* VS */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full">
                    <span className="text-lg font-bold text-gray-600">VS</span>
                  </div>
                </div>

                {/* Team 2 */}
                <div className={`p-4 rounded-lg border ${isWinner((match as any)?.team2?.teamId) ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">
                        {formatTeamName((match as any)?.team2)}
                      </h4>
                      {(match as any)?.team2?.teamName && (match as any)?.team2?.teamName !== 'TBD' && (
                        <p className="text-sm text-gray-600 mt-1">Team 2</p>
                      )}
                    </div>
                    {isWinner((match as any)?.team2?.teamId) && (
                      <div className="flex items-center text-green-600">
                        <Crown className="w-5 h-5 mr-1" />
                        <span className="font-medium">Winner</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Score Details */}
              {(match as any)?.result?.score && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Score Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          {(match as any)?.result.score.team1Score || 0}
                        </div>
                        <div className="text-sm text-gray-600">{formatTeamName((match as any)?.team1)}</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          {(match as any)?.result.score.team2Score || 0}
                        </div>
                        <div className="text-sm text-gray-600">{formatTeamName((match as any)?.team2)}</div>
                      </div>
                    </div>
                    {(match as any)?.result.score.details && (
                      <div className="mt-4 text-sm text-gray-600">
                        <strong>Details:</strong> {(match as any)?.result.score.details}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tournament Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Info</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Tournament</div>
                <div className="font-medium">{(match as any)?.fixtureName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Round</div>
                <div className="font-medium">{(match as any)?.roundName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Sport</div>
                <div className="font-medium">{(match as any)?.sportName} ({(match as any)?.genderCategory})</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Venue</div>
                <div className="font-medium">{(match as any)?.venueName}</div>
              </div>
              {fixture && (
                <div>
                  <div className="text-sm text-gray-600">Level</div>
                  <div className="font-medium capitalize">{fixture.level}</div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {fixture && (
                <Link 
                  href={`/${lang}/admin/fixtures/${fixture.id}`}
                  className="flex items-center text-[#F28C38] hover:text-[#E67A26] text-sm"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  View Tournament Bracket
                </Link>
              )}
              
              <Link 
                href={`/${lang}/volunteer/venues/${(match as any)?.venueId}/matches/${(match as any)?.id}`}
                className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Volunteer Match View
              </Link>
            </div>
          </div>

          {/* Match Timeline */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">Match Created</div>
                  {(match as any)?.createdAt && (
                    <div className="text-xs text-gray-500">
                      {new Date((match as any)?.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              
              {(match as any)?.status !== 'scheduled' && (
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">Teams Assigned</div>
                    <div className="text-xs text-gray-500">Ready to play</div>
                  </div>
                </div>
              )}
              
              {(match as any)?.status === 'in_progress' && (
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">Match In Progress</div>
                    <div className="text-xs text-gray-500">Currently being played</div>
                  </div>
                </div>
              )}
              
              {(match as any)?.result && (
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">Match Completed</div>
                    {(match as any)?.resultEnteredAt && (
                      <div className="text-xs text-gray-500">
                        {new Date((match as any)?.resultEnteredAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
