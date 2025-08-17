"use client";

import { useState, useEffect, useCallback } from 'react';
import { Trophy, Plus, Trash2, RefreshCw, Users, Upload, Eye } from 'lucide-react';
import { Button, StatusBadge, AdvancedTable, Modal, type Column, type ActionButton } from '@/components/ui';
import Input from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { collectionManagers } from '../lib/firebaseOperations';
import { batchGenerators } from '../lib/dataGenerators';

interface TeamStats {
  total: number;
  byStatus: Record<string, number>;
  bySport: Record<string, number>;
}

export default function TeamsManagementEnhanced() {
  const [teams, setTeams] = useState<any[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [showTeamDetailModal, setShowTeamDetailModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);

  // Bulk creation form
  const [bulkCount, setBulkCount] = useState(5);
  const [teamStatus, setTeamStatus] = useState('draft');
  const [createLoading, setCreateLoading] = useState(false);

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const testTeams = await collectionManagers.teams.readTestData();
      
      // Filter out any malformed teams and add safety checks
      const validTeams = testTeams.filter(team => team && typeof team === 'object');
      setTeams(validTeams);

      // Calculate stats with null checks
      const byStatus: Record<string, number> = {};
      const bySport: Record<string, number> = {};

      validTeams.forEach(team => {
        if (team?.status) {
          byStatus[team.status] = (byStatus[team.status] || 0) + 1;
        }
        if (team?.sportName) {
          bySport[team.sportName] = (bySport[team.sportName] || 0) + 1;
        }
      });

      setStats({
        total: testTeams.length,
        byStatus,
        bySport
      });

    } catch (err: any) {
      setError(err.message || 'Failed to load teams');
      console.error('Error loading teams:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const handleBulkCreateTeams = async () => {
    try {
      setCreateLoading(true);

      const teamsData = batchGenerators.generateTeamsWithRoster(bulkCount, teamStatus);
      
      // Create teams in batches to avoid Firestore limits
      const batchSize = 10;
      for (let i = 0; i < teamsData.length; i += batchSize) {
        const batch = teamsData.slice(i, i + batchSize);
        await collectionManagers.teams.createBatch(batch);
      }

      setShowBulkCreateModal(false);
      loadTeams();

    } catch (err: any) {
      setError(err.message || 'Failed to create teams');
      console.error('Error creating teams:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setLoading(true);
      await collectionManagers.teams.deleteAllTestData();
      loadTeams();
    } catch (err: any) {
      setError(err.message || 'Failed to delete teams');
    }
  };

  const columns: Column[] = [
    {
      key: 'name',
      header: 'Team',
      render: (team) => (
        <div>
          <div className="font-medium">{team?.name || 'Unnamed Team'}</div>
          <div className="text-sm text-gray-500">
            {team?.genderCategory || 'N/A'} {team?.sportName || 'N/A'}
          </div>
        </div>
      )
    },
    {
      key: 'location',
      header: 'Location',
      render: (team) => (
        <div className="text-sm">
          <div>{team?.panchayat || 'N/A'}</div>
          <div className="text-gray-500">{team?.district || 'N/A'}, {team?.state || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'roster',
      header: 'Roster',
      render: (team) => (
        <div className="text-sm">
          <div>{team?.currentPlayers || 0}/{team?.maxPlayers || 0} Main</div>
          <div className="text-gray-500">{team?.currentSubstitutes || 0}/{team?.maxSubstitutes || 0} Sub</div>
          <div className="text-xs text-blue-600 mt-1">
            Captain: {team?.captainProfile?.name || 'N/A'}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (team) => (
        <StatusBadge 
          status={team?.status || 'draft'}
        />
      )
    },
    {
      key: 'event',
      header: 'Event',
      render: (team) => (
        <div className="text-sm">
          <div className="text-orange-600 font-medium">Isha Gramotsavam 2025</div>
          <div className="text-gray-500">{team?.eventId || 'N/A'}</div>
        </div>
      )
    }
  ];

  const actions: ActionButton[] = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (team) => {
        setSelectedTeam(team);
        setShowTeamDetailModal(true);
      },
      variant: 'secondary'
    }
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'verified', label: 'Verified' },
    { value: 'checked-in', label: 'Checked In' }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-gray-700" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Teams Management</h2>
            <p className="text-sm text-gray-600">Bulk create teams with complete rosters for Isha Gramotsavam 2025</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadTeams} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowBulkCreateModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Create Teams
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Teams</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.bySport?.Volleyball || 0}</div>
            <div className="text-sm text-gray-600">Volleyball Teams</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.bySport?.Throwball || 0}</div>
            <div className="text-sm text-gray-600">Throwball Teams</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{stats.byStatus?.verified || 0}</div>
            <div className="text-sm text-gray-600">Verified Teams</div>
          </div>
        </div>
      )}

      {/* Information Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">Team Creation Features</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Each team includes a captain and complete player roster</li>
          <li>• Volleyball teams: 6 main players + 6 substitutes</li>
          <li>• Throwball teams: 7 main players + 5 substitutes</li>
          <li>• All players have Indian names and locations from the same panchayat</li>
          <li>• Teams are automatically assigned to Isha Gramotsavam 2025 event</li>
        </ul>
      </div>

      {/* Actions Bar */}
      {teams.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            {teams.length} team(s) found with complete rosters
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAll}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All Test Teams
          </Button>
        </div>
      )}

      {/* Teams Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <AdvancedTable
          data={teams}
          columns={columns}
          actions={actions}
          loading={loading}
        />
      </div>

      {/* Bulk Create Modal */}
      <Modal
        isOpen={showBulkCreateModal}
        onClose={() => setShowBulkCreateModal(false)}
        title="Bulk Create Teams with Complete Rosters"
      >
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of teams
              </label>
              <Input
                type="number"
                min="1"
                max="50"
                value={bulkCount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBulkCount(parseInt(e.target.value) || 5)}
              />
              <p className="text-sm text-gray-500 mt-1">Maximum 50 teams per batch</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Status
              </label>
              <Select value={teamStatus} onValueChange={setTeamStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">What will be created:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• {bulkCount} teams with mixed Volleyball and Throwball</li>
              <li>• Each team gets a captain with contact details</li>
              <li>• Complete player rosters (6-13 players per team)</li>
              <li>• Players from same panchayat as team</li>
              <li>• Random but realistic Indian names and locations</li>
              <li>• All teams set to &quot;{statusOptions.find(s => s.value === teamStatus)?.label}&quot; status</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowBulkCreateModal(false)}
              disabled={createLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkCreateTeams}
              loading={createLoading}
            >
              Create {bulkCount} Teams
            </Button>
          </div>
        </div>
      </Modal>

      {/* Team Detail Modal */}
      {selectedTeam && (
        <Modal
          isOpen={showTeamDetailModal}
          onClose={() => {
            setShowTeamDetailModal(false);
            setSelectedTeam(null);
          }}
          title={`Team Details: ${selectedTeam.name}`}
        >
          <div className="p-6 space-y-6">
            {/* Team Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Sport</label>
                <p className="text-sm text-gray-900">{selectedTeam.sportName} ({selectedTeam.genderCategory})</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <StatusBadge status={selectedTeam.status} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <p className="text-sm text-gray-900">
                  {selectedTeam?.panchayat || 'N/A'}, {selectedTeam?.district || 'N/A'}, {selectedTeam?.state || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Captain</label>
                <p className="text-sm text-gray-900">{selectedTeam.captainProfile?.name}</p>
                <p className="text-xs text-gray-500">{selectedTeam.captainProfile?.phone}</p>
              </div>
            </div>

            {/* Players */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Players ({selectedTeam.players?.length || 0} total)
              </h4>
              <div className="max-h-64 overflow-y-auto">
                <div className="grid grid-cols-1 gap-2">
                  {selectedTeam.players?.map((player: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium text-sm">{player.name}</div>
                        <div className="text-xs text-gray-500">
                          {player.position === 'main' ? 'Main Player' : 'Substitute'} • Age {player.age}
                        </div>
                      </div>
                      <StatusBadge status={player.verificationStatus} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}