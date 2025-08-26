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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { useAuth } from "@/context/AuthContext";
import { AlertModal } from '@/components/ui/Modal';
import { useAlert } from '@/hooks/useAlert';
import { api } from '@/server/trpc/react';
import Image from "next/image";
import { PlayerDocumentUpload } from "@/components/players";
import DocumentPreview from "@/components/documents/DocumentPreview";

interface TeamPlayer {
  id: string;
  user_id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  whatsapp_number: string | null;
  date_of_birth: Date;
  age: number;
  gender: string;
  position: 'main' | 'substitute';
  verification_status: 'pending' | 'verified' | 'rejected';
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string;
  added_by: string;
  created_at: Date;
  users?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string;
    role: string;
    profile_complete: boolean,
    user_profile_images_user_profile_images_user_idTousers: {
      user_id: string;
      profile_photo_path: string | null;
      aadhaar_front_path: string | null;
      aadhaar_back_path: string | null;
      all_images_uploaded: boolean;
      verified_by: string | null;
      verified_at: Date | null;
      created_at: Date;
      updated_at: Date;
    } | null;
  };
}

interface TeamData {
  id: string;
  name: string;
  sport_id: string;
  captain_id: string;
  captain_name: string;
  gender_category: string;
  status: string;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string | null;
  current_players: number;
  current_substitutes: number;
  created_at: Date;
  updated_at: Date;
  sports: {
    id: string;
    name: string;
    main_players_count: number;
    max_substitutes: number;
  };
  users_teams_captain_idTousers: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string;
  };
  team_players: TeamPlayer[];
}

