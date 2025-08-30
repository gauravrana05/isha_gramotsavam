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
  myTeamName: string;
  isMyTeam1: boolean;
  isMyTeam2: boolean;
  scheduledAt: string;
  venueName: string;
  venueAddress: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  level: 'cluster' | 'division' | 'final';
  round: string;
}

export default function PlayerFixturesPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // Fetch player's teams first
  const { 
    data: teamsData, 
    isLoading: teamsLoading 
  } = api.teams.players.getPlayerTeams.useQuery(
    { playerId: user?.id || '' },
    { enabled: !!user && user.role === 'player' }
  );

  // Fetch fixtures for player's teams
  const { 
    data: fixturesData, 
    isLoading: fixturesLoading,
    error: fixturesError
  } = api.fixtures.getPlayerFixtures.useQuery(
    { playerId: user?.id || '' },
    { enabled: !!user && !!teamsData }
  );

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (user.role !== 'player') {
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
    if (!fixturesData?.fixtures || !teamsData?.teams) return [];
    
    const playerTeamIds = teamsData.teams.map(t => t.team.id);
    
    return fixturesData.fixtures.map(fixture => {
      const isMyTeam1 = playerTeamIds.includes(fixture.team1?.id || '');
      const isMyTeam2 = playerTeamIds.includes(fixture.team2?.id || '');
      const myTeamName = isMyTeam1 ? fixture.team1?.name : isMyTeam2 ? fixture.team2?.name : '';
      
      return {
        id: fixture.id,
        name: fixture.name,
        sportName: fixture.sport?.name || 'Unknown Sport',
        team1Name: fixture.team1?.name || 'TBD',
        team2Name: fixture.team2?.name || 'TBD',
        myTeamName: myTeamName || '',
        isMyTeam1,
        isMyTeam2,
        scheduledAt: fixture.scheduledAt,
        venueName: fixture.venue?.name || 'TBD',
        venueAddress: fixture.venue?.address || '',
        status: fixture.status,
        level: fixture.level,
        round: fixture.round || 'Round 1'
      };
    });
  }, [fixturesData?.fixtures, teamsData?.teams]);

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
          <div className={`font-medium ${
            fixture.isMyTeam1 ? 'text-[#F28C38]' : 'text-gray-900'
          }`}>
            {fixture.team1Name}
            {fixture.isMyTeam1 && <span className="ml-1 text-xs">(You)</span>}
          </div>
          <div className="text-gray-500 my-1">vs</div>
          <div className={`font-medium ${
            fixture.isMyTeam2 ? 'text-[#F28C38]' : 'text-gray-900'
          }`}>
            {fixture.team2Name}
            {fixture.isMyTeam2 && <span className="ml-1 text-xs">(You)</span>}
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

  if (authLoading || teamsLoading) {
    return <PageLoader message="Loading fixtures..." />;
  }

  if (!teamsData?.teams?.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Teams Found</h1>
          <p className="text-gray-600 mb-4">You're not part of any team yet. Wait for a captain to invite you.</p>
          <Link 
            href={`/${lang}/player/teams`}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            View Teams
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
            <p className="text-gray-600 mt-2">View your team's match schedule and upcoming games</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{teamsData.teams.length}</span> team{teamsData.teams.length !== 1 ? 's' : ''}
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
              router.push(`/${lang}/player/fixtures/${fixture.id}`);
            },
            variant: 'secondary'
          }
        ]}

        emptyState={{
          icon: Calendar,
          title: 'No fixtures found',
          description: 'Your teams don\'t have any scheduled matches yet.',
          action: {
            label: 'Back to Dashboard',
            onClick: () => router.push(`/${lang}/player/dashboard`)
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
