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
  userId: string;
  teamId: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: Date;
  age: number;
  gender: string;
  position: 'main' | 'substitute';
  createdAt: Date;
  addedBy: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    age: number;
    gender: string;
  };
}

interface TeamData {
  id: string;
  name: string;
  sportId: string;
  captainId: string;
  status: string;
  currentPlayers: number;
  currentSubstitutes: number;
  pincode: string;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  sport: {
    id: string;
    name: string;
    minPlayers: number;
    maxPlayers: number;
    maxSubstitutes: number;
  };
  captainUser: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  teamPlayers: TeamPlayer[];
  teamVenueAssignments?: {
    clusterVenueMapping?: {
      venue?: {
        name: string;
      };
    };
  }[];
}

interface SportData {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  maxSubstitutes: number;
  gender_categories: string[];
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
    dateOfBirth: '',
    whatsappNumber: '',
    village: '',
    position: 'main' as 'main' | 'substitute'
  });
  const [playerExists, setPlayerExists] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentPlayer, setDocumentPlayer] = useState<TeamPlayer | null>(null);
  const { alertState, showError, showSuccess, showInfo, hideAlert } = useAlert();

  // tRPC queries
  const { data: myTeam, isLoading: teamLoading, refetch: refetchTeam } = api.teams.management.getMyTeam.useQuery();
  const { data: sports } = api.sports.getAllWithCategories.useQuery();
  const { data: teamPlayers, refetch: refetchPlayers } = api.teams.players.getTeamPlayers.useQuery(
    { teamId: myTeam?.id || '' },
    { enabled: !!myTeam?.id }
  );

  // tRPC mutations
  const addPlayerMutation = api.teams.players.addPlayer.useMutation();
  const removePlayerMutation = api.teams.players.removePlayer.useMutation();
  const submitTeamMutation = api.teams.verification.submitForVerification.useMutation();

  const loadTeamData = useCallback(async () => {
    if (!user) {
      setError("User not authenticated");
      return;
    }
    
    try {
      setLoading(true);
      
      if (!myTeam) {
        setTeamData(null);
        setPlayers([]);
        setLoading(false);
        return;
      }

      // Find sport data
      let sport: SportData | null = null;
      if (sports && myTeam.sportId) {
        sport = sports.find(s => s.id === myTeam.sportId) || null;
      }
      
      // Fallback sport data
      if (!sport) {
        sport = {
          id: myTeam.sportId || 'unknown',
          name: myTeam.sport?.name || 'Unknown Sport',
          minPlayers: myTeam.sport?.minPlayers || 6,
          maxPlayers: myTeam.sport?.maxPlayers || 6,
          maxSubstitutes: myTeam.sport?.maxSubstitutes || 6,
          gender_categories: ['mixed'],
          isActive: true
        };
      }

      setSportData(sport);
      
      // Create team data structure
      const actualTeamData: TeamData = {
        id: myTeam.id,
        name: myTeam.name,
        sportId: myTeam.sportId,
        captainId: myTeam.captainId,
        status: myTeam.status || 'draft',
        currentPlayers: myTeam.currentPlayers || 0,
        currentSubstitutes: myTeam.currentSubstitutes || 0,
        pincode: myTeam.pincode || '',
        panchayat: myTeam.panchayat || '',
        taluk: myTeam.taluk || '',
        district: myTeam.district || '',
        state: myTeam.state || '',
        sport: {
          id: sport.id,
          name: sport.name,
          minPlayers: sport.minPlayers,
          maxPlayers: sport.maxPlayers,
          maxSubstitutes: sport.maxSubstitutes
        },
        captainUser: {
          id: myTeam.captainUser.id,
          firstName: myTeam.captainUser.firstName || '',
          lastName: myTeam.captainUser.lastName || '',
          phone: myTeam.captainUser.phone || ''
        },
        teamPlayers: teamPlayers || [],
        teamVenueAssignments: myTeam.teamVenueAssignments || []
      };

      setTeamData(actualTeamData);
      setPlayers(teamPlayers || []);
      
    } catch (err: any) {
      setError("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [user, userProfile, myTeam, sports, teamPlayers]);

  useEffect(() => {
    if (user && userProfile) {
      loadTeamData();
    }
  }, [user, userProfile, loadTeamData]);

  // Auto-redirect to team details if only one team exists
  useEffect(() => {
    if (teamData && !loading) {
      router.push(`/${lang}/captain/teams/${teamData.id}`);
    }
  }, [teamData, loading, router, lang]);

  // Keep selectedPlayer in sync with players array changes
  useEffect(() => {
    if (selectedPlayer) {
      const updatedPlayer = players.find(p => p.id === selectedPlayer.id);
      if (updatedPlayer) {
        setSelectedPlayer(updatedPlayer);
      }
    }
  }, [players, selectedPlayer]);

  const sportConfig = sportData || { maxPlayers: 6, maxSubstitutes: 6, minPlayers: 6 };
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
        // For now, assume new player - in real implementation, you'd search users
        setPlayerExists(false);
        setPlayerFormData(prev => ({
          ...prev,
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          whatsappNumber: phone,
          village: teamData?.panchayat.replace(' Panchayat', '') || ''
        }));
      } catch (error) {
        setPlayerExists(false);
        setPlayerFormData(prev => ({
          ...prev,
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          whatsappNumber: phone,
          village: teamData?.panchayat.replace(' Panchayat', '') || ''
        }));
      } finally {
        setIsSearching(false);
      }
    } else {
      setPlayerExists(false);
      if (phone.length === 0) {
        setPlayerFormData(prev => ({
          ...prev,
          firstName: '',
          lastName: '',
          dateOfBirth: '',
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

  const resetPlayerForm = () => {
    setPlayerFormData({
      phone: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      whatsappNumber: '',
      village: '',
      position: 'main'
    });
    setPlayerExists(false);
  };

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
      
      const age = calculateAge(playerFormData.dateOfBirth);
      
      await addPlayerMutation.mutateAsync({
        teamId: teamData.id,
        position: playerPosition,
        firstName: playerFormData.firstName,
        lastName: playerFormData.lastName,
        phone: playerFormData.phone,
        dateOfBirth: new Date(playerFormData.dateOfBirth),
        age,
        gender: sportData?.gender_categories[0] === 'women' ? 'F' : 'M',
        panchayat: teamData.panchayat,
        taluk: teamData.taluk,
        district: teamData.district,
        state: teamData.state,
        pincode: teamData.pincode,
        verificationStatus: 'pending'
      });
      
      // Reload data
      await refetchPlayers();
      await refetchTeam();
      
      setShowAddPlayerModal(false);
      resetPlayerForm();
      showSuccess('Player added successfully!');
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
      
      const player = players.find(p => p.id === playerId);
      if (!player) return;
      
      await removePlayerMutation.mutateAsync({
        teamId: teamData.id,
        userId: player.userId
      });
      
      // Reload data
      await refetchPlayers();
      await refetchTeam();
      
      showSuccess('Player removed successfully!');
    } catch (error) {
      showError('Failed to remove player. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPlayerStatusColor = (player: TeamPlayer) => {
    if (player.verificationStatus === 'approved') return 'text-[#3A7F3F] bg-green-50';
    if (player.verificationStatus === 'rejected') return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getPlayerStatusIcon = (player: TeamPlayer) => {
    if (player.verificationStatus === 'approved') return <CheckCircle className="w-4 h-4" />;
    if (player.verificationStatus === 'rejected') return <X className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const getPlayerStatusText = (player: TeamPlayer) => {
    if (player.verificationStatus === 'approved') return 'Verified';
    if (player.verificationStatus === 'rejected') return 'Rejected';
    return 'Pending Review';
  };

  const getTeamDisplayStatus = () => {
    if (!teamData) return '';
    
    switch (teamData.status) {
      case 'draft': return 'Draft';
      case 'submitted': return 'Submitted';
      case 'verified': return 'Verified';
      case 'rejected': return 'Rejected';
      default: return teamData.status || 'Unknown';
    }
  };

  const getTeamStatusColor = () => {
    if (!teamData) return 'text-gray-600';
    
    switch (teamData.status) {
      case 'draft': return 'text-gray-600';
      case 'submitted': return 'text-yellow-600';
      case 'verified': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const filteredPlayers = players.filter(player =>
    `${player.firstName} ${player.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.phone.includes(searchTerm)
  );

  const handleSubmitTeam = async () => {
    if (!teamData || !sportData) {
      showError('Team data is not loaded. Please refresh and try again.');
      return;
    }

    if (!user || !userProfile) {
      showError('User authentication required. Please log in again.');
      return;
    }

    const validationErrors = [];

    if (mainPlayers < sportData.minPlayers) {
      validationErrors.push(`Need at least ${sportData.minPlayers} main players (currently have ${mainPlayers})`);
    }

    if (players.length === 0) {
      validationErrors.push('Team must have at least one player');
    }

    if (validationErrors.length > 0) {
      showError(`Cannot submit team:\n\n${validationErrors.map((error, index) => `${index + 1}. ${error}`).join('\n')}`);
      return;
    }

    const confirmMessage = `Submit team "${teamData.name}" for ${sportData.name}?\n\nPlayers: ${currentPlayers}\nSport: ${sportData.name}\n\nThis action cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await submitTeamMutation.mutateAsync({
        teamId: teamData.id
      });
      
      showSuccess(`Team "${teamData.name}" submitted for verification successfully!\n\nYou will be notified once the review is complete.`);
      router.push(`/${lang}/captain/dashboard`);
    } catch (error) {
      showError(`Failed to submit team: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact support.`);
    }
  };

  if (loading || teamLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
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

  if (!teamData) {
    return (
      <div className="min-h-screen bg-gray-50">
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
              My Team
            </h1>
            <p className="text-gray-600">
              Manage your team and players
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Found</h3>
            <p className="text-gray-600 mb-6">You don&apos;t have any team registered yet.</p>
            <button 
              onClick={() => router.push(`/${lang}/captain/dashboard`)}
              className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
            Manage your team and players for {teamData.sport.name}
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
                  Status: <span className="font-semibold">{getTeamDisplayStatus()}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Team Status Card */}
        {teamData && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#4A2F1D] mb-2">Team Status</h3>
                <p className={`text-xl font-semibold ${getTeamStatusColor()}`}>
                  {getTeamDisplayStatus()}
                </p>
                {teamData.teamVenueAssignments && teamData.teamVenueAssignments.length > 0 && (
                  <p className="text-gray-600 text-sm mt-2">
                    <strong>Venue:</strong> {teamData.teamVenueAssignments[0]?.clusterVenueMapping?.venue?.name || 'Not assigned'}
                  </p>
                )}
              </div>
              <div className={`w-4 h-4 rounded-full ${
                teamData.status === 'verified' ? 'bg-green-500' :
                teamData.status === 'submitted' ? 'bg-yellow-500' :
                teamData.status === 'rejected' ? 'bg-red-500' : 'bg-gray-500'
              }`}></div>
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
                <p className="text-gray-600 text-sm">Verified Players</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">
                  {players.filter(p => p.verificationStatus === 'approved').length}
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
                    <div key={player.id} className="border-b border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-[#4A2F1D] text-sm">
                            {player.firstName} {player.lastName}
                            {player.userId === teamData.captainId && (
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
                          {player.userId !== teamData.captainId && (
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
                                {player.firstName} {player.lastName}
                                {player.userId === teamData.captainId && (
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
                              {player.userId !== teamData.captainId && (
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
              Team Status: <span className={getTeamStatusColor()}>{getTeamDisplayStatus()}</span>
            </h3>
            <p className="text-gray-600">
              This team has been submitted and is currently under review. No modifications can be made at this time.
            </p>
            {teamData.teamVenueAssignments && teamData.teamVenueAssignments.length > 0 && (
              <p className="text-gray-600 mt-2">
                <strong>Assigned Venue:</strong> {teamData.teamVenueAssignments[0]?.clusterVenueMapping?.venue?.name || 'Not assigned'}
              </p>
            )}
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
                      value={playerFormData.dateOfBirth}
                      onChange={(e) => setPlayerFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
                      disabled={playerExists}
                    />
                  </div>

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
                  disabled={!playerFormData.firstName || !playerFormData.lastName || !playerFormData.dateOfBirth || isSubmitting}
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
                  <h2 className="text-xl font-bold text-[#4A2F1D]">{selectedPlayer.firstName} {selectedPlayer.lastName}</h2>
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
                      <label className="text-sm text-gray-600">Gender</label>
                      <p className="font-semibold">{selectedPlayer.gender === 'M' ? 'Male' : selectedPlayer.gender === 'F' ? 'Female' : 'Other'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-600">Panchayat</label>
                      <p className="font-semibold">{selectedPlayer.panchayat}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-600">District</label>
                      <p className="font-semibold">{selectedPlayer.district}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-600">Verification Status</label>
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full ${getPlayerStatusColor(selectedPlayer)}`}>
                        {getPlayerStatusIcon(selectedPlayer)}
                        <span>{getPlayerStatusText(selectedPlayer)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Management - Placeholder */}
                <div>
                  <h3 className="text-lg font-bold text-[#4A2F1D] mb-4">Identity Documents</h3>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Profile Photo</span>
                        <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                      </div>
                      <p className="text-sm text-gray-600">Document upload functionality will be implemented with proper file handling.</p>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Aadhaar Front</span>
                        <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                      </div>
                      <p className="text-sm text-gray-600">Document upload functionality will be implemented with proper file handling.</p>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Aadhaar Back</span>
                        <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                      </div>
                      <p className="text-sm text-gray-600">Document upload functionality will be implemented with proper file handling.</p>
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
                {selectedPlayer.userId !== teamData.captainId && !isReadOnly ? (
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
