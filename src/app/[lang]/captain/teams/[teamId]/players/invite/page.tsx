"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  UserPlus,
  Users,
  Check,
  X,
  Edit,
  Trash2,
  Search,
  Upload,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Trophy
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { useAuth } from "@/context/AuthContext";
import { AlertModal, ConfirmationModal } from '@/components/ui/Modal';
import { useAlert } from '@/hooks/useAlert';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/server/trpc/react';
import Image from "next/image";
import { PlayerDocumentUpload } from "@/components/players";
import DocumentPreview from "@/components/documents/DocumentPreview";
import { AddPlayerModal } from '@/components/modals/AddPlayerModal';
import { PlayerDetailModal } from '@/components/modals/PlayerDetailModal';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import { Table } from '@/components/ui/Table';
import type { Column } from '@/components/ui/Table';

interface TeamPlayer {
  id: string;
  userId: string;
  teamId: string;
  firstName: string;
  lastName: string;
  phone: string;
  whatsappNumber: string | null;
  dateOfBirth: Date;
  age: number;
  gender: string;
  position: 'main' | 'substitute';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string;
  addedBy: string;
  createdAt: Date;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string;
    role: string;
    profileComplete: boolean,
    profileImages: {
      userId: string;
      profilePhotoPath: string | null;
      aadhaarFrontPath: string | null;
      aadhaarBackPath: string | null;
      allImagesUploaded: boolean;
      verifiedBy: string | null;
      verifiedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    } | null;
  };
}

interface TeamData {
  id: string;
  name: string;
  sportId: string;
  captainId: string;
  captainName: string;
  genderCategory: string;
  status: string;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string | null;
  currentPlayers: number;
  currentSubstitutes: number;
  createdAt: Date;
  updatedAt: Date;
  sport: {
    id: string;
    name: string;
    mainPlayersCount: number;
    maxSubstitutes: number;
  };
  captainUser: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string;
  };
  teamPlayers: TeamPlayer[];
}

