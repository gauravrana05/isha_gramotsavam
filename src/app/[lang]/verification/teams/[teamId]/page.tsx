"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import { ArrowLeft, Users, MapPin, Phone, Loader2, AlertCircle, CheckCircle, Save, Check, X, Eye, Calendar, UserCheck, UserX, Clock } from "lucide-react";
import { documentUploadService } from "@/lib/services/documentUploadService";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";

interface TeamPlayer {
  playerId: string;
  userId: string;
  teamId: string;
  name: string;
  phone: string;
  dob: string;
  age: number;
  gender: 'M' | 'F';
  position: 'main' | 'substitute';
  addedAt: Date;
  addedBy: string;
  profileComplete: boolean;
  profileData: {
    firstName: string;
    lastName: string;
    whatsappNumber: string;
    village: string;
    panchayat: string;
    taluk: string;
    district: string;
    state: string;
    pincode: string;
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
  storagePath: string;
  url: string | null;
  verified: boolean;
  uploadedAt: Date | null;
  uploadedBy: string | null;
}

interface TeamData {
  teamId: string;
  teamName: string;
  sportId: string;
  captainId: string;
  captainName: string;
  captainPhone: string;
  panchayat: string;
  district: string;
  state: string;
  players: TeamPlayer[];
  maxPlayers: number;
  status: string;
  gender: string;
  submittedAt: string;
  eventId: string;
}

export default function TeamVerificationPage() {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<'profilePhoto' | 'aadhaarFront' | 'aadhaarBack' | null>(null);
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const { lang, teamId } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const teamIdStr = Array.isArray(teamId) ? teamId[0] : teamId;

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return Math.max(0, age);
  };

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
      const teamRef = doc(db, "teams", teamIdStr);
      const teamSnap = await getDoc(teamRef);

      if (!teamSnap.exists()) {
        setError("Team not found");
        return;
      }

      const teamRawData = teamSnap.data();
      const team: TeamData = {
        teamId: teamSnap.id,
        teamName: teamRawData.teamName || '',
        sportId: teamRawData.sportId || teamRawData.sport || '',
        captainId: teamRawData.captainId || '',
        captainName: teamRawData.captainName || '',
        captainPhone: teamRawData.captainPhone || '',
        panchayat: teamRawData.panchayat || '',
        district: teamRawData.district || '',
        state: teamRawData.state || '',
        players: [],
        maxPlayers: teamRawData.maxPlayers || 12,
        status: teamRawData.status || 'draft',
        gender: teamRawData.gender || 'M',
        submittedAt: teamRawData.submittedAt || teamRawData.createdAt || '',
        eventId: teamRawData.eventId || 'gramotsavam_2025'
      };
      
      setTeamData(team);
      
      // Load team players - start with captain
      const teamPlayers: TeamPlayer[] = [];
      
