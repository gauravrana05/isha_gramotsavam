"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { 
  Users, 
  Trophy, 
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Loader2,
  Target,
  UserCheck,
  Activity,
  Award
} from 'lucide-react';
import Link from 'next/link';
import { SingleStatCard } from '@/components/ui';

export default function PlayerDashboard() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // Fetch player's teams
  const { 
    data: teamsData, 
    isLoading: teamsLoading, 
    error: teamsError 
  } = api.teams.players.getPlayerTeams.useQuery(
    { playerId: user?.id || '' },
    { enabled: !!user && user.role === 'player' }
  );

  // Fetch upcoming matches for player's teams
  const { 
    data: matchesData, 
    isLoading: matchesLoading 
  } = api.fixtures.getPlayerUpcomingMatches.useQuery(
    { playerId: user?.id || '', limit: 5 },
    { enabled: !!user && !!teamsData }
  );

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (user.role !== 'player') {
      router.push(`/${lang}/dashboard`);
      return;
    }

    if (!userProfile?.profileComplete) {
      router.push(`/${lang}/profile/complete`);
      return;
    }
  }, [user, userProfile, authLoading, router, lang]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!teamsData) return null;

    const totalTeams = teamsData.teams?.length || 0;
    const verifiedTeams = teamsData.teams?.filter(team => team.verificationStatus === 'approved').length || 0;
    const pendingTeams = teamsData.teams?.filter(team => team.verificationStatus === 'pending').length || 0;
    const upcomingMatches = matchesData?.length || 0;

    return {
      totalTeams,
      verifiedTeams,
      pendingTeams,
      upcomingMatches
    };
  }, [teamsData, matchesData]);

  if (authLoading || teamsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-2" />
          <p className="text-gray-600">Loading Player Dashboard...</p>
        </div>
      </div>
    );
  }

  if (teamsError || !teamsData || !teamsData.teams?.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Teams Found</h1>
          <p className="text-gray-600 mb-4">You're not part of any team yet. Wait for a captain to invite you.</p>
          <Link 
            href={`/${lang}/player/teams`}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            View Teams
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Player Dashboard</h1>
          <p className="text-gray-600 mt-2">Track your teams and upcoming matches</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SingleStatCard
            title="My Teams"
            value={stats?.totalTeams || 0}
            icon={Users}
            color="primary"
          />
          
          <SingleStatCard
            title="Verified Teams"
            value={stats?.verifiedTeams || 0}
            icon={CheckCircle}
            color="success"
          />
          
          <SingleStatCard
            title="Pending Verification"
            value={stats?.pendingTeams || 0}
            icon={Clock}
            color="warning"
          />
          
          <SingleStatCard
            title="Upcoming Matches"
            value={stats?.upcomingMatches || 0}
            icon={Trophy}
            color="info"
          />
        </div>

        {/* Teams Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* My Teams Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">My Teams</h2>
              <Link
                href={`/${lang}/player/teams`}
                className="text-[#F28C38] hover:text-[#E67A26] font-medium"
              >
                View All
              </Link>
            </div>
            
            <div className="space-y-4">
              {teamsData.teams.slice(0, 3).map((team: any) => (
                <div key={team.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <Trophy className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">{team.team.name}</p>
                      <p className="text-sm text-gray-500">{team.team.sport?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      team.verificationStatus === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : team.verificationStatus === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {team.verificationStatus === 'approved' ? 'Verified' : 
                       team.verificationStatus === 'pending' ? 'Pending' : 'Rejected'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            
            <div className="space-y-3">
              <Link
                href={`/${lang}/player/teams`}
                className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Users className="w-5 h-5 text-[#F28C38] mr-3" />
                <div>
                  <p className="font-medium text-gray-900">View My Teams</p>
                  <p className="text-sm text-gray-500">See all teams you're part of</p>
                </div>
              </Link>
              
              <Link
                href={`/${lang}/player/fixtures`}
                className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Calendar className="w-5 h-5 text-[#F28C38] mr-3" />
                <div>
                  <p className="font-medium text-gray-900">View Fixtures</p>
                  <p className="text-sm text-gray-500">Check upcoming matches</p>
                </div>
              </Link>
              
              <Link
                href={`/${lang}/player/matches`}
                className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Trophy className="w-5 h-5 text-[#F28C38] mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Match Results</p>
                  <p className="text-sm text-gray-500">View past results</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Upcoming Matches */}
        {matchesData && matchesData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Upcoming Matches</h2>
              <Link
                href={`/${lang}/player/fixtures`}
                className="text-[#F28C38] hover:text-[#E67A26] font-medium"
              >
                View All
              </Link>
            </div>
            
            <div className="space-y-3">
              {matchesData.slice(0, 3).map((match: any) => (
                <div key={match.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {match.team1?.name} vs {match.team2?.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(match.scheduledAt).toLocaleDateString()} at{' '}
                        {new Date(match.scheduledAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{match.venue?.name}</p>
                    <p className="text-sm text-gray-500">{match.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
