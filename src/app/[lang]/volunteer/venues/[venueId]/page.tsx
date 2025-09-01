'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/server/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/Progress';
import { 
  Users, 
  Trophy, 
  Clock, 
  CheckCircle, 
  Calendar,
  Hash,
  Camera,
  BarChart3,
  Settings,
  FileText
} from 'lucide-react';

export default function VolunteerVenueDashboard() {
  const params = useParams();
  const venueId = params.venueId as string;

  const { data: venueStats } = api.volunteers.dashboard.getVenueStats.useQuery({
    venueId
  });

  const { data: todayMatches } = api.volunteers.match.getVenueMatchesByStatus.useQuery({
    venueId,
    status: undefined
  });

  const { data: pendingTeams } = api.volunteers.team.getTeamsPendingVerification.useQuery({
    venueId
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'ready': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const todayMatchesByStatus = todayMatches?.reduce((acc, match) => {
    acc[match.status] = (acc[match.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Venue Dashboard</h1>
          <p className="text-muted-foreground">
            {venueStats?.venueName || 'Loading...'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href={`/volunteer/venues/${venueId}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{venueStats?.totalTeams || 0}</div>
            <p className="text-xs text-muted-foreground">
              {venueStats?.checkedInTeams || 0} checked in
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Fixtures</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{venueStats?.activeFixtures || 0}</div>
            <p className="text-xs text-muted-foreground">
              {venueStats?.completedFixtures || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Matches</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayMatches?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {todayMatchesByStatus.completed || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTeams?.length || 0}</div>
            <p className="text-xs text-muted-foreground">teams waiting</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Team Check-In</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Check in verified teams for match day participation
            </p>
            <Link href={`/volunteer/venues/${venueId}/checkin`}>
              <Button className="w-full">
                Manage Check-In
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Hash className="h-5 w-5 text-blue-600" />
              <span>Tournament Numbers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Assign tournament numbers to checked-in teams
            </p>
            <Link href={`/volunteer/venues/${venueId}/numbers`}>
              <Button className="w-full">
                Assign Numbers
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <span>Fixture Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Create and manage tournament fixtures
            </p>
            <Link href={`/volunteer/venues/${venueId}/fixtures`}>
              <Button className="w-full">
                Manage Fixtures
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <span>Match Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Schedule matches and record results
            </p>
            <Link href={`/volunteer/venues/${venueId}/matches`}>
              <Button className="w-full">
                Manage Matches
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <span>Team Verification</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Verify team documents and player eligibility
            </p>
            <Link href={`/volunteer/verification`}>
              <Button className="w-full">
                Verify Teams
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              <span>Reports</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate tournament reports and statistics
            </p>
            <Link href={`/volunteer/venues/${venueId}/reports`}>
              <Button className="w-full">
                View Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today&apos;s Matches */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayMatches?.slice(0, 5).map((match) => (
                <div key={match.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">
                      {match.team1?.name || 'TBD'} vs {match.team2?.name || 'TBD'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {match.fixture.name} • {match.roundName}
                    </div>
                  </div>
                  <Badge className={getStatusColor(match.status)}>
                    {match.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              ))}
              
              {todayMatches?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No matches scheduled for today
                </p>
              )}
              
              {(todayMatches?.length || 0) > 5 && (
                <Link href={`/volunteer/venues/${venueId}/matches`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View All Matches
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Verifications */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTeams?.slice(0, 5).map((team) => (
                <div key={team.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{team.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {team.sport.name} • {team.captainName}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {team.teamPlayers.length} players pending
                  </Badge>
                </div>
              ))}
              
              {pendingTeams?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No teams pending verification
                </p>
              )}
              
              {(pendingTeams?.length || 0) > 5 && (
                <Link href={`/volunteer/verification`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View All Pending
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
