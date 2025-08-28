'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getVenueTeamsForMatchDay, verifyPlayerMatchDay } from '@/lib/actions/volunteer/matchDayVerification';
import { collection, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import DocumentPreview from '@/components/documents/DocumentPreview';
import { TableControls } from '@/components/ui/TableControls';
import FilterSidebar, { type ActiveFilter, type FilterField } from '@/components/ui/FilterSidebar';
import { VerificationStatusSelector } from '@/components/ui/StatusSelector';
import CreateTeamModal from '@/components/volunteer/CreateTeamModal';
import PlayerDocumentUpload from '@/components/players/PlayerDocumentUpload';
import { 
  Loader2, 
  Users, 
  CheckCircle, 
  Clock, 
  Eye, 
  Camera,
  MapPin,
  UserCheck,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Shield,
  User,
  X,
  Phone,
  Calendar,
  XCircle,
  Filter
} from 'lucide-react';
import { addPlayerToTeam } from '@/lib/actions/volunteer/playerManagement';

export default function MatchDayTeamsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { venueId, lang } = params as { venueId: string; lang: string };
  const { user, loading: authLoading } = useAuth();
  
  const [teams, setTeams] = useState<any[]>([]);
  const [venue, setVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [teamPlayers, setTeamPlayers] = useState<Record<string, any[]>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [searchValue, setSearchValue] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [availableSports, setAvailableSports] = useState<Array<{label: string, value: string}>>([]);
  const [teamMatchTypes, setTeamMatchTypes] = useState<Record<string, 'team' | 'player'>>({});

  // Filter configuration
  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'teamStatus',
      label: 'Team Status',
      type: 'select',
      category: 'Team',
      options: [
        { label: 'Submitted', value: 'submitted' },
        { label: 'Verified', value: 'verified' },
        { label: 'Checked-In', value: 'checked_in' },
        { label: 'Rejected', value: 'rejected' }
      ]
    },
    {
      key: 'playerStatus',
      label: 'Player Status',
      type: 'select',
      category: 'Player',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Verified', value: 'verified' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' }
      ]
    }
  ], []);
  const [previewImage, setPreviewImage] = useState<{url: string; label: string} | null>(null);
  
  // Safely handle preview image
  const handlePreviewImage = (image: {url: string; label: string} | null) => {
    setPreviewImage(image);
  };
  const [createTeamModal, setCreateTeamModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTeamForPlayer, setSelectedTeamForPlayer] = useState<string | null>(null);

  const loadSports = async () => {
    try {
      const sportsRef = collection(db, 'sports');
      const sportsSnapshot = await getDocs(sportsRef);
      const sports = sportsSnapshot.docs
        .filter(doc => doc.data().isActive !== false)
        .map(doc => {
          const data = doc.data();
          return {
            label: data.displayName || data.name || doc.id,
            value: data.displayName || data.name || doc.id
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label));
      
      setAvailableSports(sports);
    } catch (error) {
      console.error('Failed to load sports:', error);
      // Fallback to basic sports list
      setAvailableSports([
        { label: 'Volleyball', value: 'Volleyball' },
        { label: 'Kabaddi', value: 'Kabaddi' },
        { label: 'Kho Kho', value: 'Kho Kho' },
        { label: 'Athletics', value: 'Athletics' },
        { label: 'Throwball', value: 'Throwball' },
        { label: 'Badminton', value: 'Badminton' }
      ]);
    }
  };

  // Load teams data
  const loadTeams = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const teamsResult = await getVenueTeamsForMatchDay(venueId, user.uid);
      
      if (teamsResult.success) {
        setTeams(teamsResult.teams || []);
        setError('');
      } else {
        setError(teamsResult.error || 'Failed to load teams');
      }
    } catch (err) {
      console.error('Error loading teams:', err);
      setError('Failed to load teams. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, venueId]);

  // Helper functions must be defined before they're used in hooks
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'bg-green-100 text-green-800';
      case 'verified':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checked_in':
        return <CheckCircle className="w-4 h-4" />;
      case 'verified':
        return <UserCheck className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // All hooks must be called at the top level, before any conditional logic
  const loadTeamPlayers = useCallback(async (teamId: string, force = false) => {
    if (teamPlayers[teamId] && !force) return; // Already loaded
    
    try {
      const playersRef = collection(db, 'teams', teamId, 'players');
      const playersSnapshot = await getDocs(playersRef);
      const players = playersSnapshot.docs
        .filter(doc => !doc.data().isDeleted)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      
      setTeamPlayers(prev => ({
        ...prev,
        [teamId]: players
      }));
    } catch (error) {
      console.error('Failed to load players for team:', teamId, error);
    }
  }, []); // Remove teamPlayers dependency to prevent stale closures

  const toggleTeamExpanded = useCallback(async (teamId: string) => {
    const newExpanded = new Set(expandedTeams);
    
    if (expandedTeams.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
      await loadTeamPlayers(teamId);
    }
    
    setExpandedTeams(newExpanded);
  }, [expandedTeams, loadTeamPlayers]);

  // Helper function to find which team a player belongs to
  const findPlayerTeam = useCallback((playerId: string) => {
    for (const team of teams) {
      if (teamPlayers[team.id]) {
        const foundPlayer = teamPlayers[team.id].find((p: any) => p.id === playerId);
        if (foundPlayer) return team.id;
      }
    }
    return undefined;
  }, [teams, teamPlayers]);

  // Filter players based on search match type and active filters
  const getFilteredPlayers = useCallback((teamId: string) => {
    const players = teamPlayers[teamId] || [];
    const matchType = teamMatchTypes[teamId];
    
    let filteredPlayers = players;
    
    // Apply search filtering
    if (searchValue.trim() && matchType === 'player') {
      const search = searchValue.toLowerCase().trim();
      filteredPlayers = filteredPlayers.filter(player => 
        player.name?.toLowerCase().includes(search) ||
        player.phone?.includes(search) ||
        player.profileData?.firstName?.toLowerCase().includes(search) ||
        player.profileData?.lastName?.toLowerCase().includes(search) ||
        player.profileData?.village?.toLowerCase().includes(search) ||
        player.profileData?.panchayat?.toLowerCase().includes(search)
      );
    }
    
    // Apply player status filters
    const playerStatusFilters = activeFilters.filter(f => f.key === 'playerStatus');
    playerStatusFilters.forEach(filter => {
      if (filter.value && filter.value !== '') {
        filteredPlayers = filteredPlayers.filter(player => {
          const playerStatus = player.verificationStatus || 'pending';
          if (Array.isArray(filter.value)) {
            return filter.value.includes(playerStatus);
          }
          return playerStatus === filter.value;
        });
      }
    });
    
    return filteredPlayers;
  }, [teamPlayers, teamMatchTypes, searchValue, activeFilters]);

  // Filter teams based on search and filters
  const filteredTeams = useMemo(() => {
    let filtered = teams;
    const newTeamMatchTypes: Record<string, 'team' | 'player'> = {};

    // Apply search filter
    if (searchValue.trim()) {
      const search = searchValue.toLowerCase().trim();
      filtered = filtered.filter(team => {
        // Search in team data
        const teamMatches = team.name?.toLowerCase().includes(search) ||
          team.captainProfile?.name?.toLowerCase().includes(search) ||
          team.panchayat?.toLowerCase().includes(search) ||
          team.district?.toLowerCase().includes(search) ||
          team.sportName?.toLowerCase().includes(search);
        
        // Search in player data if team has loaded players
        const players = teamPlayers[team.id] || [];
        const playerMatches = players.some(player => 
          player.name?.toLowerCase().includes(search) ||
          player.phone?.includes(search) ||
          player.profileData?.firstName?.toLowerCase().includes(search) ||
          player.profileData?.lastName?.toLowerCase().includes(search) ||
          player.profileData?.village?.toLowerCase().includes(search) ||
          player.profileData?.panchayat?.toLowerCase().includes(search)
        );
        
        const shouldInclude = teamMatches || playerMatches;
        if (shouldInclude) {
          // Track whether this team matched via team data or player data
          newTeamMatchTypes[team.id] = teamMatches ? 'team' : 'player';
        }
        
        return shouldInclude;
      });
    } else {
      // No search - all teams show all players
      filtered.forEach(team => {
        newTeamMatchTypes[team.id] = 'team';
      });
    }

    setTeamMatchTypes(newTeamMatchTypes);

    // Apply active filters
    activeFilters.forEach(filter => {
      if (filter.value && filter.value !== '') {
        if (filter.key === 'teamStatus') {
          // Team status filter
          filtered = filtered.filter(team => {
            const teamStatus = team.status || 'draft';
            if (Array.isArray(filter.value)) {
              return filter.value.includes(teamStatus);
            }
            return teamStatus === filter.value;
          });
        } else if (filter.key === 'playerStatus') {
          // Player status filter - show teams that have players with this status
          filtered = filtered.filter(team => {
            const players = teamPlayers[team.id] || [];
            const hasMatchingPlayer = players.some(player => {
              const playerStatus = player.verificationStatus || 'pending';
              if (Array.isArray(filter.value)) {
                return filter.value.includes(playerStatus);
              }
              return playerStatus === filter.value;
            });
            
            if (hasMatchingPlayer) {
              // Mark this team as having player-level matches for filtering display
              newTeamMatchTypes[team.id] = 'player';
            }
            
            return hasMatchingPlayer;
          });
        }
      }
    });

    return filtered;
  }, [teams, searchValue, activeFilters, teamPlayers]);

  // Team columns only - players will have their own sub-table
  const teamColumns: Column<any>[] = useMemo(() => [
      {
        key: 'name',
        header: 'Team',
        sortable: true,
        className: 'min-w-0 w-24 sm:w-auto',
        render: (_value, item, _index) => {
          if (!item) return null;
          
          return (
            <div className="flex items-center">
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate">{item.name || 'N/A'}</div>
              </div>
            </div>
          );
        }
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        className: 'min-w-0 w-24 sm:w-auto',
        render: (_value, item, _index) => {
          if (!item) return null;
          
          return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
              {getStatusIcon(item.status)}
              <span className="ml-1 capitalize hidden sm:inline">{item.status || 'pending'}</span>
            </span>
          );
        }
      },
      {
        key: 'captain',
        header: 'Captain',
        className: 'min-w-0 w-28 sm:w-auto',
        render: (_value, item, _index) => {
          if (!item) return null;
          return <div className="text-xs sm:text-sm text-gray-900 truncate">{item.captainProfile?.name || 'N/A'}</div>;
        }
      },
      {
        key: 'captainPhone',
        header: 'Captain Phone',
        className: 'hidden sm:table-cell',
        headerClassName: 'hidden sm:table-cell',
        render: (_value, item, _index) => {
          if (!item) return null;
          return <div className="text-sm text-gray-600">{item.captainProfile?.phone || 'N/A'}</div>;
        }
      },
      {
        key: 'players',
        header: 'Players',
        className: 'min-w-0 w-20 sm:w-auto',
        render: (_value, item, _index) => {
          if (!item) return null;
          return (
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm text-gray-900 font-medium">
                {item.verifiedPlayersCount || 0}/{item.currentPlayers || 0}
              </span>
              
            </div>
          );
        }
      }
  ], [expandedTeams, toggleTeamExpanded]);

  // Apply filters from URL parameters on page load
  useEffect(() => {
    const statusFilter = searchParams.get('teamStatus') || searchParams.get('status');
    if (statusFilter) {
      const newFilter: ActiveFilter = {
        key: 'teamStatus',
        value: statusFilter,
        label: 'Team Status'
      };
      setActiveFilters([newFilter]);
    }
  }, [searchParams]);

  // Clear player cache on mount to ensure fresh data
  useEffect(() => {
    setTeamPlayers({});
  }, [venueId]);

  useEffect(() => {
    if (user && !authLoading) {
      loadSports();
      loadTeams();
    }
  }, [user, authLoading, venueId, loadTeams]);

  // Auto-expand all teams when teams are loaded
  useEffect(() => {
    if (teams.length > 0) {
      const allTeamIds = new Set(teams.map(team => team.id));
      setExpandedTeams(allTeamIds);
      
      // Force load players for all teams to get fresh data
      teams.forEach(team => {
        loadTeamPlayers(team.id, true); // Force reload
      });
    }
  }, [teams, loadTeamPlayers]);

  // Handle player status change
  const handlePlayerStatusChange = useCallback(async (player: any, newStatus: 'pending' | 'verified' | 'approved' | 'rejected') => {
    if (!user) return;

    try {
      const result = await verifyPlayerMatchDay({
        playerId: player.id,
        status: newStatus,
        comments: newStatus === 'verified' ? 'Approved via status click' : 'Rejected via status click',
        verifiedBy: user.uid,
        verificationIssues: newStatus === 'rejected' ? ['Status changed to rejected'] : [],
        teamId: player._parentId || findPlayerTeam(player.id),
        venueId: venueId
      });

      if (result.success) {
        // Update the specific player's status in the local state for immediate UI feedback
        setTeamPlayers(prev => {
          const updated = { ...prev };
          const teamId = player._parentId || findPlayerTeam(player.id);
          if (teamId && updated[teamId]) {
            updated[teamId] = updated[teamId].map(p => 
              p.id === player.id 
                ? { ...p, verificationStatus: newStatus }
                : p
            );
          }
          return updated;
        });

        // Update the teams list to reflect any team status changes
        const teamId = player._parentId || findPlayerTeam(player.id);
        if (teamId && (result as any).teamStatusChanged) {
          setTeams(prevTeams => 
            prevTeams.map(team => 
              team.id === teamId 
                ? { ...team, status: (result as any).teamStatus }
                : team
            )
          );
        }

        // Reload full data to ensure consistency
        loadTeams();
      } else {
        console.error('Failed to update player status:', result.error);
        alert(`Failed to update player status: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating player status:', error);
      alert('Failed to update player status. Please try again.');
    }
  }, [user, venueId, loadTeams, findPlayerTeam]);

  // (Removed player management add/remove flows)

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading teams...</p>
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
            onClick={loadTeams}
            className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Helper component for player sub-table
  const PlayerSubTable = ({ players }: { players: any[] }) => (
    <tr>
      <td colSpan={6} className="p-0">
        <div className="bg-gray-50 border-t">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-1 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {players.map((player) => (
                <tr
                  key={player.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedPlayer(player)}
                >
                  <td className="px-2 py-2">
                    <div className="text-sm font-medium text-gray-900">{player.name || 'N/A'}</div>
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-600">{player.phone || 'N/A'}</td>
                  <td className="px-2 py-2 text-sm text-gray-600">{player.age || 'N/A'}</td>
                  <td className="px-2 py-2">
                    <VerificationStatusSelector
                      value={player.verificationStatus || 'pending'}
                      onChange={(newStatus) => {
                        handlePlayerStatusChange(player, newStatus as 'pending' | 'verified' | 'approved' | 'rejected');
                      }}
                    />
                  </td>
                  <td className="px-1 py-1 w-12">
                    <div className="flex justify-center">
                      {player.documents?.profilePhoto?.url ? (
                        <div 
                          className="overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage({
                              url: player.documents.profilePhoto.url,
                              label: `${player.name} - Profile Photo`
                            });
                          }}
                        >
                          <img
                            src={player.documents.profilePhoto.url}
                            alt="Profile"
                            className="w-full h-full object-cover"
                            style={{ width: '24px', height: '24px' }}
                          />
                        </div>
                      ) : (
                        <div 
                          className="bg-gray-200 flex items-center justify-center"
                          style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px' }}
                        >
                          <User className="w-3 h-3 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );

  // Player Modal Component - Exactly like individual team page
  const PlayerModal = ({ player, onClose }: { player: any; onClose: () => void }) => (
    <>
      {player && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Player Details</h3>
              <button 
                onClick={onClose}
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
                    <div className="font-medium">{player.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <div className="font-medium">{player.phone}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Age:</span>
                    <div className="font-medium">{player.age} years</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Gender:</span>
                    <div className="font-medium">{player.gender === 'M' ? 'Male' : 'Female'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Position:</span>
                    <div className="font-medium capitalize">{player.position}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Verification Status:</span>
                    <div className={`font-medium capitalize ${
                      player.verificationStatus === 'approved' ? 'text-green-600' :
                      player.verificationStatus === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {player.verificationStatus || 'pending'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Documents</h4>
                <div className="grid grid-cols-1 gap-6">
                  <PlayerDocumentUpload
                    playerId={player.id}
                    playerUserId={player.userId || player.id}
                    documentType="profilePhoto"
                    label="Profile Photo"
                    currentUrl={player.documents?.profilePhoto?.url}
                    onSuccess={async (url) => {
                      // Update both users collection (done by PlayerDocumentUpload) 
                      // AND teams collection for immediate consistency
                      const teamId = findPlayerTeam(player.id);
                      if (teamId && user) {
                        try {
                          // Update the teams/{teamId}/players/{playerId} document
                          const playerDocRef = doc(db, 'teams', teamId, 'players', player.id);
                          await updateDoc(playerDocRef, {
                            [`documents.profilePhoto.url`]: url,
                            [`documents.profilePhoto.uploadedAt`]: serverTimestamp(),
                            [`documents.profilePhoto.uploadedBy`]: user.uid,
                            updatedAt: serverTimestamp()
                          });
                          
                          // Update the selectedPlayer state immediately for modal UI
                          setSelectedPlayer((prev: any) => {
                            if (prev && prev.id === player.id) {
                              return {
                                ...prev,
                                documents: {
                                  ...prev.documents,
                                  profilePhoto: { ...prev.documents?.profilePhoto, url }
                                }
                              };
                            }
                            return prev;
                          });
                          
                          // Then reload to ensure consistency
                          loadTeamPlayers(teamId, true);
                        } catch (error) {
                          console.error('Failed to update team player document:', error);
                          // Still reload even if update failed
                          loadTeamPlayers(teamId, true);
                        }
                      }
                    }}
                    onError={(error) => {
                      console.error(`Upload failed: ${error}`);
                    }}
                    variant="card"
                  />
                  <PlayerDocumentUpload
                    playerId={player.id}
                    playerUserId={player.userId || player.id}
                    documentType="aadhaarFront"
                    label="Aadhaar Front"
                    currentUrl={player.documents?.aadhaarFront?.url}
                    onSuccess={async (url) => {
                      // Update both users collection (done by PlayerDocumentUpload) 
                      // AND teams collection for immediate consistency
                      const teamId = findPlayerTeam(player.id);
                      if (teamId && user) {
                        try {
                          // Update the teams/{teamId}/players/{playerId} document
                          const playerDocRef = doc(db, 'teams', teamId, 'players', player.id);
                          await updateDoc(playerDocRef, {
                            [`documents.aadhaarFront.url`]: url,
                            [`documents.aadhaarFront.uploadedAt`]: serverTimestamp(),
                            [`documents.aadhaarFront.uploadedBy`]: user.uid,
                            updatedAt: serverTimestamp()
                          });
                          
                          // Update the selectedPlayer state immediately for modal UI
                          setSelectedPlayer((prev: any) => {
                            if (prev && prev.id === player.id) {
                              return {
                                ...prev,
                                documents: {
                                  ...prev.documents,
                                  aadhaarFront: { ...prev.documents?.aadhaarFront, url }
                                }
                              };
                            }
                            return prev;
                          });
                          
                          // Then reload to ensure consistency
                          loadTeamPlayers(teamId, true);
                        } catch (error) {
                          console.error('Failed to update team player document:', error);
                          // Still reload even if update failed
                          loadTeamPlayers(teamId, true);
                        }
                      }
                    }}
                    onError={(error) => {
                      console.error(`Upload failed: ${error}`);
                    }}
                    variant="card"
                  />
                  <PlayerDocumentUpload
                    playerId={player.id}
                    playerUserId={player.userId || player.id}
                    documentType="aadhaarBack"
                    label="Aadhaar Back"
                    currentUrl={player.documents?.aadhaarBack?.url}
                    onSuccess={async (url) => {
                      // Update both users collection (done by PlayerDocumentUpload) 
                      // AND teams collection for immediate consistency
                      const teamId = findPlayerTeam(player.id);
                      if (teamId && user) {
                        try {
                          // Update the teams/{teamId}/players/{playerId} document
                          const playerDocRef = doc(db, 'teams', teamId, 'players', player.id);
                          await updateDoc(playerDocRef, {
                            [`documents.aadhaarBack.url`]: url,
                            [`documents.aadhaarBack.uploadedAt`]: serverTimestamp(),
                            [`documents.aadhaarBack.uploadedBy`]: user.uid,
                            updatedAt: serverTimestamp()
                          });
                          
                          // Update the selectedPlayer state immediately for modal UI
                          setSelectedPlayer((prev: any) => {
                            if (prev && prev.id === player.id) {
                              return {
                                ...prev,
                                documents: {
                                  ...prev.documents,
                                  aadhaarBack: { ...prev.documents?.aadhaarBack, url }
                                }
                              };
                            }
                            return prev;
                          });
                          
                          // Then reload to ensure consistency
                          loadTeamPlayers(teamId, true);
                        } catch (error) {
                          console.error('Failed to update team player document:', error);
                          // Still reload even if update failed
                          loadTeamPlayers(teamId, true);
                        }
                      }
                    }}
                    onError={(error) => {
                      console.error(`Upload failed: ${error}`);
                    }}
                    variant="card"
                  />
                </div>
              </div>

              

              {/* Action Buttons - Changed to Approve */}
              {player.verificationStatus !== 'approved' && (
                <div className="flex space-x-3">
                  <button
                    onClick={async () => {
                      await handlePlayerStatusChange(player, 'approved');
                      onClose();
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Player
                  </button>
                  <button
                    onClick={async () => {
                      await handlePlayerStatusChange(player, 'rejected');
                      onClose();
                    }}
                    className="flex-1 text-red-600 border border-red-300 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Player
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="w-full py-4 sm:py-8 px-0 sm:px-4 lg:px-6">
      {/* Search and Filters */}
      <div className="mb-[-20px] sm:mb-2">
        <TableControls
          searchable={true}
          searchValue={searchValue}
          searchPlaceholder="Search teams, players..."
          onSearchChange={setSearchValue}
          filterable={true}
          showFilterButton={true}
          onFilterToggle={() => setIsFilterOpen(!isFilterOpen)}
          isFilterOpen={isFilterOpen}
          activeFilters={activeFilters}
          onFilterRemove={(key) => {
            setActiveFilters(activeFilters.filter(f => f.key !== key));
          }}
          onFiltersClear={() => setActiveFilters([])}
          showResultsInfo={false}
          
          // Header actions - Create Team button in same row
          headerActions={(
            <button
              onClick={() => setCreateTeamModal(true)}
              className="bg-[#F28C38] text-white px-2 sm:px-4 py-2 rounded-lg hover:bg-[#E67A26] transition-colors flex items-center gap-1 sm:gap-2 text-sm whitespace-nowrap"
            >
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Create Team</span>
              <span className="sm:hidden">Create</span>
            </button>
          )}
          
          compact={true}
        />
      </div>

      {/* Teams Table with Nested Player Sub-Tables */}
      <AdvancedTable
        data={filteredTeams}
        columns={teamColumns}
        loading={loading}
        stateKey={undefined}
        
        // Expandable functionality - expand button is built into team name column
        expandable={true}
        expandedRows={expandedTeams}
        onRowExpand={(team, expanded) => {
          const newExpanded = new Set(expandedTeams);
          if (expanded) {
            newExpanded.add(team.id);
            // Load players for this team if not already loaded
            if (!teamPlayers[team.id]) {
              loadTeamPlayers(team.id);
            }
          } else {
            newExpanded.delete(team.id);
          }
          setExpandedTeams(newExpanded);
        }}
        renderExpandedContent={(team) => (
          teamPlayers[team.id] ? (
            <PlayerSubTable players={getFilteredPlayers(team.id)} />
          ) : (
            <tr>
              <td colSpan={teamColumns.length + 1} className="p-0">
                <div className="flex items-center justify-center py-8 bg-gray-50">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
                  <span className="text-gray-500">Loading players...</span>
                </div>
              </td>
            </tr>
          )
        )}
        
        // Row interaction
        onRowClick={(team) => router.push(`/${lang}/volunteer/venues/${venueId}/teams/${team.id}`)}
        keyExtractor={(team) => team.id}
        
        // Table configuration
        stickyHeader={true}
        compact={false}
        
        // Disable built-in search/filter since we handle it above
        searchable={false}
        filterable={false}
        
        // Pagination
        pagination={{
          enabled: true,
          pageSize: 10,
          pageSizeOptions: [5, 10, 20, 50]
        }}
      />
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mt-4 px-3 sm:px-0">
        <button
          onClick={() => {
            setActiveFilters([]);
            setSearchValue('');
          }}
          className="rounded-md p-2 sm:p-4 shadow-sm border hover:bg-gray-50 text-left transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-[11px] sm:text-sm">Total Teams</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{teams.length}</p>
            </div>
            <Users className="w-5 h-5 sm:w-8 sm:h-8 text-gray-400" />
          </div>
        </button>
        
        <button
          onClick={() => {
            setActiveFilters([{ key: 'teamStatus', value: 'checked_in', label: 'Team Status', displayValue: 'Checked In' }]);
            setSearchValue('');
          }}
          className="rounded-md p-2 sm:p-4 shadow-sm border hover:bg-gray-50 text-left transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-[11px] sm:text-sm">Checked In</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600">
                {teams.filter(t => t.status === 'checked_in').length}
              </p>
            </div>
            <CheckCircle className="w-5 h-5 sm:w-8 sm:h-8 text-green-400" />
          </div>
        </button>
        
        <button
          onClick={() => {
            setActiveFilters([{ key: 'teamStatus', value: 'verified', label: 'Team Status', displayValue: 'Verified' }]);
            setSearchValue('');
          }}
          className="rounded-md p-2 sm:p-4 shadow-sm border hover:bg-gray-50 text-left transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-[11px] sm:text-sm">Confirmed</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">
                {teams.filter(t => t.status === 'verified').length}
              </p>
            </div>
            <UserCheck className="w-5 h-5 sm:w-8 sm:h-8 text-blue-400" />
          </div>
        </button>
        
        <button
          onClick={() => {
            setActiveFilters([{ key: 'teamStatus', value: 'submitted', label: 'Team Status', displayValue: 'Submitted' }]);
            setSearchValue('');
          }}
          className="rounded-md p-2 sm:p-4 shadow-sm border hover:bg-gray-50 text-left transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-[11px] sm:text-sm">Unconfirmed</p>
              <p className="text-lg sm:text-2xl font-bold text-yellow-600">
                {teams.filter(t => t.status === 'submitted').length}
              </p>
            </div>
            <Clock className="w-5 h-5 sm:w-8 sm:h-8 text-yellow-400" />
          </div>
        </button>
      </div>


      {/* Player Modal */}
      <PlayerModal 
        player={selectedPlayer} 
        onClose={() => setSelectedPlayer(null)} 
      />

      

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={createTeamModal}
        onClose={() => setCreateTeamModal(false)}
        venueLocation={teams.length > 0 ? {
          panchayat: teams[0].panchayat || '',
          district: teams[0].district || '',
          state: teams[0].state || ''
        } : undefined}
        onTeamCreated={loadTeams}
      />

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{previewImage?.label || 'Image Preview'}</h3>
              <button 
                onClick={() => setPreviewImage(null)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center">
              {previewImage?.url && (
                <img 
                  src={previewImage?.url} 
                  alt={previewImage?.label || 'Preview'} 
                  className="max-h-[70vh] max-w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filterFields}
        activeFilters={activeFilters}
        onFiltersChange={setActiveFilters}
        onClearAll={() => setActiveFilters([])}
        title="Filter Teams"
        showApplyButton={false}
        showClearButton={true}
      />
    </div>
  );
}