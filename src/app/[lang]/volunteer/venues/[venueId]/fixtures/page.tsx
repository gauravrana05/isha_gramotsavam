'use client';

import { useState, useEffect } from 'react';
import { api } from '@/server/trpc/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
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
  Plus,
  Eye,
  Edit,
  ArrowLeft,
  Target,
  Camera,
  Loader2
} from 'lucide-react';

export default function FixturesPage() {
  const params = useParams();
  const { venueId } = params as { venueId: string; lang: string };
  const { user, loading: authLoading } = useAuth();
  const eventId = 'isha_gramotsavam_2025';

  const { data: checkedInTeamsResult, isLoading: teamsLoading, error: teamsError } = api.volunteers.venue.getVenueCheckedInTeams.useQuery(
    { venueId, eventId },
    {
      enabled: !authLoading && !!user && !!venueId,
    }
  );

  const { data: fixtures, isLoading: fixturesLoading, error: fixturesError } = api.volunteers.venue.getVenueFixtures.useQuery(
    { venueId },
    {
      enabled: !authLoading && !!user && !!venueId,
    }
  );

  const loading = authLoading || teamsLoading || fixturesLoading;
  const error = teamsError?.message || fixturesError?.message || '';

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      return;
    }
  }, [user, authLoading, venueId]);

  const getFixtureColumns = (): Column<any>[] => [
    {
      key: 'name',
      header: 'Tournament',
      sortable: true,
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center">
            <Trophy className="w-5 h-5 text-gray-400 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-900">{item.name}</div>
              <div className="text-sm text-gray-500">Level: {item.level}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'teams',
      header: 'Teams',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <span className="text-sm text-gray-900">
            {item.assignedTeams?.length || 0}
          </span>
        );
      }
    },
    {
      key: 'matches',
      header: 'Matches',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div>
            <div className="text-sm text-gray-900">
              {item.bracket?.matches?.filter((m: { status?: string }) => m?.status === 'completed').length || 0} / {item.bracket?.matches?.length || 0}
            </div>
            <div className="text-xs text-gray-500">completed</div>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value, item, index) => {
        if (!item) return null;
        
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
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
            {getStatusIcon(item.status)}
            <span className="ml-1 capitalize">{item.status.replace('_', ' ')}</span>
          </span>
        );
      }
    }
  ];

  const getFixtureFilters = () => [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
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
      type: 'select' as const,
      options: [
        { label: 'All Levels', value: '' },
        ...Array.from(new Set((fixtures || []).map(f => f.level))).map(level => ({
          label: level,
          value: level
        }))
      ]
    }
  ];

  if (authLoading || loading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading fixtures...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const checkedInTeams = checkedInTeamsResult?.teams || [];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Link href={`/en/volunteer/venues/${venueId}`} className="mr-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tournament Management</h1>
          <p className="text-gray-600 text-sm">Create and manage tournaments for this venue</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Checked-in Teams</p>
              <p className="text-2xl font-bold text-green-600">{checkedInTeams.length}</p>
            </div>
            <Users className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Tournaments</p>
              <p className="text-2xl font-bold text-blue-600">
                {(fixtures || []).filter(f => f.status === 'in_progress').length}
              </p>
            </div>
            <Trophy className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-2xl font-bold text-gray-600">
                {(fixtures || []).filter(f => f.status === 'completed').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Create New Tournaments */}
      {checkedInTeamsResult?.success && checkedInTeamsResult.teamsBySport && Object.keys(checkedInTeamsResult.teamsBySport).length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Tournament</h2>
          <div className="space-y-3">
            {Object.entries(checkedInTeamsResult.teamsBySport).map(([sportKey, sportTeams]) => {
              const [sportId, genderCategory] = sportKey.split('_');
              const existingFixture = (fixtures || []).find(f => 
                f.sportId === sportId && f.genderCategory === genderCategory
              );
              
              // Get sport name from the first team in this sport group
              const firstTeam = (sportTeams as any)?.[0];
              const sportName = firstTeam?.sportName || firstTeam?.displayName || sportId.replace('_', ' ');
              
              return (
                <div key={sportKey} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <Trophy className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900 capitalize">
                        {sportName} - {genderCategory}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {(sportTeams as any)?.length} teams checked in
                      </p>
                    </div>
                  </div>
                  
                  {existingFixture ? (
                    <Link href={`/en/volunteer/venues/${venueId}/fixtures/${existingFixture.id}`}>
                      <button className="flex items-center px-3 py-2 text-sm text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md border border-indigo-200">
                        <Eye className="w-4 h-4 mr-1" />
                        View Tournament
                      </button>
                    </Link>
                  ) : (sportTeams as any)?.length >= 2 ? (
                    <Link href={`/en/volunteer/venues/${venueId}/fixtures/create-draw?sport=${sportId}&gender=${genderCategory}`}>
                      <button className="flex items-center px-3 py-2 text-sm text-white bg-[#F28C38] hover:bg-[#E67A26] rounded-md">
                        <Plus className="w-4 h-4 mr-1" />
                        Create Draw
                      </button>
                    </Link>
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

      {/* Active Fixtures */}
      <AdvancedTable
        data={fixtures || []}
        columns={getFixtureColumns()}
        searchable
        searchPlaceholder="Search tournaments..."
        filterable
        filters={getFixtureFilters()}
        sortable
        pagination={{ enabled: true, pageSize: 25 }}
        keyExtractor={(fixture) => fixture.id}
        emptyState={{
          icon: Trophy,
          title: 'No tournaments created yet',
          description: 'Check in teams first, then create tournaments from the options above.'
        }}
        actions={[
          {
            label: 'View Bracket',
            icon: Eye,
            onClick: (fixture) => window.location.href = `/en/volunteer/venues/${venueId}/fixtures/${fixture.id}`,
            variant: 'primary'
          },
          {
            label: 'Edit',
            icon: Edit,
            onClick: (fixture: any) => window.location.href = `/en/volunteer/venues/${venueId}/fixtures/${fixture.id}/edit`,
            variant: 'secondary',
            // @ts-expect-error: 'show' is not a valid property on ActionButton, but used for conditional rendering
            show: (fixture: any) => fixture.status !== 'completed'
          },
          {
            label: 'Live Matches',
            icon: Play,
            onClick: (fixture: any) => window.location.href = `/en/volunteer/venues/${venueId}/matches?fixture=${fixture.id}`,
            variant: 'success',
            // @ts-expect-error: 'show' is not a valid property on ActionButton, but used for conditional rendering
            show: (fixture: any) => fixture.status === 'in_progress'
          },
          {
            label: 'Upload Media',
            icon: Camera,
            onClick: (fixture) => window.location.href = `/en/volunteer/venues/${venueId}/media/upload?fixtureId=${fixture.id}`,
            variant: 'secondary'
          }
        ]}
        persistState
        stateKey="venue-fixtures"
      />
    </div>
  );
}