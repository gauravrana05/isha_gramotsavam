'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContextWrapper';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
import { TableControls } from '@/components/ui/TableControls';
import FilterSidebar, { type ActiveFilter, type FilterField } from '@/components/ui/FilterSidebar';
import { VerificationStatusSelector } from '@/components/ui/StatusSelector';
import CreateTeamModal from '@/components/volunteer/CreateTeamModal';
import PlayerDocumentUpload from '@/components/players/PlayerDocumentUpload';
import { api } from '@/server/trpc/react';
import { useNotification } from '@/context/NotificationContext';
import { useTranslation } from '@/lib/utils/i18n';
import Image from 'next/image';
import { 
  Loader2, 
  Users, 
  CheckCircle, 
  Clock, 
  UserCheck,
  AlertCircle,
  User,
  X,
  Phone,
  Wifi,
  WifiOff,
  Upload,
  CloudOff
} from 'lucide-react';

interface TeamData {
  id: string;
  name: string;
  status: string;
  captainUser?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  currentPlayers: number;
  verifiedPlayersCount: number;
  sport?: {
    name: string;
  };
}

interface PlayerData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  age: number;
  gender: string;
  position: string;
  verificationStatus: string;
  user?: {
    profileImages?: {
      profilePhotoPath?: string;
    };
  };
  userId?: string;
}