export default function CaptainPlayerManagement() {
  const router = useRouter();
  const { lang, teamId } = useParams();
  const { user } = useAuth();

  const [teamData, setTeamData] = useState<TeamData | null>(null);
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
    position: 'main' as 'main' | 'substitute',
  });
  const [playerExists, setPlayerExists] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Document upload states
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentPlayer, setDocumentPlayer] = useState<TeamPlayer | null>(null);

  // Team submission states
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);
  const { alertState, showError, showSuccess, showInfo, hideAlert } = useAlert();

  if (!teamId || (Array.isArray(teamId) && teamId.length === 0)) {
    throw new Error("Team ID is missing or invalid");
  }
  const teamIdStr: string = Array.isArray(teamId) ? teamId[0] : teamId;

  // tRPC queries
  const teamQuery = api.teams.getById.useQuery(
    {
      id: teamIdStr,
      includePhotos: false,
      includePlayers: true,
      includeVenueAssignments: false
    },
    { enabled: !!teamIdStr }
  );

  const addPlayerMutation = api.teams.addPlayer.useMutation();
  const removePlayerMutation = api.teams.removePlayer.useMutation();
  const submitTeamMutation = api.teams.verify.useMutation();
  const utils = api.useUtils();

  // Handle tRPC query results
  useEffect(() => {
    if (teamQuery.isLoading) {
      setLoading(true);
      setError("");
      return;
    }

    if (teamQuery.error) {
      setError("Failed to load team data");
      setLoading(false);
      return;
    }

    if (!teamQuery.data) {
      setError("Team not found");
      setLoading(false);
      return;
    }

    const team = teamQuery.data;
    console.log(team);

    // Verify team ownership
    if (team.captain_id !== user?.id) {
      setError("You are not authorized to manage this team");
      setLoading(false);
      return;
    }

    // Set team data
    setTeamData(team as TeamData);
    setLoading(false);
  }, [teamQuery.isLoading, teamQuery.error, teamQuery.data, user?.id]);

  // Keep selectedPlayer in sync with players array changes
  useEffect(() => {
    if (selectedPlayer && teamData?.team_players) {
      const updatedPlayer = teamData.team_players.find(p => p.id === selectedPlayer.id);
      if (updatedPlayer) {
        setSelectedPlayer(updatedPlayer);
      }
    }
  }, [teamData?.team_players, selectedPlayer]);

  const players = teamData?.team_players || [];
  const sportConfig = teamData?.sports || { main_players_count: 6, max_substitutes: 6 };
  const totalSlotsNeeded = sportConfig.main_players_count + sportConfig.max_substitutes;
  const currentPlayers = players.length;
  const mainPlayers = players.filter(p => p.position === 'main').length;
  const substitutes = players.filter(p => p.position === 'substitute').length;

  const isReadOnly = teamData?.status && teamData.status !== 'draft';
  const canAddPlayer = currentPlayers < totalSlotsNeeded && !isReadOnly;
  const canAddMain = mainPlayers < sportConfig.main_players_count && !isReadOnly;
  const canAddSubstitute = substitutes < sportConfig.max_substitutes && !isReadOnly;

  const handlePhoneSearch = async (phone: string) => {
    setPlayerFormData(prev => ({ ...prev, phone }));

    if (phone.length === 10) {
      setIsSearching(true);
      try {
        // Search for existing user by phone number using tRPC client
        const normalizedPhone = normalizePhone(phone);
        const user = await utils.users.getByPhone.fetch({ phone: normalizedPhone });

        if (user) {
          // User exists - pre-fill form with user data
          setPlayerExists(true);
          setPlayerFormData(prev => ({
            ...prev,
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            dob: user.date_of_birth ? user.date_of_birth.split('T')[0] : '',
            whatsappNumber: phone,
          }));
        } else {
          // User doesn't exist - clear form for new user entry
          setPlayerExists(false);
          setPlayerFormData(prev => ({
            ...prev,
            firstName: '',
            lastName: '',
            dob: '',
            whatsappNumber: phone,
          }));
        }
      } catch (error) {
        console.error('User search error:', error);
        setPlayerExists(false);
        // Pre-fill with team's location data - fallback for new user
        setPlayerFormData(prev => ({
          ...prev,
          firstName: '',
          lastName: '',
          dob: '',
          whatsappNumber: phone,
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

    // Handle Date objects - check if they're valid
    if (obj instanceof Date) {
      return isNaN(obj.getTime()) ? null : obj; // Return null for invalid dates, keep valid dates
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

  // Handle document upload success - refresh team data
  const handleDocumentUploadSuccess = async (playerId: string, documentType: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack', url: string) => {
    // Refetch team data to get updated player information
    await teamQuery.refetch();
  };

  // Handle profile completion status change
  const handleProfileComplete = (playerId: string, isComplete: boolean) => {
    // Refetch team data to get updated player information
    teamQuery.refetch();
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
      position: 'main',
    });
    setPlayerExists(false);
  };
  const normalizePhone = (phone: string): string => {
    const digitsOnly = phone.replace(/\D/g, "");

    // Handle 10-digit Indian mobile number
    if (digitsOnly.length === 10) {
      return `+91${digitsOnly}`;
    }

    // Handle 12-digit number starting with 91
    if (digitsOnly.startsWith("91") && digitsOnly.length === 12) {
      return `+${digitsOnly}`;
    }

    // Handle already formatted number
    if (phone.startsWith("+91") && digitsOnly.length === 12) {
      return phone;
    }

    // If none of the above, return the digits with +91 prefix as best effort
    if (digitsOnly.length >= 10) {
      const last10Digits = digitsOnly.slice(-10);
      return `+91${last10Digits}`;
    }

    throw new Error(`Invalid phone number format: ${phone}. Please enter a 10-digit mobile number.`);
  }
  const handleAddPlayer = async () => {
    if (!teamData) {
      showInfo('Team data is not loaded yet. Please wait a moment and try again.');
      return;
    }
    setIsSubmitting(true);

    try {
      // Check for duplicate player by phone number
      const existingPlayerInTeam = players.find(p => p.phone === playerFormData.phone);
      if (existingPlayerInTeam) {
        showInfo(`A player with phone number ${playerFormData.phone} is already in this team.`);
        setIsSubmitting(false);
        return;
      }

      // Auto-select correct position based on availability
      let playerPosition = playerFormData.position;
      if (playerPosition === 'main' && !canAddMain) {
        if (canAddSubstitute) {
          playerPosition = 'substitute';
        } else {
          showInfo('No available positions. Team is full.');
          setIsSubmitting(false);
          return;
        }
      } else if (playerPosition === 'substitute' && !canAddSubstitute) {
        if (canAddMain) {
          playerPosition = 'main';
        } else {
          showInfo('No available positions. Team is full.');
          setIsSubmitting(false);
          return;
        }
      }

      // Use tRPC mutation to add player
      try {
        // Validate phone number format
        let normalizedPhone: string;
        try {
          normalizedPhone = normalizePhone(playerFormData.phone);
        } catch (phoneError) {
          throw new Error(phoneError instanceof Error ? phoneError.message : 'Invalid phone number format');
        }

        const result = await addPlayerMutation.mutateAsync({
          teamId: teamData.id,
          firstName: playerFormData.firstName,
          lastName: playerFormData.lastName,
          phone: normalizedPhone,
          whatsappNumber: playerFormData.whatsappNumber || playerFormData.phone,
          dateOfBirth: new Date(playerFormData.dob),
          age: calculateAge(playerFormData.dob),
          gender: teamData.gender_category === 'women' ? 'F' : 'M',
          position: playerPosition,
          panchayat: teamData.panchayat,
          taluk: teamData.taluk || '',
          district: teamData.district,
          state: teamData.state,
          pincode: teamData.pincode || '000000',
          verificationStatus: 'pending'
        });

        // Player added successfully - refetch team data
        await teamQuery.refetch();
        showSuccess('Player added successfully!');
        setShowAddPlayerModal(false);
        resetPlayerForm();
      } catch (error) {
        console.error('Add player error:', error);
        showError(`Failed to add player: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (error) {
      showError(`Failed to add player: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      // Use tRPC mutation to remove player
      await removePlayerMutation.mutateAsync({
        teamId: teamData.id,
        userId: playerId
      });

      // Refetch team data to reflect changes
      await teamQuery.refetch();
      showSuccess('Player removed successfully!');
    } catch (error) {
      console.error('Remove player error:', error);
      showError('Failed to remove player. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  const getPlayerStatusColor = (player: TeamPlayer) => {
    if (player.verification_status === 'verified') return 'text-[#3A7F3F] bg-green-50';
    if (player.verification_status === 'rejected') return 'text-red-600 bg-red-50';
    // TODO: Add profile completion check when document system is implemented
    return 'text-gray-600 bg-gray-50';
  };

  const getPlayerStatusIcon = (player: TeamPlayer) => {
    if (player.verification_status === 'verified') return <CheckCircle className="w-4 h-4" />;
    if (player.verification_status === 'rejected') return <X className="w-4 h-4" />;
    // TODO: Add profile completion check when document system is implemented
    return <AlertCircle className="w-4 h-4" />;
  };

  const getPlayerStatusText = (player: TeamPlayer) => {
    if (player.verification_status === 'verified') return 'Verified';
    if (player.verification_status === 'rejected') return 'Rejected';
    // TODO: Add profile completion check when document system is implemented
    return 'Pending';
  };

  const filteredPlayers = players.filter(player =>
    `${player.first_name} ${player.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.phone.includes(searchTerm)
  );

  const handleSubmitTeam = async () => {
    if (!teamData) {
      showError('Team data is not loaded. Please refresh and try again.');
      return;
    }

    if (!user) {
      showError('User authentication required. Please log in again.');
      return;
    }

    const validationErrors = [];
    const sport = teamData.sports;

    if (mainPlayers < sport.main_players_count) {
      validationErrors.push(`Need at least ${sport.main_players_count} main players (currently have ${mainPlayers})`);
    }

    if (players.length === 0) {
      validationErrors.push('Team must have at least one player');
    }

    const playersWithInvalidIds = players.filter(p => !p.user_id);
    if (playersWithInvalidIds.length > 0) {
      validationErrors.push(`${playersWithInvalidIds.length} player(s) have missing user IDs. Please remove and re-add them.`);
    }

    // TODO: Add document validation when document system is implemented
    const playersWithIncompleteDocuments = players.filter(player => !player.users?.profile_complete);
    if (playersWithIncompleteDocuments.length > 0) {
      validationErrors.push(`${playersWithIncompleteDocuments.length} player(s) have incomplete documents. Please ensure all documents are uploaded.`);
    }

    if (teamData.gender_category) {
      if (teamData.gender_category === 'women') {
        const malePlayersCount = players.filter(p => p.gender === 'M').length;
        if (malePlayersCount > 0) {
          validationErrors.push(`${sport.name} is only for women. Found ${malePlayersCount} male player(s).`);
        }
      } else if (teamData.gender_category === 'men') {
        const femalePlayersCount = players.filter(p => p.gender === 'F').length;
        if (femalePlayersCount > 0) {
          validationErrors.push(`${sport.name} is only for men. Found ${femalePlayersCount} female player(s).`);
        }
      }
    }

    if (validationErrors.length > 0) {
      showError(`Cannot submit team:\n\n${validationErrors.map((error, index) => `${index + 1}. ${error}`).join('\n')}`);
      return;
    }

    setShowSubmissionModal(true);
  };

  const confirmSubmitTeam = async () => {
    if (!teamData || !user) return;

    try {
      setIsSubmittingTeam(true);

      // Use tRPC mutation to submit team for verification
      const result = await submitTeamMutation.mutateAsync({
        id: teamData.id,
        status: 'submitted',
        verifiedBy: user.id,
      });

      setShowSubmissionModal(false);
      showSuccess(`Team "${teamData.name}" submitted for verification successfully!\n\nYou will be notified once the review is complete.`);
      router.push(`/${lang}/captain/dashboard`);
    } catch (error) {
      console.error('Submit team error:', error);
      showError(`Failed to submit team: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact support.`);
    } finally {
      setIsSubmittingTeam(false);
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
        {/* <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error || "Failed to load team data"}</p>
          <button 
            onClick={() => router.push(`/${lang}/captain/dashboard`)}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Back to Dashboard
          </button>
        </div> */}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F0E5] font-fira">
      {/* Header */}
      <div className="bg-[#4A2F1D] text-white py-6">
        <div className="max-w-7xl mx-auto px-4">
          {/* <button
            onClick={() => router.push(`/${lang}/captain/dashboard`)}
            className="flex items-center space-x-2 text-cream-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button> */}

          <h1 className="text-3xl font-bold mb-2">{teamData.name}</h1>
          <p className="text-cream-200">Step 2 of 2: Add Players</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
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
                <p className="text-2xl font-bold text-[#4A2F1D]">{mainPlayers}/{sportConfig.main_players_count}</p>
              </div>
              <Users className="w-8 h-8 text-[#3A7F3F]" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Substitutes</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">{substitutes}/{sportConfig.max_substitutes}</p>
              </div>
              <Users className="w-8 h-8 text-[#C79016]" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Completed Profiles</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">
                  {players.filter(p => p.users?.profile_complete).length}
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
                {sportConfig.main_players_count - mainPlayers} main slots left
              </div>
              <div className="bg-[#C79016] text-white px-2 py-1 rounded text-xs">
                {sportConfig.max_substitutes - substitutes} sub slots left
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
                    <div key={player.id} className="border-b border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-[#4A2F1D] text-sm">
                            {player.first_name} {player.last_name}
                            {player.user_id === teamData.captain_id && (
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
                          {player.user_id !== teamData.captain_id && (
                            <button
                              onClick={() => removePlayer(player.id)}
                              className="text-red-600 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${player.position === 'main'
                              ? 'bg-[#3A7F3F] text-white'
                              : 'bg-[#C79016] text-white'
                            }`}>
                            {player.position === 'main' ? 'Main' : 'Sub'}
                          </span>
                          <span className="text-xs text-gray-600">{player.age}y</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className={`w-2 h-2 rounded-full ${player.users?.user_profile_images_user_profile_images_user_idTousers?.profile_photo_path ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`} title="Profile"></div>
                            <div className={`w-2 h-2 rounded-full ${player.users?.user_profile_images_user_profile_images_user_idTousers?.aadhaar_front_path ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`} title="Aadhaar Front"></div>
                            <div className={`w-2 h-2 rounded-full ${player.users?.user_profile_images_user_profile_images_user_idTousers?.aadhaar_back_path ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`} title="Aadhaar Back"></div>
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
                        <tr key={player.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-semibold text-[#4A2F1D] flex items-center">
                                {player.first_name} {player.last_name}
                                {player.user_id === teamData.captain_id && (
                                  <span className="ml-2 text-xs bg-[#F28C38] text-white px-2 py-1 rounded">Captain</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{player.phone}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${player.position === 'main'
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
                              {player.users?.user_profile_images_user_profile_images_user_idTousers?.profile_photo_path ? (
                                <CheckCircle className="w-4 h-4 text-[#3A7F3F]" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-gray-300" title="Profile Photo Missing"></div>
                              )}
                              {player.users?.user_profile_images_user_profile_images_user_idTousers?.aadhaar_front_path ? (
                                <CheckCircle className="w-4 h-4 text-[#3A7F3F]" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-gray-300" title="Aadhaar Front Missing"></div>
                              )}
                              {player.users?.user_profile_images_user_profile_images_user_idTousers?.aadhaar_back_path ? (
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
                              {player.user_id !== teamData.captain_id && (
                                <button
                                  onClick={() => removePlayer(player.id)}
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
        {!isReadOnly && teamData?.sports && mainPlayers >= teamData.sports.main_players_count && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between">

              <div>
                <h3 className="text-lg font-bold text-[#4A2F1D] mb-2">Ready to Submit?</h3>
                <p className="text-gray-600">
                  {mainPlayers >= teamData.sports.main_players_count
                    ? `You have ${mainPlayers} main players. Submit your team for verification.`
                    : `Add at least ${teamData.sports.main_players_count} main players to submit.`}
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
                    const phone = e.target.value.replace(/[^\d]/g, '').slice(0, 10);             
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

                  {teamData?.gender_category === 'mixed' && (
                    <div>
                      <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={playerFormData.gender}
                        onValueChange={(value) => setPlayerFormData(prev => ({ ...prev, gender: value as 'M' | 'F' | 'O' }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                          <SelectItem value="O">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-[#4A2F1D] mb-2">
                      Position <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={playerFormData.position}
                      onValueChange={(value) => setPlayerFormData(prev => ({ ...prev, position: value as 'main' | 'substitute' }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Position" />
                      </SelectTrigger>
                      <SelectContent>
                        {canAddMain && <SelectItem value="main">Main Player</SelectItem>}
                        {canAddSubstitute && <SelectItem value="substitute">Substitute</SelectItem>}
                      </SelectContent>
                    </Select>
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
                  disabled={!playerFormData.firstName || !playerFormData.lastName || !playerFormData.dob || isSubmitting || (teamData?.gender_category === 'mixed' && !playerFormData.gender)}
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
                  <h2 className="text-xl font-bold text-[#4A2F1D]">{selectedPlayer.first_name} {selectedPlayer.last_name}</h2>
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
                      <p className="font-semibold">{selectedPlayer.whatsapp_number}</p>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">Village</label>
                      <p className="font-semibold">{selectedPlayer.panchayat}</p>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">Panchayat</label>
                      <p className="font-semibold">{selectedPlayer.panchayat}</p>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">District</label>
                      <p className="font-semibold">{selectedPlayer.district}</p>
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
                        <div className={`w-3 h-3 rounded-full ${selectedPlayer.users?.user_profile_images_user_profile_images_user_idTousers?.profile_photo_path ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`}></div>
                      </div>
                      {selectedPlayer.users?.user_profile_images_user_profile_images_user_idTousers?.profile_photo_path && isReadOnly ? (
                        <DocumentPreview
                          type="profilePhoto"
                          url={selectedPlayer.users?.user_profile_images_user_profile_images_user_idTousers.profile_photo_path}
                          label="Profile Photo"
                          verified={!!selectedPlayer.users?.user_profile_images_user_profile_images_user_idTousers.verified_at}
                          showActions={false}
                          size="md"
                        />
                      ) : (
                        <PlayerDocumentUpload
                          playerId={selectedPlayer.id}
                          playerUserId={selectedPlayer.user_id}
                          documentType="profilePhoto"
                          label="Profile Photo"
                          currentUrl={selectedPlayer.users?.user_profile_images_user_profile_images_user_idTousers?.profile_photo_path || null}
                          onSuccess={(url) => handleDocumentUploadSuccess(selectedPlayer.id, 'profilePhoto', url)}
                          onProfileComplete={(isComplete) => handleProfileComplete(selectedPlayer.id, isComplete)}
                          variant="card"
                          disabled={isReadOnly === true}
                        />
                      )}
                    </div>

                    {/* Aadhaar Front */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Aadhaar Front</span>
                        <div className={`w-3 h-3 rounded-full ${selectedPlayer.users?.user_profile_images_user_profile_images_user_idTousers?.aadhaar_front_path ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`}></div>
                      </div>
                      {selectedPlayer.users?.user_profile_images_user_profile_images_user_idTousers?.aadhaar_front_path && isReadOnly ? (
                        <DocumentPreview
                          type="aadhaarFront"
                          url={selectedPlayer.users.user_profile_images_user_profile_images_user_idTousers.aadhaar_front_path}
                          label="Aadhaar Front"
                          verified={!!selectedPlayer.users.user_profile_images_user_profile_images_user_idTousers.verified_at}
                          showActions={false}
                          size="md"
                        />
                      ) : (
                        <PlayerDocumentUpload
                          playerId={selectedPlayer.id}
                          playerUserId={selectedPlayer.user_id}
                          documentType="aadhaarFront"
                          label="Aadhaar Front"
                          currentUrl={selectedPlayer.users?.user_profile_images_user_profile_images_user_idTousers?.aadhaar_front_path || null}
                          onSuccess={(url) => handleDocumentUploadSuccess(selectedPlayer.id, 'aadhaarFront', url)}
                          onProfileComplete={(isComplete) => handleProfileComplete(selectedPlayer.id, isComplete)}
                          variant="card"
                          disabled={isReadOnly === true}
                        />
                      )}
                    </div>

                    {/* Aadhaar Back */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Aadhaar Back</span>
                        <div className={`w-3 h-3 rounded-full ${selectedPlayer.users?.user_profile_images_user_profile_images_user_idTousers?.aadhaar_back_path ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`}></div>
                      </div>
                      {selectedPlayer.users?.user_profile_images_user_profile_images_user_idTousers?.aadhaar_back_path && isReadOnly ? (
                        <DocumentPreview
                          type="aadhaarBack"
                          url={selectedPlayer.users.user_profile_images_user_profile_images_user_idTousers.aadhaar_back_path}
                          label="Aadhaar Back"
                          verified={!!selectedPlayer.users.user_profile_images_user_profile_images_user_idTousers.verified_at}
                          showActions={false}
                          size="md"
                        />
                      ) : (
                        <PlayerDocumentUpload
                          playerId={selectedPlayer.id}
                          playerUserId={selectedPlayer.user_id}
                          documentType="aadhaarBack"
                          label="Aadhaar Back"
                          currentUrl={selectedPlayer.users?.user_profile_images_user_profile_images_user_idTousers?.aadhaar_back_path || null}
                          onSuccess={(url) => handleDocumentUploadSuccess(selectedPlayer.id, 'aadhaarBack', url)}
                          onProfileComplete={(isComplete: boolean | undefined) => handleProfileComplete(selectedPlayer.id, isComplete === true)}
                          variant="card"
                          disabled={isReadOnly === true}
                        />
                      )}
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
                  {selectedPlayer.user_id !== teamData.captain_id && !isReadOnly ? (
                    <button
                      onClick={() => {
                        removePlayer(selectedPlayer.id);
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
                      {isReadOnly ? 'Cannot Remove (Team Submitted)' : 'Cannot Remove Player'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Submission Confirmation Modal */}
      {showSubmissionModal && teamData && teamData.sports && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-[#F28C38] rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#4A2F1D]">Submit Team</h2>
                  <p className="text-gray-600">Confirm team submission</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-[#4A2F1D] mb-3">Team Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Team Name:</span>
                      <span className="font-medium">{teamData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sport:</span>
                      <span className="font-medium">{teamData.sports.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Players:</span>
                      <span className="font-medium">{currentPlayers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Main Players:</span>
                      <span className="font-medium">{mainPlayers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Substitutes:</span>
                      <span className="font-medium">{substitutes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Documents:</span>
                      <span className="font-medium text-[#3A7F3F]">
                        {players.filter(p => p.users?.user_profile_images_user_profile_images_user_idTousers?.all_images_uploaded).length === players.length ? 'Complete' : 'Incomplete'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Important Notice</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Once submitted, your team will be locked for verification. You won&apos;t be able to make changes until the review is complete.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-center text-gray-600">
                  Are you sure you want to submit this team for verification?
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSubmissionModal(false)}
                  disabled={isSubmittingTeam}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSubmitTeam}
                  disabled={isSubmittingTeam}
                  className="flex-1 bg-[#3A7F3F] hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center"
                >
                  {isSubmittingTeam ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Team'
                  )}
                </button>
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
