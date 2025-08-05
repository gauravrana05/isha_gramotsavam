'use client'
import React from 'react';
import Image from 'next/image';
import { 
  Users, 
  Calendar,
  MapPin,
  Clock,
  Trophy,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/component-patterns';
import { Button, StatusBadge } from '@/components/ui';

interface Team {
  id: string;
  teamName: string;
  sportId: string;
  status: string;
  players: any[];
  maxPlayers: number;
  venue?: {
    name: string;
    address: string;
  };
  nextMatch?: {
    date: Date;
    opponent: string;
    venue: string;
  };
}

interface CaptainHeroProps {
  userProfile?: {
    firstName?: string;
    lastName?: string;
  };
  team?: Team;
  loading?: boolean;
  onCreateTeam?: () => void;
  onManageTeam?: () => void;
  onViewFixtures?: () => void;
  className?: string;
}

export const CaptainHero: React.FC<CaptainHeroProps> = ({
  userProfile,
  team,
  loading = false,
  onCreateTeam,
  onManageTeam,
  onViewFixtures,
  className
}) => {
  const displayName = userProfile?.firstName 
    ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
    : 'Captain';

  // Calculate time until next match
  const getTimeUntilMatch = (matchDate: Date) => {
    const now = new Date();
    const diff = matchDate.getTime() - now.getTime();
    
    if (diff < 0) return 'Match started';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
    return 'Less than 1 hour left';
  };

  // No team case
  if (!team && !loading) {
    return (
      <div className={cn(
        'bg-gradient-to-br from-primary-500 to-primary-700',
        'rounded-xl p-6 md:p-8 text-white',
        'shadow-lg shadow-primary-500/25',
        className
      )}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="mb-4">
              <Image 
                src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" 
                alt="Isha Logo" 
                width={48} 
                height={48} 
                className="mx-auto md:mx-0"
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 font-fira">
              Welcome, {displayName}!
            </h1>
            <p className="text-primary-100 text-base md:text-lg mb-4">
              Ready to lead your team in Gramotsavam 2025?
            </p>
            <p className="text-primary-200 text-sm">
              Create your team and start building your championship roster.
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button
              onClick={onCreateTeam}
              variant="secondary"
              size="lg"
              className="bg-white text-primary-700 hover:bg-gray-50"
            >
              Create Your Team
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={cn(
        'bg-gradient-to-br from-primary-500 to-primary-700',
        'rounded-xl p-6 md:p-8',
        'animate-pulse',
        className
      )}>
        <div className="space-y-4">
          <div className="h-8 bg-primary-400 rounded w-1/3"></div>
          <div className="h-6 bg-primary-400 rounded w-2/3"></div>
          <div className="h-4 bg-primary-400 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Team exists case
  return (
    <div className={cn(
      'bg-gradient-to-br from-primary-500 to-primary-700',
      'rounded-xl p-6 md:p-8 text-white',
      'shadow-lg shadow-primary-500/25',
      className
    )}>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Image 
              src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" 
              alt="Isha Logo" 
              width={32} 
              height={32} 
            />
            <h1 className="text-xl md:text-2xl font-bold font-fira">
              {team?.teamName}
            </h1>
            <StatusBadge 
              status={team?.status as any}
              variant="soft"
              className="bg-white/20 text-white border-white/30"
            />
          </div>
          
          <p className="text-primary-100 text-sm md:text-base">
            Welcome back, {displayName} • {team?.sportId}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onManageTeam}
            variant="secondary"
            size="sm"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            Manage Team
          </Button>
          <Button
            onClick={onViewFixtures}
            variant="secondary"
            size="sm"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            View Fixtures
          </Button>
        </div>
      </div>

      {/* Team Stats & Next Match */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Team Stats */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-primary-200" />
            <h3 className="font-semibold text-sm">Team Roster</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {team?.players?.length || 0}
            </span>
            <span className="text-primary-200 text-sm">
              / {team?.maxPlayers}
            </span>
          </div>
          <p className="text-primary-200 text-xs mt-1">
            Players registered
          </p>
        </div>

        {/* Next Match */}
        {team?.nextMatch ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-5 h-5 text-primary-200" />
              <h3 className="font-semibold text-sm">Next Match</h3>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm">
                vs {team?.nextMatch.opponent}
              </p>
              <p className="text-primary-200 text-xs">
                {team?.nextMatch.date.toLocaleDateString()}
              </p>
              <div className="flex items-center gap-1 text-xs text-primary-300">
                <Clock className="w-3 h-3" />
                {getTimeUntilMatch(team?.nextMatch.date)}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-primary-200" />
              <h3 className="font-semibold text-sm">Schedule</h3>
            </div>
            <p className="text-primary-200 text-xs">
              Fixtures will be announced soon
            </p>
          </div>
        )}

        {/* Venue Info */}
        {team?.venue ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <MapPin className="w-5 h-5 text-primary-200" />
              <h3 className="font-semibold text-sm">Venue</h3>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm">
                {team?.venue.name}
              </p>
              <p className="text-primary-200 text-xs">
                {team?.venue.address}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <MapPin className="w-5 h-5 text-primary-200" />
              <h3 className="font-semibold text-sm">Venue</h3>
            </div>
            <p className="text-primary-200 text-xs">
              To be assigned
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions Alert */}
      {team?.status === 'draft' && (
        <div className="mt-6 bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-100 font-medium text-sm mb-1">
                Complete your team? registration
              </p>
              <p className="text-yellow-200 text-xs">
                Add players to your roster and submit for verification to participate in tournaments.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaptainHero;