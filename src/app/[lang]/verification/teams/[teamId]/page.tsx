"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, collection, getDocs, updateDoc, writeBatch } from "firebase/firestore";
import { auditLogService } from "@/lib/services/auditLogService";
import { assignTeamToVenue } from "@/lib/actions/admin/teamVenueAssignment";
import Image from "next/image";
import { ArrowLeft, Users, Phone, Calendar, MapPin, Loader2, AlertCircle, CheckCircle, X, Eye, Check, UserCheck } from "lucide-react";

interface TeamPlayer {
  playerId: string;
  userId: string;
  name: string;
  phone: string;
  dob: string;
  age: number;
  gender: 'M' | 'F';
  position: 'main' | 'substitute';
  profileData: {
    firstName: string;
    lastName: string;
    whatsappNumber: string;
    village: string;
    panchayat: string;
    district: string;
    state: string;
  };
  documents: {
    profilePhoto: DocumentStatus;
    aadhaarFront: DocumentStatus;
    aadhaarBack: DocumentStatus;
  };
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verificationComments: string[];
}

interface DocumentStatus {
  url: string | null;
  verified: boolean;
  uploadedAt: Date | null;
  uploadedBy: string | null;
}

interface TeamData {
  id: string;
  name: string;
  sportName: string;
  sportId: string;
  captainProfile: {
    name: string;
    phone: string;
  };
  panchayat: string;
  district: string;
  state: string;
  currentPlayers: number;
  maxPlayers: number;
  status: string;
  submittedAt: any;
  genderCategory: string;
}

