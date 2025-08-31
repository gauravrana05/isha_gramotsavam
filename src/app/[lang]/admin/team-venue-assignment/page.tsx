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
  const [selectedTeam, setSelectedTeam] = useState<TeamAssignmentData | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>('');

  // Table state - default to showing only pending (unassigned) teams
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: { page: 1, pageSize: 50 },
    sorting: { field: 'name', direction: 'asc' },
    filters: { status: 'unassigned' }, // Focus on teams needing manual intervention
  });

  // Auth check
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push(`/${lang}/auth/login`);
    }
  }, [user, userProfile, authLoading, router, lang]);

  // Get events for filter - use 'ongoing' for current active events
  const { data: eventsData } = api.admin.events.getEvents.useQuery({
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
    
    return teamAssignmentsData.map(team => ({
      ...team,
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

  const loading = authLoading || assignmentsLoading;

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

  // Header actions - only show when teams are selected
  const headerActions = selectedTeams.size > 0 ? (
    <div className="flex items-center space-x-3">
      <button
        onClick={() => {
          // Handle bulk venue assignment
          console.log('Assign venues to selected teams:', Array.from(selectedTeams));
        }}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        disabled={!selectedEvent || loading}
      >
        <MapPin className="w-4 h-4 mr-2" />
        Assign Venue ({selectedTeams.size})
      </button>
    </div>
  ) : null;

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
            </div>
          </EnhancedModal>
        )}
      </div>
    </div>
  );
}
