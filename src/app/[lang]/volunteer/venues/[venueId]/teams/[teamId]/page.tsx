'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
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
  phone: string;
  age: number;
  gender: string;
  position: string;
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
  const params = useParams();
  const { venueId, teamId } = params as { venueId: string; teamId: string; lang: string };
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [team, setTeam] = useState<TeamData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
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
  const { data: teamData, refetch: refetchTeam } = api.volunteers.venue.getTeamForVerification.useQuery(
    { teamId },
    { enabled: !!user && !!teamId }
  );

  const verifyPlayerMutation = api.volunteers.venue.verifyPlayer.useMutation({
    onSuccess: () => {
      refetchTeam();
      showSuccess('Player verification updated successfully!');
    },
    onError: (error) => {
      showError(`Error: ${error.message}`);
    }
  });

  const addPlayerMutation = api.volunteers.venue.addPlayer.useMutation({
    onSuccess: () => {
      refetchTeam();
      setShowAddPlayerModal(false);
      setPlayerFormData({ phone: '', firstName: '', lastName: '', dob: '', whatsappNumber: '', village: '', position: 'main' });
      showSuccess('Player added successfully!');
    },
    onError: (error) => {
      showError(`Error: ${error.message}`);
    }
  });

  const uploadTeamImageMutation = api.volunteers.venue.uploadTeamImage.useMutation({
    onSuccess: async () => {
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

  const removePlayerMutation = api.volunteers.venue.removePlayer.useMutation({
    onSuccess: () => {
      refetchTeam();
      showSuccess('Player removed successfully!');
    },
    onError: (error) => {
      showError(`Error: ${error.message}`);
    }
  });

  const updatePlayerMutation = api.volunteers.venue.updatePlayer.useMutation({
    onSuccess: () => {
      refetchTeam();
      setShowAddPlayerModal(false);
      setPlayerFormData({ phone: '', firstName: '', lastName: '', dob: '', whatsappNumber: '', village: '', position: 'main' });
      setIsEditMode(false);
      setEditingPlayerId(null);
      showSuccess('Player updated successfully!');
    },
    onError: (error) => {
      showError(`Error: ${error.message}`);
    }
  });

  useEffect(() => {
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
          village: player.village || '',
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

      setTeam(mappedTeam);
      setPlayers(mappedPlayers);
      setLoading(false);
    }
  }, [teamData]);

  const handlePlayerVerification = async (playerId: string, status: 'verified' | 'rejected', comments?: string) => {
    verifyPlayerMutation.mutate({
      playerId,
      status,
      comments: comments || '',
      teamId,
      venueId
    });
  };

  const handlePlayerStatusChange = useCallback(async (player: PlayerData, newStatus: 'pending' | 'verified' | 'approved' | 'rejected') => {
    if (!user) return;
    verifyPlayerMutation.mutate({
      playerId: player.id,
      status: newStatus,
      comments: `Status changed to ${newStatus}`,
      teamId,
      venueId
    });
  }, [user, teamId, venueId, verifyPlayerMutation]);

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
          dateOfBirth: new Date(playerFormData.dob),
          gender: 'M',
          village: playerFormData.village,
        });
      } else {
        addPlayerMutation.mutate({
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
    setShowAddPlayerModal(true);
  };

  const handleRemovePlayer = (player: PlayerData) => {
    if (confirm(`Are you sure you want to remove ${player.name} from the team?`)) {
      removePlayerMutation.mutate({
        playerId: player.id,
        teamId: teamId,
        venueId
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

  // Phone search functionality
  const { data: searchedUser } = api.users.findByPhone.useQuery(
    { phone: searchPhone },
    { 
      enabled: !!searchPhone && searchPhone.length === 13, // +91 + 10 digits
      onSuccess: (data) => {
        setFoundUser(data);
        setIsSearchingPhone(false);
        if (data) {
          setPlayerFormData(prev => ({
            ...prev,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            dob: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
            whatsappNumber: data.phone?.replace('+91', '') || ''
          }));
        }
      },
      onError: () => {
        setFoundUser(null);
        setIsSearchingPhone(false);
      }
    }
  );

  const handlePhoneSearch = (phone: string) => {
    setPlayerFormData(prev => ({ ...prev, phone }));
    
    if (phone.length === 10) {
      setIsSearchingPhone(true);
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
    if (foundUser && playerFormData.phone.length === 10) {
      setPlayerFormData(prev => ({
        ...prev,
        firstName: foundUser.firstName || prev.firstName,
        lastName: foundUser.lastName || prev.lastName,
        dob: foundUser.dateOfBirth ? new Date(foundUser.dateOfBirth).toISOString().split('T')[0] : prev.dob,
        whatsappNumber: foundUser.phone?.replace('+91', '') || prev.whatsappNumber
      }));
    }
  }, [foundUser, playerFormData.phone]);

  const handleStatusChangeBulk = async (playersToUpdate: PlayerData[], status: 'pending' | 'verified' | 'approved' | 'rejected') => {
    if (!user) return;
    setSubmitting(true);
    
    try {
      for (const player of playersToUpdate) {
        await verifyPlayerMutation.mutateAsync({
          playerId: player.id,
          status,
          comments: `Bulk set to ${status}`,
          teamId,
          venueId
        });
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
      key: 'player',
      header: 'Player',
      render: (_value, player) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{player.name}</div>
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
    }
  ], [handlePlayerStatusChange, submitting]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C38]"></div>
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
            onClick={() => refetchTeam()}
            className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Team Not Found</h1>
          <p className="mt-2 text-gray-600">The requested team could not be found.</p>
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
        loading={loading}
        stateKey={undefined}
        selectable={true}
        onRowClick={(player) => {
          // Open player details modal (same as admin/users)
          setSelectedPlayer(player);
          setShowPlayerModal(true);
        }}
        onRowClick={(player) => setSelectedPlayer(player)}
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
        )}
        searchable={true}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38] focus:border-transparent disabled:bg-gray-100"
                />
                {!isEditMode && isSearchingPhone && (
                  <p className="mt-1 text-sm text-gray-500 flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    Searching for player...
                  </p>
                )}
                {!isEditMode && !isSearchingPhone && foundUser && (
                  <p className="mt-1 text-sm text-[#3A7F3F]">✓ Player found in system</p>
                )}
                {!isEditMode && !isSearchingPhone && playerFormData.phone.length === 10 && !foundUser && (
                  <p className="mt-1 text-sm text-gray-600">New player - fill in details below</p>
                )}
                {isEditMode && (
                  <p className="mt-1 text-sm text-gray-500">Phone number cannot be changed in edit mode</p>
                )}
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
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setShowPlayerModal(false);
                  setSelectedPlayer(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleEditPlayer(selectedPlayer)}
                  className="px-4 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors"
                >
                  Edit Player
                </button>
                <button
                  onClick={() => handleRemovePlayer(selectedPlayer)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Remove Player
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
