import { adminDb } from '@/lib/firebase/admin';
import Link from 'next/link';
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
  MapPin,
  Eye
} from 'lucide-react';

interface PageProps {
  params: Promise<{
    fixtureId: string;
    lang: string;
  }>;
}

async function getFixtureDetails(fixtureId: string) {
  try {
    const fixtureDoc = await adminDb.collection('fixtures').doc(fixtureId).get();
    
    if (!fixtureDoc.exists) {
      return { success: false, error: 'Fixture not found' };
    }
    
    const fixtureData = fixtureDoc.data();
    
    // Serialize timestamps
    const serializedFixture = {
      id: fixtureDoc.id,
      ...fixtureData,
      createdAt: fixtureData?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: fixtureData?.updatedAt?.toDate?.()?.toISOString() || null,
      completedAt: fixtureData?.completedAt?.toDate?.()?.toISOString() || null
    };
    
    return { success: true, fixture: serializedFixture };
  } catch (error) {
    console.error('Error fetching fixture:', error);
    return { success: false, error: 'Failed to fetch fixture' };
  }
}

async function getTeamDetails(teamIds: string[]) {
  try {
    const teams: Record<string, any> = {};
    
    if (teamIds.length > 0) {
      const teamRefs = teamIds.map(id => adminDb.collection('teams').doc(id));
      const teamDocs = await adminDb.getAll(...teamRefs);
      
      teamDocs.forEach(doc => {
        if (doc.exists) {
          const teamData = doc.data();
          teams[doc.id] = {
            id: doc.id,
            name: teamData?.name || 'Unknown Team',
            tournamentNumber: teamData?.tournamentNumber || null,
            captainProfile: teamData?.captainProfile
          };
        }
      });
    }
    
    return teams;
  } catch (error) {
    console.error('Error fetching team details:', error);
    return {};
  }
}

async function getFixtureMatches(fixtureId: string) {
  try {
    const matchesSnapshot = await adminDb.collection('matches')
      .where('fixtureId', '==', fixtureId)
      .get();
    
    const matches = matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null
    }));
    
    // Sort in memory instead of using orderBy to avoid index requirement
    return matches.sort((a, b) => {
      const aNum = typeof (a as any).matchNumber === 'number' ? (a as any).matchNumber : 0;
      const bNum = typeof (b as any).matchNumber === 'number' ? (b as any).matchNumber : 0;
      return aNum - bNum;
    });

  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
}

