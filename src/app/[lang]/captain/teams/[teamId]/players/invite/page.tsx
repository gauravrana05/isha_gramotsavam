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
  Loader2
} from 'lucide-react';
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";
import { documentUploadService } from "@/lib/services/documentUploadService";
import Image from "next/image";

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
  maxPlayers: number;
  maxSubstitutes: number;
  panchayat: string;
  taluk:string;
  district: string;
  state: string;
  captainId: string;
  captainProfile: {
    name: string;
    phone: string;
  };
  players: TeamPlayer[];
  status: string;
}

const SPORT_CONFIG = {
  volleyball: { maxPlayers: 6, maxSubstitutes: 6 },
  throwball: { maxPlayers: 7, maxSubstitutes: 2 }
};

export default function CaptainPlayerManagement() {
  const router = useRouter();
  const { lang, teamId } = useParams();
  const { user, userProfile } = useAuth();
  
  const [teamData, setTeamData] = useState<TeamData | null>(null);
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
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [isUploading, setIsUploading] = useState<{[key: string]: boolean}>({});
  if (!teamId || (Array.isArray(teamId) && teamId.length === 0)) {
    throw new Error("Team ID is missing or invalid");
  }
  const teamIdStr :string = Array.isArray(teamId) ? teamId[0] : teamId;

  const loadTeamData = useCallback(async () => {
    if (!teamIdStr) {
      setError("Team ID is missing");
      return;
    }
    
    try {
      const teamRef = doc(db, "teams", teamIdStr);
      const teamSnap = await getDoc(teamRef);

      if (!teamSnap.exists()) {
        setError("Team not found");
        return;
      }

      const team = teamSnap.data();
      console.log("Team data:", team);
      
      // Create mock team data structure
      const mockTeamData: TeamData = {
        teamId: teamIdStr || '',
        name: team.teamName || team.name || 'Team Name',
        sportName: team.sport || team.sportName || 'Volleyball',
        sportId: (team.sport || team.sportName || 'volleyball').toLowerCase(),
        maxPlayers: SPORT_CONFIG.volleyball.maxPlayers,
        maxSubstitutes: SPORT_CONFIG.volleyball.maxSubstitutes,
        panchayat: team.panchayat || 'Panchayat Name',
        taluk: team.taluk || 'Taluk Name',
        district: team.district || 'District Name',
        state: team.state || 'State Name',
        captainId: team.captainId || user?.uid || '',
        captainProfile: {
          name: userProfile?.name || 'Captain Name',
          phone: userProfile?.phoneNumber || '+919876543210'
        },
        players: [],
        status: team.status || 'draft'
      };

      // Create captain player entry
      const captainPlayer: TeamPlayer = {
        playerId: `captain_${user?.uid}`,
        userId: user?.uid || '',
        teamId: teamIdStr,
        name: `${userProfile?.firstName} ${userProfile?.lastName}`.trim() || 'Captain Name',
        phone: userProfile?.phoneNumber || '+919876543210',
        dob: userProfile?.dob || '1990-01-01',
        age: userProfile?.dob ? calculateAge(userProfile.dob) : 25,
        gender: userProfile?.gender || 'M',
        position: 'main',
        addedAt: new Date(),
        addedBy: 'system',
        profileComplete: true,
        profileData: {
          firstName: userProfile?.firstName || 'Captain',
          lastName: userProfile?.lastName || 'Name',
          whatsappNumber: userProfile?.whatsappNumber || userProfile?.phoneNumber || '',
          village: userProfile?.village || team.panchayat?.replace(' Panchayat', '') || '',
          panchayat: team.panchayat || 'Panchayat Name',
          taluk: userProfile?.taluk || 'Taluk',
          district: team.district || 'District Name',
          state: team.state || 'State Name',
          pincode: userProfile?.pincode || '000000'
        },
        documents: {
          profilePhoto: {
            storagePath: `profilePhotos/${user?.uid}/profile_photo`,
            url: userProfile?.profilePhotoURL || null,
            verified: false,
            uploadedAt: userProfile?.profilePhotoURL ? new Date() : null,
            uploadedBy: user?.uid || null
          },
          aadhaarFront: {
            storagePath: `aadhaar/${user?.uid}/front_`,
            url: userProfile?.aadhaarFrontURL || null,
            verified: false,
            uploadedAt: userProfile?.aadhaarFrontURL ? new Date() : null,
            uploadedBy: user?.uid || null
          },
          aadhaarBack: {
            storagePath: `aadhaar/${user?.uid}/back_`,
            url: userProfile?.aadhaarBackURL || null,
            verified: false,
            uploadedAt: userProfile?.aadhaarBackURL ? new Date() : null,
            uploadedBy: user?.uid || null
          }
        },
        verificationStatus: 'pending'
      };

      setTeamData(mockTeamData);
      
      // Load existing players from team data
      const existingPlayers: TeamPlayer[] = [captainPlayer]; // Start with captain
      
      // Add existing players from the team document
      if (team.players && Array.isArray(team.players)) {
        team.players.forEach((player: any) => {
          // Skip if it's the captain (to avoid duplicates)
          if (player.playerId === `captain_${user?.uid}` || player.userId === user?.uid) {
            return;
          }
          
          existingPlayers.push({
            playerId: player.playerId || `player_${Date.now()}_${Math.random()}`,
            userId: player.userId || '',
            teamId: teamIdStr,
            name: player.name || `${player.firstName || ''} ${player.lastName || ''}`.trim(),
            phone: player.phone || '',
            dob: player.dob || '',
            age: player.age || (player.dob ? calculateAge(player.dob) : 18),
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
              panchayat: player.panchayat || player.profileData?.panchayat || team.panchayat || '',
              taluk: player.taluk || player.profileData?.taluk || '',
              district: player.district || player.profileData?.district || team.district || '',
              state: player.state || player.profileData?.state || team.state || '',
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
          });
        });
      }
      
      console.log(`Loaded ${existingPlayers.length} players (including captain)`);
      setPlayers(existingPlayers);
      
    } catch (err: any) {
      console.error("Error loading team:", err);
      setError("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [teamIdStr, user, userProfile]);

  useEffect(() => {
    if (user && userProfile && teamIdStr) {
      loadTeamData();
    }
  }, [user, userProfile, teamIdStr, loadTeamData]);

  const sportConfig = teamData ? SPORT_CONFIG[teamData.sportId as keyof typeof SPORT_CONFIG] || SPORT_CONFIG.volleyball : SPORT_CONFIG.volleyball;
  const totalSlotsNeeded = sportConfig.maxPlayers;
  const currentPlayers = players.length;
  const mainPlayers = players.filter(p => p.position === 'main').length;
  const substitutes = players.filter(p => p.position === 'substitute').length;

  const canAddPlayer = currentPlayers < totalSlotsNeeded;
  const canAddMain = mainPlayers < sportConfig.maxPlayers;
  const canAddSubstitute = substitutes < sportConfig.maxSubstitutes;

  const handlePhoneSearch = async (phone: string) => {
    setPlayerFormData(prev => ({ ...prev, phone }));
    
    if (phone.length === 10) {
      setIsSearching(true);
      try {
        // Search in Firestore users collection with different possible phone number formats
        const usersRef = collection(db, "users");
        
        // Try multiple queries since phone numbers might be stored in different formats
        const queries = [
          query(usersRef, where("phoneNumber", "==", phone)),           // As string
          query(usersRef, where("phoneNumber", "==", `+91${phone}`)),   // With country code
          query(usersRef, where("phoneNumber", "==", parseInt(phone))), // As number
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

  // Helper function to clean undefined values from objects before Firestore save
  const cleanFirestoreData = (obj: any): any => {
    if (obj === undefined) {
      return null; // Convert undefined to null (Firestore accepts null but not undefined)
    }
    
    if (obj === null) {
      return null; // Keep null as is
    }
    
    if (Array.isArray(obj)) {
      return obj.map(cleanFirestoreData);
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = cleanFirestoreData(value);
        cleaned[key] = cleanedValue; // Include null values, exclude only undefined
      }
      return cleaned;
    }
    
    return obj;
  };

  // Document upload handlers
  const handleDocumentUpload = async (
    player: TeamPlayer, 
    documentType: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack', 
    file: File
  ) => {
    if (!player.userId) {
      console.error('Player userId is missing:', player);
      alert('Error: Player user ID is missing. Cannot upload document.');
      return;
    }

    console.log('Uploading document:', { userId: player.userId, documentType });
    const uploadKey = `${player.userId}_${documentType}`;
    
    try {
      setIsUploading(prev => ({ ...prev, [uploadKey]: true }));
      setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }));
      
      let downloadURL: string;
      
      // Use appropriate upload method based on document type
      switch (documentType) {
        case 'profilePhoto':
          downloadURL = await documentUploadService.uploadProfilePhoto(
            player.userId, 
            file,
            (progress) => {
              setUploadProgress(prev => ({ ...prev, [uploadKey]: progress.progress }));
            }
          );
          break;
        case 'aadhaarFront':
          downloadURL = await documentUploadService.uploadAadhaarFront(
            player.userId, 
            file,
            (progress) => {
              setUploadProgress(prev => ({ ...prev, [uploadKey]: progress.progress }));
            }
          );
          break;
        case 'aadhaarBack':
          downloadURL = await documentUploadService.uploadAadhaarBack(
            player.userId, 
            file,
            (progress) => {
              setUploadProgress(prev => ({ ...prev, [uploadKey]: progress.progress }));
            }
          );
          break;
        default:
          throw new Error(`Invalid document type: ${documentType}`);
      }
      
      // Update player document in Firestore
      const playerDocRef = doc(db, "users", player.userId);
      
      // Check if this is an old player with custom user ID - skip Firestore update for now
      if (player.userId.startsWith('user_')) {
        console.warn(`Skipping Firestore update for old player with custom ID: ${player.userId}`);
        console.warn('Please recreate this player to get a real Firebase user ID');
        alert('This player was created with an old system. Please remove and re-add this player to enable document uploads.');
        return;
      }
      
      const updateData: any = {
        [`documents.${documentType}.storagePath`]: documentUploadService.getStoragePath(player.userId, documentType),
        [`documents.${documentType}.url`]: downloadURL,
        [`documents.${documentType}.verified`]: false,
        [`documents.${documentType}.uploadedAt`]: new Date(),
        [`documents.${documentType}.uploadedBy`]: user!.uid,
        currentTeamId: teamIdStr
      };
      
      await updateDoc(playerDocRef, cleanFirestoreData(updateData));
      
      // Update local state
      setPlayers(prev => prev.map(p => 
        p.userId === player.userId 
          ? {
              ...p,
              documents: {
                ...p.documents,
                [documentType]: {
                  storagePath: documentUploadService.getStoragePath(player.userId, documentType),
                  url: downloadURL,
                  verified: false,
                  uploadedAt: new Date(),
                  uploadedBy: user!.uid
                }
              }
            }
          : p
      ));
      
    } catch (error) {
      console.error(`Error uploading ${documentType}:`, error);
      alert(`Failed to upload ${documentType}. Please try again.`);
    } finally {
      setIsUploading(prev => ({ ...prev, [uploadKey]: false }));
      setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }));
    }
  };

  const openDocumentModal = (player: TeamPlayer) => {
    setDocumentPlayer(player);
    setShowDocumentModal(true);
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
      // Create Firebase Authentication user first
      console.log('handleAddPlayer: Calling createPlayerUser function');
      const createPlayerUser = httpsCallable(functions, 'createPlayerUser');
      let result;
      try {
        result = await createPlayerUser({
          phoneNumber: playerFormData.phone,
          firstName: playerFormData.firstName,
          lastName: playerFormData.lastName,
          dob: playerFormData.dob,
          gender: teamData.sportId === 'volleyball' ? 'M' : 'F',
          whatsappNumber: playerFormData.whatsappNumber || playerFormData.phone,
          village: playerFormData.village,
          panchayat: teamData.panchayat,
          taluk: teamData.taluk,
          district: teamData.district,
          state: teamData.state,
          teamId: teamData.teamId
        });
      } catch (functionError) {
        console.error('handleAddPlayer: Firebase function call failed:', functionError);
        throw new Error(`Firebase function failed: ${functionError instanceof Error ? functionError.message : 'Unknown function error'}`);
      }
      
      const resultData = result.data as { success: boolean; userId: string; existed: boolean; message: string };
      console.log('handleAddPlayer: Function result:', resultData);
      if (!resultData.success) {
        throw new Error(resultData.message || 'Failed to create player user');
      }

      const realUserId = resultData.userId;
      const playerId = `player_${Date.now()}`;
      
      const newPlayer: TeamPlayer = {
        playerId: playerId,
        userId: realUserId, // Use the actual Firebase user ID
        teamId: teamData.teamId,
        name: `${playerFormData.firstName} ${playerFormData.lastName}`,
        phone: playerFormData.phone,
        dob: playerFormData.dob,
        age: calculateAge(playerFormData.dob),
        gender: teamData.sportId === 'volleyball' ? 'M' : 'F',
        position: playerPosition,
        addedAt: new Date(),
        addedBy: user!.uid,
        profileComplete: true,
        profileData: {
          firstName: playerFormData.firstName,
          lastName: playerFormData.lastName,
          whatsappNumber: playerFormData.whatsappNumber,
          village: playerFormData.village,
          panchayat: teamData.panchayat,
          taluk: 'Taluk',
          district: teamData.district,
          state: teamData.state,
          pincode: '000000'
        },
        documents: {
          profilePhoto: {
            storagePath: `profilePhotos/${realUserId}/profile_photo`,
            url: null,
            verified: false,
            uploadedAt: null,
            uploadedBy: null
          },
          aadhaarFront: {
            storagePath: `aadhaar/${realUserId}/front_${Date.now()}`,
            url: null,
            verified: false,
            uploadedAt: null,
            uploadedBy: null
          },
          aadhaarBack: {
            storagePath: `aadhaar/${realUserId}/back_${Date.now()}`,
            url: null,
            verified: false,
            uploadedAt: null,
            uploadedBy: null
          }
        },
        verificationStatus: 'pending'
      };

      // Update local state
      const updatedPlayers = [...players, newPlayer];
      setPlayers(updatedPlayers);
      
      // Save to team's players array in Firestore
      console.log('handleAddPlayer: Saving player to Firestore');
      const teamRef = doc(db, "teams", teamData.teamId);
      const playersToSave = updatedPlayers
        .filter(p => !p.playerId.startsWith('captain_')) // Don't save captain in players array
        .map(cleanFirestoreData); // Clean undefined values
      
      try {
        await updateDoc(teamRef, {
          players: playersToSave,
          updatedAt: new Date().toISOString()
        });
        console.log('handleAddPlayer: Successfully saved to Firestore');
      } catch (firestoreError) {
        console.error('handleAddPlayer: Firestore update failed:', firestoreError);
        throw new Error(`Failed to save player to team: ${firestoreError instanceof Error ? firestoreError.message : 'Unknown Firestore error'}`);
      }
      
      console.log('Player added and saved to Firestore with real Firebase user ID:', realUserId);
      console.log('Player creation result:', { existed: resultData.existed, message: resultData.message });
      setShowAddPlayerModal(false);
      resetPlayerForm();
      
    } catch (error) {
      console.error('Error adding player:', error);
      alert(`Failed to add player: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
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

  const removePlayer = async (playerId: string) => {
    if (!teamData) return;
    
    // Prevent removing captain
    if (playerId.startsWith('captain_')) {
      alert('Captain cannot be removed from the team.');
      return;
    }
    
    try {
      // Update local state
      const updatedPlayers = players.filter(p => p.playerId !== playerId);
      setPlayers(updatedPlayers);
      
      // Save to Firestore
      const teamRef = doc(db, "teams", teamData.teamId);
      const playersToSave = updatedPlayers
        .filter(p => !p.playerId.startsWith('captain_')) // Don't save captain in players array
        .map(cleanFirestoreData); // Clean undefined values
      
      await updateDoc(teamRef, {
        players: playersToSave,
        updatedAt: new Date().toISOString()
      });
      
      console.log('Player removed and updated in Firestore');
    } catch (error) {
      console.error('Error removing player:', error);
      // Revert local state on error
      loadTeamData(); // Reload to get correct state
    }
  };

  const getPlayerStatusColor = (player: TeamPlayer) => {
    const hasAllDocs = player.documents.profilePhoto.url && 
                      player.documents.aadhaarFront.url && 
                      player.documents.aadhaarBack.url;
    
    if (player.verificationStatus === 'verified') return 'text-[#3A7F3F] bg-green-50';
    if (player.verificationStatus === 'rejected') return 'text-red-600 bg-red-50';
    if (hasAllDocs) return 'text-[#C79016] bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getPlayerStatusIcon = (player: TeamPlayer) => {
    const hasAllDocs = player.documents.profilePhoto.url && 
                      player.documents.aadhaarFront.url && 
                      player.documents.aadhaarBack.url;
    
    if (player.verificationStatus === 'verified') return <CheckCircle className="w-4 h-4" />;
    if (player.verificationStatus === 'rejected') return <X className="w-4 h-4" />;
    if (hasAllDocs) return <Clock className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const getPlayerStatusText = (player: TeamPlayer) => {
    const hasAllDocs = player.documents.profilePhoto.url && 
                      player.documents.aadhaarFront.url && 
                      player.documents.aadhaarBack.url;
    
    if (player.verificationStatus === 'verified') return 'Verified';
    if (player.verificationStatus === 'rejected') return 'Rejected';
    if (hasAllDocs) return 'Pending Review';
    return 'Documents Missing';
  };

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.phone.includes(searchTerm)
  );

  const handleSubmitTeam = async () => {
    // Check if all requirements are met
    const allPlayersHaveDocuments = players.every(player => 
      player.documents.profilePhoto.url && 
      player.documents.aadhaarFront.url && 
      player.documents.aadhaarBack.url
    );

    if (!allPlayersHaveDocuments) {
      alert('All players must have complete documents before submission');
      return;
    }

    if (currentPlayers !== totalSlotsNeeded) {
      alert(`Please add all ${totalSlotsNeeded} players before submission`);
      return;
    }

    // Submit team for verification
    try {
      const teamRef = doc(db, "teams", teamIdStr);
      await updateDoc(teamRef, {
        players: players,
        status: "submitted",
        updatedAt: new Date().toISOString(),
      });
      
      router.push(`/${lang}/captain/dashboard`);
    } catch (error) {
      console.error('Error submitting team:', error);
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
    <div className="min-h-screen bg-[#F3F0E5] font-fira">
      {/* Header */}
      <div className="bg-[#4A2F1D] text-white py-6">
        <div className="max-w-7xl mx-auto px-4">
          <button
            onClick={() => router.push(`/${lang}/captain/dashboard`)}
            className="flex items-center space-x-2 text-cream-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          
          <h1 className="text-3xl font-bold mb-2">{teamData.name}</h1>
          <p className="text-cream-200">Step 2 of 2: Add Players</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#3A7F3F] text-white rounded-full flex items-center justify-center font-semibold">
                ✓
              </div>
              <span className="font-semibold text-[#3A7F3F]">Team Details</span>
            </div>
            
            <div className="flex-1 mx-4 h-2 bg-gray-200 rounded-full">
              <div className="h-full bg-[#F28C38] rounded-full w-full"></div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#F28C38] text-white rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <span className="font-semibold text-[#4A2F1D]">Add Players</span>
            </div>
          </div>
        </div>

        {/* Team Progress */}
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
                <p className="text-gray-600 text-sm">Documents Complete</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">
                  {players.filter(p => p.documents.profilePhoto.url && p.documents.aadhaarFront.url && p.documents.aadhaarBack.url).length}
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
                            {player.playerId.startsWith('captain_') && (
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
                          {!player.playerId.startsWith('captain_') && (
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
                                {player.playerId.startsWith('captain_') && (
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
                                <CheckCircle className="w-4 h-4 text-[#3A7F3F]" title="Profile Photo Uploaded" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-gray-300" title="Profile Photo Missing"></div>
                              )}
                              {player.documents.aadhaarFront.url ? (
                                <CheckCircle className="w-4 h-4 text-[#3A7F3F]" title="Aadhaar Front Uploaded" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-gray-300" title="Aadhaar Front Missing"></div>
                              )}
                              {player.documents.aadhaarBack.url ? (
                                <CheckCircle className="w-4 h-4 text-[#3A7F3F]" title="Aadhaar Back Uploaded" />
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
                              {!player.playerId.startsWith('captain_') && (
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
        {currentPlayers === totalSlotsNeeded && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              
              <div>
                <h3 className="text-lg font-bold text-[#4A2F1D] mb-2">Ready to Submit?</h3>
                <p className="text-gray-600">
                  All {totalSlotsNeeded} players added. Submit your team for verification.
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
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Profile Photo</span>
                        <div className={`w-3 h-3 rounded-full ${selectedPlayer.documents.profilePhoto.url ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`}></div>
                      </div>
                      {selectedPlayer.documents.profilePhoto.url ? (
                        <p className="text-sm text-green-600">✓ Document uploaded</p>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id={`profile-photo-${selectedPlayer.playerId}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && selectedPlayer) {
                                  handleDocumentUpload(selectedPlayer, 'profilePhoto', file);
                                }
                              }}
                            />
                            <label
                              htmlFor={`profile-photo-${selectedPlayer.playerId}`}
                              className={`text-sm flex items-center space-x-1 cursor-pointer ${
                                isUploading[`${selectedPlayer.userId}_profilePhoto`] 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-[#F28C38] hover:text-[#E67A26]'
                              }`}
                            >
                              {isUploading[`${selectedPlayer.userId}_profilePhoto`] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              <span>
                                {isUploading[`${selectedPlayer.userId}_profilePhoto`] 
                                  ? `Uploading... ${Math.round(uploadProgress[`${selectedPlayer.userId}_profilePhoto`] || 0)}%`
                                  : `Upload Photo ${selectedPlayer.playerId.startsWith('captain_') ? '(Captain)' : '(As Captain)'}`
                                }
                              </span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Aadhaar Front</span>
                        <div className={`w-3 h-3 rounded-full ${selectedPlayer.documents.aadhaarFront.url ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`}></div>
                      </div>
                      {selectedPlayer.documents.aadhaarFront.url ? (
                        <p className="text-sm text-green-600">✓ Document uploaded</p>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id={`aadhaar-front-${selectedPlayer.playerId}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && selectedPlayer) {
                                  handleDocumentUpload(selectedPlayer, 'aadhaarFront', file);
                                }
                              }}
                            />
                            <label
                              htmlFor={`aadhaar-front-${selectedPlayer.playerId}`}
                              className={`text-sm flex items-center space-x-1 cursor-pointer ${
                                isUploading[`${selectedPlayer.userId}_aadhaarFront`] 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-[#F28C38] hover:text-[#E67A26]'
                              }`}
                            >
                              {isUploading[`${selectedPlayer.userId}_aadhaarFront`] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              <span>
                                {isUploading[`${selectedPlayer.userId}_aadhaarFront`] 
                                  ? `Uploading... ${Math.round(uploadProgress[`${selectedPlayer.userId}_aadhaarFront`] || 0)}%`
                                  : `Upload Aadhaar Front ${selectedPlayer.playerId.startsWith('captain_') ? '(Captain)' : '(As Captain)'}`
                                }
                              </span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Aadhaar Back</span>
                        <div className={`w-3 h-3 rounded-full ${selectedPlayer.documents.aadhaarBack.url ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`}></div>
                      </div>
                      {selectedPlayer.documents.aadhaarBack.url ? (
                        <p className="text-sm text-green-600">✓ Document uploaded</p>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id={`aadhaar-back-${selectedPlayer.playerId}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && selectedPlayer) {
                                  handleDocumentUpload(selectedPlayer, 'aadhaarBack', file);
                                }
                              }}
                            />
                            <label
                              htmlFor={`aadhaar-back-${selectedPlayer.playerId}`}
                              className={`text-sm flex items-center space-x-1 cursor-pointer ${
                                isUploading[`${selectedPlayer.userId}_aadhaarBack`] 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-[#F28C38] hover:text-[#E67A26]'
                              }`}
                            >
                              {isUploading[`${selectedPlayer.userId}_aadhaarBack`] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              <span>
                                {isUploading[`${selectedPlayer.userId}_aadhaarBack`] 
                                  ? `Uploading... ${Math.round(uploadProgress[`${selectedPlayer.userId}_aadhaarBack`] || 0)}%`
                                  : `Upload Aadhaar Back ${selectedPlayer.playerId.startsWith('captain_') ? '(Captain)' : '(As Captain)'}`
                                }
                              </span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-600">
                      <strong>Note:</strong> As captain, you can upload documents for any team member {selectedPlayer.playerId.startsWith('captain_') ? '(yourself)' : `(${selectedPlayer.name})`} now or add players without documents and upload later.
                    </p>
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
                {!selectedPlayer.playerId.startsWith('captain_') ? (
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
                    Cannot Remove Captain
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