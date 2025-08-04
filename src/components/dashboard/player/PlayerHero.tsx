'use client'
import React from 'react';
import Image from 'next/image';
import { 
  Users, 
  Calendar,
  FileText,
  Trophy,
  CheckCircle,
  AlertCircle,
  Upload,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/component-patterns';
import { Button, StatusBadge } from '@/components/ui';

interface PlayerTeam {
  id: string;
  name: string;
  sport: string;
  status: string;
  verificationStatus: string;
  captain: string;
}

interface PlayerHeroProps {
  userProfile?: {
    firstName?: string;
    lastName?: string;
  };
  teams?: PlayerTeam[];
  documentsComplete?: boolean;
  upcomingMatches?: number;
  loading?: boolean;
  onUploadDocuments?: () => void;
  onViewTeams?: () => void;
  onViewMatches?: () => void;
  className?: string;
}

export const PlayerHero: React.FC<PlayerHeroProps> = ({
  userProfile,
  teams = [],
  documentsComplete = false,
  upcomingMatches = 0,
  loading = false,
  onUploadDocuments,
  onViewTeams,
  onViewMatches,
  className
}) => {
  const displayName = userProfile?.firstName 
    ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
    : 'Player';

  const verifiedTeams = teams.filter(t => t.verificationStatus === 'approved').length;
  const pendingTeams = teams.filter(t => t.verificationStatus === 'pending').length;

  // Loading state
  if (loading) {
    return (
      <div className={cn(
        'bg-gradient-to-br from-blue-500 to-blue-700',
        'rounded-xl p-6 md:p-8',
        'animate-pulse',
        className
      )}>
        <div className="space-y-4">
          <div className="h-8 bg-blue-400 rounded w-1/3"></div>
          <div className="h-6 bg-blue-400 rounded w-2/3"></div>
          <div className="h-4 bg-blue-400 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-gradient-to-br from-blue-500 to-blue-700',
      'rounded-xl p-6 md:p-8 text-white',
      'shadow-lg shadow-blue-500/25',
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
              Welcome back, {displayName}!
            </h1>
          </div>
          
          <p className="text-blue-100 text-sm md:text-base">
            Your Gramotsavam 2025 Journey
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onViewTeams}
            variant="secondary"
            size="sm"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            My Teams
          </Button>
          <Button
            onClick={onViewMatches}
            variant="secondary"
            size="sm"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            Matches
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        {/* Total Teams */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-blue-200" />
            <h3 className="font-semibold text-sm">Teams</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {teams.length}
            </span>
          </div>
          <p className="text-blue-200 text-xs mt-1">
            Team memberships
          </p>
        </div>

        {/* Verified Teams */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="w-5 h-5 text-blue-200" />
            <h3 className="font-semibold text-sm">Verified</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-green-300">
              {verifiedTeams}
            </span>
          </div>
          <p className="text-blue-200 text-xs mt-1">
            Ready to play
          </p>
        </div>

        {/* Pending Verification */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-blue-200" />
            <h3 className="font-semibold text-sm">Pending</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-yellow-300">
              {pendingTeams}
            </span>
          </div>
          <p className="text-blue-200 text-xs mt-1">
            Awaiting verification
          </p>
        </div>

        {/* Upcoming Matches */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="w-5 h-5 text-blue-200" />
            <h3 className="font-semibold text-sm">Matches</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {upcomingMatches}
            </span>
          </div>
          <p className="text-blue-200 text-xs mt-1">
            Upcoming games
          </p>
        </div>
      </div>

      {/* Document Status Alert */}
      {!documentsComplete && (
        <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-yellow-100 font-medium text-sm mb-1">
                Complete your profile to participate
              </p>
              <p className="text-yellow-200 text-xs mb-3">
                Upload your profile photo and Aadhaar documents to get verified for team participation.
              </p>
              <Button
                onClick={onUploadDocuments}
                size="sm"
                variant="secondary"
                className="bg-yellow-500 text-yellow-900 hover:bg-yellow-400"
                leftIcon={Upload}
              >
                Upload Documents
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats for No Teams */}
      {teams.length === 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
          <Users className="w-8 h-8 text-blue-200 mx-auto mb-3" />
          <h3 className="font-semibold text-sm mb-2">Ready to Join Teams</h3>
          <p className="text-blue-200 text-xs">
            Contact team captains to get invited to participate in Gramotsavam 2025 tournaments.
          </p>
        </div>
      )}

      {/* Recent Team Activity */}
      {teams.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Recent Team Activity
          </h3>
          <div className="space-y-2">
            {teams.slice(0, 3).map((team, index) => (
              <div key={team.id} className="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0">
                <div className="flex-1">
                  <p className="text-sm font-medium">{team.name}</p>
                  <p className="text-xs text-blue-200">
                    {team.sport} • Captain: {team.captain}
                  </p>
                </div>
                <StatusBadge 
                  status={team.verificationStatus as any}
                  variant="soft"
                  size="sm"
                  className="bg-white/20 text-white border-white/30"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerHero;