import { adminDb } from '@/lib/firebase/admin';
import Link from 'next/link';
import { 
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Users,
  MapPin,
  Trophy,
  Hash,
  Target,
  Filter,
  Calendar
} from 'lucide-react';

interface PageProps {
  params: {
    lang: string;
  };
}

async function getAllMatches() {
  try {
    const matchesSnapshot = await adminDb.collection('matches').get();
    
    const matches = [];
    
    for (const doc of matchesSnapshot.docs) {
      const matchData = doc.data();
      
      // Serialize timestamps
      matches.push({
        id: doc.id,
        ...matchData,
        createdAt: matchData?.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: matchData?.updatedAt?.toDate?.()?.toISOString() || null,
        resultEnteredAt: matchData?.result?.resultEnteredAt?.toDate?.()?.toISOString() || null
      });
    }
    
    // Sort by match number and creation date
    matches.sort((a, b) => {
      if (a.matchNumber !== b.matchNumber) {
        return (a.matchNumber || 0) - (b.matchNumber || 0);
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    
    return { success: true, matches };
  } catch (error) {
    console.error('Error fetching matches:', error);
    return { success: false, matches: [] };
  }
}

async function getMatchStats() {
  try {
    const matchesSnapshot = await adminDb.collection('matches').get();
    
    const stats = {
      totalMatches: matchesSnapshot.size,
      byStatus: { scheduled: 0, ready: 0, in_progress: 0, completed: 0 },
      byRound: {} as Record<string, number>,
      liveMatches: 0
    };
    
    matchesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.status) {
        stats.byStatus[data.status as keyof typeof stats.byStatus] = (stats.byStatus[data.status as keyof typeof stats.byStatus] || 0) + 1;
      }
      if (data.roundName) {
        stats.byRound[data.roundName] = (stats.byRound[data.roundName] || 0) + 1;
      }
      if (data.status === 'in_progress') {
        stats.liveMatches++;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error fetching match stats:', error);
    return {
      totalMatches: 0,
      byStatus: { scheduled: 0, ready: 0, in_progress: 0, completed: 0 },
      byRound: {},
      liveMatches: 0
    };
  }
}

export default async function AdminMatchesPage({ params }: PageProps) {
  const { lang } = params;
  
  const [matchesResult, stats] = await Promise.all([
    getAllMatches(),
    getMatchStats()
  ]);
  
  const { matches } = matchesResult;
  
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
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'ready': return <Users className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatMatchTeams = (match: any) => {
    const team1Name = match.team1?.teamName || 'TBD';
    const team2Name = match.team2?.teamName || 'TBD';
    return `${team1Name} vs ${team2Name}`;
  };

  const getWinnerInfo = (match: any) => {
    if (match.result?.winnerName) {
      return `Winner: ${match.result.winnerName}`;
    }
    return null;
  };

  // Group matches by venue for better organization
  const matchesByVenue = matches.reduce((acc, match) => {
    const venueKey = match.venueName || 'Unknown Venue';
    if (!acc[venueKey]) {
      acc[venueKey] = [];
    }
    acc[venueKey].push(match);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tournament Matches</h1>
        <p className="text-gray-600 mt-2">Monitor all matches across venues in real-time</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Trophy className="w-8 h-8 text-[#F28C38]" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Matches</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMatches}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Play className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Live Now</p>
              <p className="text-2xl font-bold text-blue-600">{stats.liveMatches}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.byStatus.completed}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ready</p>
              <p className="text-2xl font-bold text-gray-900">{stats.byStatus.ready}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-gray-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900">{stats.byStatus.scheduled}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Matches Alert */}
      {stats.liveMatches > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Play className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">
                {stats.liveMatches} match{stats.liveMatches > 1 ? 'es' : ''} currently in progress
              </h3>
              <p className="text-sm text-blue-700">Monitor live matches for real-time updates</p>
            </div>
          </div>
        </div>
      )}

      {/* Matches by Venue */}
      <div className="space-y-8">
        {Object.entries(matchesByVenue).map(([venueName, venueMatches]) => (
          <div key={venueName} className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-gray-400 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">{venueName}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">{venueMatches.length} matches</span>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Match
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teams
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Round
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tournament
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {venueMatches.map((match) => (
                    <tr key={match.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm font-medium text-gray-900">
                          <Hash className="w-4 h-4 text-gray-400 mr-1" />
                          #{match.matchNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatMatchTeams(match)}</div>
                        <div className="text-sm text-gray-500">{match.sportName} • {match.genderCategory}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Target className="w-4 h-4 text-gray-400 mr-1" />
                          {match.roundName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{match.fixtureName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(match.status)}`}>
                          {getStatusIcon(match.status)}
                          <span className="ml-1 capitalize">{match.status?.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getWinnerInfo(match) || 'Pending'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link 
                          href={`/${lang}/admin/matches/${match.id}`}
                          className="text-[#F28C38] hover:text-[#E67A26] flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        
        {matches.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="text-center py-12">
              <Play className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
              <p className="text-gray-600">Tournament matches will appear here once fixtures are created.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
