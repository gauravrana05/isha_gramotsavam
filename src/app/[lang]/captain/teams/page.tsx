'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/server/trpc/react';
import { 
  Users, 
  UserPlus, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { AdvancedTable, SingleStatCard, PageLoader } from '@/components/ui';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import type { Column, ActionButton } from '@/components/ui/Table';

interface TeamPlayerRow {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  whatsappNumber?: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  position: 'player' | 'substitute';
  verificationStatus: 'pending' | 'approved' | 'rejected';
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  addedAt: string;
}

export default function CaptainTeamsPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();

  // State
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string | number>>(new Set());
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayerRow | null>(null);

  // Fetch captain's team
  const { 
    data: teamData, 
    isLoading: teamLoading, 
    error: teamError,
    refetch: refetchTeam
  } = api.teams.management.getMyTeam.useQuery(
    undefined,
    { enabled: !!user && user.role === 'captain' }
  );

  // Fetch team players
  const { 
    data: playersData, 
    isLoading: playersLoading,
    refetch: refetchPlayers
  } = api.teams.players.getTeamPlayers.useQuery(
    { teamId: teamData?.id || '' },
    { enabled: !!teamData?.id }
  );

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (user.role !== 'captain') {
      router.push(`/${lang}/dashboard`);
      return;
    }

    if (!userProfile?.profileComplete) {
      router.push(`/${lang}/profile/complete`);
      return;
    }
  }, [user, userProfile, authLoading, router, lang]);

  // Process players data
  const players = useMemo(() => {
    if (!playersData?.players) return [];
    
    return playersData.players.map(player => ({
      id: player.id,
      userId: player.userId,
      firstName: player.firstName,
      lastName: player.lastName,
      phone: player.phone,
      whatsappNumber: player.whatsappNumber,
      age: player.age,
      gender: player.gender,
      position: player.position,
      verificationStatus: player.verificationStatus,
      panchayat: player.panchayat,
      taluk: player.taluk,
      district: player.district,
      state: player.state,
      addedAt: player.addedAt
    }));
  }, [playersData?.players]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!teamData || !players) return null;

    const totalPlayers = players.length;
    const verifiedPlayers = players.filter(p => p.verificationStatus === 'approved').length;
    const pendingPlayers = players.filter(p => p.verificationStatus === 'pending').length;
    const maxPlayers = teamData.sport?.maxPlayersPerTeam || 11;

    return {
      totalPlayers,
      verifiedPlayers,
      pendingPlayers,
      maxPlayers,
      isComplete: totalPlayers >= maxPlayers
    };
  }, [teamData, players]);

  // Table columns
  const columns: Column<TeamPlayerRow>[] = useMemo(() => [
    {
      key: 'player',
      header: 'Player',
      accessor: 'firstName',
      sortable: true,
      minWidth: 200,
      render: (_, player) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
            <Users className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {player.firstName} {player.lastName}
            </div>
            <div className="text-sm text-gray-500">{player.phone}</div>
          </div>
        </div>
      )
    },
    {
      key: 'details',
      header: 'Details',
      accessor: 'age',
      sortable: true,
      minWidth: 150,
      render: (_, player) => (
        <div className="text-sm">
          <div className="text-gray-900">Age: {player.age}</div>
          <div className="text-gray-500">
            {player.gender === 'M' ? 'Male' : player.gender === 'F' ? 'Female' : 'Other'}
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
      render: (_, player) => (
        <div className="text-sm">
          <div className="flex items-center text-gray-900">
            <MapPin className="w-4 h-4 mr-1" />
            {player.district}
          </div>
          <div className="text-gray-500">{player.panchayat}</div>
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
          {position === 'player' ? 'Main' : 'Substitute'}
        </span>
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

  const handleRowClick = (player: TeamPlayerRow) => {
    setSelectedPlayer(player);
    setShowViewModal(true);
  };

  if (authLoading || teamLoading) {
    return <PageLoader message="Loading team data..." />;
  }

  if (teamError || !teamData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Team Found</h1>
          <p className="text-gray-600 mb-4">You don't have a team yet. Create one to get started.</p>
          <Link 
            href={`/${lang}/register/team`}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Create Team
          </Link>
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
            <h1 className="text-3xl font-bold text-gray-900">{teamData.name}</h1>
            <p className="text-gray-600 mt-2">Manage your team players and invitations</p>
          </div>
          <Link
            href={`/${lang}/captain/teams/${teamData.id}/players/invite`}
            className="bg-[#F28C38] text-white px-4 py-2 rounded-lg hover:bg-[#E67A26] transition-colors flex items-center"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Players
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SingleStatCard
            title="Total Players"
            value={`${stats.totalPlayers}/${stats.maxPlayers}`}
            icon={Users}
            color={stats.isComplete ? 'success' : 'warning'}
            trend={stats.isComplete ? 'Complete' : 'Incomplete'}
          />
          
          <SingleStatCard
            title="Verified Players"
            value={stats.verifiedPlayers}
            icon={CheckCircle}
            color="success"
          />
          
          <SingleStatCard
            title="Pending Verification"
            value={stats.pendingPlayers}
            icon={Clock}
            color="warning"
          />
          
          <SingleStatCard
            title="Team Status"
            value={teamData.status}
            icon={teamData.status === 'active' ? CheckCircle : Clock}
            color={teamData.status === 'active' ? 'success' : 'warning'}
          />
        </div>
      )}

      {/* Players Table */}
      <AdvancedTable<TeamPlayerRow>
        data={players}
        columns={columns}
        loading={playersLoading}

        searchable={true}
        searchPlaceholder="Search players by name, phone..."

        sortable={true}
        defaultSort={[{ key: 'firstName', direction: 'asc' }]}

        pagination={{ enabled: true }}

        selectable={true}
        selectedRows={selectedPlayers}
        onSelectionChange={setSelectedPlayers}
        onRowClick={handleRowClick}
        keyExtractor={(player) => player.id}

        emptyState={{
          icon: Users,
          title: 'No players found',
          description: 'Your team doesn\'t have any players yet.',
          action: {
            label: 'Invite Players',
            onClick: () => router.push(`/${lang}/captain/teams/${teamData.id}/players/invite`)
          }
        }}
      />

      {/* View Player Modal */}
      {selectedPlayer && (
        <EnhancedModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedPlayer(null);
          }}
          title="Player Details"
          subtitle={`${selectedPlayer.firstName} ${selectedPlayer.lastName}`}
          size="md"
        >
          <div className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedPlayer.firstName} {selectedPlayer.lastName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Age</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedPlayer.age}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedPlayer.gender === 'M' ? 'Male' : selectedPlayer.gender === 'F' ? 'Female' : 'Other'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Position</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedPlayer.position === 'player' ? 'Main Player' : 'Substitute'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedPlayer.phone}</p>
                </div>
                {selectedPlayer.whatsappNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlayer.whatsappNumber}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Location Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Location</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">District</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedPlayer.district}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedPlayer.state}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Taluk</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedPlayer.taluk}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Panchayat</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedPlayer.panchayat}</p>
                </div>
              </div>
            </div>

            {/* Verification Status */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Verification Status</h3>
              <div className="flex items-center">
                {selectedPlayer.verificationStatus === 'approved' ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Verified</span>
                  </div>
                ) : selectedPlayer.verificationStatus === 'pending' ? (
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
