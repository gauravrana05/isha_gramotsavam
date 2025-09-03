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
  CloudOff,
  RefreshCw,
  Plus,
  Trophy,
  Eye
} from 'lucide-react';
import { StatusBadge } from '@/components/ui';
import { ActionButton } from '@/components/ui/ActionButton';

// Types
interface PlayerData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  verificationStatus: 'pending' | 'verified' | 'approved' | 'rejected';
  profilePhoto?: string;
  aadhaarFront?: string;
  aadhaarBack?: string;
  createdAt: string;
}

interface TeamData {
  id: string;
  name: string;
  status: 'draft' | 'submitted' | 'verified' | 'approved' | 'rejected';
  sport: { id: string; name: string; };
  captainUser: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  currentPlayers: number;
  verifiedPlayersCount: number;
  verificationStatus?: string;
}

export default function TeamsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { venueId, lang } = params as { venueId: string; lang: string };
  const { user, loading: authLoading } = useAuth();
  const { 
    isOnline, 
    connectionQuality, 
    pendingActions, 
    syncStatus 
  } = useOffline();
  const { t } = useTranslation();
  const { addNotification } = useNotification();
  
  // State management
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isUpdatingPlayer, setIsUpdatingPlayer] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Long press handlers for mobile selection
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

  // Data fetching with tRPC
  const { 
    data: teamsData, 
    isLoading: teamsLoading, 
    error: teamsError,
    refetch: refetchTeams
  } = api.volunteers.venue.getVenueTeams.useQuery(
    { venueId: venueId || '' },
    { 
      enabled: !!user && !!venueId && venueId.length > 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true
    }
  );

  // Fetch venue details for location information needed in CreateTeamModal
  const { 
    data: venueData, 
    isLoading: venueLoading 
  } = api.volunteers.venue.getVenueDetails.useQuery(
    { venueId: venueId || '' },
    { 
      enabled: !!user && !!venueId && venueId.length > 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true
    }
  );

  const teams = teamsData || [];

  // Filter configuration
  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'teamStatus',
      label: 'Team Status',
      type: 'select',
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'submitted', label: 'Submitted' },
        { value: 'verified', label: 'Verified' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' }
      ]
    }
  ], []);

  // Mutations
  const updatePlayerStatusMutation = api.volunteers.team.updatePlayerVerificationStatus.useMutation({
    onSuccess: () => {
      addNotification('Player status updated successfully', 'success');
      setIsUpdatingPlayer(false);
    },
    onError: (error) => {
      addNotification(`Failed to update player status: ${error.message}`, 'error');
      setIsUpdatingPlayer(false);
    }
  });

  // Team detail queries - simplified to avoid circular dependencies
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
  }, [teams.length]);

  const toggleTeamExpanded = useCallback(async (teamId: string) => {
    setExpandedTeams(prev => {
      const newExpanded = new Set(prev);
      
      if (newExpanded.has(teamId)) {
        newExpanded.delete(teamId);
      } else {
        newExpanded.add(teamId);
      }
      
      return newExpanded;
    });
  }, []);

  const findPlayerTeam = useCallback((playerId: string) => {
    // Simplified to avoid circular dependencies
    return undefined;
  }, [teams]);

  // Filter teams based on search and filters - FIXED to avoid circular dependency
  const { filteredTeams, teamMatchTypes } = useMemo(() => {
    let filtered = teams;
    const newTeamMatchTypes: Record<string, 'team' | 'player'> = {};

    // Apply search filter - ONLY team data, no player search to avoid circular dependency
    if (searchValue.trim()) {
      const search = searchValue.toLowerCase().trim();
      filtered = filtered.filter(team => {
        // Search in team data only
        const teamMatches = team.name?.toLowerCase().includes(search) ||
          team.captainUser?.firstName?.toLowerCase().includes(search) ||
          team.captainUser?.lastName?.toLowerCase().includes(search) ||
          team.captainUser?.phone?.includes(search);
        
        if (teamMatches) {
          newTeamMatchTypes[team.id] = 'team';
          return true;
        }
        
        return false;
      });
    } else {
      filtered.forEach(team => {
        newTeamMatchTypes[team.id] = 'team';
      });
    }

    // Apply status filters - only team-level filters to avoid circular dependency
    if (activeFilters.length > 0) {
      filtered = filtered.filter(team => {
        return activeFilters.every(filter => {
          if (filter.key === 'teamStatus') {
            return team.verificationStatus === filter.value || team.status === filter.value;
          }
          return true;
        });
      });
    }

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
      phone: player.phone,
      verificationStatus: player.verificationStatus || 'pending',
      profilePhoto: player.profilePhoto,
      aadhaarFront: player.aadhaarFront,
      aadhaarBack: player.aadhaarBack,
      createdAt: player.createdAt
    }));

    return players;
  }, [teamDetailQueries, searchValue, activeFilters]); // REMOVED teamMatchTypes to break circular dependency

  // Handle team creation success
  const handleTeamCreated = useCallback(async (teamId: string) => {
    setShowCreateModal(false);
    addNotification('Team created successfully!', 'success');
    
    // Refetch teams data
    await refetchTeams();
    
    // Navigate to the new team's detail page
    if (teamId && teamDetailQueries[teamId]) {
      await teamDetailQueries[teamId].refetch();
    }
  }, [refetchTeams, teamDetailQueries, addNotification]);

  // Handle player status change
  const handlePlayerStatusChange = useCallback(async (player: PlayerData, newStatus: 'pending' | 'verified' | 'approved' | 'rejected') => {
    if (!user) return;

    try {
      setIsUpdatingPlayer(true);
      
      await updatePlayerStatusMutation.mutateAsync({
        playerId: player.id,
        status: newStatus,
        verifiedBy: user.id
      });

      // Find which team this player belongs to and refetch that team's data
      const teamId = findPlayerTeam(player.id);
      if (teamId && teamDetailQueries[teamId]) {
        await teamDetailQueries[teamId].refetch();
      }
      
      // Close the modal
      setSelectedPlayer(null);
      
    } catch (error) {
      console.error('Error updating player status:', error);
    }
  }, [user, updatePlayerStatusMutation, findPlayerTeam, teamDetailQueries]);

  // Team columns only - players will have their own sub-table
  const teamColumns: Column<any>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Team',
      render: (team) => {
        if (!team) return null;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-900">{team.name}</div>
              <div className="text-sm text-gray-500">{team.sport?.name}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'captain',
      header: 'Captain',
      render: (team) => {
        if (!team) return null;
        return (
          <div>
            <div className="font-medium text-gray-900">
              {team.captainUser?.firstName} {team.captainUser?.lastName}
            </div>
            <div className="text-sm text-gray-500 flex items-center">
              <Phone className="w-3 h-3 mr-1" />
              {team.captainUser?.phone}
            </div>
          </div>
        );
      }
    },
    {
      key: 'players',
      header: 'Players',
      render: (team) => {
        if (!team) return null;
        return (
          <div className="text-center">
            <div className="font-medium text-gray-900">{team.currentPlayers}</div>
            <div className="text-xs text-gray-500">
              {team.verifiedPlayersCount} verified
            </div>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (team) => (
        <StatusBadge
          status={team.verificationStatus || team.status || 'draft'} 
          variant="team"
        />
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (team) => (
        <div className="flex items-center space-x-2">
          <ActionButton
            icon={Eye}
            onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/teams/${team.id}`)}
            tooltip="View Details"
            variant="ghost"
            size="sm"
          />
        </div>
      )
    }
  ], [lang, venueId, router]);

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
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Error Loading Teams</h1>
          <p className="text-lg text-gray-600 mb-6">{teamsError.message}</p>
          <button 
            onClick={() => refetchTeams()}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F0E5]">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Management</h1>
              <p className="text-gray-600">Manage team registrations and player verification</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Connection Status */}
              <div className="flex items-center gap-2 text-sm">
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-orange-600" />
                    <span className="text-orange-600">Offline</span>
                  </>
                )}
                {pendingActions.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                    {pendingActions.length} pending
                  </span>
                )}
              </div>

              <button
                onClick={() => refetchTeams()}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Team
              </button>
            </div>
          </div>
        </div>

        {/* Teams Table with Complete AdvancedTable */}
        <AdvancedTable
          data={filteredTeams}
          columns={teamColumns}
          loading={teamsLoading}
          keyExtractor={(team) => team.id}
          
          // Search functionality
          searchable={true}
          searchPlaceholder="Search teams by name, captain..."
          
          // Filter functionality
          filterable={true}
          filters={filterFields}
          
          // Expandable functionality for players
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
                <div className="p-6 bg-gray-50">
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
                    <span className="text-gray-500">Loading players...</span>
                  </div>
                </div>
              );
            }

            const players = getFilteredPlayers(team.id);
            
            return (
              <div className="p-6 bg-gray-50 border-t">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Team Players ({players.length})
                </h4>
                
                {players.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No players found for this team</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {players.map((player) => (
                      <div 
                        key={player.id}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => setSelectedPlayer(player)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {player.firstName} {player.lastName}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {player.phone}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <VerificationStatusSelector
                            value={player.verificationStatus}
                            onChange={(newStatus) => {
                              handlePlayerStatusChange(player, newStatus as 'pending' | 'verified' | 'approved' | 'rejected');
                            }}
                          />
                          <Eye className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }}
          
          // Row interactions
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
          
          // Selection
          selectable={true}
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
          
          // Bulk actions
          bulkActions={[
            {
              label: 'Check In Selected',
              icon: CheckCircle,
              onClick: async (selectedItems) => {
                const selectedTeamIds = selectedItems.map(team => team.id);
                
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
              }
            }
          ]}
          
          // Header actions
          headerActions={(
            <button
              onClick={() => setCreateTeamModal(true)}
              className="bg-[#F28C38] text-white px-4 py-2 rounded-lg hover:bg-[#E67A26] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Team
            </button>
          )}
          
          // Styling
          stickyHeader={true}
          compact={false}
          emptyMessage="No teams found"
          
          // Pagination
          pagination={{
            enabled: true,
            pageSize: 10,
            pageSizeOptions: [5, 10, 20, 50]
          }}
        />

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{teams.length}</div>
                <div className="text-sm text-gray-500">Total Teams</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {teams.filter(t => t.verificationStatus === 'verified' || t.status === 'verified').length}
                </div>
                <div className="text-sm text-gray-500">Verified Teams</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {teams.filter(t => t.verificationStatus === 'pending' || t.status === 'submitted').length}
                </div>
                <div className="text-sm text-gray-500">Pending Review</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <User className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {teams.reduce((sum, team) => sum + (team.currentPlayers || 0), 0)}
                </div>
                <div className="text-sm text-gray-500">Total Players</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateTeamModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleTeamCreated}
          venueId={venueId}
          venueData={venueData}
        />
      )}

      {selectedPlayer && (
        <PlayerDetailsModal
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          player={selectedPlayer}
          onStatusChange={handlePlayerStatusChange}
          isUpdating={isUpdatingPlayer}
        />
      )}
    </div>
  );
}
