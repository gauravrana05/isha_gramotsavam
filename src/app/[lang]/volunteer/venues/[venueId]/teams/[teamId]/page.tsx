'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOfflineTeamDetails } from '@/hooks/useOfflineTeams';
import { useOfflineActions } from '@/hooks/useOfflineActions';
import { useOfflineTeams, useOfflineTeamDetails } from '@/hooks/useOfflineTeams';
import { useOfflineActions } from '@/hooks/useOfflineActions';
import TeamPhotoUpload from '@/components/teams/TeamPhotoUpload';
import DocumentPreview from '@/components/documents/DocumentPreview';
import PlayerDocumentUpload from '@/components/players/PlayerDocumentUpload';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertModal } from '@/components/ui/Modal';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
import { VerificationStatusSelector } from '@/components/ui/StatusSelector';
import { useAlert } from '@/hooks/useAlert';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  AlertTriangle,
  User, 
  Phone, 
  Calendar,
  MapPin,
  Camera,
  Upload,
  ArrowLeft,
  Eye,
  Edit3,
  Check,
  X
} from 'lucide-react';

interface TeamData {
  id: string;
  name: string;
  sportName: string;
  captainProfile: {
    name: string;
    phone: string;
  };
  panchayat: string;
  district: string;
  currentPlayers: number;
  maxPlayers: number;
  status: string;
  matchDayStatus?: string;
  teamImageUrl?: string;
}

interface PlayerData {
  id: string;
  userId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  age: number;
  gender: string;
  position: string;
  dob?: string;
  whatsappNumber?: string;
  village?: string;
  district?: string; // ADD THIS
  panchayat?: string; // ADD THIS
  documents: {
    profilePhoto: { url?: string | null; verified: boolean; storagePath?: string | null; uploadedBy?: string | null; uploadedAt?: string | null };
    aadhaarFront: { url?: string | null; verified: boolean; storagePath?: string | null; uploadedBy?: string | null; uploadedAt?: string | null };
    aadhaarBack: { url?: string | null; verified: boolean; storagePath?: string | null; uploadedBy?: string | null; uploadedAt?: string | null };
  };
  verificationStatus: string;
  matchDayVerificationStatus?: string;
  matchDayComments?: string;
}

