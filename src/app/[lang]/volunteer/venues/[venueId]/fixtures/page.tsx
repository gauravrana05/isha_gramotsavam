import { adminDb } from '@/lib/firebase/admin';
import { getVenueCheckedInTeams } from '@/lib/actions/tournament/fixtureManagement';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { serializeFirestoreDocs } from '@/lib/utils/firestore';

interface PageProps {
  params: {
    venueId: string;
    lang: string;
  };
}

async function getVenueFixtures(venueId: string) {
  try {
    const fixturesSnapshot = await adminDb.collection('fixtures')
      .where('venueId', '==', venueId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return serializeFirestoreDocs(fixturesSnapshot.docs);
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    return [];
  }
}

export default async function FixturesPage({ params }: PageProps) {
  const { venueId } = params;
  const eventId = 'isha_gramotsavam_2025';

  const checkedInTeamsResult = await getVenueCheckedInTeams(venueId, eventId);
  const fixtures = await getVenueFixtures(venueId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <Link href={`/volunteer/venues/${venueId}`} className="text-blue-600">
            ← Back
          </Link>
          <h1 className="font-semibold">Tournament Fixtures</h1>
          <div className="w-12"></div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Create New Tournaments */}
        {checkedInTeamsResult.success && Object.keys(checkedInTeamsResult.teamsBySport).length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold mb-3">Create New Tournament</h2>
            <div className="space-y-3">
              {Object.entries(checkedInTeamsResult.teamsBySport).map(([sportKey, sportTeams]) => {
                const [sportId, genderCategory] = sportKey.split('_');
                const existingFixture = fixtures.find(f => 
                  f.sportId === sportId && f.genderCategory === genderCategory
                );
                
                return (
                  <div key={sportKey} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <h3 className="font-medium capitalize">
                        {sportId.replace('_', ' ')} - {genderCategory}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {sportTeams.length} teams checked in
                      </p>
                    </div>
                    
                    {existingFixture ? (
                      <Link href={`/volunteer/venues/${venueId}/fixtures/${existingFixture.id}`}>
                        <Button size="sm" variant="outline">
                          View Tournament
                        </Button>
                      </Link>
                    ) : sportTeams.length >= 2 ? (
                      <Link href={`/volunteer/venues/${venueId}/fixtures/create-draw?sport=${sportId}&gender=${genderCategory}`}>
                        <Button size="sm">
                          Create Draw
                        </Button>
                      </Link>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Need 2+ teams
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Active Fixtures */}
        {fixtures.length > 0 ? (
          <div className="space-y-3">
            <h2 className="font-semibold">Active Tournaments</h2>
            {fixtures.map(fixture => (
              <Card key={fixture.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium">{fixture.name}</h3>
                    <p className="text-sm text-gray-600">
                      {fixture.assignedTeams?.length || 0} teams • Level: {fixture.level}
                    </p>
                    <div className="flex items-center mt-1">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        fixture.status === 'completed' ? 'bg-green-500' :
                        fixture.status === 'in_progress' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`} />
                      <span className="text-sm capitalize">{fixture.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                  <div>
                    <span className="text-gray-500">Matches:</span> {fixture.bracket?.matches?.length || 0}
                  </div>
                  <div>
                    <span className="text-gray-500">Completed:</span> {
                      fixture.bracket?.matches?.filter(m => m.status === 'completed').length || 0
                    }
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Link href={`/volunteer/venues/${venueId}/fixtures/${fixture.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full">
                      View Bracket
                    </Button>
                  </Link>
                  
                  {fixture.status === 'in_progress' && (
                    <Link href={`/volunteer/venues/${venueId}/matches?fixture=${fixture.id}`} className="flex-1">
                      <Button size="sm" className="w-full">
                        Live Matches
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Winners Display */}
                {fixture.bracket?.winners && fixture.bracket.winners.length > 0 && (
                  <div className="mt-3 p-2 bg-green-50 rounded">
                    <div className="text-sm font-medium text-green-800">🏆 Winners:</div>
                    <div className="text-sm text-green-700">
                      {fixture.bracket.winners.length} team(s) advanced to next level
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <div className="text-gray-500">
              <div className="text-2xl mb-2">🏆</div>
              <div className="font-medium">No tournaments created yet</div>
              <div className="text-sm mt-1">Check in teams first, then create tournaments</div>
            </div>
          </Card>
        )}

        {/* Quick Stats */}
        {checkedInTeamsResult.success && (
          <Card className="p-4">
            <h3 className="font-medium mb-2">Venue Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-800">{checkedInTeamsResult.totalTeams}</div>
                <div className="text-gray-500">Total Teams</div>
              </div>
              <div>
                <div className="font-medium text-gray-800">{Object.keys(checkedInTeamsResult.teamsBySport).length}</div>
                <div className="text-gray-500">Sports Categories</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
