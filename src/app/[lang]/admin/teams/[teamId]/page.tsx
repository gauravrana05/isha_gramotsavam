'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/server/trpc/react';
import { AdvancedTable, StatsCard, PageLoader, type Column, type ActionButton } from '@/components/ui';
import { VerificationStatusSelector } from '@/components/ui/StatusSelector';
import { AlertModal } from '@/components/ui/Modal';
import { useAlert } from '@/hooks/useAlert';
import { AddPlayerModal } from '@/components/modals/AddPlayerModal';
import { PlayerDetailModal } from '@/components/modals/PlayerDetailModal';
import {
  Users, User, UserCheck, CheckCircle, MapPin,
  ArrowLeft, UserPlus, Edit, Trash2, Eye, X, Loader2
} from 'lucide-react';

interface TeamPlayer {
  id: string;
  teamId: string;
  userId: string;
  position: string;
  verificationStatus: 'pending' | 'verified' | 'approved' | 'rejected';
  firstName: string;
  lastName: string;
  phone: string;
  whatsappNumber?: string;
  dateOfBirth: Date;
  age: number;
  gender: 'M' | 'F';
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string;
  addedAt: Date;
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
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
  const { showError, showSuccess } = useAlert();

  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string | number>>(new Set());
  const [editingPlayer, setEditingPlayer] = useState<TeamPlayer | null>(null);

  // Add player mutation
  const addPlayerMutation = api.admin.teams.addPlayerToTeam.useMutation({
    onSuccess: () => {
      addNotification('Player added successfully!', 'success');
      setShowAddPlayerModal(false);
      refetchTeam();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to add player', 'error');
    },
  });

  // Update player mutation
  const updatePlayerMutation = api.admin.teams.updatePlayer.useMutation({
    onSuccess: () => {
      addNotification('Player updated successfully!', 'success');
      setShowAddPlayerModal(false);
      setEditingPlayer(null);
      refetchTeam();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to update player', 'error');
    },
  });

  // Update player status mutation
  const updatePlayerStatusMutation = api.admin.teams.updatePlayerStatus.useMutation({
    onSuccess: () => {
      showSuccess('Player status updated successfully!');
      refetchTeam();
    },
    onError: (error) => {
      showError(`Failed to update player status: ${error.message}`);
    },
  });

  // Update team status mutation
  const updateTeamStatusMutation = api.admin.teams.updateTeamStatus.useMutation({
    onSuccess: () => {
      addNotification('Team status updated successfully!', 'success');
      refetchTeam();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to update team status', 'error');
    },
  });

  // Make captain mutation (using admin API)
  const makeCaptainMutation = api.admin.teams.makeCaptain.useMutation({
    onSuccess: (result) => {
      addNotification(result.message || 'Captain updated successfully!', 'success');
      refetchTeam();
      setSelectedPlayer(null); // Close modal
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to update captain', 'error');
    },
  });

  // Handle add player from modal
  const handleAddPlayer = async (playerData: any) => {
    try {
      await addPlayerMutation.mutateAsync({
        teamId: teamId as string,
        ...playerData
      });
    } catch (error) {
      // Error handled by mutation
      throw error;
    }
  };

  // Handle edit player from modal
  const handleEditPlayer = async (playerData: any) => {
    if (!editingPlayer) return;
    
    try {
      await updatePlayerMutation.mutateAsync({
        teamId: teamId as string,
        userId: editingPlayer.userId,
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        dateOfBirth: playerData.dateOfBirth,
        whatsappNumber: playerData.whatsappNumber,
      });
    } catch (error) {
      // Error handled by mutation
      throw error;
    }
  };

