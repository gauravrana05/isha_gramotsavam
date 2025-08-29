'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/server/trpc/react';
import { AdvancedTable, StatsCard, PageLoader } from '@/components/ui';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import {
  Users, User, UserCheck, CheckCircle, MapPin,
  ArrowLeft, UserPlus, Edit, Trash2, Eye
} from 'lucide-react';

interface TeamPlayer {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  age: number;
  position: 'main' | 'substitute';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  user?: { // Corrected: now 'user'
    dateOfBirth?: string; // Added dateOfBirth
    profileImages?: {
      profilePhotoPath?: string;
      aadhaarFrontPath?: string;
      aadhaarBackPath?: string;
    };
  };
}

export default function AdminTeamDetailPage() {
  const { teamId, lang } = useParams();
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();

  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);

  // Team data fetching
  const {
    data: teamData,
    isLoading: teamLoading,
    error: teamError,
    refetch: refetchTeam
  } = api.admin.getTeamById.useQuery({ teamId: teamId as string }, {
    enabled: !!user && userProfile?.role === 'admin' && !!teamId
  });

  // Player management mutations
  const addPlayerMutation = api.admin.addPlayerToTeam.useMutation({
    onSuccess: () => {
      refetchTeam();
      addNotification('Player added successfully!', 'success');
      setShowAddPlayerModal(false);
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to add player', 'error');
    }
  });

  const removePlayerMutation = api.admin.removePlayerFromTeam.useMutation({
    onSuccess: () => {
      refetchTeam();
      addNotification('Player removed successfully!', 'success');
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to remove player', 'error');
    }
  });

  // Auth checks
  if (authLoading) return <PageLoader title="Loading..." />;
  if (!user || userProfile?.role !== 'admin') {
    router.push(`/${lang}/login`);
    return null;
  }

  if (teamLoading) return <PageLoader title="Loading team details..." />;
  if (teamError || !teamData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Team not found</h2>
        <button
          onClick={() => router.back()}
          className="mt-4 bg-[#F28C38] text-white px-4 py-2 rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { team } = teamData;
  const players = team.players || [];

  // Player Columns (based on captain/teams structure)
  const playerColumns: Column<TeamPlayer>[] = [
    {
      key: 'name',
      header: 'Player',
      sortable: true,
      render: (_, player) => (
        <div>
          <div className="font-semibold text-[#4A2F1D]">
            {player.firstName} {player.lastName}
          </div>
          <div className="text-sm text-gray-500">{player.phone}</div>
        </div>
      ),
    },
    {
      key: 'position',
      header: 'Position',
      render: (_, player) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          player.position === 'main' 
            ? 'bg-[#3A7F3F] text-white' 
            : 'bg-[#C79016] text-white'
        }`}>
          {player.position}
        </span>
      ),
    },
    {
      key: 'age',
      header: 'Age',
      sortable: true,
      render: (_, player) => <span>{player.user?.dateOfBirth ? new Date().getFullYear() - new Date(player.user.dateOfBirth).getFullYear() : 'N/A'}</span>,
    },
    {
      key: 'documents',
      header: 'Documents',
      render: (_, player) => (
        <div className="flex space-x-1">
          <div className={`w-4 h-4 rounded-full ${
            player.user?.profileImages?.profilePhotoPath ? 'bg-green-500' : 'bg-gray-300'
          }`} title="Profile" />
          <div className={`w-4 h-4 rounded-full ${
            player.user?.profileImages?.aadhaarFrontPath ? 'bg-green-500' : 'bg-gray-300'
          }`} title="Aadhaar Front" />
          <div className={`w-4 h-4 rounded-full ${
            player.user?.profileImages?.aadhaarBackPath ? 'bg-green-500' : 'bg-gray-300'
          }`} title="Aadhaar Back" />
        </div>
      ),
    },
    {
      key: 'verificationStatus',
      header: 'Status',
      render: (_, player) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          player.verificationStatus === 'verified' 
            ? 'bg-green-100 text-green-800' 
            : player.verificationStatus === 'pending' 
            ? 'bg-yellow-100 text-yellow-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {player.verificationStatus}
        </span>
      ),
    }
  ];

  // Player Actions
  const playerActions: ActionButton<TeamPlayer>[] = [
    {
      label: 'Edit',
      icon: Edit,
      onClick: (player) => setSelectedPlayer(player), // handleEditPlayer(player),
      variant: 'secondary',
    },
    {
      label: 'Remove',
      icon: Trash2,
      onClick: (player) => removePlayerMutation.mutate({ teamId: team.id, teamPlayerId: player.id }),
      variant: 'danger',
      confirm: {
        title: 'Remove Player',
        message: 'Are you sure you want to remove this player from the team?'
      }
    }
  ];

  return (
    <div className="lg:min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-[#4A2F1D]">{team.name}</h1>
                <p className="text-gray-600">{team.sport?.name} - {team.genderCategory}</p>
                <div className="flex items-center mt-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4 mr-1" />
                  {team.panchayat}, {team.district}, {team.state}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAddPlayerModal(true)}
                className="bg-[#F28C38] text-white px-4 py-2 rounded-lg hover:bg-[#E67A26] flex items-center"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Player
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <StatsCard
          stats={[
            {
              label: "Total Players",
              value: players.length.toString(),
              icon: Users,
              color: "info",
              description: `of ${(team.sport?.mainPlayersCount || 0) + (team.sport?.maxSubstitutes || 0)} max`
            },
            {
              label: "Main Players",
              value: players.filter(p => p.position === 'main').length.toString(),
              icon: User,
              color: "success",
              description: `of ${team.sport?.mainPlayersCount || 0} required`
            },
            {
              label: "Substitutes",
              value: players.filter(p => p.position === 'substitute').length.toString(),
              icon: UserCheck,
              color: "warning",
              description: `of ${team.sport?.maxSubstitutes || 0} max`
            },
            {
              label: "Verified Players",
              value: players.filter(p => p.verificationStatus === 'verified').length.toString(),
              icon: CheckCircle,
              color: "primary",
              description: "players approved"
            },
          ]}
          columns={4}
        />

        {/* Players Table */}
        <AdvancedTable<TeamPlayer>
          data={players}
          columns={playerColumns}
          actions={playerActions}
          loading={teamLoading}
          searchable={true}
          searchPlaceholder="Search players..."
          searchFields={['firstName', 'lastName', 'phone']}
          onRowClick={setSelectedPlayer}
          keyExtractor={(player) => player.id}
          emptyState={{
            icon: Users,
            title: 'No players added',
            description: 'Add players to this team to get started.',
            action: {
              label: 'Add Player',
              onClick: () => setShowAddPlayerModal(true)
            }
          }}
          pagination={{ enabled: true }}
          persistState={false}
        />
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <EnhancedModal
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          title={`${selectedPlayer.firstName} ${selectedPlayer.lastName}`}
          subtitle="Player Details"
          size="lg"
        >
          {/* Player detail content - copy from captain/teams */}
          <div className="p-4">
            <p><strong>Phone:</strong> {selectedPlayer.phone}</p>
            <p><strong>Position:</strong> {selectedPlayer.position}</p>
            <p><strong>Age:</strong> {selectedPlayer.age}</p>
            <p><strong>Verification Status:</strong> {selectedPlayer.verificationStatus}</p>
            {/* Add more player details as needed */}
          </div>
        </EnhancedModal>
      )}
    </div>
  );
}