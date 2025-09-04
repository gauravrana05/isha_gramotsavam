'use client';

import { MapPin, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/component-patterns';

interface LiveMatchCardProps {
  match: any;
  isLive?: boolean;
  isMyTeam?: boolean;
}

export function LiveMatchCard({ match, isLive = false, isMyTeam = false }: LiveMatchCardProps) {
  return (
    <div className={cn(
      'p-4 rounded-lg border-2 transition-colors',
      isLive 
        ? 'bg-red-50 border-red-200' 
        : 'bg-white border-gray-200',
      isMyTeam && 'ring-2 ring-blue-300'
    )}>
      {/* Match Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          {isLive && (
            <div className="flex items-center mr-2">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></div>
              <span className="text-xs font-medium text-red-600">LIVE</span>
            </div>
          )}
          {isMyTeam && (
            <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded mr-2">
              MY TEAM
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-500">
          {match.round && `Round ${match.round}`}
        </div>
      </div>

      {/* Teams and Score */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          {/* Team 1 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                <span className="text-xs font-medium text-blue-600">
                  {match.team1?.name?.[0] || 'T1'}
                </span>
              </div>
              <span className="text-sm font-medium truncate">
                {match.team1?.name || 'Team 1'}
              </span>
            </div>
            <span className={cn(
              'text-lg font-bold ml-2',
              isLive ? 'text-red-600' : 'text-gray-900'
            )}>
              {match.team1Score ?? '-'}
            </span>
          </div>

          {/* Team 2 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
                <span className="text-xs font-medium text-green-600">
                  {match.team2?.name?.[0] || 'T2'}
                </span>
              </div>
              <span className="text-sm font-medium truncate">
                {match.team2?.name || 'Team 2'}
              </span>
            </div>
            <span className={cn(
              'text-lg font-bold ml-2',
              isLive ? 'text-red-600' : 'text-gray-900'
            )}>
              {match.team2Score ?? '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Match Details */}
      <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-200">
        <div className="flex items-center">
          <MapPin size={12} className="mr-1" />
          <span>{match.venue?.name || 'Venue TBD'}</span>
        </div>
        
        <div className="flex items-center">
          <Clock size={12} className="mr-1" />
          <span>
            {isLive 
              ? 'Live Now'
              : new Date(match.scheduledTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })
            }
          </span>
        </div>
      </div>

      {/* Live Status */}
      {isLive && (
        <div className="mt-2 text-center">
          <span className="text-xs text-red-600 font-medium">
            Match in progress • Tap for details
          </span>
        </div>
      )}
    </div>
  );
}
