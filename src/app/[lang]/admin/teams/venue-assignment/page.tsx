'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  RefreshCw,
  MapPin,
  Users,
  Building,
  Phone,
  User,
  Trophy,
  Target,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface TeamAssignmentData {
  id: string;
  name: string;
  genderCategory: string;
  captainUser?: {
    firstName: string | null;
    lastName: string | null;
    phone: string;
    district: string | null;
    state: string | null;
    taluk: string | null;
    panchayat: string | null;
  };
  sport?: {
    name: string;
  };
  teamVenueAssignments: Array<{
    id: string;
    level: string;
    assignmentMethod: 'auto_assigned' | 'manual_assigned';
    assignedAt: Date;
    clusterVenueMapping?: {
      venue: { name: string };
    };
    divisionVenueMapping?: {
      venue: { name: string };
    };
    finalVenueMapping?: {
      venue: { name: string };
    };
  }>;
}

export default function AdminTeamVenueAssignmentPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();

  // State management
  const [selectedTeams, setSelectedTeams] = useState<Set<string | number>>(new Set());
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamAssignmentData | null>(null);

  // Table state for client-side operations
  const [tableParams, setTableParams] = useState<TableParams>({
    search: '',
    sort: [],
    filters: [],
    page: 1,
    pageSize: 25,
  });

  // Auth check
  useEffect(() => {
    if (!authLoading && (!user || userProfile?.role !== 'admin')) {
      router.push(`/${lang}/dashboard`);
    }
  }, [user, userProfile, authLoading, router, lang]);

  // tRPC query - hardcoded event ID for now
  const eventId = "3034186f-c73d-4862-bcfb-bd05336420c2";
  const {
    data: teamsData,
    isLoading: teamsLoading,
    error: teamsError,
    refetch: refetchTeams
  } = api.admin.venueAssignment.getTeamAssignments.useQuery({
    eventId,
    status: 'all',
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  // Client-side filtered and processed teams
  const teams = useMemo(() => {
    if (!teamsData) return [];

    let filteredTeams = [...teamsData];

    // Apply client-side filtering for search
    if (tableParams.search) {
      const searchLower = tableParams.search.toLowerCase();
      filteredTeams = filteredTeams.filter(team => 
        team.name.toLowerCase().includes(searchLower) ||
        `${team.captainUser?.firstName || ''} ${team.captainUser?.lastName || ''}`.toLowerCase().includes(searchLower) ||
        team.captainUser?.phone?.includes(searchLower) ||
        team.captainUser?.district?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    const statusFilter = tableParams.filters.find(f => f.key === 'status');
    if (statusFilter && statusFilter.value) {
      if (statusFilter.value === 'assigned') {
        filteredTeams = filteredTeams.filter(team => team.teamVenueAssignments.length > 0);
      } else if (statusFilter.value === 'pending') {
        filteredTeams = filteredTeams.filter(team => team.teamVenueAssignments.length === 0);
      }
    }

    // Apply assignment method filter
    const assignmentFilter = tableParams.filters.find(f => f.key === 'assignmentMethod');
    if (assignmentFilter && assignmentFilter.value && statusFilter?.value !== 'pending') {
      filteredTeams = filteredTeams.filter(team => {
        const assignment = team.teamVenueAssignments[0];
        return assignment?.assignmentMethod === assignmentFilter.value;
      });
    }

    return filteredTeams;
  }, [teamsData, tableParams.search, tableParams.filters]);

  const loading = teamsLoading || authLoading;

  // Handle data load for filtering
  const handleDataLoad = useCallback((params: TableParams) => {
    setTableParams(params);
  }, []);

  // Handle row click - open detail modal
  const handleRowClick = (team: TeamAssignmentData) => {
    setSelectedTeam(team);
    setShowDetailModal(true);
  };

  // Column skeleton for loading state
  const columnSkeleton: Column<TeamAssignmentData>[] = [
    {
      key: 'team',
      header: 'Team',
      render: () => (
        <div>
          <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
          <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4"></div>
        </div>
      ),
    },
    {
      key: 'captain',
      header: 'Captain',
      render: () => <div className="h-4 bg-gray-200 rounded animate-pulse"></div>,
    },
    {
      key: 'captainPhone',
      header: 'Captain Phone',
      render: () => <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>,
    },
    {
      key: 'location',
      header: 'Location',
      render: () => (
        <div>
          <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
          <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2"></div>
        </div>
      ),
    },
    {
      key: 'venue',
      header: 'Venue',
      render: () => <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>,
    },
    {
      key: 'assignment',
      header: 'Assignment',
      render: () => <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>,
    },
    {
      key: 'status',
      header: 'Status',
      render: () => <div className="h-6 bg-gray-200 rounded animate-pulse w-20"></div>,
    },
  ];

  // Table columns
  const columns: Column<TeamAssignmentData>[] = [
    {
      key: 'team',
      header: 'Team',
      sortable: true,
      render: (_, team) => (
        <div>
          <div className="font-medium text-gray-900">{team.name}</div>
          <div className="text-sm text-gray-500">
            {team.sport?.name} • {team.genderCategory}
          </div>
        </div>
      ),
    },
    {
      key: 'captain',
      header: 'Captain',
      sortable: true,
      render: (_, team) => (
        <div className="flex items-center">
          <User className="w-4 h-4 text-gray-400 mr-2" />
          <div className="font-medium text-gray-900">
            {team.captainUser?.firstName || ''} {team.captainUser?.lastName || ''}
          </div>
        </div>
      ),
    },
    {
      key: 'captainPhone',
      header: 'Captain Phone',
      render: (_, team) => (
        <div className="flex items-center text-sm text-gray-900">
          <Phone className="w-4 h-4 text-gray-400 mr-2" />
          {team.captainUser?.phone || 'N/A'}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (_, team) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{team.captainUser?.panchayat || 'N/A'}</div>
          <div className="text-gray-500">
            {team.captainUser?.district}, {team.captainUser?.state}
          </div>
        </div>
      ),
    },
    {
      key: 'venue',
      header: 'Venue',
      render: (_, team) => {
        const assignment = team.teamVenueAssignments?.[0];
        if (!assignment) {
          return (
            <div className="flex items-center text-red-600">
              <AlertTriangle className="w-4 h-4 mr-2" />
              <span className="italic">Unassigned</span>
            </div>
          );
        }
        
        const venue = assignment.clusterVenueMapping?.venue || 
                     assignment.divisionVenueMapping?.venue ||
                     assignment.finalVenueMapping?.venue;
        
        return (
          <div className="flex items-center text-sm text-gray-900">
            <Building className="w-4 h-4 text-gray-400 mr-2" />
            {venue?.name || 'Unknown Venue'}
          </div>
        );
      },
    },
    {
      key: 'assignment',
      header: 'Assignment',
      render: (_, team) => {
        const assignment = team.teamVenueAssignments?.[0];
        if (!assignment) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Manual Required
            </span>
          );
        }
        
        const isAuto = assignment.assignmentMethod === 'auto_assigned';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isAuto 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {isAuto ? (
              <>
                <Target className="w-3 h-3 mr-1" />
                Auto
              </>
            ) : (
              <>
                <Users className="w-3 h-3 mr-1" />
                Manual
              </>
            )}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (_, team) => {
        const hasAssignment = team.teamVenueAssignments?.length > 0;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
    },
  ];

  // Filter fields
  const filterFields: FilterField[] = [
    {
      key: 'status',
      label: 'Assignment Status',
      type: 'select',
      category: 'Status',
      options: [
        { label: 'Assigned', value: 'assigned' },
        { label: 'Pending', value: 'pending' }
      ]
    },
    {
      key: 'assignmentMethod',
      label: 'Assignment Method',
      type: 'select',
      category: 'Assignment',
      options: [
        { label: 'Auto Assigned', value: 'auto_assigned' },
        { label: 'Manual Assignment', value: 'manual_assigned' }
      ]
    },
  ];

  // Header actions based on selection
  const getHeaderActions = () => {
    if (selectedTeams.size === 0) {
      return undefined; // No action when no selection
    }
    
    return (
      <button
        onClick={() => {
          addNotification('Venue assignment feature coming soon', 'info');
        }}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
      >
        <MapPin className="w-4 h-4 mr-2" />
        Assign Venue ({selectedTeams.size})
      </button>
    );
  };

  // Statistics
  const stats = useMemo(() => {
    if (!teams.length) return null;

    const assignedTeams = teams.filter(t => t.teamVenueAssignments.length > 0);
    const pendingTeams = teams.filter(t => t.teamVenueAssignments.length === 0);
    const autoAssigned = assignedTeams.filter(t => t.teamVenueAssignments[0]?.assignmentMethod === 'auto_assigned');
    const manualAssigned = assignedTeams.filter(t => t.teamVenueAssignments[0]?.assignmentMethod === 'manual_assigned');

    return {
      total: teams.length,
      assigned: assignedTeams.length,
      pending: pendingTeams.length,
      autoAssigned: autoAssigned.length,
      manualAssigned: manualAssigned.length,
    };
  }, [teams]);

  // Loading state
  if (authLoading) {
    return <PageLoader />;
  }

  // Error state
  if (teamsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Team Assignments</h2>
          <p className="text-gray-600 mb-4">{teamsError.message}</p>
          <button 
            onClick={() => refetchTeams()}
            className="px-4 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Venue Assignment</h1>
            <p className="text-gray-600 mt-2">Manage venue assignments for tournament teams</p>
          </div>
          
          <button
            onClick={() => refetchTeams()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Teams</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Assigned</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.assigned}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Auto Assigned</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.autoAssigned}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Manual</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.manualAssigned}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <AdvancedTable<TeamAssignmentData>
            data={teams || []}
            columns={loading ? columnSkeleton : columns}
            loading={loading}
            onDataLoad={handleDataLoad}
            searchable={true}
            searchPlaceholder="Search teams, captains, locations..."
            searchFields={['name', 'captainUser.firstName', 'captainUser.lastName', 'captainUser.phone']}
            filterable={true}
            filters={filterFields}
            sortable={true}
            selectable={true}
            selectedRows={selectedTeams}
            onSelectionChange={setSelectedTeams}
            onRowClick={handleRowClick}
            keyExtractor={(team) => team.id}
            headerActions={getHeaderActions()}
            emptyState={{
              icon: MapPin,
              title: 'No team assignments found',
              description: 'Team venue assignments will appear here once teams are verified.',
            }}
            noSearchResultsEmptyState={{
              icon: MapPin,
              title: 'No matching teams',
              description: 'Try adjusting your search or filters to find what you\'re looking for.',
            }}
            pagination={{ enabled: true }}
            persistState={false}
          />
        </div>
      </div>

      {/* Team Detail Modal */}
      {selectedTeam && (
        <EnhancedModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedTeam(null);
          }}
          title="Team Assignment Details"
          subtitle={`${selectedTeam.name} - Complete Information`}
          size="lg"
          mobileFullScreen={true}
          scrollableBody={true}
        >
          <div className="space-y-6">
            {/* Team Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Team Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Team Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTeam.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sport</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTeam.sport?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender Category</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTeam.genderCategory}</p>
                </div>
              </div>
            </div>

            {/* Captain Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Captain Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedTeam.captainUser?.firstName} {selectedTeam.captainUser?.lastName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTeam.captainUser?.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedTeam.captainUser?.panchayat}, {selectedTeam.captainUser?.district}, {selectedTeam.captainUser?.state}
                  </p>
                </div>
              </div>
            </div>

            {/* Assignment Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Venue Assignment</h3>
              {selectedTeam.teamVenueAssignments.length > 0 ? (
                <div className="space-y-4">
                  {selectedTeam.teamVenueAssignments.map((assignment) => {
                    const venue = assignment.clusterVenueMapping?.venue || 
                                 assignment.divisionVenueMapping?.venue ||
                                 assignment.finalVenueMapping?.venue;
                    
                    return (
                      <div key={assignment.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Venue</label>
                            <p className="mt-1 text-sm text-gray-900">{venue?.name || 'Unknown Venue'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Level</label>
                            <p className="mt-1 text-sm text-gray-900 capitalize">{assignment.level}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Assignment Method</label>
                            <p className="mt-1 text-sm text-gray-900">
                              {assignment.assignmentMethod === 'auto_assigned' ? 'Auto Assigned' : 'Manual Assignment'}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Assigned Date</label>
                            <p className="mt-1 text-sm text-gray-900">
                              {new Date(assignment.assignedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">No venue assignment found for this team.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </EnhancedModal>
      )}
    </div>
  );
}