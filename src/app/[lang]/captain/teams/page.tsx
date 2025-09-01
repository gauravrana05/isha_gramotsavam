'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/server/trpc/react';
import { AdvancedTable, PageLoader, type Column } from '@/components/ui';
import { AddPlayerModal } from '@/components/modals/AddPlayerModal';
import { PlayerDetailModal } from '@/components/modals/PlayerDetailModal';
import {
  Users, UserPlus, CheckCircle, Clock, AlertCircle, Eye, Trash2, 
  ArrowLeft, Search, X, Loader2
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

export default function CaptainTeamsPage() {
  const { teamId, lang } = useParams();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { addNotification } = useNotification();

  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Get captain's team data
  const {
    data: teamData,
    isLoading: teamLoading,
    error: teamError,
    refetch: refetchTeam
  } = api.teams.management.getMyTeam.useQuery(
    undefined,
    { enabled: !!user && user.role === 'captain' }
  );

  // Add player mutation
  const addPlayerMutation = api.teams.players.addPlayer.useMutation({
    onSuccess: () => {
      addNotification('Player added successfully!', 'success');
      setShowAddPlayerModal(false);
      refetchTeam();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to add player', 'error');
    }
  });

  // Remove player mutation
  const removePlayerMutation = api.teams.players.removePlayer.useMutation({
    onSuccess: () => {
      addNotification('Player removed successfully!', 'success');
      refetchTeam();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to remove player', 'error');
    }
  });

  // Submit team mutation
  const submitTeamMutation = api.teams.management.submitForVerification.useMutation({
    onSuccess: () => {
      addNotification('Team submitted for verification successfully!', 'success');
      router.push(`/${lang}/captain/dashboard`);
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to submit team', 'error');
    }
  });

  const players = teamData?.players || [];
  const sportConfig = teamData?.sport || { maxPlayers: 11, maxSubstitutes: 5 };
  const mainPlayers = players.filter(p => p.position === 'main').length;
  const substitutes = players.filter(p => p.position === 'substitute').length;
  const totalPlayers = players.length;
  const totalSlotsNeeded = sportConfig.maxPlayers + sportConfig.maxSubstitutes;

  const isReadOnly = teamData?.status !== 'draft';
  const canAddPlayer = totalPlayers < totalSlotsNeeded && !isReadOnly;

  const filteredPlayers = players.filter(player =>
    `${player.firstName} ${player.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.phone.includes(searchTerm)
  );

  const handleAddPlayer = (playerData: any) => {
    addPlayerMutation.mutate({
      teamId: teamData?.id || '',
      ...playerData
    });
  };

  const handleRemovePlayer = (playerId: string) => {
    if (confirm('Are you sure you want to remove this player?')) {
      removePlayerMutation.mutate({
        teamId: teamData?.id || '',
        playerId
      });
    }
  };

  const handleSubmitTeam = () => {
    if (confirm('Are you sure you want to submit this team for verification?')) {
      submitTeamMutation.mutate({
        teamId: teamData?.id || ''
      });
    }
  };

  const columns: Column<TeamPlayer>[] = useMemo(() => [
    {
      key: 'player',
      header: 'Player',
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
      key: 'position',
      header: 'Position',
      render: (_, player) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          player.position === 'main' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {player.position === 'main' ? 'Main' : 'Substitute'}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, player) => (
        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
          player.verificationStatus === 'verified' || player.verificationStatus === 'approved'
            ? 'bg-green-100 text-green-800' 
            : player.verificationStatus === 'pending'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`} title="Verification status is managed by tournament officials">
          {player.verificationStatus === 'verified' || player.verificationStatus === 'approved' ? (
            <>
              <CheckCircle className="w-3 h-3 mr-1" />
              Verified
            </>
          ) : player.verificationStatus === 'pending' ? (
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

  if (teamLoading) {
    return <PageLoader message="Loading team data..." />;
  }

  if (teamError || !teamData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Team Found</h1>
          <p className="text-gray-600 mb-4">You don&apos;t have a team yet. Create one to get started.</p>
          <button 
            onClick={() => router.push(`/${lang}/captain/dashboard`)}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push(`/${lang}/captain/dashboard`)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{teamData.name}</h1>
            <p className="text-gray-600 mt-2">Manage your team players</p>
          </div>
          {canAddPlayer && (
            <button
              onClick={() => setShowAddPlayerModal(true)}
              className="bg-[#F28C38] text-white px-4 py-2 rounded-lg hover:bg-[#E67A26] transition-colors flex items-center"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Player
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Players</p>
              <p className="text-2xl font-bold text-gray-900">{totalPlayers}/{totalSlotsNeeded}</p>
            </div>
            <Users className="w-8 h-8 text-[#F28C38]" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Main Players</p>
              <p className="text-2xl font-bold text-gray-900">{mainPlayers}/{sportConfig.maxPlayers}</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Substitutes</p>
              <p className="text-2xl font-bold text-gray-900">{substitutes}/{sportConfig.maxSubstitutes}</p>
            </div>
            <Users className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Verified</p>
              <p className="text-2xl font-bold text-gray-900">
                {players.filter(p => p.verificationStatus === 'verified' || p.verificationStatus === 'approved').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Verification Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-blue-900 font-medium">Player Verification</p>
            <p className="text-blue-700 text-sm">
              Verification status is managed by tournament officials. Contact admin if verification issues arise.
            </p>
          </div>
        </div>
      </div>

      {/* Team Status Info */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-amber-900 font-medium">Team Submitted</p>
              <p className="text-amber-700 text-sm">
                Your team has been submitted and player changes are no longer allowed. Contact admin for any modifications.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Players Table */}
      <AdvancedTable<TeamPlayer>
        data={filteredPlayers}
        columns={columns}
        loading={teamLoading}
        searchable={true}
        searchPlaceholder="Search players by name, phone..."
        sortable={true}
        pagination={{ enabled: true }}
        onRowClick={(player) => setSelectedPlayer(player)}
        keyExtractor={(player) => player.id}
        emptyState={{
          icon: Users,
          title: 'No players found',
          description: 'Your team doesn\'t have any players yet.',
          action: canAddPlayer ? {
            label: 'Add Player',
            onClick: () => setShowAddPlayerModal(true)
          } : undefined
        }}
        actions={!isReadOnly ? [
          {
            label: 'Remove',
            icon: Trash2,
            variant: 'danger',
            onClick: (player) => handleRemovePlayer(player.id)
          }
        ] : undefined}
      />

      {/* Submit Team Button */}
      {!isReadOnly && mainPlayers >= (teamData.sport?.minPlayers || 7) && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSubmitTeam}
            disabled={submitTeamMutation.isLoading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center"
          >
            {submitTeamMutation.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Team for Verification'
            )}
          </button>
        </div>
      )}

      {/* Modals */}
      {showAddPlayerModal && (
        <AddPlayerModal
          isOpen={showAddPlayerModal}
          onClose={() => setShowAddPlayerModal(false)}
          onSubmit={handleAddPlayer}
          teamId={teamData.id}
          loading={addPlayerMutation.isLoading}
        />
      )}

      {selectedPlayer && (
        <PlayerDetailModal
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          player={selectedPlayer}
          onRemove={() => handleRemovePlayer(selectedPlayer.id)}
          canEdit={!isReadOnly}
        />
      )}
    </div>
  );
}
