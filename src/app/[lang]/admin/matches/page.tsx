'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
import type { FilterField } from '@/components/ui/FilterSidebar';
import Link from 'next/link';
import { 
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Users,
  MapPin,
  Trophy,
  Hash,
  Target,
  Filter,
  Calendar,
  Loader2
} from 'lucide-react';

interface Match {
  id: string;
  matchNumber?: number;
  status?: string;
  roundName?: string;
  fixtureName?: string;
  sportName?: string;
  genderCategory?: string;
  venueName?: string;
  team1?: {
    teamName?: string;
  };
  team2?: {
    teamName?: string;
  };
  result?: {
    winnerName?: string;
    resultEnteredAt?: string | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
  resultEnteredAt?: string;
}

export default function AdminMatchesPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // tRPC queries
  const { data: matchesData, isLoading: matchesLoading, error: matchesError } = api.admin.matches.getMatches.useQuery(
    { limit: 100 },
    { enabled: !authLoading && !!user && userProfile?.role === 'admin' }
  );

  const { data: stats, isLoading: statsLoading } = api.admin.matches.getMatchStats.useQuery(
    undefined,
    { enabled: !authLoading && !!user && userProfile?.role === 'admin' }
  );

  const { data: venues } = api.admin.matches.getVenues.useQuery(
    undefined,
    { enabled: !authLoading && !!user && userProfile?.role === 'admin' }
  );

  // Redirect if not authenticated or not admin
  if (!authLoading && (!user || userProfile?.role !== 'admin')) {
    router.push(`/${lang}/login`);
    return null;
  }

  const matches = matchesData?.matches || [];
  const loading = authLoading || matchesLoading || statsLoading;

  // Calculate statistics from tRPC data
  const matchStats = stats || {
    totalMatches: 0,
    byStatus: { scheduled: 0, ready: 0, in_progress: 0, completed: 0 },
    liveMatches: 0
  };

  const formatMatchTeams = (match: Match) => {
    const team1Name = match.team1?.teamName || 'TBD';
    const team2Name = match.team2?.teamName || 'TBD';
    return `${team1Name} vs ${team2Name}`;
  };

  const getWinnerInfo = (match: Match) => {
    if (match.result?.winnerName) {
      return `Winner: ${match.result.winnerName}`;
    }
    return null;
  };

  // AdvancedTable configuration
  const columns: Column<Match>[] = [
    {
      key: 'matchNumber',
      header: 'Match',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center text-sm font-medium text-gray-900">
            <Hash className="w-4 h-4 text-gray-400 mr-1" />
            #{item.matchNumber}
          </div>
        );
      },
      sortable: true,
      width: '100px'
    },
    {
      key: 'teams',
      header: 'Teams',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div>
            <div className="text-sm text-gray-900">{formatMatchTeams(item)}</div>
            <div className="text-sm text-gray-500">{item.sportName} • {item.genderCategory}</div>
          </div>
        );
      }
    },
    {
      key: 'roundName',
      header: 'Round',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center text-sm text-gray-900">
            <Target className="w-4 h-4 text-gray-400 mr-1" />
            {item.roundName}
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'fixtureName',
      header: 'Tournament',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="text-sm text-gray-900">{item.fixtureName}</div>
        );
      },
      sortable: true
    },
    {
      key: 'venueName',
      header: 'Venue',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center text-sm text-gray-900">
            <MapPin className="w-4 h-4 text-gray-400 mr-1" />
            {item.venueName}
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status || 'scheduled')}`}>
            {getStatusIcon(item.status || 'scheduled')}
            <span className="ml-1 capitalize">{item.status?.replace('_', ' ') || 'scheduled'}</span>
          </span>
        );
      },
      sortable: true
    },
    {
      key: 'result',
      header: 'Result',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="text-sm text-gray-500">
            {getWinnerInfo(item) || 'Pending'}
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex space-x-2">
            <Link 
              href={`/${lang}/admin/matches/${item.id}`}
              className="text-[#F28C38] hover:text-[#E67A26] flex items-center"
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Link>
            <Link 
              href={`/${lang}/admin/matches/${item.id}/edit`}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Link>
          </div>
        );
      }
    }
  ];

  const filters: FilterField[] = [
    {
      key: 'venueName',
      label: 'Venue',
      type: 'select',
      options: (venues || []).map(venue => ({ label: venue.name, value: venue.name }))
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Ready', value: 'ready' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' }
      ]
    },
    {
      key: 'sportName',
      label: 'Sport',
      type: 'text'
    },
    {
      key: 'roundName',
      label: 'Round',
      type: 'text'
    },
    {
      key: 'fixtureName',
      label: 'Tournament',
      type: 'text'
    }
  ];
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
      case 'ready': return <Users className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (matchesError) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{matchesError.message}</p>
        </div>
      </div>
    );
  }


  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Matches</p>
              <p className="text-2xl font-bold text-[#4A2F1D]">{matchStats.totalMatches}</p>
            </div>
            <Trophy className="w-8 h-8 text-[#F28C38]" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Live Now</p>
              <p className="text-2xl font-bold text-blue-600">{matchStats.liveMatches}</p>
            </div>
            <Play className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-2xl font-bold text-green-600">{matchStats.byStatus.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Ready</p>
              <p className="text-2xl font-bold text-yellow-600">{matchStats.byStatus.ready}</p>
            </div>
            <Users className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Scheduled</p>
              <p className="text-2xl font-bold text-gray-600">{matchStats.byStatus.scheduled}</p>
            </div>
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Live Matches Alert */}
      {matchStats.liveMatches > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Play className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">
                {matchStats.liveMatches} match{matchStats.liveMatches > 1 ? 'es' : ''} currently in progress
              </h3>
              <p className="text-sm text-blue-700">Monitor live matches for real-time updates</p>
            </div>
          </div>
        </div>
      )}

      {/* AdvancedTable */}
      <AdvancedTable
        title="Tournament Matches"
        subtitle="Monitor all matches across venues in real-time"
        data={matches}
        columns={columns}
        loading={loading}
        
        searchable={true}
        searchPlaceholder="Search matches, teams, tournaments..."
        searchFields={['matchNumber', 'fixtureName', 'roundName']}
        
        filterable={true}
        filters={filters}
        
        sortable={true}
        defaultSort={[{ key: 'matchNumber', direction: 'asc' }]}
        
        pagination={{ enabled: true, pageSize: 25 }}
        
        persistState={true}
        stateKey="admin-matches"
        
        emptyState={{
          icon: Play,
          title: 'No matches found',
          description: 'Tournament matches will appear here once fixtures are created'
        }}
      />
    </div>
  );
}