      // Add captain as first player if not already in players array
      if (teamRawData.captainId) {
        const captainInPlayers = teamRawData.players?.find((p: any) => p.userId === teamRawData.captainId);
        
        if (!captainInPlayers) {
          // Fetch captain's user data
          try {
            const captainDoc = await getDoc(doc(db, "users", teamRawData.captainId));
            if (captainDoc.exists()) {
              const captainData = captainDoc.data();
              const captainPlayer: TeamPlayer = {
                playerId: `captain_${teamRawData.captainId}`,
                userId: teamRawData.captainId,
                teamId: teamIdStr,
                name: `${captainData.firstName || ''} ${captainData.lastName || ''}`.trim() || team.captainName,
                phone: captainData.phoneNumber || team.captainPhone,
                dob: captainData.dob || '',
                age: captainData.age || (captainData.dob ? calculateAge(captainData.dob) : 25),
                gender: captainData.gender || team.gender || 'M',
                position: 'main',
                addedAt: new Date(teamRawData.createdAt || Date.now()),
                addedBy: 'self',
                profileComplete: captainData.isProfileComplete || false,
                profileData: {
                  firstName: captainData.firstName || '',
                  lastName: captainData.lastName || '',
                  whatsappNumber: captainData.whatsappNumber || captainData.phoneNumber || '',
                  village: captainData.village || '',
                  panchayat: captainData.panchayat || team.panchayat,
                  taluk: captainData.taluk || '',
                  district: captainData.district || team.district,
                  state: captainData.state || team.state,
                  pincode: captainData.pincode || ''
                },
                documents: {
                  profilePhoto: {
                    storagePath: `profilePhotos/${teamRawData.captainId}/profile_photo`,
                    url: captainData.documents?.profilePhoto?.url || null,
                    verified: captainData.documents?.profilePhoto?.verified || false,
                    uploadedAt: captainData.documents?.profilePhoto?.uploadedAt ? new Date(captainData.documents.profilePhoto.uploadedAt) : null,
                    uploadedBy: captainData.documents?.profilePhoto?.uploadedBy || null
                  },
                  aadhaarFront: {
                    storagePath: `aadhaar/${teamRawData.captainId}/front_`,
                    url: captainData.documents?.aadhaarFront?.url || null,
                    verified: captainData.documents?.aadhaarFront?.verified || false,
                    uploadedAt: captainData.documents?.aadhaarFront?.uploadedAt ? new Date(captainData.documents.aadhaarFront.uploadedAt) : null,
                    uploadedBy: captainData.documents?.aadhaarFront?.uploadedBy || null
                  },
                  aadhaarBack: {
                    storagePath: `aadhaar/${teamRawData.captainId}/back_`,
                    url: captainData.documents?.aadhaarBack?.url || null,
                    verified: captainData.documents?.aadhaarBack?.verified || false,
                    uploadedAt: captainData.documents?.aadhaarBack?.uploadedAt ? new Date(captainData.documents.aadhaarBack.uploadedAt) : null,
                    uploadedBy: captainData.documents?.aadhaarBack?.uploadedBy || null
                  }
                },
                verificationStatus: 'pending',
                verificationComments: []
              };
              teamPlayers.push(captainPlayer);
            }
          } catch (error) {
            console.error('Error loading captain data:', error);
          }
        }
      }
      
      if (teamRawData.players && Array.isArray(teamRawData.players)) {
        for (const player of teamRawData.players) {
          const teamPlayer: TeamPlayer = {
            playerId: player.playerId || `player_${Date.now()}`,
            userId: player.userId || '',
            teamId: teamIdStr,
            name: player.name || `${player.firstName || ''} ${player.lastName || ''}`.trim(),
            phone: player.phone || '',
            dob: player.dob || '',
            age: player.age || 18,
            gender: player.gender || 'M',
            position: player.position || 'main',
            addedAt: player.addedAt ? new Date(player.addedAt) : new Date(),
            addedBy: player.addedBy || 'captain',
            profileComplete: player.profileComplete || false,
            profileData: {
              firstName: player.firstName || player.profileData?.firstName || '',
              lastName: player.lastName || player.profileData?.lastName || '',
              whatsappNumber: player.whatsappNumber || player.profileData?.whatsappNumber || '',
              village: player.village || player.profileData?.village || '',
              panchayat: player.panchayat || player.profileData?.panchayat || team.panchayat,
              taluk: player.taluk || player.profileData?.taluk || '',
              district: player.district || player.profileData?.district || team.district,
              state: player.state || player.profileData?.state || team.state,
              pincode: player.pincode || player.profileData?.pincode || ''
            },
            documents: {
              profilePhoto: {
                storagePath: player.documents?.profilePhoto?.storagePath || `profilePhotos/${player.userId}/profile_photo`,
                url: player.documents?.profilePhoto?.url || null,
                verified: player.documents?.profilePhoto?.verified || false,
                uploadedAt: player.documents?.profilePhoto?.uploadedAt ? new Date(player.documents.profilePhoto.uploadedAt) : null,
                uploadedBy: player.documents?.profilePhoto?.uploadedBy || null
              },
              aadhaarFront: {
                storagePath: player.documents?.aadhaarFront?.storagePath || `aadhaar/${player.userId}/front_`,
                url: player.documents?.aadhaarFront?.url || null,
                verified: player.documents?.aadhaarFront?.verified || false,
                uploadedAt: player.documents?.aadhaarFront?.uploadedAt ? new Date(player.documents.aadhaarFront.uploadedAt) : null,
                uploadedBy: player.documents?.aadhaarFront?.uploadedBy || null
              },
              aadhaarBack: {
                storagePath: player.documents?.aadhaarBack?.storagePath || `aadhaar/${player.userId}/back_`,
                url: player.documents?.aadhaarBack?.url || null,
                verified: player.documents?.aadhaarBack?.verified || false,
                uploadedAt: player.documents?.aadhaarBack?.uploadedAt ? new Date(player.documents.aadhaarBack.uploadedAt) : null,
                uploadedBy: player.documents?.aadhaarBack?.uploadedBy || null
              }
            },
            verificationStatus: player.verificationStatus || 'pending',
            verificationComments: player.verificationComments || []
          };
          
          teamPlayers.push(teamPlayer);
        }
      }
      
