import { adminDb } from '@/lib/firebase/admin';
import Link from 'next/link';
import { 
  Trophy,
  Users,
  MapPin,
  Calendar,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Filter
} from 'lucide-react';

interface PageProps {
  params: {
    lang: string;
  };
}

async function getAllFixtures() {
  try {
    const fixturesSnapshot = await adminDb.collection('fixtures')
      .get();
    
    const fixtures = [];
    
    for (const doc of fixturesSnapshot.docs) {
      const fixtureData = doc.data();
      
      // Serialize timestamps
      fixtures.push({
        id: doc.id,
        ...fixtureData,
        createdAt: fixtureData?.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: fixtureData?.updatedAt?.toDate?.()?.toISOString() || null,
        completedAt: fixtureData?.completedAt?.toDate?.()?.toISOString() || null
      });
    }
    
    // Sort by createdAt in memory to avoid index requirement
    fixtures.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    
    return { success: true, fixtures };
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    return { success: false, fixtures: [] };
  }
}

async function getFixtureStats() {
  try {
    const fixturesSnapshot = await adminDb.collection('fixtures').get();
    const matchesSnapshot = await adminDb.collection('matches').get();
    
    const stats = {
      totalFixtures: fixturesSnapshot.size,
      totalMatches: matchesSnapshot.size,
      byStatus: { draft: 0, teams_assigned: 0, in_progress: 0, completed: 0 },
      byLevel: { cluster: 0, division: 0, final: 0 }
    };
    
    fixturesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.status) stats.byStatus[data.status]++;
      if (data.level) stats.byLevel[data.level]++;
    });
    
    return stats;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      totalFixtures: 0,
      totalMatches: 0,
      byStatus: { draft: 0, teams_assigned: 0, in_progress: 0, completed: 0 },
      byLevel: { cluster: 0, division: 0, final: 0 }
    };
  }
}

export default async function AdminFixturesPage({ params }: PageProps) {
  const { lang } = params;
  
  const [fixturesResult, stats] = await Promise.all([
    getAllFixtures(),
    getFixtureStats()
  ]);
  
  const { fixtures } = fixturesResult;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'teams_assigned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'teams_assigned': return <Users className="w-4 h-4" />;
      case 'draft': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };
  
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'final': return 'bg-purple-100 text-purple-800';
      case 'division': return 'bg-blue-100 text-blue-800';
      case 'cluster': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tournament Fixtures</h1>
        <p className="text-gray-600 mt-2">Monitor all tournament fixtures across venues</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Trophy className="w-8 h-8 text-[#F28C38]" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Fixtures</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalFixtures}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Play className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Matches</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMatches}</p>
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
            <Clock className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.byStatus.in_progress}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Level Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Levels</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.byLevel.cluster}</div>
            <div className="text-sm text-gray-600">Cluster</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.byLevel.division}</div>
            <div className="text-sm text-gray-600">Division</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.byLevel.final}</div>
            <div className="text-sm text-gray-600">Final</div>
          </div>
        </div>
      </div>

      {/* Fixtures List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">All Fixtures</h3>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">{fixtures.length} fixtures</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tournament
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Venue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teams
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fixtures.map((fixture) => (
                <tr key={fixture.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{fixture.name}</div>
                      <div className="text-sm text-gray-500">{fixture.sportName} • {fixture.genderCategory}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                      {fixture.venueName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(fixture.level)}`}>
                      {fixture.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-gray-400 mr-1" />
                      {fixture.assignedTeams?.length || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(fixture.status)}`}>
                      {getStatusIcon(fixture.status)}
                      <span className="ml-1 capitalize">{fixture.status?.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {fixture.createdAt ? new Date(fixture.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link 
                      href={`/${lang}/admin/fixtures/${fixture.id}`}
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
          
          {fixtures.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No fixtures found</h3>
              <p className="text-gray-600">Tournament fixtures will appear here once created by volunteers.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}