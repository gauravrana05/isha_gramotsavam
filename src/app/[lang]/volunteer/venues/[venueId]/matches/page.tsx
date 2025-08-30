'use client';

import { useState, useMemo } from 'react';
import { api } from '@/server/trpc/react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import type { Column, ActionButton } from '@/components/ui/Table';
import { 
  ArrowLeft,
  Trophy,
  Users,
  Clock,
  Play,
  CheckCircle,
  AlertCircle,
  Calendar,
  Target,
  Camera,
  Edit,
  Loader2
} from 'lucide-react';

interface MatchData {
  id: string;
  roundName: string;
  status: string;
  team1Name: string;
  team2Name: string;
  team1Score?: number;
  team2Score?: number;
  scheduledTime?: string;
  actualStartTime?: string;
  completedTime?: string;
  fixtureId?: string;
  fixtureName?: string;
}

export default function MatchesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { addNotification } = useNotification();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const venueId = params?.venueId as string;
  const lang = params?.lang as string;
  const fixtureId = searchParams?.get('fixture') || undefined;

  // State management
  const [selectedMatches, setSelectedMatches] = useState<Set<string | number>>(new Set());
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);

  // Get matches using tRPC
  const { data: matches = [], isLoading: matchesLoading, error: matchesError } = api.volunteers.venue.getVenueMatches.useQuery(
    { venueId, fixtureId },
    {
      enabled: !authLoading && !!user && !!venueId,
    }
  );

  // Get fixture details if fixtureId is provided
  const { data: fixture, isLoading: fixtureLoading, error: fixtureError } = api.volunteers.venue.getFixtureDetails.useQuery(
    { fixtureId: fixtureId! },
    {
      enabled: !authLoading && !!user && !!fixtureId,
    }
  );

  // Loading state
  if (authLoading || matchesLoading || (fixtureId && fixtureLoading)) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (matchesError || (fixtureId && fixtureError)) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12 bg-white rounded-lg border border-red-200">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Matches</h3>
          <p className="text-gray-600">
            {matchesError?.message || fixtureError?.message || 'Unable to load match data. Please try again.'}
          </p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'ready': return <Clock className="w-4 h-4" />;
      case 'scheduled': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Table columns configuration
  const matchColumns = useMemo<Column<MatchData>[]>(() => [
    {
      key: 'round',
      header: 'Round',
      sortable: true,
      render: (_, match) => (
        <div className="flex items-center">
          <Trophy className="w-4 h-4 text-gray-400 mr-2" />
          <span className="font-medium text-gray-900">{match.roundName}</span>
        </div>
      ),
    },
    {
      key: 'teams',
      header: 'Match',
      render: (_, match) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {match.team1Name} vs {match.team2Name}
          </div>
          {match.fixtureName && (
            <div className="text-gray-500 text-xs mt-1">{match.fixtureName}</div>
          )}
        </div>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: (_, match) => (
        <div className="text-center">
          {match.status === 'completed' && (match.team1Score !== undefined && match.team2Score !== undefined) ? (
            <div className="font-mono font-bold text-gray-900">
              {match.team1Score} - {match.team2Score}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">-</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (_, match) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
          {getStatusIcon(match.status)}
          <span className="ml-1 capitalize">{match.status.replace('_', ' ')}</span>
        </span>
      ),
    },
    {
      key: 'time',
      header: 'Time',
      render: (_, match) => (
        <div className="text-sm text-gray-600">
          {match.status === 'completed' && match.completedTime ? (
            <>Completed<br /><span className="text-xs">{new Date(match.completedTime).toLocaleTimeString()}</span></>
          ) : match.status === 'in_progress' && match.actualStartTime ? (
            <>Started<br /><span className="text-xs">{new Date(match.actualStartTime).toLocaleTimeString()}</span></>
          ) : match.scheduledTime ? (
            <>Scheduled<br /><span className="text-xs">{new Date(match.scheduledTime).toLocaleTimeString()}</span></>
          ) : (
            <span className="text-gray-400">Not scheduled</span>
          )}
        </div>
      ),
    }
  ], []);

  // Table actions
  const matchActions = useMemo<ActionButton<MatchData>[]>(() => [
    {
      label: 'Manage',
      icon: Edit,
      onClick: (match) => router.push(`/${lang}/volunteer/venues/${venueId}/matches/${match.id}`),
      variant: 'secondary',
    },
    {
      label: 'Score',
      icon: Target,
      onClick: (match) => router.push(`/${lang}/volunteer/venues/${venueId}/matches/${match.id}/scoring`),
      variant: 'primary',
      show: (match) => match.status === 'ready' || match.status === 'in_progress'
    },
    {
      label: 'Media',
      icon: Camera,
      onClick: (match) => router.push(`/${lang}/volunteer/venues/${venueId}/media/upload?matchId=${match.id}`),
      variant: 'secondary'
    }
  ], [router, lang, venueId]);

  // Filter configuration
  const matchFilters = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { label: 'All', value: '' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Ready', value: 'ready' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' }
      ]
    },
    {
      key: 'round',
      label: 'Round',
      type: 'select' as const,
      options: [
        { label: 'All Rounds', value: '' },
        ...Array.from(new Set((matches || []).map(m => m.roundName))).map(round => ({
          label: round,
          value: round
        }))
      ]
    }
  ], [matches]);

  // Header actions
  const getHeaderActions = () => (
    <button
      onClick={() => setShowBulkUpdateModal(true)}
      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
    >
      <Edit className="w-4 h-4 mr-2" />
      Bulk Update
    </button>
  );

  // Handle match row click
  const handleMatchClick = (match: MatchData) => {
    setSelectedMatch(match);
    setShowMatchModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Link 
            href={fixtureId ? `/${lang}/volunteer/venues/${venueId}/fixtures/${fixtureId}` : `/${lang}/volunteer/venues/${venueId}/fixtures`} 
            className="text-[#F28C38] hover:text-[#E67A26] flex items-center mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            {fixtureId ? 'Back to Fixture' : 'Back to Fixtures'}
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {fixture ? `${fixture.name} - Matches` : 'Tournament Matches'}
        </h1>
        <p className="text-gray-600 text-sm">
          {fixture ? 'Manage results for tournament matches' : 'All venue matches'}
        </p>
      </div>

      {/* Tournament Info */}
      {fixture && (
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Trophy className="w-6 h-6 text-[#F28C38] mr-3" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{fixture.name}</h2>
                <p className="text-gray-600 text-sm">
                  {fixture.assignedTeams?.length || 0} teams • Level: {fixture.level}
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(fixture.status || '')}`}>
              {getStatusIcon(fixture.status || '')}
              <span className="ml-1 capitalize">{(fixture.status || '').replace('_', ' ')}</span>
            </span>
          </div>
        </div>
      )}

      {/* Matches Table */}
      <AdvancedTable<MatchData>
        data={matches || []}
        columns={matchColumns}
        actions={matchActions}
        loading={authLoading || matchesLoading || (fixtureId && fixtureLoading)}
        searchable={true}
        searchPlaceholder="Search matches..."
        filterable={true}
        filters={matchFilters}
        sortable={true}
        selectable={true}
        selectedRows={selectedMatches}
        onSelectionChange={setSelectedMatches}
        onRowClick={handleMatchClick}
        keyExtractor={(match) => match.id}
        headerActions={getHeaderActions()}
        emptyState={{
          icon: Calendar,
          title: 'No matches scheduled',
          description: fixtureId 
            ? 'This tournament has no matches yet.' 
            : 'No matches are scheduled for this venue.'
        }}
        groupBy="roundName"
        pagination={{ enabled: true, pageSize: 20 }}
        persistState={false}
      />

      {/* Match Detail Modal */}
      <EnhancedModal
        isOpen={showMatchModal}
        onClose={() => {
          setShowMatchModal(false);
          setSelectedMatch(null);
        }}
        title="Match Management"
        subtitle={selectedMatch ? `${selectedMatch.team1Name} vs ${selectedMatch.team2Name}` : undefined}
        size="lg"
        mobileFullScreen={true}
        scrollableBody={true}
        footer={
          <div className="flex flex-row space-x-3 sm:justify-end">
            <button
              onClick={() => {
                if (selectedMatch) {
                  router.push(`/${lang}/volunteer/venues/${venueId}/matches/${selectedMatch.id}/scoring`);
                }
              }}
              className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] hover:bg-[#E67A26] text-white rounded-lg font-medium py-2 text-sm transition-colors flex items-center justify-center"
              disabled={selectedMatch?.status !== 'ready' && selectedMatch?.status !== 'in_progress'}
            >
              <Target className="w-4 h-4 mr-2" />
              Score Match
            </button>
            <button
              onClick={() => {
                setShowMatchModal(false);
                setSelectedMatch(null);
              }}
              className="flex-1 sm:flex-initial sm:px-4 text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg font-medium py-2 text-sm transition-colors"
            >
              Close
            </button>
          </div>
        }
      >
        {selectedMatch && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Match Information</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Round:</span>
                  <span>{selectedMatch.roundName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedMatch.status)}`}>
                    {getStatusIcon(selectedMatch.status)}
                    <span className="ml-1 capitalize">{selectedMatch.status.replace('_', ' ')}</span>
                  </span>
                </div>
                {selectedMatch.scheduledTime && (
                  <div className="flex justify-between">
                    <span className="font-medium">Scheduled:</span>
                    <span>{new Date(selectedMatch.scheduledTime).toLocaleString()}</span>
                  </div>
                )}
                {(selectedMatch.team1Score !== undefined && selectedMatch.team2Score !== undefined) && (
                  <div className="flex justify-between">
                    <span className="font-medium">Final Score:</span>
                    <span className="font-mono font-bold">
                      {selectedMatch.team1Score} - {selectedMatch.team2Score}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </EnhancedModal>

      {/* Bulk Update Modal */}
      <EnhancedModal
        isOpen={showBulkUpdateModal}
        onClose={() => setShowBulkUpdateModal(false)}
        title="Bulk Update Matches"
        subtitle="Update multiple matches at once"
        size="md"
        mobileFullScreen={true}
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowBulkUpdateModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Handle bulk update logic here
                addNotification({
                  type: 'success',
                  title: 'Bulk Update',
                  message: 'Match updates will be implemented soon'
                });
                setShowBulkUpdateModal(false);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-[#F28C38] rounded-lg hover:bg-[#E67A26]"
            >
              Apply Updates
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Bulk update functionality for matches is coming soon. This will allow you to update multiple match statuses, schedules, and other properties at once.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> This feature is currently under development.
            </p>
          </div>
        </div>
      </EnhancedModal>
    </div>
  );
}