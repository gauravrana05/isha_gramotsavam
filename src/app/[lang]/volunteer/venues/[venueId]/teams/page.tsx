import { adminDb } from '@/lib/firebase/admin';
import { getVenueTeams } from '@/lib/actions/volunteer/teamCheckin';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface PageProps {
  params: {
    venueId: string;
    lang: string;
  };
}

export default async function TeamsCheckInPage({ params }: PageProps) {
  const { venueId } = params;
  const eventId = 'isha_gramotsavam_2025';

  const teamsResult = await getVenueTeams(venueId, eventId);
  const teams = teamsResult.success ? teamsResult.teams : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <Link href={`/volunteer/venues/${venueId}`} className="text-blue-600">
            ← Back
          </Link>
          <h1 className="font-semibold">Team Check-In</h1>
          <div className="w-12"></div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="p-3 text-center">
            <div className="text-lg font-bold text-gray-800">{teams.length}</div>
            <div className="text-xs text-gray-500">Total Teams</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-lg font-bold text-green-600">
              {teams.filter(t => t.checkedIn).length}
            </div>
            <div className="text-xs text-gray-500">Checked In</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-lg font-bold text-orange-600">
              {teams.filter(t => !t.checkedIn).length}
            </div>
            <div className="text-xs text-gray-500">Pending</div>
          </Card>
        </div>

        {/* Teams List */}
        <div className="space-y-3">
          {teams.map(team => (
            <Card key={team.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-800">{team.name}</h3>
                <div className={`w-3 h-3 rounded-full ${
                  team.checkedIn ? 'bg-green-500' : 
                  team.allPlayersVerified ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <div>Sport: {team.sportName} ({team.genderCategory})</div>
                <div>Players: {team.verifiedPlayersCount}/{team.playerCount} verified</div>
                {team.tournamentNumber && (
                  <div>Tournament #: {team.tournamentNumber}</div>
                )}
              </div>

              <div className="mt-3 flex space-x-2">
                {!team.checkedIn ? (
                  <>
                    <Link href={`/volunteer/venues/${venueId}/teams/${team.id}/check-in`} className="flex-1">
                      <Button 
                        size="sm" 
                        className="w-full"
                        disabled={!team.allPlayersVerified}
                      >
                        {team.allPlayersVerified ? 'Check In' : 'Verify Players'}
                      </Button>
                    </Link>
                    <Link href={`/volunteer/venues/${venueId}/teams/${team.id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                  </>
                ) : (
                  <div className="flex-1 text-center">
                    <span className="text-green-600 font-medium">✓ Checked In</span>
                    {team.checkedInAt && (
                      <div className="text-xs text-gray-500">
                        {new Date(team.checkedInAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}

          {teams.length === 0 && (
            <Card className="p-6 text-center">
              <div className="text-gray-500">
                <div className="text-2xl mb-2">📋</div>
                <div>No teams assigned to this venue</div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
