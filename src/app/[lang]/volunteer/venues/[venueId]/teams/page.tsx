'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';
import { useOfflineTeams } from '@/hooks/useOfflineTeams';
import { useOfflineVenueData } from '@/hooks/useOfflineVenueData';
import { api } from '@/server/trpc/react';
import CreateTeamModal from '@/components/volunteer/CreateTeamModal';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import { TeamStatusSelector } from '@/components/ui/StatusSelector';
import type { Column } from '@/components/ui/Table';
import { useAlert } from '@/hooks/useAlert';
import { 
  Loader2, 
  Users, 
  CheckCircle, 
  Clock, 
  Eye, 
  Camera,
  MapPin,
  Trophy,
  UserCheck,
  AlertCircle,
  Plus
} from 'lucide-react';

export default function MatchDayTeamsPage() {
  const params = useParams();
  const { venueId } = params as { venueId: string; lang: string };
  const { user, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useAlert();
  
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get teams from offline storage
  const { 
    teams: teamsData, 
    isLoading: loading, 
    error: teamsError,
    refetch: refetchTeams
  } = useOfflineTeams(venueId);

  // Get venue data for location information
  const { venueData } = useOfflineVenueData(venueId);
  
  // Debug venue data
  console.log('Venue data for location:', venueData);

  const teams = teamsData || [];

  // Debug team data structure
  console.log('Teams data:', teams[0]);
  if (teams[0]) {
    console.log('First team location:', {
      panchayat: teams[0].panchayat,
      district: teams[0].district,
      state: teams[0].state,
      taluk: teams[0].taluk,
      captainUser: teams[0].captainUser,
      captainUserLocation: {
        panchayat: teams[0].captainUser?.panchayat,
        district: teams[0].captainUser?.district,
        state: teams[0].captainUser?.state,
      }
    });
    console.log('First team sport:', teams[0].sport);
    console.log('First team players:', teams[0].teamPlayers);
    console.log('Full team object keys:', Object.keys(teams[0]));
    console.log('Captain user keys:', teams[0].captainUser ? Object.keys(teams[0].captainUser) : 'No captain user');
  }

  // Team status update mutation
  const updateTeamStatusMutation = api.volunteers.venue.updateTeamStatus.useMutation({
    onSuccess: () => {
      refetchTeams();
      showSuccess('Team status updated successfully!');
    },
    onError: (error) => {
      console.error('Failed to update team status:', error);
      showError(`Failed to update team status: ${error.message}`);
    }
  });

  // Handle team status change
  const handleTeamStatusChange = async (team: any, newStatus: string) => {
    try {
      updateTeamStatusMutation.mutate({
        teamId: team.id,
        status: newStatus as any,
        venueId: venueId
      });
    } catch (error) {
      console.error('Failed to update team status:', error);
    }
  };

  // Set error from tRPC
  useEffect(() => {
    if (teamsError) {
      setError(teamsError.message || 'Failed to load teams');
    } else {
      setError('');
    }
  }, [teamsError]);

  const loadTeams = async () => {
    try {
      await refetchTeams();
    } catch (err) {
      setError('Failed to load teams');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading teams...</p>
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
            onClick={loadTeams}
            className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'bg-green-100 text-green-800';
      case 'verified':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checked_in':
        return <CheckCircle className="w-4 h-4" />;
      case 'verified':
        return <UserCheck className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const createTeamButton = (
    <button
      onClick={() => setShowCreateModal(true)}
      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
    >
      <Plus className="w-4 h-4 mr-2" />
      Create Team
    </button>
  );

  const getTeamColumns = (): Column<any>[] => [
    {
      key: 'name',
      header: 'Team',
      sortable: true,
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">{item.name || 'N/A'}</div>
            <div className="text-sm text-gray-500">{item.sport?.name || 'N/A'}</div>
          </div>
        );
      }
    },
    {
      key: 'captain',
      header: 'Captain',
      sortable: true,
      render: (value, item, index) => {
        if (!item) return null;
        const captainName = `${item.captainUser?.firstName || ''} ${item.captainUser?.lastName || ''}`.trim() || 'N/A';
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">{captainName}</div>
            <div className="text-sm text-gray-500">{item.captainUser?.phone || 'N/A'}</div>
          </div>
        );
      }
    },
    {
      key: 'players',
      header: 'Players',
      render: (value, item, index) => {
        if (!item) return null;
        const currentPlayers = item.teamPlayers?.length || item.currentPlayers || 0;
        const maxPlayers = item.sport?.mainPlayersCount || 11;
        return (
          <span className="text-sm text-gray-900">
            {currentPlayers}/{maxPlayers}
          </span>
        );
      }
    },
    {
      key: 'location',
      header: 'Location',
      render: (value, item, index) => {
        if (!item) return null;
        
        // Get location from captain's user data or team data
        const panchayat = item.captainUser?.panchayat || item.panchayat || 'N/A';
        const district = item.captainUser?.district || item.district || 'N/A';
        
        return (
          <div className="flex items-center">
            <MapPin className="w-4 h-4 text-gray-400 mr-2" />
            <div>
              <div className="text-sm text-gray-900">{panchayat}</div>
              <div className="text-sm text-gray-500">{district}</div>
            </div>
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
        return (
          <TeamStatusSelector
            value={item.status || 'draft'}
            onChange={(newStatus) => handleTeamStatusChange(item, newStatus)}
            disabled={false}
            className="min-w-[120px]"
          />
        );
      }
    }
  ];

  const getTeamFilters = () => [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { label: 'All', value: '' },
        { label: 'Checked In', value: 'checked_in' },
        { label: 'Verified', value: 'verified' },
        { label: 'Approved', value: 'approved' },
        { label: 'Pending', value: 'pending' }
      ]
    },
    {
      key: 'sport',
      label: 'Sport',
      type: 'select' as const,
      options: [
        { label: 'All Sports', value: '' },
        ...Array.from(new Set(teams.map(t => t?.sport?.name).filter(Boolean))).map(sport => ({
          label: sport,
          value: sport
        }))
      ]
    },
    {
      key: 'district',
      label: 'District',
      type: 'select' as const,
      options: [
        { label: 'All Districts', value: '' },
        ...Array.from(new Set(teams.map(t => t?.captainUser?.district || t?.district).filter(Boolean))).map(district => ({
          label: district,
          value: district
        }))
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Verification</h1>
        <p className="text-gray-600 text-sm">Match day verification for venue teams</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Teams</p>
              <p className="text-2xl font-bold text-gray-900">{teams.length}</p>
            </div>
            <Users className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Checked In</p>
              <p className="text-2xl font-bold text-green-600">
                {teams.filter(t => t.verificationStatus === 'checked_in' || t.status === 'checked_in').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Verified</p>
              <p className="text-2xl font-bold text-yellow-600">
                {teams.filter(t => t.verificationStatus === 'verified' || t.status === 'verified').length}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-2xl font-bold text-red-600">
                {teams.filter(t => t.verificationStatus === 'pending' || t.status === 'pending' || (!t.verificationStatus && !t.status)).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Teams Table */}
      <AdvancedTable
        data={teams}
        columns={getTeamColumns()}
        searchable
        searchFields={['name', 'captainUser.firstName', 'captainUser.lastName', 'captainUser.phone', 'captainUser.panchayat', 'captainUser.district', 'sport.name']}
        searchPlaceholder="Search teams..."
        filterable
        filters={getTeamFilters()}
        sortable
        pagination={{ enabled: true, pageSize: 25 }}
        keyExtractor={(team) => team?.id || Math.random().toString()}
        onRowClick={(team) => window.location.href = `/en/volunteer/venues/${venueId}/teams/${team?.id}`}
        emptyState={{
          icon: Users,
          title: 'No teams found',
          description: 'No teams have been assigned to this venue yet.'
        }}
        headerActions={createTeamButton}
      />

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        venueId={venueId}
        venueLocation={{
          panchayat: venueData?.panchayat || venueData?.venue?.panchayat || 'Default Panchayat',
          district: venueData?.district || venueData?.venue?.district || 'Default District', 
          state: venueData?.state || venueData?.venue?.state || 'Tamil Nadu',
          taluk: venueData?.taluk || venueData?.venue?.taluk || 'Default Taluk',
          pincode: venueData?.pincode || venueData?.venue?.pincode || '600001'
        }}
        onTeamCreated={() => {
          refetchTeams();
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}