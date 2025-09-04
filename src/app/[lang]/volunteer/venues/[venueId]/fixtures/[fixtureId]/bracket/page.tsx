'use client';

import { useParams } from 'next/navigation';
import { useOfflineTeams, useOfflineVenueData } from "@/hooks/useOfflineTeams";
import { useOfflineActions } from "@/hooks/useOfflineActions";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Trophy, Clock, Users } from 'lucide-react';
import Link from 'next/link';

export default function FixtureBracketPage() {
  const params = useParams();
  const fixtureId = params.fixtureId as string;
  const venueId = params.venueId as string;

  const { data: bracketData } = // TODO: Migrate to offline - api.volunteers.match.getFixtureBracket.useQuery({
    fixtureId
  });

  const { data: fixture } = // TODO: Migrate to offline - api.volunteers.fixture.getFixtureDetails.useQuery({
    fixtureId
  });

  if (!bracketData || !fixture) {
    return <div>Loading...</div>;
  }

  const roundOrder = ['Round of 64', 'Round of 32', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final'];
  const sortedRounds = Object.keys(bracketData.rounds).sort((a, b) => {
    const aIndex = roundOrder.indexOf(a);
    const bIndex = roundOrder.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
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

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{fixture.fixture.name}</h1>
          <p className="text-muted-foreground">
            {fixture.fixture.sport.name} • {fixture.fixture.genderCategory} • {fixture.fixture.level}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href={`/volunteer/venues/${venueId}/fixtures`}>
            <Button variant="outline">Back to Fixtures</Button>
          </Link>
          <Link href={`/volunteer/venues/${venueId}/matches`}>
            <Button>Manage Matches</Button>
          </Link>
        </div>
      </div>

      {fixture.fixture.status === 'completed' && fixture.fixture.championTeamName && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-4">
              <Trophy className="h-8 w-8 text-yellow-600" />
              <div className="text-center">
                <h2 className="text-2xl font-bold text-yellow-800">Tournament Champion</h2>
                <p className="text-xl text-yellow-700">{fixture.fixture.championTeamName}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-8">
        {sortedRounds.map((roundName) => (
          <div key={roundName}>
            <h2 className="text-2xl font-bold mb-4">{roundName}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bracketData.rounds[roundName]?.map((match: any) => (
                <Card key={match.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Match #{match.matchNumber}</CardTitle>
                      <Badge className={getStatusColor(match.status)}>
                        {match.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Teams */}
                      <div className="space-y-2">
                        <div className={`flex justify-between items-center p-2 rounded ${
                          match.winnerId === match.team1Id ? 'bg-green-100 border-green-300' : 'bg-gray-50'
                        }`}>
                          <div>
                            <div className="font-semibold">
                              {match.team1?.name || 'TBD'}
                            </div>
                            {match.team1?.tournamentNumber && (
                              <div className="text-sm text-muted-foreground">
                                #{match.team1.tournamentNumber}
                              </div>
                            )}
                          </div>
                          {match.status === 'completed' && (
                            <div className="text-xl font-bold">
                              {match.team1Score}
                            </div>
                          )}
                          {match.winnerId === match.team1Id && (
                            <Trophy className="h-4 w-4 text-green-600" />
                          )}
                        </div>

                        <div className={`flex justify-between items-center p-2 rounded ${
                          match.winnerId === match.team2Id ? 'bg-green-100 border-green-300' : 'bg-gray-50'
                        }`}>
                          <div>
                            <div className="font-semibold">
                              {match.team2?.name || 'TBD'}
                            </div>
                            {match.team2?.tournamentNumber && (
                              <div className="text-sm text-muted-foreground">
                                #{match.team2.tournamentNumber}
                              </div>
                            )}
                          </div>
                          {match.status === 'completed' && (
                            <div className="text-xl font-bold">
                              {match.team2Score}
                            </div>
                          )}
                          {match.winnerId === match.team2Id && (
                            <Trophy className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </div>

                      {/* Match Info */}
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {match.scheduledTime && (
                          <div className="flex items-center space-x-2">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(match.scheduledTime).toLocaleString()}
                            </span>
                          </div>
                        )}
                        
                        {match.actualStartTime && (
                          <div className="flex items-center space-x-2">
                            <Clock className="h-3 w-3" />
                            <span>
                              Started: {new Date(match.actualStartTime).toLocaleString()}
                            </span>
                          </div>
                        )}

                        {match.scoreDetails && (
                          <div className="text-xs bg-gray-100 p-2 rounded">
                            {match.scoreDetails}
                          </div>
                        )}
                      </div>

                      {/* Winner advances to */}
                      {match.winner && match.nextMatch && (
                        <div className="text-xs text-green-600 font-medium">
                          {match.winner.name} advances to {match.nextMatch.roundName}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {sortedRounds.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No matches found for this fixture
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
