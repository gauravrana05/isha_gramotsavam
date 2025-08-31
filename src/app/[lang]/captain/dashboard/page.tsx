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
  Plus,
  Eye,
  Loader2,
  Target,
  UserCheck,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { SingleStatCard } from '@/components/ui';

export default function CaptainDashboard() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // Fetch captain's teams
  const { 
    data: teamsData, 
    isLoading: teamsLoading, 
    error: teamsError 
  } = api.teams.management.getMyTeam.useQuery(
    undefined,
    { enabled: !!user && user.role === 'captain' }
  );

  // Fetch upcoming matches for captain's teams
  const { 
    data: matchesData, 
    isLoading: matchesLoading 
  } = api.fixtures.getUpcomingMatches.useQuery(
    { limit: 5 },
    { enabled: !!teamsData }
  );

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (user.role !== 'captain') {
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

    const team = teamsData;
    const totalPlayers = team.currentPlayers || 0;
    const maxPlayers = team.sport?.maxPlayersPerTeam || 11;
    const isTeamComplete = totalPlayers >= maxPlayers;

    return {
      totalPlayers,
      maxPlayers,
      isTeamComplete,
      teamStatus: team.status,
      verificationStatus: team.verifiedBy ? 'verified' : 'pending',
      upcomingMatches: matchesData?.length || 0
    };
  }, [teamsData, matchesData]);

  if (authLoading || teamsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-2" />
          <p className="text-gray-600">Loading Captain Dashboard...</p>
        </div>
      </div>
    );
  }

  if (teamsError || !teamsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Team Found</h1>
          <p className="text-gray-600 mb-4">You don&apos;t have a team yet. Create one to get started.</p>
          <Link 
            href={`/${lang}/register/team`}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Create Team
          </Link>
        </div>
      </div>
    );
  }

  const team = teamsData;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Captain Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your team and track performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SingleStatCard
            title="Team Players"
            value={`${stats?.totalPlayers}/${stats?.maxPlayers}`}
            icon={Users}
            color={stats?.isTeamComplete ? 'success' : 'warning'}
            trend={stats?.isTeamComplete ? 'Complete' : 'Incomplete'}
          />
          
          <SingleStatCard
            title="Team Status"
            value={team.status}
            icon={stats?.teamStatus === 'active' ? CheckCircle : Clock}
            color={stats?.teamStatus === 'active' ? 'success' : 'warning'}
          />
          
          <SingleStatCard
            title="Verification"
            value={stats?.verificationStatus === 'verified' ? 'Verified' : 'Pending'}
            icon={stats?.verificationStatus === 'verified' ? UserCheck : Clock}
            color={stats?.verificationStatus === 'verified' ? 'success' : 'warning'}
          />
          
          <SingleStatCard
            title="Upcoming Matches"
            value={stats?.upcomingMatches || 0}
            icon={Trophy}
            color="info"
          />
        </div>

        {/* Team Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Team Details Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Team Details</h2>
              <Link
                href={`/${lang}/captain/teams/${team.id}`}
                className="text-[#F28C38] hover:text-[#E67A26] font-medium"
              >
                Manage Team
              </Link>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <Trophy className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{team.name}</p>
                  <p className="text-sm text-gray-500">{team.sport?.name}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-900">{team.district}, {team.state}</p>
                  <p className="text-sm text-gray-500">{team.panchayat}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Users className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-900">{team.currentPlayers} Players</p>
                  <p className="text-sm text-gray-500">
                    {team.sport?.maxPlayersPerTeam - team.currentPlayers} more needed
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            
            <div className="space-y-3">
              <Link
                href={`/${lang}/captain/teams/${team.id}/players/invite`}
                className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-5 h-5 text-[#F28C38] mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Add Players</p>
                  <p className="text-sm text-gray-500">Invite new team members</p>
                </div>
              </Link>
              
              <Link
                href={`/${lang}/captain/fixtures`}
                className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Calendar className="w-5 h-5 text-[#F28C38] mr-3" />
                <div>
                  <p className="font-medium text-gray-900">View Fixtures</p>
                  <p className="text-sm text-gray-500">Check match schedule</p>
                </div>
              </Link>
              
              <Link
                href={`/${lang}/captain/matches`}
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
                href={`/${lang}/captain/fixtures`}
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
