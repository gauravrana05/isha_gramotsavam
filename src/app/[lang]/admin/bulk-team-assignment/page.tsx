"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { 
  AdvancedTable,
  SingleStatCard,
  PageLoader,
  Button,
  type Column,
  type ActionButton,
} from '@/components/ui';
import { 
  Users,
  Target,
  Zap,
  CheckCircle,
  AlertTriangle,
  Clock,
  Building2,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Loader2
} from 'lucide-react';

interface TeamData {
  id: string;
  name: string;
  district: string;
  taluk: string;
  state: string;
  sportName: string;
  status: string;
  hasAssignment: boolean;
  routingTier?: number;
  recommendedVenue?: {
    mappingId: string;
    venueName: string;
    routingReason: string;
  };
}

interface BulkAssignmentResult {
  teamId: string;
  teamName: string;
  success: boolean;
  venueName?: string;
  error?: string;
}

export default function BulkTeamAssignmentPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [isProcessing, setBulkProcessing] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkAssignmentResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // tRPC queries
  const {
    data: eventsData,
    isLoading: eventsLoading
  } = api.admin.events.getEvents.useQuery({
    limit: 50,
    status: 'active',
    includeStats: false
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  const {
    data: teamsData,
    isLoading: teamsLoading,
    refetch: refetchTeams
  } = api.admin.teams.getAdminTeams.useQuery({
    limit: 200,
    status: 'verified'
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  // Auto assign venue mutation
  const autoAssignMutation = api.admin.venues.autoAssignTeamVenue.useMutation();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (userProfile?.role !== 'admin') {
      router.push(`/${lang}/player/dashboard`);
      return;
    }
  }, [user, userProfile, authLoading, lang, router]);

  const loading = eventsLoading || teamsLoading;
  const events = eventsData?.events || [];
  const teams = teamsData?.teams || [];

  // Filter teams that don&apos;t have assignments
  const unassignedTeams = useMemo(() => {
    return teams.filter(team => !team.currentVenueAssignment);
  }, [teams]);

  const handleBulkAssignment = async () => {
    if (!selectedEvent || selectedTeams.size === 0) {
      alert('Please select an event and at least one team');
      return;
    }

    setBulkProcessing(true);
    setBulkResults([]);
    setShowResults(true);

    const results: BulkAssignmentResult[] = [];
    const selectedTeamIds = Array.from(selectedTeams);

    for (const teamId of selectedTeamIds) {
      const team = unassignedTeams.find(t => t.id === teamId);
      if (!team) continue;

      try {
        const result = await autoAssignMutation.mutateAsync({
          teamId,
          eventId: selectedEvent,
          level: 'cluster'
        });

        results.push({
          teamId,
          teamName: team.name,
          success: true,
          venueName: result.assignment.venueMapping?.venueName
        });
      } catch (error: any) {
        results.push({
          teamId,
          teamName: team.name,
          success: false,
          error: error.message || 'Assignment failed'
        });
      }
    }

    setBulkResults(results);
    setBulkProcessing(false);
    
    // Refresh teams data
    await refetchTeams();
    
    // Clear selections
    setSelectedTeams(new Set());
  };

  const handleSelectAll = () => {
    if (selectedTeams.size === unassignedTeams.length) {
      setSelectedTeams(new Set());
    } else {
      setSelectedTeams(new Set(unassignedTeams.map(team => team.id)));
    }
  };

  const handleTeamSelect = (teamId: string, selected: boolean) => {
    const newSelection = new Set(selectedTeams);
    if (selected) {
      newSelection.add(teamId);
    } else {
      newSelection.delete(teamId);
    }
    setSelectedTeams(newSelection);
  };

  // Team table columns
  const teamColumns: Column<TeamData>[] = useMemo(() => [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={selectedTeams.size === unassignedTeams.length && unassignedTeams.length > 0}
          onChange={handleSelectAll}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      ),
      accessor: 'id',
      minWidth: 50,
      render: (_, team) => (
        <input
          type="checkbox"
          checked={selectedTeams.has(team.id)}
          onChange={(e) => handleTeamSelect(team.id, e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      ),
    },
    {
      key: 'team',
      header: 'Team Details',
      accessor: 'name',
      sortable: true,
      minWidth: 200,
      render: (_, team) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{team.name}</div>
          <div className="text-sm text-gray-500">{team.sportName}</div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location (Routing)',
      accessor: 'district',
      sortable: true,
      minWidth: 180,
      render: (_, team) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{team.district}</div>
          <div className="text-gray-500">{team.taluk}</div>
          <div className="text-xs text-gray-400">{team.state}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Assignment Status',
      accessor: 'hasAssignment',
      sortable: true,
      minWidth: 140,
      render: (_, team) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Not Assigned
        </span>
      ),
    }
  ], [selectedTeams, unassignedTeams]);

  // Bulk results table columns
  const resultsColumns: Column<BulkAssignmentResult>[] = useMemo(() => [
    {
      key: 'status',
      header: 'Status',
      accessor: 'success',
      minWidth: 100,
      render: (_, result) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
          result.success 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {result.success ? (
            <>
              <CheckCircle className="w-3 h-3 mr-1" />
              Success
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3 mr-1" />
              Failed
            </>
          )}
        </span>
      ),
    },
    {
      key: 'teamName',
      header: 'Team Name',
      accessor: 'teamName',
      sortable: true,
      minWidth: 200,
      render: (_, result) => (
        <div className="text-sm font-medium text-gray-900">{result.teamName}</div>
      ),
    },
    {
      key: 'venue',
      header: 'Assigned Venue',
      accessor: 'venueName',
      minWidth: 200,
      render: (_, result) => (
        <div className="text-sm">
          {result.success && result.venueName ? (
            <div className="font-medium text-gray-900 flex items-center">
              <Building2 className="w-4 h-4 mr-2 text-green-600" />
              {result.venueName}
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'error',
      header: 'Details',
      accessor: 'error',
      minWidth: 250,
      render: (_, result) => (
        <div className="text-sm">
          {result.success ? (
            <span className="text-green-600">Successfully assigned via 3-tier routing</span>
          ) : (
            <span className="text-red-600">{result.error}</span>
          )}
        </div>
      ),
    }
  ], []);

  if (authLoading || loading) {
    return <PageLoader title="Loading bulk team assignment..." />;
  }

  const assignedCount = teams.filter(team => !!team.currentVenueAssignment).length;
  const unassignedCount = teams.length - assignedCount;
  const successfulAssignments = bulkResults.filter(r => r.success).length;
  const failedAssignments = bulkResults.filter(r => !r.success).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Team Venue Assignment</h1>
        <p className="text-gray-600 text-sm">Assign multiple teams to venues using intelligent 3-tier routing</p>
      </div>

      {/* Event Selection */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Select Event</h3>
            <p className="text-sm text-gray-500">Choose an active event for bulk team assignments</p>
          </div>
          <div className="w-64">
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an event...</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SingleStatCard
          title="Total Teams"
          value={teams.length.toString()}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <SingleStatCard
          title="Already Assigned"
          value={assignedCount.toString()}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
        <SingleStatCard
          title="Pending Assignment"
          value={unassignedCount.toString()}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="yellow"
        />
        <SingleStatCard
          title="Selected for Bulk"
          value={selectedTeams.size.toString()}
          icon={<Target className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Bulk Actions */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Bulk Assignment Actions</h3>
            <p className="text-sm text-gray-500">
              {selectedTeams.size > 0 
                ? `${selectedTeams.size} teams selected for assignment`
                : 'Select teams to enable bulk assignment'
              }
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={handleSelectAll}
              disabled={unassignedTeams.length === 0}
              className="flex items-center"
            >
              <Users className="w-4 h-4 mr-2" />
              {selectedTeams.size === unassignedTeams.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button
              variant="primary"
              onClick={handleBulkAssignment}
              disabled={selectedTeams.size === 0 || !selectedEvent || isProcessing}
              className="flex items-center"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Assign Selected ({selectedTeams.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Processing Results */}
      {showResults && bulkResults.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Bulk Assignment Results</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {successfulAssignments} successful, {failedAssignments} failed out of {bulkResults.length} total
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                  {successfulAssignments} Success
                </span>
                {failedAssignments > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">
                    {failedAssignments} Failed
                  </span>
                )}
              </div>
            </div>
          </div>

          <AdvancedTable<BulkAssignmentResult>
            data={bulkResults}
            columns={resultsColumns}
            loading={false}
            
            sortable={true}
            defaultSort={[{ key: 'success', direction: 'desc' }]}
            
            keyExtractor={(result) => result.teamId}
            stickyHeader={true}
            
            emptyState={{
              icon: Target,
              title: 'No results yet',
              description: 'Assignment results will appear here'
            }}
          />
        </div>
      )}

      {/* Unassigned Teams Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Teams Pending Venue Assignment</h2>
          <p className="text-sm text-gray-500 mt-1">
            Verified teams that need venue assignments via 3-tier routing
          </p>
        </div>

        <AdvancedTable<TeamData>
          data={unassignedTeams}
          columns={teamColumns}
          loading={teamsLoading}
          
          searchable={true}
          searchPlaceholder="Search teams by name, district, taluk..."
          
          sortable={true}
          defaultSort={[{ key: 'district', direction: 'asc' }, { key: 'taluk', direction: 'asc' }]}
          
          pagination={{ enabled: true, pageSize: 15 }}
          
          keyExtractor={(team) => team.id}
          stickyHeader={true}
          
          emptyState={{
            icon: CheckCircle,
            title: 'All teams have venue assignments',
            description: 'Great! All verified teams have been assigned to venues.'
          }}
        />
      </div>
    </div>
  );
}