'use client';

import React, { useState, useMemo } from 'react';
import { api } from '@/server/trpc/react';
import { useParams, useRouter } from 'next/navigation';
import { useOffline } from '@/context/OfflineContextWrapper';
import OfflineStatusBanner from '@/components/volunteer/OfflineStatusBanner';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Play, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Eye,
  Loader2,
  RefreshCw,
  Timer,
  Plus
} from 'lucide-react';

interface FixtureData {
  id: string;
  name: string;
  sport: { name: string; displayName: string; };
  level: string;
  status: 'draft' | 'teams_assigned' | 'in_progress' | 'completed';
  matches: any[];
  scheduledStartTime?: Date;
  actualStartTime?: Date;
  completedTime?: Date;
}

export default function VolunteerFixturesPage() {
  const params = useParams();
  const router = useRouter();
  const { venueId, lang } = params as { venueId: string; lang: string };
  const { user, loading: authLoading } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Data fetching with tRPC
  const { 
    data: fixtures, 
    isLoading: fixturesLoading, 
    error: fixturesError,
    refetch: refetchFixtures
  } = api.volunteers.fixture.getVenueFixtures.useQuery(
    { venueId },
    { enabled: !!user && !!venueId }
  );

  const { 
    data: availableSports,
    isLoading: sportsLoading
  } = api.volunteers.fixture.getAvailableSportsForFixture.useQuery(
    { venueId },
    { enabled: !!user && !!venueId }
  );

  const { 
    data: todayMatches, 
    isLoading: matchesLoading,
    refetch: refetchMatches
  } = api.volunteers.fixture.getTodayMatches.useQuery(
    { venueId, date: selectedDate },
    { enabled: !!user && !!venueId }
  );

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'teams_assigned': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'teams_assigned': return <Users className="w-4 h-4" />;
      case 'draft': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getMatchProgress = (fixture: FixtureData) => {
    if (!fixture.matches) return { completed: 0, total: 0 };
    const matches = fixture.matches;
    const completed = matches.filter(m => m.status === 'completed').length;
    return { completed, total: matches.length };
  };

  // Table columns
  const fixtureColumns: Column<FixtureData>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Tournament',
      sortable: true,
      className: 'min-w-0 w-32 sm:w-auto',
      render: (_value, item) => {
        if (!item) return null;
        return (
          <div className="flex items-center">
            <Trophy className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
              <div className="text-xs text-gray-500">{item.sport?.displayName || item.sport?.name} • {item.level}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'matches',
      header: 'Progress',
      className: 'w-20 sm:w-24',
      render: (_value, item) => {
        if (!item) return null;
        const progress = getMatchProgress(item);
        const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
        
        return (
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900">
              {progress.completed}/{progress.total}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      className: 'w-24 sm:w-28',
      render: (_value, item) => {
        if (!item) return null;
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
            {getStatusIcon(item.status)}
            <span className="ml-1 capitalize hidden sm:inline">
              {item.status.replace('_', ' ')}
            </span>
          </span>
        );
      }
    }
  ], []);

  // Loading and error states
  if (authLoading || fixturesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading fixtures...</p>
        </div>
      </div>
    );
  }

  if (fixturesError) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">{fixturesError.message}</p>
          <button 
            onClick={() => refetchFixtures()}
            className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-4 sm:py-8 px-0 sm:px-4 lg:px-6">
      {/* Offline Status */}
      <OfflineStatusBanner className="mb-4" />
      
      {/* Header */}
      <div className="mb-6 px-4 sm:px-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Tournament Fixtures
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Manage tournament schedules and match progress
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/create`)}
              className="flex items-center gap-2 px-4 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Tournament</span>
            </button>
            <button
              onClick={() => refetchFixtures()}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date Selector */}
      <div className="mb-4 px-4 sm:px-0">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">View Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
          />
          {selectedDate !== new Date().toISOString().split('T')[0] && (
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="text-sm text-[#F28C38] hover:text-[#E67A26]"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Create New Tournaments */}
      {availableSports && availableSports.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Tournament</h2>
          <div className="space-y-3">
            {availableSports.map((sport: any) => {
              const existingFixture = fixtures?.find(f => 
                f.sport.id === sport.sportId && f.genderCategory === sport.genderCategory
              );
              
              return (
                <div key={`${sport.sportId}_${sport.genderCategory}`} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <Trophy className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900 capitalize">
                        {sport.sportName} - {sport.genderCategory}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {sport.teamCount} teams checked in
                      </p>
                    </div>
                  </div>
                  
                  {existingFixture ? (
                    <button
                      onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/${existingFixture.id}`)}
                      className="flex items-center px-3 py-2 text-sm text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md border border-indigo-200"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Tournament
                    </button>
                  ) : sport.teamCount >= 2 ? (
                    <button
                      onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/create?sport=${sport.sportId}&gender=${sport.genderCategory}`)}
                      className="flex items-center px-3 py-2 text-sm text-white bg-[#F28C38] hover:bg-[#E67A26] rounded-md"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create Tournament
                    </button>
                  ) : (
                    <div className="text-sm text-gray-500 px-3 py-2 bg-gray-100 rounded-md">
                      Need 2+ teams
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <AdvancedTable
        data={fixtures || []}
        columns={fixtureColumns}
        loading={fixturesLoading}
        onRowClick={(fixture) => router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/${fixture.id}`)}
        keyExtractor={(fixture) => fixture.id}
        stickyHeader={true}
        compact={false}
        searchable={true}
        searchPlaceholder="Search fixtures, sports, levels..."
        pagination={{
          enabled: true,
          pageSize: 20,
          pageSizeOptions: [10, 20, 50]
        }}
      />

      {/* Today&apos;s Matches Summary */}
      {todayMatches && todayMatches.length > 0 && (
        <div className="mt-8 px-4 sm:px-0">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Today&apos;s Matches ({selectedDate})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayMatches.slice(0, 6).map((match: any) => (
              <div key={match.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                    {getStatusIcon(match.status)}
                    <span className="ml-1 capitalize">{match.status}</span>
                  </span>
                  {match.scheduledTime && (
                    <span className="text-xs text-gray-500">
                      {new Date(match.scheduledTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {match.fixture?.name}
                </div>
                <div className="text-xs text-gray-600">
                  {match.team1?.name} vs {match.team2?.name}
                </div>
                {(match.team1Score !== null || match.team2Score !== null) && (
                  <div className="text-sm font-medium text-gray-900 mt-2">
                    {match.team1Score || 0} - {match.team2Score || 0}
                  </div>
                )}
              </div>
            ))}
          </div>
          {todayMatches.length > 6 && (
            <div className="text-center mt-4">
              <button
                onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/matches`)}
                className="text-[#F28C38] hover:text-[#E67A26] text-sm font-medium"
              >
                View all {todayMatches.length} matches →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 px-4 sm:px-0">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Fixtures</p>
              <p className="text-2xl font-bold text-gray-900">{fixtures?.length || 0}</p>
            </div>
            <Trophy className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">
                {fixtures?.filter(f => f.status === 'in_progress').length || 0}
              </p>
            </div>
            <Play className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {fixtures?.filter(f => f.status === 'completed').length || 0}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Today&apos;s Matches</p>
              <p className="text-2xl font-bold text-purple-600">
                {todayMatches?.length || 0}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