export default async function AdminFixtureDetailPage({ params }: PageProps) {
  const { fixtureId, lang } = await params;
  
  const [fixtureResult, standaloneMatches] = await Promise.all([
    getFixtureDetails(fixtureId),
    getFixtureMatches(fixtureId)
  ]);
  
  if (!fixtureResult.success) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Fixture Not Found</h3>
          <p className="text-gray-600">{fixtureResult.error}</p>
          <Link href={`/${lang}/admin/fixtures`}>
            <button className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors">
              Back to Fixtures
            </button>
          </Link>
        </div>
      </div>
    );
  }
  
  const { fixture } = fixtureResult;
  
  // Get all team IDs from bracket matches and assigned teams, handling possible undefineds and type issues
  const allTeamIds = [
    ...((fixture as any)?.assignedTeams ?? []),
    ...(((fixture as any)?.bracket?.matches ?? []).flatMap((match: any) => [match.team1Id, match.team2Id, match.winnerId]))
  ].filter(Boolean);

  const teams = await getTeamDetails(Array.from(new Set(allTeamIds)));
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'teams_assigned': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
      case 'ready': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'scheduled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const groupMatchesByRound = (matches: any[]) => {
    return matches.reduce((acc, match) => {
      if (!acc[match.roundName]) {
        acc[match.roundName] = [];
      }
      acc[match.roundName].push(match);
      return acc;
    }, {} as Record<string, any[]>);
  };

  const roundedMatches = groupMatchesByRound(standaloneMatches);
  const roundOrder = ['Round of 64', 'Round of 32', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final'];
  
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Link 
            href={`/${lang}/admin/fixtures`}
            className="text-[#F28C38] hover:text-[#E67A26] flex items-center mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Fixtures
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{(fixture as any)?.name ?? 'Untitled Fixture'}</h1>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {(fixture as any)?.venueName}
              </div>
              <div>{(fixture as any)?.sportName} • {(fixture as any)?.genderCategory}</div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                {(fixture as any)?.assignedTeams?.length || 0} teams
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor((fixture as any)?.status)}`}>
              {getStatusIcon((fixture as any)?.status)}
              <span className="ml-2 capitalize">{(fixture as any)?.status?.replace('_', ' ')}</span>
            </span>
            <div className="text-xs text-gray-500 mt-1">
              Level: <span className="font-medium capitalize">{(fixture as any)?.level}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Status & Champion */}
      {(fixture as any)?.status === 'completed' && (fixture as any)?.championTeamName && (
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-6 mb-6">
          <div className="flex items-center">
            <Crown className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900">Tournament Champion</h3>
              <p className="text-yellow-800">{(fixture as any)?.championTeamName}</p>
              {(fixture as any)?.completedAt && (
                <p className="text-sm text-yellow-700">
                  Completed on {new Date((fixture as any)?.completedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tournament Bracket */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Tournament Bracket</h3>
          <p className="text-sm text-gray-600">Round-by-round tournament progression</p>
        </div>
        
        <div className="p-6">
          {roundOrder.map((roundName) => {
            const roundMatches = roundedMatches[roundName] || [];
            if (roundMatches.length === 0) return null;
            
            return (
              <div key={roundName} className="mb-6 last:mb-0">
                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                  <Target className="w-4 h-4 mr-2 text-gray-500" />
                  {roundName} ({roundMatches.length} matches)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roundMatches.map((match: any, index: number) => (
                    <div key={match.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <Hash className="w-3 h-3 mr-1" />
                          Match {match.matchNumber}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getMatchStatusColor(match.status)}`}>
                          {match.status}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className={`p-2 rounded text-sm ${
                          match.result?.winnerId === match.team1?.teamId && 
                          match.team1?.teamName && 
                          match.team1.teamName.toLowerCase() !== 'tbd' ? 
                          'bg-green-50 border border-green-200' : 'bg-gray-50'
                        }`}>
                          <div className="font-medium">
                            {match.team1?.teamName || 'TBD'}
                            {match.team1?.tournamentNumber && (
                              <span className="text-gray-500 ml-1">(#{match.team1.tournamentNumber})</span>
                            )}
                          </div>
                          {match.result?.winnerId === match.team1?.teamId && 
                           match.team1?.teamName && 
                           match.team1.teamName.toLowerCase() !== 'tbd' && (
                            <div className="text-green-600 text-xs font-medium">Winner</div>
                          )}
                        </div>
                        
                        <div className="text-center text-xs text-gray-400">vs</div>
                        
                        <div className={`p-2 rounded text-sm ${
                          match.result?.winnerId === match.team2?.teamId && 
                          match.team2?.teamName && 
                          match.team2.teamName.toLowerCase() !== 'tbd' ? 
                          'bg-green-50 border border-green-200' : 'bg-gray-50'
                        }`}>
                          <div className="font-medium">
                            {match.team2?.teamName || 'TBD'}
                            {match.team2?.tournamentNumber && (
                              <span className="text-gray-500 ml-1">(#{match.team2.tournamentNumber})</span>
                            )}
                          </div>
                          {match.result?.winnerId === match.team2?.teamId && 
                           match.team2?.teamName && 
                           match.team2.teamName.toLowerCase() !== 'tbd' && (
                            <div className="text-green-600 text-xs font-medium">Winner</div>
                          )}
                        </div>
                      </div>
                      
                      {match.result && 
                       match.result.winnerName && 
                       match.result.winnerName.toLowerCase() !== 'tbd' && (
                        <div className="mt-3 text-xs text-gray-600 border-t pt-2">
                          <div>Winner: {match.result.winnerName}</div>
                          {match.result.resultEnteredAt && (
                            <div>Completed: {new Date(match.result.resultEnteredAt.toDate()).toLocaleString()}</div>
                          )}
                        </div>
                      )}
                      
                      <div className="mt-3">
                        <Link 
                          href={`/${lang}/admin/matches/${match.id}`}
                          className="text-[#F28C38] hover:text-[#E67A26] text-sm flex items-center"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {Object.keys(roundedMatches).length === 0 && (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matches created yet</h3>
              <p className="text-gray-600">Matches will appear here once the tournament bracket is generated.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Trophy className="w-8 h-8 text-[#F28C38]" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Matches</p>
              <p className="text-2xl font-bold text-gray-900">{standaloneMatches.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {standaloneMatches.filter(m => (m as any)?.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Play className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {standaloneMatches.filter(m => (m as any)?.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
