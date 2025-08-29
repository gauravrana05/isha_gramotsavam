"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
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
  Settings,
  RefreshCw,
  Zap,
  Pause,
  Play,
  Timer
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
  
  // Real-time update state
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [nextRefreshIn, setNextRefreshIn] = useState<number>(30);
  const [criticalAlerts, setCriticalAlerts] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();
  const previousDataRef = useRef<any>(null);

  // tRPC queries with real-time refetch
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = api.admin.getDashboardOverview.useQuery({
    level: 'all',
    includeDetailed: true,
    refreshCache: true // Enable cache refresh for real-time data
  }, {
    enabled: !!user && userProfile?.role === 'admin',
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 1000 * 20, // Consider data stale after 20 seconds
    cacheTime: 1000 * 60 // Cache for 1 minute
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
    enabled: !!user && userProfile?.role === 'admin',
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 1000 * 20,
    cacheTime: 1000 * 60
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

  // Real-time refresh functionality with change detection
  const handleRefresh = useCallback(async () => {
    try {
      const [dashboardResult, tournamentResult] = await Promise.all([
        refetchDashboard(),
        refetchTournament()
      ]);
      
      // Check for critical changes
      if (previousDataRef.current && dashboardResult.data) {
        const alerts: string[] = [];
        const current = dashboardResult.data.overview;
        const previous = previousDataRef.current;
        
        // Check verification queue spike
        if (current?.verification?.pending && previous?.verification?.pending) {
          const increase = current.verification.pending - previous.verification.pending;
          if (increase >= 10) {
            alerts.push(`Verification queue increased by ${increase} teams`);
          }
        }
        
        // Check system health degradation
        if (current?.systemHealth?.overall !== previous?.systemHealth?.overall && 
            current?.systemHealth?.overall === 'critical') {
          alerts.push('System health status changed to CRITICAL');
        }
        
        setCriticalAlerts(alerts);
        
        // Clear alerts after 10 seconds
        if (alerts.length > 0) {
          setTimeout(() => setCriticalAlerts([]), 10000);
        }
      }
      
      // Store current data for next comparison
      if (dashboardResult.data) {
        previousDataRef.current = dashboardResult.data.overview;
      }
      
      setLastUpdated(new Date());
      setNextRefreshIn(refreshInterval);
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  }, [refetchDashboard, refetchTournament, refreshInterval]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefreshEnabled || !user || userProfile?.role !== 'admin') return;

    const startAutoRefresh = () => {
      // Clear existing intervals
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);

      // Set up auto-refresh interval
      intervalRef.current = setInterval(() => {
        handleRefresh();
      }, refreshInterval * 1000);

      // Set up countdown timer
      let countdown = refreshInterval;
      setNextRefreshIn(countdown);
      
      countdownRef.current = setInterval(() => {
        countdown--;
        setNextRefreshIn(countdown);
        
        if (countdown <= 0) {
          countdown = refreshInterval;
        }
      }, 1000);
    };

    startAutoRefresh();

    // Cleanup on unmount or dependency change
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefreshEnabled, refreshInterval, user, userProfile, handleRefresh]);

  // Handle visibility change for better resource management
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause auto-refresh when tab is not visible
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
      } else if (autoRefreshEnabled && user && userProfile?.role === 'admin') {
        // Resume auto-refresh when tab becomes visible
        handleRefresh(); // Immediate refresh
        // Auto-refresh will restart via useEffect dependency
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [autoRefreshEnabled, user, userProfile, handleRefresh]);

  const loading = dashboardLoading || tournamentLoading;
  const error = dashboardError?.message || tournamentError?.message || '';
  const dashboardOverview = dashboardData?.overview;
  const tournamentOverview = tournamentData?.tournament;

  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
  };

  const handleIntervalChange = (newInterval: number) => {
    setRefreshInterval(newInterval);
    setNextRefreshIn(newInterval);
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
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold font-fira mb-2 text-[#4A2F1D]">
                Admin Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600 font-fira">
                Welcome back, {userProfile?.firstName}! Here&apos;s your system overview.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </button>
              <button
                onClick={toggleAutoRefresh}
                className={`flex items-center px-4 py-2 border rounded-lg transition-colors ${
                  autoRefreshEnabled
                    ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {autoRefreshEnabled ? (
                  <Play className="w-4 h-4 mr-2" />
                ) : (
                  <Pause className="w-4 h-4 mr-2" />
                )}
                Auto-Refresh
              </button>
            </div>
          </div>

          {/* Real-time Status Bar */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    autoRefreshEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`} />
                  <span className="text-sm font-medium text-gray-700">
                    {autoRefreshEnabled ? 'Live Updates' : 'Manual Refresh'}
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Timer className="w-4 h-4 mr-1" />
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>

                {autoRefreshEnabled && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-1" />
                    Next refresh: {nextRefreshIn}s
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Refresh interval:</span>
                <select
                  value={refreshInterval}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!autoRefreshEnabled}
                >
                  <option value={15}>15s</option>
                  <option value={30}>30s</option>
                  <option value={60}>1m</option>
                  <option value={120}>2m</option>
                  <option value={300}>5m</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="mb-6">
            {criticalAlerts.map((alert, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4 mb-2 animate-pulse">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
                  <div>
                    <h3 className="font-semibold text-red-900">Critical Update Detected</h3>
                    <p className="text-sm text-red-700 mt-1">{alert}</p>
                  </div>
                  <Zap className="w-4 h-4 text-red-500 ml-auto animate-bounce" />
                </div>
              </div>
            ))}
          </div>
        )}

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
          <div className={`bg-white rounded-lg p-4 shadow-sm relative ${loading ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Teams</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    dashboardOverview?.teams?.total || 0
                  )}
                </p>
                <p className="text-xs text-green-600">
                  {dashboardOverview?.teams?.verificationRate || 0}% verified
                </p>
              </div>
              <div className="relative">
                <Users className="w-8 h-8 text-gray-400" />
                {autoRefreshEnabled && !loading && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
            </div>
          </div>
          
          <div className={`bg-white rounded-lg p-4 shadow-sm relative ${loading ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Players</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    dashboardOverview?.players?.total || 0
                  )}
                </p>
                <p className="text-xs text-blue-600">
                  Avg age: {dashboardOverview?.players?.averageAge || 0}
                </p>
              </div>
              <div className="relative">
                <Trophy className="w-8 h-8 text-gray-400" />
                {autoRefreshEnabled && !loading && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
            </div>
          </div>
          
          <div className={`bg-white rounded-lg p-4 shadow-sm relative ${loading ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Verification Queue</p>
                <p className="text-2xl font-bold text-orange-600">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    dashboardOverview?.verification?.pending || 0
                  )}
                </p>
                <p className="text-xs text-gray-600">
                  {dashboardOverview?.verification?.backlogDays || 0} days backlog
                </p>
              </div>
              <div className="relative">
                <Clock className="w-8 h-8 text-orange-400" />
                {autoRefreshEnabled && !loading && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
            </div>
          </div>
          
          <div className={`bg-white rounded-lg p-4 shadow-sm relative ${loading ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Venues</p>
                <p className="text-2xl font-bold text-purple-600">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    dashboardOverview?.venues?.active || 0
                  )}
                </p>
                <p className="text-xs text-gray-600">
                  {dashboardOverview?.venues?.utilizationRate || 0}% utilized
                </p>
              </div>
              <div className="relative">
                <MapPin className="w-8 h-8 text-purple-400" />
                {autoRefreshEnabled && !loading && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tournament Progress */}
        {tournamentOverview && (
          <div className={`mb-6 bg-white rounded-lg shadow-sm border p-6 ${loading ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h2 className="text-lg font-semibold text-gray-900 font-fira mr-3">Tournament Progress</h2>
                {autoRefreshEnabled && !loading && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                )}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  `${tournamentOverview.summary.overallProgress}% Complete`
                )}
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

        {/* Multi-Level Venue Statistics */}
        {dashboardOverview?.venues && (
          <div className={`mb-6 bg-white rounded-lg shadow-sm border p-6 ${loading ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h2 className="text-lg font-semibold text-gray-900 font-fira mr-3">Multi-Level Venue System</h2>
                {autoRefreshEnabled && !loading && (
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                )}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  `${dashboardOverview.venues.total} Total Venues`
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Target className="w-4 h-4 mr-2 text-blue-600" />
                  Cluster Venues
                </h3>
                <div className="text-2xl font-bold text-blue-600">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    dashboardOverview.venues.mappings?.cluster || 0
                  )}
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  {dashboardOverview.venueAssignments?.cluster || 0} teams assigned
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Trophy className="w-4 h-4 mr-2 text-green-600" />
                  Division Venues
                </h3>
                <div className="text-2xl font-bold text-green-600">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    dashboardOverview.venues.mappings?.division || 0
                  )}
                </div>
                <div className="text-sm text-green-700 mt-1">
                  {dashboardOverview.venueAssignments?.division || 0} teams assigned
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Trophy className="w-4 h-4 mr-2 text-purple-600" />
                  Final Venues
                </h3>
                <div className="text-2xl font-bold text-purple-600">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    dashboardOverview.venues.mappings?.final || 0
                  )}
                </div>
                <div className="text-sm text-purple-700 mt-1">
                  {dashboardOverview.venueAssignments?.final || 0} teams assigned
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-orange-600" />
                  Total Assignments
                </h3>
                <div className="text-2xl font-bold text-orange-600">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    (dashboardOverview.venueAssignments?.cluster || 0) + 
                    (dashboardOverview.venueAssignments?.division || 0) + 
                    (dashboardOverview.venueAssignments?.final || 0)
                  )}
                </div>
                <div className="text-sm text-orange-700 mt-1">
                  Across all levels
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <strong>Multi-Level Architecture:</strong> Same physical venues can host different tournament levels (cluster, division, final) with independent capacity management.
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
