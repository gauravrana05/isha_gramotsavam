"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { 
  Users, 
  Trophy, 
  MapPin,
  UserCheck,
  CheckCircle,
  Clock,
  Activity,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Target,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface DashboardOverview {
  teams: any;
  players: any;
  verification: any;
  venues: any;
  matches: any;
  systemHealth: any;
  insights: any[];
  recentActivity: any[] | null;
}

interface TournamentOverview {
  stats: any;
  upcomingMatches: any[];
  insights: any[];
  summary: any;
}

export default function AdminDashboard() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { lang } = useParams();
  const router = useRouter();

  // tRPC queries
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = api.admin.getDashboardOverview.useQuery({
    level: 'all',
    includeDetailed: true,
    refreshCache: false
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  const {
    data: tournamentData,
    isLoading: tournamentLoading,
    error: tournamentError,
    refetch: refetchTournament
  } = api.admin.getTournamentOverview.useQuery({
    level: 'all',
    status: 'all'
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  // Auth check
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (userProfile?.role !== 'admin') {
      router.push(`/${lang}/player/dashboard`);
      return;
    }
  }, [user, userProfile, authLoading, lang, router]);

  const loading = dashboardLoading || tournamentLoading;
  const error = dashboardError?.message || tournamentError?.message || '';
  const dashboardOverview = dashboardData?.overview;
  const tournamentOverview = tournamentData?.tournament;

  const handleRefresh = () => {
    refetchDashboard();
    refetchTournament();
  };


  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Activity className="w-16 h-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'critical': return <Activity className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold font-fira mb-2 text-[#4A2F1D]">
              Admin Dashboard
            </h1>
            <p className="text-sm sm:text-base text-gray-600 font-fira">
              Welcome back, {userProfile?.firstName}! Here&apos;s your system overview.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Activity className="w-4 h-4 mr-2" />
            )}
            Refresh
          </button>
        </div>

        {/* System Health */}
        {dashboardOverview?.systemHealth && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`${getHealthColor(dashboardOverview.systemHealth.overall)} mr-3`}>
                  {getHealthIcon(dashboardOverview.systemHealth.overall)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">System Health</h3>
                  <p className="text-sm text-gray-600">Score: {dashboardOverview.systemHealth.score}/100</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                  dashboardOverview.systemHealth.overall === 'healthy' ? 'bg-green-100 text-green-800' :
                  dashboardOverview.systemHealth.overall === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {dashboardOverview.systemHealth.overall}
                </span>
              </div>
            </div>
            {dashboardOverview.systemHealth.issues.length > 0 && (
              <div className="mt-3 space-y-1">
                {dashboardOverview.systemHealth.issues.slice(0, 3).map((issue: string, index: number) => (
                  <p key={index} className="text-sm text-gray-600">• {issue}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Teams</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">
                  {dashboardOverview?.teams?.total || 0}
                </p>
                <p className="text-xs text-green-600">
                  {dashboardOverview?.teams?.verificationRate || 0}% verified
                </p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Players</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">
                  {dashboardOverview?.players?.total || 0}
                </p>
                <p className="text-xs text-blue-600">
                  Avg age: {dashboardOverview?.players?.averageAge || 0}
                </p>
              </div>
              <Trophy className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Verification Queue</p>
                <p className="text-2xl font-bold text-orange-600">
                  {dashboardOverview?.verification?.pending || 0}
                </p>
                <p className="text-xs text-gray-600">
                  {dashboardOverview?.verification?.backlogDays || 0} days backlog
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Venues</p>
                <p className="text-2xl font-bold text-purple-600">
                  {dashboardOverview?.venues?.active || 0}
                </p>
                <p className="text-xs text-gray-600">
                  {dashboardOverview?.venues?.utilizationRate || 0}% utilized
                </p>
              </div>
              <MapPin className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Tournament Progress */}
        {tournamentOverview && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 font-fira">Tournament Progress</h2>
              <div className="flex items-center text-sm text-gray-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                {tournamentOverview.summary.overallProgress}% Complete
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Matches</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Completed</span>
                    <span className="font-medium">{tournamentOverview.stats.matches.completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>In Progress</span>
                    <span className="font-medium">{tournamentOverview.stats.matches.inProgress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scheduled</span>
                    <span className="font-medium">{tournamentOverview.stats.matches.scheduled}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Fixtures</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span className="font-medium">{tournamentOverview.stats.fixtures.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active</span>
                    <span className="font-medium">{tournamentOverview.summary.activeFixtures}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed</span>
                    <span className="font-medium">{tournamentOverview.summary.completedTournaments}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Teams Advanced</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span className="font-medium">{tournamentOverview.summary.teamsAdvanced}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cluster→Division</span>
                    <span className="font-medium">{tournamentOverview.stats.progression.clusterToDiv}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Division→Final</span>
                    <span className="font-medium">{tournamentOverview.stats.progression.divToFinal}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Insights */}
        {dashboardOverview?.insights && dashboardOverview.insights.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 font-fira mb-4">System Insights</h2>
            <div className="space-y-3">
              {dashboardOverview.insights.slice(0, 5).map((insight: any, index: number) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  insight.type === 'alert' ? 'bg-red-50 border-red-400 text-red-800' :
                  insight.type === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
                  'bg-blue-50 border-blue-400 text-blue-800'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{insight.message}</p>
                      {insight.action && (
                        <p className="text-sm mt-1 opacity-80">Action: {insight.action}</p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50 capitalize">
                      {insight.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Access */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 font-fira mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href={`/${lang}/admin/teams`}
              className="p-4 border border-gray-200 rounded-lg hover:border-[#F28C38] hover:bg-orange-50 transition-colors group"
            >
              <Users className="w-6 h-6 text-gray-400 group-hover:text-[#F28C38] mb-2" />
              <h3 className="font-medium text-gray-900 group-hover:text-[#F28C38]">Teams</h3>
              <p className="text-sm text-gray-600">{dashboardOverview?.teams?.total || 0} registered</p>
            </Link>
            
            <Link
              href={`/${lang}/admin/teams/verification`}
              className="p-4 border border-gray-200 rounded-lg hover:border-[#F28C38] hover:bg-orange-50 transition-colors group"
            >
              <Clock className="w-6 h-6 text-gray-400 group-hover:text-[#F28C38] mb-2" />
              <h3 className="font-medium text-gray-900 group-hover:text-[#F28C38]">Verification</h3>
              <p className="text-sm text-gray-600">{dashboardOverview?.verification?.pending || 0} pending</p>
            </Link>
            
            <Link
              href={`/${lang}/admin/venues`}
              className="p-4 border border-gray-200 rounded-lg hover:border-[#F28C38] hover:bg-orange-50 transition-colors group"
            >
              <MapPin className="w-6 h-6 text-gray-400 group-hover:text-[#F28C38] mb-2" />
              <h3 className="font-medium text-gray-900 group-hover:text-[#F28C38]">Venues</h3>
              <p className="text-sm text-gray-600">{dashboardOverview?.venues?.total || 0} venues</p>
            </Link>
            
            <Link
              href={`/${lang}/admin/analytics`}
              className="p-4 border border-gray-200 rounded-lg hover:border-[#F28C38] hover:bg-orange-50 transition-colors group"
            >
              <Target className="w-6 h-6 text-gray-400 group-hover:text-[#F28C38] mb-2" />
              <h3 className="font-medium text-gray-900 group-hover:text-[#F28C38]">Analytics</h3>
              <p className="text-sm text-gray-600">View reports</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
