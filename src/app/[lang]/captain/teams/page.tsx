"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
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
  Loader2
} from 'lucide-react';
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc, orderBy } from "firebase/firestore";
import { addPlayerToTeam } from "@/lib/actions/captain/addPlayerToTeam";
import { removePlayerFromTeam } from "@/lib/actions/captain/removePlayerFromTeam";
import { submitTeamForVerification } from "@/lib/actions/captain/submitTeam";
import Image from "next/image";
import { PlayerDocumentUpload } from "@/components/players";
import { checkAndUpdateProfileCompletion } from "@/lib/actions/profile/checkProfileCompletion";
import DocumentPreview from "@/components/documents/DocumentPreview";

interface TeamPlayer {
  playerId: string;
  userId: string;
  teamId: string;
  name: string;
  phone: string;
  dob: string;
  age: number;
  gender: string;
  position: 'main' | 'substitute';
  addedAt: Date;
  addedBy: string;
  isProfileComplete: boolean;
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
    profilePhoto: {
      storagePath: string;
      url?: string | null;
      verified: boolean;
      uploadedAt?: Date | null;
      uploadedBy?: string | null;
    };
    aadhaarFront: {
      storagePath: string;
      url?: string | null;
      verified: boolean;
      uploadedAt?: Date | null;
      uploadedBy?: string | null;
    };
    aadhaarBack: {
      storagePath: string;
      url?: string | null;
      verified: boolean;
      uploadedAt?: Date | null;
      uploadedBy?: string | null;
    };
  };
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationComments?: string[];
}

interface TeamData {
  teamId: string;
  name: string;
  sportName: string;
  sportId: string;
  minPlayers: number;
  maxPlayers: number;
  maxSubstitutes: number;
  pincode: string;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  captainId: string;
  captainProfile: {
    name: string;
    phone: string;
  };
  players: TeamPlayer[];
  status: string;
  currentPlayers: number;
  currentSubstitutes: number;
}

interface SportData {
  id: string;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;
  maxSubstitutes: number;
  genderCategories: string[];
  isActive: boolean;
}


