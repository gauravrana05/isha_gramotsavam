'use client';

import { Trophy, Clock, MapPin, Users } from 'lucide-react';
import { MobileCard } from '../ui/MobileCard';
import { LiveMatchCard } from './LiveMatchCard';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';

export function MobileLiveView() {
  const { user } = useAuth();

  // Fetch live matches
  const { data: liveMatches, isLoading: liveLoading } = api.fixtures.getLiveMatches.useQuery();

  // Fetch upcoming matches
  const { data: upcomingMatches, isLoading: upcomingLoading } = api.fixtures.getUpcomingMatches.useQuery({
    limit: 10
  });

  // Fetch recent matches
  const { data: recentMatches, isLoading: recentLoading } = api.fixtures.getRecentMatches.useQuery({
    limit: 5
  });

  return (
    <div className="space-y-4">
      {/* Live Matches */}
      <MobileCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="mobile-card-title flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
            Live Now
          </h3>
          <span className="text-sm text-red-600 font-medium">
            {liveMatches?.length || 0} matches
          </span>
        </div>

        {liveLoading ? (
          <div className="space-y-3">
            <div className="animate-pulse bg-gray-200 h-20 rounded-lg"></div>
            <div className="animate-pulse bg-gray-200 h-20 rounded-lg"></div>
          </div>
        ) : liveMatches && liveMatches.length > 0 ? (
          <div className="space-y-3">
            {liveMatches.map((match: any) => (
              <LiveMatchCard
                key={match.id}
                match={match}
                isLive={true}
                isMyTeam={user?.role === 'captain' && (
                  match.team1?.captainId === user.id || match.team2?.captainId === user.id
                )}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Trophy size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No live matches</p>
          </div>
        )}
      </MobileCard>

      {/* Upcoming Matches */}
      <MobileCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="mobile-card-title flex items-center">
            <Clock size={18} className="text-blue-600 mr-2" />
            Upcoming
          </h3>
          <span className="text-sm text-gray-500">
            {upcomingMatches?.length || 0} matches
          </span>
        </div>

        {upcomingLoading ? (
          <div className="space-y-3">
            <div className="animate-pulse bg-gray-200 h-16 rounded-lg"></div>
            <div className="animate-pulse bg-gray-200 h-16 rounded-lg"></div>
            <div className="animate-pulse bg-gray-200 h-16 rounded-lg"></div>
          </div>
        ) : upcomingMatches && upcomingMatches.length > 0 ? (
          <div className="space-y-3">
            {upcomingMatches.slice(0, 5).map((match: any) => (
              <div key={match.id} className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="text-sm font-medium">
                      {match.team1?.name || 'TBD'} vs {match.team2?.name || 'TBD'}
                    </div>
                  </div>
                  <div className="text-xs text-blue-600 font-medium">
                    {new Date(match.scheduledTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center">
                    <MapPin size={12} className="mr-1" />
                    {match.venue?.name || 'Venue TBD'}
                  </div>
                  <div>
                    {new Date(match.scheduledTime).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Clock size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No upcoming matches</p>
          </div>
        )}
      </MobileCard>

      {/* Recent Results */}
      <MobileCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="mobile-card-title flex items-center">
            <Trophy size={18} className="text-green-600 mr-2" />
            Recent Results
          </h3>
          <span className="text-sm text-gray-500">
            {recentMatches?.length || 0} matches
          </span>
        </div>

        {recentLoading ? (
          <div className="space-y-3">
            <div className="animate-pulse bg-gray-200 h-16 rounded-lg"></div>
            <div className="animate-pulse bg-gray-200 h-16 rounded-lg"></div>
          </div>
        ) : recentMatches && recentMatches.length > 0 ? (
          <div className="space-y-3">
            {recentMatches.map((match: any) => (
              <div key={match.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">
                    {match.team1?.name} vs {match.team2?.name}
                  </div>
                  <div className="text-sm font-bold text-green-600">
                    {match.team1Score} - {match.team2Score}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center">
                    <MapPin size={12} className="mr-1" />
                    {match.venue?.name}
                  </div>
                  <div>
                    {new Date(match.completedAt || match.scheduledTime).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Trophy size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No recent matches</p>
          </div>
        )}
      </MobileCard>

      {/* Tournament Stats */}
      <MobileCard>
        <h3 className="mobile-card-title mb-3">Tournament Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Users size={24} className="text-blue-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-blue-600">
              {(liveMatches?.length || 0) + (upcomingMatches?.length || 0)}
            </p>
            <p className="text-xs text-gray-600">Active Matches</p>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Trophy size={24} className="text-green-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-600">
              {recentMatches?.length || 0}
            </p>
            <p className="text-xs text-gray-600">Completed</p>
          </div>
        </div>
      </MobileCard>
    </div>
  );
}
