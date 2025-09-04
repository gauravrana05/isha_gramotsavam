'use client';

import { Users, Plus, CheckCircle, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { MobileCard } from '../ui/MobileCard';
import { MobileButton } from '../ui/MobileButton';
import { FloatingActionButton } from '../ui/FloatingActionButton';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';

export function CaptainTeamView() {
  const { user } = useAuth();

  // Fetch captain's team data
  const { data: teamData, isLoading, refetch } = api.teams.management.getMyTeam.useQuery(
    undefined,
    { enabled: !!user && user.role === 'captain' }
  );

  const handleAddPlayer = () => {
    console.log('Navigate to add player form');
  };

  const handleEditPlayer = (playerId: string) => {
    console.log('Edit player:', playerId);
  };

  const handleRemovePlayer = (playerId: string) => {
    console.log('Remove player:', playerId);
  };

  const handleSubmitTeam = () => {
    console.log('Submit team for verification');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
        <div className="animate-pulse bg-gray-200 h-48 rounded-lg"></div>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="space-y-4">
        <MobileCard>
          <div className="text-center py-8">
            <Users size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="mobile-card-title mb-2">No Team Created</h3>
            <p className="text-gray-600 mb-4">Create your team to start adding players</p>
            <MobileButton variant="primary" onClick={() => console.log('Create team')}>
              Create Team
            </MobileButton>
          </div>
        </MobileCard>
      </div>
    );
  }

  const players = teamData.teamPlayers || [];
  const verifiedPlayers = players.filter(p => p.verificationStatus === 'verified').length;
  const pendingPlayers = players.filter(p => p.verificationStatus === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Team Summary */}
      <MobileCard>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="mobile-card-title">{teamData.name}</h2>
            <p className="text-sm text-gray-600">{teamData.sport?.name}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            teamData.status === 'verified' 
              ? 'bg-green-100 text-green-800'
              : teamData.status === 'submitted'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {teamData.status || 'Draft'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#2C5282]">{players.length}</p>
            <p className="text-xs text-gray-600">Total Players</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{verifiedPlayers}</p>
            <p className="text-xs text-gray-600">Verified</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{pendingPlayers}</p>
            <p className="text-xs text-gray-600">Pending</p>
          </div>
        </div>

        {teamData.status !== 'submitted' && (
          <MobileButton
            variant="success"
            fullWidth
            onClick={handleSubmitTeam}
            disabled={players.length < 11 || verifiedPlayers < 11}
          >
            Submit Team for Verification
          </MobileButton>
        )}
      </MobileCard>

      {/* Players List */}
      <MobileCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="mobile-card-title">Team Roster</h3>
          <span className="text-sm text-gray-500">{players.length}/15 players</span>
        </div>

        {players.length > 0 ? (
          <div className="space-y-3">
            {players.map((player: any) => (
              <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center flex-1">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                    {player.user?.profileImages?.profilePhotoPath ? (
                      <img
                        src={player.user.profileImages.profilePhotoPath}
                        alt={player.user.firstName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-600">
                        {player.user?.firstName?.[0]}{player.user?.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {player.user?.firstName} {player.user?.lastName}
                    </p>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-500 mr-2">
                        {player.position === 'captain' ? 'Captain' : 'Player'}
                      </span>
                      <div className="flex items-center">
                        {player.verificationStatus === 'verified' ? (
                          <CheckCircle size={12} className="text-green-500 mr-1" />
                        ) : (
                          <AlertCircle size={12} className="text-orange-500 mr-1" />
                        )}
                        <span className={`text-xs ${
                          player.verificationStatus === 'verified' 
                            ? 'text-green-600' 
                            : 'text-orange-600'
                        }`}>
                          {player.verificationStatus === 'verified' ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditPlayer(player.id)}
                    className="p-2 text-gray-500 hover:text-blue-600"
                  >
                    <Edit size={16} />
                  </button>
                  {player.position !== 'captain' && (
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      className="p-2 text-gray-500 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No players added yet</p>
            <p className="text-sm text-gray-400 mt-1">Add players to build your team</p>
          </div>
        )}
      </MobileCard>

      {/* Team Requirements */}
      <MobileCard>
        <h3 className="mobile-card-title mb-3">Team Requirements</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Minimum 11 players</span>
            <div className="flex items-center">
              {players.length >= 11 ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <AlertCircle size={16} className="text-orange-500" />
              )}
              <span className={`text-sm ml-1 ${
                players.length >= 11 ? 'text-green-600' : 'text-orange-600'
              }`}>
                {players.length}/11
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">All players verified</span>
            <div className="flex items-center">
              {verifiedPlayers === players.length && players.length >= 11 ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <AlertCircle size={16} className="text-orange-500" />
              )}
              <span className={`text-sm ml-1 ${
                verifiedPlayers === players.length && players.length >= 11 
                  ? 'text-green-600' 
                  : 'text-orange-600'
              }`}>
                {verifiedPlayers}/{players.length}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Captain assigned</span>
            <div className="flex items-center">
              {teamData.captainId ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <AlertCircle size={16} className="text-orange-500" />
              )}
              <span className={`text-sm ml-1 ${
                teamData.captainId ? 'text-green-600' : 'text-orange-600'
              }`}>
                {teamData.captainId ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </MobileCard>

      {/* Floating Action Button */}
      <FloatingActionButton
        icon={<Plus size={24} />}
        onClick={handleAddPlayer}
        visible={players.length < 15}
      />
    </div>
  );
}
