'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { AdvancedTable, PageLoader } from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import { 
  Trophy, 
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  Play,
  Users,
  AlertCircle,
  Eye,
  Target,
  Award
} from 'lucide-react';
import Link from 'next/link';

interface MatchRow {
  id: string;
  fixtureName: string;
  sportName: string;
  team1Name: string;
  team2Name: string;
  team1Score?: number;
  team2Score?: number;
  winnerName?: string;
  scheduledAt: string;
  completedAt?: string;
  venueName: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  level: 'cluster' | 'division' | 'final';
  round: string;
}

export default function CaptainMatchesPage() {
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

  // Fetch matches for captain's team
  const { 
    data: matchesData, 
    isLoading: matchesLoading,
    error: matchesError
  } = api.matches.getTeamMatches.useQuery(
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

  // Process matches data
  const matches = useMemo(() => {
    if (!matchesData?.matches) return [];
    
    return matchesData.matches.map(match => ({
      id: match.id,
      fixtureName: match.fixture?.name || 'Unknown Fixture',
      sportName: match.fixture?.sport?.name || 'Unknown Sport',
      team1Name: match.team1?.name || 'TBD',
      team2Name: match.team2?.name || 'TBD',
      team1Score: match.team1Score,
      team2Score: match.team2Score,
      winnerName: match.winner?.name,
      scheduledAt: match.scheduledAt,
      completedAt: match.completedAt,
      venueName: match.venue?.name || 'TBD',
      status: match.status,
      level: match.fixture?.level || 'cluster',
      round: match.fixture?.round || 'Round 1'
    }));
  }, [matchesData?.matches]);

  // Table columns
  const columns: Column<MatchRow>[] = useMemo(() => [
    {
      key: 'match',
      header: 'Match',
      accessor: 'fixtureName',
      sortable: true,
      minWidth: 250,
      render: (_, match) => (
        <div>
          <div className="font-medium text-gray-900">{match.fixtureName}</div>
          <div className="text-sm text-gray-500 flex items-center mt-1">
            <Trophy className="w-4 h-4 mr-1" />
            {match.sportName} • {match.round}
          </div>
        </div>
      )
    },
    {
      key: 'teams',
      header: 'Teams & Score',
      accessor: 'team1Name',
      sortable: true,
      minWidth: 220,
      render: (_, match) => (
        <div className="text-sm">
          <div className="flex items-center justify-between">
            <span className={`font-medium ${
              match.winnerName === match.team1Name ? 'text-green-600' : 'text-gray-900'
            }`}>
              {match.team1Name}
            </span>
            {match.status === 'completed' && match.team1Score !== undefined && (
              <span className="font-bold text-gray-900">{match.team1Score}</span>
            )}
          </div>
          <div className="text-gray-500 my-1 text-center">vs</div>
          <div className="flex items-center justify-between">
            <span className={`font-medium ${
              match.winnerName === match.team2Name ? 'text-green-600' : 'text-gray-900'
            }`}>
              {match.team2Name}
            </span>
            {match.status === 'completed' && match.team2Score !== undefined && (
              <span className="font-bold text-gray-900">{match.team2Score}</span>
            )}
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
      render: (_, match) => (
        <div className="text-sm">
          <div className="flex items-center text-gray-900">
            <Calendar className="w-4 h-4 mr-1" />
            {new Date(match.scheduledAt).toLocaleDateString()}
          </div>
          <div className="flex items-center text-gray-500 mt-1">
            <Clock className="w-4 h-4 mr-1" />
            {new Date(match.scheduledAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
          {match.completedAt && (
            <div className="text-xs text-green-600 mt-1">
              Completed: {new Date(match.completedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'venue',
      header: 'Venue',
      accessor: 'venueName',
      sortable: true,
      minWidth: 150,
      render: (venueName) => (
        <div className="text-sm">
          <div className="flex items-center text-gray-900">
            <MapPin className="w-4 h-4 mr-1" />
            {venueName}
          </div>
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
      key: 'result',
      header: 'Result',
      accessor: 'status',
      sortable: true,
      minWidth: 140,
      render: (_, match) => {
        if (match.status === 'completed') {
          if (match.winnerName) {
            const isWinner = match.winnerName === teamData?.name;
            return (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isWinner ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <Award className="w-3 h-3 mr-1" />
                {isWinner ? 'Won' : 'Lost'}
              </span>
            );
          } else {
            return (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Draw
              </span>
            );
          }
        } else if (match.status === 'in_progress') {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <Play className="w-3 h-3 mr-1" />
              Live
            </span>
          );
        } else if (match.status === 'cancelled') {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <AlertCircle className="w-3 h-3 mr-1" />
              Cancelled
            </span>
          );
        } else {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <Clock className="w-3 h-3 mr-1" />
              Scheduled
            </span>
          );
        }
      }
    }
  ], [teamData?.name]);

  if (authLoading || teamLoading) {
    return <PageLoader message="Loading matches..." />;
  }

  if (!teamData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Team Found</h1>
          <p className="text-gray-600 mb-4">You don&apos;t have a team yet. Create one to get started.</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Match Results</h1>
            <p className="text-gray-600 mt-2">View your team&apos;s match history and results</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{teamData.name}</span> • {teamData.sport?.name}
            </div>
          </div>
        </div>
      </div>

      {/* Matches Table */}
      <AdvancedTable<MatchRow>
        data={matches}
        columns={columns}
        loading={matchesLoading}

        searchable={true}
        searchPlaceholder="Search matches by fixture, teams, venue..."

        filterable={true}
        filters={[
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'All Matches', value: '' },
              { label: 'Completed', value: 'completed' },
              { label: 'In Progress', value: 'in_progress' },
              { label: 'Scheduled', value: 'scheduled' },
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
        defaultSort={[{ key: 'scheduledAt', direction: 'desc' }]}

        pagination={{ enabled: true }}

        keyExtractor={(match) => match.id}

        actions={[
          {
            label: 'View Details',
            icon: Eye,
            onClick: (match) => {
              router.push(`/${lang}/captain/matches/${match.id}`);
            },
            variant: 'secondary'
          }
        ]}

        emptyState={{
          icon: Trophy,
          title: 'No matches found',
          description: 'Your team hasn\'t played any matches yet.',
          action: {
            label: 'View Fixtures',
            onClick: () => router.push(`/${lang}/captain/fixtures`)
          }
        }}

        noSearchResultsEmptyState={{
          icon: Trophy,
          title: 'No matching matches',
          description: 'Try adjusting your search or filters to find what you\'re looking for.'
        }}
      />
    </div>
  );
}
