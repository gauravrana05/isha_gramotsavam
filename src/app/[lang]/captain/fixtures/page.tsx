'use client';

import { api } from '@/server/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Trophy, Users, Eye, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function CaptainFixturesPage() {
  const { lang } = useParams();
  const { data: captainTeams } = api.teams.management.getUserTeams.useQuery();
  
  // Extract team IDs from captain teams
  const teamIds = captainTeams?.map(team => team.id) || [];
  
  const { data: fixtures } = api.fixtures.getTeamFixtures.useQuery({
    teamIds
  }, {
    enabled: teamIds.length > 0
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'teams_assigned': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Team Fixtures</h1>
      </div>

      <div className="grid gap-4">
        {fixtures?.map((fixture) => (
          <Card key={fixture.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{fixture.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {fixture.sport.name} • {fixture.genderCategory} • {fixture.level}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    {fixture.venueLevelMapping.venue.name}
                  </p>
                </div>
                <Badge className={getStatusColor(fixture.status)}>
                  {fixture.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-4 w-4" />
                    <span className="text-sm">{fixture.matches?.length || 0} matches</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">
                      {fixture.matches?.filter(m => m.status === 'completed').length || 0} completed
                    </span>
                  </div>
                  {fixture.championTeamName && (
                    <div className="flex items-center space-x-2 text-yellow-600">
                      <Trophy className="h-4 w-4" />
                      <span className="text-sm font-semibold">Champion: {fixture.championTeamName}</span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Link href={`/${lang}/captain/fixtures/${fixture.id}/bracket`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Bracket
                    </Button>
                  </Link>
                  <Link href={`/${lang}/captain/fixtures/${fixture.id}/matches`}>
                    <Button size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      My Matches
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {fixtures?.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {teamIds.length === 0 
                  ? 'You are not captain of any teams' 
                  : 'No fixtures found for your teams'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
