'use client';

import { useParams } from 'next/navigation';
import { api } from '@/server/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Target,
  TrendingUp,
  Award
} from 'lucide-react';

export default function ReportsPage() {
  const params = useParams();
  const venueId = params.venueId as string;

  const { data: stats } = api.volunteers.dashboard.getVenueStats.useQuery({
    venueId
  });

  const { data: fixtures } = api.volunteers.fixture.getVenueFixtures.useQuery({
    venueId
  });

  const { data: matches } = api.volunteers.match.getVenueMatchesByStatus.useQuery({
    venueId
  });

  const completionRate = stats?.totalTeams ? 
    Math.round((stats.checkedInTeams / stats.totalTeams) * 100) : 0;

  const matchStats = matches?.reduce((acc, match) => {
    acc[match.status] = (acc[match.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const fixturesByStatus = fixtures?.reduce((acc, fixture) => {
    acc[fixture.status] = (acc[fixture.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const sportStats = fixtures?.reduce((acc, fixture) => {
    const key = `${fixture.sport.name} (${fixture.genderCategory})`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tournament Reports</h1>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Participation</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <Progress value={completionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats?.checkedInTeams} of {stats?.totalTeams} teams checked in
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tournament Progress</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(((stats?.completedFixtures || 0) / Math.max(stats?.activeFixtures || 1, 1)) * 100)}%
            </div>
            <Progress 
              value={((stats?.completedFixtures || 0) / Math.max(stats?.activeFixtures || 1, 1)) * 100} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-2">
              {stats?.completedFixtures} of {(stats?.activeFixtures || 0) + (stats?.completedFixtures || 0)} fixtures completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Match Completion</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(((matchStats.completed || 0) / Math.max(matches?.length || 1, 1)) * 100)}%
            </div>
            <Progress 
              value={((matchStats.completed || 0) / Math.max(matches?.length || 1, 1)) * 100} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-2">
              {matchStats.completed || 0} of {matches?.length || 0} matches completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sports</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(sportStats).length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Different sport categories
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Match Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Match Status Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(matchStats).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{count}</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round((count / (matches?.length || 1)) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fixture Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5" />
              <span>Fixture Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(fixturesByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{count}</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round((count / (fixtures?.length || 1)) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sport Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Sport Categories</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(sportStats).map(([sport, count]) => (
                <div key={sport} className="flex items-center justify-between">
                  <div className="font-medium text-sm">{sport}</div>
                  <Badge variant="secondary">{count} fixtures</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Performance Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Average matches per fixture</span>
                <span className="font-semibold">
                  {fixtures?.length ? Math.round((matches?.length || 0) / fixtures.length) : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Teams per sport category</span>
                <span className="font-semibold">
                  {Object.keys(sportStats).length ? Math.round((stats?.totalTeams || 0) / Object.keys(sportStats).length) : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Tournament efficiency</span>
                <span className="font-semibold">
                  {Math.round(((matchStats.completed || 0) + (matchStats.in_progress || 0)) / Math.max(matches?.length || 1, 1) * 100)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
