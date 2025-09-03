'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import TeamPhotoUpload from '@/components/teams/TeamPhotoUpload';
import DocumentPreview from '@/components/documents/DocumentPreview';
import PlayerDocumentUpload from '@/components/players/PlayerDocumentUpload';
import { Button } from '@/components/ui/Button';
import { AlertModal } from '@/components/ui/Modal';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
import { useAlert } from '@/hooks/useAlert';
import { 
  User, 
  Camera,
  Upload,
  ArrowLeft,
  Edit3,
  X,
  CheckCircle
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
}

export default function CaptainTeamPage() {
  const params = useParams();
  const { teamId, lang } = params as { teamId: string; lang: string };
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [team, setTeam] = useState<TeamData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [playerFormData, setPlayerFormData] = useState({
    phone: '',
    firstName: '',
    lastName: '',
    dob: '',
    whatsappNumber: '',
    village: '',
    position: 'main' as 'main' | 'substitute'
  });
  const { alertState, showError, showSuccess, hideAlert } = useAlert();

  // tRPC queries and mutations
  const { data: teamData, refetch: refetchTeam } = api.teams.management.getMyTeam.useQuery();
  const { data: teamPlayers, refetch: refetchPlayers } = api.teams.players.getTeamPlayers.useQuery(
    { teamId: teamId },
    { enabled: !!teamId }
  );

  const addPlayerMutation = api.teams.players.addPlayer.useMutation({
    onSuccess: () => {
      refetchTeam();
      refetchPlayers();
      setShowAddPlayerModal(false);
      setPlayerFormData({ phone: '', firstName: '', lastName: '', dob: '', whatsappNumber: '', village: '', position: 'main' });
      showSuccess('Player added successfully!');
    },
    onError: (error) => {
      showError(`Error: ${error.message}`);
    }
  });

  const uploadTeamImageMutation = api.teams.management.uploadTeamImage.useMutation({
    onSuccess: () => {
      refetchTeam();
      setShowImageUpload(false);
      showSuccess('Team photo uploaded successfully!');
    },
    onError: (error) => {
      showError(`Error: ${error.message}`);
    }
  });

  const submitTeamMutation = api.teams.verification.submitForVerification.useMutation({
    onSuccess: () => {
      refetchTeam();
      showSuccess('Team submitted successfully!');
    },
    onError: (error) => {
      showError(`Error: ${error.message}`);
    }
  });

  useEffect(() => {
    if (teamData && teamPlayers) {
      // Convert team data to expected format
      const formattedTeam: TeamData = {
        id: teamData.id,
        name: teamData.name,
        sportName: teamData.sport?.name || 'Unknown Sport',
        captainProfile: {
          name: `${teamData.captainUser?.firstName || ''} ${teamData.captainUser?.lastName || ''}`.trim(),
          phone: teamData.captainUser?.phone || ''
        },
        panchayat: teamData.panchayat || '',
        district: teamData.district || '',
        currentPlayers: teamData.currentPlayers || 0,
        maxPlayers: teamData.sport?.maxPlayers || 6,
        status: teamData.status || 'draft',
        teamImageUrl: teamData.teamImageUrl
      };
      
      // Convert players data to expected format
      const formattedPlayers: PlayerData[] = (teamPlayers || []).map(player => ({
        id: player.id,
        userId: player.userId,
        name: `${player.firstName} ${player.lastName}`,
        phone: player.phone,
        age: player.age,
        gender: player.gender,
        position: player.position,
        documents: {
          profilePhoto: { url: null, verified: false },
          aadhaarFront: { url: null, verified: false },
          aadhaarBack: { url: null, verified: false }
        },
        verificationStatus: player.verificationStatus || 'pending'
      }));
      
      setTeam(formattedTeam);
      setPlayers(formattedPlayers);
      setLoading(false);
    }
  }, [teamData, teamPlayers]);

  const isTeamSubmitted = team?.status === 'submitted' || team?.status === 'approved';

  const handleAddPlayer = async () => {
    if (!team || !user) return;
    setIsSubmittingAdd(true);
    
    try {
      const normalizedPhone = playerFormData.phone.startsWith('+91') ? playerFormData.phone : `+91${playerFormData.phone}`;
      
      addPlayerMutation.mutate({
        teamId: team.id,
        position: playerFormData.position,
        firstName: playerFormData.firstName,
        lastName: playerFormData.lastName,
        phone: normalizedPhone,
        dateOfBirth: new Date(playerFormData.dob),
        age: new Date().getFullYear() - new Date(playerFormData.dob).getFullYear(),
        gender: 'M',
        panchayat: team.panchayat,
        taluk: '',
        district: team.district,
        state: '',
        pincode: '',
        verificationStatus: 'pending'
      });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleSubmitTeam = () => {
    if (!team) return;
    submitTeamMutation.mutate({ teamId: team.id });
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
  ], []);

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
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => router.push(`/${lang}/captain/teams`)} 
            className="text-[#F28C38] hover:text-[#E67A26] flex items-center"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Teams
          </button>
          
          {isTeamSubmitted && (
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              Team Submitted
            </div>
          )}
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
                {!isTeamSubmitted && (
                  <button
                    onClick={() => setShowImageUpload(true)}
                    className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md border hover:bg-gray-50 transition-colors"
                  >
                    <Edit3 className="w-4 h-4 text-gray-600" />
                  </button>
                )}
              </>
            ) : (
              <div className="w-[300px] h-[300px] bg-gray-100 rounded-lg border flex items-center justify-center">
                <Camera className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
          
          {!team.teamImageUrl && !isTeamSubmitted && (
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
        selectable={false}
        onRowClick={(player) => {
          setSelectedPlayer(player);
          setShowPlayerModal(true);
        }}
        keyExtractor={(player) => player.id}
        headerActionsNone={!isTeamSubmitted ? (
          <button
            onClick={() => setShowAddPlayerModal(true)}
            className="bg-[#F28C38] text-white px-4 py-2 rounded-lg hover:bg-[#E67A26] transition-colors flex items-center gap-2 text-sm"
          >
            Add Player
          </button>
        ) : undefined}
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

      {/* Submit Team Button */}
      {!isTeamSubmitted && players.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Button
            onClick={handleSubmitTeam}
            disabled={submitTeamMutation.isLoading}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
          >
            {submitTeamMutation.isLoading ? 'Submitting...' : 'Submit Team'}
          </Button>
        </div>
      )}

      {/* Add Player Modal */}
      {showAddPlayerModal && !isTeamSubmitted && (
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
                  onClick={handleAddPlayer} 
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

      {/* Team Photo Upload Modal */}
      {showImageUpload && !isTeamSubmitted && (
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
          subtitle={`${selectedPlayer.name} - Complete Information`}
          size="xl"
          mobileFullScreen={true}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlayer.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlayer.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Age</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPlayer.age} years</p>
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
                </div>
              </div>
            </div>

            {!isTeamSubmitted && (
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
            )}
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
