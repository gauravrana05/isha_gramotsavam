'use client';

import { Users, Trophy, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { MobileCard } from '../ui/MobileCard';
import { MobileButton } from '../ui/MobileButton';
import { FloatingActionButton } from '../ui/FloatingActionButton';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';

export function CaptainDashboard() {
  const { user } = useAuth();

  // Fetch captain's team data
  const { data: teamData, isLoading: teamLoading } = api.teams.management.getMyTeam.useQuery(
    undefined,
    { enabled: !!user && user.role === 'captain' }
  );

  // Fetch upcoming matches
  const { data: matchesData, isLoading: matchesLoading } = api.teams.fixtures.getUpcomingMatches.useQuery(
    { limit: 3 },
    { enabled: !!teamData }
  );

  const handleAddPlayer = () => {
    console.log('Navigate to add player');
  };

  const handleSubmitTeam = () => {
    console.log('Submit team for verification');
  };

  if (teamLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
        <div className="animate-pulse bg-gray-200 h-24 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Team Overview Card */}
      <MobileCard>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="mobile-card-title">My Team</h2>
            <p className="text-sm text-gray-600">
              {teamData?.name || 'No team created yet'}
            </p>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            teamData?.status === 'verified' 
              ? 'bg-green-100 text-green-800'
              : teamData?.status === 'submitted'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {teamData?.status || 'Draft'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mb-2 mx-auto">
              <Users size={20} className="text-blue-600" />
            </div>
            <p className="text-sm font-medium">{teamData?.teamPlayers?.length || 0}</p>
            <p className="text-xs text-gray-600">Players</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mb-2 mx-auto">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <p className="text-sm font-medium">
              {teamData?.teamPlayers?.filter(p => p.verificationStatus === 'verified').length || 0}
            </p>
            <p className="text-xs text-gray-600">Verified</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-full mb-2 mx-auto">
              <Trophy size={20} className="text-orange-600" />
            </div>
            <p className="text-sm font-medium">{teamData?.sport?.name || 'N/A'}</p>
            <p className="text-xs text-gray-600">Sport</p>
          </div>
        </div>
      </MobileCard>

      {/* Quick Actions */}
      <MobileCard>
        <h3 className="mobile-card-title mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <MobileButton
            variant="primary"
            size="sm"
            onClick={handleAddPlayer}
            fullWidth
          >
            <Plus size={16} className="mr-2" />
            Add Player
          </MobileButton>
          
          <MobileButton
            variant="success"
            size="sm"
            onClick={handleSubmitTeam}
            fullWidth
            disabled={!teamData || (teamData.teamPlayers?.length || 0) < 11}
          >
            Submit Team
          </MobileButton>
        </div>
      </MobileCard>

      {/* Upcoming Matches */}
      <MobileCard>
        <h3 className="mobile-card-title mb-3">Upcoming Matches</h3>
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

      {/* Recent Activity */}
      <MobileCard>
        <h3 className="mobile-card-title mb-3">Recent Activity</h3>
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            <span className="text-gray-600">Team created successfully</span>
          </div>
          <div className="flex items-center text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
            <span className="text-gray-600">Captain assigned</span>
          </div>
          {teamData?.teamPlayers && teamData.teamPlayers.length > 0 && (
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
              <span className="text-gray-600">
                {teamData.teamPlayers.length} players added
              </span>
            </div>
          )}
        </div>
      </MobileCard>

      {/* Floating Action Button */}
      <FloatingActionButton
        icon={<Plus size={24} />}
        onClick={handleAddPlayer}
      />
    </div>
  );
}