  // Handle make captain
  const handleMakeCaptain = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) {
      addNotification('Player not found', 'error');
      return;
    }
    if (!team) {
      addNotification('Team data not available', 'error');
      return;
    }
    if (!player.userId) {
      addNotification('Player user ID not available', 'error');
      return;
    }

    makeCaptainMutation.mutate({
      teamId: team.id,
      userId: player.userId
    });
  };

  // Team data fetching
  const {
    data: teamData,
    isLoading: teamLoading,
    error: teamError,
    refetch: refetchTeam
  } = api.admin.teams.getTeamById.useQuery({ teamId: teamId as string }, {
    enabled: !!user && userProfile?.role === 'admin' && !!teamId
  });

  const removePlayerMutation = api.admin.teams.removePlayerFromTeam.useMutation({
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

  const team = teamData;
  const players = team?.teamPlayers || [];

  // Player Columns
  const playerColumns: Column<TeamPlayer>[] = [
    {
      key: 'profile',
      header: 'Profile',
      className: 'w-16 text-center',
      render: (_, player) => (
        <div className="flex justify-center">
          {player.user?.profileImages?.profilePhotoPath ? (
            <img
              src={player.user.profileImages.profilePhotoPath}
              alt="Profile"
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </div>
      )
    },
    {
      key: 'name',
      header: 'Player',
      sortable: true,
      render: (_, player) => (
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-[#4A2F1D]">
              {player.firstName} {player.lastName}
            </span>
            {team?.captainId === player.userId && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Captain
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">{player.age} years • {player.gender === 'M' ? 'Male' : 'Female'}</div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Mobile',
      sortable: true,
      render: (_, player) => (
        <span className="text-gray-900">{player.phone}</span>
      ),
    },
    {
      key: 'position',
      header: 'Position',
      sortable: true,
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
      key: 'location',
      header: 'Location',
      render: (_, player) => (
        <div className="flex items-center">
          <MapPin className="w-4 h-4 text-gray-400 mr-2" />
          <div>
            <div className="text-sm text-gray-900">{player.panchayat}</div>
            <div className="text-sm text-gray-500">{player.district}</div>
          </div>
        </div>
      )
    },
    {
      key: 'verificationStatus',
      header: 'Status',
      render: (_, player) => (
        <VerificationStatusSelector
          value={player.verificationStatus}
          onChange={(newStatus) => {
            updatePlayerStatusMutation.mutate({
              teamId: teamId as string,
              userId: player.userId,
              status: newStatus
            });
          }}
          disabled={updatePlayerStatusMutation.isPending}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, player) => (
        <div className="flex space-x-1 justify-center">
          {player.verificationStatus !== 'approved' && player.verificationStatus !== 'rejected' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updatePlayerStatusMutation.mutate({
                    teamId: teamId as string,
                    userId: player.userId,
                    status: 'approved'
                  });
                }}
                disabled={updatePlayerStatusMutation.isPending}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updatePlayerStatusMutation.mutate({
                    teamId: teamId as string,
                    userId: player.userId,
                    status: 'rejected'
                  });
                }}
                disabled={updatePlayerStatusMutation.isPending}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject
              </button>
            </>
          )}
        </div>
      )
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
      onClick: (player) => removePlayerMutation.mutate({ teamId: team.id, userId: player.userId }),
      variant: 'danger',
      confirm: {
        title: 'Remove Player',
        message: 'Are you sure you want to remove this player from the team?'
      }
    }
  ];

  // Filter fields for players
  const playerFilterFields = [
    {
      key: 'verificationStatus',
      label: 'Status',
      type: 'select' as const,
      category: 'Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Verified', value: 'verified' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' }
      ]
    },
    {
      key: 'position',
      label: 'Position',
      type: 'select' as const,
      category: 'Position',
      options: [
        { label: 'Main', value: 'main' },
        { label: 'Substitute', value: 'substitute' }
      ]
    },
    {
      key: 'gender',
      label: 'Gender',
      type: 'select' as const,
      category: 'Gender',
      options: [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' }
      ]
    }
  ];

  // Header actions based on selection
  const getPlayerHeaderActions = () => {
    if (selectedPlayers.size === 0) {
      return (
        <button
          onClick={() => setShowAddPlayerModal(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Player
        </button>
      );
    }

    if (selectedPlayers.size === 1) {
      const playerId = Array.from(selectedPlayers)[0];
      const player = players.find(p => p.id === playerId);
      
      return (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (player) {
                setEditingPlayer(player);
                setShowAddPlayerModal(true);
                setSelectedPlayers(new Set());
              }
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </button>
          <button
            onClick={() => {
              if (player) {
                removePlayerMutation.mutate({ teamId: team.id, userId: player.userId });
                setSelectedPlayers(new Set());
              }
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove
          </button>
        </div>
      );
    }

    return null; // No actions for multiple selection
  };

  return (
    <div className="lg:min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Team Header */} 

        {/* Stats Cards */}

        {/* Players Table */}
        <AdvancedTable<TeamPlayer>
          data={players.sort((a, b) => {
            // Captain first, then others
            if (team?.captainId === a.userId) return -1;
            if (team?.captainId === b.userId) return 1;
            return 0;
          })}
          columns={playerColumns}
          loading={teamLoading}
          searchable={true}
          searchPlaceholder="Search players..."
          searchFields={['firstName', 'lastName', 'phone', 'panchayat', 'district']}
          filterable={true}
          filters={playerFilterFields}
          selectable={true}
          selectedRows={selectedPlayers}
          onSelectionChange={setSelectedPlayers}
          onRowClick={setSelectedPlayer}
          keyExtractor={(player) => player.id}
          headerActions={getPlayerHeaderActions()}
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

      {/* Add Player Modal */}
      <AddPlayerModal
        isOpen={showAddPlayerModal}
        onClose={() => {
          setShowAddPlayerModal(false);
          setEditingPlayer(null);
        }}
        onAddPlayer={editingPlayer ? handleEditPlayer : handleAddPlayer}
        teamData={team}
        canAddMain={true}
        canAddSubstitute={true}
        canAddPlayer={true}
        editingPlayer={editingPlayer}
      />

      {/* Player Detail Modal */}
      <PlayerDetailModal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        selectedPlayer={selectedPlayer}
        teamData={team}
        isReadOnly={false}
        onRemovePlayer={(playerId) => {
          const player = players.find(p => p.id === playerId);
          if (player) {
            removePlayerMutation.mutate({ teamId: team.id, userId: player.userId });
          }
        }}
        onMakeCaptain={handleMakeCaptain}
        onDocumentUploadSuccess={async (playerId, documentType, url) => {
          // Refetch team data to update document status
          const result = await refetchTeam();
          
          // Update selectedPlayer with fresh data if it's the same player
          if (selectedPlayer && selectedPlayer.id === playerId && result.data) {
            const updatedPlayer = result.data.teamPlayers?.find(p => p.id === playerId);
            if (updatedPlayer) {
              setSelectedPlayer(updatedPlayer);
            }
          }
        }}
        onProfileComplete={async (playerId, isComplete) => {
          // Refetch team data to update profile completion status
          const result = await refetchTeam();
          
          // Update selectedPlayer with fresh data if it's the same player
          if (selectedPlayer && selectedPlayer.id === playerId && result.data) {
            const updatedPlayer = result.data.teamPlayers?.find(p => p.id === playerId);
            if (updatedPlayer) {
              setSelectedPlayer(updatedPlayer);
            }
          }
        }}
      />
    </div>
  );
}