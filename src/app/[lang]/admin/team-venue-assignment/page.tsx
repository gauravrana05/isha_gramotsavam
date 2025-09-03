'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/server/trpc/react';
import { 
  AdvancedTable,
  PageLoader,
  type Column,
  type FilterField,
  type TableParams,
} from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import { 
  MapPin,
  Users,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
} from 'lucide-react';

// Venue Assignment Modal Component
interface VenueAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTeams: string[];
  teams: TeamAssignmentData[];
  eventId: string;
  onAssignmentComplete: () => void;
}

function VenueAssignmentModal({ 
  isOpen, 
  onClose, 
  selectedTeams, 
  teams, 
  eventId, 
  onAssignmentComplete 
}: VenueAssignmentModalProps) {
  const { addNotification } = useNotification();
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  
  // Get team data for selected teams
  const teamData = selectedTeams.map(teamId => teams.find(t => t.id === teamId)).filter(Boolean);
  const firstTeam = teamData[0];
  
  // Determine level and state
  const level = firstTeam?.assignment?.divisionQualified ? 'final' : 
               firstTeam?.assignment?.clusterQualified ? 'division' : 'cluster';
  const state = firstTeam?.state;
  
  // Get available venues for this level and state
  const { data: venuesData, isLoading: venuesLoading } = api.admin.venues.getVenueLevelMappings.useQuery({
    eventId,
    level: 'cluster',
    state,
  }, {
    enabled: !!eventId && !!state,
  });
  
  // Manual assign mutation
  const assignMutation = api.admin.venueAssignment.manualAssignVenue.useMutation({
    onSuccess: () => {
      addNotification('Venues assigned successfully', 'success');
      onAssignmentComplete();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to assign venues', 'error');
    },
  });
  
  const handleAssign = async () => {
    if (!selectedVenue) {
      addNotification('Please select a venue', 'error');
      return;
    }
    
    // Assign venue to all selected teams
    for (const teamId of selectedTeams) {
      await assignMutation.mutateAsync({
        teamId,
        eventId,
        venueLevelMappingId: selectedVenue,
        level: 'cluster',
      });
    }
  };
  
  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Venues"
      subtitle={`Select cluster venue for ${selectedTeams.length} team(s) in ${state}`}
      size="lg"
      mobileFullScreen={true}
    >
      <div className="p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available Venues
          </label>
          <Select value={selectedVenue} onValueChange={setSelectedVenue}>
            <SelectTrigger>
              <SelectValue placeholder="Select a venue..." />
            </SelectTrigger>
            <SelectContent>
              {venuesLoading ? (
                <SelectItem value="loading" disabled>Loading venues...</SelectItem>
              ) : venuesData?.length === 0 ? (
                <SelectItem value="no-venues" disabled>No cluster venues available</SelectItem>
              ) : (
                venuesData?.map((mapping) => (
                  <SelectItem key={mapping.id} value={mapping.id}>
                    {mapping.venue.name} - {mapping.venue.district}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Teams:</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {teamData.map((team) => (
              <div key={team.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">{team.name}</span>
                <span className="text-xs text-gray-500">{team.captain.name}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={assignMutation.isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            className="px-4 py-2 text-sm font-medium text-white bg-[#F28C38] rounded-lg hover:bg-[#E67A26] disabled:opacity-50"
            disabled={!selectedVenue || assignMutation.isLoading}
          >
            {assignMutation.isLoading ? 'Assigning...' : `Assign to ${selectedTeams.length} Teams`}
          </button>
        </div>
      </div>
    </EnhancedModal>
  );
}

interface TeamAssignmentData {
  id: string;
  name: string;
  captain: {
    name: string;
    phone: string;
    district: string;
    state: string;
    taluk: string;
    panchayat: string;
  };
  assignment: {
    id: string;
    level: 'cluster' | 'division' | 'final';
    assignmentMethod: 'auto_assigned' | 'manual_assigned';
    clusterVenueMapping?: {
      venue: {
        id: string;
        name: string;
        district: string;
        state: string;
      };
    };
    divisionVenueMapping?: {
      venue: {
        id: string;
        name: string;
        district: string;
        state: string;
      };
    };
    finalVenueMapping?: {
      venue: {
        id: string;
        name: string;
        district: string;
        state: string;
      };
    };
  } | null;
}

export default function TeamVenueAssignmentPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = React.use(params);
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();

  // State management
  const [selectedTeams, setSelectedTeams] = useState<Set<string | number>>(new Set());
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamAssignmentData | null>(null);
  const [editVenue, setEditVenue] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<string>('');

  // Table state - default to showing all teams
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: { page: 1, pageSize: 50 },
    sorting: { field: 'name', direction: 'asc' },
    filters: { status: 'all' }, // Show all teams by default
  });

  // Auth check
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push(`/${lang}/auth/login`);
    }
  }, [user, userProfile, authLoading, router, lang]);

  // Get events for filter - use 'ongoing' for current active events
  const { data: eventsData, isLoading: eventsLoading } = api.admin.events.getEvents.useQuery({
    limit: 100,
    status: 'ongoing',
  });

  // Get team assignments
  const {
    data: teamAssignmentsData,
    isLoading: assignmentsLoading,
    error: assignmentsError,
    refetch: refetchAssignments
  } = api.admin.venueAssignment.getTeamAssignments.useQuery({
    eventId: selectedEvent,
    status: tableParams.filters.status as 'all' | 'assigned' | 'unassigned' || 'all',
    district: tableParams.filters.district as string,
  }, {
    enabled: !!selectedEvent,
  });

  // Mutations
  const manualAssignMutation = api.admin.venueAssignment.manualAssignVenue.useMutation({
    onSuccess: () => {
      addNotification('Venue manually assigned successfully', 'success');
      setSelectedTeams(new Set());
      refetchAssignments();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to assign venue', 'error');
    },
  });

  // Set default event
  useEffect(() => {
    if (eventsData?.events && eventsData.events.length > 0 && !selectedEvent) {
      setSelectedEvent(eventsData.events[0].id);
    }
  }, [eventsData, selectedEvent]);

  // Memoized data processing
  const teams = useMemo(() => {
    if (!teamAssignmentsData) return [];
    
    console.log('🔍 Team assignments data:', teamAssignmentsData);
    console.log('🔍 Teams with assignments:', teamAssignmentsData.filter(t => t.teamVenueAssignments?.length > 0));
    
    return teamAssignmentsData.map(team => ({
      ...team,
      assignment: team.teamVenueAssignments?.[0] || null, // Map first assignment to assignment property
      captain: {
        name: team.captainUser ? `${team.captainUser.firstName} ${team.captainUser.lastName}` : 'N/A',
        phone: team.captainUser?.phone || 'N/A',
        district: team.captainUser?.district || 'N/A',
        state: team.captainUser?.state || 'N/A',
        taluk: team.captainUser?.taluk || 'N/A',
        panchayat: team.captainUser?.panchayat || 'N/A',
      }
    }));
  }, [teamAssignmentsData]);

  const loading = assignmentsLoading || eventsLoading || (!selectedEvent && eventsData?.events?.length > 0);

  // Table columns
  const columns: Column<TeamAssignmentData>[] = [
    {
      key: 'name',
      header: 'Team',
      sortable: true,
      render: (_, team) => (
        <div className="font-medium text-gray-900">
          {team.name}
        </div>
      ),
    },
    {
      key: 'captain',
      header: 'Captain',
      render: (_, team) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{team.captain.name}</div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Captain Phone',
      render: (_, team) => (
        <div className="text-sm text-gray-900">
          {team.captain.phone}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (_, team) => (
        <div className="text-sm text-gray-600">
          <div>{team.captain.panchayat}, {team.captain.taluk}</div>
          <div>{team.captain.district}, {team.captain.state}</div>
        </div>
      ),
    },
    {
      key: 'venue',
      header: 'Venue',
      render: (_, team) => {
        if (!team.assignment) {
          return <span className="text-gray-400 text-sm">Not Assigned</span>;
        }

        const venue = team.assignment.clusterVenueMapping?.venue || 
                     team.assignment.divisionVenueMapping?.venue || 
                     team.assignment.finalVenueMapping?.venue;

        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900">{venue?.name}</div>
            <div className="text-gray-500">{venue?.district}, {venue?.state}</div>
          </div>
        );
      },
    },
    {
      key: 'assignment',
      header: 'Assignment',
      render: (_, team) => {
        if (!team.assignment) {
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              Manual
            </span>
          );
        }

        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            team.assignment.assignmentMethod === 'auto_assigned' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-orange-100 text-orange-700'
          }`}>
            {team.assignment.assignmentMethod === 'auto_assigned' ? 'Auto' : 'Manual'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, team) => {
        if (!team.assignment) {
          return (
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-orange-500 mr-2" />
              <span className="text-orange-600 text-sm font-medium">Pending</span>
            </div>
          );
        }

        return (
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
            <span className="text-green-600 text-sm font-medium">Assigned</span>
          </div>
        );
      },
    },
  ];

  // Filter fields
  const filterFields: FilterField[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'all', label: 'All Teams' },
        { value: 'assigned', label: 'Assigned' },
        { value: 'unassigned', label: 'Pending' },
      ],
      placeholder: 'Filter by status...',
    },
    {
      key: 'district',
      label: 'District',
      type: 'text',
      placeholder: 'Filter by district...',
    },
  ];

  // Header actions - only show when teams are selected and all at same level
  const headerActions = useMemo(() => {
    console.log('🔍 Header actions check:', { selectedTeamsSize: selectedTeams.size, selectedTeams: Array.from(selectedTeams) });
    
    if (selectedTeams.size === 0) return null;
    
    // Check if all selected teams are at the same assignment level AND same state
    const selectedTeamsList = Array.from(selectedTeams);
    console.log('🔍 Selected team IDs:', selectedTeamsList);
    console.log('🔍 Available teams:', teams.map(t => ({ id: t.id, name: t.name })));
    
    const teamData = selectedTeamsList.map(teamId => {
      const team = teams.find(t => t.id === teamId);
      console.log('🔍 Looking for team:', teamId, 'Found:', team?.name);
      
      if (!team) return null;
      
      // Determine next level based on qualification status
      let level = 'cluster';
      if (team.assignment?.divisionQualified) level = 'final';
      else if (team.assignment?.clusterQualified) level = 'division';
      
      return {
        teamId,
        level,
        state: team.captain.state,
        team
      };
    }).filter(Boolean);
    
    const teamLevels = teamData.map(t => t.level);
    const teamStates = teamData.map(t => t.state);
    
    console.log('🔍 Team levels:', teamLevels);
    console.log('🔍 Team states:', teamStates);
    
    // Only show if all teams are at the same level AND same state
    const uniqueLevels = [...new Set(teamLevels)];
    const uniqueStates = [...new Set(teamStates)];
    console.log('🔍 Unique levels:', uniqueLevels);
    console.log('🔍 Unique states:', uniqueStates);
    
    if (uniqueLevels.length !== 1) {
      console.log('❌ Mixed levels, no header action');
      return null;
    }
    
    if (uniqueStates.length !== 1) {
      console.log('❌ Mixed states, no header action');
      return null;
    }
    
    const level = uniqueLevels[0];
    const state = uniqueStates[0];
    console.log('✅ Same level and state, showing header action:', { level, state });
    
    return (
      <div className="flex items-center space-x-3">
        <button
          onClick={() => {
            console.log(`Assign cluster venues to ${selectedTeams.size} teams in ${state}`);
            setShowAssignModal(true);
          }}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          disabled={!selectedEvent || loading}
        >
          <MapPin className="w-4 h-4 mr-2" />
          Assign Cluster Venue ({selectedTeams.size})
        </button>
      </div>
    );
  }, [selectedTeams, teams, selectedEvent, loading]);

  // Row click handler
  const handleRowClick = (team: TeamAssignmentData) => {
    setSelectedTeam(team);
    setShowViewModal(true);
  };

  if (loading && !selectedEvent) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Information Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Teams are automatically assigned to venues during creation; please assign the team with conflicts manually.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdvancedTable<TeamAssignmentData>
          data={(teams || []) as TeamAssignmentData[]}
          columns={columns}
          loading={loading}
          error={assignmentsError?.message}
          tableParams={tableParams}
          onTableParamsChange={setTableParams}
          selectedRows={selectedTeams}
          onSelectionChange={setSelectedTeams}
          selectable={true}
          keyExtractor={(item) => item.id}
          filters={filterFields}
          filterable={true}
          headerActions={headerActions}
          onRowClick={handleRowClick}
          searchable
          searchPlaceholder="Search teams, captains, or venues..."
          emptyState={{
            icon: CheckCircle,
            title: 'All teams have venue assignments',
            description: selectedEvent 
              ? 'Great! All teams for this event have been automatically assigned to venues. Change filter to "All Teams" to view all assignments.' 
              : 'Please select an event to view team assignments.',
          }}
        />

        {/* Team Details Modal */}
        {showViewModal && selectedTeam && (
          <EnhancedModal
            isOpen={showViewModal}
            onClose={() => {
              setShowViewModal(false);
              setSelectedTeam(null);
            }}
            title="Team Details"
            subtitle={`${selectedTeam.name} - Assignment Information`}
            size="lg"
            mobileFullScreen={true}
            footer={
              <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedTeam(null);
                    setEditVenue('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // TODO: Save venue assignment
                    console.log('Save venue assignment:', editVenue);
                    setShowViewModal(false);
                    setSelectedTeam(null);
                    setEditVenue('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#F28C38] rounded-lg hover:bg-[#E67A26] disabled:opacity-50"
                  disabled={!editVenue}
                >
                  Save Changes
                </button>
              </div>
            }
          >
            <div className="space-y-6">
              {/* Team Information */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-4">Team Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                    <p className="text-sm text-gray-900">{selectedTeam.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div className="flex items-center">
                      {selectedTeam.assignment ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-green-600 text-sm font-medium">Assigned</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-orange-500 mr-2" />
                          <span className="text-orange-600 text-sm font-medium">Pending</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Captain Information */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-4">Captain Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <p className="text-sm text-gray-900">{selectedTeam.captain.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-gray-400 mr-2" />
                      <p className="text-sm text-gray-900">{selectedTeam.captain.phone}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Panchayat</label>
                    <p className="text-sm text-gray-900">{selectedTeam.captain.panchayat}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Taluk</label>
                    <p className="text-sm text-gray-900">{selectedTeam.captain.taluk}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                    <p className="text-sm text-gray-900">{selectedTeam.captain.district}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <p className="text-sm text-gray-900">{selectedTeam.captain.state}</p>
                  </div>
                </div>
              </div>

              {/* Venue Assignment */}
              {selectedTeam.assignment ? (
                <div className="bg-green-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">Venue Assignment</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name</label>
                      <p className="text-sm text-gray-900">
                        {selectedTeam.assignment.clusterVenueMapping?.venue?.name || 
                         selectedTeam.assignment.divisionVenueMapping?.venue?.name || 
                         selectedTeam.assignment.finalVenueMapping?.venue?.name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Method</label>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedTeam.assignment.assignmentMethod === 'auto_assigned' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {selectedTeam.assignment.assignmentMethod === 'auto_assigned' ? 'Auto Assigned' : 'Manual Assignment'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tournament Level</label>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedTeam.assignment.level === 'cluster' ? 'bg-blue-100 text-blue-700' :
                        selectedTeam.assignment.level === 'division' ? 'bg-green-100 text-green-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {selectedTeam.assignment.level.charAt(0).toUpperCase() + selectedTeam.assignment.level.slice(1)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Venue Location</label>
                      <p className="text-sm text-gray-900">
                        {selectedTeam.assignment.clusterVenueMapping?.venue?.district || 
                         selectedTeam.assignment.divisionVenueMapping?.venue?.district || 
                         selectedTeam.assignment.finalVenueMapping?.venue?.district}, {' '}
                        {selectedTeam.assignment.clusterVenueMapping?.venue?.state || 
                         selectedTeam.assignment.divisionVenueMapping?.venue?.state || 
                         selectedTeam.assignment.finalVenueMapping?.venue?.state}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-orange-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Venue Assignment</h4>
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-orange-500 mr-2" />
                    <p className="text-sm text-orange-700">
                      This team is pending venue assignment. The assignment will be made manually by an administrator.
                    </p>
                  </div>
                </div>
              )}

              {/* Venue Selection Section */}
              <div className="bg-blue-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-4">Change Venue Assignment</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select New Venue
                  </label>
                  <Select value={editVenue} onValueChange={setEditVenue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a venue..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venue1">Venue 1 - District A</SelectItem>
                      <SelectItem value="venue2">Venue 2 - District B</SelectItem>
                      <SelectItem value="venue3">Venue 3 - District C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </EnhancedModal>
        )}

        {/* Venue Assignment Modal */}
        {showAssignModal && (
          <VenueAssignmentModal
            isOpen={showAssignModal}
            onClose={() => setShowAssignModal(false)}
            selectedTeams={Array.from(selectedTeams)}
            teams={teams}
            eventId={selectedEvent}
            onAssignmentComplete={() => {
              setShowAssignModal(false);
              setSelectedTeams(new Set());
              refetchAssignments();
            }}
          />
        )}
      </div>
    </div>
  );
}