export default function TeamVerificationPage() {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageTitle, setSelectedImageTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const { lang, teamId } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  const teamIdStr = Array.isArray(teamId) ? teamId[0] : teamId;

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (!userProfile?.isProfileComplete) {
      router.push(`/${lang}/complete-profile`);
      return;
    }

    if (userProfile.role !== 'verification_volunteer' && userProfile.role !== 'admin') {
      router.push(`/${lang}/player/dashboard`);
      return;
    }

    loadTeamData();
  }, [user, userProfile, authLoading, teamIdStr]);

  const loadTeamData = async () => {
    if (!teamIdStr) return;

    try {
      // Load team data
      const teamRef = doc(db, "teams", teamIdStr);
      const teamSnap = await getDoc(teamRef);

      if (!teamSnap.exists()) {
        setError("Team not found");
        return;
      }

      const teamRawData = teamSnap.data();
      const team: TeamData = {
        id: teamSnap.id,
        name: teamRawData.name || '',
        sportName: teamRawData.sportName || '',
        sportId: teamRawData.sportId || '',
        captainProfile: {
          name: teamRawData.captainProfile?.name || '',
          phone: teamRawData.captainProfile?.phone || ''
        },
        panchayat: teamRawData.panchayat || '',
        district: teamRawData.district || '',
        state: teamRawData.state || '',
        currentPlayers: teamRawData.currentPlayers || 0,
        maxPlayers: teamRawData.maxPlayers || 12,
        status: teamRawData.status || 'pending',
        submittedAt: teamRawData.submittedAt,
        genderCategory: teamRawData.genderCategory || 'mixed'
      };
      
      setTeamData(team);
      
      // Load players from subcollection
      const playersRef = collection(db, "teams", teamIdStr, "players");
      const playersSnap = await getDocs(playersRef);
      
      const loadedPlayers: TeamPlayer[] = [];
      
      for (const playerDoc of playersSnap.docs) {
        const playerData = playerDoc.data();
        
        // Skip deleted players
        if (playerData.isDeleted) continue;
        
        // Load user data for documents
        let userDocuments = playerData.documents || {};
        if (playerData.userId && !playerData.userId.startsWith('user_')) {
          try {
            const userDoc = await getDoc(doc(db, "users", playerData.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData.documents) {
                userDocuments = userData.documents;
              }
            }
          } catch (error) {
            console.warn(`Could not load user documents for player ${playerData.userId}:`, error);
          }
        }
        
        const player: TeamPlayer = {
          playerId: playerDoc.id,
          userId: playerData.userId || '',
          name: playerData.name || `${playerData.firstName || ''} ${playerData.lastName || ''}`.trim(),
          phone: playerData.phone || '',
          dob: playerData.dateOfBirth || playerData.dob || '',
          age: playerData.age || 0,
          gender: playerData.gender || 'M',
          position: playerData.position || 'main',
          profileData: {
            firstName: playerData.firstName || playerData.profileData?.firstName || '',
            lastName: playerData.lastName || playerData.profileData?.lastName || '',
            whatsappNumber: playerData.whatsappNumber || playerData.profileData?.whatsappNumber || '',
            village: playerData.village || playerData.profileData?.village || '',
            panchayat: playerData.panchayat || playerData.profileData?.panchayat || team.panchayat,
            district: playerData.district || playerData.profileData?.district || team.district,
            state: playerData.state || playerData.profileData?.state || team.state
          },
          documents: {
            profilePhoto: {
              url: userDocuments?.profilePhoto?.url || null,
              verified: userDocuments?.profilePhoto?.verified || false,
              uploadedAt: userDocuments?.profilePhoto?.uploadedAt ? 
                (userDocuments.profilePhoto.uploadedAt.toDate ? userDocuments.profilePhoto.uploadedAt.toDate() : new Date(userDocuments.profilePhoto.uploadedAt)) 
                : null,
              uploadedBy: userDocuments?.profilePhoto?.uploadedBy || null
            },
            aadhaarFront: {
              url: userDocuments?.aadhaarFront?.url || null,
              verified: userDocuments?.aadhaarFront?.verified || false,
              uploadedAt: userDocuments?.aadhaarFront?.uploadedAt ? 
                (userDocuments.aadhaarFront.uploadedAt.toDate ? userDocuments.aadhaarFront.uploadedAt.toDate() : new Date(userDocuments.aadhaarFront.uploadedAt)) 
                : null,
              uploadedBy: userDocuments?.aadhaarFront?.uploadedBy || null
            },
            aadhaarBack: {
              url: userDocuments?.aadhaarBack?.url || null,
              verified: userDocuments?.aadhaarBack?.verified || false,
              uploadedAt: userDocuments?.aadhaarBack?.uploadedAt ? 
                (userDocuments.aadhaarBack.uploadedAt.toDate ? userDocuments.aadhaarBack.uploadedAt.toDate() : new Date(userDocuments.aadhaarBack.uploadedAt)) 
                : null,
              uploadedBy: userDocuments?.aadhaarBack?.uploadedBy || null
            }
          },
          verificationStatus: playerData.verificationStatus || 'pending',
          verificationComments: playerData.verificationComments || []
        };
        
        loadedPlayers.push(player);
      }
      
      setPlayers(loadedPlayers);
    } catch (err: any) {
      console.error("Error loading team:", err);
      setError("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerStatusChange = async (playerId: string, status: 'approved' | 'rejected', comments?: string) => {
    if (!teamIdStr) {
      console.error("Team ID is missing, cannot update player status.");
      return;
    }
    try {
      setSaving(true);

      // Find the player *before* updating the state to get the old status
      const player = players.find(p => p.playerId === playerId);
      if (!player) {
        throw new Error("Player not found in local state.");
      }

      // Update local state first for a responsive UI
      const updatedPlayers = players.map(p => 
        p.playerId === playerId 
          ? { 
              ...p, 
              verificationStatus: status, 
              verificationComments: comments ? [comments] : [] 
            } 
          : p
      );
      setPlayers(updatedPlayers);

      // Update in database
      if (player.userId) {
        const userRef = doc(db, "users", player.userId);
        await updateDoc(userRef, {
          [`teams.${teamIdStr}.verificationStatus`]: status,
          [`teams.${teamIdStr}.verificationComments`]: comments ? [comments] : [],
          [`teams.${teamIdStr}.verifiedAt`]: new Date().toISOString(),
          [`teams.${teamIdStr}.verifiedBy`]: user?.uid,
        });

        const playerRef = doc(db, "teams", teamIdStr, "players", playerId);
        await updateDoc(playerRef, {
          verificationStatus: status,
          verificationComments: comments ? [comments] : [],
          verifiedAt: new Date().toISOString(),
          verifiedBy: user?.uid,
        });

        // Log the verification action
        if (teamData && user && userProfile) {
          await auditLogService.logPlayerVerification(
            { // actor
              uid: user.uid,
              name: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
              role: userProfile.role
            },
            { // team
              id: teamData.id,
              name: teamData.name
            },
            { // player
              id: player.playerId,
              name: player.name
            },
            player.verificationStatus, // oldStatus
            status, // newStatus
            comments || null // reason
          );
        }
      }
      
      // Update team status based on the new list of players
      await updateTeamStatus(updatedPlayers);
      
    } catch (error) {
      console.error('Error updating player status:', error);
      alert('Failed to save verification. Please try again.');
      loadTeamData(); // Reload data on error
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAction = async (action: 'approved' | 'rejected') => {
    if (selectedPlayers.size === 0) {
      alert('Please select players to perform bulk action.');
      return;
    }
    
    const selectedPlayersList = players.filter(p => selectedPlayers.has(p.playerId));
    const actionText = action === 'approved' ? 'approve' : 'reject';
    
    let reason = '';
    if (action === 'rejected') {
      reason = prompt('Reason for rejection:') || '';
      if (!reason) return;
    } else {
      reason = 'Bulk approved by verification volunteer';
    }
    
    if (!confirm(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} ${selectedPlayersList.length} selected players?`)) {
      return;
    }
    
    setSaving(true);
    
    try {
      // Update local state first for responsive UI
      const updatedPlayers = players.map(p => 
        selectedPlayers.has(p.playerId) 
          ? { 
              ...p, 
              verificationStatus: action, 
              verificationComments: reason ? [reason] : [] 
            } 
          : p
      );
      setPlayers(updatedPlayers);

      // Create Firebase batch operation
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();
      
      // Batch update all selected players
      for (const player of selectedPlayersList) {
        if (player.userId) {
          // Update user document
          const userRef = doc(db, "users", player.userId);
          batch.update(userRef, {
            [`teams.${teamIdStr}.verificationStatus`]: action,
            [`teams.${teamIdStr}.verificationComments`]: reason ? [reason] : [],
            [`teams.${teamIdStr}.verifiedAt`]: timestamp,
            [`teams.${teamIdStr}.verifiedBy`]: user?.uid,
          });

          // Update player document in team subcollection
          const playerRef = doc(db, "teams", teamIdStr, "players", player.playerId);
          batch.update(playerRef, {
            verificationStatus: action,
            verificationComments: reason ? [reason] : [],
            verifiedAt: timestamp,
            verifiedBy: user?.uid,
          });
        }
      }

      // Calculate new team status based on updated players
      const approvedCount = updatedPlayers.filter(p => p.verificationStatus === 'approved').length;
      const rejectedCount = updatedPlayers.filter(p => p.verificationStatus === 'rejected').length;
      const totalPlayers = updatedPlayers.length;
      
      let newTeamStatus = teamData?.status || 'pending';
      if (rejectedCount > 0) {
        newTeamStatus = 'rejected';
      } else if (approvedCount === totalPlayers) {
        newTeamStatus = 'verified';
      } else if (approvedCount > 0) {
        newTeamStatus = 'partial_verification';
      } else {
        newTeamStatus = 'pending';
      }

      // Add team status update to batch if it changed
      if (newTeamStatus !== teamData?.status) {
        const teamRef = doc(db, "teams", teamIdStr);
        batch.update(teamRef, {
          status: newTeamStatus,
          verifiedAt: timestamp,
          verifiedBy: user?.uid,
          updatedAt: timestamp,
        });
      }

      // Commit the batch
      await batch.commit();

      // Log individual player verifications for audit trail
      if (teamData && user && userProfile) {
        for (const player of selectedPlayersList) {
          await auditLogService.logPlayerVerification(
            { // actor
              uid: user.uid,
              name: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
              role: userProfile.role
            },
            { // team
              id: teamData.id,
              name: teamData.name
            },
            { // player
              id: player.playerId,
              name: player.name
            },
            player.verificationStatus, // oldStatus
            action, // newStatus
            reason || null // reason
          );
        }

        // Log the bulk action
        await auditLogService.logBulkPlayerVerification(
          { // actor
            uid: user.uid,
            name: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
            role: userProfile.role
          },
          { // team
            id: teamData.id,
            name: teamData.name
          },
          selectedPlayersList.length, // playerCount
          action, // status
          reason // reason
        );

        // Log team status change if it occurred
        if (newTeamStatus !== teamData.status) {
          await auditLogService.logTeamStatusChange(
            {
              uid: user.uid,
              name: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
              role: userProfile.role
            },
            {
              id: teamData.id,
              name: teamData.name
            },
            teamData.status,
            newTeamStatus,
            `Team status changed based on bulk player verification`
          );
        }
      }

      // Update local team status
      setTeamData(prev => prev ? { ...prev, status: newTeamStatus } : null);

      // Trigger venue assignment when team becomes verified
      if (newTeamStatus === 'verified' && teamData?.status !== 'verified') {
        try {
          const result = await assignTeamToVenue({
            id: teamData.id,
            name: teamData.name,
            state: teamData.state,
            district: teamData.district,
            panchayat: teamData.panchayat
          });
          console.log('Venue assignment result:', result.message);
        } catch (error) {
          console.error('Error assigning team to venue:', error);
          // Don't fail the verification process if venue assignment fails
        }
      }

      alert(`Successfully ${action} ${selectedPlayersList.length} players!`);
      setSelectedPlayers(new Set()); // Clear selection
    } catch (error) {
      console.error('Bulk action error:', error);
      alert(`Some ${actionText}s may have failed. Please check and try again.`);
      // Reload data on error to ensure UI consistency
      loadTeamData();
    } finally {
      setSaving(false);
    }
  };

  const updateTeamStatus = async (updatedPlayers: TeamPlayer[]) => {
    if (!teamData) return;
    if (!teamIdStr) {
      console.error("Team ID is missing, cannot update player status.");
      return;
    } 
    const approvedCount = updatedPlayers.filter(p => p.verificationStatus === 'approved').length;
    const rejectedCount = updatedPlayers.filter(p => p.verificationStatus === 'rejected').length;
    const totalPlayers = updatedPlayers.length;
    
    let newStatus = teamData.status;
    if (rejectedCount > 0) {
      newStatus = 'rejected';
    } else if (approvedCount === totalPlayers) {
      newStatus = 'verified';
    } else if (approvedCount > 0) {
      newStatus = 'partial_verification';
    } else {
      newStatus = 'pending';
    }
    
    // Update team document
    const teamRef = doc(db, "teams", teamIdStr);
    await updateDoc(teamRef, {
      status: newStatus,
      verifiedAt: new Date().toISOString(),
      verifiedBy: user?.uid,
      updatedAt: new Date().toISOString(),
    });

    // Trigger venue assignment when team becomes verified
    if (newStatus === 'verified' && teamData.status !== 'verified') {
      try {
        const result = await assignTeamToVenue({
          id: teamData.id,
          name: teamData.name,
          state: teamData.state,
          district: teamData.district,
          panchayat: teamData.panchayat
        });
        console.log('Venue assignment result:', result.message);
      } catch (error) {
        console.error('Error assigning team to venue:', error);
        // Don't fail the verification process if venue assignment fails
      }
    }

    // Log team status change
    if (teamData && user && userProfile && newStatus !== teamData.status) {
      await auditLogService.logTeamStatusChange(
        {
          uid: user.uid,
          name: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
          role: userProfile.role
        },
        {
          id: teamData.id,
          name: teamData.name
        },
        teamData.status,
        newStatus,
        `Team status changed based on player verification results`
      );
    }
    
    setTeamData(prev => prev ? { ...prev, status: newStatus } : null);
  };

  const handleViewImage = (url: string, title: string) => {
    setSelectedImageUrl(url);
    setSelectedImageTitle(title);
    setShowImageModal(true);
  };

  const handleSelectAll = () => {
    const pendingPlayers = players.filter(p => p.verificationStatus === 'pending');
    if (selectedPlayers.size === pendingPlayers.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(pendingPlayers.map(p => p.playerId)));
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

  const getDocumentIcon = (doc: DocumentStatus) => {
    if (doc.url && doc.verified) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (doc.url) {
      return <Eye className="w-4 h-4 text-blue-600" />;
    } else {
      return <X className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (error || !teamData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error || "Team not found"}</p>
          <button 
            onClick={() => router.push(`/${lang}/verification/dashboard`)}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const stats = {
    approved: players.filter(p => p.verificationStatus === 'approved').length,
    rejected: players.filter(p => p.verificationStatus === 'rejected').length,
    pending: players.filter(p => p.verificationStatus === 'pending').length
  };

  const pendingPlayers = players.filter(p => p.verificationStatus === 'pending');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/${lang}/verification/dashboard`)}
            className="flex items-center text-[#F28C38] hover:text-[#E67A26] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="text-center mb-6">
            <div className="mb-3">
              <Image 
                src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" 
                alt="Isha Logo" 
                width={60} 
                height={60} 
                className="mx-auto"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold mb-2 text-[#4A2F1D]">
              {teamData.name}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              {teamData.sportName} • {teamData.genderCategory} • {teamData.panchayat}
            </p>
          </div>
        </div>

        {/* Team Info Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Team Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{teamData.currentPlayers}/{teamData.maxPlayers} Players</span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{teamData.captainProfile.name} - {teamData.captainProfile.phone}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{teamData.panchayat}, {teamData.district}, {teamData.state}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  <span>Submitted: {formatDate(teamData.submittedAt)}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Verification Stats</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                  <div className="text-xs text-gray-600">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                  <div className="text-xs text-gray-600">Rejected</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {pendingPlayers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedPlayers.size === pendingPlayers.length && pendingPlayers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-[#F28C38] focus:ring-[#F28C38]"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Select All Pending ({pendingPlayers.length})
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
                    onClick={() => handleBulkAction('approved')}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve ({selectedPlayers.size})
                  </button>
                  <button
                    onClick={() => handleBulkAction('rejected')}
                    disabled={saving}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject ({selectedPlayers.size})
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Players Table - Desktop */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedPlayers.size === pendingPlayers.length && pendingPlayers.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-[#F28C38] focus:ring-[#F28C38]"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {players.map((player) => (
                  <tr key={player.playerId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {player.verificationStatus === 'pending' && (
                        <input
                          type="checkbox"
                          checked={selectedPlayers.has(player.playerId)}
                          onChange={() => handlePlayerSelection(player.playerId)}
                          className="rounded border-gray-300 text-[#F28C38] focus:ring-[#F28C38]"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{player.name}</div>
                      <div className="text-sm text-gray-500">
                        Age: {player.age} • {player.gender === 'M' ? 'Male' : 'Female'} • {player.position}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{player.phone}</div>
                      <div className="text-sm text-gray-500">{player.profileData.village}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => player.documents.profilePhoto.url && handleViewImage(player.documents.profilePhoto.url, 'Profile Photo')}
                          disabled={!player.documents.profilePhoto.url}
                          className="flex items-center justify-center w-8 h-8 rounded border disabled:opacity-50"
                          title="Profile Photo"
                        >
                          {getDocumentIcon(player.documents.profilePhoto)}
                        </button>
                        <button
                          onClick={() => player.documents.aadhaarFront.url && handleViewImage(player.documents.aadhaarFront.url, 'Aadhaar Front')}
                          disabled={!player.documents.aadhaarFront.url}
                          className="flex items-center justify-center w-8 h-8 rounded border disabled:opacity-50"
                          title="Aadhaar Front"
                        >
                          {getDocumentIcon(player.documents.aadhaarFront)}
                        </button>
                        <button
                          onClick={() => player.documents.aadhaarBack.url && handleViewImage(player.documents.aadhaarBack.url, 'Aadhaar Back')}
                          disabled={!player.documents.aadhaarBack.url}
                          className="flex items-center justify-center w-8 h-8 rounded border disabled:opacity-50"
                          title="Aadhaar Back"
                        >
                          {getDocumentIcon(player.documents.aadhaarBack)}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(player.verificationStatus)}`}>
                        {player.verificationStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {player.verificationStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => handlePlayerStatusChange(player.playerId, 'approved', 'Approved by verification volunteer')}
                              disabled={saving}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Reason for rejection:');
                                if (reason) {
                                  handlePlayerStatusChange(player.playerId, 'rejected', reason);
                                }
                              }}
                              disabled={saving}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setSelectedPlayer(player);
                            setShowPlayerModal(true);
                          }}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Players Cards - Mobile */}
        <div className="md:hidden space-y-3">
          {players.map((player) => (
            <div key={player.playerId} className="bg-white rounded-lg shadow-sm p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3">
                  {player.verificationStatus === 'pending' && (
                    <input
                      type="checkbox"
                      checked={selectedPlayers.has(player.playerId)}
                      onChange={() => handlePlayerSelection(player.playerId)}
                      className="rounded border-gray-300 text-[#F28C38] focus:ring-[#F28C38] mt-1"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{player.name}</h3>
                    <p className="text-xs text-gray-600">{player.phone}</p>
                    <p className="text-xs text-gray-500">Age: {player.age} • {player.gender === 'M' ? 'Male' : 'Female'}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(player.verificationStatus)}`}>
                  {player.verificationStatus}
                </span>
              </div>

              <div className="flex justify-between items-center mb-2">
                <div className="text-xs text-gray-600">{player.profileData.village}</div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => player.documents.profilePhoto.url && handleViewImage(player.documents.profilePhoto.url, 'Profile Photo')}
                    disabled={!player.documents.profilePhoto.url}
                    className="flex items-center justify-center w-6 h-6 rounded border disabled:opacity-50"
                    title="Profile Photo"
                  >
                    {getDocumentIcon(player.documents.profilePhoto)}
                  </button>
                  <button
                    onClick={() => player.documents.aadhaarFront.url && handleViewImage(player.documents.aadhaarFront.url, 'Aadhaar Front')}
                    disabled={!player.documents.aadhaarFront.url}
                    className="flex items-center justify-center w-6 h-6 rounded border disabled:opacity-50"
                    title="Aadhaar Front"
                  >
                    {getDocumentIcon(player.documents.aadhaarFront)}
                  </button>
                  <button
                    onClick={() => player.documents.aadhaarBack.url && handleViewImage(player.documents.aadhaarBack.url, 'Aadhaar Back')}
                    disabled={!player.documents.aadhaarBack.url}
                    className="flex items-center justify-center w-6 h-6 rounded border disabled:opacity-50"
                    title="Aadhaar Back"
                  >
                    {getDocumentIcon(player.documents.aadhaarBack)}
                  </button>
                </div>
              </div>

              <div className="flex gap-1">
                {player.verificationStatus === 'pending' ? (
                  <>
                    <button
                      onClick={() => handlePlayerStatusChange(player.playerId, 'approved', 'Approved by verification volunteer')}
                      disabled={saving}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Reason for rejection:');
                        if (reason) {
                          handlePlayerStatusChange(player.playerId, 'rejected', reason);
                        }
                      }}
                      disabled={saving}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Reject
                    </button>
                  </>
                ) : null}
                <button
                  onClick={() => {
                    setSelectedPlayer(player);
                    setShowPlayerModal(true);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-1 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {players.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No players found
            </h3>
            <p className="text-gray-600">
              This team has no players registered yet.
            </p>
          </div>
        )}
      </div>

      {/* Player Details Modal */}
      {selectedPlayer && showPlayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-[#4A2F1D]">{selectedPlayer.name}</h2>
                  <p className="text-gray-600">{selectedPlayer.phone}</p>
                </div>
                <button
                  onClick={() => setShowPlayerModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Documents Section - First and Prominent */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Identity Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { key: 'profilePhoto', title: 'Profile Photo', doc: selectedPlayer.documents.profilePhoto },
                    { key: 'aadhaarFront', title: 'Aadhaar Front', doc: selectedPlayer.documents.aadhaarFront },
                    { key: 'aadhaarBack', title: 'Aadhaar Back', doc: selectedPlayer.documents.aadhaarBack }
                  ].map(({ key, title, doc }) => (
                    <div key={key} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-sm">{title}</span>
                        {getDocumentIcon(doc)}
                      </div>
                      
                      {doc.url ? (
                        <div className="space-y-3">
                          <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                            <Image
                              src={doc.url}
                              alt={title}
                              fill
                              className="object-cover cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => handleViewImage(doc.url!, title)}
                              unoptimized={doc.url.includes('firebasestorage.googleapis.com')}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="flex items-center justify-center h-full text-red-600 text-xs">
                                      <div class="text-center">
                                        <div class="mb-2">⚠️</div>
                                        <div>Failed to load</div>
                                      </div>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          </div>
                          <button
                            onClick={() => handleViewImage(doc.url!, title)}
                            className="w-full text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center py-2 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Full Size
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">Not uploaded</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Player Details */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Personal Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Age:</span> {selectedPlayer.age}</div>
                    <div><span className="font-medium">Gender:</span> {selectedPlayer.gender === 'M' ? 'Male' : 'Female'}</div>
                    <div><span className="font-medium">DOB:</span> {selectedPlayer.dob}</div>
                    <div><span className="font-medium">Position:</span> {selectedPlayer.position}</div>
                    <div><span className="font-medium">WhatsApp:</span> {selectedPlayer.profileData.whatsappNumber}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Location Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Village:</span> {selectedPlayer.profileData.village}</div>
                    <div><span className="font-medium">Panchayat:</span> {selectedPlayer.profileData.panchayat}</div>
                    <div><span className="font-medium">District:</span> {selectedPlayer.profileData.district}</div>
                    <div><span className="font-medium">State:</span> {selectedPlayer.profileData.state}</div>
                  </div>
                </div>
              </div>

              {/* Verification Actions */}
              <div className="flex justify-center space-x-4 pt-4 border-t">
                {selectedPlayer.verificationStatus === 'pending' && (
                  <>
                    <button
                      onClick={async () => {
                        await handlePlayerStatusChange(selectedPlayer.playerId, 'approved', 'Approved by verification volunteer');
                        setShowPlayerModal(false);
                        alert('Player approved successfully!');
                      }}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium flex items-center disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve Player
                    </button>
                    
                    <button
                      onClick={async () => {
                        const reason = prompt('Please provide reason for rejection:');
                        if (reason) {
                          await handlePlayerStatusChange(selectedPlayer.playerId, 'rejected', reason);
                          setShowPlayerModal(false);
                          alert('Player rejected successfully!');
                        }
                      }}
                      disabled={saving}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium flex items-center disabled:opacity-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject Player
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Size Image Modal */}
      {showImageModal && selectedImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{selectedImageTitle}</h3>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-4 text-center">
              <div className="relative max-w-4xl mx-auto">
                <Image
                  src={selectedImageUrl}
                  alt={selectedImageTitle}
                  width={800}
                  height={600}
                  className="max-w-full max-h-[70vh] mx-auto border rounded-lg shadow-lg object-contain"
                  priority
                  unoptimized={selectedImageUrl.includes('firebasestorage.googleapis.com')}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="flex items-center justify-center h-64 text-red-600">
                          <div class="text-center p-4">
                            <div class="text-4xl mb-4">⚠️</div>
                            <p class="font-semibold mb-2">Failed to load document image</p>
                            <p class="text-sm text-gray-500 break-all">${selectedImageUrl}</p>
                          </div>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}