"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { AdvancedTable, type Column } from '@/components/ui';
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
  } = api.teams.fixtures.getUpcomingMatches.useQuery(
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
        {/* Modern Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
          {/* Team Players */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-3 sm:p-6 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-lg border-0">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3">
                <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-blue-900 mb-1">{`${stats?.totalPlayers}/${stats?.maxPlayers}`}</div>
              <div className="text-sm font-medium text-blue-700">Team Players</div>
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200 rounded-full -mr-10 -mt-10 opacity-20"></div>
          </div>

          {/* Team Status */}
          <div className={`relative overflow-hidden bg-gradient-to-br ${stats?.teamStatus === 'active' ? 'from-emerald-50 to-emerald-100' : 'from-amber-50 to-amber-100'} rounded-2xl p-3 sm:p-6 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-lg border-0`}>
            <div className="flex flex-col items-center text-center">
              <div className="mb-3">
                <div className={`w-14 h-14 ${stats?.teamStatus === 'active' ? 'bg-emerald-500' : 'bg-amber-500'} rounded-2xl flex items-center justify-center shadow-lg`}>
                  {stats?.teamStatus === 'active' ? 
                    <CheckCircle className="w-7 h-7 text-white" /> : 
                    <Clock className="w-7 h-7 text-white" />
                  }
                </div>
              </div>
              <div className={`text-3xl font-bold ${stats?.teamStatus === 'active' ? 'text-emerald-900' : 'text-amber-900'} mb-1`}>{team.status}</div>
              <div className={`text-sm font-medium ${stats?.teamStatus === 'active' ? 'text-emerald-700' : 'text-amber-700'}`}>Team Status</div>
            </div>
            <div className={`absolute top-0 right-0 w-20 h-20 ${stats?.teamStatus === 'active' ? 'bg-emerald-200' : 'bg-amber-200'} rounded-full -mr-10 -mt-10 opacity-20`}></div>
          </div>

          {/* Verification */}
          <div className={`relative overflow-hidden bg-gradient-to-br ${stats?.verificationStatus === 'verified' ? 'from-emerald-50 to-emerald-100' : 'from-amber-50 to-amber-100'} rounded-2xl p-3 sm:p-6 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-lg border-0`}>
            <div className="flex flex-col items-center text-center">
              <div className="mb-3">
                <div className={`w-14 h-14 ${stats?.verificationStatus === 'verified' ? 'bg-emerald-500' : 'bg-amber-500'} rounded-2xl flex items-center justify-center shadow-lg`}>
                  {stats?.verificationStatus === 'verified' ? 
                    <UserCheck className="w-7 h-7 text-white" /> : 
                    <Clock className="w-7 h-7 text-white" />
                  }
                </div>
              </div>
              <div className={`text-3xl font-bold ${stats?.verificationStatus === 'verified' ? 'text-emerald-900' : 'text-amber-900'} mb-1`}>
                {stats?.verificationStatus === 'verified' ? 'Verified' : 'Pending'}
              </div>
              <div className={`text-sm font-medium ${stats?.verificationStatus === 'verified' ? 'text-emerald-700' : 'text-amber-700'}`}>Verification</div>
            </div>
            <div className={`absolute top-0 right-0 w-20 h-20 ${stats?.verificationStatus === 'verified' ? 'bg-emerald-200' : 'bg-amber-200'} rounded-full -mr-10 -mt-10 opacity-20`}></div>
          </div>

          {/* Upcoming Matches */}
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-50 to-violet-100 rounded-2xl p-3 sm:p-6 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-lg border-0">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3">
                <div className="w-14 h-14 bg-violet-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-violet-900 mb-1">{stats?.upcomingMatches || 0}</div>
              <div className="text-sm font-medium text-violet-700">Upcoming Matches</div>
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-violet-200 rounded-full -mr-10 -mt-10 opacity-20"></div>
          </div>
        </div>

        {/* Team Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Team Details Table */}
          <AdvancedTable
            data={[
              { value: `${team.name} - ${team.sport?.name || 'N/A'}` },
              { value: `${team.district}, ${team.state}, ${team.panchayat || 'N/A'}` }
            ]}
            columns={[
              {
                key: 'detail',
                header: 'Team Details',
                render: (_, item) => (
                  <div className="py-2">
                    <span className="text-gray-900">{item.value}</span>
                  </div>
                )
              }
            ]}
            headerActions={
              <Link
                href={`/${lang}/captain/teams/${team.id}`}
                className="text-[#F28C38] hover:text-[#E67A26] font-medium text-sm"
              >
                Manage Team
              </Link>
            }
            onRowClick={() => {}}
            showPagination={false}
          />

          {/* Quick Actions Table */}
          <AdvancedTable
            data={[
              { 
                id: 'add-players',
                title: 'Add Players', 
                description: 'Invite new team members',
                href: `/${lang}/captain/teams/${team.id}/players/invite`,
                icon: Plus
              },
              { 
                id: 'view-fixtures',
                title: 'View Fixtures', 
                description: 'Check match schedule',
                href: `/${lang}/captain/fixtures`,
                icon: Calendar
              },
              { 
                id: 'match-results',
                title: 'Match Results', 
                description: 'View past results',
                href: `/${lang}/captain/matches`,
                icon: Trophy
              }
            ]}
            columns={[
              {
                key: 'action',
                header: 'Quick Actions',
                render: (_, item) => (
                  <div className="flex items-center p-3">
                    <item.icon className="w-5 h-5 text-[#F28C38] mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                  </div>
                )
              }
            ]}
            onRowClick={(action) => {
              window.location.href = action.href;
            }}
            showPagination={false}
          />
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
