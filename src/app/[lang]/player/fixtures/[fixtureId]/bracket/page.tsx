'use client';

import { useParams } from 'next/navigation';
import { api } from '~/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Trophy, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PlayerFixtureBracketPage() {
  const params = useParams();
  const fixtureId = params.fixtureId as string;

  const { data: bracketData } = api.volunteers.match.getFixtureBracket.useQuery({
    fixtureId
  });

  const { data: fixture } = api.volunteers.fixture.getFixtureDetails.useQuery({
    fixtureId
  });

  const { data: userTeams } = api.teams.management.getUserPlayerTeams.useQuery();

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

  const isMyTeam = (teamId: string | null) => {
    return userTeams?.some(playerTeam => playerTeam.teamId === teamId);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Link href="/player/fixtures">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Fixtures
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">{fixture.fixture.name}</h1>
          <p className="text-muted-foreground">
            {fixture.fixture.sport.name} • {fixture.fixture.genderCategory} • {fixture.fixture.level}
          </p>
          <p className="text-sm text-blue-600">
            {fixture.fixture.venueLevelMapping.venue.name}
          </p>
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
              {bracketData.rounds[roundName]?.map((match: any) => {
                const hasMyTeam = isMyTeam(match.team1Id) || isMyTeam(match.team2Id);
                
                return (
                  <Card key={match.id} className={hasMyTeam ? 'ring-2 ring-blue-500' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Match #{match.matchNumber}</CardTitle>
                        <div className="flex space-x-2">
                          <Badge className={getStatusColor(match.status)}>
                            {match.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {hasMyTeam && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              My Team
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className={`flex justify-between items-center p-2 rounded ${
                            match.winnerId === match.team1Id ? 'bg-green-100 border-green-300' : 
                            isMyTeam(match.team1Id) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
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
                            match.winnerId === match.team2Id ? 'bg-green-100 border-green-300' : 
                            isMyTeam(match.team2Id) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
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

                        {match.scheduledTime && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(match.scheduledTime).toLocaleString()}
                            </span>
                          </div>
                        )}

                        {match.scoreDetails && (
                          <div className="text-xs bg-gray-100 p-2 rounded">
                            {match.scoreDetails}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
