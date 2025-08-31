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
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [playerExists, setPlayerExists] = useState(false);
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
    onSuccess: () => {
      refetchTeam();
      setShowImageUpload(false);
      showSuccess('Team photo uploaded successfully!');
    },
    onError: (error) => {
      showError(`Error: ${error.message}`);
    }
  });

  useEffect(() => {
    if (teamData) {
      setTeam(teamData.team);
      setPlayers(teamData.players || []);
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
    } finally {
      setIsSubmittingAdd(false);
    }
  };

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading team verification data...</p>
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
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button 
            onClick={() => router.back()} 
            className="text-[#F28C38] hover:text-[#E67A26] flex items-center mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Teams
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Team {team?.name}</h1>
      </div>

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
                <h2 className="text-xl font-bold text-[#4A2F1D]">Add New Player</h2>
                <button onClick={() => setShowAddPlayerModal(false)}>
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
                    setPlayerFormData(prev => ({ ...prev, phone }));
                  }}
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">Last Name *</label>
                      <input 
                        type="text" 
                        value={playerFormData.lastName} 
                        onChange={(e) => setPlayerFormData(prev => ({ ...prev, lastName: e.target.value }))} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">Date of Birth *</label>
                    <input 
                      type="date" 
                      value={playerFormData.dob} 
                      onChange={(e) => setPlayerFormData(prev => ({ ...prev, dob: e.target.value }))} 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]" 
                    />
                  </div>
                </div>
              )}
              <div className="flex space-x-4 pt-4">
                <button 
                  onClick={() => setShowAddPlayerModal(false)} 
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddPlayerVolunteer} 
                  disabled={!playerFormData.firstName || !playerFormData.lastName || !playerFormData.dob || isSubmittingAdd} 
                  className="flex-1 bg-[#F28C38] hover:bg-[#E67A26] disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                >
                  {isSubmittingAdd ? 'Adding...' : 'Add Player'}
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
                    onSuccess={() => refetchTeam()}
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
