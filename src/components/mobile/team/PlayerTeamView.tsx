'use client';

import { Users, Crown, CheckCircle, AlertCircle, Upload, Phone } from 'lucide-react';
import { MobileCard } from '../ui/MobileCard';
import { MobileButton } from '../ui/MobileButton';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';

export function PlayerTeamView() {
  const { user } = useAuth();

  // Fetch player's teams
  const { data: teamsData, isLoading } = api.teams.players.getPlayerTeams.useQuery(
    { playerId: user?.id || '' },
    { enabled: !!user && user.role === 'player' }
  );

  const handleUploadDocuments = () => {
    console.log('Navigate to document upload');
  };

  const handleContactCaptain = () => {
    console.log('Contact team captain');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
        <div className="animate-pulse bg-gray-200 h-48 rounded-lg"></div>
      </div>
    );
  }

  const myTeam = teamsData?.[0]; // Player typically belongs to one team

  if (!myTeam) {
    return (
      <div className="space-y-4">
        <MobileCard>
          <div className="text-center py-8">
            <Users size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="mobile-card-title mb-2">No Team Assignment</h3>
            <p className="text-gray-600 mb-4">You haven't been added to any team yet</p>
            <p className="text-sm text-gray-500">Contact your team captain to get added</p>
          </div>
        </MobileCard>
      </div>
    );
  }

  const players = myTeam.teamPlayers || [];
  const captain = players.find(p => p.position === 'captain');
  const teammates = players.filter(p => p.id !== user?.id);

  return (
    <div className="space-y-4">
      {/* Team Info */}
      <MobileCard>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="mobile-card-title">{myTeam.name}</h2>
            <p className="text-sm text-gray-600">{myTeam.sport?.name}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            myTeam.status === 'verified' 
              ? 'bg-green-100 text-green-800'
              : myTeam.status === 'submitted'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {myTeam.status || 'Draft'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#2C5282]">{players.length}</p>
            <p className="text-xs text-gray-600">Total Players</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {players.filter(p => p.verificationStatus === 'verified').length}
            </p>
            <p className="text-xs text-gray-600">Verified</p>
          </div>
        </div>
      </MobileCard>

      {/* My Status */}
      <MobileCard>
        <h3 className="mobile-card-title mb-3">My Status</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Users size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Team Member</p>
                <p className="text-xs text-gray-600">Active player</p>
              </div>
            </div>
            <CheckCircle size={20} className="text-green-500" />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                {user?.verificationStatus === 'verified' ? (
                  <CheckCircle size={20} className="text-green-600" />
                ) : (
                  <AlertCircle size={20} className="text-orange-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Verification</p>
                <p className="text-xs text-gray-600">
                  {user?.verificationStatus === 'verified' ? 'Documents approved' : 'Pending verification'}
                </p>
              </div>
            </div>
            {user?.verificationStatus !== 'verified' && (
              <MobileButton
                variant="primary"
                size="sm"
                onClick={handleUploadDocuments}
              >
                <Upload size={14} className="mr-1" />
                Upload
              </MobileButton>
            )}
          </div>
        </div>
      </MobileCard>

      {/* Team Captain */}
      {captain && (
        <MobileCard>
          <h3 className="mobile-card-title mb-3">Team Captain</h3>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mr-3">
                {captain.user?.profileImages?.profilePhotoPath ? (
                  <img
                    src={captain.user.profileImages.profilePhotoPath}
                    alt={captain.user.firstName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <Crown size={20} className="text-blue-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {captain.user?.firstName} {captain.user?.lastName}
                </p>
                <p className="text-xs text-gray-600">Team Captain</p>
                {captain.user?.phone && (
                  <p className="text-xs text-blue-600">{captain.user.phone}</p>
                )}
              </div>
            </div>
            {captain.user?.phone && (
              <MobileButton
                variant="secondary"
                size="sm"
                onClick={handleContactCaptain}
              >
                <Phone size={14} className="mr-1" />
                Contact
              </MobileButton>
            )}
          </div>
        </MobileCard>
      )}

      {/* Teammates */}
      <MobileCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="mobile-card-title">Teammates</h3>
          <span className="text-sm text-gray-500">{teammates.length} players</span>
        </div>

        {teammates.length > 0 ? (
          <div className="space-y-2">
            {teammates.map((player: any) => (
              <div key={player.id} className="flex items-center p-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                  {player.user?.profileImages?.profilePhotoPath ? (
                    <img
                      src={player.user.profileImages.profilePhotoPath}
                      alt={player.user.firstName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-medium text-gray-600">
                      {player.user?.firstName?.[0]}{player.user?.lastName?.[0]}
                    </span>
                  )}
                </div>
                
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {player.user?.firstName} {player.user?.lastName}
                  </p>
                  <div className="flex items-center mt-1">
                    {player.verificationStatus === 'verified' ? (
                      <CheckCircle size={10} className="text-green-500 mr-1" />
                    ) : (
                      <AlertCircle size={10} className="text-orange-500 mr-1" />
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
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">No other teammates yet</p>
          </div>
        )}
      </MobileCard>

      {/* Team Progress */}
      <MobileCard>
        <h3 className="mobile-card-title mb-3">Team Progress</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Players added</span>
            <span className="text-sm font-medium">{players.length}/15</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${Math.min((players.length / 15) * 100, 100)}%` }}
            ></div>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm">Verified players</span>
            <span className="text-sm font-medium">
              {players.filter(p => p.verificationStatus === 'verified').length}/{players.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full" 
              style={{ 
                width: `${players.length > 0 ? (players.filter(p => p.verificationStatus === 'verified').length / players.length) * 100 : 0}%` 
              }}
            ></div>
          </div>
        </div>
      </MobileCard>
    </div>
  );
}
