'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { AdvancedTable, PageLoader } from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import { 
  Calendar, 
  Trophy, 
  MapPin,
  Clock,
  CheckCircle,
  Play,
  Users,
  AlertCircle,
  Eye,
  Target
} from 'lucide-react';
import Link from 'next/link';

interface FixtureRow {
  id: string;
  name: string;
  sportName: string;
  team1Name: string;
  team2Name: string;
  scheduledAt: string;
  venueName: string;
  venueAddress: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  level: 'cluster' | 'division' | 'final';
  round: string;
}

export default function CaptainFixturesPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // Fetch captain's team
  const { 
    data: teamData, 
    isLoading: teamLoading 
  } = api.teams.management.getMyTeam.useQuery(
    undefined,
    { enabled: !!user && user.role === 'captain' }
  );

  // Fetch fixtures for captain's team
  const { 
    data: fixturesData, 
    isLoading: fixturesLoading,
    error: fixturesError
  } = api.fixtures.getTeamFixtures.useQuery(
    { teamId: teamData?.id || '' },
    { enabled: !!teamData?.id }
  );

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (user.role !== 'captain') {
      router.push(`/${lang}/dashboard`);
      return;
    }

    if (!userProfile?.profileComplete) {
      router.push(`/${lang}/profile/complete`);
      return;
    }
  }, [user, userProfile, authLoading, router, lang]);

  // Process fixtures data
  const fixtures = useMemo(() => {
    if (!fixturesData?.fixtures) return [];
    
    return fixturesData.fixtures.map(fixture => ({
      id: fixture.id,
      name: fixture.name,
      sportName: fixture.sport?.name || 'Unknown Sport',
      team1Name: fixture.team1?.name || 'TBD',
      team2Name: fixture.team2?.name || 'TBD',
      scheduledAt: fixture.scheduledAt,
      venueName: fixture.venue?.name || 'TBD',
      venueAddress: fixture.venue?.address || '',
      status: fixture.status,
      level: fixture.level,
      round: fixture.round || 'Round 1'
    }));
  }, [fixturesData?.fixtures]);

  // Table columns
  const columns: Column<FixtureRow>[] = useMemo(() => [
    {
      key: 'fixture',
      header: 'Fixture',
      accessor: 'name',
      sortable: true,
      minWidth: 250,
      render: (_, fixture) => (
        <div>
          <div className="font-medium text-gray-900">{fixture.name}</div>
          <div className="text-sm text-gray-500 flex items-center mt-1">
            <Trophy className="w-4 h-4 mr-1" />
            {fixture.sportName}
          </div>
        </div>
      )
    },
    {
      key: 'teams',
      header: 'Teams',
      accessor: 'team1Name',
      sortable: true,
      minWidth: 200,
      render: (_, fixture) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {fixture.team1Name}
          </div>
          <div className="text-gray-500 my-1">vs</div>
          <div className="font-medium text-gray-900">
            {fixture.team2Name}
          </div>
        </div>
      )
    },
    {
      key: 'schedule',
      header: 'Schedule',
      accessor: 'scheduledAt',
      sortable: true,
      minWidth: 180,
      render: (scheduledAt) => (
        <div className="text-sm">
          <div className="flex items-center text-gray-900">
            <Calendar className="w-4 h-4 mr-1" />
            {new Date(scheduledAt).toLocaleDateString()}
          </div>
          <div className="flex items-center text-gray-500 mt-1">
            <Clock className="w-4 h-4 mr-1" />
            {new Date(scheduledAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      )
    },
    {
      key: 'venue',
      header: 'Venue',
      accessor: 'venueName',
      sortable: true,
      minWidth: 180,
      render: (_, fixture) => (
        <div className="text-sm">
          <div className="flex items-center text-gray-900">
            <MapPin className="w-4 h-4 mr-1" />
            {fixture.venueName}
          </div>
          {fixture.venueAddress && (
            <div className="text-gray-500 mt-1">{fixture.venueAddress}</div>
          )}
        </div>
      )
    },
    {
      key: 'level',
      header: 'Level',
      accessor: 'level',
      sortable: true,
      minWidth: 120,
      render: (level) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          level === 'final' 
            ? 'bg-yellow-100 text-yellow-800' 
            : level === 'division'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-green-100 text-green-800'
        }`}>
          <Target className="w-3 h-3 mr-1" />
          {level.charAt(0).toUpperCase() + level.slice(1)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      minWidth: 120,
      render: (status) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          status === 'completed' 
            ? 'bg-green-100 text-green-800' 
            : status === 'in_progress'
            ? 'bg-blue-100 text-blue-800'
            : status === 'cancelled'
            ? 'bg-red-100 text-red-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {status === 'completed' ? (
            <>
              <CheckCircle className="w-3 h-3 mr-1" />
              Completed
            </>
          ) : status === 'in_progress' ? (
            <>
              <Play className="w-3 h-3 mr-1" />
              In Progress
            </>
          ) : status === 'cancelled' ? (
            <>
              <AlertCircle className="w-3 h-3 mr-1" />
              Cancelled
            </>
          ) : (
            <>
              <Clock className="w-3 h-3 mr-1" />
              Scheduled
            </>
          )}
        </span>
      )
    }
  ], []);

  if (authLoading || teamLoading) {
    return <PageLoader message="Loading fixtures..." />;
  }

  if (!teamData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Team Found</h1>
          <p className="text-gray-600 mb-4">You don't have a team yet. Create one to get started.</p>
          <Link 
            href={`/${lang}/register/team`}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Create Team
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fixtures</h1>
            <p className="text-gray-600 mt-2">View your team's match schedule and results</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{teamData.name}</span> • {teamData.sport?.name}
            </div>
          </div>
        </div>
      </div>

      {/* Fixtures Table */}
      <AdvancedTable<FixtureRow>
        data={fixtures}
        columns={columns}
        loading={fixturesLoading}

        searchable={true}
        searchPlaceholder="Search fixtures by name, teams, venue..."

        filterable={true}
        filters={[
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'All Statuses', value: '' },
              { label: 'Scheduled', value: 'scheduled' },
              { label: 'In Progress', value: 'in_progress' },
              { label: 'Completed', value: 'completed' },
              { label: 'Cancelled', value: 'cancelled' }
            ]
          },
          {
            key: 'level',
            label: 'Level',
            type: 'select',
            options: [
              { label: 'All Levels', value: '' },
              { label: 'Cluster', value: 'cluster' },
              { label: 'Division', value: 'division' },
              { label: 'Final', value: 'final' }
            ]
          }
        ]}

        sortable={true}
        defaultSort={[{ key: 'scheduledAt', direction: 'asc' }]}

        pagination={{ enabled: true }}

        keyExtractor={(fixture) => fixture.id}

        actions={[
          {
            label: 'View Details',
            icon: Eye,
            onClick: (fixture) => {
              router.push(`/${lang}/captain/fixtures/${fixture.id}`);
            },
            variant: 'secondary'
          }
        ]}

        emptyState={{
          icon: Calendar,
          title: 'No fixtures found',
          description: 'Your team doesn\'t have any scheduled matches yet.',
          action: {
            label: 'Back to Dashboard',
            onClick: () => router.push(`/${lang}/captain/dashboard`)
          }
        }}

        noSearchResultsEmptyState={{
          icon: Calendar,
          title: 'No matching fixtures',
          description: 'Try adjusting your search or filters to find what you\'re looking for.'
        }}
      />
    </div>
  );
}
  genderCategory: string;
  venue: {
    id: string;
    name: string;
    address: string;
    district: string;
    state: string;
  };
  status: string;
  level: string;
  assignedTeams: Array<{
    id: string;
    name: string;
    tournamentNumber?: number;
  }>;
  totalMatches: number;
  completedMatches: number;
  createdAt: string;
  updatedAt: string;
  hasCaptainTeam?: boolean;
  captainTeamNames?: string[];
}

export default function CaptainFixturesPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // Get teams using tRPC
  const { data: teams = [], isLoading: teamsLoading, error: teamsError } = api.teams.management.getMyTeams.useQuery(
    undefined,
    {
      enabled: !authLoading && !!user && userProfile?.profileComplete && user.role === 'captain',
    }
  );

  // Get fixtures using tRPC
  const { data: fixtures = [], isLoading: fixturesLoading, error: fixturesError } = api.teams.management.getMyTeamFixtures.useQuery(
    undefined,
    {
      enabled: !authLoading && !!user && userProfile?.profileComplete && (user.role === 'captain' || user.role === 'player'),
    }
  );

  const loading = authLoading || teamsLoading || fixturesLoading;
  const error = teamsError?.message || fixturesError?.message;

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (!userProfile?.profileComplete) {
      router.push(`/${lang}/profile/complete`);
      return;
    }
  }, [user, userProfile, authLoading, router, lang]);


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

  const getTeamStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // AdvancedTable configuration
  const columns: Column<CaptainFixture>[] = [
    {
      key: 'name',
      header: 'Tournament',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center">
            <Trophy className="w-5 h-5 text-gray-400 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {item.name}
                {item.hasCaptainTeam && (
                  <Star className="w-4 h-4 text-yellow-500 ml-2 inline" />
                )}
              </div>
              <div className="text-sm text-gray-500">{item.sportName} • {item.genderCategory}</div>
              <div className="text-sm text-gray-500">Level: {item.level}</div>
              {item.hasCaptainTeam && item.captainTeamNames && (
                <div className="text-xs text-blue-600 mt-1">
                  Your teams: {item.captainTeamNames.join(', ')}
                </div>
              )}
            </div>
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'venue',
      header: 'Venue',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div>
            {item.venue ? (
              <div>
                <div className="text-sm font-medium text-gray-900 flex items-center">
                  <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                  {item.venue.name}
                </div>
                <div className="text-xs text-gray-500">{item.venue.address}</div>
              </div>
            ) : (
              <span className="text-sm text-gray-500">Venue TBD</span>
            )}
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'assignedTeams',
      header: 'Teams',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center">
            <Users className="w-4 h-4 text-gray-400 mr-1" />
            <span className="text-sm text-gray-900">{item.assignedTeams?.length || 0}</span>
          </div>
        );
      }
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div>
            <div className="text-sm text-gray-900">{item.completedMatches} / {item.totalMatches}</div>
            <div className="text-xs text-gray-500">matches completed</div>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
            {getStatusIcon(item.status)}
            <span className="ml-1 capitalize">{item.status.replace('_', ' ')}</span>
          </span>
        );
      },
      sortable: true
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => router.push(`/${lang}/captain/fixtures/${item.id}`)}
              className="text-[#F28C38] hover:text-[#E67A26] flex items-center text-sm"
            >
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </button>
            <button
              onClick={() => router.push(`/${lang}/captain/teams`)}
              className="text-gray-600 hover:text-gray-800 flex items-center text-sm"
            >
              <UserCheck className="w-4 h-4 mr-1" />
              Manage Teams
            </button>
          </div>
        );
      }
    }
  ];

  const filters: FilterField[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'All', value: '' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' }
      ]
    },
    {
      key: 'level',
      label: 'Level',
      type: 'select',
      options: [
        { label: 'All Levels', value: '' },
        ...Array.from(new Set(fixtures.map(f => f.level))).map(level => ({
          label: level,
          value: level
        }))
      ]
    },
    {
      key: 'hasCaptainTeam',
      label: 'My Teams Only',
      type: 'select',
      options: [
        { label: 'All Tournaments', value: '' },
        { label: 'My Teams Only', value: 'true' }
      ]
    },
    {
      key: 'sportName',
      label: 'Sport',
      type: 'text'
    }
  ];

  // Custom filter function for hasCaptainTeam
  const customFilterFunction = (item: CaptainFixture, filters: Record<string, any>): boolean => {
    if (filters.hasCaptainTeam === 'true') {
      return item.hasCaptainTeam === true;
    }
    return true;
  };

  if (authLoading || loading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <Image 
              src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" 
              alt="Isha Logo" 
              width={80} 
              height={80} 
              className="mx-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-[#4A2F1D] mb-2">
            Tournament Fixtures
          </h1>
          <p className="text-gray-600">
            View tournaments and fixture schedules for your teams
          </p>
        </div>

        {/* Teams Overview */}
        {teams.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#4A2F1D] mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Your Teams
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <div key={team.teamId} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTeamStatusColor(team.status)}`}>
                      {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Trophy className="w-4 h-4 mr-1" />
                      {team.sportName}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {team.panchayat}, {team.district}
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {team.currentPlayers}/{team.maxPlayers} players
                    </div>
                    {team.venue && (
                      <div className="text-xs text-blue-600 mt-2">
                        Venue: {team.venue.name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tournament Fixtures Table */}
        <AdvancedTable
          title="Tournament Fixtures"
          subtitle="View tournaments and fixture schedules for your teams"
          data={fixtures}
          columns={columns}
          loading={loading}
          
          searchable={true}
          searchPlaceholder="Search tournaments, sports, venues..."
          searchFields={['name', 'sportName']}
          
          filterable={true}
          filters={filters}
          
          sortable={true}
          defaultSort={[{ key: 'createdAt', direction: 'desc' }]}
          
          pagination={{ enabled: true, pageSize: 10 }}
          
          persistState={true}
          stateKey="captain-fixtures"
          
          emptyState={{
            icon: Calendar,
            title: teams.length > 0 ? 'No Fixtures Available' : 'No Teams Created',
            description: teams.length > 0 
              ? 'No tournament fixtures have been created for your team venues yet.'
              : "You haven't created any teams yet. Create a team to see fixture schedules."
          }}
        />
      </div>
    </div>
  );
}