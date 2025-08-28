'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getVenueTeamsForMatchDay, verifyPlayerMatchDay } from '@/lib/actions/volunteer/matchDayVerification';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
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
import PlayerManagementModal from '@/components/volunteer/PlayerManagementModal';
import CreateTeamModal from '@/components/volunteer/CreateTeamModal';
import PlayerDocumentUpload from '@/components/players/PlayerDocumentUpload';
import { addPlayerToTeam, removePlayerFromTeam } from '@/lib/actions/volunteer/playerManagement';
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
  const [playerManagementTeam, setPlayerManagementTeam] = useState<any>(null);
  const [createTeamModal, setCreateTeamModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTeamForPlayer, setSelectedTeamForPlayer] = useState<string | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

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
  const loadTeamPlayers = useCallback(async (teamId: string) => {
    if (teamPlayers[teamId]) return; // Already loaded
    
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
  }, [teamPlayers]);

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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPlayerManagementTeam(item);
                }}
                className="px-1 sm:px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                <span className="hidden sm:inline">Manage</span>
                <span className="sm:hidden">+</span>
              </button>
            </div>
          );
        }
      }
  ], [expandedTeams, toggleTeamExpanded]);

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

  // Player Modal Component
  const PlayerModal = ({ player, onClose }: { player: any; onClose: () => void }) => (
    <Modal
      isOpen={!!player}
      onClose={onClose}
      title="Player Details"
      size="lg"
    >
      {player && (
        <div className="space-y-6">
          {/* Player Basic Info */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <div className="font-medium">{player.name || 'N/A'}</div>
              </div>
              <div>
                <span className="text-gray-500">Phone:</span>
                <div className="font-medium">{player.phone || 'N/A'}</div>
              </div>
              <div>
                <span className="text-gray-500">Age:</span>
                <div className="font-medium">{player.age || 'N/A'} years</div>
              </div>
              <div>
                <span className="text-gray-500">Gender:</span>
                <div className="font-medium">{player.gender === 'M' ? 'Male' : 'Female'}</div>
              </div>
              <div>
                <span className="text-gray-500">Position:</span>
                <div className="font-medium capitalize">{player.position || 'N/A'}</div>
              </div>
              <div>
                <span className="text-gray-500">Approval Status:</span>
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
                onSuccess={(url) => {
                  loadTeams();
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
                onSuccess={(url) => {
                  loadTeams();
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
                onSuccess={(url) => {
                  loadTeams();
                }}
                onError={(error) => {
                  console.error(`Upload failed: ${error}`);
                }}
                variant="card"
              />
            </div>
          </div>

          {/* Approval Comments */}
          {player.verificationComments && player.verificationComments.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Approval Comments</h4>
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                {player.verificationComments.join(', ')}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {player.verificationStatus !== 'approved' && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={async () => {
                  await handlePlayerStatusChange(player, 'approved');
                  onClose();
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 sm:py-2 rounded-lg font-medium transition-colors flex items-center justify-center text-sm sm:text-base"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Player
              </button>
              <button
                onClick={async () => {
                  await handlePlayerStatusChange(player, 'rejected');
                  onClose();
                }}
                className="flex-1 text-red-600 border border-red-300 hover:bg-red-50 px-4 py-3 sm:py-2 rounded-lg font-medium transition-colors flex items-center justify-center text-sm sm:text-base"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Player
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );

  // Player Management Modal component
  const PlayerManagementModal = ({ 
    teamId, 
    onPlayerAdded, 
    onPlayerRemoved 
  }: { 
    teamId: string; 
    onPlayerAdded: () => void; 
    onPlayerRemoved: () => void; 
  }) => {
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [adding, setAdding] = useState(false);

    const loadPlayers = useCallback(async () => {
      try {
        setLoading(true);
        const playersRef = collection(db, 'teams', teamId, 'players');
        const snapshot = await getDocs(playersRef);
        const playersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPlayers(playersData);
      } catch (err) {
        console.error('Error loading players:', err);
        setError('Failed to load players');
      } finally {
        setLoading(false);
      }
    }, [teamId]);

    useEffect(() => {
      loadPlayers();
    }, [loadPlayers]);

    const handleAddPlayer = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) return;

      try {
        setAdding(true);
        const result = await addPlayerToTeam({ teamId, playerEmail: email });
        if (result.success) {
          setEmail('');
          await loadPlayers();
          onPlayerAdded();
        } else {
          setError(result.error || 'Failed to add player');
        }
      } catch (err) {
        console.error('Error adding player:', err);
        setError('Failed to add player');
      } finally {
        setAdding(false);
      }
    };

    const handleRemovePlayer = async (playerId: string) => {
      if (!confirm('Are you sure you want to remove this player?')) return;

      try {
        const result = await removePlayerFromTeam({ teamId, playerId });
        if (result.success) {
          await loadPlayers();
          onPlayerRemoved();
        } else {
          setError(result.error || 'Failed to remove player');
        }
      } catch (err) {
        console.error('Error removing player:', err);
        setError('Failed to remove player');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Manage Team Players</h3>
            <button 
              onClick={() => setSelectedTeamForPlayer(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            <form onSubmit={handleAddPlayer} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Player's email"
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                required
              />
              <button 
                type="submit" 
                className="bg-[#F28C38] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#E67A26] transition-colors"
                disabled={adding}
              >
                {adding ? 'Adding...' : 'Add Player'}
              </button>
            </form>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <XCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        Loading players...
                      </td>
                    </tr>
                  ) : players.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        No players found
                      </td>
                    </tr>
                  ) : (
                    players.map((player) => (
                      <tr key={player.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {player.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {player.email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            player.verificationStatus === 'approved' ? 'bg-green-100 text-green-800' :
                            player.verificationStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {player.verificationStatus || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleRemovePlayer(player.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Teams Management</h1>
        <button
          onClick={() => setCreateTeamModal(true)}
          className="bg-[#F28C38] text-white px-4 py-2 rounded-lg hover:bg-[#E67A26] transition-colors flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Create Team
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search teams..."
              className="px-3 py-2 border rounded-md text-sm w-full max-w-md"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 border rounded-md text-sm flex items-center gap-1"
            >
              <Filter className="w-4 h-4" />
              {activeFilters.length > 0 && `(${activeFilters.length})`}

              </button>
            </div>
            <div className="space-y-4">
              {filterFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <select
                    className="w-full border rounded-md p-2 text-sm"
                    value={activeFilters.find(f => f.key === field.key)?.value || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setActiveFilters(prev => [
                        ...prev.filter(f => f.key !== field.key),
                        ...(value ? [{
                          key: field.key,
                          value,
                          label: field.label
                        }] : [])
                      ]);
                    }}
                  >
                    <option value="">All</option>
                    {field.options?.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setActiveFilters([])}
                className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-3 py-2 bg-[#F28C38] text-white text-sm rounded-md hover:bg-[#E67A26]"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
      

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {teamColumns.map((column) => (
                  <th
                    key={column.key as string}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={teamColumns.length} className="px-6 py-4 text-center">
                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-[#F28C38]" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={teamColumns.length} className="px-6 py-4 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={teamColumns.length} className="px-6 py-4 text-center text-gray-500">
                    No teams found
                  </td>
                </tr>
              ) : (
                filteredTeams.map((team) => (
                  <React.Fragment key={team.id}>
                    <tr 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleTeamExpanded(team.id)}
                    >
                      {teamColumns.map((column) => (
                        <td key={`${team.id}-${column.key as string}`} className="px-6 py-4 whitespace-nowrap">
                          {column.render ? column.render(team[column.key as keyof typeof team], team, 0) : String(team[column.key as keyof typeof team])}
                        </td>
                      ))}
                    </tr>
                    {expandedTeams.has(team.id) && (
                      <tr>
                        <td colSpan={teamColumns.length} className="p-0">
                          <PlayerSubTable players={getFilteredPlayers(team.id)} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
                    <span className="text-gray-500">Approval Status:</span>
                    <div className={`font-medium capitalize ${
                      selectedPlayer.verificationStatus === 'approved' ? 'text-green-600' :
                      selectedPlayer.verificationStatus === 'rejected' ? 'text-red-600' : 'text-yellow-600'
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
                    currentUrl={selectedPlayer.documents?.profilePhoto?.url}
                    onSuccess={(url) => {
                      loadTeams();
                    }}
                    onError={(error) => {
                      console.error(`Upload failed: ${error}`);
                    }}
                    variant="card"
                  />
                  <PlayerDocumentUpload
                    playerId={selectedPlayer.id}
                    playerUserId={selectedPlayer.userId || selectedPlayer.id}
                    documentType="aadhaarFront"
                    label="Aadhaar Front"
                    currentUrl={selectedPlayer.documents?.aadhaarFront?.url}
                    onSuccess={(url) => {
                      loadTeams();
                    }}
                    onError={(error) => {
                      console.error(`Upload failed: ${error}`);
                    }}
                    variant="card"
                  />
                  <PlayerDocumentUpload
                    playerId={selectedPlayer.id}
                    playerUserId={selectedPlayer.userId || selectedPlayer.id}
                    documentType="aadhaarBack"
                    label="Aadhaar Back"
                    currentUrl={selectedPlayer.documents?.aadhaarBack?.url}
                    onSuccess={(url) => {
                      loadTeams();
                    }}
                    onError={(error) => {
                      console.error(`Upload failed: ${error}`);
                    }}
                    variant="card"
                  />
                </div>
              </div>

              {/* Approval Comments */}
              {selectedPlayer.verificationComments && selectedPlayer.verificationComments.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Approval Comments</h4>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    {selectedPlayer.verificationComments.join(', ')}
                  </div>
                </div>
              )}

              {/* Action Buttons - Mobile Responsive */}
              {selectedPlayer.verificationStatus !== 'approved' && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={async () => {
                      await handlePlayerStatusChange(selectedPlayer, 'approved');
                      setSelectedPlayer(null);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 sm:py-2 rounded-lg font-medium transition-colors flex items-center justify-center text-sm sm:text-base"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Player
                  </button>
                  <button
                    onClick={async () => {
                      await handlePlayerStatusChange(selectedPlayer, 'rejected');
                      setSelectedPlayer(null);
                    }}
                    className="flex-1 text-red-600 border border-red-300 hover:bg-red-50 px-4 py-3 sm:py-2 rounded-lg font-medium transition-colors flex items-center justify-center text-sm sm:text-base"
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

      {/* Player Management Modal */}
      {selectedTeamForPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Manage Team Players</h3>
              <button 
                onClick={() => setSelectedTeamForPlayer(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <PlayerManagementModal
                teamId={selectedTeamForPlayer}
                onPlayerAdded={loadTeams}
                onPlayerRemoved={loadTeams}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Apply filters from URL parameters on page load
  useEffect(() => {
    const statusFilter = searchParams.get('status');
    if (statusFilter) {
      const newFilter: ActiveFilter = {
        key: 'teamStatus',
        value: statusFilter,
        label: 'Team Status'
      };
      setActiveFilters([newFilter]);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && !authLoading) {
      loadSports();
      loadTeams();
    }
  }, [user, authLoading, venueId, loadTeams]);

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

  // Handle adding player to team
  const handleAddPlayer = useCallback(async (teamId: string, playerEmail: string): Promise<boolean> => {
    try {
      const result = await addPlayerToTeam({ teamId, playerEmail });
      if (result.success) {
        // Refresh team data
        await loadTeams();
        return true;
      } else {
        setError(result.error || 'Failed to add player');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add player');
      return false;
    }
  }, [loadTeams]);

  // Handle removing player from team
  const handleRemovePlayer = useCallback(async (teamId: string, playerId: string): Promise<boolean> => {
    try {
      const result = await removePlayerFromTeam({ teamId, playerId });
      if (result.success) {
        // Refresh team data
        await loadTeams();
        return true;
      } else {
        setError(result.error || 'Failed to remove player');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove player');
      return false;
    }
  }, [loadTeams]);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <button
          onClick={() => {
            setActiveFilters([]);
            setSearchValue('');
          }}
          className="rounded-lg p-4 shadow-sm border hover:bg-gray-50 text-left transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Teams</p>
              <p className="text-2xl font-bold text-gray-900">{teams.length}</p>
            </div>
            <Users className="w-8 h-8 text-gray-400" />
          </div>
        </button>
        
        <button
          onClick={() => {
            setActiveFilters([{ key: 'status', value: 'checked_in', label: 'Status', displayValue: 'Checked In' }]);
            setSearchValue('');
          }}
          className="rounded-lg p-4 shadow-sm border hover:bg-gray-50 text-left transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Checked In</p>
              <p className="text-2xl font-bold text-green-600">
                {teams.filter(t => t.status === 'checked_in').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </button>
        
        <button
          onClick={() => {
            setActiveFilters([{ key: 'status', value: 'verified', label: 'Status', displayValue: 'Verified' }]);
            setSearchValue('');
          }}
          className="rounded-lg p-4 shadow-sm border hover:bg-gray-50 text-left transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Confirmed</p>
              <p className="text-2xl font-bold text-blue-600">
                {teams.filter(t => t.status === 'verified').length}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-blue-400" />
          </div>
        </button>
        
        <button
          onClick={() => {
            setActiveFilters([{ key: 'status', value: 'submitted', label: 'Status', displayValue: 'Submitted' }]);
            setSearchValue('');
          }}
          className="rounded-lg p-4 shadow-sm border hover:bg-gray-50 text-left transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Unconfirmed</p>
              <p className="text-2xl font-bold text-yellow-600">
                {teams.filter(t => t.status === 'submitted').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </button>
      </div>
      
      {/* Player Modal */}
      <PlayerModal 
        player={selectedPlayer} 
        onClose={() => setSelectedPlayer(null)} 
      />

      {/* Player Management Modal */}
      {playerManagementTeam && (
        <PlayerManagementModal
          teamId={playerManagementTeam}
          players={teamPlayers[playerManagementTeam.id] || []}
          onClose={() => setPlayerManagementTeam(null)}
          onPlayerStatusChange={async (playerId: string, newStatus: string) => {
            const player = Object.values(teamPlayers).flat().find(p => p.id === playerId);
            if (player) {
              await handlePlayerStatusChange(player, newStatus as 'pending' | 'verified' | 'approved' | 'rejected');
            }
          }}
          onAddPlayer={handleAddPlayer}
          onRemovePlayer={handleRemovePlayer}
        />
      )}

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
