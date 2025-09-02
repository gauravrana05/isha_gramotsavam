'use client';

import { useParams } from 'next/navigation';
import { api } from '@/server/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Trophy, Clock, Calendar, ArrowLeft, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function PlayerFixtureMatchesPage() {
  const params = useParams();
  const fixtureId = params.fixtureId as string;
  const lang = params.lang as string;

  const { data: fixture } = api.volunteers.fixture.getFixtureDetails.useQuery({
    fixtureId
  });

  const { data: userPlayerTeams } = api.teams.management.getUserPlayerTeams.useQuery();
  const teamIds = userPlayerTeams?.map(playerTeam => playerTeam.teamId) || [];

  const myMatches = fixture?.fixture.matches.filter(match => 
    teamIds.some(teamId => teamId === match.team1Id || teamId === match.team2Id)
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-gray-500';
      case 'ready': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getMyTeam = (match: any) => {
    const playerTeam = userPlayerTeams?.find(pt => pt.teamId === match.team1Id || pt.teamId === match.team2Id);
    return playerTeam ? { id: playerTeam.teamId, name: playerTeam.team.name } : null;
  };

  const getOpponentTeam = (match: any) => {
    const myTeam = getMyTeam(match);
    if (!myTeam) return null;
    return myTeam.id === match.team1Id ? match.team2 : match.team1;
  };

  if (!fixture) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Link href={`/${lang}/player/fixtures/${fixtureId}/bracket`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Bracket
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">My Team Matches</h1>
          <p className="text-muted-foreground">
            {fixture.fixture.name} • {fixture.fixture.sport.name}
          </p>
          <div className="flex items-center space-x-2 text-sm text-blue-600 mt-1">
            <MapPin className="h-4 w-4" />
            <span>{fixture.fixture.venueLevelMapping.venue.name}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {myMatches.map((match) => {
          const myTeam = getMyTeam(match);
          const opponent = getOpponentTeam(match);
          const isWinner = match.winnerId === myTeam?.id;
          const isLoser = match.winnerId && match.winnerId !== myTeam?.id;

          return (
            <Card key={match.id} className={`${
              isWinner ? 'border-green-500 bg-green-50' : 
              isLoser ? 'border-red-500 bg-red-50' : 
              'border-blue-500 bg-blue-50'
            }`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {match.roundName} - Match #{match.matchNumber}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {myTeam?.name} vs {opponent?.name || 'TBD'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={getStatusColor(match.status)}>
                      {match.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {isWinner && (
                      <Badge className="bg-green-500">
                        WON
                      </Badge>
                    )}
                    {isLoser && (
                      <Badge className="bg-red-500">
                        LOST
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Match Result */}
                  {match.status === 'completed' && (
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {myTeam?.id === match.team1Id ? match.team1Score : match.team2Score}
                        {' - '}
                        {myTeam?.id === match.team1Id ? match.team2Score : match.team1Score}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {myTeam?.name} vs {opponent?.name}
                      </div>
                    </div>
                  )}

                  {/* Match Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-semibold text-blue-600">My Team</div>
                      <div>{myTeam?.name}</div>
                    </div>
                    <div>
                      <div className="font-semibold">Opponent</div>
                      <div>{opponent?.name || 'TBD'}</div>
                    </div>
                  </div>

                  {/* Timing */}
                  {match.scheduledTime && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Scheduled: {new Date(match.scheduledTime).toLocaleString()}</span>
                    </div>
                  )}

                  {match.actualStartTime && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Started: {new Date(match.actualStartTime).toLocaleString()}</span>
                    </div>
                  )}

                  {/* Score Details */}
                  {match.scoreDetails && (
                    <div className="text-xs bg-white p-3 rounded border">
                      <div className="font-semibold mb-1">Match Details:</div>
                      {match.scoreDetails}
                    </div>
                  )}

                  {/* Next Match Info */}
                  {isWinner && match.nextMatch && (
                    <div className="text-sm text-green-600 font-medium bg-green-100 p-2 rounded">
                      🎉 Your team advances to {match.nextMatch.roundName}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {myMatches.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No matches found for your teams in this fixture
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
