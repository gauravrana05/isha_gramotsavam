"use client";

import { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/server/trpc/react';
import { 
  Users,
  Trophy,
  MapPin,
  Calendar,
  Clock,
  Eye,
  Search,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  User,
  Mail,
  Phone,
  Download,
  Loader2,
  Plus,
  Trash2,
  Edit
} from 'lucide-react';
import { 
  AdvancedTable,
  StatsCard,
  StatusBadge,
  PageLoader,
  type Column,
  type ActionButton,
  type FilterField,
  type ExportConfig,
  type TableParams,
  type StatItem
} from '@/components/ui';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import { TeamCreationForm, TeamCreationFormValues } from '@/components/admin/TeamCreationForm';

interface TeamData {
  id: string;
  name: string;
  sportName: string;
  sportId: string;
  captainProfile: {
    name: string;
    phone: string;
  };
  panchayat: string;
  district: string;
  state: string;
  genderCategory: string;
  currentPlayers: number;
  maxPlayers: number;
  status: string;
  createdAt: any;
  eventId: string;
  clusterVenue?: string;
  currentVenueAssignment?: {
    venueId: string;
    venueName: string;
    assignmentLevel: string;
    assignedAt: string | null;
  };
}

export default function AdminTeamsPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  const { addNotification } = useNotification();
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<TeamData | null>(null);
  const [tableParams, setTableParams] = useState<TableParams>({
    search: '',
    sort: [],
    filters: [],
    page: 1,
    pageSize: 25,
  });

  // tRPC queries
  const { 
    data: teamsData, 
    isLoading: teamsLoading, 
    error: teamsError,
    refetch: refetchTeams
  } = api.admin.getAdminTeams.useQuery(tableParams, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  const { 
    data: statsData, 
    isLoading: statsLoading 
  } = api.admin.getAdminTeamStats.useQuery({}, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  // Auth check
  if (authLoading) {
    return <PageLoader title="Loading..." />;
  }

  if (!user) {
    router.push(`/${lang}/login`);
    return null;
  }

  if (userProfile?.role !== 'admin') {
    router.push(`/${lang}/player/dashboard`);
    return null;
  }

  const teams = useMemo(() => {
    if (!teamsData?.teams) return [];

    let filteredTeams = teamsData.teams;

    // Apply search
    if (tableParams.search) {
      const searchLower = tableParams.search.toLowerCase();
      filteredTeams = filteredTeams.filter(team =>
        team.name.toLowerCase().includes(searchLower) ||
        team.captainProfile?.name?.toLowerCase().includes(searchLower) ||
        team.sportName.toLowerCase().includes(searchLower) ||
        team.panchayat.toLowerCase().includes(searchLower)
      );
    }

    // Apply filters
    tableParams.filters.forEach(filter => {
      switch (filter.key) {
        case 'status':
          if (filter.value !== 'all') {
            filteredTeams = filteredTeams.filter(team => team.status === filter.value);
          }
          break;
        case 'sport':
          if (filter.value !== 'all') {
            filteredTeams = filteredTeams.filter(team => team.sportName === filter.value);
          }
          break;
        case 'district':
          if (filter.value !== 'all') {
            filteredTeams = filteredTeams.filter(team => team.district === filter.value);
          }
          break;
        case 'gender':
          if (filter.value !== 'all') {
            filteredTeams = filteredTeams.filter(team => team.genderCategory === filter.value);
          }
          break;
      }
    });

    return filteredTeams;
  }, [teamsData, tableParams.search, tableParams.filters]);
  const stats = statsData?.stats || {};
  const loading = teamsLoading || statsLoading;
  const error = teamsError?.message || '';
  const hasMore = teamsData?.pagination?.hasMore || false;

  const [selectedTeams, setSelectedTeams] = useState<Set<string | number>>(new Set());

  const handleDataLoad = useCallback((params: TableParams) => {
    setTableParams(params);
  }, []);

  const handleRowClick = (team: TeamData) => {
    router.push(`/${lang}/admin/teams/${team.id}`);
  };

  const createTeamButton = (
    <button
      onClick={() => setShowCreateTeamModal(true)}
      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
    >
      <Plus className="w-4 h-4 mr-2" />
      Create Team
    </button>
  );

  const getHeaderActionsSingle = (selectedItems: TeamData[]) => {
    const team = selectedItems[0];
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleDeleteTeam(team)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </button>
      </div>
    );
  };

  const noSearchResultsConfig = {
    icon: Users,
    title: 'No matching teams',
    description: "Try adjusting your search or filters to find what you're looking for.",
  };

  const formRef = useRef<HTMLFormElement>(null); // Add formRef

  const createTeamMutation = api.admin.createTeam.useMutation({
    onSuccess: (data) => {
      refetchTeams();
      
      // Display venue assignment status
      if (data.venueAssignment) {
        if (data.venueAssignment.venueId) {
          // Successfully assigned to venue
          addNotification(
            `Team created and assigned to ${data.venueAssignment.venueName}!`, 
            'success'
          );
        } else if (data.venueAssignment.requiresManualAssignment) {
          // Requires manual assignment
          addNotification(
            'Team created successfully. Venue assignment requires manual selection.', 
            'warning'
          );
        } else if (data.venueAssignment.failed) {
          // Assignment failed
          addNotification(
            'Team created successfully, but venue assignment failed.', 
            'warning'
          );
        }
      } else {
        // No venue assignment info (fallback)
        addNotification('Team created successfully!', 'success');
      }
      
      setShowCreateTeamModal(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating team:", error);
      addNotification(error.message || 'Failed to create team', 'error');
    },
  });

  const deleteTeamMutation = api.admin.deleteTeam.useMutation({
    onSuccess: () => {
      refetchTeams();
      addNotification('Team deleted successfully!', 'success');
      setShowDeleteConfirm(false);
      setTeamToDelete(null);
      setSelectedTeams(new Set());
    },
    onError: (error) => {
      console.error("Error deleting team:", error);
      addNotification(error.message || 'Failed to delete team', 'error');
    },
  });

  const handleCreateTeam = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  const resetForm = () => {
    if (formRef.current) {
      formRef.current.reset();
    }
  };

  const handleDeleteTeam = (team: TeamData) => {
    setTeamToDelete(team);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (teamToDelete) {
      try {
        await deleteTeamMutation.mutateAsync({ id: teamToDelete.id });
      } catch (error) {
        console.error('Delete confirmation error:', error);
      }
    }
  };

  // Table columns configuration
  const columns: Column<TeamData>[] = [
    {
      key: 'name',
      header: 'Team Name',
      sortable: true,
      render: (_, team) => {
        if (!team) return null;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">{team.name}</span>
            <span className="text-sm text-gray-500">{team.sportName} - {team.genderCategory}</span>
          </div>
        );
      }
    },
    {
      key: 'captainProfile',
      header: 'Captain',
      render: (_, team) => {
        if (!team) return null;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{team.captainProfile?.name || 'N/A'}</span>
            <span className="text-xs text-gray-500">{team.captainProfile?.phone || 'N/A'}</span>
          </div>
        );
      }
    },
    {
      key: 'location',
      header: 'Location',
      render: (_, team) => {
        if (!team) return null;
        return (
          <div className="flex flex-col">
            <span className="text-sm text-gray-900">{team.panchayat || 'N/A'}</span>
            <span className="text-xs text-gray-500">{team.district}, {team.state}</span>
          </div>
        );
      }
    },
    {
      key: 'players',
      header: 'Players',
      render: (_, team) => {
        if (!team) return null;
        return (
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className={`text-sm ${team.currentPlayers >= team.maxPlayers ? 'text-green-600' : 'text-amber-600'}`}>
              {team.currentPlayers}/{team.maxPlayers}
            </span>
          </div>
        );
      }
    },
    {
      key: 'venue',
      header: 'Venue Assignment',
      render: (_, team) => {
        if (!team) return null;
        const venue = team.currentVenueAssignment;
        if (!venue) {
          return <span className="text-sm text-gray-400">Not assigned</span>;
        }
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{venue.venueName}</span>
            <span className="text-xs text-gray-500 capitalize">{venue.assignmentLevel}</span>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (_, team) => {
        if (!team) return null;
        const statusConfig = {
          'draft': { color: 'gray', icon: AlertCircle },
          'submitted': { color: 'blue', icon: Clock },
          'verified': { color: 'green', icon: CheckCircle },
          'rejected': { color: 'red', icon: XCircle },
          'checked_in': { color: 'purple', icon: CheckCircle } // Using purple for checked_in, and CheckCircle icon
        };
        
        const config = statusConfig[team.status as keyof typeof statusConfig] || statusConfig.draft;
        const Icon = config.icon;
        
        return (
          <StatusBadge 
            status={team.status} 
            color={config.color} 
            icon={<Icon className="w-3 h-3" />}
          />
        );
      }
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (_, team) => {
        if (!team) return null;
        return (
          <span className="text-sm text-gray-500">
            {new Date(team.createdAt).toLocaleDateString()}
          </span>
        );
      }
    }
  ];

  // Action buttons for each row
  const actions: ActionButton<TeamData>[] = [
    {
      label: 'Manage',
      icon: Edit,
      onClick: (team) => router.push(`/${lang}/admin/teams/${team.id}`),
      variant: 'primary',
    },
    {
      label: 'View Details',
      icon: Eye,
      onClick: (team) => router.push(`/${lang}/admin/teams/${team.id}`), // Assuming handleViewTeam is removed or integrated
      variant: 'secondary',
    }
  ];

  // Filter fields configuration
  const filterFields: FilterField[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      category: 'Status',
      options: [
        { label: 'All Status', value: 'all' },
        { label: 'Draft', value: 'draft' },
        { label: 'Submitted', value: 'submitted' },
        { label: 'Verified', value: 'verified' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Active', value: 'active' }
      ]
    },
    {
      key: 'sport',
      label: 'Sport',
      type: 'select',
      category: 'Sport',
      options: [
        { value: 'all', label: 'All Sports' },
        ...((stats?.bySport || {}) ? Object.keys(stats.bySport || {}).map(sport => ({
          value: sport,
          label: `${sport} (${stats.bySport[sport]})`
        })) : [])
      ]
    },
    {
      key: 'district',
      label: 'District',
      type: 'select',
      category: 'Location',
      options: [
        { value: 'all', label: 'All Districts' },
        ...((stats?.byDistrict || {}) ? Object.keys(stats.byDistrict || {}).map(district => ({
          value: district,
          label: `${district} (${stats.byDistrict[district]})`
        })) : [])
      ]
    },
    {
      key: 'gender',
      label: 'Gender Category',
      type: 'select',
      category: 'Category',
      options: [
        { value: 'all', label: 'All Categories' },
        { value: 'men', label: 'Men' },
        { value: 'women', label: 'Women' },
        { value: 'mixed', label: 'Mixed' }
      ]
    }
  ];

  // Export configuration
  const exportConfig: ExportConfig = {
    filename: 'teams-export',
    headers: [
      'Team Name', 'Sport', 'Captain Name', 'Captain Phone', 
      'Panchayat', 'District', 'State', 'Players', 'Status', 'Created Date'
    ],
    data: teams.map(team => [
      team.name,
      team.sportName,
      team.captainProfile?.name || 'N/A',
      team.captainProfile?.phone || 'N/A',
      team.panchayat || 'N/A',
      team.district || 'N/A',
      team.state || 'N/A',
      `${team.currentPlayers}/${team.maxPlayers}`,
      team.status,
      new Date(team.createdAt).toLocaleDateString()
    ])
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      {/* Teams Table */}
      <div className="">

        <AdvancedTable<TeamData>
          data={teams}
          columns={columns}
          actions={actions}
          loading={teamsLoading}
          onDataLoad={handleDataLoad}
          searchable={true}
          searchPlaceholder="Search teams..."
          searchFields={['name', 'captainProfile.name', 'sportName', 'panchayat']}
          filterable={true}
          filters={filterFields}
          sortable={true}
          selectable={true}
          selectedRows={selectedTeams}
          onSelectionChange={setSelectedTeams}
          onRowClick={handleRowClick}
          keyExtractor={(team) => team.id}
          headerActions={createTeamButton}
          headerActionsSingle={getHeaderActionsSingle}
          emptyState={{
            icon: Users,
            title: 'No teams found',
            description: 'No teams have been created yet.',
            action: {
              label: 'Create Team',
              onClick: () => setShowCreateTeamModal(true)
            }
          }}
          noSearchResultsEmptyState={noSearchResultsConfig}
          pagination={{ enabled: true }}
          persistState={false}
        />
      </div>

      {/* Create Team Modal (EnhancedModal) */}
      <EnhancedModal
        isOpen={showCreateTeamModal}
        onClose={() => {
          setShowCreateTeamModal(false);
          resetForm();
        }}
        title="Create New Team"
        subtitle="Register a new team with captain details"
        size="lg"
        mobileFullScreen={true}
        scrollableBody={true}
        footer={
          <div className="flex flex-row space-x-2 sm:space-x-3 sm:justify-end px-4 sm:px-6 py-2 sm:py-0">
            <button
              onClick={() => {
                setShowCreateTeamModal(false);
                resetForm();
              }}
              disabled={createTeamMutation.isPending}
              className="flex-1 sm:flex-initial sm:px-4 px-3 py-1.5 sm:py-2 border border-gray-300 text-gray-700 rounded-md sm:rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTeam}
              disabled={createTeamMutation.isPending}
              className="flex-1 sm:flex-initial sm:px-4 px-3 py-1.5 sm:py-2 bg-[#F28C38] text-white rounded-md sm:rounded-lg hover:bg-[#E67A26] transition-colors font-medium text-sm"
            >
              {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        }
      >
        <div id="team-form">
          <TeamCreationForm
            onSubmit={createTeamMutation.mutate}
            isLoading={createTeamMutation.isPending}
            formRef={formRef}
          />
        </div>
      </EnhancedModal>

      {/* Delete Confirmation Modal */}
      <EnhancedModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setTeamToDelete(null);
        }}
        title="Confirm Delete"
        subtitle="This action cannot be undone"
        size="sm"
        footer={
          <div className="flex flex-row space-x-3 sm:justify-end px-6 py-4">
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setTeamToDelete(null);
              }}
              disabled={deleteTeamMutation.isPending}
              className="flex-1 sm:flex-initial sm:px-6 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleteTeamMutation.isPending}
              className="flex-1 sm:flex-initial sm:px-6 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
            >
              {deleteTeamMutation.isPending ? 'Deleting...' : 'Delete Team'}
            </button>
          </div>
        }
      >
        <div className="text-center py-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete <strong>"{teamToDelete?.name}"</strong>?
          </p>
          <p className="text-sm text-red-600">
            This action cannot be undone and will permanently remove the team and all associated data.
          </p>
        </div>
      </EnhancedModal>
    </div>
  );
}