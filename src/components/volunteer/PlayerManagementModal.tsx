'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Trash2, Crown, Users, Loader2 } from 'lucide-react';
import { StatusSelector } from '@/components/ui/StatusSelector';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  verificationStatus: 'pending' | 'verified' | 'approved' | 'rejected';
  role?: 'captain' | 'player';
  panchayat?: string;
  district?: string;
  state?: string;
}

interface Team {
  id: string;
  name: string;
  sportName: string;
  panchayat: string;
  district: string;
  state: string;
  status: string;
  currentPlayers: number;
  maxPlayers: number;
}

interface PlayerManagementModalProps {
  team: Team | null;
  players: Player[];
  onClose: () => void;
  onPlayerStatusChange: (playerId: string, newStatus: string) => Promise<void>;
  onAddPlayer: (teamId: string, playerEmail: string) => Promise<boolean>;
  onRemovePlayer: (teamId: string, playerId: string) => Promise<boolean>;
}

export const PlayerManagementModal: React.FC<PlayerManagementModalProps> = ({
  team,
  players,
  onClose,
  onPlayerStatusChange,
  onAddPlayer,
  onRemovePlayer
}) => {
  const [searchEmail, setSearchEmail] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [removingPlayer, setRemovingPlayer] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  if (!team) return null;

  const handleAddPlayer = async () => {
    if (!searchEmail.trim()) return;
    
    setAddingPlayer(true);
    try {
      const success = await onAddPlayer(team.id, searchEmail.trim());
      if (success) {
        setSearchEmail('');
      }
    } finally {
      setAddingPlayer(false);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    setRemovingPlayer(playerId);
    try {
      await onRemovePlayer(team.id, playerId);
    } finally {
      setRemovingPlayer(null);
    }
  };

  const handleStatusChange = async (playerId: string, newStatus: string) => {
    setUpdatingStatus(playerId);
    try {
      await onPlayerStatusChange(playerId, newStatus);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#F28C38]" />
              Manage Team Players
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {team.name} - {team.sportName} ({team.currentPlayers}/{team.maxPlayers} players)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Add Player Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#F28C38]" />
              Add New Player
            </h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="email"
                  placeholder="Enter player's email address..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                />
              </div>
              <button
                onClick={handleAddPlayer}
                disabled={!searchEmail.trim() || addingPlayer}
                className="px-4 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {addingPlayer ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {addingPlayer ? 'Adding...' : 'Add Player'}
              </button>
            </div>
          </div>

          {/* Current Players */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Current Players ({players.length})
            </h3>
            
            {players.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No players in this team yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">
                              {player.firstName} {player.lastName}
                            </h4>
                            {player.role === 'captain' && (
                              <Crown className="w-4 h-4 text-yellow-500" title="Team Captain" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{player.email}</p>
                          {player.phone && (
                            <p className="text-sm text-gray-500">{player.phone}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <StatusSelector
                            value={player.verificationStatus}
                            options={statusOptions}
                            onChange={(newStatus) => handleStatusChange(player.id, newStatus)}
                            disabled={updatingStatus === player.id}
                            className="min-w-[120px]"
                          />

                          {player.role !== 'captain' && (
                            <button
                              onClick={() => handleRemovePlayer(player.id)}
                              disabled={removingPlayer === player.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Remove player"
                            >
                              {removingPlayer === player.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <strong>Location:</strong> {team.panchayat}, {team.district}, {team.state}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerManagementModal;