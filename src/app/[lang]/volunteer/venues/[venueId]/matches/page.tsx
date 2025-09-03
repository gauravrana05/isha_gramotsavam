'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/utils/i18n';
import { api } from '@/server/trpc/react';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
import { type FilterField } from '@/components/ui/FilterSidebar';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Play, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Eye,
  RefreshCw,
  Edit,
  Timer,
  Info,
  Filter,
  Plus
} from 'lucide-react';

interface Match {
  id: string;
  matchNumber: number;
  round: number;
  roundName: string;
  status: 'scheduled' | 'ready' | 'in_progress' | 'completed';
  scheduledTime: Date | null;
  actualStartTime: Date | null;
  team1Score: number | null;
  team2Score: number | null;
  winnerId: string | null;
  fixture: {
    id: string;
    name: string;
    sport: { id: string; name: string; };
  };
  team1: { id: string; name: string; } | null;
  team2: { id: string; name: string; } | null;
}

interface MatchStats {
  total: number;
  scheduled: number;
  ready: number;
  inProgress: number;
  completed: number;
}

export default function MatchesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { venueId, lang } = params as { venueId: string; lang: string };
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const fixtureId = searchParams.get('fixture');

  // Ensure venueId is a string
  const venueIdString = Array.isArray(venueId) ? venueId[0] : venueId;

  // Single query for all match data
  const { 
    data: matchData, 
    isLoading: loading, 
    error,
    refetch
  } = api.volunteers.venue.getVenueMatches.useQuery(
    { 
      venueId: venueIdString || '',
      fixtureId: fixtureId || undefined
    },
    { enabled: !!user && !!venueIdString }
  );

  // Filter configuration for AdvancedTable
  const filters: FilterField[] = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      category: 'Match',
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Ready', value: 'ready' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' }
      ]
    },
    {
      key: 'fixture',
      label: 'Tournament',
      type: 'select',
      category: 'Tournament',
      options: matchData?.matches ? 
        [...new Set(matchData.matches.map(m => m.fixture.name))]
          .map(name => ({ label: name, value: name })) : []
    }
  ], [matchData?.matches]);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'scheduled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'ready': return <Timer className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getMatchAction = (match: Match) => {
    switch (match.status) {
      case 'ready':
        return {
          label: 'Start Match',
          icon: Play,
          href: `/${lang}/volunteer/venues/${venueIdString}/matches/${match.id}`,
          className: 'bg-green-600 hover:bg-green-700 text-white'
        };
      case 'in_progress':
        return {
          label: 'Update Result',
          icon: Edit,
          href: `/${lang}/volunteer/venues/${venueIdString}/matches/${match.id}`,
          className: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
      case 'completed':
        return {
          label: 'View Result',
          icon: Eye,
          href: `/${lang}/volunteer/venues/${venueIdString}/matches/${match.id}`,
          className: 'bg-gray-600 hover:bg-gray-700 text-white'
        };
      case 'scheduled':
        return {
          label: 'View Details',
          icon: Info,
          href: `/${lang}/volunteer/venues/${venueIdString}/matches/${match.id}`,
          className: 'bg-[#F28C38] hover:bg-[#E67A26] text-white'
        };
      default:
        return null;
    }
  };

  // Table columns
  const matchColumns: Column<Match>[] = useMemo(() => [
    {
      key: 'matchInfo',
      header: 'Match',
      sortable: true,
      className: 'min-w-0 w-32',
      render: (_, match) => (
        <div>
          <div className="font-medium text-gray-900">Match #{match.matchNumber}</div>
          <div className="text-sm text-gray-500">{match.roundName}</div>
        </div>
      )
    },
    {
      key: 'fixture',
      header: 'Tournament',
      className: 'min-w-0 w-40',
      render: (_, match) => (
        <div>
          <div className="font-medium text-gray-900 truncate">{match.fixture.name}</div>
          <div className="text-sm text-gray-500">{match.fixture.sport.name}</div>
        </div>
      )
    },
    {
      key: 'teams',
      header: 'Teams',
      className: 'min-w-0 w-56',
      render: (_, match) => (
        <div className="space-y-1">
          <div className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            <span className="text-sm truncate">{match.team1?.name || 'TBD'}</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
            <span className="text-sm truncate">{match.team2?.name || 'TBD'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      className: 'w-28',
      render: (_, match) => (
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(match.status)}`}>
          {getStatusIcon(match.status)}
          <span className="ml-1 capitalize hidden sm:inline">
            {match.status.replace('_', ' ')}
          </span>
        </div>
      )
    },
    {
      key: 'score',
      header: 'Score',
      className: 'w-20 text-center',
      render: (_, match) => (
        match.status === 'completed' && match.team1Score !== null && match.team2Score !== null ? (
          <div className="text-sm font-medium">
            {match.team1Score} - {match.team2Score}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )
      )
    },
    {
      key: 'time',
      header: 'Time',
      className: 'w-32 text-sm',
      render: (_, match) => (
        <div className="text-sm text-gray-600">
          {match.scheduledTime ? (
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              <span>{new Date(match.scheduledTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
          ) : (
            <span className="text-gray-400">Not scheduled</span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Action',
      className: 'w-32',
      render: (_, match) => {
        const action = getMatchAction(match);
        if (!action) return null;
        
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(action.href);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${action.className}`}
          >
            <action.icon className="w-3 h-3 inline mr-1" />
            {action.label}
          </button>
        );
      }
    }
  ], [router, lang, venueIdString]);

  // Loading state with volunteer theme
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C38]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center p-6">
        <div className="text-center bg-white rounded-lg p-8 shadow-sm border max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Matches</h1>
          <p className="text-gray-600 mb-6">{error.message}</p>
          <button 
            onClick={() => refetch()}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const matches = matchData?.matches || [];
  const fixtureInfo = matchData?.fixtureInfo;
  const stats: MatchStats = matchData?.stats || { total: 0, scheduled: 0, ready: 0, inProgress: 0, completed: 0 };

  return (
    <div className="min-h-screen bg-[#F3F0E5] py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t('volunteer.matches.title', 'Tournament Matches')}
              </h1>
              <p className="text-gray-600">
                {fixtureInfo 
                  ? `${fixtureInfo.name} - ${fixtureInfo.sport?.name}` 
                  : t('volunteer.matches.subtitle', 'Manage match schedules and results')
                }
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Tournament Info Card (when filtered by fixture) */}
        {fixtureInfo && (
          <div className="bg-white rounded-lg border shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Trophy className="w-6 h-6 text-[#F28C38] mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{fixtureInfo.name}</h3>
                  <p className="text-gray-600">
                    {fixtureInfo.sport?.name} • {fixtureInfo.genderCategory} • {fixtureInfo.level}
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/${lang}/volunteer/venues/${venueIdString}/matches`)}
                className="text-sm text-[#F28C38] hover:text-[#E67A26] font-medium"
              >
                View All Matches →
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Calendar className="w-8 h-8 text-gray-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Ready</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.ready}</p>
              </div>
              <Timer className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Live</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Play className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Matches Table with Header Actions */}
        <AdvancedTable
          data={matchData?.matches || []}
          columns={matchColumns}
          loading={loading}
          onRowClick={(match) => router.push(`/${lang}/volunteer/venues/${venueIdString}/matches/${match.id}`)}
          keyExtractor={(match) => match.id}
          stickyHeader={true}
          compact={false}
          searchable={true}
          searchPlaceholder={t('volunteer.matches.search_placeholder', 'Search matches, teams...')}
          filterable={true}
          filters={filters}
          headerActions={(
            <div className="flex items-center gap-3">
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              
              <button
                onClick={() => router.push(`/${lang}/volunteer/venues/${venueIdString}/fixtures`)}
                className="flex items-center gap-2 px-3 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors"
              >
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">View Fixtures</span>
              </button>

              {fixtureInfo && (
                <button
                  onClick={() => router.push(`/${lang}/volunteer/venues/${venueIdString}/matches`)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">All Matches</span>
                </button>
              )}
            </div>
          )}
          emptyState={{
            icon: Calendar,
            title: t('volunteer.matches.no_matches', 'No matches found'),
            description: t('volunteer.matches.no_matches_desc', 'No matches have been created yet')
          }}
          pagination={{
            enabled: true,
            pageSize: 20,
            pageSizeOptions: [10, 20, 50]
          }}
        />
      </div>
    </div>
  );
}