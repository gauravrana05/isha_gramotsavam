import { adminDb } from '@/lib/firebase/admin';
import { serializeFirestoreDocs } from '@/lib/utils/firestore';
import Link from 'next/link';
import { 
  ArrowLeft,
  Trophy,
  Users,
  Clock,
  Play,
  CheckCircle,
  AlertCircle,
  Calendar,
  Target
} from 'lucide-react';

interface PageProps {
  params: Promise<{
    venueId: string;
    lang: string;
  }>;
  searchParams: Promise<{
    fixture?: string;
  }>;
}

async function getVenueMatches(venueId: string, fixtureId?: string) {
  try {
    let query = adminDb.collection('matches').where('venueId', '==', venueId);
    
    if (fixtureId) {
      query = query.where('fixtureId', '==', fixtureId);
    }
    
    const matchesSnapshot = await query.get();
    
    // Sort in memory to avoid index requirement
    const docs = matchesSnapshot.docs.sort((a, b) => {
      const aTime = a.data().createdAt?.toDate?.() || new Date(0);
      const bTime = b.data().createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
    
    return serializeFirestoreDocs(docs);
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
}

async function getFixtureInfo(fixtureId: string) {
  try {
    const fixtureDoc = await adminDb.collection('fixtures').doc(fixtureId).get();
    if (!fixtureDoc.exists) return null;
    
    const data = fixtureDoc.data();
    return {
      id: fixtureDoc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || null
    };
  } catch (error) {
    console.error('Error fetching fixture:', error);
    return null;
  }
}

export default async function MatchesPage({ params, searchParams }: PageProps) {
  const { venueId } = await params;
  const { fixture: fixtureId } = await searchParams;

  const matches = await getVenueMatches(venueId, fixtureId);
  const fixture = fixtureId ? await getFixtureInfo(fixtureId) : null;

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

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    const round = match.roundName;
    if (!acc[round]) {
      acc[round] = [];
    }
    acc[round].push(match);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort rounds in proper tournament order
  const roundOrder = ['Final', 'Semi Final', 'Quarter Final', 'Round of 16', 'Round of 32', 'Round of 64'];
  const sortedRounds = Object.keys(matchesByRound).sort((a, b) => {
    const aIndex = roundOrder.indexOf(a);
    const bIndex = roundOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Link 
            href={fixtureId ? `/en/volunteer/venues/${venueId}/fixtures/${fixtureId}` : `/en/volunteer/venues/${venueId}/fixtures`} 
            className="text-[#F28C38] hover:text-[#E67A26] flex items-center mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            {fixtureId ? 'Back to Fixture' : 'Back to Fixtures'}
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {fixture ? `${(fixture as any)?.name} - Matches` : 'Tournament Matches'}
        </h1>
        <p className="text-gray-600 text-sm">
          {fixture ? 'Manage results for tournament matches' : 'All venue matches'}
        </p>
      </div>

      {/* Tournament Info */}
      {fixture && (
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Trophy className="w-6 h-6 text-[#F28C38] mr-3" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{(fixture as any)?.name}</h2>
                <p className="text-gray-600 text-sm">
                  {(fixture as any)?.assignedTeams?.length || 0} teams • Level: {(fixture as any)?.level}
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor((fixture as any)?.status)}`}>
              {getStatusIcon((fixture as any)?.status)}
              <span className="ml-1 capitalize">{(fixture as any)?.status.replace('_', ' ')}</span>
            </span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Matches</p>
              <p className="text-2xl font-bold text-gray-900">{matches.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Ready to Play</p>
              <p className="text-2xl font-bold text-yellow-600">
                {matches.filter(m => m.status === 'ready').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">
                {matches.filter(m => m.status === 'in_progress').length}
              </p>
            </div>
            <Play className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {matches.filter(m => m.status === 'completed').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Matches by Round */}
      {matches.length > 0 ? (
        <div className="space-y-6">
          {sortedRounds.map(roundName => (
            <div key={roundName} className="bg-white rounded-lg border shadow-sm p-6">
              <div className="flex items-center mb-4">
                <Target className="w-5 h-5 text-[#F28C38] mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">{roundName}</h3>
                <span className="ml-auto text-sm text-gray-500">
                  {matchesByRound[roundName].length} matches
                </span>
              </div>
              
              {/* Mobile Cards */}
              <div className="space-y-4">
                {matchesByRound[roundName].map((match: any) => (
                  <div key={match.matchId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">Match #{match.matchNumber}</h4>
                        <p className="text-sm text-gray-500">{match.roundName}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                        {getStatusIcon(match.status)}
                        <span className="ml-1 capitalize">{match.status.replace('_', ' ')}</span>
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        {match.team1 ? (
                          <span className="font-medium">
                            {match.team1.teamName}
                            {match.team1.tournamentNumber && (
                              <span className="ml-1 text-gray-500">#{match.team1.tournamentNumber}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">TBD</span>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        {match.team2 ? (
                          <span className="font-medium">
                            {match.team2.teamName}
                            {match.team2.tournamentNumber && (
                              <span className="ml-1 text-gray-500">#{match.team2.tournamentNumber}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">TBD</span>
                        )}
                      </div>
                    </div>

                    {match.result && (
                      <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
                        <div className="text-sm text-green-800">
                          <div className="font-medium">Winner: {match.result.winnerName}</div>
                          {match.result.score && (
                            <div>Score: {match.result.score.team1Score} - {match.result.score.team2Score}</div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {(match.status === 'ready' || match.status === 'in_progress') && (
                      <Link href={`/en/volunteer/venues/${venueId}/matches/${match.matchId}`} className="block">
                        <button className="w-full bg-[#F28C38] text-white px-4 py-2 rounded-md hover:bg-[#E67A26] transition-colors">
                          {match.status === 'ready' ? 'Start Match' : 'Update Result'}
                        </button>
                      </Link>
                    )}
                    {match.status === 'completed' && (
                      <Link href={`/en/volunteer/venues/${venueId}/matches/${match.matchId}`} className="block">
                        <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors">
                          View Result
                        </button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
          <p className="text-gray-600">
            {fixtureId ? 'This tournament has no matches yet.' : 'No matches have been created for this venue.'}
          </p>
          {fixtureId && (
            <Link href={`/en/volunteer/venues/${venueId}/fixtures`}>
              <button className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors">
                Back to Fixtures
              </button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