export default function MyTeamPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile } = useAuth();
  
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [sportData, setSportData] = useState<SportData | null>(null);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [playerFormData, setPlayerFormData] = useState({
    phone: '',
    firstName: '',
    lastName: '',
    dob: '',
    whatsappNumber: '',
    village: '',
    position: 'main' as 'main' | 'substitute'
  });
  const [playerExists, setPlayerExists] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Document upload states
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentPlayer, setDocumentPlayer] = useState<TeamPlayer | null>(null);

  const loadTeamData = useCallback(async () => {
    if (!user) {
      setError("User not authenticated");
      return;
    }
    
    try {
      setLoading(true);
      
      // Find captain's team
      const teamsQuery = query(
        collection(db, "teams"),
        where("captainId", "==", user.uid)
      );
      
      const querySnapshot = await getDocs(teamsQuery);
      
      if (querySnapshot.empty) {
        setError("No team found for this captain");
        return;
      }

      const teamDoc = querySnapshot.docs[0];
      const team = teamDoc.data();
      const teamIdStr = teamDoc.id;
      
      console.log("Team data:", team);

      // Load sport data from database
      let sport: SportData | null = null;
      if (team.sportId) {
        try {
          const sportRef = doc(db, "sports", team.sportId);
          const sportSnap = await getDoc(sportRef);
          if (sportSnap.exists()) {
            const sportData = sportSnap.data();
            console.log("Sport data:", team.sportId, sportData);
            sport = {
              id: sportSnap.id,
              displayName: sportData.displayName || sportData.name || team.sportName || 'Unknown Sport',
              minPlayers: sportData.teamConfig?.minPlayers || sportData.maxPlayers || team.maxPlayers || 6,
              maxPlayers: sportData.teamConfig?.maxPlayers || sportData.maxPlayers || team.maxPlayers || 6,
              maxSubstitutes: sportData.teamConfig?.maxSubstitutes || sportData.maxSubstitutes || team.maxSubstitutes || 6,
              genderCategories: sportData.genderCategories || ['mixed'],
              isActive: sportData.isActive !== false
            };
          }
        } catch (sportError) {
          console.error("Error loading sport data:", sportError);
        }
      }
      
      // Fallback if sport not found in database
      if (!sport) {
        // Use sport-specific defaults
        const defaults = team.sportName === 'Throwball' ? 
          { minPlayers: 7, maxPlayers: 7, maxSubstitutes: 2 } :
          { minPlayers: 6, maxPlayers: 6, maxSubstitutes: 6 };
          
        sport = {
          id: team.sportId || 'unknown',
          displayName: team.sportName || 'Unknown Sport',
          minPlayers: team.maxPlayers || defaults.minPlayers,
          maxPlayers: team.maxPlayers || defaults.maxPlayers,
          maxSubstitutes: team.maxSubstitutes || defaults.maxSubstitutes,
          genderCategories: team.genderCategory ? [team.genderCategory] : ['mixed'],
          isActive: true
        };
      }

      setSportData(sport);
      
      // Create team data structure using actual database values
      const actualTeamData: TeamData = {
        teamId: teamIdStr,
        name: team.teamName || team.name || '',
        sportName: sport.displayName,
        sportId: team.sportId || '',
        minPlayers: sport.minPlayers,
        maxPlayers: sport.maxPlayers,
        maxSubstitutes: sport.maxSubstitutes,
        pincode: team.pincode || '',
        panchayat: team.panchayat || '',
        taluk: team.taluk || '',
        district: team.district || '',
        state: team.state || '',
        captainId: team.captainId || '',
        captainProfile: {
          name: team.captainProfile?.name || `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim(),
          phone: team.captainProfile?.phone || userProfile?.phoneNumber || ''
        },
        players: [],
        status: team.status || 'draft',
        currentPlayers: team.currentPlayers || 0,
        currentSubstitutes: team.currentSubstitutes || 0
      };

      setTeamData(actualTeamData);

      // Load players from subcollection (excluding deleted players)
      const playersCollection = collection(db, "teams", teamIdStr, "players");
      const playersQuery = query(playersCollection, orderBy("addedAt", "asc"));
      const playersSnapshot = await getDocs(playersQuery);
      
      const loadedPlayers: TeamPlayer[] = [];
      
      for (const playerDoc of playersSnapshot.docs) {
        const playerData = playerDoc.data();
        
        // Skip deleted players
        if (playerData.isDeleted) {
          continue;
        }
        
        // Load latest document information from users collection if userId exists
        let userDocuments = playerData.documents;
        let actualProfileComplete = playerData.isProfileComplete || false;
        
        if (playerData.userId) {
          try {
            const userDocRef = doc(db, "users", playerData.userId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData.documents) {
                userDocuments = userData.documents;
                
                // Recalculate profile completion based on current documents
                actualProfileComplete = !!(
                  userDocuments.profilePhoto?.url &&
                  userDocuments.aadhaarFront?.url &&
                  userDocuments.aadhaarBack?.url
                );
              }
            }
          } catch (error) {
            console.warn(`Could not load user documents for player ${playerData.userId}:`, error);
          }
        }
        
        const player: TeamPlayer = {
          playerId: playerDoc.id,
          userId: playerData.userId || '',
          teamId: teamIdStr,
          name: playerData.name || '',
          phone: playerData.phone || '',
          dob: playerData.dateOfBirth || playerData.dob || '',
          age: playerData.age || 0,
          gender: playerData.gender || 'M',
          position: playerData.position || 'main',
          addedAt: playerData.addedAt?.toDate() || new Date(),
          addedBy: playerData.addedBy || '',
          isProfileComplete: actualProfileComplete,
          profileData: {
            firstName: playerData.profileData?.firstName || '',
            lastName: playerData.profileData?.lastName || '',
            whatsappNumber: playerData.profileData?.whatsappNumber || '',
            village: playerData.profileData?.village || '',
            panchayat: playerData.profileData?.panchayat || '',
            taluk: playerData.profileData?.taluk || '',
            district: playerData.profileData?.district || '',
            state: playerData.profileData?.state || '',
            pincode: playerData.profileData?.pincode || ''
          },
          documents: {
            profilePhoto: {
              storagePath: userDocuments?.profilePhoto?.storagePath || '',
              url: userDocuments?.profilePhoto?.url || null,
              verified: userDocuments?.profilePhoto?.verified || false,
              uploadedAt: userDocuments?.profilePhoto?.uploadedAt?.toDate ? userDocuments.profilePhoto.uploadedAt.toDate() : null,
              uploadedBy: userDocuments?.profilePhoto?.uploadedBy || null
            },
            aadhaarFront: {
              storagePath: userDocuments?.aadhaarFront?.storagePath || '',
              url: userDocuments?.aadhaarFront?.url || null,
              verified: userDocuments?.aadhaarFront?.verified || false,
              uploadedAt: userDocuments?.aadhaarFront?.uploadedAt?.toDate ? userDocuments.aadhaarFront.uploadedAt.toDate() : null,
              uploadedBy: userDocuments?.aadhaarFront?.uploadedBy || null
            },
            aadhaarBack: {
              storagePath: userDocuments?.aadhaarBack?.storagePath || '',
              url: userDocuments?.aadhaarBack?.url || null,
              verified: userDocuments?.aadhaarBack?.verified || false,
              uploadedAt: userDocuments?.aadhaarBack?.uploadedAt?.toDate ? userDocuments.aadhaarBack.uploadedAt.toDate() : null,
              uploadedBy: userDocuments?.aadhaarBack?.uploadedBy || null
            }
          },
          verificationStatus: playerData.verificationStatus || 'pending',
          verificationComments: playerData.verificationComments || []
        };
        
        loadedPlayers.push(player);
     }
      
      console.log(`Loaded ${loadedPlayers.length} players from subcollection`);
      setPlayers(loadedPlayers);
      
    } catch (err: any) {
      console.error("Error loading team:", err);
      setError("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [user, userProfile]);

  useEffect(() => {
    if (user && userProfile) {
      loadTeamData();
    }
  }, [user, userProfile, loadTeamData]);

  // Keep selectedPlayer in sync with players array changes
  useEffect(() => {
    if (selectedPlayer) {
      const updatedPlayer = players.find(p => p.playerId === selectedPlayer.playerId);
      if (updatedPlayer) {
        setSelectedPlayer(updatedPlayer);
      }
    }
  }, [players, selectedPlayer]);

  const sportConfig = sportData || { maxPlayers: 6, maxSubstitutes: 6 };
  const totalSlotsNeeded = sportConfig.maxPlayers + sportConfig.maxSubstitutes;
  const currentPlayers = players.length;
  const mainPlayers = players.filter(p => p.position === 'main').length;
  const substitutes = players.filter(p => p.position === 'substitute').length;

  const isReadOnly = teamData?.status && teamData.status !== 'draft';
  const canAddPlayer = currentPlayers < totalSlotsNeeded && !isReadOnly;
  const canAddMain = mainPlayers < sportConfig.maxPlayers && !isReadOnly;
  const canAddSubstitute = substitutes < sportConfig.maxSubstitutes && !isReadOnly;

  const handlePhoneSearch = async (phone: string) => {
    setPlayerFormData(prev => ({ ...prev, phone }));
    
    if (phone.length === 10) {
      setIsSearching(true);
      try {
        // Search in Firestore users collection with different possible phone number formats
        const usersRef = collection(db, "users");
        
        // Try multiple queries since phone numbers might be stored in different formats
        const queries = [
          query(usersRef, where("phoneNumber", "==", phone)),
          query(usersRef, where("phoneNumber", "==", `+91${phone}`)),
          query(usersRef, where("phoneNumber", "==", parseInt(phone))),
        ];

        let existingUser = null;
        
        for (const q of queries) {
          try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              existingUser = querySnapshot.docs[0].data();
              break;
            }
          } catch (queryError) {
            console.warn('Query failed, trying next format:', queryError);
            continue;
          }
        }
        
        if (existingUser) {
          setPlayerExists(true);
          setPlayerFormData(prev => ({
            ...prev,
            firstName: existingUser.firstName || '',
            lastName: existingUser.lastName || '',
            dob: existingUser.dob || '',
            whatsappNumber: existingUser.whatsappNumber || phone,
            village: existingUser.village || teamData?.panchayat.replace(' Panchayat', '') || ''
          }));
          console.log('User found in system:', existingUser.firstName, existingUser.lastName);
        } else {
          setPlayerExists(false);
          // Pre-fill with team's location data
          setPlayerFormData(prev => ({
            ...prev,
            firstName: '',
            lastName: '',
            dob: '',
            whatsappNumber: phone,
            village: teamData?.panchayat.replace(' Panchayat', '') || ''
          }));
          console.log('User not found, creating new player entry');
        }
      } catch (error) {
        console.error('Error searching for user:', error);
        setPlayerExists(false);
        // Pre-fill with team's location data - fallback
        setPlayerFormData(prev => ({
          ...prev,
          firstName: '',
          lastName: '',
          dob: '',
          whatsappNumber: phone,
          village: teamData?.panchayat.replace(' Panchayat', '') || ''
        }));
      } finally {
        setIsSearching(false);
      }
    } else {
      // Reset when phone number is not complete
      setPlayerExists(false);
      if (phone.length === 0) {
        setPlayerFormData(prev => ({
          ...prev,
          firstName: '',
          lastName: '',
          dob: '',
          whatsappNumber: '',
          village: ''
        }));
      }
    }
  };

  const calculateAge = (dob: string): number => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Handle document upload success - refresh player data
  const handleDocumentUploadSuccess = async (playerId: string, documentType: string, url: string) => {
    // Update local state immediately (optimistic update)
    setPlayers(prev => prev.map(p => 
      p.playerId === playerId 
        ? {
            ...p,
            documents: {
              ...p.documents,
              [documentType]: {
                ...p.documents[documentType],
                url: url,
                verified: false,
                uploadedAt: new Date(),
                uploadedBy: user?.uid || null
              }
            }
          }
        : p
    ));

    // Then check and update profile completion using the server action
    const player = players.find(p => p.playerId === playerId);
    if (player?.userId) {
      const result = await checkAndUpdateProfileCompletion(player.userId);
      
      // Update profile completion status
      setPlayers(prev => prev.map(p => 
        p.playerId === playerId 
          ? { ...p, isProfileComplete: result.isComplete || false }
          : p
      ));
    }
  };

  // Handle profile completion status change
  const handleProfileComplete = (playerId: string, isComplete: boolean) => {
    setPlayers(prev => prev.map(p => 
      p.playerId === playerId 
        ? { ...p, isProfileComplete: isComplete }
        : p
    ));
  };

  const openDocumentModal = (player: TeamPlayer) => {
    setDocumentPlayer(player);
    setShowDocumentModal(true);
  };

  const resetPlayerForm = () => {
    setPlayerFormData({
      phone: '',
      firstName: '',
      lastName: '',
      dob: '',
      whatsappNumber: '',
      village: '',
      position: 'main'
    });
    setPlayerExists(false);
  };

  const handleAddPlayer = async () => {
    if (!teamData) {
      console.error('handleAddPlayer: teamData is not available');
      alert('Team data is not loaded yet. Please wait a moment and try again.');
      return;
    }
    
    console.log('handleAddPlayer: Starting player creation process');
    setIsSubmitting(true);
    
    try {
      // Check for duplicate player by phone number
      const existingPlayerInTeam = players.find(p => p.phone === playerFormData.phone);
      if (existingPlayerInTeam) {
        alert(`A player with phone number ${playerFormData.phone} is already in this team.`);
        setIsSubmitting(false);
        return;
      }
      
      // Check if player is already in another team for this event
      if (playerExists) {
        // TODO: Add event-wide check for player participation
        const teamsRef = collection(db, "teams");
        const eventTeamsQuery = query(teamsRef, where("eventId", "==", "gramotsavam_2025"));
        const eventTeamsSnapshot = await getDocs(eventTeamsQuery);
        
        let playerInOtherTeam = false;
        eventTeamsSnapshot.forEach((teamDoc) => {
          if (teamDoc.id !== teamData.teamId) { // Don't check current team
            const teamPlayers = teamDoc.data().players || [];
            const foundInTeam = teamPlayers.find((p: any) => p.phone === playerFormData.phone);
            if (foundInTeam) {
              playerInOtherTeam = true;
            }
          }
        });
        
        if (playerInOtherTeam) {
          alert(`This player is already registered in another team for this event.`);
          setIsSubmitting(false);
          return;
        }
      }
      
      // Auto-select correct position based on availability
      let playerPosition = playerFormData.position;
      if (playerPosition === 'main' && !canAddMain) {
        if (canAddSubstitute) {
          playerPosition = 'substitute';
          console.log('Main slots full, automatically assigned as substitute');
        } else {
          alert('No available positions. Team is full.');
          setIsSubmitting(false);
          return;
        }
      } else if (playerPosition === 'substitute' && !canAddSubstitute) {
        if (canAddMain) {
          playerPosition = 'main';
          console.log('Substitute slots full, automatically assigned as main');
        } else {
          alert('No available positions. Team is full.');
          setIsSubmitting(false);
          return;
        }
      }
      
      // Use the server action to add player to team
      console.log('handleAddPlayer: Calling addPlayerToTeam server action');
      
      try {
        const result = await addPlayerToTeam({
          teamId: teamData.teamId,
          playerData: {
            name: `${playerFormData.firstName} ${playerFormData.lastName}`,
            firstName: playerFormData.firstName,
            lastName: playerFormData.lastName,
            phone: playerFormData.phone,
            dateOfBirth: playerFormData.dob,
            gender: sportData?.genderCategories[0] === 'women' ? 'F' : 'M',
            whatsappNumber: playerFormData.whatsappNumber || playerFormData.phone,
            pincode: teamData.pincode,
            village: playerFormData.village,
            panchayat: teamData.panchayat,
            taluk: teamData.taluk,
            district: teamData.district,
            state: teamData.state,
            position: playerPosition
          },
          captainId: user!.uid
        });
        
        console.log('handleAddPlayer: Server action result:', result);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to add player to team');
        }
        
        console.log(`Player added successfully with ID: ${result.playerId}`);
        
        // Reload team data to get updated player list
        await loadTeamData();
        
        setShowAddPlayerModal(false);
        resetPlayerForm();
      } catch (error) {
        console.error('Error adding player:', error);
        alert(`Failed to add player: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error adding player:', error);
      alert(`Failed to add player: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removePlayer = async (playerId: string) => {
    if (!teamData || !user) return;
    
    if (!confirm('Are you sure you want to remove this player from the team?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Use the server action instead of direct Firestore calls
      const result = await removePlayerFromTeam({
        teamId: teamData.teamId,
        playerId: playerId,
        captainId: user.uid
      });
      
      if (result.success) {
        // Reload team data to reflect changes
        await loadTeamData();
        console.log('Player removed successfully');
      } else {
        alert(result.error || 'Failed to remove player');
      }
    } catch (error) {
      console.error('Error removing player:', error);
      alert('Failed to remove player. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPlayerStatusColor = (player: TeamPlayer) => {
    if (player.verificationStatus === 'verified') return 'text-[#3A7F3F] bg-green-50';
    if (player.verificationStatus === 'rejected') return 'text-red-600 bg-red-50';
    if (player.isProfileComplete) return 'text-[#C79016] bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getPlayerStatusIcon = (player: TeamPlayer) => {
    if (player.verificationStatus === 'verified') return <CheckCircle className="w-4 h-4" />;
    if (player.verificationStatus === 'rejected') return <X className="w-4 h-4" />;
    if (player.isProfileComplete) return <Clock className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const getPlayerStatusText = (player: TeamPlayer) => {
    if (player.verificationStatus === 'verified') return 'Verified';
    if (player.verificationStatus === 'rejected') return 'Rejected';
    if (player.isProfileComplete) return 'Pending Review';
    return 'Docs Incomplete';
  };

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.phone.includes(searchTerm)
  );

  const handleSubmitTeam = async () => {
    if (!teamData || !sportData) {
      alert('Team data is not loaded. Please refresh and try again.');
      return;
    }

    if (!user || !userProfile) {
      alert('User authentication required. Please log in again.');
      return;
    }

    const validationErrors = [];

    if (mainPlayers < sportData.minPlayers) {
      validationErrors.push(`Need at least ${sportData.minPlayers} main players (currently have ${mainPlayers})`);
    }

    if (players.length === 0) {
      validationErrors.push('Team must have at least one player');
    }

    const playersWithInvalidIds = players.filter(p => !p.userId);
    if (playersWithInvalidIds.length > 0) {
      validationErrors.push(`${playersWithInvalidIds.length} player(s) have missing user IDs. Please remove and re-add them.`);
    }

    const playersWithIncompleteDocuments = players.filter(player => !player.isProfileComplete);
    if (playersWithIncompleteDocuments.length > 0) {
        validationErrors.push(`${playersWithIncompleteDocuments.length} player(s) have incomplete documents. Please ensure all documents are uploaded.`);
    }

    if (sportData.genderCategories && sportData.genderCategories.length > 0) {
      const requiredGender = sportData.genderCategories[0];
      if (requiredGender === 'women') {
        const malePlayersCount = players.filter(p => p.gender === 'M').length;
        if (malePlayersCount > 0) {
          validationErrors.push(`${sportData.displayName} is only for women. Found ${malePlayersCount} male player(s).`);
        }
      } else if (requiredGender === 'men') {
        const femalePlayersCount = players.filter(p => p.gender === 'F').length;
        if (femalePlayersCount > 0) {
          validationErrors.push(`${sportData.displayName} is only for men. Found ${femalePlayersCount} female player(s).`);
        }
      }
    }

    if (validationErrors.length > 0) {
      alert(`Cannot submit team:\n\n${validationErrors.map((error, index) => `${index + 1}. ${error}`).join('\n')}`);
      return;
    }

    const confirmMessage = `Submit team "${teamData.name}" for ${sportData.displayName}?\n\nPlayers: ${currentPlayers}\nDocuments: Complete\nSport: ${sportData.displayName}\n\nThis action cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      console.log('Submitting team for verification...', {
        teamId: teamData.teamId,
        sportId: sportData.id,
        sportName: sportData.displayName,
        playerCount: currentPlayers
      });

      const result = await submitTeamForVerification({ 
        teamId: teamData.teamId,
        captainId: user.uid,
        validation: {
          playerCount: mainPlayers,
          requiredPlayers: sportData.minPlayers,
          documentsComplete: playersWithIncompleteDocuments.length === 0,
          sportGenderCategory: sportData.genderCategories?.[0] || 'mixed'
        }
      });
      
      if (result.success) {
        alert(`Team "${teamData.name}" submitted for verification successfully!\n\nYou will be notified once the review is complete.`);
        router.push(`/${lang}/captain/dashboard`);
      } else {
        throw new Error(result.error || 'Failed to submit team');
      }
    } catch (error) {
      console.error('Error submitting team:', error);
      alert(`Failed to submit team: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact support.`);
    }
  };

  if (loading) {
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
          <p className="text-gray-600 mb-4">{error || "Failed to load team data"}</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header - updated to match current styles */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            {teamData.name}
          </h1>
          <p className="text-gray-600">
            Manage your team and players for {teamData.sportName}
          </p>
        </div>

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

        {/* Team Progress Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Players</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">{currentPlayers}/{totalSlotsNeeded}</p>
              </div>
              <Users className="w-8 h-8 text-[#F28C38]" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Main Players</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">{mainPlayers}/{sportConfig.maxPlayers}</p>
              </div>
              <Users className="w-8 h-8 text-[#3A7F3F]" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Substitutes</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">{substitutes}/{sportConfig.maxSubstitutes}</p>
              </div>
              <Users className="w-8 h-8 text-[#C79016]" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Profiles Complete</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">
                  {players.filter(p => p.isProfileComplete).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-[#3A7F3F]" />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button
              onClick={() => setShowAddPlayerModal(true)}
              disabled={!canAddPlayer}
              className="bg-[#F28C38] hover:bg-[#E67A26] disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Add Player</span>
            </button>
            
            <div className="text-xs sm:text-sm text-gray-600 flex flex-col sm:flex-row gap-1 sm:gap-2">
              <div className="bg-[#3A7F3F] text-white px-2 py-1 rounded text-xs">
                {sportConfig.maxPlayers - mainPlayers} main slots left
              </div>
              <div className="bg-[#C79016] text-white px-2 py-1 rounded text-xs">
                {sportConfig.maxSubstitutes - substitutes} sub slots left
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
            />
          </div>
        </div>

        {/* Players Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="px-4 sm:px-6 py-4 bg-[#4A2F1D] text-white">
            <h2 className="text-lg sm:text-xl font-bold">Team Players</h2>
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">No Players Added Yet</h3>
              <p className="text-gray-500 mb-6 text-sm sm:text-base">Start building your team by adding players</p>
              <button
                onClick={() => setShowAddPlayerModal(true)}
                className="bg-[#F28C38] hover:bg-[#E67A26] text-white px-6 py-3 rounded-lg font-semibold"
              >
                Add First Player
              </button>
            </div>
          ) : (
            <div className="overflow-hidden">
              {/* Mobile Card View */}
              <div className="block sm:hidden">
                <div className="max-h-96 overflow-y-auto">
                  {filteredPlayers.map((player) => (
                    <div key={player.playerId} className="border-b border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-[#4A2F1D] text-sm">
                            {player.name}
                            {player.playerId === teamData.captainId && (
                              <span className="ml-2 text-xs bg-[#F28C38] text-white px-2 py-1 rounded">Captain</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{player.phone}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedPlayer(player)}
                            className="text-[#F28C38] p-1"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {player.playerId !== teamData.captainId && (
                            <button
                              onClick={() => removePlayer(player.playerId)}
                              className="text-red-600 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            player.position === 'main' 
                              ? 'bg-[#3A7F3F] text-white' 
                              : 'bg-[#C79016] text-white'
                          }`}>
                            {player.position === 'main' ? 'Main' : 'Sub'}
                          </span>
                          <span className="text-xs text-gray-600">{player.age}y</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className={`w-2 h-2 rounded-full ${player.documents.profilePhoto.url ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`} title="Profile"></div>
                            <div className={`w-2 h-2 rounded-full ${player.documents.aadhaarFront.url ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`} title="Aadhaar Front"></div>
                            <div className={`w-2 h-2 rounded-full ${player.documents.aadhaarBack.url ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`} title="Aadhaar Back"></div>
                          </div>
                          <div className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full ${getPlayerStatusColor(player)}`}>
                            {getPlayerStatusIcon(player)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPlayers.map((player) => (
                        <tr key={player.playerId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-semibold text-[#4A2F1D] flex items-center">
                                {player.name}
                                {player.playerId === teamData.captainId && (
                                  <span className="ml-2 text-xs bg-[#F28C38] text-white px-2 py-1 rounded">Captain</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{player.phone}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              player.position === 'main' 
                                ? 'bg-[#3A7F3F] text-white' 
                                : 'bg-[#C79016] text-white'
                            }`}>
                              {player.position === 'main' ? 'Main' : 'Substitute'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {player.age} years
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-1">
                              {player.documents.profilePhoto.url ? (
                                <CheckCircle className="w-4 h-4 text-[#3A7F3F]"  />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-gray-300" title="Profile Photo Missing"></div>
                              )}
                              {player.documents.aadhaarFront.url ? (
                                <CheckCircle className="w-4 h-4 text-[#3A7F3F]" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-gray-300" title="Aadhaar Front Missing"></div>
                              )}
                              {player.documents.aadhaarBack.url ? (
                                <CheckCircle className="w-4 h-4 text-[#3A7F3F]" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-gray-300" title="Aadhaar Back Missing"></div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full ${getPlayerStatusColor(player)}`}>
                              {getPlayerStatusIcon(player)}
                              <span className="hidden sm:inline">{getPlayerStatusText(player)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setSelectedPlayer(player)}
                                className="text-[#F28C38] hover:text-[#E67A26] transition-colors"
                                title="View/Edit Player"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {player.playerId !==  teamData.captainId && (
                                <button
                                  onClick={() => removePlayer(player.playerId)}
                                  className="text-red-600 hover:text-red-800 transition-colors"
                                  title="Remove Player"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Section */}
        {!isReadOnly && sportData && mainPlayers >= sportData.minPlayers && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              
              <div>
                <h3 className="text-lg font-bold text-[#4A2F1D] mb-2">Ready to Submit?</h3>
                <p className="text-gray-600">
                  {mainPlayers >= sportData.minPlayers 
                    ? `You have ${mainPlayers} main players. Submit your team for verification.`
                    : `Add at least ${sportData.minPlayers} main players to submit.`}
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
      {showAddPlayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#4A2F1D]">Add New Player</h2>
                <button
                  onClick={() => {
                    setShowAddPlayerModal(false);
                    resetPlayerForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Phone Number Search */}
              <div>
                <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
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
                {isSearching && (
                  <p className="mt-1 text-sm text-gray-500 flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    Searching for player...
                  </p>
                )}
                {!isSearching && playerExists && (
                  <p className="mt-1 text-sm text-[#3A7F3F]">✓ Player found in system</p>
                )}
                {!isSearching && playerFormData.phone.length === 10 && !playerExists && (
                  <p className="mt-1 text-sm text-gray-600">New player - fill in details below</p>
                )}
              </div>

              {/* Player Details Form */}
              {playerFormData.phone.length === 10 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={playerFormData.firstName}
                        onChange={(e) => setPlayerFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
                        disabled={playerExists}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={playerFormData.lastName}
                        onChange={(e) => setPlayerFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
                        disabled={playerExists}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={playerFormData.dob}
                      onChange={(e) => setPlayerFormData(prev => ({ ...prev, dob: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
                      disabled={playerExists}
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
                      {canAddMain && <option value="main">Main Player</option>}
                      {canAddSubstitute && <option value="substitute">Substitute</option>}
                    </select>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
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
                  onClick={handleAddPlayer}
                  disabled={!playerFormData.firstName || !playerFormData.lastName || !playerFormData.dob || isSubmitting}
                  className="flex-1 bg-[#F28C38] hover:bg-[#E67A26] disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                >
                  {isSubmitting ? 'Adding...' : 'Add Player'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-[#4A2F1D]">{selectedPlayer.name}</h2>
                  <p className="text-gray-600">{selectedPlayer.phone}</p>
                </div>
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Player Information */}
                <div>
                  <h3 className="text-lg font-bold text-[#4A2F1D] mb-4">Player Information</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-600">Age</label>
                        <p className="font-semibold">{selectedPlayer.age} years</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Position</label>
                        <p className="font-semibold capitalize">{selectedPlayer.position}</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-600">WhatsApp Number</label>
                      <p className="font-semibold">{selectedPlayer.profileData.whatsappNumber}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-600">Village</label>
                      <p className="font-semibold">{selectedPlayer.profileData.village}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-600">Panchayat</label>
                      <p className="font-semibold">{selectedPlayer.profileData.panchayat}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-600">District</label>
                      <p className="font-semibold">{selectedPlayer.profileData.district}</p>
                    </div>
                  </div>
                </div>

                {/* Document Management */}
                <div>
                  <h3 className="text-lg font-bold text-[#4A2F1D] mb-4">Identity Documents</h3>
                  <div className="space-y-4">
                    
                    {/* Profile Photo */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Profile Photo</span>
                        <div className={`w-3 h-3 rounded-full ${selectedPlayer.documents.profilePhoto.url ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`}></div>
                      </div>
                      {selectedPlayer.documents.profilePhoto.url && isReadOnly ? (
                        <DocumentPreview
                          type="profilePhoto"
                          url={selectedPlayer.documents.profilePhoto.url}
                          label="Profile Photo"
                          verified={selectedPlayer.documents.profilePhoto.verified}
                          showActions={false}
                          size="md"
                        />
                      ) : (
                        <PlayerDocumentUpload
                          playerId={selectedPlayer.playerId}
                          playerUserId={selectedPlayer.userId}
                          documentType="profilePhoto"
                          label="Profile Photo"
                          currentUrl={selectedPlayer.documents.profilePhoto.url}
                          onSuccess={(url) => handleDocumentUploadSuccess(selectedPlayer.playerId, 'profilePhoto', url)}
                          onProfileComplete={(isComplete) => handleProfileComplete(selectedPlayer.playerId, isComplete)}
                          variant="card"
                          disabled={isReadOnly}
                        />
                      )}
                    </div>

                    {/* Aadhaar Front */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Aadhaar Front</span>
                        <div className={`w-3 h-3 rounded-full ${selectedPlayer.documents.aadhaarFront.url ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`}></div>
                      </div>
                      {selectedPlayer.documents.aadhaarFront.url && isReadOnly ? (
                        <DocumentPreview
                          type="aadhaarFront"
                          url={selectedPlayer.documents.aadhaarFront.url}
                          label="Aadhaar Front"
                          verified={selectedPlayer.documents.aadhaarFront.verified}
                          showActions={false}
                          size="md"
                        />
                      ) : (
                        <PlayerDocumentUpload
                          playerId={selectedPlayer.playerId}
                          playerUserId={selectedPlayer.userId}
                          documentType="aadhaarFront"
                          label="Aadhaar Front"
                          currentUrl={selectedPlayer.documents.aadhaarFront.url}
                          onSuccess={(url) => handleDocumentUploadSuccess(selectedPlayer.playerId, 'aadhaarFront', url)}
                          onProfileComplete={(isComplete) => handleProfileComplete(selectedPlayer.playerId, isComplete)}
                          variant="card"
                          disabled={isReadOnly}
                        />
                      )}
                    </div>

                    {/* Aadhaar Back */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Aadhaar Back</span>
                        <div className={`w-3 h-3 rounded-full ${selectedPlayer.documents.aadhaarBack.url ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`}></div>
                      </div>
                      {selectedPlayer.documents.aadhaarBack.url && isReadOnly ? (
                        <DocumentPreview
                          type="aadhaarBack"
                          url={selectedPlayer.documents.aadhaarBack.url}
                          label="Aadhaar Back"
                          verified={selectedPlayer.documents.aadhaarBack.verified}
                          showActions={false}
                          size="md"
                        />
                      ) : (
                        <PlayerDocumentUpload
                          playerId={selectedPlayer.playerId}
                          playerUserId={selectedPlayer.userId}
                          documentType="aadhaarBack"
                          label="Aadhaar Back"
                          currentUrl={selectedPlayer.documents.aadhaarBack.url}
                          onSuccess={(url) => handleDocumentUploadSuccess(selectedPlayer.playerId, 'aadhaarBack', url)}
                          onProfileComplete={(isComplete) => handleProfileComplete(selectedPlayer.playerId, isComplete)}
                          variant="card"
                          disabled={isReadOnly}
                        />
                      )}
                    </div>

                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {/* Remove Player button - disabled for captain */}
                {!selectedPlayer.playerId.startsWith('captain_') && !isReadOnly ? (
                  <button
                    onClick={() => {
                      removePlayer(selectedPlayer.playerId);
                      setSelectedPlayer(null);
                    }}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Remove Player
                  </button>
                ) : (
                  <button
                    className="px-6 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed transition-colors"
                    disabled
                  >
                    { isReadOnly ? 'Cannot Remove (Team Submitted)' : 'Cannot Remove Player' }
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}