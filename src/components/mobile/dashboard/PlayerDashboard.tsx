'use client';

import { Users, Trophy, Clock, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { MobileCard } from '../ui/MobileCard';
import { MobileButton } from '../ui/MobileButton';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';

export function PlayerDashboard() {
  const { user } = useAuth();

  // Fetch player's teams
  const { data: teamsData, isLoading: teamsLoading } = api.teams.players.getPlayerTeams.useQuery(
    { playerId: user?.id || '' },
    { enabled: !!user && user.role === 'player' }
  );

  // Fetch upcoming matches
  const { data: matchesData, isLoading: matchesLoading } = api.fixtures.getPlayerUpcomingMatches.useQuery(
    { playerId: user?.id || '', limit: 3 },
    { enabled: !!user && !!teamsData }
  );

  const handleUploadDocuments = () => {
    console.log('Navigate to document upload');
  };

  const handleViewTeam = () => {
    console.log('Navigate to team details');
  };

  if (teamsLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
        <div className="animate-pulse bg-gray-200 h-24 rounded-lg"></div>
      </div>
    );
  }

  const myTeam = teamsData?.[0]; // Player typically belongs to one team

  return (
    <div className="space-y-4">
      {/* My Team Status */}
      <MobileCard>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="mobile-card-title">My Team</h2>
            <p className="text-sm text-gray-600">
              {myTeam?.name || 'Not assigned to any team'}
            </p>
          </div>
          {myTeam && (
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              myTeam.status === 'verified' 
                ? 'bg-green-100 text-green-800'
                : myTeam.status === 'submitted'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {myTeam.status || 'Draft'}
            </div>
          )}
        </div>

        {myTeam ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mb-2 mx-auto">
                <Users size={20} className="text-blue-600" />
              </div>
              <p className="text-sm font-medium">{myTeam.teamPlayers?.length || 0}</p>
              <p className="text-xs text-gray-600">Teammates</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-full mb-2 mx-auto">
                <Trophy size={20} className="text-orange-600" />
              </div>
              <p className="text-sm font-medium">{myTeam.sport?.name || 'N/A'}</p>
              <p className="text-xs text-gray-600">Sport</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mb-2 mx-auto">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <p className="text-sm font-medium">
                {user?.verificationStatus === 'verified' ? 'Yes' : 'No'}
              </p>
              <p className="text-xs text-gray-600">Verified</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500 mb-4">You haven't been added to any team yet</p>
            <p className="text-sm text-gray-400">Contact your team captain to get added</p>
          </div>
        )}

        {myTeam && (
          <div className="mt-4">
            <MobileButton
              variant="secondary"
              size="sm"
              onClick={handleViewTeam}
              fullWidth
            >
              View Team Details
            </MobileButton>
          </div>
        )}
      </MobileCard>

      {/* My Verification Status */}
      <MobileCard>
        <h3 className="mobile-card-title mb-3">My Verification</h3>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            {user?.verificationStatus === 'verified' ? (
              <CheckCircle size={20} className="text-green-500 mr-2" />
            ) : (
              <AlertCircle size={20} className="text-orange-500 mr-2" />
            )}
            <div>
              <p className="text-sm font-medium">
                {user?.verificationStatus === 'verified' ? 'Verified' : 'Pending Verification'}
              </p>
              <p className="text-xs text-gray-600">
                {user?.verificationStatus === 'verified' 
                  ? 'All documents approved'
                  : 'Upload required documents'
                }
              </p>
            </div>
          </div>
        </div>

        {user?.verificationStatus !== 'verified' && (
          <MobileButton
            variant="primary"
            size="sm"
            onClick={handleUploadDocuments}
            fullWidth
          >
            <Upload size={16} className="mr-2" />
            Upload Documents
          </MobileButton>
        )}
      </MobileCard>

      {/* Upcoming Matches */}
      <MobileCard>
        <h3 className="mobile-card-title mb-3">My Upcoming Matches</h3>
        {matchesLoading ? (
          <div className="space-y-2">
            <div className="animate-pulse bg-gray-200 h-16 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-16 rounded"></div>
          </div>
        ) : matchesData && matchesData.length > 0 ? (
          <div className="space-y-3">
            {matchesData.slice(0, 3).map((match: any) => (
              <div key={match.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Clock size={16} className="text-gray-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium">
                      {match.team1?.name} vs {match.team2?.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(match.scheduledTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {match.venue?.name}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No upcoming matches</p>
        )}
      </MobileCard>

      {/* Action Items */}
      <MobileCard>
        <h3 className="mobile-card-title mb-3">Action Items</h3>
        <div className="space-y-2">
          {user?.verificationStatus !== 'verified' && (
            <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
              <div className="flex items-center">
                <AlertCircle size={16} className="text-orange-500 mr-2" />
                <span className="text-sm">Complete verification</span>
              </div>
              <span className="text-xs text-orange-600">Required</span>
            </div>
          )}
          
          {!myTeam && (
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
              <div className="flex items-center">
                <Users size={16} className="text-blue-500 mr-2" />
                <span className="text-sm">Join a team</span>
              </div>
              <span className="text-xs text-blue-600">Pending</span>
            </div>
          )}
          
          {user?.verificationStatus === 'verified' && myTeam && (
            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
              <div className="flex items-center">
                <CheckCircle size={16} className="text-green-500 mr-2" />
                <span className="text-sm">Ready to play!</span>
              </div>
              <span className="text-xs text-green-600">Complete</span>
            </div>
          )}
        </div>
      </MobileCard>
    </div>
  );
}
