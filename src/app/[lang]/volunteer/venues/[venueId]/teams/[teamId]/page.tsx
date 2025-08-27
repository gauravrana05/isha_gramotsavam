'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import TeamPhotoUpload from '@/components/teams/TeamPhotoUpload';
import DocumentPreview from '@/components/documents/DocumentPreview';
import PlayerDocumentUpload from '@/components/players/PlayerDocumentUpload';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertModal } from '@/components/ui/Modal';
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
  
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const { alertState, showError, showSuccess, showInfo, hideAlert } = useAlert();

  const { data: teamData, isLoading: teamLoading, error: teamError, refetch: refetchTeamData } = api.volunteers.getTeamForMatchDay.useQuery(
    { teamId },
    {
      enabled: !authLoading && !!user && !!teamId,
    }
  );

  const verifyPlayerMutation = api.volunteers.verifyPlayerForMatchDay.useMutation({
    onSuccess: async (result) => {
      await refetchTeamData();
      if (result.teamAutoCheckedIn) {
        showSuccess(`Player verification successful! Team has been automatically checked in as all players are now approved.`);
      } else {
        showSuccess(`Player verification successful!`);
      }
    },
    onError: (error) => {
      showError(error.message || 'Failed to verify player');
    },
  });

  const verifyPlayersBulkMutation = api.volunteers.verifyPlayersForMatchDayBulk.useMutation({
    onSuccess: async (result) => {
      await refetchTeamData();
      setSelectedPlayers(new Set());
      if (result.teamAutoCheckedIn) {
        showSuccess(`Players verified successfully! Team has been automatically checked in as all players are now approved.`);
      } else {
        showSuccess(`Players verified successfully!`);
      }
    },
    onError: (error) => {
      showError(error.message || 'Failed to verify players in bulk');
    },
  });

  const team = teamData?.team || null;
  const players = teamData?.players || [];
  const loading = authLoading || teamLoading;
  const error = teamError?.message || '';

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      return;
    }
  }, [user, authLoading, teamId]);

  const handlePlayerVerification = async (playerId: string, status: 'verified' | 'rejected', comments?: string) => {
    // Update status from 'verified' to 'approved' for match day verification
    const matchDayStatus = status === 'verified' ? 'approved' : 'rejected';
    
    verifyPlayerMutation.mutate({
      playerId,
      status: matchDayStatus,
      comments: comments || '',
      teamId,
      venueId,
    });
  };

  const handleBulkAction = async (action: 'verified' | 'rejected') => {
    if (selectedPlayers.size === 0) {
      showInfo('Please select players to perform bulk action.');
      return;
    }
    
    const selectedPlayersList = players.filter(p => selectedPlayers.has(p.id));
    const eligiblePlayers = selectedPlayersList.filter(p => 
      p.matchDayVerificationStatus !== 'approved' && p.matchDayVerificationStatus !== 'rejected'
    );
    
    if (eligiblePlayers.length === 0) {
      showInfo('No eligible players selected. Only unverified players can be bulk processed.');
      return;
    }
    
    const actionText = action === 'verified' ? 'approve' : 'reject';
    
    let reason = '';
    if (action === 'rejected') {
      reason = prompt('Reason for rejection:') || '';
      if (!reason) return;
    } else {
      reason = 'Bulk approved by match day volunteer';
    }
    
    if (!confirm(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} ${eligiblePlayers.length} selected players?`)) {
      return;
    }
    
    // Update status from 'verified' to 'approved' for match day verification
    const matchDayStatus = action === 'verified' ? 'approved' : 'rejected';
    
    verifyPlayersBulkMutation.mutate({
      playerIds: eligiblePlayers.map(p => p.id),
      status: matchDayStatus,
      comments: reason,
      teamId,
      venueId,
    });
  };

  const handleSelectAll = () => {
    const unverifiedPlayers = players.filter(p => 
      p.matchDayVerificationStatus !== 'approved' && p.matchDayVerificationStatus !== 'rejected'
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
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getPlayerStatusIcon = (player: PlayerData) => {
    switch (player.matchDayVerificationStatus) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
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
            onClick={() => window.location.reload()}
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

  const approvedCount = players.filter(p => p.matchDayVerificationStatus === 'approved').length;
  const rejectedCount = players.filter(p => p.matchDayVerificationStatus === 'rejected').length;
  const pendingCount = players.length - approvedCount - rejectedCount;
  const allApproved = approvedCount === players.length;

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
        <h1 className="text-2xl font-bold text-gray-900">Team Verification</h1>
        <p className="text-gray-600 text-sm">Match day verification for team players</p>
      </div>

      {/* Team Info Card */}
      <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{team.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2 text-gray-400" />
                <div>
                  <span className="text-gray-500">Captain:</span>
                  <div className="font-medium">{team.captainProfile.name}</div>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <div className="font-medium">{team.captainProfile.phone}</div>
                </div>
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                <div>
                  <span className="text-gray-500">Location:</span>
                  <div className="font-medium">{team.panchayat}, {team.district}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="ml-6 flex flex-col items-end">
            {team.teamImageUrl ? (
              <DocumentPreview
                type="teamPhoto"
                url={team.teamImageUrl}
                label="Team Photo"
                showActions={false}
                size="lg"
              />
            ) : (
              <div className="w-[120px] h-[120px] bg-gray-100 rounded-lg border flex items-center justify-center">
                <Camera className="w-8 h-8 text-gray-400" />
              </div>
            )}
            {!team.teamImageUrl && (
              <button
                onClick={() => setShowImageUpload(true)}
                className="mt-2 text-sm text-[#F28C38] hover:text-[#E67A26] flex items-center"
              >
                <Upload className="w-4 h-4 mr-1" />
                Add Photo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Players</p>
              <p className="text-2xl font-bold text-gray-900">{players.length}</p>
            </div>
            <User className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Approved</p>
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
      </div>


      {/* Players Table - Desktop */}
      {players.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
          <p className="text-gray-600">No players have been added to this team yet.</p>
        </div>
      ) : (
        <>
          {/* Bulk Actions */}
          {players.filter(p => p.matchDayVerificationStatus !== 'approved' && p.matchDayVerificationStatus !== 'rejected').length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedPlayers.size === players.filter(p => p.matchDayVerificationStatus !== 'approved' && p.matchDayVerificationStatus !== 'rejected').length && players.filter(p => p.matchDayVerificationStatus !== 'approved' && p.matchDayVerificationStatus !== 'rejected').length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-[#F28C38] focus:ring-[#F28C38]"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Select All Unverified ({players.filter(p => p.matchDayVerificationStatus !== 'approved' && p.matchDayVerificationStatus !== 'rejected').length})
                    </span>
                  </label>
                  {selectedPlayers.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedPlayers.size} selected
                    </span>
                  )}
                </div>
                
                {selectedPlayers.size > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBulkAction('verified')}
                      disabled={verifyPlayersBulkMutation.isLoading}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleBulkAction('rejected')}
                      disabled={verifyPlayersBulkMutation.isLoading}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-lg border overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedPlayers.size === players.filter(p => p.matchDayVerificationStatus !== 'approved' && p.matchDayVerificationStatus !== 'rejected').length && players.filter(p => p.matchDayVerificationStatus !== 'approved' && p.matchDayVerificationStatus !== 'rejected').length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-[#F28C38] focus:ring-[#F28C38]"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documents</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {players.map((player) => {
                    const docStatus = getDocumentStatus(player);
                    return (
                      <tr key={player.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {player.matchDayVerificationStatus !== 'approved' && player.matchDayVerificationStatus !== 'rejected' && (
                            <input
                              type="checkbox"
                              checked={selectedPlayers.has(player.id)}
                              onChange={() => handlePlayerSelection(player.id)}
                              className="rounded border-gray-300 text-[#F28C38] focus:ring-[#F28C38]"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center"> 
                            <div>
                              <div className="text-sm font-medium text-gray-900">{player.name}</div>
                              <div className="text-sm text-gray-500">{player.age} years • {player.gender === 'M' ? 'Male' : 'Female'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 capitalize">{player.position}</td>
                        <td className="px-6 py-4">
                          <span className={`text-sm ${docStatus.color}`}>
                            {docStatus.message}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlayerStatusColor(player)}`}>
                            {getPlayerStatusIcon(player)}
                            <span className="ml-1 capitalize">{player.matchDayVerificationStatus || 'pending'}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setSelectedPlayer(player)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {player.matchDayVerificationStatus !== 'approved' && player.matchDayVerificationStatus !== 'rejected' && (
                              <>
                                <button
                                  onClick={() => handlePlayerVerification(player.id, 'verified')}
                                  disabled={verifyPlayerMutation.isLoading || docStatus.status === 'incomplete'}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handlePlayerVerification(player.id, 'rejected', 'Match day verification failed')}
                                  disabled={verifyPlayerMutation.isLoading}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {players.map((player) => {
              const docStatus = getDocumentStatus(player);
              
              return (
                <div key={player.id} className="bg-white rounded-lg border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center flex-1">
                      {player.matchDayVerificationStatus !== 'approved' && player.matchDayVerificationStatus !== 'rejected' && (
                        <input
                          type="checkbox"
                          checked={selectedPlayers.has(player.id)}
                          onChange={() => handlePlayerSelection(player.id)}
                          className="rounded border-gray-300 text-[#F28C38] focus:ring-[#F28C38] mr-3 mt-1"
                        />
                      )}
                      {player.documents.profilePhoto?.url && (
                        <DocumentPreview
                          type="profilePhoto"
                          url={player.documents.profilePhoto.url}
                          label="Profile Photo"
                          verified={player.documents.profilePhoto.verified}
                          showActions={false}
                          size="sm"
                          className="mr-3"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{player.name}</h3>
                        <p className="text-sm text-gray-500">{player.age} years • {player.gender === 'M' ? 'Male' : 'Female'}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlayerStatusColor(player)} ml-2`}>
                      {getPlayerStatusIcon(player)}
                      <span className="ml-1 capitalize">{player.matchDayVerificationStatus || 'pending'}</span>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-xs text-gray-500">Position</span>
                      <p className="text-sm font-medium text-gray-900 capitalize">{player.position}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Documents</span>
                      <p className={`text-sm font-medium ${docStatus.color}`}>{docStatus.message}</p>
                    </div>
                  </div>

                  {player.matchDayComments && (
                    <div className="bg-gray-50 p-2 rounded text-sm text-gray-600 mb-3">
                      <strong>Comments:</strong> {player.matchDayComments}
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedPlayer(player)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md border border-indigo-200"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </button>
                    {player.matchDayVerificationStatus !== 'approved' && player.matchDayVerificationStatus !== 'rejected' && (
                      <>
                        <button
                          onClick={() => handlePlayerVerification(player.id, 'verified')}
                          disabled={verifyPlayerMutation.isLoading || docStatus.status === 'incomplete'}
                          className="flex items-center justify-center px-3 py-2 text-sm text-green-600 hover:text-green-900 hover:bg-green-50 rounded-md border border-green-200 disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePlayerVerification(player.id, 'rejected', 'Match day verification failed')}
                          disabled={verifyPlayerMutation.isLoading}
                          className="flex items-center justify-center px-3 py-2 text-sm text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md border border-red-200"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
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
                      selectedPlayer.matchDayVerificationStatus === 'verified' ? 'text-green-600' :
                      selectedPlayer.matchDayVerificationStatus === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {selectedPlayer.matchDayVerificationStatus || 'pending'}
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
                      refetchTeamData();
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
                      refetchTeamData();
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
                      refetchTeamData();
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

              {/* Action Buttons */}
              {selectedPlayer.matchDayVerificationStatus !== 'approved' && (
                <div className="flex space-x-3">
                  <Button
                    onClick={() => {
                      handlePlayerVerification(selectedPlayer.id, 'verified');
                      setSelectedPlayer(null);
                    }}
                    disabled={verifyPlayerMutation.isLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Player
                  </Button>
                  <Button
                    onClick={() => {
                      handlePlayerVerification(selectedPlayer.id, 'rejected', 'Rejected during detailed review');
                      setSelectedPlayer(null);
                    }}
                    disabled={verifyPlayerMutation.isLoading}
                    variant="outline"
                    className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Player
                  </Button>
                </div>
              )}
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
                  await refetchTeamData();
                  setShowImageUpload(false);
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