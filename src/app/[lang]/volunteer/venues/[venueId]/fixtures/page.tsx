import { adminDb } from '@/lib/firebase/admin';
import { getVenueCheckedInTeams } from '@/lib/actions/tournament/fixtureManagement';
import Link from 'next/link';
import { serializeFirestoreDocs } from '@/lib/utils/firestore';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Play, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Plus,
  Eye,
  ArrowLeft,
  Target
} from 'lucide-react';

interface PageProps {
  params: Promise<{
    venueId: string;
    lang: string;
  }>;
}

async function getVenueFixtures(venueId: string) {
  try {
    const fixturesSnapshot = await adminDb.collection('fixtures')
      .where('venueId', '==', venueId)
      .get();
    
    // Sort in memory instead of using orderBy to avoid index requirement
    const docs = fixturesSnapshot.docs.sort((a, b) => {
      const aTime = a.data().createdAt?.toDate?.() || new Date(0);
      const bTime = b.data().createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
    
    return serializeFirestoreDocs(docs);
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    return [];
  }
}

export default async function FixturesPage({ params }: PageProps) {
  const { venueId } = await params;
  const eventId = 'isha_gramotsavam_2025';

  const checkedInTeamsResult = await getVenueCheckedInTeams(venueId, eventId);
  const fixtures = await getVenueFixtures(venueId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Link href={`/en/volunteer/venues/${venueId}`} className="text-[#F28C38] hover:text-[#E67A26] flex items-center mr-4">
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Venue
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Tournament Fixtures</h1>
        <p className="text-gray-600 text-sm">Manage tournament draws and brackets for venue competitions</p>
      </div>

      {/* Stats Cards */}
      {checkedInTeamsResult.success && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Checked-in Teams</p>
                <p className="text-2xl font-bold text-green-600">{checkedInTeamsResult.totalTeams}</p>
              </div>
              <Users className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Sports Categories</p>
                <p className="text-2xl font-bold text-blue-600">{Object.keys(checkedInTeamsResult.teamsBySport).length}</p>
              </div>
              <Target className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Tournaments</p>
                <p className="text-2xl font-bold text-purple-600">{fixtures.length}</p>
              </div>
              <Trophy className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Matches</p>
                <p className="text-2xl font-bold text-orange-600">
                  {fixtures.reduce((acc, f) => acc + (f.bracket?.matches?.length || 0), 0)}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>
      )}

      {/* Create New Tournaments */}
      {checkedInTeamsResult.success && Object.keys(checkedInTeamsResult.teamsBySport).length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Tournament</h2>
          <div className="space-y-3">
            {Object.entries(checkedInTeamsResult.teamsBySport).map(([sportKey, sportTeams]) => {
              const [sportId, genderCategory] = sportKey.split('_');
              const existingFixture = fixtures.find(f => 
                f.sportId === sportId && f.genderCategory === genderCategory
              );
              
              return (
                <div key={sportKey} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <Trophy className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900 capitalize">
                        {sportId.replace('_', ' ')} - {genderCategory}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {(sportTeams as any)?.length} teams checked in
                      </p>
                    </div>
                  </div>
                  
                  {existingFixture ? (
                    <Link href={`/en/volunteer/venues/${venueId}/fixtures/${existingFixture.id}`}>
                      <button className="flex items-center px-3 py-2 text-sm text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md border border-indigo-200">
                        <Eye className="w-4 h-4 mr-1" />
                        View Tournament
                      </button>
                    </Link>
                  ) : (sportTeams as any)?.length >= 2 ? (
                    <Link href={`/en/volunteer/venues/${venueId}/fixtures/create-draw?sport=${sportId}&gender=${genderCategory}`}>
                      <button className="flex items-center px-3 py-2 text-sm text-white bg-[#F28C38] hover:bg-[#E67A26] rounded-md">
                        <Plus className="w-4 h-4 mr-1" />
                        Create Draw
                      </button>
                    </Link>
                  ) : (
                    <div className="text-sm text-gray-500 px-3 py-2 bg-gray-100 rounded-md">
                      Need 2+ teams
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Fixtures */}
      {fixtures.length > 0 ? (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-lg border overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tournament</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teams</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matches</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fixtures.map((fixture) => (
                    <tr key={fixture.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Trophy className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{fixture.name}</div>
                            <div className="text-sm text-gray-500">Level: {fixture.level}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {fixture.assignedTeams?.length || 0}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {fixture.bracket?.matches?.filter((m: { status?: string }) => m?.status === 'completed').length || 0} / {fixture.bracket?.matches?.length || 0}
                        </div>
                        <div className="text-xs text-gray-500">completed</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(fixture.status)}`}>
                          {getStatusIcon(fixture.status)}
                          <span className="ml-1 capitalize">{fixture.status.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link href={`/en/volunteer/venues/${venueId}/fixtures/${fixture.id}`}>
                            <button className="text-indigo-600 hover:text-indigo-900">
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          {fixture.status === 'in_progress' && (
                            <Link href={`/en/volunteer/venues/${venueId}/matches?fixture=${fixture.id}`}>
                              <button className="text-green-600 hover:text-green-900">
                                <Play className="w-4 h-4" />
                              </button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {fixtures.map((fixture) => (
              <div key={fixture.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center flex-1">
                    <Trophy className="w-5 h-5 text-gray-400 mr-3" />
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{fixture.name}</h3>
                      <p className="text-sm text-gray-500">Level: {fixture.level}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(fixture.status)} ml-2`}>
                    {getStatusIcon(fixture.status)}
                    <span className="ml-1 capitalize">{fixture.status.replace('_', ' ')}</span>
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-xs text-gray-500">Teams</span>
                    <p className="text-sm font-medium text-gray-900">{fixture.assignedTeams?.length || 0}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Matches</span>
                    <p className="text-sm font-medium text-gray-900">
                      {fixture.bracket?.matches?.filter((m :{ status?: string }) => m?.status === 'completed').length || 0} / {fixture.bracket?.matches?.length || 0}
                    </p>
                  </div>
                </div>

                {/* Winners Display */}
                {fixture.bracket?.winners && fixture.bracket.winners.length > 0 && (
                  <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center text-green-800">
                      <Trophy className="w-4 h-4 mr-1" />
                      <span className="text-sm font-medium">Winners: {fixture.bracket.winners.length} teams advanced</span>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Link href={`/en/volunteer/venues/${venueId}/fixtures/${fixture.id}`} className="flex-1">
                    <button className="w-full flex items-center justify-center px-3 py-2 text-sm text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md border border-indigo-200">
                      <Eye className="w-4 h-4 mr-1" />
                      View Bracket
                    </button>
                  </Link>
                  {fixture.status === 'in_progress' && (
                    <Link href={`/en/volunteer/venues/${venueId}/matches?fixture=${fixture.id}`} className="flex-1">
                      <button className="w-full flex items-center justify-center px-3 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-md">
                        <Play className="w-4 h-4 mr-1" />
                        Live Matches
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tournaments created yet</h3>
          <p className="text-gray-600">Check in teams first, then create tournaments from the options above.</p>
        </div>
      )}
    </div>
  );
}
