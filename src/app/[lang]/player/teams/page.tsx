'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { AdvancedTable, SingleStatCard, PageLoader } from '@/components/ui';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import type { Column } from '@/components/ui/Table';
import { 
  Users, 
  Trophy, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Eye,
  MapPin,
  Phone,
  Calendar,
  UserCheck,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface PlayerTeamRow {
  id: string;
  teamId: string;
  teamName: string;
  sportName: string;
  captainName: string;
  captainPhone: string;
  position: 'player' | 'substitute';
  verificationStatus: 'pending' | 'approved' | 'rejected';
  district: string;
  state: string;
  panchayat: string;
  currentPlayers: number;
  maxPlayers: number;
  addedAt: string;
}

export default function PlayerTeamsPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // State
  const [selectedTeams, setSelectedTeams] = useState<Set<string | number>>(new Set());
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<PlayerTeamRow | null>(null);

  // Fetch player's teams
  const { 
    data: teamsData, 
    isLoading: teamsLoading,
    error: teamsError,
    refetch: refetchTeams
  } = api.teams.players.getPlayerTeams.useQuery(
    { playerId: user?.id || '' },
    { enabled: !!user && user.role === 'player' }
  );

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (user.role !== 'player') {
      router.push(`/${lang}/dashboard`);
      return;
    }

    if (!userProfile?.profileComplete) {
      router.push(`/${lang}/profile/complete`);
      return;
    }
  }, [user, userProfile, authLoading, router, lang]);

  // Process teams data
  const teams = useMemo(() => {
    if (!teamsData?.teams) return [];
    
    return teamsData.teams.map(playerTeam => ({
      id: playerTeam.id,
      teamId: playerTeam.team.id,
      teamName: playerTeam.team.name,
      sportName: playerTeam.team.sport?.name || 'Unknown Sport',
      captainName: playerTeam.team.captainUser?.firstName + ' ' + playerTeam.team.captainUser?.lastName,
      captainPhone: playerTeam.team.captainUser?.phone || '',
      position: playerTeam.position,
      verificationStatus: playerTeam.verificationStatus,
      district: playerTeam.team.district,
      state: playerTeam.team.state,
      panchayat: playerTeam.team.panchayat,
      currentPlayers: playerTeam.team.currentPlayers || 0,
      maxPlayers: playerTeam.team.sport?.maxPlayersPerTeam || 11,
      addedAt: playerTeam.addedAt
    }));
  }, [teamsData?.teams]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!teams) return null;

    const totalTeams = teams.length;
    const verifiedTeams = teams.filter(t => t.verificationStatus === 'approved').length;
    const pendingTeams = teams.filter(t => t.verificationStatus === 'pending').length;
    const mainPlayerTeams = teams.filter(t => t.position === 'player').length;

    return {
      totalTeams,
      verifiedTeams,
      pendingTeams,
      mainPlayerTeams
    };
  }, [teams]);

  // Table columns
  const columns: Column<PlayerTeamRow>[] = useMemo(() => [
    {
      key: 'team',
      header: 'Team',
      accessor: 'teamName',
      sortable: true,
      minWidth: 200,
      render: (_, team) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
            <Trophy className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{team.teamName}</div>
            <div className="text-sm text-gray-500">{team.sportName}</div>
          </div>
        </div>
      )
    },
    {
      key: 'captain',
      header: 'Captain',
      accessor: 'captainName',
      sortable: true,
      minWidth: 180,
      render: (_, team) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{team.captainName}</div>
          <div className="text-gray-500 flex items-center">
            <Phone className="w-3 h-3 mr-1" />
            {team.captainPhone}
          </div>
        </div>
      )
    },
    {
      key: 'location',
      header: 'Location',
      accessor: 'district',
      sortable: true,
      minWidth: 180,
      render: (_, team) => (
        <div className="text-sm">
          <div className="flex items-center text-gray-900">
            <MapPin className="w-4 h-4 mr-1" />
            {team.district}
          </div>
          <div className="text-gray-500">{team.panchayat}</div>
        </div>
      )
    },
    {
      key: 'position',
      header: 'Position',
      accessor: 'position',
      sortable: true,
      minWidth: 120,
      render: (position) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          position === 'player' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {position === 'player' ? 'Main Player' : 'Substitute'}
        </span>
      )
    },
    {
      key: 'players',
      header: 'Team Size',
      accessor: 'currentPlayers',
      sortable: true,
      minWidth: 120,
      render: (_, team) => (
        <div className="text-sm">
          <div className="text-gray-900">{team.currentPlayers}/{team.maxPlayers}</div>
          <div className="text-gray-500">
            {team.currentPlayers >= team.maxPlayers ? 'Complete' : 'Incomplete'}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'verificationStatus',
      sortable: true,
      minWidth: 120,
      render: (status) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          status === 'approved' 
            ? 'bg-green-100 text-green-800' 
            : status === 'pending'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {status === 'approved' ? (
            <>
              <CheckCircle className="w-3 h-3 mr-1" />
              Verified
            </>
          ) : status === 'pending' ? (
            <>
              <Clock className="w-3 h-3 mr-1" />
              Pending
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3 mr-1" />
              Rejected
            </>
          )}
        </span>
      )
    }
  ], []);

  const handleRowClick = (team: PlayerTeamRow) => {
    setSelectedTeam(team);
    setShowViewModal(true);
  };

  if (authLoading || teamsLoading) {
    return <PageLoader message="Loading your teams..." />;
  }

  if (teamsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Teams</h1>
          <p className="text-gray-600 mb-4">{teamsError.message}</p>
          <button 
            onClick={() => refetchTeams()}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Teams</h1>
            <p className="text-gray-600 mt-2">Teams you&apos;re part of and their verification status</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SingleStatCard
            title="Total Teams"
            value={stats.totalTeams}
            icon={Users}
            color="primary"
          />
          
          <SingleStatCard
            title="Verified Teams"
            value={stats.verifiedTeams}
            icon={CheckCircle}
            color="success"
          />
          
          <SingleStatCard
            title="Pending Verification"
            value={stats.pendingTeams}
            icon={Clock}
            color="warning"
          />
          
          <SingleStatCard
            title="Main Player"
            value={stats.mainPlayerTeams}
            icon={UserCheck}
            color="info"
          />
        </div>
      )}

      {/* Teams Table */}
      <AdvancedTable<PlayerTeamRow>
        data={teams}
        columns={columns}
        loading={teamsLoading}

        searchable={true}
        searchPlaceholder="Search teams by name, sport, captain..."

        filterable={true}
        filters={[
          {
            key: 'verificationStatus',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'All Statuses', value: '' },
              { label: 'Verified', value: 'approved' },
              { label: 'Pending', value: 'pending' },
              { label: 'Rejected', value: 'rejected' }
            ]
          },
          {
            key: 'position',
            label: 'Position',
            type: 'select',
            options: [
              { label: 'All Positions', value: '' },
              { label: 'Main Player', value: 'player' },
              { label: 'Substitute', value: 'substitute' }
            ]
          }
        ]}

        sortable={true}
        defaultSort={[{ key: 'addedAt', direction: 'desc' }]}

        pagination={{ enabled: true }}

        selectable={true}
        selectedRows={selectedTeams}
        onSelectionChange={setSelectedTeams}
        onRowClick={handleRowClick}
        keyExtractor={(team) => team.id}

        actions={[
          {
            label: 'View Details',
            icon: Eye,
            onClick: (team) => {
              setSelectedTeam(team);
              setShowViewModal(true);
            },
            variant: 'secondary'
          }
        ]}

        emptyState={{
          icon: Users,
          title: 'No teams found',
          description: 'You\'re not part of any team yet. Wait for a captain to invite you.',
          action: {
            label: 'Back to Dashboard',
            onClick: () => router.push(`/${lang}/player/dashboard`)
          }
        }}

        noSearchResultsEmptyState={{
          icon: Users,
          title: 'No matching teams',
          description: 'Try adjusting your search or filters to find what you\'re looking for.'
        }}
      />

      {/* View Team Modal */}
      {selectedTeam && (
        <EnhancedModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedTeam(null);
          }}
          title="Team Details"
          subtitle={selectedTeam.teamName}
          size="md"
        >
          <div className="space-y-6">
            {/* Team Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Team Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Team Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTeam.teamName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sport</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTeam.sportName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Your Position</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedTeam.position === 'player' ? 'Main Player' : 'Substitute'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Team Size</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedTeam.currentPlayers}/{selectedTeam.maxPlayers} players
                  </p>
                </div>
              </div>
            </div>

            {/* Captain Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Captain Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Captain Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTeam.captainName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTeam.captainPhone}</p>
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Location</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">District</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTeam.district}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTeam.state}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Panchayat</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTeam.panchayat}</p>
                </div>
              </div>
            </div>

            {/* Verification Status */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Verification Status</h3>
              <div className="flex items-center">
                {selectedTeam.verificationStatus === 'approved' ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Verified</span>
                  </div>
                ) : selectedTeam.verificationStatus === 'pending' ? (
                  <div className="flex items-center text-yellow-600">
                    <Clock className="w-5 h-5 mr-2" />
                    <span className="font-medium">Pending Verification</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Rejected</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </EnhancedModal>
      )}
    </div>
  );
}