export default function TeamMatchDayVerificationPage() {
  console.log('🚀 Team page component rendered!');
  
  const params = useParams();
  const { venueId, teamId } = params as { venueId: string; teamId: string; lang: string };
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  console.log('🚀 Team page initial state:', { venueId, teamId, authLoading });
  
  const [team, setTeam] = useState<TeamData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  // Removed loading state - using isTeamDataLoading directly
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [playerExists, setPlayerExists] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searchPhone, setSearchPhone] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [playerFormData, setPlayerFormData] = useState({
    phone: '',
    firstName: '',
    lastName: '',
    dob: '',
    whatsappNumber: '',
    village: '',
    position: 'main' as 'main' | 'substitute'
  });
  const [searchValue, setSearchValue] = useState('');
  const { alertState, showError, showSuccess, showInfo, hideAlert } = useAlert();

  // tRPC queries and mutations
  // Get team data from offline storage
  const { 
    team: teamData, 
    players: hookPlayers,
    refetch: refetchTeam, 
    isLoading: isTeamDataLoading,
    error: teamDataError
  } = useOfflineTeamDetails(teamId);
  
  const isTeamDataError = !!teamDataError;
  const { verifyPlayer } = useOfflineActions();

  // Keep phone search as API call for now
  const { data: searchedUser, isLoading: isSearchingPhone } = api.users.getByPhone.useQuery(
    { phone: searchPhone },
    { 
      enabled: searchPhone.length > 0,
      refetchOnWindowFocus: false
    }
  );

  // Get offline actions
  const { 
    verifyPlayer: verifyPlayerAction, 
    uploadMedia, 
    addPlayer: addPlayerAction,
    removePlayer: removePlayerAction,
    updatePlayer: updatePlayerAction,
    promoteCaptain: promoteCaptainAction
  } = useOfflineActions();
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  // Replace addPlayerMutation with offline action
  const handleAddPlayer = async (playerData: any) => {
    try {
      setIsAddingPlayer(true);
      await addPlayerAction(team.id, playerData);
      setShowAddPlayerModal(false);
      setPlayerFormData({ phone: '', firstName: '', lastName: '', dob: '', whatsappNumber: '', village: '', position: 'main' });
      showSuccess('Player added successfully!');
    } catch (error: any) {
      showError(`Error: ${error.message}`);
    } finally {
      setIsAddingPlayer(false);
    }
  };

  // Get offline actions
  const { uploadMedia, removePlayer, updatePlayer, promoteCaptain } = useOfflineActions();

  const handleUploadTeamImage = async (file: File) => {
    try {
      await uploadMedia(file, teamId!, 'team');
      const { data: updatedData } = await refetchTeam();
      if (updatedData) {
        // Update team state with fresh data
        const mappedTeam = {
          id: updatedData.id,
          name: updatedData.name,
          sportName: updatedData.sport?.name || '',
          captainProfile: {
            name: `${updatedData.captainUser?.firstName || ''} ${updatedData.captainUser?.lastName || ''}`.trim(),
            phone: updatedData.captainUser?.phone || '',
          },
          panchayat: updatedData.panchayat || '',
          district: updatedData.district || '',
          currentPlayers: updatedData.teamPlayers?.length || 0,
          maxPlayers: updatedData.maxPlayers || 11,
          status: updatedData.status || 'active',
          teamImageUrl: updatedData.teamPhoto?.photoPath,
        };
        setTeam(mappedTeam);
      }
      setShowImageUpload(false);
      showSuccess('Team photo uploaded successfully!');
    },
    onError: (error) => {
      showError(`Error: ${error.message}`);
    }
  });

  const removePlayerMutation = // TODO: Migrate to offline - api.volunteers.venue.removePlayer.useMutation({
    onSuccess: () => {
      refetchTeam();
      showSuccess('Player removed successfully!');
    },
    onError: (error) => {
      showError(`Error: ${error.message}`);
    }
  });

  const updatePlayerMutation = // TODO: Migrate to offline - api.volunteers.venue.updatePlayer.useMutation({
    onSuccess: () => {
      refetchTeam();
      setShowAddPlayerModal(false);
      setPlayerFormData({ phone: '', firstName: '', lastName: '', dob: '', whatsappNumber: '', village: '', position: 'main' });
      setIsEditMode(false);
      setEditingPlayerId(null);
      
      // Update selected player with fresh data if modal is open
      if (selectedPlayer && showPlayerModal) {
        // Find updated player in the refreshed data
        setTimeout(async () => {
          const { data: updatedData } = await refetchTeam();
          if (updatedData) {
            const updatedPlayer = updatedData.teamPlayers?.find(p => p.id === selectedPlayer.id);
            if (updatedPlayer) {
              const profileImages = updatedPlayer.user?.profileImages;
              const mappedPlayer = {
                id: updatedPlayer.id,
                userId: updatedPlayer.user?.id,
                name: `${updatedPlayer.user?.firstName || ''} ${updatedPlayer.user?.lastName || ''}`.trim(),
                firstName: updatedPlayer.user?.firstName || '',
                lastName: updatedPlayer.user?.lastName || '',
                phone: updatedPlayer.user?.phone || '',
                age: updatedPlayer.user?.dateOfBirth ? new Date().getFullYear() - new Date(updatedPlayer.user.dateOfBirth).getFullYear() : 0,
                gender: updatedPlayer.user?.gender || 'M',
                position: updatedPlayer.position || 'main',
                dob: updatedPlayer.user?.dateOfBirth,
                whatsappNumber: updatedPlayer.user?.phone,
                village: updatedPlayer.panchayat || '',
                district: updatedPlayer.district || '',
                panchayat: updatedPlayer.panchayat || '',
                documents: {
                  profilePhoto: { url: profileImages?.profilePhotoPath || null, verified: false },
                  aadhaarFront: { url: profileImages?.aadhaarFrontPath || null, verified: false },
                  aadhaarBack: { url: profileImages?.aadhaarBackPath || null, verified: false },
                },
                verificationStatus: updatedPlayer.verificationStatus || 'pending',
              };
              setSelectedPlayer(mappedPlayer);
            }
          }
        }, 100);
      }
      
      showSuccess('Player updated successfully!');
    },
    onError: (error) => {
      showError(`Error: ${error.message}`);
    }
  });

  const promoteCaptainMutation = // TODO: Migrate to offline - api.volunteers.venue.promoteCaptain.useMutation({
    onSuccess: () => {
      refetchTeam();
      setShowPlayerModal(false);
      setSelectedPlayer(null);
      showSuccess('Captain promoted successfully!');
    },
    onError: (error) => showError(`Error: ${error.message}`)
  });

  // Handle authentication and role validation first
  useEffect(() => {
    console.log('🔍 Auth & Role Check:', {
      authLoading,
      user: !!user,
      userRole: user?.role,
      teamId,
    });

    // If auth is complete but user doesn't exist, show error
    if (!authLoading && !user) {
      console.log('❌ No authenticated user');
      setError('Authentication required to view this page');
      return;
    }

    // Check if user has volunteer role
    if (!authLoading && user && !['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(user.role)) {
      console.log('❌ User does not have volunteer role:', user.role);
      setError('Access denied. Only volunteers can view team verification pages.');
      return;
    }

    // Clear any previous auth errors
    if (!authLoading && user && ['technical_volunteer', 'general_volunteer', 'verification_volunteer'].includes(user.role)) {
      setError('');
    }
  }, [authLoading, user]);

  // Handle team data fetching
  useEffect(() => {
    console.log('🔍 Team Data Effect:', {
      teamData: !!teamData,
      isTeamDataLoading,
      isTeamDataError,
      teamDataError: teamDataError?.message,
      queryEnabled: !!user && !!teamId
    });

    // Handle successful data fetch
    if (teamData) {
      // Map the API response to expected structure
      const mappedTeam = {
        id: teamData.id,
        name: teamData.name,
        sportName: teamData.sport?.name || '',
        captainProfile: {
          name: `${teamData.captainUser?.firstName || ''} ${teamData.captainUser?.lastName || ''}`.trim(),
          phone: teamData.captainUser?.phone || '',
        },
        panchayat: teamData.panchayat || '',
        district: teamData.district || '',
        currentPlayers: teamData.teamPlayers?.length || 0,
        maxPlayers: teamData.maxPlayers || 11,
        status: teamData.status || 'active',
        teamImageUrl: teamData.teamPhoto?.photoPath,
      };

      const mappedPlayers = teamData.teamPlayers?.map(player => {
        // Extract documents from profileImages object (not array)
        const profileImages = player.user?.profileImages;

        return {
          id: player.id,
          userId: player.user?.id,
          name: `${player.user?.firstName || ''} ${player.user?.lastName || ''}`.trim(),
          firstName: player.user?.firstName || '',
          lastName: player.user?.lastName || '',
          phone: player.user?.phone || '',
          age: player.user?.dateOfBirth ? new Date().getFullYear() - new Date(player.user.dateOfBirth).getFullYear() : 0,
          gender: player.user?.gender || 'M',
          position: player.position || 'main',
          dob: player.user?.dateOfBirth,
          whatsappNumber: player.user?.phone,
          village: player.panchayat || '',
          district: player.district || '',
          panchayat: player.panchayat || '',
          documents: {
            profilePhoto: { 
              url: profileImages?.profilePhotoPath || null, 
              verified: false 
            },
            aadhaarFront: { 
              url: profileImages?.aadhaarFrontPath || null, 
              verified: false 
            },
            aadhaarBack: { 
              url: profileImages?.aadhaarBackPath || null, 
              verified: false 
            },
          },
          verificationStatus: player.verificationStatus || 'pending',
        };
      }) || [];

      // Sort players to show captain first
      const sortedPlayers = mappedPlayers.sort((a, b) => {
        const aIsCaptain = mappedTeam.captainProfile?.phone === a.phone;
        const bIsCaptain = mappedTeam.captainProfile?.phone === b.phone;
        if (aIsCaptain && !bIsCaptain) return -1;
        if (!aIsCaptain && bIsCaptain) return 1;
        return 0;
      });

      setTeam(mappedTeam);
      setPlayers(sortedPlayers);
    }

    // Handle errors
    if (isTeamDataError) {
      console.error('❌ Team data fetch error:', teamDataError);
      setError(teamDataError?.message || 'Failed to load team data');
    }
  }, [teamData, isTeamDataLoading, isTeamDataError, teamDataError]);

  const handlePlayerVerification = async (playerId: string, status: 'verified' | 'rejected', comments?: string) => {
    try {
      await verifyPlayer(playerId, status, comments);
      refetchTeam();
      showSuccess('Player verification updated successfully!');
    } catch (error) {
      showError(`Error: ${error.message}`);
    }
  };

  // Replace verifyPlayerMutation with offline action
  const [isVerifyingPlayer, setIsVerifyingPlayer] = useState(false);
  
  const handleVerifyPlayer = async (playerId: string, status: 'verified' | 'rejected', comments?: string) => {
    try {
      setIsVerifyingPlayer(true);
      await verifyPlayerAction(playerId, status, comments);
      showSuccess('Player verification updated successfully!');
      // No need to refetch - data updates automatically with offline hooks
    } catch (error: any) {
      showError(`Error: ${error.message}`);
    } finally {
      setIsVerifyingPlayer(false);
    }
  };

  const handlePlayerStatusChange = useCallback(async (player: PlayerData, newStatus: 'pending' | 'verified' | 'approved' | 'rejected') => {
    if (!user) return;
    await handleVerifyPlayer(
      player.id,
      newStatus as 'verified' | 'rejected',
      `Status changed to ${newStatus}`
    );
  }, [user, handleVerifyPlayer]);

  const handleAddPlayerVolunteer = async () => {
    if (!team || !user) return;
    setIsSubmittingAdd(true);
    
    try {
      const normalizedPhone = playerFormData.phone.startsWith('+91') ? playerFormData.phone : `+91${playerFormData.phone}`;
      
      if (isEditMode && editingPlayerId) {
        updatePlayerMutation.mutate({
          playerId: editingPlayerId,
          teamId: team.id,
          venueId,
          position: playerFormData.position,
          firstName: playerFormData.firstName,
          lastName: playerFormData.lastName,
          phone: normalizedPhone,
          dateOfBirth: playerFormData.dob,
          gender: 'M',
          panchayat: 'Default Panchayat',
          district: 'Default District',
        });
      } else {
        await handleAddPlayer({
          teamId: team.id,
          playerData: {
            name: `${playerFormData.firstName} ${playerFormData.lastName}`.trim(),
            firstName: playerFormData.firstName,
            lastName: playerFormData.lastName,
            phone: normalizedPhone,
            dateOfBirth: playerFormData.dob,
            gender: 'M',
            whatsappNumber: playerFormData.whatsappNumber || playerFormData.phone,
            village: playerFormData.village,
            panchayat: team.panchayat,
            district: team.district,
            position: playerFormData.position
          }
        });
      }
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleEditPlayer = (player: PlayerData) => {
    setPlayerFormData({
      phone: player.phone.replace('+91', ''),
      firstName: player.firstName || '',
      lastName: player.lastName || '',
      dob: player.dob ? new Date(player.dob).toISOString().split('T')[0] : '',
      whatsappNumber: player.whatsappNumber || '',
      village: player.village || '',
      position: player.position as 'main' | 'substitute'
    });
    setIsEditMode(true);
    setEditingPlayerId(player.id);
    setShowPlayerModal(false); // Close player details modal
    setSelectedPlayer(null);   // Clear selected player
    setShowAddPlayerModal(true);
  };

  const handleRemovePlayer = (player: PlayerData) => {
    // Check if player is captain
    if (team?.captainProfile?.phone === player.phone) {
      showError('Cannot remove the team captain. Please promote another player to captain first.');
      return;
    }
    
    if (confirm(`Are you sure you want to remove ${player.name} from the team?`)) {
      removePlayerMutation.mutate({
        playerId: player.id,
        teamId: teamId,
        venueId
      });
    }
  };

  const handlePromoteCaptain = async (player: PlayerData) => {
    if (confirm(`Are you sure you want to promote ${player.name} to team captain?`)) {
      promoteCaptainMutation.mutate({
        teamId: teamId,
        newCaptainId: player.userId || player.id
      });
    }
  };

  const resetPlayerForm = () => {
    setPlayerFormData({ phone: '', firstName: '', lastName: '', dob: '', whatsappNumber: '', village: '', position: 'main' });
    setIsEditMode(false);
    setEditingPlayerId(null);
    setFoundUser(null);
    setPlayerExists(false);
  };

  const handlePhoneSearch = (phone: string) => {
    setPlayerFormData(prev => ({ ...prev, phone }));
    
    if (phone.length === 10) {
      // Trigger search with +91 prefix
      setSearchPhone(`+91${phone}`);
    } else {
      setSearchPhone('');
      setFoundUser(null);
      if (phone.length === 0) {
        setPlayerFormData(prev => ({
          ...prev,
          firstName: '',
          lastName: '',
          dob: '',
          whatsappNumber: ''
        }));
      }
    }
  };

  // Auto-populate form when user is found
  useEffect(() => {
    if (searchedUser && playerFormData.phone.length === 10) {
      setFoundUser(searchedUser);
      setPlayerFormData(prev => ({
        ...prev,
        firstName: searchedUser.firstName || prev.firstName,
        lastName: searchedUser.lastName || prev.lastName,
        dob: searchedUser.dateOfBirth ? new Date(searchedUser.dateOfBirth).toISOString().split('T')[0] : prev.dob,
        whatsappNumber: searchedUser.phone?.replace('+91', '') || prev.whatsappNumber
      }));
    } else if (!searchedUser && searchPhone) {
      setFoundUser(null);
    }
  }, [searchedUser, playerFormData.phone, searchPhone]);

  // Add computed properties for position limits
  const availablePositions = useMemo(() => {
    if (!team || !players) return { main: { available: true, count: 0 }, substitute: { available: true, count: 0 } };
    
    const mainCount = players.filter(p => p.position === 'main').length;
    const subCount = players.filter(p => p.position === 'substitute').length;
    
    // Get sport data from team query - it should include mainPlayersCount and maxSubstitutes
    const sportData = teamData?.sport;
    const maxMainPlayers = sportData?.mainPlayersCount || 11; // Default fallback
    const maxSubPlayers = sportData?.maxSubstitutes || 5; // Default fallback

    return {
      main: { available: mainCount < maxMainPlayers, count: mainCount, max: maxMainPlayers },
      substitute: { available: subCount < maxSubPlayers, count: subCount, max: maxSubPlayers }
    };
  }, [players, team, teamData]);

  const handleStatusChangeBulk = async (playersToUpdate: PlayerData[], status: 'pending' | 'verified' | 'approved' | 'rejected') => {
    if (!user) return;
    setSubmitting(true);
    
    try {
      for (const player of playersToUpdate) {
        await handleVerifyPlayer(
          player.id,
          status as 'verified' | 'rejected',
          `Bulk set to ${status}`
        );
      }
      showSuccess(`Updated ${playersToUpdate.length} players to ${status}.`);
    } catch (e) {
      showError('Bulk update failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const playerColumns = useMemo<Column[]>(() => [
    {
      key: 'profile',
      header: 'Profile',
      className: 'w-16 text-center',
      render: (_value, player) => (
        <div className="flex justify-center">
          {player.documents?.profilePhoto?.url ? (
            <img
              src={player.documents.profilePhoto.url}
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
      key: 'player',
      header: 'Player',
      render: (_value, player) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {player.name}
            {team?.captainProfile?.phone === player.phone && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Captain
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">{player.age} years • {player.gender === 'M' ? 'Male' : 'Female'}</div>
        </div>
      )
    },
    {
      key: 'mobile',
      header: 'Mobile',
      render: (_value, player) => (
        <span className="text-sm text-gray-900">{player.phone}</span>
      )
    },
    {
      key: 'position',
      header: 'Position',
      render: (_value, player) => (
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
          player.position === 'main'
            ? 'bg-[#F28C38] text-white'
            : 'bg-gray-200 text-gray-700'
        }`}>
          {player.position === 'main' ? 'Main Player' : 'Substitute'}
        </span>
      )
    },
    {
      key: 'location',
      header: 'Location',
      render: (_value, player) => (
        <div className="text-sm">
          <div className="text-gray-900">{player.village || 'N/A'}</div>
          <div className="text-gray-500">{player.district || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'age',
      header: 'Age',
      render: (_value, player) => (
        <span className="text-sm text-gray-900">{player.age}</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (_value, player) => (
        <VerificationStatusSelector
          value={player.verificationStatus || 'pending'}
          onChange={(newStatus) => handlePlayerStatusChange(player, newStatus as any)}
          disabled={submitting}
          className="min-w-[120px]"
        />
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-32 text-center',
      render: (_value, player) => (
        <div className="flex space-x-1 justify-center">
          {player.verificationStatus !== 'approved' && player.verificationStatus !== 'rejected' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayerStatusChange(player, 'approved');
                }}
                disabled={submitting}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayerStatusChange(player, 'rejected');
                }}
                disabled={submitting}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject
              </button>
            </>
          )}
        </div>
      )
    }
  ], [handlePlayerStatusChange, submitting]);

  // Show loading spinner while auth is loading OR team data is loading
  if (authLoading || isTeamDataLoading) {
    console.log('🔄 Showing loading spinner:', { 
      authLoading, 
      isTeamDataLoading, 
      user: user ? { id: user.id, role: user.role } : null,
      teamId,
      queryEnabled: !!user && !!teamId,
      timestamp: new Date().toISOString()
    });
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C38]"></div>
          <div className="text-sm text-gray-600">
            Loading... (Check console for details)
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500 max-w-md text-center">
              Debug: authLoading={authLoading ? 'true' : 'false'}, 
              isTeamDataLoading={isTeamDataLoading ? 'true' : 'false'},
              user={user ? user.role : 'none'}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error || isTeamDataError) {
    console.log('❌ Showing error state:', { error, isTeamDataError, teamDataError });
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">{error || teamDataError?.message || 'Failed to load team data'}</p>
          <button 
            onClick={() => {
              setError('');
              refetchTeam();
            }}
            className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!team && !isTeamDataLoading && !authLoading) {
    console.log('❌ Team not found:', { team, teamData, isTeamDataLoading, authLoading });
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Team Not Found</h1>
          <p className="mt-2 text-gray-600">The requested team could not be found.</p>
          <button 
            onClick={() => refetchTeam()}
            className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Team Photo */}
      <div className="hidden md:flex justify-center mb-6">
        <div className="w-1/2 flex flex-col items-center">
          <div className="relative">
            {team.teamImageUrl ? (
              <>
                <DocumentPreview
                  type="teamPhoto"
                  url={team.teamImageUrl}
                  label="Team Photo"
                  showActions={false}
                  size="xxl"
                />
                <button
                  onClick={() => setShowImageUpload(true)}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md border hover:bg-gray-50 transition-colors"
                >
                  <Edit3 className="w-4 h-4 text-gray-600" />
                </button>
              </>
            ) : (
              <div className="w-[300px] h-[300px] bg-gray-100 rounded-lg border flex items-center justify-center">
                <Camera className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
          
          {!team.teamImageUrl && (
            <button
              onClick={() => setShowImageUpload(true)}
              className="mt-4 text-sm text-[#F28C38] hover:text-[#E67A26] flex items-center"
            >
              <Upload className="w-4 h-4 mr-1" />
              Add Team Photo
            </button>
          )}
        </div>
      </div>

      <AdvancedTable
        data={players}
        columns={playerColumns}
        loading={isTeamDataLoading}
        stateKey={undefined}
        selectable={true}
        onRowClick={(player) => {
          setSelectedPlayer(player);
          setShowPlayerModal(true);
        }}
        keyExtractor={(player) => player.id}
        headerActionsNone={(
          <button
            onClick={() => setShowAddPlayerModal(true)}
            className="bg-[#F28C38] text-white px-4 py-2 rounded-lg hover:bg-[#E67A26] transition-colors flex items-center gap-2 text-sm"
          >
            Add Player
          </button>
        )}
        headerActionsSingle={() => (
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm">
            Remove Player
          </button>
        )}
        headerActionsMultiple={(selected) => (
          <div className="flex space-x-2">
            <button
              onClick={async () => {
                if (!selected?.length) return;
                await handleStatusChangeBulk(selected as any[], 'approved');
              }}
              disabled={submitting}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={async () => {
                if (!selected?.length) return;
                await handleStatusChangeBulk(selected as any[], 'rejected');
              }}
              disabled={submitting}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
        searchable={true}
        searchFields={['name', 'phone', 'firstName', 'lastName']}
        searchPlaceholder="Search players..."
        stickyHeader={true}
        compact={false}
        emptyState={{
          icon: () => <div className="w-12 h-12 bg-gray-200 rounded-full" />,
          title: "No players found",
          description: "No players have been added to this team yet."
        }}
        pagination={{
          enabled: true,
          pageSize: 10,
          pageSizeOptions: [5, 10, 20, 50]
        }}
      />

      {/* Modals */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#4A2F1D]">
                  {isEditMode ? 'Edit Player' : 'Add New Player'}
                </h2>
                <button onClick={() => {
                  setShowAddPlayerModal(false);
                  resetPlayerForm();
                }}>
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">Mobile Number *</label>
                <input
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={playerFormData.phone}
                  onChange={(e) => {
                    const phone = e.target.value.replace(/\D/g, '').slice(0, 10);
                    if (!isEditMode) {
                      handlePhoneSearch(phone);
                    } else {
                      setPlayerFormData(prev => ({ ...prev, phone }));
                    }
                  }}
                  disabled={isEditMode}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
                />
              </div>
              {playerFormData.phone.length === 10 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">First Name *</label>
                      <input 
                        type="text" 
                        value={playerFormData.firstName} 
                        onChange={(e) => setPlayerFormData(prev => ({ ...prev, firstName: e.target.value }))} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38] disabled:bg-gray-100" 
                        disabled={!isEditMode && !!foundUser}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">Last Name *</label>
                      <input 
                        type="text" 
                        value={playerFormData.lastName} 
                        onChange={(e) => setPlayerFormData(prev => ({ ...prev, lastName: e.target.value }))} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38] disabled:bg-gray-100" 
                        disabled={!isEditMode && !!foundUser}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">Date of Birth *</label>
                    <input 
                      type="date" 
                      value={playerFormData.dob} 
                      onChange={(e) => setPlayerFormData(prev => ({ ...prev, dob: e.target.value }))} 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38] disabled:bg-gray-100" 
                      disabled={!isEditMode && !!foundUser}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">
                      Position <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={playerFormData.position}
                      onChange={(e) => setPlayerFormData(prev => ({ ...prev, position: e.target.value as 'main' | 'substitute' }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
                    >
                      <option value="main" disabled={!availablePositions.main.available}>
                        Main Player {!availablePositions.main.available ? '(Full)' : ''}
                      </option>
                      <option value="substitute" disabled={!availablePositions.substitute.available}>
                        Substitute {!availablePositions.substitute.available ? '(Full)' : ''}
                      </option>
                    </select>
                    <div className="text-sm text-gray-600 mt-1">
                      Main: {availablePositions.main.count}/{availablePositions.main.max} • 
                      Substitutes: {availablePositions.substitute.count}/{availablePositions.substitute.max}
                    </div>
                  </div>

                  {playerExists && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-medium text-yellow-800">Player Already Exists</h3>
                          <p className="text-sm text-yellow-700 mt-1">
                            This player is already registered in the system. Their existing details will be used.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex space-x-4 pt-4">
                <button 
                  onClick={() => {
                    setShowAddPlayerModal(false);
                    resetPlayerForm();
                  }} 
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddPlayerVolunteer} 
                  disabled={!playerFormData.firstName || !playerFormData.lastName || !playerFormData.dob || isSubmittingAdd} 
                  className="flex-1 bg-[#F28C38] hover:bg-[#E67A26] disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                >
                  {isSubmittingAdd ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Player' : 'Add Player')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OLD MODAL - COMMENTED OUT - ONLY SHOWS DOCUMENTS
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Player Details</h3>
              <button onClick={() => setSelectedPlayer(null)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Documents</h4>
                <div className="grid grid-cols-1 gap-6">
                  <PlayerDocumentUpload
                    playerId={selectedPlayer.id}
                    playerUserId={selectedPlayer.userId || selectedPlayer.id}
                    documentType="profilePhoto"
                    label="Profile Photo"
                    currentUrl={selectedPlayer.documents.profilePhoto?.url}
                    onSuccess={async () => {
                      const { data: updatedData } = await refetchTeam();
                      if (updatedData) {
                        // Update the players state with fresh data
                        const mappedPlayers = updatedData.teamPlayers?.map(player => {
                          const profileImages = player.user?.profileImages;
                          return {
                            id: player.id,
                            userId: player.user?.id,
                            name: `${player.user?.firstName || ''} ${player.user?.lastName || ''}`.trim(),
                            firstName: player.user?.firstName || '',
                            lastName: player.user?.lastName || '',
                            phone: player.user?.phone || '',
                            age: player.user?.dateOfBirth ? new Date().getFullYear() - new Date(player.user.dateOfBirth).getFullYear() : 0,
                            gender: player.user?.gender || 'M',
                            position: player.position || 'main',
                            dob: player.user?.dateOfBirth,
                            whatsappNumber: player.user?.phone,
                            village: player.village || '',
                            documents: {
                              profilePhoto: { url: profileImages?.profilePhotoPath || null, verified: false },
                              aadhaarFront: { url: profileImages?.aadhaarFrontPath || null, verified: false },
                              aadhaarBack: { url: profileImages?.aadhaarBackPath || null, verified: false },
                            },
                            verificationStatus: player.verificationStatus || 'pending',
                          };
                        }) || [];
                        setPlayers(mappedPlayers);
                        // Update selected player with fresh data
                        const updatedPlayer = mappedPlayers.find(p => p.id === selectedPlayer.id);
                        if (updatedPlayer) setSelectedPlayer(updatedPlayer);
                      }
                    }}
                    onError={(error) => showError(`Upload failed: ${error}`)}
                    variant="card"
                  />
                  <PlayerDocumentUpload
                    playerId={selectedPlayer.id}
                    playerUserId={selectedPlayer.userId || selectedPlayer.id}
                    documentType="aadhaarFront"
                    label="Aadhaar Front"
                    currentUrl={selectedPlayer.documents.aadhaarFront?.url}
                    onSuccess={async () => {
                      const { data: updatedData } = await refetchTeam();
                      if (updatedData) {
                        const mappedPlayers = updatedData.teamPlayers?.map(player => {
                          const profileImages = player.user?.profileImages;
                          return {
                            id: player.id,
                            userId: player.user?.id,
                            name: `${player.user?.firstName || ''} ${player.user?.lastName || ''}`.trim(),
                            firstName: player.user?.firstName || '',
                            lastName: player.user?.lastName || '',
                            phone: player.user?.phone || '',
                            age: player.user?.dateOfBirth ? new Date().getFullYear() - new Date(player.user.dateOfBirth).getFullYear() : 0,
                            gender: player.user?.gender || 'M',
                            position: player.position || 'main',
                            dob: player.user?.dateOfBirth,
                            whatsappNumber: player.user?.phone,
                            village: player.village || '',
                            documents: {
                              profilePhoto: { url: profileImages?.profilePhotoPath || null, verified: false },
                              aadhaarFront: { url: profileImages?.aadhaarFrontPath || null, verified: false },
                              aadhaarBack: { url: profileImages?.aadhaarBackPath || null, verified: false },
                            },
                            verificationStatus: player.verificationStatus || 'pending',
                          };
                        }) || [];
                        setPlayers(mappedPlayers);
                        const updatedPlayer = mappedPlayers.find(p => p.id === selectedPlayer.id);
                        if (updatedPlayer) setSelectedPlayer(updatedPlayer);
                      }
                    }}
                    onError={(error) => showError(`Upload failed: ${error}`)}
                    variant="card"
                  />
                  <PlayerDocumentUpload
                    playerId={selectedPlayer.id}
                    playerUserId={selectedPlayer.userId || selectedPlayer.id}
                    documentType="aadhaarBack"
                    label="Aadhaar Back"
                    currentUrl={selectedPlayer.documents.aadhaarBack?.url}
                    onSuccess={async () => {
                      const { data: updatedData } = await refetchTeam();
                      if (updatedData) {
                        const mappedPlayers = updatedData.teamPlayers?.map(player => {
                          const profileImages = player.user?.profileImages;
                          return {
                            id: player.id,
                            userId: player.user?.id,
                            name: `${player.user?.firstName || ''} ${player.user?.lastName || ''}`.trim(),
                            firstName: player.user?.firstName || '',
                            lastName: player.user?.lastName || '',
                            phone: player.user?.phone || '',
                            age: player.user?.dateOfBirth ? new Date().getFullYear() - new Date(player.user.dateOfBirth).getFullYear() : 0,
                            gender: player.user?.gender || 'M',
                            position: player.position || 'main',
                            dob: player.user?.dateOfBirth,
                            whatsappNumber: player.user?.phone,
                            village: player.village || '',
                            documents: {
                              profilePhoto: { url: profileImages?.profilePhotoPath || null, verified: false },
                              aadhaarFront: { url: profileImages?.aadhaarFrontPath || null, verified: false },
                              aadhaarBack: { url: profileImages?.aadhaarBackPath || null, verified: false },
                            },
                            verificationStatus: player.verificationStatus || 'pending',
                          };
                        }) || [];
                        setPlayers(mappedPlayers);
                        const updatedPlayer = mappedPlayers.find(p => p.id === selectedPlayer.id);
                        if (updatedPlayer) setSelectedPlayer(updatedPlayer);
                      }
                    }}
                    onError={(error) => showError(`Upload failed: ${error}`)}
                    variant="card"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* END OLD MODAL COMMENT */}

      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Team Photo</h3>
              <button onClick={() => setShowImageUpload(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <TeamPhotoUpload
              teamId={teamId}
              currentUrl={team?.teamImageUrl}
              onSuccess={async (url) => {
                uploadTeamImageMutation.mutate({ teamId, imageUrl: url });
              }}
              onError={(error) => showError(`Upload failed: ${error}`)}
              variant="card"
            />
          </div>
        </div>
      )}
      
      {/* Player Details Modal */}
      {selectedPlayer && (
        <EnhancedModal
          isOpen={showPlayerModal}
          onClose={() => {
            setShowPlayerModal(false);
            setSelectedPlayer(null);
          }}
          title="Player Details"
          subtitle={`${selectedPlayer.firstName} ${selectedPlayer.lastName} - Complete Information`}
          size="xl"
          mobileFullScreen={true}
          footer={(
            <div className="flex justify-between items-center gap-4">
              <button
                onClick={() => {
                  setShowPlayerModal(false);
                  setSelectedPlayer(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <div className="flex space-x-4">
                <button
                  onClick={() => handlePromoteCaptain(selectedPlayer)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Promote Captain
                </button>
                <button
                  onClick={() => handleEditPlayer(selectedPlayer)}
                  className="px-4 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors"
                >
                  Edit Player
                </button>
              </div>
            </div>
          )}
        >
          <div className="space-y-6">
            {/* Player Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlayer.firstName} {selectedPlayer.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlayer.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Age</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlayer.age} years</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlayer.whatsappNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedPlayer.dob ? new Date(selectedPlayer.dob).toLocaleDateString('en-IN') : 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Position</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{selectedPlayer.position}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlayer.gender === 'M' ? 'Male' : 'Female'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Verification Status</label>
                    <p className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedPlayer.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
                        selectedPlayer.verificationStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedPlayer.verificationStatus}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Village</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlayer.village || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Documents</h4>
              <div className="grid grid-cols-1 gap-6">
                <PlayerDocumentUpload
                  playerId={selectedPlayer.id}
                  playerUserId={selectedPlayer.userId || selectedPlayer.id}
                  documentType="profilePhoto"
                  label="Profile Photo"
                  currentUrl={selectedPlayer.documents.profilePhoto?.url}
                  onSuccess={async () => {
                    const { data: updatedData } = await refetchTeam();
                    if (updatedData) {
                      // Update the players state with fresh data
                      const mappedPlayers = updatedData.teamPlayers?.map(player => {
                        const profileImages = player.user?.profileImages;
                        return {
                          id: player.id,
                          userId: player.user?.id,
                          name: `${player.user?.firstName || ''} ${player.user?.lastName || ''}`.trim(),
                          firstName: player.user?.firstName || '',
                          lastName: player.user?.lastName || '',
                          phone: player.user?.phone || '',
                          age: player.user?.age || 0,
                          gender: player.user?.gender || '',
                          position: player.position || '',
                          dob: player.user?.dateOfBirth?.toISOString(),
                          whatsappNumber: player.whatsappNumber,
                          village: player.village,
                          district: player.district,
                          panchayat: player.panchayat,
                          documents: {
                            profilePhoto: {
                              url: profileImages?.profilePhotoPath || null,
                              verified: false,
                              storagePath: profileImages?.profilePhotoPath || null,
                              uploadedBy: null,
                              uploadedAt: null
                            },
                            aadhaarFront: {
                              url: profileImages?.aadhaarFrontPath || null,
                              verified: false,
                              storagePath: profileImages?.aadhaarFrontPath || null,
                              uploadedBy: null,
                              uploadedAt: null
                            },
                            aadhaarBack: {
                              url: profileImages?.aadhaarBackPath || null,
                              verified: false,
                              storagePath: profileImages?.aadhaarBackPath || null,
                              uploadedBy: null,
                              uploadedAt: null
                            }
                          },
                          verificationStatus: player.verificationStatus || 'pending',
                          matchDayVerificationStatus: player.matchDayVerificationStatus,
                          matchDayComments: player.matchDayComments
                        };
                      }) || [];
                      setPlayers(mappedPlayers);
                      
                      // Update selected player if it's the same one
                      const updatedSelectedPlayer = mappedPlayers.find(p => p.id === selectedPlayer.id);
                      if (updatedSelectedPlayer) {
                        setSelectedPlayer(updatedSelectedPlayer);
                      }
                    }
                  }}
                  onError={(error) => showError(`Upload failed: ${error}`)}
                  variant="card"
                />
                <PlayerDocumentUpload
                  playerId={selectedPlayer.id}
                  playerUserId={selectedPlayer.userId || selectedPlayer.id}
                  documentType="aadhaarFront"
                  label="Aadhaar Front"
                  currentUrl={selectedPlayer.documents.aadhaarFront?.url}
                  onSuccess={async () => {
                    const { data: updatedData } = await refetchTeam();
                    if (updatedData) {
                      // Update the players state with fresh data
                      const mappedPlayers = updatedData.teamPlayers?.map(player => {
                        const profileImages = player.user?.profileImages;
                        return {
                          id: player.id,
                          userId: player.user?.id,
                          name: `${player.user?.firstName || ''} ${player.user?.lastName || ''}`.trim(),
                          firstName: player.user?.firstName || '',
                          lastName: player.user?.lastName || '',
                          phone: player.user?.phone || '',
                          age: player.user?.age || 0,
                          gender: player.user?.gender || '',
                          position: player.position || '',
                          dob: player.user?.dateOfBirth?.toISOString(),
                          whatsappNumber: player.whatsappNumber,
                          village: player.village,
                          district: player.district,
                          panchayat: player.panchayat,
                          documents: {
                            profilePhoto: {
                              url: profileImages?.profilePhotoPath || null,
                              verified: false,
                              storagePath: profileImages?.profilePhotoPath || null,
                              uploadedBy: null,
                              uploadedAt: null
                            },
                            aadhaarFront: {
                              url: profileImages?.aadhaarFrontPath || null,
                              verified: false,
                              storagePath: profileImages?.aadhaarFrontPath || null,
                              uploadedBy: null,
                              uploadedAt: null
                            },
                            aadhaarBack: {
                              url: profileImages?.aadhaarBackPath || null,
                              verified: false,
                              storagePath: profileImages?.aadhaarBackPath || null,
                              uploadedBy: null,
                              uploadedAt: null
                            }
                          },
                          verificationStatus: player.verificationStatus || 'pending',
                          matchDayVerificationStatus: player.matchDayVerificationStatus,
                          matchDayComments: player.matchDayComments
                        };
                      }) || [];
                      setPlayers(mappedPlayers);
                      
                      // Update selected player if it's the same one
                      const updatedSelectedPlayer = mappedPlayers.find(p => p.id === selectedPlayer.id);
                      if (updatedSelectedPlayer) {
                        setSelectedPlayer(updatedSelectedPlayer);
                      }
                    }
                  }}
                  onError={(error) => showError(`Upload failed: ${error}`)}
                  variant="card"
                />
                <PlayerDocumentUpload
                  playerId={selectedPlayer.id}
                  playerUserId={selectedPlayer.userId || selectedPlayer.id}
                  documentType="aadhaarBack"
                  label="Aadhaar Back"
                  currentUrl={selectedPlayer.documents.aadhaarBack?.url}
                  onSuccess={async () => {
                    const { data: updatedData } = await refetchTeam();
                    if (updatedData) {
                      // Update the players state with fresh data
                      const mappedPlayers = updatedData.teamPlayers?.map(player => {
                        const profileImages = player.user?.profileImages;
                        return {
                          id: player.id,
                          userId: player.user?.id,
                          name: `${player.user?.firstName || ''} ${player.user?.lastName || ''}`.trim(),
                          firstName: player.user?.firstName || '',
                          lastName: player.user?.lastName || '',
                          phone: player.user?.phone || '',
                          age: player.user?.age || 0,
                          gender: player.user?.gender || '',
                          position: player.position || '',
                          dob: player.user?.dateOfBirth?.toISOString(),
                          whatsappNumber: player.whatsappNumber,
                          village: player.village,
                          district: player.district,
                          panchayat: player.panchayat,
                          documents: {
                            profilePhoto: {
                              url: profileImages?.profilePhotoPath || null,
                              verified: false,
                              storagePath: profileImages?.profilePhotoPath || null,
                              uploadedBy: null,
                              uploadedAt: null
                            },
                            aadhaarFront: {
                              url: profileImages?.aadhaarFrontPath || null,
                              verified: false,
                              storagePath: profileImages?.aadhaarFrontPath || null,
                              uploadedBy: null,
                              uploadedAt: null
                            },
                            aadhaarBack: {
                              url: profileImages?.aadhaarBackPath || null,
                              verified: false,
                              storagePath: profileImages?.aadhaarBackPath || null,
                              uploadedBy: null,
                              uploadedAt: null
                            }
                          },
                          verificationStatus: player.verificationStatus || 'pending',
                          matchDayVerificationStatus: player.matchDayVerificationStatus,
                          matchDayComments: player.matchDayComments
                        };
                      }) || [];
                      setPlayers(mappedPlayers);
                      
                      // Update selected player if it's the same one
                      const updatedSelectedPlayer = mappedPlayers.find(p => p.id === selectedPlayer.id);
                      if (updatedSelectedPlayer) {
                        setSelectedPlayer(updatedSelectedPlayer);
                      }
                    }
                  }}
                  onError={(error) => showError(`Upload failed: ${error}`)}
                  variant="card"
                />
              </div>
            </div>
          </div>
        </EnhancedModal>
      )}
      
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={hideAlert}
        message={alertState.message}
        type={alertState.type}
        title={alertState.title}
      />
    </div>
  );
}
