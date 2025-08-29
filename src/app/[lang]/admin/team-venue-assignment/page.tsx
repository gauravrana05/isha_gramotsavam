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
  MapPin,
  Users,
  Target,
  Zap,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  Building2,
  Navigation,
  Layers,
  Loader2
} from 'lucide-react';

interface TeamVenueData {
  id: string;
  name: string;
  district: string;
  taluk: string;
  state: string;
  sportName: string;
  status: string;
  currentVenueAssignment?: {
    venueId: string;
    venueName: string;
    assignmentLevel: string;
    assignedAt: string | null;
  };
}

interface AvailableVenueData {
  mappingId: string;
  venue: {
    id: string;
    name: string;
    district: string;
    state: string;
  };
  level: string;
  maxTeams: number;
  assignedTeamsCount: number;
  availableCapacity: number;
  isAtCapacity: boolean;
  routingTier: number;
  routingReason: string;
}

export default function TeamVenueAssignmentPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [showRoutingLogic, setShowRoutingLogic] = useState(false);
  const [availableVenues, setAvailableVenues] = useState<AvailableVenueData[]>([]);

  // tRPC queries
  const {
    data: eventsData,
    isLoading: eventsLoading
  } = api.admin.getEvents.useQuery({
    limit: 50,
    status: 'active',
    includeStats: false
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  const {
    data: teamsData,
    isLoading: teamsLoading
  } = api.admin.getAdminTeams.useQuery({
    limit: 100,
    status: 'verified'
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  // Get available venues for selected team
  const {
    data: venueRoutingData,
    isLoading: routingLoading,
    refetch: refetchRouting
  } = api.admin.getAvailableVenuesForTeam.useQuery({
    teamId: selectedTeam,
    eventId: selectedEvent,
    level: 'cluster'
  }, {
    enabled: !!selectedTeam && !!selectedEvent
  });

  // Auto assign venue mutation
  const autoAssignMutation = api.admin.autoAssignTeamVenue.useMutation({
    onSuccess: (result) => {
      alert(`Successfully assigned team to ${result.assignment.venueMapping?.venueName}!`);
      refetchRouting();
      setSelectedTeam('');
    },
    onError: (error) => {
      alert(error.message || 'Failed to assign venue');
    }
  });

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

  useEffect(() => {
    if (venueRoutingData?.availableVenues) {
      setAvailableVenues(venueRoutingData.availableVenues);
    }
  }, [venueRoutingData]);

  const loading = eventsLoading || teamsLoading;
  const events = eventsData?.events || [];
  const teams = teamsData?.teams || [];

  const handleAutoAssign = (teamId: string, forceMappingId?: string) => {
    if (!selectedEvent) {
      alert('Please select an event first');
      return;
    }

    autoAssignMutation.mutate({
      teamId,
      eventId: selectedEvent,
      level: 'cluster',
      forceVenueMappingId: forceMappingId
    });
  };

  // Team table columns
  const teamColumns: Column<TeamVenueData>[] = useMemo(() => [
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
          <div className="text-xs text-gray-400">{team.taluk}, {team.district}</div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Team Location',
      accessor: 'district',
      sortable: true,
      minWidth: 150,
      render: (_, team) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{team.district}</div>
          <div className="text-gray-500">{team.taluk}</div>
          <div className="text-xs text-gray-400">{team.state}</div>
        </div>
      ),
    },
    {
      key: 'assignment',
      header: 'Current Assignment',
      accessor: 'currentVenueAssignment',
      minWidth: 180,
      render: (_, team) => {
        if (!team.currentVenueAssignment) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Not Assigned
            </span>
          );
        }

        return (
          <div>
            <div className="text-sm font-medium text-gray-900">{team.currentVenueAssignment.venueName}</div>
            <div className="text-xs text-gray-500 capitalize">{team.currentVenueAssignment.assignmentLevel}</div>
            {team.currentVenueAssignment.assignedAt && (
              <div className="text-xs text-gray-400">
                {new Date(team.currentVenueAssignment.assignedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      minWidth: 120,
      render: (_, team) => {
        const hasAssignment = !!team.currentVenueAssignment;
        
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
            hasAssignment
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {hasAssignment ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Assigned
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 mr-1" />
                Pending
              </>
            )}
          </span>
        );
      },
    }
  ], []);

  const teamActionButtons: ActionButton<TeamVenueData>[] = useMemo(() => [
    {
      label: 'View Routing',
      icon: <Navigation className="w-4 h-4" />,
      onClick: (team) => {
        setSelectedTeam(team.id);
        setShowRoutingLogic(true);
      },
      variant: 'secondary'
    },
    {
      label: 'Auto Assign',
      icon: <Zap className="w-4 h-4" />,
      onClick: (team) => handleAutoAssign(team.id),
      variant: 'primary',
      disabled: (team) => !!team.currentVenueAssignment || !selectedEvent
    }
  ], [selectedEvent]);

  // Available venues table columns
  const venueColumns: Column<AvailableVenueData>[] = useMemo(() => [
    {
      key: 'tier',
      header: 'Routing Tier',
      accessor: 'routingTier',
      sortable: true,
      minWidth: 120,
      render: (_, venue) => (
        <div className="flex items-center">
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2 ${
            venue.routingTier === 1 ? 'bg-green-100 text-green-800' :
            venue.routingTier === 2 ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {venue.routingTier}
          </span>
          <div>
            <div className="text-sm font-medium text-gray-900">Tier {venue.routingTier}</div>
            <div className="text-xs text-gray-500">
              {venue.routingTier === 1 ? 'Direct Mapping' :
               venue.routingTier === 2 ? 'District Level' :
               'Fallback'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'venue',
      header: 'Venue Details',
      accessor: 'venue.name',
      sortable: true,
      minWidth: 200,
      render: (_, venue) => (
        <div>
          <div className="text-sm font-medium text-gray-900 flex items-center">
            <Building2 className="w-4 h-4 mr-2 text-gray-400" />
            {venue.venue.name}
          </div>
          <div className="text-sm text-gray-500">{venue.venue.district}, {venue.venue.state}</div>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      accessor: 'maxTeams',
      sortable: true,
      minWidth: 140,
      render: (_, venue) => {
        const utilizationPercent = Math.round((venue.assignedTeamsCount / venue.maxTeams) * 100);
        
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              {venue.assignedTeamsCount} / {venue.maxTeams}
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-12 h-2 rounded-full bg-gray-200">
                <div 
                  className={`h-2 rounded-full ${
                    venue.isAtCapacity ? 'bg-red-400' :
                    utilizationPercent >= 75 ? 'bg-yellow-400' :
                    'bg-green-400'
                  }`}
                  style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{utilizationPercent}%</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'reasoning',
      header: 'Routing Logic',
      accessor: 'routingReason',
      minWidth: 250,
      render: (_, venue) => (
        <div className="text-sm text-gray-600">
          {venue.routingReason}
        </div>
      ),
    }
  ], []);

  const venueActionButtons: ActionButton<AvailableVenueData>[] = useMemo(() => [
    {
      label: 'Assign Manually',
      icon: <Target className="w-4 h-4" />,
      onClick: (venue) => {
        if (selectedTeam) {
          handleAutoAssign(selectedTeam, venue.mappingId);
        }
      },
      variant: 'primary',
      disabled: (venue) => venue.isAtCapacity || !selectedTeam
    }
  ], [selectedTeam]);

  if (authLoading || loading) {
    return <PageLoader title="Loading team venue assignment..." />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">3-Tier Team Venue Assignment</h1>
        <p className="text-gray-600 text-sm">Intelligent venue assignment using taluk→district→fallback routing</p>
      </div>

      {/* Event Selection */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Select Event</h3>
            <p className="text-sm text-gray-500">Choose an event to manage team venue assignments</p>
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

      {/* Routing Logic Explanation */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Layers className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
          <div>
            <h3 className="font-semibold text-blue-900">3-Tier Venue Assignment Logic</h3>
            <div className="text-sm text-blue-700 mt-1 space-y-1">
              <p><strong>Tier 1:</strong> Direct taluk → cluster venue mapping (highest priority)</p>
              <p><strong>Tier 2:</strong> District-level cluster venues (single = auto, multiple = manual selection)</p>
              <p><strong>Tier 3:</strong> Fallback to any available cluster venue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Teams Table */}
      <div className="mb-8 bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Teams Requiring Venue Assignment</h2>
          <p className="text-sm text-gray-500 mt-1">
            Verified teams that need venue assignments
          </p>
        </div>

        <AdvancedTable<TeamVenueData>
          data={teams.filter(team => !team.currentVenueAssignment)}
          columns={teamColumns}
          actionButtons={teamActionButtons}
          loading={teamsLoading}
          
          searchable={true}
          searchPlaceholder="Search teams by name, district, taluk..."
          
          sortable={true}
          defaultSort={[{ key: 'district', direction: 'asc' }, { key: 'taluk', direction: 'asc' }]}
          
          pagination={{ enabled: true, pageSize: 10 }}
          
          keyExtractor={(team) => team.id}
          stickyHeader={true}
          
          emptyState={{
            icon: Users,
            title: 'All teams have venue assignments',
            description: 'Great! All verified teams have been assigned to venues.'
          }}
        />
      </div>

      {/* Available Venues for Selected Team */}
      {selectedTeam && availableVenues.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Available Venues</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Routing options for selected team (showing tier priority order)
                </p>
              </div>
              {venueRoutingData?.teamDetails && (
                <div className="text-sm text-gray-600">
                  Team Location: {venueRoutingData.teamDetails.taluk}, {venueRoutingData.teamDetails.district}
                </div>
              )}
            </div>
          </div>

          <AdvancedTable<AvailableVenueData>
            data={availableVenues}
            columns={venueColumns}
            actionButtons={venueActionButtons}
            loading={routingLoading}
            
            sortable={true}
            defaultSort={[{ key: 'routingTier', direction: 'asc' }]}
            
            keyExtractor={(venue) => venue.mappingId}
            stickyHeader={true}
            
            emptyState={{
              icon: MapPin,
              title: 'No available venues',
              description: 'No venues with capacity available for this team.'
            }}
          />
        </div>
      )}
    </div>
  );
}