      setPlayers(teamPlayers);
    } catch (err: any) {
      console.error("Error loading team:", err);
      setError("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerStatusChange = async (playerId: string, status: 'approved' | 'rejected', comments: string) => {
    try {
      // Update local state first
      const updatedPlayers = players.map(player => 
        player.playerId === playerId 
          ? {
              ...player,
              verificationStatus: status,
              verificationComments: comments ? [comments] : []
            }
          : player
      );
      
      setPlayers(updatedPlayers);
      
      // Save individual player verification
      await savePlayerVerification(playerId, status, comments, updatedPlayers);
      
      // Update team status
      await saveTeamVerificationStatus(updatedPlayers);
      
    } catch (error) {
      console.error('Error updating player status:', error);
      alert('Failed to save verification. Please try again.');
      // Revert local state on error
      await loadTeamData();
    }
  };

  const handleBulkVerifyAll = async () => {
    const unverifiedPlayers = players.filter(p => p.verificationStatus !== 'approved');
    
    if (unverifiedPlayers.length === 0) {
      alert('All players are already verified!');
      return;
    }

    setSaving(true);
    const errors: string[] = [];
    const successes: string[] = [];

    try {
      // Update local state first
      const updatedPlayers = players.map(player => 
        player.verificationStatus !== 'approved' 
          ? {
              ...player,
              verificationStatus: 'approved' as const,
              verificationComments: ['Bulk verified by volunteer']
            }
          : player
      );
      
      setPlayers(updatedPlayers);

      // Save individual player verifications in parallel with error handling
      const verificationPromises = unverifiedPlayers.map(async (player) => {
        try {
          await savePlayerVerification(player.playerId, 'approved', 'Bulk verified by volunteer', updatedPlayers);
          successes.push(player.name);
          return { success: true, playerName: player.name };
        } catch (error) {
          errors.push(`${player.name}: ${error}`);
          console.error(`Failed to verify player ${player.name}:`, error);
          return { success: false, playerName: player.name, error };
        }
      });

      const results = await Promise.allSettled(verificationPromises);
      
      // Update team status after all individual verifications
      try {
        await saveTeamVerificationStatus(updatedPlayers);
      } catch (teamError) {
        console.error('Failed to update team status:', teamError);
        errors.push(`Team status update failed: ${teamError}`);
      }

      // Show results
      if (errors.length > 0) {
        alert(`Bulk verification completed with errors:\n\nSuccessful (${successes.length}): ${successes.join(', ')}\n\nFailed (${errors.length}): ${errors.join(', ')}`);
      } else {
        alert(`Successfully verified all ${successes.length} players!`);
      }

    } catch (error) {
      console.error('Bulk verification failed:', error);
      alert(`Bulk verification failed: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    // Only select unverified players
    const selectablePlayers = players.filter(p => p.verificationStatus !== 'approved' && p.verificationStatus !== 'rejected');
    
    if (selectedPlayers.size === selectablePlayers.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(selectablePlayers.map(p => p.playerId)));
    }
  };

  const handleBulkVerifySelected = async () => {
    if (selectedPlayers.size === 0) {
      alert('Please select players to verify');
      return;
    }
    
    const selectedPlayersToVerify = players.filter(p => 
      selectedPlayers.has(p.playerId) && p.verificationStatus !== 'approved'
    );
    
    if (selectedPlayersToVerify.length === 0) {
      alert('All selected players are already verified!');
      setSelectedPlayers(new Set());
      return;
    }
    
    setSaving(true);
    const errors: string[] = [];
    const successes: string[] = [];

    try {
      // Update local state first
      const updatedPlayers = players.map(player => 
        selectedPlayers.has(player.playerId) && player.verificationStatus !== 'approved'
          ? {
              ...player,
              verificationStatus: 'approved' as const,
              verificationComments: ['Verified by volunteer (bulk selection)']
            }
          : player
      );
      
      setPlayers(updatedPlayers);

      // Save individual player verifications in parallel
      const verificationPromises = selectedPlayersToVerify.map(async (player) => {
        try {
          await savePlayerVerification(player.playerId, 'approved', 'Verified by volunteer (bulk selection)', updatedPlayers);
          successes.push(player.name);
          return { success: true, playerName: player.name };
        } catch (error) {
          errors.push(`${player.name}: ${error}`);
          console.error(`Failed to verify player ${player.name}:`, error);
          return { success: false, playerName: player.name, error };
        }
      });

      await Promise.allSettled(verificationPromises);
      
      // Update team status after all individual verifications
      try {
        await saveTeamVerificationStatus(updatedPlayers);
      } catch (teamError) {
        console.error('Failed to update team status:', teamError);
        errors.push(`Team status update failed: ${teamError}`);
      }

      setSelectedPlayers(new Set());

      // Show results
      if (errors.length > 0) {
        alert(`Selected verification completed with errors:\n\nSuccessful (${successes.length}): ${successes.join(', ')}\n\nFailed (${errors.length}): ${errors.join(', ')}`);
      } else {
        alert(`Successfully verified ${successes.length} selected players!`);
      }

    } catch (error) {
      console.error('Bulk selected verification failed:', error);
      alert(`Bulk verification failed: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkRejectSelected = async () => {
    if (selectedPlayers.size === 0) {
      alert('Please select players to reject');
      return;
    }
    
    const selectedPlayersToReject = players.filter(p => 
      selectedPlayers.has(p.playerId) && p.verificationStatus !== 'rejected'
    );
    
    if (selectedPlayersToReject.length === 0) {
      alert('All selected players are already processed!');
      setSelectedPlayers(new Set());
      return;
    }
    
    const reason = prompt('Please provide reason for rejection:');
    if (!reason) return;
    
    const updatedPlayers = players.map(player => 
      selectedPlayers.has(player.playerId) && player.verificationStatus !== 'rejected'
        ? {
            ...player,
            verificationStatus: 'rejected' as const,
            verificationComments: [reason]
          }
        : player
    );
    
    setPlayers(updatedPlayers);
    
    // Auto-save selected rejections
    for (const player of selectedPlayersToReject) {
      try {
        await savePlayerVerification(player.playerId, 'rejected', reason);
      } catch (error) {
        console.error(`Failed to reject player ${player.name}:`, error);
      }
    }
    
    setSelectedPlayers(new Set());
    alert(`Successfully rejected ${selectedPlayersToReject.length} selected players!`);
  };

  const handlePlayerClick = async (player: TeamPlayer) => {
    setSelectedPlayer(player);
    setShowPlayerModal(true);
  };

  const handleDocumentView = async (player: TeamPlayer, documentType: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack') => {
    try {
      let url = player.documents[documentType].url;
      
      console.log(`Attempting to view ${documentType} for player ${player.name}:`);
      console.log(`Player data:`, player);
      console.log(`Document URL from player data:`, url);
      console.log(`Document details:`, player.documents[documentType]);
      
      // If no URL in player data, try to get it from document service
      if (!url && player.userId) {
        console.log(`No URL found, trying documentUploadService for userId: ${player.userId}`);
        try {
          url = await documentUploadService.getDocumentURL(player.userId, documentType);
          console.log(`Document service returned URL:`, url);
        } catch (serviceError) {
          console.error('Document service error:', serviceError);
        }
      }
      
      if (url) {
        // Test if the URL is accessible before showing modal
        try {
          const response = await fetch(url, { method: 'HEAD' });
          if (!response.ok) {
            console.error(`Document URL returned ${response.status}: ${response.statusText}`);
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (fetchError) {
          console.error('Document URL not accessible:', fetchError);
          alert(`Document URL is not accessible. This might be due to:\n1. Firebase Storage security rules\n2. Authentication issues\n3. Document doesn't exist\n\nURL: ${url}`);
          return;
        }
        
        setSelectedDocumentType(documentType);
        setSelectedDocumentUrl(url);
        setShowDocumentModal(true);
      } else {
        console.error(`No document URL found for ${documentType}`);
        alert(`Document not available for ${documentType}. Please check if the document has been uploaded.`);
      }
    } catch (error) {
      console.error('Error loading document:', error);
      alert('Failed to load document');
    }
  };

  const getPlayerStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-700 bg-green-100';
      case 'rejected':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-yellow-700 bg-yellow-100';
    }
  };

  const getDocumentStatusIcon = (document: DocumentStatus) => {
    if (document.verified) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (document.url) {
      return <Clock className="w-4 h-4 text-yellow-600" />;
    } else {
      return <X className="w-4 h-4 text-red-600" />;
    }
  };

  const calculateTeamStatus = () => {
    const approvedCount = players.filter(p => p.verificationStatus === 'approved').length;
    const rejectedCount = players.filter(p => p.verificationStatus === 'rejected').length;
    const pendingCount = players.filter(p => p.verificationStatus === 'pending').length;

    // Check if all players have verified documents
    const allDocumentsVerified = players.every(player => {
      const docs = player.documents || {};
      return docs.profilePhoto?.verified && 
             docs.aadhaarFront?.verified && 
             docs.aadhaarBack?.verified;
    });

    if (rejectedCount > 0) {
      return 'rejected';
    } else if (pendingCount === 0 && approvedCount === players.length && allDocumentsVerified) {
      return 'verified';
    } else if (approvedCount > 0 || allDocumentsVerified) {
      return 'partial_verification';
    } else {
      return 'pending';
    }
  };

  const savePlayerVerification = async (playerId: string, status: 'approved' | 'rejected', comments: string, currentPlayers?: TeamPlayer[]) => {
    if (!teamData || !user) {
      throw new Error('Missing team data or user');
    }

    const playersToUse = currentPlayers || players;
    const player = playersToUse.find(p => p.playerId === playerId);
    if (!player) {
      throw new Error(`Player with ID ${playerId} not found`);
    }

    console.log(`Saving verification for player ${player.name}: ${status}`);

    try {
      // Update individual user document with verification status
      if (player.userId) {
        const userRef = doc(db, "users", player.userId);
        await updateDoc(userRef, {
          [`teams.${teamIdStr}.verificationStatus`]: status,
          [`teams.${teamIdStr}.verificationComments`]: [comments],
          [`teams.${teamIdStr}.verifiedAt`]: new Date().toISOString(),
          [`teams.${teamIdStr}.verifiedBy`]: user.uid,
        });
        console.log(`Updated user document for ${player.name}`);
      }

      return { success: true, playerId, status };
    } catch (error) {
      console.error(`Error saving verification for player ${player.name}:`, error);
      throw error;
    }
  };

  const saveTeamVerificationStatus = async (updatedPlayers: TeamPlayer[]) => {
    if (!teamData || !user) return;

    try {
      const allPlayersVerified = updatedPlayers.every(p => p.verificationStatus === 'approved');
      const hasRejectedPlayers = updatedPlayers.some(p => p.verificationStatus === 'rejected');
      
      let newTeamStatus = teamData.status;
      if (hasRejectedPlayers) {
        newTeamStatus = 'rejected';
      } else if (allPlayersVerified) {
        newTeamStatus = 'verified';
      } else {
        newTeamStatus = 'partial_verification';
      }

      // Helper function to safely convert dates to ISO string
      const safeToISOString = (date: any): string | null => {
        if (!date) return null;
        if (typeof date === 'string') {
          const parsedDate = new Date(date);
          return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
        }
        if (date instanceof Date) {
          return isNaN(date.getTime()) ? null : date.toISOString();
        }
        if (date?.seconds) { // Firestore Timestamp
          return new Date(date.seconds * 1000).toISOString();
        }
        return null;
      };

      // Update team document
      const teamRef = doc(db, "teams", teamIdStr!);
      const cleanedPlayers = updatedPlayers.map(player => ({
        ...player,
        addedAt: safeToISOString(player.addedAt) || new Date().toISOString(),
        documents: {
          profilePhoto: {
            ...player.documents.profilePhoto,
            uploadedAt: safeToISOString(player.documents.profilePhoto.uploadedAt)
          },
          aadhaarFront: {
            ...player.documents.aadhaarFront,
            uploadedAt: safeToISOString(player.documents.aadhaarFront.uploadedAt)
          },
          aadhaarBack: {
            ...player.documents.aadhaarBack,
            uploadedAt: safeToISOString(player.documents.aadhaarBack.uploadedAt)
          }
        }
      }));
      
      await updateDoc(teamRef, {
        players: cleanedPlayers,
        status: newTeamStatus,
        verifiedAt: new Date().toISOString(),
        verifiedBy: user.uid,
        updatedAt: new Date().toISOString(),
      });

      console.log(`Updated team document with status: ${newTeamStatus}`);
    } catch (error) {
      console.error('Error saving team verification status:', error);
      throw error;
    }
  };

  const handleSaveVerification = async () => {
    if (!teamData) return;

    setSaving(true);
    setError("");

    try {
      const newStatus = calculateTeamStatus();
      
      // Clean players data before saving
      const cleanedPlayers = players.map(player => ({
        ...player,
        addedAt: player.addedAt ? player.addedAt.toISOString() : new Date().toISOString(),
        documents: {
          profilePhoto: {
            ...player.documents.profilePhoto,
            uploadedAt: player.documents.profilePhoto.uploadedAt ? player.documents.profilePhoto.uploadedAt.toISOString() : null
          },
          aadhaarFront: {
            ...player.documents.aadhaarFront,
            uploadedAt: player.documents.aadhaarFront.uploadedAt ? player.documents.aadhaarFront.uploadedAt.toISOString() : null
          },
          aadhaarBack: {
            ...player.documents.aadhaarBack,
            uploadedAt: player.documents.aadhaarBack.uploadedAt ? player.documents.aadhaarBack.uploadedAt.toISOString() : null
          }
        }
      }));
      
      // Update team document
      const teamRef = doc(db, "teams", teamIdStr!);
      await updateDoc(teamRef, {
        players: cleanedPlayers,
        status: newStatus,
        verifiedAt: new Date().toISOString(),
        verifiedBy: user?.uid,
        updatedAt: new Date().toISOString(),
      });

      // Also update individual user documents with verification status
      for (const player of players) {
        if (player.userId && player.verificationStatus) {
          try {
            const userRef = doc(db, "users", player.userId);
            await updateDoc(userRef, {
              [`teams.${teamIdStr}.verificationStatus`]: player.verificationStatus,
              [`teams.${teamIdStr}.verificationComments`]: player.verificationComments,
              [`teams.${teamIdStr}.verifiedAt`]: new Date().toISOString(),
              [`teams.${teamIdStr}.verifiedBy`]: user?.uid,
            });
          } catch (userUpdateError) {
            console.error(`Error updating user ${player.userId}:`, userUpdateError);
          }
        }
      }

      alert('Verification saved successfully!');
      
      // Redirect back to dashboard
      router.push(`/${lang}/verification/dashboard`);
    } catch (err: any) {
      console.error("Error saving verification:", err);
      setError("Failed to save verification. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#CE4520]" />
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
          <Button 
            onClick={() => router.push(`/${lang}/verification/dashboard`)}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return null;
  }

  const approvedCount = players.filter(p => p.verificationStatus === 'approved').length;
  const rejectedCount = players.filter(p => p.verificationStatus === 'rejected').length;
  const pendingCount = players.filter(p => p.verificationStatus === 'pending').length;
  
  // Document verification stats
  const documentsVerifiedCount = players.filter(player => {
    const docs = player.documents || {};
    return docs.profilePhoto?.verified && 
           docs.aadhaarFront?.verified && 
           docs.aadhaarBack?.verified;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/${lang}/verification/dashboard`)}
            className="flex items-center text-[#F28C38] hover:text-[#E67A26] mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="text-center mb-8">
            <div className="mb-4">
              <Image 
                src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" 
                alt="Isha Logo" 
                width={80} 
                height={80} 
                className="mx-auto"
              />
            </div>
            <h1 className="text-3xl font-bold text-[#4A2F1D] mb-2">
              {teamData.teamName} - Verification
            </h1>
            <p className="text-gray-600">
              {teamData.sportId} • {teamData.gender === 'F' ? 'Women' : 'Men'} • {teamData.panchayat}
            </p>
          </div>
        </div>

        {/* Team Status and Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="font-semibold text-green-800">{approvedCount}</p>
                <p className="text-xs text-green-600">Approved</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <X className="w-6 h-6 text-red-600 mx-auto mb-1" />
                <p className="font-semibold text-red-800">{rejectedCount}</p>
                <p className="text-xs text-red-600">Rejected</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                <p className="font-semibold text-yellow-800">{pendingCount}</p>
                <p className="text-xs text-yellow-600">Pending</p>
              </div>
            </div>
            
            <div className="flex gap-3 flex-wrap">
              {(() => {
                const unverifiedCount = players.filter(p => p.verificationStatus !== 'approved').length;
                return unverifiedCount > 0 && (
                  <button
                    onClick={handleBulkVerifyAll}
                    className="bg-[#3A7F3F] hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center text-sm"
                    disabled={saving}
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Verify All ({unverifiedCount})
                  </button>
                );
              })()}
              
              {selectedPlayers.size > 0 && (
                <>
                  <button
                    onClick={handleBulkVerifySelected}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center text-sm"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Verify Selected ({selectedPlayers.size})
                  </button>
                  
                  <button
                    onClick={handleBulkRejectSelected}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center text-sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject Selected ({selectedPlayers.size})
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-[#4A2F1D] flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Team Players ({players.length})
            </h2>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={(() => {
                        const selectablePlayers = players.filter(p => p.verificationStatus !== 'approved' && p.verificationStatus !== 'rejected');
                        return selectablePlayers.length > 0 && selectedPlayers.size === selectablePlayers.length;
                      })()}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-[#F28C38] focus:ring-[#F28C38]"
                      disabled={players.filter(p => p.verificationStatus !== 'approved' && p.verificationStatus !== 'rejected').length === 0}
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Player</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Documents</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {players.map((player, index) => (
                  <tr key={player.playerId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {player.verificationStatus === 'approved' || player.verificationStatus === 'rejected' ? (
                        <div className="flex items-center justify-center">
                          {player.verificationStatus === 'approved' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <X className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      ) : (
                        <input
                          type="checkbox"
                          checked={selectedPlayers.has(player.playerId)}
                          onChange={() => handlePlayerSelect(player.playerId)}
                          className="rounded border-gray-300 text-[#F28C38] focus:ring-[#F28C38]"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-gray-900">{player.name}</div>
                        <div className="text-sm text-gray-600">Age: {player.age} • {player.gender === 'M' ? 'Male' : 'Female'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900">+91 {player.phone}</div>
                        <div className="text-gray-600">{player.profileData.village}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        player.position === 'main' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {player.position === 'main' ? 'Main' : 'Substitute'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {getDocumentStatusIcon(player.documents.profilePhoto)}
                        {getDocumentStatusIcon(player.documents.aadhaarFront)}
                        {getDocumentStatusIcon(player.documents.aadhaarBack)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlayerStatusColor(player.verificationStatus)}`}>
                        {player.verificationStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handlePlayerClick(player)}
                        className="text-[#F28C38] hover:text-[#E67A26] font-medium text-sm transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200">
            {players.map((player, index) => (
              <div key={player.playerId} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start space-x-3">
                    {player.verificationStatus === 'approved' || player.verificationStatus === 'rejected' ? (
                      <div className="mt-1 flex items-center justify-center">
                        {player.verificationStatus === 'approved' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <X className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                    ) : (
                      <input
                        type="checkbox"
                        checked={selectedPlayers.has(player.playerId)}
                        onChange={() => handlePlayerSelect(player.playerId)}
                        className="mt-1 rounded border-gray-300 text-[#F28C38] focus:ring-[#F28C38]"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{player.name}</h3>
                      <p className="text-sm text-gray-600">+91 {player.phone}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlayerStatusColor(player.verificationStatus)}`}>
                    {player.verificationStatus}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm text-gray-600">
                    Age: {player.age} • {player.gender === 'M' ? 'Male' : 'Female'} • {player.position}
                  </div>
                  <div className="flex space-x-1">
                    {getDocumentStatusIcon(player.documents.profilePhoto)}
                    {getDocumentStatusIcon(player.documents.aadhaarFront)}
                    {getDocumentStatusIcon(player.documents.aadhaarBack)}
                  </div>
                </div>
                
                <button
                  onClick={() => handlePlayerClick(player)}
                  className="w-full bg-[#F28C38] hover:bg-[#E67A26] text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>


        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>
      
      {/* Player Detail Modal */}
      {selectedPlayer && showPlayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-[#4A2F1D]">{selectedPlayer.name}</h2>
                  <p className="text-gray-600">+91 {selectedPlayer.phone}</p>
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
              {/* Documents - Show First */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 text-lg">Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(['profilePhoto', 'aadhaarFront', 'aadhaarBack'] as const).map((docType) => {
                    const doc = selectedPlayer.documents[docType];
                    return (
                      <div key={docType} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">
                            {docType === 'profilePhoto' ? 'Profile Photo' : 
                             docType === 'aadhaarFront' ? 'Aadhaar Front' : 'Aadhaar Back'}
                          </span>
                          {getDocumentStatusIcon(doc)}
                        </div>
                        
                        {/* Show document image directly */}
                        <div className="mb-3">
                          {doc.url ? (
                            <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                              <Image
                                src={doc.url}
                                alt={`${docType} document`}
                                fill
                                className="object-cover cursor-pointer hover:opacity-75 transition-opacity"
                                onClick={() => handleDocumentView(selectedPlayer, docType)}
                                unoptimized={doc.url.includes('firebasestorage.googleapis.com')}
                                onLoadingComplete={() => {
                                  console.log(`Successfully loaded ${docType} image:`, doc.url);
                                }}
                                onError={(e) => {
                                  console.error(`Failed to load ${docType} image:`, doc.url);
                                  console.error('Image error event:', e);
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="flex items-center justify-center h-full text-red-600 text-xs p-2">
                                        <div class="text-center">
                                          <div class="mb-2">⚠️</div>
                                          <div>Failed to load image</div>
                                          <div class="text-gray-500 mt-1 break-all">${doc.url}</div>
                                        </div>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                                <Eye className="w-6 h-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                              <div className="text-center text-gray-500">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                <p className="text-sm">Document not uploaded</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {doc.url && (
                          <button
                            onClick={() => handleDocumentView(selectedPlayer, docType)}
                            className="w-full text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center py-2 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Full Size
                          </button>
                        )}
                      </div>
                    );
                  })}
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
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Location</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Village:</span> {selectedPlayer.profileData.village}</div>
                    <div><span className="font-medium">Panchayat:</span> {selectedPlayer.profileData.panchayat}</div>
                    <div><span className="font-medium">District:</span> {selectedPlayer.profileData.district}</div>
                    <div><span className="font-medium">State:</span> {selectedPlayer.profileData.state}</div>
                  </div>
                </div>
              </div>

              {/* Verification Actions */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={async () => {
                    await handlePlayerStatusChange(selectedPlayer.playerId, 'approved', 'Verified by volunteer');
                    setShowPlayerModal(false);
                    alert('Player verified and saved successfully!');
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium flex items-center disabled:bg-gray-400"
                  disabled={selectedPlayer.verificationStatus === 'approved'}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Verify Player
                </button>
                
                <button
                  onClick={async () => {
                    const reason = prompt('Please provide reason for rejection:');
                    if (reason) {
                      await handlePlayerStatusChange(selectedPlayer.playerId, 'rejected', reason);
                      setShowPlayerModal(false);
                      alert('Player rejection saved successfully!');
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium flex items-center disabled:bg-gray-400"
                  disabled={selectedPlayer.verificationStatus === 'rejected'}
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject Player
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document View Modal */}
      {showDocumentModal && selectedDocumentUrl && selectedDocumentType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {selectedDocumentType === 'profilePhoto' ? 'Profile Photo' : 
                   selectedDocumentType === 'aadhaarFront' ? 'Aadhaar Front' : 'Aadhaar Back'}
                </h3>
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 text-center">
              <div className="relative max-w-4xl mx-auto">
                <Image
                  src={selectedDocumentUrl}
                  alt={`${selectedDocumentType} document`}
                  width={800}
                  height={600}
                  className="max-w-full max-h-[70vh] mx-auto border rounded-lg shadow-lg object-contain"
                  priority
                  unoptimized={selectedDocumentUrl.includes('firebasestorage.googleapis.com')}
                  onLoadingComplete={() => {
                    console.log('Full-size document loaded successfully:', selectedDocumentUrl);
                  }}
                  onError={(e) => {
                    console.error('Failed to load full-size document image:', selectedDocumentUrl);
                    console.error('Full image error event:', e);
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="flex items-center justify-center h-64 text-red-600">
                          <div class="text-center p-4">
                            <div class="text-4xl mb-4">⚠️</div>
                            <p class="font-semibold mb-2">Failed to load document image</p>
                            <p class="text-sm text-gray-500 break-all">${selectedDocumentUrl}</p>
                            <button onclick="window.open('${selectedDocumentUrl}', '_blank')" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                              Try opening in new tab
                            </button>
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