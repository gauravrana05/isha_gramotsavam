'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getVenueTeamsForMatchDay, verifyPlayerMatchDay } from '@/lib/actions/volunteer/matchDayVerification';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import DocumentPreview from '@/components/documents/DocumentPreview';
import { TableControls } from '@/components/ui/TableControls';
import type { ActiveFilter } from '@/components/ui/FilterSidebar';
import { VerificationStatusSelector } from '@/components/ui/StatusSelector';
import PlayerManagementModal from '@/components/volunteer/PlayerManagementModal';
import CreateTeamModal from '@/components/volunteer/CreateTeamModal';
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
  X
} from 'lucide-react';

export default function MatchDayTeamsPage() {
  const params = useParams();
  const router = useRouter();
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
  const [previewImage, setPreviewImage] = useState<{url: string, label: string} | null>(null);
  const [playerManagementTeam, setPlayerManagementTeam] = useState<any>(null);
  const [createTeamModal, setCreateTeamModal] = useState(false);

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
        const foundPlayer = teamPlayers[team.id].find(p => p.id === playerId);
        if (foundPlayer) return team.id;
      }
    }
    return undefined;
  }, [teams, teamPlayers]);

  // Filter teams based on search and filters
  const filteredTeams = useMemo(() => {
    let filtered = teams;

    // Apply search filter
    if (searchValue.trim()) {
      const search = searchValue.toLowerCase().trim();
      filtered = filtered.filter(team => 
        team.name?.toLowerCase().includes(search) ||
        team.captainProfile?.name?.toLowerCase().includes(search) ||
        team.panchayat?.toLowerCase().includes(search) ||
        team.district?.toLowerCase().includes(search) ||
        team.sportName?.toLowerCase().includes(search)
      );
    }

    // Apply active filters
    activeFilters.forEach(filter => {
      if (filter.value && filter.value !== '') {
        filtered = filtered.filter(team => {
          let teamValue = team[filter.key];
          
          // Special handling for status filter to map old field names
          if (filter.key === 'status') {
            teamValue = team.status || team.matchDayStatus;
          }
          
          if (Array.isArray(filter.value)) {
            return filter.value.includes(teamValue);
          }
          return teamValue === filter.value;
        });
      }
    });

    return filtered;
  }, [teams, searchValue, activeFilters]);


  // Team columns only - players will have their own sub-table
  const teamColumns: Column<any>[] = useMemo(() => [
      {
        key: 'name',
        header: 'Team',
        sortable: true,
        render: (_value, item, _index) => {
          if (!item || item._type !== 'team') return null;
          
          return (
            <div className="flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTeamExpanded(item.id);
                }}
                className="mr-3 p-1 hover:bg-gray-100 rounded"
              >
                {expandedTeams.has(item.id) ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                )}
              </button>
              <div>
                <div className="font-semibold text-gray-900">{item.name || 'N/A'}</div>
              </div>
            </div>
          );
        }
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (_value, item, _index) => {
          if (!item || item._type !== 'team') return null;
          
          return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.matchDayStatus)}`}>
              {getStatusIcon(item.matchDayStatus)}
              <span className="ml-1 capitalize">{item.matchDayStatus || 'pending'}</span>
            </span>
          );
        }
      },
      {
        key: 'captain',
        header: 'Captain',
        render: (_value, item, _index) => {
          if (!item || item._type !== 'team') return null;
          return <div className="text-sm text-gray-900">{item.captainProfile?.name || 'N/A'}</div>;
        }
      },
      {
        key: 'captainPhone',
        header: 'Captain Phone',
        className: 'hidden sm:table-cell',
        headerClassName: 'hidden sm:table-cell',
        render: (_value, item, _index) => {
          if (!item || item._type !== 'team') return null;
          return <div className="text-sm text-gray-600">{item.captainProfile?.phone || 'N/A'}</div>;
        }
      },
      {
        key: 'players',
        header: 'Players',
        render: (_value, item, _index) => {
          if (!item || item._type !== 'team') return null;
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-900 font-medium">
                {item.verifiedPlayersCount || 0}/{item.currentPlayers || 0}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPlayerManagementTeam(item);
                }}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                Manage
              </button>
            </div>
          );
        }
      }
  ], [expandedTeams, toggleTeamExpanded]);

  // Helper component for player sub-table
  const PlayerSubTable = ({ players }: { players: any[] }) => (
    <tr>
      <td colSpan={5} className="p-0">
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
                    <div className="text-xs text-gray-500">{player.position || 'N/A'}</div>
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

          {/* Profile Photo */}
          {player.documents?.profilePhoto?.url && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Profile Photo</h4>
              <DocumentPreview
                type="profilePhoto"
                url={player.documents.profilePhoto.url}
                label="Profile Photo"
                verified={player.documents.profilePhoto.verified}
                showActions={false}
                size="lg"
              />
            </div>
          )}

          {/* Documents Status */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Documents</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Profile Photo:</span>
                <span className={player.documents?.profilePhoto?.url ? 'text-green-600' : 'text-red-600'}>
                  {player.documents?.profilePhoto?.url ? 'Uploaded' : 'Missing'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Aadhaar Front:</span>
                <span className={player.documents?.aadhaarFront?.url ? 'text-green-600' : 'text-red-600'}>
                  {player.documents?.aadhaarFront?.url ? 'Uploaded' : 'Missing'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Aadhaar Back:</span>
                <span className={player.documents?.aadhaarBack?.url ? 'text-green-600' : 'text-red-600'}>
                  {player.documents?.aadhaarBack?.url ? 'Uploaded' : 'Missing'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setError('Please log in to access this page');
      setLoading(false);
      return;
    }

    loadTeams();
  }, [user, authLoading, venueId]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const teamsResult = await getVenueTeamsForMatchDay(venueId, user!.uid);
      
      if (teamsResult.success) {
        const teams = teamsResult.teams ?? [];
        setTeams(teams);
        
        // Auto-expand all teams and load all players by default
        const allTeamIds = new Set(teams.map((team: any) => team.id));
        setExpandedTeams(allTeamIds);
        
        // Load players for all teams
        for (const team of teams) {
          if (team.id) {
            await loadTeamPlayers(team.id);
          }
        }
      } else {
        setError(teamsResult.error || 'Failed to load teams');
      }
    } catch (err) {
      // Error handling removed
      setError('Failed to load teams');
    } finally {
      setLoading(false);
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

        // Also update the teams list to reflect any team status changes
        setTeams(prevTeams => 
          prevTeams.map(team => {
            const teamId = player._parentId || findPlayerTeam(player.id);
            if (team.id === teamId && (result as any).teamStatusChanged) {
              return { ...team, status: (result as any).teamStatus };
            }
            return team;
          })
        );

        // Reload full data in background to ensure consistency
        setTimeout(() => {
          loadTeams();
        }, 1000);
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
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-2 sm:items-center mb-4">
        <div className="flex-1">
          <TableControls
            searchable={true}
            searchValue={searchValue}
            searchPlaceholder="Search teams, captains, or locations..."
            onSearchChange={setSearchValue}
            filterable={true}
            showFilterButton={true}
            activeFilters={activeFilters}
            onFilterRemove={(key) => {
              setActiveFilters(activeFilters.filter(f => f.key !== key));
            }}
            onFiltersClear={() => setActiveFilters([])}
            showResultsInfo={true}
            totalResults={filteredTeams.length}
            currentPage={1}
            pageSize={filteredTeams.length}
            compact={true}
            filters={[
              {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: [
                  { label: 'All', value: 'all' },
                  { label: 'Submitted', value: 'submitted' },
                  { label: 'Verified', value: 'verified' },
                  { label: 'Checked In', value: 'checked_in' },
                  { label: 'Rejected', value: 'rejected' }
                ]
              },
              {
                key: 'sport',
                label: 'Sport',
                type: 'select',
                options: [
                  { label: 'All Sports', value: 'all' },
                  { label: 'Volleyball', value: 'volleyball' },
                  { label: 'Throwball', value: 'throwball' }
                ]
              },
              {
                key: 'gender',
                label: 'Gender',
                type: 'select',
                options: [
                  { label: 'All', value: 'all' },
                  { label: 'Men', value: 'M' },
                  { label: 'Women', value: 'F' }
                ]
              }
            ]}
            onFilterChange={(key, value) => {
              if (value === 'all') {
                setActiveFilters(activeFilters.filter(f => f.key !== key));
              } else {
                const filterLabels = {
                  status: { submitted: 'Submitted', verified: 'Verified', checked_in: 'Checked In', rejected: 'Rejected' },
                  sport: { volleyball: 'Volleyball', throwball: 'Throwball' },
                  gender: { M: 'Men', F: 'Women' }
                };
                const displayValue = filterLabels[key as keyof typeof filterLabels]?.[value as keyof typeof filterLabels[keyof typeof filterLabels]] || value;
                setActiveFilters([
                  ...activeFilters.filter(f => f.key !== key),
                  { key, value, label: key === 'status' ? 'Status' : key === 'sport' ? 'Sport' : 'Gender', displayValue }
                ]);
              }
            }}
          />
        </div>
        
        {/* Create Team Button */}
        <div className="flex justify-end sm:justify-start">
          <button
            onClick={() => setCreateTeamModal(true)}
            className="bg-[#F28C38] text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-[#E67A26] transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Create New Team</span>
            <span className="sm:hidden">Create</span>
          </button>
        </div>
      </div>

      {/* Teams Table with Nested Player Sub-Tables */}
      <div className="bg-white sm:rounded-lg sm:border overflow-hidden">
        <div 
          className="overflow-x-auto" 
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#F28C38 #f3f4f6'
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              height: 6px;
            }
            div::-webkit-scrollbar-track {
              background: #f3f4f6;
              border-radius: 3px;
            }
            div::-webkit-scrollbar-thumb {
              background: #F28C38;
              border-radius: 3px;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: #E67A26;
            }
            @media (max-width: 768px) {
              div::-webkit-scrollbar {
                height: 4px;
              }
            }
          `}</style>
          <table className="w-full divide-y divide-gray-200" style={{ minWidth: '600px' }}>
            <thead className="bg-gray-200 sticky top-0 z-10">
              <tr>
                {teamColumns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.headerClassName || ''}`}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTeams.map((team) => (
                <React.Fragment key={team.id}>
                  {/* Team Row */}
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/teams/${team.id}`)}
                  >
                    {teamColumns.map((column) => (
                      <td key={column.key} className={`px-4 py-4 whitespace-nowrap ${column.className || ''}`}>
                        {column.render ? column.render(null, { ...team, _type: 'team' }, 0) : null}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Player Sub-Table */}
                  {expandedTeams.has(team.id) && teamPlayers[team.id] && (
                    <PlayerSubTable players={teamPlayers[team.id]} />
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
          team={playerManagementTeam}
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
        venueId={venueId}
        venueLocation={teams.length > 0 ? {
          panchayat: teams[0].panchayat || '',
          district: teams[0].district || '',
          state: teams[0].state || ''
        } : undefined}
        onTeamCreated={loadTeams}
      />

      {/* Full Screen Image Preview */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={previewImage.url}
              alt={previewImage.label}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