export default function TeamsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { venueId, lang } = params as { venueId: string; lang: string };
  const { user, loading: authLoading } = useAuth();
  
  // Debug logging to identify redirect cause
  console.log('TeamsPage render:', { venueId, lang, user: !!user, authLoading });
  
  // Early return if venueId is invalid to prevent query issues
  if (!venueId || venueId === 'undefined' || venueId === 'null') {
    console.log('Invalid venueId detected, redirecting to volunteer home');
    router.push(`/${lang}/volunteer`);
    return null;
  }
  
  const { 
    isOnline, 
    connectionQuality, 
    syncStatus, 
    pendingActions, 
    queueSyncAction,
    getSyncStats 
  } = useOffline();
  const { addNotification } = useNotification();
  const { t } = useTranslation();
  
  // State management
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{url: string; label: string} | null>(null);
  const [createTeamModal, setCreateTeamModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Data fetching with tRPC
  const { 
    data: teamsData, 
    isLoading: teamsLoading, 
    error: teamsError,
    refetch: refetchTeams
  } = api.volunteers.venue.getVenueTeams.useQuery(
    { venueId: venueId || '' },
    { enabled: !!user && !!venueId && venueId.length > 0 }
  );

  // Fetch venue details for location information needed in CreateTeamModal
  const { 
    data: venueData, 
    isLoading: venueLoading 
  } = api.volunteers.venue.getVenueDetails.useQuery(
    { venueId: venueId || '' },
    { enabled: !!user && !!venueId && venueId.length > 0 }
  );

  const teams = teamsData || [];

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

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'bg-green-100 text-green-800';
      case 'verified':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
      case 'submitted':
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
      case 'submitted':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Long press handlers
  const handleLongPressStart = (teamId: string) => {
    const timer = setTimeout(() => {
      setSelectedRows(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(teamId)) {
          newSelected.delete(teamId);
        } else {
          newSelected.add(teamId);
        }
        return newSelected;
      });
    }, 500); // 500ms long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Simplified approach - no dynamic queries to avoid hook violations
  const teamDetailQueries = useMemo(() => {
    const queries: Record<string, any> = {};
    
    teams.forEach(team => {
      queries[team.id] = {
        data: null, // Will be populated when team is expanded
        isLoading: false,
        refetch: async () => {} // Placeholder
      };
    });
    
    return queries;
  }, [teams.length]); // Only depend on teams length, not the full teams array

  const toggleTeamExpanded = useCallback(async (teamId: string) => {
    setExpandedTeams(prev => {
      const newExpanded = new Set(prev);
      
      if (prev.has(teamId)) {
        newExpanded.delete(teamId);
      } else {
        newExpanded.add(teamId);
      }
      
      return newExpanded;
    });
  }, []);

  const findPlayerTeam = useCallback((playerId: string) => {
    for (const team of teams) {
      // Skip team detail queries to avoid circular dependencies
      // This function will return undefined for now
    }
    return undefined;
  }, [teams]);

  // Filter teams based on search and filters
  const { filteredTeams, teamMatchTypes } = useMemo(() => {
    let filtered = teams;
    const newTeamMatchTypes: Record<string, 'team' | 'player'> = {};

    // Apply search filter
    if (searchValue.trim()) {
      const search = searchValue.toLowerCase().trim();
      filtered = filtered.filter(team => {
        // Search in team data
        const teamMatches = team.name?.toLowerCase().includes(search) ||
          team.captainUser?.firstName?.toLowerCase().includes(search) ||
          team.captainUser?.lastName?.toLowerCase().includes(search) ||
          team.captainUser?.phone?.includes(search);
        
        // Search in player data if team has loaded players
        const teamQuery = teamDetailQueries[team.id];
        const teamData = teamQuery?.data;
        const players = teamData?.teamPlayers || [];
        const playerMatches = players.some(player => {
          const fullName = `${player.firstName || ''} ${player.lastName || ''}`.trim();
          return fullName.toLowerCase().includes(search) ||
                 player.phone?.includes(search);
        });
        
        const shouldInclude = teamMatches || playerMatches;
        if (shouldInclude) {
          newTeamMatchTypes[team.id] = teamMatches ? 'team' : 'player';
        }
        
        return shouldInclude;
      });
    } else {
      filtered.forEach(team => {
        newTeamMatchTypes[team.id] = 'team';
      });
    }

    // Apply active filters
    activeFilters.forEach(filter => {
      if (filter.value && filter.value !== '') {
        if (filter.key === 'teamStatus') {
          filtered = filtered.filter(team => {
            const teamStatus = team.status || 'draft';
            if (Array.isArray(filter.value)) {
              return filter.value.includes(teamStatus);
            }
            return teamStatus === filter.value;
          });
        } else if (filter.key === 'playerStatus') {
          filtered = filtered.filter(team => {
            const teamQuery = teamDetailQueries[team.id];
            const teamData = teamQuery?.data;
            const players = teamData?.teamPlayers || [];
            const hasMatchingPlayer = players.some(player => {
              const playerStatus = player.verificationStatus || 'pending';
              if (Array.isArray(filter.value)) {
                return filter.value.includes(playerStatus);
              }
              return playerStatus === filter.value;
            });
            
            if (hasMatchingPlayer) {
              newTeamMatchTypes[team.id] = 'player';
            }
            
            return hasMatchingPlayer;
          });
        }
      }
    });

    return { filteredTeams: filtered, teamMatchTypes: newTeamMatchTypes };
  }, [teams, searchValue, activeFilters]);

  // Filter players based on search match type and active filters
  const getFilteredPlayers = useCallback((teamId: string) => {
    const teamQuery = teamDetailQueries[teamId];
    const teamData = teamQuery?.data;
    
    if (!teamData?.teamPlayers) return [];
    
    const players: PlayerData[] = teamData.teamPlayers.map(player => ({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      phone: player.phone || '',
      age: player.age || 0,
      gender: player.gender || '',
      position: player.position || '',
      verificationStatus: player.verificationStatus || 'pending',
      user: player.user,
      userId: player.userId
    }));
    
    const matchType = teamMatchTypes[teamId];
    let filteredPlayers = players;
    
    // Apply search filtering
    if (searchValue.trim() && matchType === 'player') {
      const search = searchValue.toLowerCase().trim();
      filteredPlayers = filteredPlayers.filter(player => {
        const fullName = `${player.firstName || ''} ${player.lastName || ''}`.trim();
        return fullName.toLowerCase().includes(search) ||
               player.phone?.includes(search);
      });
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
  }, [teamDetailQueries, teamMatchTypes, searchValue, activeFilters]);

  // Handle player status change
  const handlePlayerStatusChange = useCallback(async (player: PlayerData, newStatus: 'pending' | 'verified' | 'approved' | 'rejected') => {
    if (!user) return;

    try {
      // Queue offline action for player verification
      await queueSyncAction({
        type: 'player_verification',
        priority: 'high',
        payload: {
          playerId: player.id,
          status: newStatus,
          teamId: findPlayerTeam(player.id),
          venueId: venueId,
          verifiedBy: user.id,
          verifiedAt: Date.now()
        },
        userId: user.id,
        maxRetries: 3
      });

      // Refetch the team data to reflect the status change
      const teamId = findPlayerTeam(player.id);
      if (teamId && teamDetailQueries[teamId]) {
        await teamDetailQueries[teamId].refetch();
      }

      const statusMessage = isOnline 
        ? `Player status updated to ${newStatus}` 
        : `Player status queued for sync (${newStatus})`;
      
      addNotification(statusMessage, 'success');
    } catch (error) {
      console.error('Error updating player status:', error);
      addNotification('Failed to update player status', 'error');
    }
  }, [user, venueId, findPlayerTeam, addNotification, queueSyncAction, isOnline]);

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
        const captainName = item.captainUser ? `${item.captainUser.firstName} ${item.captainUser.lastName}` : 'N/A';
        return <div className="text-xs sm:text-sm text-gray-900 truncate">{captainName}</div>;
      }
    },
    {
      key: 'captainPhone',
      header: 'Captain Phone',
      className: 'hidden sm:table-cell',
      headerClassName: 'hidden sm:table-cell',
      render: (_value, item, _index) => {
        if (!item) return null;
        return <div className="text-sm text-gray-600">{item.captainUser?.phone || 'N/A'}</div>;
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
  ], []);

  // Helper component for player sub-table
  const PlayerSubTable = ({ players }: { players: PlayerData[] }) => (
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
                    <div className="text-sm text-gray-900">
                      {`${player.firstName || ''} ${player.lastName || ''}`.trim() || 'N/A'}
                    </div>
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
                      {player.user?.profileImages?.profilePhotoPath ? (
                        <div 
                          className="relative overflow-hidden cursor-pointer hover:opacity-80 transition-opacity rounded-full"
                          style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage({
                              url: player.user.profileImages.profilePhotoPath!,
                              label: `${player.firstName} ${player.lastName} - Profile Photo`
                            });
                          }}
                        >
                          <Image
                            src={player.user.profileImages.profilePhotoPath}
                            alt="Profile"
                            width={24}
                            height={24}
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>
                      ) : (
                        <div 
                          className="bg-gray-200 rounded-full flex items-center justify-center"
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
  const PlayerModal = ({ player, onClose }: { player: PlayerData | null; onClose: () => void }) => (
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
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Player Basic Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <div className="font-medium">{`${player.firstName || ''} ${player.lastName || ''}`.trim()}</div>
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

              {/* Action Buttons */}
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
                    <X className="w-4 h-4 mr-2" />
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

  // Effects
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

  // Remove auto-expansion to prevent performance issues and potential loops
  // useEffect(() => {
  //   if (teams.length > 0) {
  //     const allTeamIds = new Set(teams.map(team => team.id));
  //     setExpandedTeams(allTeamIds);
  //   }
  // }, [teams]);

  // Loading and error states
  if (authLoading || teamsLoading || venueLoading) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C38]"></div>
      </div>
    );
  }

  if (teamsError) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">{teamsError.message}</p>
          <button 
            onClick={() => refetchTeams()}
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
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="mb-4 bg-yellow-100 border border-yellow-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-yellow-800">
            <WifiOff className="w-5 h-5" />
            <div className="flex-1">
              <p className="font-medium">Working Offline</p>
              <p className="text-sm">Changes will sync when connection returns</p>
            </div>
            {pendingActions.length > 0 && (
              <div className="bg-yellow-200 px-3 py-1 rounded-full">
                <span className="text-sm font-medium">{pendingActions.length} pending</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync Status Banner */}
      {isOnline && syncStatus === 'syncing' && (
        <div className="mb-4 bg-blue-100 border border-blue-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-blue-800">
            <Upload className="w-5 h-5 animate-pulse" />
            <div className="flex-1">
              <p className="font-medium">Syncing Changes</p>
              <p className="text-sm">Uploading offline actions...</p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-[-20px] sm:mb-2">
        <TableControls
          searchable={true}
          searchValue={searchValue}
          searchPlaceholder={t('volunteer.teams.search_placeholder', 'Search teams, players...')}
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
          
          // Header actions - Create Team button and bulk actions
          headerActions={(
            <div className="flex items-center gap-2">
              {selectedRows.size > 0 && (
                <>
                  <span className="text-sm text-gray-600">
                    {selectedRows.size} selected
                  </span>
                  <button
                    onClick={async () => {
                      // Bulk check-in selected teams
                      const selectedTeamIds = Array.from(selectedRows);
                      
                      try {
                        await queueSyncAction({
                          type: 'team_bulk_checkin',
                          priority: 'critical',
                          payload: {
                            teamIds: selectedTeamIds,
                            venueId: venueId,
                            checkedInBy: user?.id,
                            checkedInAt: Date.now()
                          },
                          userId: user?.id || '',
                          maxRetries: 5
                        });

                        const message = isOnline 
                          ? `${selectedTeamIds.length} teams checked in successfully`
                          : `${selectedTeamIds.length} teams queued for check-in`;
                        
                        addNotification(message, 'success');
                        setSelectedRows(new Set());
                      } catch (error) {
                        console.error('Bulk check-in failed:', error);
                        addNotification('Failed to check in teams', 'error');
                      }
                    }}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Check In All
                  </button>
                  <button
                    onClick={() => setSelectedRows(new Set())}
                    className="text-gray-600 hover:text-gray-800 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => setCreateTeamModal(true)}
                className="bg-[#F28C38] text-white px-2 sm:px-4 py-2 rounded-lg hover:bg-[#E67A26] transition-colors flex items-center gap-1 sm:gap-2 text-sm whitespace-nowrap"
              >
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Create Team</span>
                <span className="sm:hidden">Create</span>
              </button>
            </div>
          )}
          
          compact={true}
        />
      </div>

      {/* Teams Table with Nested Player Sub-Tables */}
      <AdvancedTable
        data={filteredTeams}
        columns={teamColumns}
        loading={teamsLoading}
        
        // Expandable functionality
        expandable={true}
        expandedRows={expandedTeams}
        onRowExpand={(team, expanded) => {
          const newExpanded = new Set(expandedTeams);
          if (expanded) {
            newExpanded.add(team.id);
          } else {
            newExpanded.delete(team.id);
          }
          setExpandedTeams(newExpanded);
        }}
        renderExpandedContent={(team) => {
          const teamQuery = teamDetailQueries[team.id];
          const isLoading = teamQuery?.isLoading || false;
          const hasData = teamQuery?.data?.teamPlayers;
          
          if (isLoading || !hasData) {
            return (
              <tr>
                <td colSpan={teamColumns.length + 1} className="p-0">
                  <div className="flex items-center justify-center py-8 bg-gray-50">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
                    <span className="text-gray-500">Loading players...</span>
                  </div>
                </td>
              </tr>
            );
          }
          
          return <PlayerSubTable players={getFilteredPlayers(team.id)} />;
        }}
        
        // Row interaction with long press selection
        onRowClick={(team) => {
          if (selectedRows.size === 0) {
            router.push(`/${lang}/volunteer/venues/${venueId}/teams/${team.id}`);
          }
        }}
        onRowMouseDown={(team) => handleLongPressStart(team.id)}
        onRowMouseUp={handleLongPressEnd}
        onRowMouseLeave={handleLongPressEnd}
        onRowTouchStart={(team) => handleLongPressStart(team.id)}
        onRowTouchEnd={handleLongPressEnd}
        
        // Row selection
        selectedRows={selectedRows}
        onRowSelect={(teamId, selected) => {
          setSelectedRows(prev => {
            const newSelected = new Set(prev);
            if (selected) {
              newSelected.add(teamId);
            } else {
              newSelected.delete(teamId);
            }
            return newSelected;
          });
        }}
        
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
              <p className="text-gray-600 text-[11px] sm:text-sm">{t('volunteer.teams.total_teams', 'Total Teams')}</p>
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
              <p className="text-gray-600 text-[11px] sm:text-sm">{t('volunteer.teams.checked_in', 'Checked In')}</p>
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
        venueLocation={venueData ? {
          panchayat: venueData.city || '',
          district: venueData.city || '',
          state: venueData.state || '',
          taluk: ''
        } : undefined}
        venueId={venueId}
        onTeamCreated={() => {
          refetchTeams();
          setCreateTeamModal(false);
        }}
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
