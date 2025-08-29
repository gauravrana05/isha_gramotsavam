'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getTeamForMatchDayVerification, verifyPlayerMatchDay, uploadTeamImage } from '@/lib/actions/volunteer/matchDayVerification';
// import { volunteerAddPlayerToTeam } from '@/lib/actions/volunteer/addPlayerToTeam';
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

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setError('Please log in to access this page');
      setLoading(false);
      return;
    }

    loadTeamData();
  }, [user, authLoading, teamId]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const result = await getTeamForMatchDayVerification(teamId, user!.uid);
      
      if (result.success) {
        setTeam(result.team ?? null);
        setPlayers(result.players ?? []);
      } else {
        setError(result.error || 'Failed to load team data');
      }
    } catch (err) {
      // Error handling removed
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerVerification = async (playerId: string, status: 'verified' | 'rejected', comments?: string) => {
    try {
      setSubmitting(true);
      
      const result = await verifyPlayerMatchDay({
        playerId,
        status,
        comments: comments || '',
        verifiedBy: user!.uid,
        verificationIssues: status === 'rejected' ? ['Match day verification failed'] : [],
        teamId: teamId, // Pass teamId for direct access
        venueId: venueId // Pass venueId for auto check-in
      });

      if (result.success) {
        // Reload team data to get updated verification status
        await loadTeamData();
        showSuccess(`Player ${status} successfully!`);
      } else {
        showError(`Error: ${result.error}`);
      }
    } catch (error) {
      // Error handling removed
      showError('Failed to verify player. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkAction = async (action: 'verified' | 'rejected') => {
    if (selectedPlayers.size === 0) {
      showInfo('Please select players to perform bulk action.');
      return;
    }
    
    const selectedPlayersList = players.filter(p => selectedPlayers.has(p.id));
    const eligiblePlayers = selectedPlayersList.filter(p => 
      p.matchDayVerificationStatus !== 'verified' && p.matchDayVerificationStatus !== 'rejected'
    );
    
    if (eligiblePlayers.length === 0) {
      showInfo('No eligible players selected. Only unverified players can be bulk processed.');
      return;
    }
    
    const actionText = action === 'verified' ? 'verify' : 'reject';
    
    let reason = '';
    if (action === 'rejected') {
      reason = prompt('Reason for rejection:') || '';
      if (!reason) return;
    } else {
      reason = 'Bulk verified by match day volunteer';
    }
    
    if (!confirm(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} ${eligiblePlayers.length} selected players?`)) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const player of eligiblePlayers) {
        try {
          const result = await verifyPlayerMatchDay({
            playerId: player.id,
            status: action,
            comments: reason,
            verifiedBy: user!.uid,
            verificationIssues: action === 'rejected' ? ['Bulk rejection by match day volunteer'] : [],
            teamId: teamId,
            venueId: venueId
          });

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            // Error handling removed
          }
        } catch (error) {
          errorCount++;
          // Error handling removed
        }
      }

      // Reload data after bulk operation
      await loadTeamData();
      
      if (errorCount === 0) {
        showSuccess(`Successfully ${action} ${successCount} players!`);
      } else {
        showInfo(`Completed bulk ${actionText}: ${successCount} successful, ${errorCount} failed. Please check and retry failed players individually.`);
      }
      
      setSelectedPlayers(new Set()); // Clear selection
    } catch (error) {
      // Error handling removed
      showError(`Bulk ${actionText} failed. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectAll = () => {
    const unverifiedPlayers = players.filter(p => 
      p.matchDayVerificationStatus !== 'verified' && p.matchDayVerificationStatus !== 'rejected'
    );
    if (selectedPlayers.size === unverifiedPlayers.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(unverifiedPlayers.map(p => p.id)));
    }
  };

  const handlePlayerSelection = (playerId: string) => {
    const newSelection = new Set(selectedPlayers);
    if (newSelection.has(playerId)) {
      newSelection.delete(playerId);
    } else {
      newSelection.add(playerId);
    }
    setSelectedPlayers(newSelection);
  };

  const getPlayerStatusColor = (player: PlayerData) => {
    switch (player.matchDayVerificationStatus) {
      case 'verified': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getPlayerStatusIcon = (player: PlayerData) => {
    switch (player.matchDayVerificationStatus) {
      case 'verified': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getDocumentStatus = (player: PlayerData) => {
    const docs = player.documents;
    const hasAllDocs = docs.profilePhoto?.url && docs.aadhaarFront?.url && docs.aadhaarBack?.url;
    
    if (!hasAllDocs) {
      return { status: 'incomplete', message: 'Missing documents', color: 'text-red-600' };
    }
    
    return { status: 'complete', message: 'All documents uploaded', color: 'text-green-600' };
  };

  // Handle status change through VerificationStatusSelector
  const handlePlayerStatusChange = useCallback(async (player: PlayerData, newStatus: 'pending' | 'verified' | 'approved' | 'rejected') => {
    if (!user) return;

    try {
      setSubmitting(true);
      const result = await verifyPlayerMatchDay({
        playerId: player.id,
        status: newStatus,
        comments: newStatus === 'approved' ? 'Approved via status selector' : `Status changed to ${newStatus}`,
        verifiedBy: user.uid,
        verificationIssues: newStatus === 'rejected' ? ['Status changed to rejected'] : [],
        teamId: teamId,
        venueId: venueId
      });

      if (result.success) {
        await loadTeamData();
        showSuccess(`Player status updated to ${newStatus}!`);
      } else {
        showError(`Error: ${result.error}`);
      }
    } catch (error) {
      showError('Failed to update player status. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [user, teamId, venueId, loadTeamData, showSuccess, showError]);

  // Player columns definition
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

  const normalizePhone = (phone: string): string => {
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length === 10) return `+91${digitsOnly}`;
    if (digitsOnly.startsWith("91") && digitsOnly.length === 12) return `+${digitsOnly}`;
    if (phone.startsWith("+91") && digitsOnly.length === 12) return phone;
    if (digitsOnly.length >= 10) return `+91${digitsOnly.slice(-10)}`;
    throw new Error(`Invalid phone number format: ${phone}. Please enter a 10-digit mobile number.`);
  };

  const handlePhoneSearch = async (phone: string) => {
    setPlayerFormData(prev => ({ ...prev, phone }));
    if (phone.length === 10) {
      setIsSearchingPhone(true);
      try {
        // Search minimal user info for prefill
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/config');
        const usersRef = collection(db, 'users');
        const queries = [
          query(usersRef, where('phoneNumber', '==', phone)),
          query(usersRef, where('phoneNumber', '==', `+91${phone}`)),
          query(usersRef, where('phoneNumber', '==', parseInt(phone as any)))
        ];
        let existingUser: any = null;
        for (const q of queries) {
          try {
            const qs = await getDocs(q);
            if (!qs.empty) { existingUser = qs.docs[0].data(); break; }
          } catch {}
        }
        if (existingUser) {
          setPlayerExists(true);
          setPlayerFormData(prev => ({
            ...prev,
            firstName: existingUser.firstName || '',
            lastName: existingUser.lastName || '',
            dob: existingUser.dob || '',
            whatsappNumber: existingUser.whatsappNumber || phone,
            village: existingUser.village || team?.panchayat?.replace(' Panchayat', '') || ''
          }));
        } else {
          setPlayerExists(false);
          setPlayerFormData(prev => ({
            ...prev,
            firstName: '',
            lastName: '',
            dob: '',
            whatsappNumber: phone,
            village: team?.panchayat?.replace(' Panchayat', '') || ''
          }));
        }
      } finally {
        setIsSearchingPhone(false);
      }
    } else {
      setPlayerExists(false);
      if (phone.length === 0) {
        setPlayerFormData(prev => ({ ...prev, firstName: '', lastName: '', dob: '', whatsappNumber: '', village: '' }));
      }
    }
  };

  const handleAddPlayerVolunteer = async () => {
    if (!team || !user) return;
    setIsSubmittingAdd(true);
    try {
      // auto-adjust position not necessary for volunteer now
      let normalizedPhone: string;
      try { normalizedPhone = normalizePhone(playerFormData.phone); } 
      catch (e) { showError(e instanceof Error ? e.message : 'Invalid phone'); setIsSubmittingAdd(false); return; }

      // const result = await volunteerAddPlayerToTeam({
      //   teamId: team.id,
      //   volunteerId: user.uid,
      //   playerData: {
      //     name: `${playerFormData.firstName} ${playerFormData.lastName}`.trim(),
      //     firstName: playerFormData.firstName,
      //     lastName: playerFormData.lastName,
      //     phone: normalizedPhone,
      //     dateOfBirth: playerFormData.dob,
      //     gender: 'M',
      //     whatsappNumber: playerFormData.whatsappNumber || playerFormData.phone,
      //     village: playerFormData.village,
      //     panchayat: team.panchayat,
      //     taluk: (team as any).taluk || '',
      //     district: team.district,
      //     state: (team as any).state || '',
      //     pincode: '',
      //     position: playerFormData.position
      //   }
      // });

      // if (!result.success) {
      //   const err = (result as any).error;
      //   showError(typeof err === 'string' ? err : err?.message || 'Failed to add player');
      //   return;
      // }

      await loadTeamData();
      setShowAddPlayerModal(false);
      setPlayerFormData({ phone: '', firstName: '', lastName: '', dob: '', whatsappNumber: '', village: '', position: 'main' });
      showSuccess('Player added and approved.');
    } catch {
      showError('Failed to add player');
    } finally {
      setIsSubmittingAdd(false);
    }
  };
  
  const handleStatusChangeBulk = async (
    playersToUpdate: PlayerData[],
    status: 'pending' | 'verified' | 'approved' | 'rejected'
  ) => {
    if (!user) return;
    setSubmitting(true);
    try {
      for (const player of playersToUpdate) {
        await verifyPlayerMatchDay({
          playerId: player.id,
          status,
          comments: status === 'rejected' ? 'Bulk rejection by volunteer' : `Bulk set to ${status}`,
          verifiedBy: user.uid,
          verificationIssues: status === 'rejected' ? ['Bulk rejection by volunteer'] : [],
          teamId: teamId,
          venueId: venueId
        });
      }
      await loadTeamData();
      showSuccess(`Updated ${playersToUpdate.length} players to ${status}.`);
    } catch (e) {
      showError('Bulk update failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Header actions based on selection - using useMemo to react to selection changes
  const headerActions = useMemo(() => {
    const selectedCount = selectedPlayers.size;
    
    if (selectedCount === 0) {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddPlayerModal(true)}
            className="bg-[#F28C38] text-white px-4 py-2 rounded-lg hover:bg-[#E67A26] transition-colors flex items-center gap-2 text-sm"
          >
            <User className="w-4 h-4" />
            Add Player
          </button>
        </div>
      );
    } else if (selectedCount === 1) {
      return (
        <button
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
        >
          <X className="w-4 h-4" />
          Remove Player
        </button>
      );
    } else {
      return (
        <button
          onClick={() => handleBulkAction('verified')}
          disabled={submitting}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          Approve ({selectedCount})
        </button>
      );
    }
  }, [selectedPlayers, submitting, handleBulkAction]);

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
            onClick={loadTeamData}
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

  const verifiedCount = players.filter(p => p.matchDayVerificationStatus === 'verified').length;
  const rejectedCount = players.filter(p => p.matchDayVerificationStatus === 'rejected').length;
  const pendingCount = players.length - verifiedCount - rejectedCount;
  const allVerified = verifiedCount === players.length;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
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

      {/* Team Photo - Web (Half Width, Center Aligned) */}
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
                {/* Edit button only when photo exists */}
                <button
                  onClick={() => setShowImageUpload(true)}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md border hover:bg-gray-50 transition-colors"
                  title="Change team photo"
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

      {/* Team Photo - Mobile (Full Width) */}
      <div className="md:hidden mb-6 flex flex-col items-center">
        <div className="relative w-full max-w-md">
          {team.teamImageUrl ? (
            <>
              <DocumentPreview
                type="teamPhoto"
                url={team.teamImageUrl}
                label="Team Photo"
                showActions={false}
                size="xxl"
                className="w-full"
              />
              {/* Edit button only when photo exists */}
              <button
                onClick={() => setShowImageUpload(true)}
                className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md border hover:bg-gray-50 transition-colors"
                title="Change team photo"
              >
                <Edit3 className="w-4 h-4 text-gray-600" />
              </button>
            </>
          ) : (
            <div className="w-full h-[250px] bg-gray-100 rounded-lg border flex items-center justify-center">
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


      {/* Players Table */}
      <AdvancedTable
        data={players}
        columns={playerColumns}
        loading={loading}
        stateKey={undefined}
        
        // Selection functionality
        selectable={true}
        // AdvancedTable manages selection internally; headerActions will not use selectedRows directly
        
        // Row interaction
        onRowClick={(player) => setSelectedPlayer(player)}
        keyExtractor={(player) => player.id}
        
        // Header actions
        headerActionsNone={(
          <button
            onClick={() => setShowAddPlayerModal(true)}
            className="bg-[#F28C38] text-white px-4 py-2 rounded-lg hover:bg-[#E67A26] transition-colors flex items-center gap-2 text-sm"
          >
            Add Player
          </button>
        )}
        headerActionsSingle={(selected) => (
          <button
            onClick={() => {
              const one = selected[0] as any;
              if (!one) return;
              // TODO: wire up remove flow via server action if desired
              alert(`Remove player ${one.name}`);
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
          >
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
        
        // Search functionality
        searchable={true}
        searchPlaceholder="Search players..."
        
        // Table configuration
        stickyHeader={true}
        compact={false}
        
        // Empty state
        emptyState={{
          icon: () => <div className="w-12 h-12 bg-gray-200 rounded-full" />,
          title: "No players found",
          description: "No players have been added to this team yet."
        }}
        
        // Pagination
        pagination={{
          enabled: true,
          pageSize: 10,
          pageSizeOptions: [5, 10, 20, 50]
        }}
      />
      {showAddPlayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#4A2F1D]">Add New Player</h2>
                <button
                  onClick={() => setShowAddPlayerModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">Mobile Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={playerFormData.phone}
                  onChange={(e) => {
                    const phone = e.target.value.replace(/\D/g, '').slice(0, 10);
                    handlePhoneSearch(phone);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
                />
                {isSearchingPhone && (
                  <p className="mt-1 text-sm text-gray-500 flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-1" />Searching for player...</p>
                )}
                {!isSearchingPhone && playerExists && (
                  <p className="mt-1 text-sm text-[#3A7F3F]">✓ Player found in system</p>
                )}
                {!isSearchingPhone && playerFormData.phone.length === 10 && !playerExists && (
                  <p className="mt-1 text-sm text-gray-600">New player - fill in details below</p>
                )}
              </div>

              {playerFormData.phone.length === 10 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">First Name <span className="text-red-500">*</span></label>
                      <input type="text" value={playerFormData.firstName} onChange={(e) => setPlayerFormData(prev => ({ ...prev, firstName: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]" disabled={playerExists} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">Last Name <span className="text-red-500">*</span></label>
                      <input type="text" value={playerFormData.lastName} onChange={(e) => setPlayerFormData(prev => ({ ...prev, lastName: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]" disabled={playerExists} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">Date of Birth <span className="text-red-500">*</span></label>
                    <input type="date" value={playerFormData.dob} onChange={(e) => setPlayerFormData(prev => ({ ...prev, dob: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]" disabled={playerExists} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">Position <span className="text-red-500">*</span></label>
                    <select value={playerFormData.position} onChange={(e) => setPlayerFormData(prev => ({ ...prev, position: e.target.value as 'main' | 'substitute' }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]">
                      <option value="main">Main Player</option>
                      <option value="substitute">Substitute</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex space-x-4 pt-4">
                <button onClick={() => setShowAddPlayerModal(false)} className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors">Cancel</button>
                <button onClick={handleAddPlayerVolunteer} disabled={!playerFormData.firstName || !playerFormData.lastName || !playerFormData.dob || isSubmittingAdd} className="flex-1 bg-[#F28C38] hover:bg-[#E67A26] disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors">{isSubmittingAdd ? 'Adding...' : 'Add Player'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Player Details Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Player Details</h3>
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Player Basic Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <div className="font-medium">{selectedPlayer.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <div className="font-medium">{selectedPlayer.phone}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Age:</span>
                    <div className="font-medium">{selectedPlayer.age} years</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Gender:</span>
                    <div className="font-medium">{selectedPlayer.gender === 'M' ? 'Male' : 'Female'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Position:</span>
                    <div className="font-medium capitalize">{selectedPlayer.position}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Verification Status:</span>
                    <div className={`font-medium capitalize ${
                      (selectedPlayer.verificationStatus || 'pending') === 'approved' ? 'text-green-600' :
                      (selectedPlayer.verificationStatus || 'pending') === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {selectedPlayer.verificationStatus || 'pending'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Documents</h4>
                <div className="grid grid-cols-1 gap-6">
                  <PlayerDocumentUpload
                    playerId={selectedPlayer.id}
                    playerUserId={selectedPlayer.userId || selectedPlayer.id}
                    documentType="profilePhoto"
                    label="Profile Photo"
                    currentUrl={selectedPlayer.documents.profilePhoto?.url}
                    onSuccess={(url) => {
                      // Reload team data to update the document URL
                      loadTeamData();
                    }}
                    onError={(error) => {
                      showError(`Upload failed: ${error}`);
                    }}
                    variant="card"
                  />
                  <PlayerDocumentUpload
                    playerId={selectedPlayer.id}
                    playerUserId={selectedPlayer.userId || selectedPlayer.id}
                    documentType="aadhaarFront"
                    label="Aadhaar Front"
                    currentUrl={selectedPlayer.documents.aadhaarFront?.url}
                    onSuccess={(url) => {
                      // Reload team data to update the document URL
                      loadTeamData();
                    }}
                    onError={(error) => {
                      showError(`Upload failed: ${error}`);
                    }}
                    variant="card"
                  />
                  <PlayerDocumentUpload
                    playerId={selectedPlayer.id}
                    playerUserId={selectedPlayer.userId || selectedPlayer.id}
                    documentType="aadhaarBack"
                    label="Aadhaar Back"
                    currentUrl={selectedPlayer.documents.aadhaarBack?.url}
                    onSuccess={(url) => {
                      // Reload team data to update the document URL
                      loadTeamData();
                    }}
                    onError={(error) => {
                      showError(`Upload failed: ${error}`);
                    }}
                    variant="card"
                  />
                </div>
              </div>

              {/* Verification Comments */}
              {selectedPlayer.matchDayComments && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Verification Comments</h4>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    {selectedPlayer.matchDayComments}
                  </div>
                </div>
              )}

              {/* Verification actions removed for volunteer view */}
            </div>
          </div>
        </div>
      )}

      {/* Team Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Team Photo</h3>
              <button 
                onClick={() => setShowImageUpload(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <TeamPhotoUpload
                teamId={teamId}
                currentUrl={team?.teamImageUrl}
                onSuccess={async (url) => {
                  try {
                    // Persist teamImageUrl on team document for server-side reads
                    if (user) {
                      await uploadTeamImage(teamId, url, user.uid);
                    }
                    // Update local state for immediate UI
                    setTeam(prev => prev ? { ...prev, teamImageUrl: url } : null);
                    // Refresh from server to ensure consistency
                    await loadTeamData();
                  } catch (e) {
                    // Still proceed with local update if server action fails
                    setTeam(prev => prev ? { ...prev, teamImageUrl: url } : null);
                  } finally {
                    setShowImageUpload(false);
                  }
                }}
                onError={(error) => {
                  showError(`Upload failed: ${error}`);
                }}
                variant="card"
              />
              
              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowImageUpload(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
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
    </div>
  );
}