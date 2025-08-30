'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/server/trpc/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import type { Column, ActionButton } from '@/components/ui/Table';
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
  const { venueId, lang } = params as { venueId: string; lang: string };
  const { user, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();
  const router = useRouter();
  const eventId = 'isha_gramotsavam_2025';

  // State for modals and selections
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSportForCreation, setSelectedSportForCreation] = useState<{
    sportId: string;
    genderCategory: string;
    sportName: string;
    teamCount: number;
  } | null>(null);
  const [selectedFixtures, setSelectedFixtures] = useState<Set<string | number>>(new Set());

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

  // Available sports for tournament creation
  const availableSportsForCreation = useMemo(() => {
    if (!checkedInTeamsResult?.success || !checkedInTeamsResult.teamsBySport) {
      return [];
    }

    return Object.entries(checkedInTeamsResult.teamsBySport)
      .map(([sportKey, sportTeams]) => {
        const [sportId, genderCategory] = sportKey.split('_');
        const firstTeam = (sportTeams as any)?.[0];
        const sportName = firstTeam?.sportName || firstTeam?.displayName || sportId.replace('_', ' ');
        const teamCount = (sportTeams as any)?.length || 0;
        
        // Check if tournament already exists
        const existingFixture = (fixtures || []).find(f => 
          f.sportId === sportId && f.genderCategory === genderCategory
        );
        
        return {
          sportId,
          genderCategory,
          sportName,
          teamCount,
          hasExisting: !!existingFixture,
          existingFixture,
          canCreate: teamCount >= 2
        };
      })
      .filter(sport => sport.canCreate && !sport.hasExisting);
  }, [checkedInTeamsResult, fixtures]);

  // Fixture actions
  const fixtureActions = useMemo<ActionButton<any>[]>(() => [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (fixture) => router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/${fixture.id}`),
      variant: 'secondary'
    },
    {
      label: 'Live Matches',
      icon: Play,
      onClick: (fixture) => router.push(`/${lang}/volunteer/venues/${venueId}/matches?fixture=${fixture.id}`),
      variant: 'primary',
      show: (fixture: any) => fixture.status === 'in_progress'
    },
    {
      label: 'Upload Media',
      icon: Camera,
      onClick: (fixture) => router.push(`/${lang}/volunteer/venues/${venueId}/media/upload?fixtureId=${fixture.id}`),
      variant: 'secondary'
    }
  ], [router, lang, venueId]);

  // Handle tournament creation
  const handleCreateTournament = (sport: typeof selectedSportForCreation) => {
    if (sport) {
      router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/create-draw?sport=${sport.sportId}&gender=${sport.genderCategory}`);
    }
  };

  // Header actions for creating tournaments
  const getHeaderActions = () => {
    if (availableSportsForCreation.length === 0) {
      return null;
    }

    return (
      <button
        onClick={() => setShowCreateModal(true)}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Tournament
      </button>
    );
  };

  // Header actions for selected fixtures
  const getHeaderActionsSingle = (selectedItems: any[]) => {
    return null; // No bulk actions needed for fixtures currently
  };

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


      {/* Active Fixtures */}
      <AdvancedTable
        data={fixtures || []}
        columns={getFixtureColumns()}
        actions={fixtureActions}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search tournaments..."
        filterable={true}
        filters={getFixtureFilters()}
        sortable={true}
        selectable={true}
        selectedRows={selectedFixtures}
        onSelectionChange={setSelectedFixtures}
        keyExtractor={(fixture) => fixture.id}
        headerActions={getHeaderActions()}
        headerActionsSingle={getHeaderActionsSingle}
        emptyState={{
          icon: Trophy,
          title: 'No tournaments created yet',
          description: availableSportsForCreation.length > 0 
            ? 'Create tournaments from checked-in teams using the button above.'
            : 'Check in teams first before creating tournaments.'
        }}
        pagination={{ enabled: true, pageSize: 25 }}
        persistState={false}
      />

      {/* Tournament Creation Modal */}
      <EnhancedModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedSportForCreation(null);
        }}
        title="Create New Tournament"
        subtitle="Select a sport to create a tournament bracket"
        size="lg"
        mobileFullScreen={true}
        scrollableBody={true}
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setSelectedSportForCreation(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            {selectedSportForCreation && (
              <button
                onClick={() => {
                  handleCreateTournament(selectedSportForCreation);
                  setShowCreateModal(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-[#F28C38] rounded-lg hover:bg-[#E67A26]"
              >
                Create Tournament
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm mb-4">
            Select a sport and gender category to create a tournament. Only sports with 2 or more checked-in teams are available.
          </p>
          
          {availableSportsForCreation.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No sports available for tournament creation</p>
              <p className="text-gray-400 text-sm mt-2">
                Sports need at least 2 checked-in teams to create a tournament
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableSportsForCreation.map((sport) => (
                <div
                  key={`${sport.sportId}_${sport.genderCategory}`}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedSportForCreation?.sportId === sport.sportId && 
                    selectedSportForCreation?.genderCategory === sport.genderCategory
                      ? 'border-[#F28C38] bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedSportForCreation(sport)}
                >
                  <div className="flex items-center justify-between">
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
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        Ready to create
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </EnhancedModal>
    </div>
  );
}