export default function CaptainPlayerManagement() {
  const router = useRouter();
  const { lang, teamId } = useParams();
  const { user } = useAuth();

  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());

  // Remove player confirmation modal
  const [showRemovePlayerModal, setShowRemovePlayerModal] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState<TeamPlayer | null>(null);
  const [isRemovingPlayer, setIsRemovingPlayer] = useState(false);

  // Team submission states
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);
  
  // Captain transfer states
  const [showCaptainConfirmModal, setShowCaptainConfirmModal] = useState(false);
  const [playerToBeMadeCaptain, setPlayerToBeMadeCaptain] = useState<TeamPlayer | null>(null);
  const [isMakingCaptain, setIsMakingCaptain] = useState(false);
  
  const { alertState, showError, showSuccess, showInfo, hideAlert } = useAlert();
  const { addNotification } = useNotification();

  if (!teamId || (Array.isArray(teamId) && teamId.length === 0)) {
    throw new Error("Team ID is missing or invalid");
  }
  const teamIdStr: string = Array.isArray(teamId) ? teamId[0] : teamId;

  // tRPC queries
  const teamQuery = api.teams.getById.useQuery(
    {
      id: teamIdStr,
      includePhotos: false,
      includePlayers: true,
      includeVenueAssignments: false
    },
    { enabled: !!teamIdStr }
  );

  const addPlayerMutation = api.teams.addPlayer.useMutation({
    onSuccess: () => {
      // Invalidate and refetch the team data
      utils.teams.getById.invalidate();
      utils.teams.getById.invalidate({ id: teamIdStr });
    },
  });
  const removePlayerMutation = api.teams.removePlayer.useMutation({
    onSuccess: () => {
      // Invalidate and refetch the team data
      utils.teams.getById.invalidate();
      utils.teams.getById.invalidate({ id: teamIdStr });
    },
  });
  const makeCaptainMutation = api.teams.makeCaptain.useMutation();
  const submitTeamMutation = api.teams.verify.useMutation();
  const utils = api.useUtils();

  // Handle tRPC query results
  useEffect(() => {
    if (teamQuery.isLoading) {
      setLoading(true);
      setError("");
      return;
    }

    if (teamQuery.error) {
      setError("Failed to load team data");
      setLoading(false);
      return;
    }

    if (!teamQuery.data) {
      setError("Team not found");
      setLoading(false);
      return;
    }

    const team = teamQuery.data;
    console.log(team);

    // Verify team ownership
    if (team.captainId !== user?.id) {
      setError("You are not authorized to manage this team");
      setLoading(false);
      return;
    }

    // Set team data
    setTeamData(team as TeamData);
    setLoading(false);
  }, [teamQuery.isLoading, teamQuery.error, teamQuery.data, user?.id]);

  // Keep selectedPlayer in sync with players array changes
  useEffect(() => {
    if (selectedPlayer && teamData?.teamPlayers) {
      const updatedPlayer = teamData.teamPlayers.find(p => p.id === selectedPlayer.id);
      if (updatedPlayer) {
        setSelectedPlayer(updatedPlayer);
      }
    }
  }, [teamData?.teamPlayers, selectedPlayer]);

  const players = teamData?.teamPlayers || [];
  const sportConfig = teamData?.sport || { mainPlayersCount: 6, maxSubstitutes: 6 };
  const totalSlotsNeeded = sportConfig.mainPlayersCount + sportConfig.maxSubstitutes;
  const currentPlayers = players.length;
  const mainPlayers = players.filter(p => p.position === 'main').length;
  const substitutes = players.filter(p => p.position === 'substitute').length;

  // Table columns - Fixed to match Table component expectations
  const columns: Column<TeamPlayer>[] = [
    {
      key: 'name',
      header: 'Player',
      render: (value, player, index) => (
        <div>
          <div className="text-sm font-semibold text-[#4A2F1D] flex items-center">
            {player?.firstName || ''} {player?.lastName || ''}
            {player?.userId && teamData?.captainId && player.userId === teamData.captainId && (
              <span className="ml-2 text-xs bg-[#F28C38] text-white px-2 py-1 rounded">Captain</span>
            )}
          </div>
          <div className="text-sm text-gray-500">{player?.phone || ''}</div>
        </div>
      ),
    },
    {
      key: 'position',
      header: 'Position',
      render: (value, player, index) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          player?.position === 'main'
            ? 'bg-[#3A7F3F] text-white'
            : 'bg-[#C79016] text-white'
        }`}>
          {player?.position === 'main' ? 'Main' : 'Substitute'}
        </span>
      ),
    },
    {
      key: 'age',
      header: 'Age',
      render: (value, player, index) => {
        if (!player?.dateOfBirth) return '-';
        const age = new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear();
        return `${age} years`;
      },
    },
    {
      key: 'documents',
      header: 'Documents',
      render: (value, player, index) => (
        <div className="flex space-x-1">
          {player?.user?.profileImages?.profilePhotoPath ? (
            <CheckCircle className="w-4 h-4 text-[#3A7F3F]" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-gray-300" title="Profile Photo Missing"></div>
          )}
          {player?.user?.profileImages?.aadhaarFrontPath ? (
            <CheckCircle className="w-4 h-4 text-[#3A7F3F]" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-gray-300" title="Aadhaar Front Missing"></div>
          )}
          {player?.user?.profileImages?.aadhaarBackPath ? (
            <CheckCircle className="w-4 h-4 text-[#3A7F3F]" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-gray-300" title="Aadhaar Back Missing"></div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, player, index) => (
        <div className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full ${getPlayerStatusColor(player)}`}>
          {getPlayerStatusIcon(player)}
          <span>{getPlayerStatusText(player)}</span>
        </div>
      ),
    },
  ];


  const isReadOnly = teamData?.status && teamData.status !== 'draft';
  const canAddPlayer = currentPlayers < totalSlotsNeeded && !isReadOnly;
  const canAddMain = mainPlayers < sportConfig.mainPlayersCount && !isReadOnly;
  const canAddSubstitute = substitutes < sportConfig.maxSubstitutes && !isReadOnly;


  // Handle document upload success - refresh team data
  const handleDocumentUploadSuccess = async (playerId: string, documentType: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack', url: string) => {
    // Refetch team data to get updated player information
    await teamQuery.refetch();
  };

  // Handle profile completion status change
  const handleProfileComplete = (playerId: string, isComplete: boolean) => {
    // Refetch team data to get updated player information
    teamQuery.refetch();
  };
  const handleAddPlayer = async (playerData: any) => {
    if (!teamData) {
      throw new Error('Team data is not loaded yet. Please wait a moment and try again.');
    }

    try {
      // Check for duplicate player by phone number
      const existingPlayerInTeam = players.find(p => p.phone === playerData.phone);
      if (existingPlayerInTeam) {
        throw new Error(`A player with phone number ${playerData.phone} is already in this team.`);
      }

      // Use tRPC mutation to add player
      const result = await addPlayerMutation.mutateAsync(playerData);

      // Player added successfully - cache will be invalidated by onSuccess callback
      addNotification('Player added successfully!', 'success');
    } catch (error) {
      console.error('Add player error:', error);
      addNotification(`Failed to add player: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error; // Re-throw so modal can handle loading state
    }
  };

  const removePlayer = async (playerId: string) => {
    console.log('🗑️ removePlayer called with playerId:', playerId);

    if (!teamData || !user) {
      console.log('🗑️ Missing teamData or user, returning early');
      return;
    }

    // Find the player to get the userId
    const player = players.find(p => p.id === playerId);
    console.log('🗑️ Found player:', player);

    if (!player) {
      console.log('🗑️ Player not found');
      addNotification('Player not found', 'error');
      return;
    }

    // Prevent removing captain
    if (player.userId === teamData.captainId) {
      console.log('🗑️ Attempted to remove captain');
      addNotification('Cannot remove team captain', 'error');
      return;
    }

    // Show confirmation modal instead of browser confirm
    setPlayerToRemove(player);
    setShowRemovePlayerModal(true);
  };

  const confirmRemovePlayer = async () => {
    if (!playerToRemove || !teamData) return;

    try {
      console.log('🗑️ Starting removal process for:', playerToRemove);
      setIsRemovingPlayer(true);

      // Use tRPC mutation to remove player (needs userId, not playerId)
      console.log('🗑️ Calling tRPC mutation with:', { teamId: teamData.id, userId: playerToRemove.userId });
      const result = await removePlayerMutation.mutateAsync({
        teamId: teamData.id,
        userId: playerToRemove.userId
      });
      console.log('🗑️ tRPC mutation result:', result);

      console.log('🗑️ Player removed, cache will be invalidated by onSuccess callback');
      
      // Close modal and reset state immediately
      setShowRemovePlayerModal(false);
      setPlayerToRemove(null);
      setSelectedRows(new Set()); // Clear selection
      
      // Show success toast notification
      addNotification('Player removed successfully!', 'success');
    } catch (error) {
      console.error('🗑️ Remove player error:', error);
      addNotification('Failed to remove player. Please try again.', 'error');
    } finally {
      console.log('🗑️ Cleanup: setting loading to false');
      setIsRemovingPlayer(false);
    }
  };

  const handleMakeCaptainClick = (playerId: string) => {
    if (!teamData || !user) return;

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    setPlayerToBeMadeCaptain(player);
    setShowCaptainConfirmModal(true);
  };

  const confirmMakeCaptain = async () => {
    if (!teamData || !user || !playerToBeMadeCaptain) return;

    try {
      setIsMakingCaptain(true);

      // Use tRPC mutation to make player captain
      const result = await makeCaptainMutation.mutateAsync({
        teamId: teamData.id,
        newCaptainId: playerToBeMadeCaptain.userId
      });

      // Refetch team data to reflect changes
      await teamQuery.refetch();
      showSuccess(result.message || 'Captain transferred successfully!');
      
      // Close modals
      setShowCaptainConfirmModal(false);
      setPlayerToBeMadeCaptain(null);
      setSelectedPlayer(null);
      
      // Redirect to dashboard since user is no longer captain
      router.push(`/${lang}/captain/dashboard`);
    } catch (error) {
      console.error('Make captain error:', error);
      showError('Failed to transfer captaincy. Please try again.');
      
      // Close modal with delay even on error
      setTimeout(() => {
        setShowCaptainConfirmModal(false);
        setPlayerToBeMadeCaptain(null);
      }, 2000);
    } finally {
      setIsMakingCaptain(false);
    }
  };



  const getPlayerStatusColor = (player: TeamPlayer) => {
    if (player?.verificationStatus === 'verified') return 'text-[#3A7F3F] bg-green-50';
    if (player?.verificationStatus === 'rejected') return 'text-red-600 bg-red-50';
    // TODO: Add profile completion check when document system is implemented
    return 'text-gray-600 bg-gray-50';
  };

  const getPlayerStatusIcon = (player: TeamPlayer) => {
    if (player?.verificationStatus === 'verified') return <CheckCircle className="w-4 h-4" />;
    if (player?.verificationStatus === 'rejected') return <X className="w-4 h-4" />;
    // TODO: Add profile completion check when document system is implemented
    return <AlertCircle className="w-4 h-4" />;
  };

  const getPlayerStatusText = (player: TeamPlayer) => {
    if (player?.verificationStatus === 'verified') return 'Verified';
    if (player?.verificationStatus === 'rejected') return 'Rejected';
    // TODO: Add profile completion check when document system is implemented
    return 'Pending';
  };


  const handleSubmitTeam = async () => {
    if (!teamData) {
      showError('Team data is not loaded. Please refresh and try again.');
      return;
    }

    if (!user) {
      showError('User authentication required. Please log in again.');
      return;
    }

    const validationErrors = [];
    const sport = teamData.sport;

    if (mainPlayers < sport.mainPlayersCount) {
      validationErrors.push(`Need at least ${sport.mainPlayersCount} main players (currently have ${mainPlayers})`);
    }

    if (players.length === 0) {
      validationErrors.push('Team must have at least one player');
    }

    const playersWithInvalidIds = players.filter(p => !p.userId);
    if (playersWithInvalidIds.length > 0) {
      validationErrors.push(`${playersWithInvalidIds.length} player(s) have missing user IDs. Please remove and re-add them.`);
    }

    // TODO: Add document validation when document system is implemented
    const playersWithIncompleteDocuments = players.filter(player => !player.user?.profileComplete);
    if (playersWithIncompleteDocuments.length > 0) {
      validationErrors.push(`${playersWithIncompleteDocuments.length} player(s) have incomplete documents. Please ensure all documents are uploaded.`);
    }

    if (teamData.genderCategory) {
      if (teamData.genderCategory === 'women') {
        const malePlayersCount = players.filter(p => p.gender === 'M').length;
        if (malePlayersCount > 0) {
          validationErrors.push(`${sport?.name || 'This sport'} is only for women. Found ${malePlayersCount} male player(s).`);
        }
      } else if (teamData.genderCategory === 'men') {
        const femalePlayersCount = players.filter(p => p.gender === 'F').length;
        if (femalePlayersCount > 0) {
          validationErrors.push(`${sport?.name || 'This sport'} is only for men. Found ${femalePlayersCount} female player(s).`);
        }
      }
    }

    if (validationErrors.length > 0) {
      showError(`Cannot submit team:\n\n${validationErrors.map((error, index) => `${index + 1}. ${error}`).join('\n')}`);
      return;
    }

    setShowSubmissionModal(true);
  };

  const confirmSubmitTeam = async () => {
    if (!teamData || !user) return;

    try {
      setIsSubmittingTeam(true);

      // Use tRPC mutation to submit team for verification
      const result = await submitTeamMutation.mutateAsync({
        id: teamData.id,
        status: 'submitted',
        verifiedBy: user.id,
      });

      setShowSubmissionModal(false);
      showSuccess(`Team "${teamData?.name || 'Your team'}" submitted for verification successfully!\n\nYou will be notified once the review is complete.`);
      router.push(`/${lang}/captain/dashboard`);
    } catch (error) {
      console.error('Submit team error:', error);
      showError(`Failed to submit team: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact support.`);
    } finally {
      setIsSubmittingTeam(false);
    }
  };

  if (loading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (error || !teamData) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        {/* <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error || "Failed to load team data"}</p>
          <button 
            onClick={() => router.push(`/${lang}/captain/dashboard`)}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Back to Dashboard
          </button>
        </div> */}
      </div>
    );
  }

  return (
    <div className="lg:min-h-screen bg-gray-50 font-fira">

      <div className="max-w-7xl mx-auto sm:px-4 py-8">
        {/* Read-only notification */}
        {isReadOnly && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  Team Submitted for Verification
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  This team has been submitted for verification and is now read-only. You cannot add, edit, or remove players at this time.
                  Status: <span className="font-semibold capitalize">{teamData?.status}</span>
                </p>
              </div>
            </div>
          </div>
        )}


        {/* Team Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 px-2 sm:px-0 gap-3 md:gap-6 mb-8">
          
          <div className="bg-white rounded-lg p-3 md:p-6 shadow-lg">
            <div className="flex items-center justify-between pt-1 sm:pt-2 pr-4">
              <p className=" text-lg md:text-2xl font-bold text-[#4A2F1D] truncate">{teamData?.name || 'Team'}</p>
              <Trophy className=" w-4 h-4 md:w-8 md:h-8 text-[#F28C38]" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 md:p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Total Players</p>
                <p className="text-sm md:text-2xl font-bold text-[#4A2F1D]">{currentPlayers}/{totalSlotsNeeded}</p>
              </div>
              <Users className="w-4 h-4 md:w-8 md:h-8 text-[#F28C38]" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 md:p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Main Players</p>
                <p className="text-sm md:text-2xl font-bold text-[#4A2F1D]">{mainPlayers}/{sportConfig.mainPlayersCount}</p>
              </div>
              <Users className="w-4 h-4 md:w-8 md:h-8 text-[#3A7F3F]" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 md:p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Substitute Players</p>
                <p className="text-sm md:text-2xl font-bold text-[#4A2F1D]">{substitutes}/{sportConfig.maxSubstitutes}</p>
              </div>
              <Users className="w-4 h-4 md:w-8 md:h-8 text-blue-500" />
            </div>
          </div>
        </div>
        

        {/* Players Table - Full AdvancedTable with all features */}
        <AdvancedTable
          data={players}
          columns={columns}
          keyExtractor={(player) => player.id}
          loading={loading}
          
          // Search configuration
          searchable={true}
          searchPlaceholder="Search players..."
          searchFields={['firstName', 'lastName', 'phone']}
          
          // Disable sorting
          sortable={false}
          
          // Selection configuration
          selectable={true}
          selectedRows={selectedRows}
          onSelectionChange={(newSelectedRows) => {
            console.log('🟢 Selection changed:', newSelectedRows);
            setSelectedRows(newSelectedRows);
          }}
          onRowClick={(player) => {
            console.log('🟢 Row clicked:', player);
            setSelectedPlayer(player);
          }}
          
          // Header actions based on selection
          headerActionsNone={
            <button
              onClick={() => setShowAddPlayerModal(true)}
              disabled={!canAddPlayer}
              className="bg-[#F28C38] hover:bg-[#E67A26] disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span className='text-xs sm:text-md'>Add Player</span>
            </button>
          }
          
          headerActionsSingle={(selectedPlayers) => {
            // Use the selectedPlayers parameter directly - it contains the actual selected players
            const selectedPlayer = selectedPlayers[0] || null;
            
            return selectedPlayer?.userId !== teamData?.captainId ? (
              <button
                onClick={() => {
                  if (selectedPlayer) {
                    removePlayer(selectedPlayer.id);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className='text-xs sm:text-md'>Remove Player</span>
              </button>
            ) : (
              <div className="text-sm text-gray-500 px-4 py-2">Captain cannot be removed</div>
            );
          }}
          
          // Empty state
          emptyState={{
            icon: Users,
            title: "No Players Added Yet",
            description: "Start building your team by adding players",
            action: canAddPlayer ? {
              label: "Add First Player",
              onClick: () => setShowAddPlayerModal(true)
            } : undefined
          }}
          
          // No search results empty state
          noSearchResultsEmptyState={{
            icon: Search,
            title: "No Players Found",
            description: "No players match your search criteria. Try adjusting your search terms.",
            action: undefined
          }}
          
          // Table configuration
          stickyHeader={false}
          compact={true}
          
          // Disable pagination
          pagination={{ enabled: false }}
        />

        {/* Submit Section */}
        {!isReadOnly && teamData?.sport && mainPlayers >= teamData.sport.mainPlayersCount && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between">

              <div>
                <h3 className="text-lg font-bold text-[#4A2F1D] mb-2">Ready to Submit?</h3>
                <p className="text-gray-600">
                  {mainPlayers >= teamData.sport.mainPlayersCount
                    ? `You have ${mainPlayers} main players. Submit your team for verification.`
                    : `Add at least ${teamData.sport.mainPlayersCount} main players to submit.`}
                </p>
              </div>
              <button
                onClick={handleSubmitTeam}
                className="bg-[#3A7F3F] hover:bg-green-700 text-white px-8 py-3 my-8 rounded-lg font-semibold transition-colors"
              >
                Submit Team for Verification
              </button>
            </div>
          </div>
        )}

        {/* Read-only status for submitted teams */}
        {isReadOnly && (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Team Status: <span className="capitalize text-blue-600">{teamData?.status}</span>
            </h3>
            <p className="text-gray-600">
              This team has been submitted and is currently under review. No modifications can be made at this time.
            </p>
          </div>
        )}
      </div>

      {/* Add Player Modal */}
      <AddPlayerModal
        isOpen={showAddPlayerModal}
        onClose={() => setShowAddPlayerModal(false)}
        onAddPlayer={handleAddPlayer}
        teamData={teamData}
        canAddMain={canAddMain}
        canAddSubstitute={canAddSubstitute}
        canAddPlayer={canAddPlayer}
      />

      {/* Player Detail Modal */}
      <PlayerDetailModal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        selectedPlayer={selectedPlayer}
        teamData={teamData}
        isReadOnly={isReadOnly}
        onMakeCaptain={handleMakeCaptainClick}
        onDocumentUploadSuccess={handleDocumentUploadSuccess}
        onProfileComplete={handleProfileComplete}
      />

      {/* Team Submission Confirmation Modal */}
      {showSubmissionModal && teamData && teamData.sport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-[#F28C38] rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#4A2F1D]">Submit Team</h2>
                  <p className="text-gray-600">Confirm team submission</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-[#4A2F1D] mb-3">Team Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Team Name:</span>
                      <span className="font-medium">{teamData?.name || 'Team'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sport:</span>
                      <span className="font-medium">{teamData?.sport?.name || 'Sport'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Players:</span>
                      <span className="font-medium">{currentPlayers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Main Players:</span>
                      <span className="font-medium">{mainPlayers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Substitutes:</span>
                      <span className="font-medium">{substitutes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Documents:</span>
                      <span className="font-medium text-[#3A7F3F]">
                        {players.filter(p => p.user?.profileImages?.allImagesUploaded).length === players.length ? 'Complete' : 'Incomplete'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Important Notice</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Once submitted, your team will be locked for verification. You won&apos;t be able to make changes until the review is complete.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-center text-gray-600">
                  Are you sure you want to submit this team for verification?
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSubmissionModal(false)}
                  disabled={isSubmittingTeam}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSubmitTeam}
                  disabled={isSubmittingTeam}
                  className="flex-1 bg-[#3A7F3F] hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center"
                >
                  {isSubmittingTeam ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Team'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={hideAlert}
        message={alertState.message}
        type={alertState.type}
        title={alertState.title}
      />

      <ConfirmationModal
        isOpen={showCaptainConfirmModal}
        onClose={() => setShowCaptainConfirmModal(false)}
        onConfirm={confirmMakeCaptain}
        title="Transfer Team Captaincy"
        description={playerToBeMadeCaptain ? `Are you sure you want to make ${playerToBeMadeCaptain.firstName} ${playerToBeMadeCaptain.lastName} the new team captain? You will no longer be the captain of this team.` : ''}
        confirmLabel="Make Captain"
        cancelLabel="Cancel"
        confirmVariant="primary"
        loading={isMakingCaptain}
      />

      <ConfirmationModal
        isOpen={showRemovePlayerModal}
        onClose={() => {
          setShowRemovePlayerModal(false);
          setPlayerToRemove(null);
        }}
        onConfirm={confirmRemovePlayer}
        title="Remove Player"
        description={playerToRemove ? `Are you sure you want to remove ${playerToRemove.firstName} ${playerToRemove.lastName} from the team? This action cannot be undone.` : ''}
        confirmLabel="Remove Player"
        cancelLabel="Cancel"
        confirmVariant="danger"
        loading={isRemovingPlayer}
      />
    </div>
  );
}
