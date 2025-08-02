import { adminDb } from '@/lib/firebase/admin';
import { getVenueTeams } from '@/lib/actions/volunteer/teamCheckin';
import { getVenueCheckedInTeams } from '@/lib/actions/tournament/fixtureManagement';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface PageProps {
  params: {
    venueId: string;
    lang: string;
  };
}

async function getVenueDetails(venueId: string) {
  try {
    const venueDoc = await adminDb.collection('venues').doc(venueId).get();
    if (!venueDoc.exists) {
      return null;
    }
    return { id: venueDoc.id, ...venueDoc.data() };
  } catch (error) {
    console.error('Error fetching venue:', error);
    return null;
  }
}

async function getVenueFixtures(venueId: string) {
  try {
    const fixturesSnapshot = await adminDb.collection('fixtures')
      .where('venueId', '==', venueId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return fixturesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    return [];
  }
}

export default async function TechnicalVolunteerVenueDashboard({ params }: PageProps) {
  const { venueId } = params;
  const eventId = 'isha_gramotsavam_2025'; // This should come from context/params

  const venue = await getVenueDetails(venueId);
  const teamsResult = await getVenueTeams(venueId, eventId);
  const checkedInTeamsResult = await getVenueCheckedInTeams(venueId, eventId);
  const fixtures = await getVenueFixtures(venueId);

  if (!venue) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Venue Not Found</h1>
          <p className="mt-2 text-gray-600">The requested venue could not be found.</p>
        </div>
      </div>
    );
  }

  const teams = teamsResult.success ? teamsResult.teams : [];
  const checkedInTeams = checkedInTeamsResult.success ? checkedInTeamsResult.teams : [];
  const totalTeams = teams.length;
  const checkedInCount = teams.filter(team => team.checkedIn).length;

  return (
    <div className="p-6 space-y-6">
      {/* Venue Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{venue.name}</h1>
            <p className="text-gray-600">{venue.location}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{checkedInCount}/{totalTeams}</div>
            <div className="text-sm text-gray-500">Teams Checked In</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href={`/volunteer/venues/${venueId}/teams`}>
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{checkedInCount}</div>
              <div className="text-sm font-medium">Checked In Teams</div>
              <div className="text-xs text-gray-500 mt-1">Manage Check-ins</div>
            </div>
          </Card>
        </Link>

        <Link href={`/volunteer/venues/${venueId}/fixtures`}>
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{fixtures.length}</div>
              <div className="text-sm font-medium">Active Fixtures</div>
              <div className="text-xs text-gray-500 mt-1">Tournament Brackets</div>
            </div>
          </Card>
        </Link>

        <Link href={`/volunteer/venues/${venueId}/matches`}>
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {fixtures.reduce((total, fixture) => total + (fixture.bracket?.matches?.length || 0), 0)}
              </div>
              <div className="text-sm font-medium">Total Matches</div>
              <div className="text-xs text-gray-500 mt-1">Match Management</div>
            </div>
          </Card>
        </Link>

        <Link href={`/volunteer/venues/${venueId}/media`}>
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">📸</div>
              <div className="text-sm font-medium">Media</div>
              <div className="text-xs text-gray-500 mt-1">Photos & Videos</div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Sports Overview */}
      {checkedInTeamsResult.success && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Sports Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(checkedInTeamsResult.teamsBySport).map(([sportKey, sportTeams]) => {
              const [sportId, genderCategory] = sportKey.split('_');
              return (
                <div key={sportKey} className="p-4 border rounded-lg">
                  <h3 className="font-medium capitalize">
                    {sportId.replace('_', ' ')} - {genderCategory}
                  </h3>
                  <div className="mt-2 text-sm text-gray-600">
                    {sportTeams.length} teams checked in
                  </div>
                  
                  {sportTeams.length >= 2 && (
                    <Link href={`/volunteer/venues/${venueId}/fixtures/create-draw?sport=${sportId}&gender=${genderCategory}`}>
                      <Button size="sm" className="mt-2">
                        Create Tournament
                      </Button>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Active Fixtures */}
      {fixtures.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Active Tournaments</h2>
          <div className="space-y-3">
            {fixtures.map(fixture => (
              <div key={fixture.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <h3 className="font-medium">{fixture.name}</h3>
                  <p className="text-sm text-gray-600">
                    {fixture.assignedTeams?.length || 0} teams • Status: {fixture.status}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Link href={`/volunteer/venues/${venueId}/fixtures/${fixture.id}`}>
                    <Button size="sm" variant="outline">
                      Manage
                    </Button>
                  </Link>
                  {fixture.status === 'in_progress' && (
                    <Link href={`/volunteer/venues/${venueId}/matches?fixture=${fixture.id}`}>
                      <Button size="sm">
                        Live Matches
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Teams Status */}
      {teams.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Team Status</h2>
          <div className="space-y-2">
            {teams.slice(0, 5).map(team => (
              <div key={team.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <span className="font-medium">{team.name}</span>
                  <span className="ml-2 text-sm text-gray-600">
                    {team.verifiedPlayersCount}/{team.playerCount} verified
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${
                    team.checkedIn ? 'bg-green-500' : 
                    team.allPlayersVerified ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm">
                    {team.checkedIn ? 'Checked In' : 
                     team.allPlayersVerified ? 'Ready' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
            {teams.length > 5 && (
              <Link href={`/volunteer/venues/${venueId}/teams`}>
                <Button variant="outline" size="sm" className="w-full mt-2">
                  View All {teams.length} Teams
                </Button>
              </Link>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
