"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Timer,
  Trash2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';

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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<any>(null);

  // Get tRPC utils for cache management
  const utils = api.useUtils();

  // tRPC queries with real-time refetch
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = api.admin.dashboard.getDashboardOverview.useQuery({
    level: 'all',
    includeDetailed: true,
    refreshCache: true // Enable cache refresh for real-time data
  }, {
    enabled: !!user && user.role === 'admin',
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: process.env.NODE_ENV === 'development' ? 0 : 1000 * 20, // No cache in dev, 20s in prod
  });

  const {
    data: tournamentData,
    isLoading: tournamentLoading,
    error: tournamentError,
    refetch: refetchTournament
  } = api.admin.dashboard.getTournamentOverview.useQuery({
    level: 'all',
    status: 'all'
  }, {
    enabled: !!user && user.role === 'admin',
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: process.env.NODE_ENV === 'development' ? 0 : 1000 * 20, // No cache in dev, 20s in prod
  });

  // Auth check
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (user.role !== 'admin') {
      router.push(`/${lang}/player/dashboard`);
      return;
    }
  }, [user, userProfile, authLoading, lang, router]);

  // Cache clearing function
  const handleClearCache = useCallback(async () => {
    try {
      // Clear all admin dashboard related queries
      await utils.admin.dashboard.invalidate();
      console.log('✅ Dashboard cache cleared');
      
      // Force refetch
      await Promise.all([
        refetchDashboard(),
        refetchTournament()
      ]);
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }, [utils, refetchDashboard, refetchTournament]);

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
  
  // Debug logging
  console.log('Dashboard Error:', dashboardError);
  console.log('Tournament Error:', tournamentError);
  console.log('Dashboard Data:', dashboardData);
  console.log('Tournament Data:', tournamentData);
  
  const error = dashboardError?.message || tournamentError?.message;
  const dashboardOverview = dashboardData?.overview;
  const tournamentOverview = tournamentData?.tournament;

  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
  };

  const handleIntervalChange = (newInterval: number) => {
    setRefreshInterval(newInterval);
    setNextRefreshIn(newInterval);
  };

  // Dashboard Skeleton Component
  const DashboardSkeleton = () => (
    <div className="lg:min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-pulse">
        
        {/* Header Skeleton */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-64"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-10 bg-gray-200 rounded w-32"></div>
              <div className="h-10 bg-gray-200 rounded w-10"></div>
            </div>
          </div>

          {/* Status Bar Skeleton */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-gray-200 rounded-full mr-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-12 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Tournament Overview Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
          
          {/* Tournament Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="h-5 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                  <div className="h-3 bg-gray-200 rounded w-28"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Tournament Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="space-y-1">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Access Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="w-8 h-8 bg-gray-200 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (authLoading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="lg:min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Compact Control Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  loading ? 'bg-yellow-400' : 'bg-green-400'
                }`} />
                Last updated: {lastUpdated?.toLocaleTimeString() || 'Never'}
              </div>
              {autoRefreshEnabled && (
                <div className="text-xs text-gray-500">
                  Next refresh: {nextRefreshIn}s
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Select value={refreshInterval.toString()} onValueChange={(value) => handleIntervalChange(parseInt(value))}>
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5s</SelectItem>
                  <SelectItem value="10">10s</SelectItem>
                  <SelectItem value="15">15s</SelectItem>
                  <SelectItem value="30">30s</SelectItem>
                  <SelectItem value="60">1m</SelectItem>
                  <SelectItem value="120">2m</SelectItem>
                  <SelectItem value="300">5m</SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={handleClearCache}
                  className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                  title="Clear tRPC Cache (Dev Only)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                className={`p-1.5 rounded transition-colors ${
                  autoRefreshEnabled 
                    ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title={autoRefreshEnabled ? 'Disable Auto Refresh' : 'Enable Auto Refresh'}
              >
                {autoRefreshEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="mb-4">
            {criticalAlerts.map((alert, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
                  <div>
                    <h3 className="text-sm font-medium text-red-900">Critical Update</h3>
                    <p className="text-xs text-red-700">{alert}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className={`bg-white rounded-md p-3 shadow-sm relative ${loading ? 'animate-pulse' : ''}`}>
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
                  {dashboardOverview?.players?.total || 0}
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
                  {dashboardOverview?.verification?.pending || 0}
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
                  {dashboardOverview?.venues?.active || 0}
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
        <div className={`mb-4 bg-white rounded-md shadow-sm border p-4 ${loading ? 'animate-pulse' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Tournament Progress</h3>
            <div className="text-xs text-gray-500">
              {`${tournamentOverview?.summary?.overallProgress || 0}% Complete`}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Matches</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Completed</span>
                  <span className="font-medium">{tournamentOverview?.stats?.matches?.completed || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>In Progress</span>
                  <span className="font-medium">{tournamentOverview?.stats?.matches?.inProgress || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Scheduled</span>
                  <span className="font-medium">{tournamentOverview?.stats?.matches?.scheduled || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Fixtures</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="font-medium">{tournamentOverview?.stats?.fixtures?.total || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active</span>
                  <span className="font-medium">{tournamentOverview?.summary?.activeFixtures || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed</span>
                  <span className="font-medium">{tournamentOverview?.summary?.completedTournaments || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Teams Advanced</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="font-medium">{tournamentOverview?.summary?.teamsAdvanced || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cluster→Division</span>
                  <span className="font-medium">{tournamentOverview?.stats?.progression?.clusterToDiv || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Division→Final</span>
                  <span className="font-medium">{tournamentOverview?.stats?.progression?.divToFinal || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Level Venue Statistics */}
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
              {`${dashboardOverview?.venues?.total || 0} Total Venues`}
            </div>
          </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Target className="w-4 h-4 mr-2 text-blue-600" />
                  Cluster Venues
                </h3>
                <div className="text-2xl font-bold text-blue-600">
                  {dashboardOverview?.venues?.mappings?.cluster || 0}
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  {dashboardOverview?.venueAssignments?.cluster || 0} teams assigned
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Trophy className="w-4 h-4 mr-2 text-green-600" />
                  Division Venues
                </h3>
                <div className="text-2xl font-bold text-green-600">
                  {dashboardOverview?.venues?.mappings?.division || 0}
                </div>
                <div className="text-sm text-green-700 mt-1">
                  {dashboardOverview?.venueAssignments?.division || 0} teams assigned
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Trophy className="w-4 h-4 mr-2 text-purple-600" />
                  Final Venues
                </h3>
                <div className="text-2xl font-bold text-purple-600">
                  {dashboardOverview?.venues?.mappings?.final || 0}
                </div>
                <div className="text-sm text-purple-700 mt-1">
                  {dashboardOverview?.venueAssignments?.final || 0} teams assigned
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-orange-600" />
                  Total Assignments
                </h3>
                <div className="text-2xl font-bold text-orange-600">
                  {(dashboardOverview?.venueAssignments?.cluster || 0) + 
                   (dashboardOverview?.venueAssignments?.division || 0) + 
                   (dashboardOverview?.venueAssignments?.final || 0)}
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

        {/* New Admin Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          
          {/* Volunteer Management Panel */}
          <div className="bg-white rounded-md shadow-sm border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Volunteer Management</h3>
              <UserCheck className="w-4 h-4 text-gray-400" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Total Assigned</span>
                <span className="font-medium">{(dashboardOverview as any)?.volunteers?.assigned || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Available</span>
                <span className="font-medium text-green-600">{(dashboardOverview as any)?.volunteers?.available || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Assignment Gaps</span>
                <span className="font-medium text-orange-600">{(dashboardOverview as any)?.volunteers?.gaps || 0}</span>
              </div>
            </div>
            <Link href={`/${lang}/admin/users/volunteers`} className="mt-3 block text-xs text-blue-600 hover:text-blue-800">
              Manage Volunteers →
            </Link>
          </div>

          {/* Event Status Overview */}
          <div className="bg-white rounded-md shadow-sm border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Event Status</h3>
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Active Events</span>
                <span className="font-medium">{(dashboardOverview as any)?.events?.active || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Registration Open</span>
                <span className="font-medium text-green-600">{(dashboardOverview as any)?.events?.registrationOpen || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Upcoming Matches</span>
                <span className="font-medium text-blue-600">{(dashboardOverview as any)?.matches?.upcoming || 0}</span>
              </div>
            </div>
            <Link href={`/${lang}/admin/events`} className="mt-3 block text-xs text-blue-600 hover:text-blue-800">
              Manage Events →
            </Link>
          </div>

          {/* Media Management */}
          <div className="bg-white rounded-md shadow-sm border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Media Management</h3>
              <Activity className="w-4 h-4 text-gray-400" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Total Files</span>
                <span className="font-medium">{(dashboardOverview as any)?.media?.total || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Pending Approval</span>
                <span className="font-medium text-orange-600">{(dashboardOverview as any)?.media?.pending || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Storage Used</span>
                <span className="font-medium">{(dashboardOverview as any)?.media?.storageUsed || '0 MB'}</span>
              </div>
            </div>
            <Link href={`/${lang}/admin/media`} className="mt-3 block text-xs text-blue-600 hover:text-blue-800">
              Manage Media →
            </Link>
          </div>

          {/* User Activity Analytics */}
          <div className="bg-white rounded-md shadow-sm border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">User Activity</h3>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Recent Registrations</span>
                <span className="font-medium">{(dashboardOverview as any)?.users?.recentRegistrations || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Active Sessions</span>
                <span className="font-medium text-green-600">{(dashboardOverview as any)?.users?.activeSessions || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Verification Queue</span>
                <span className="font-medium text-orange-600">{dashboardOverview?.verification?.pending || 0}</span>
              </div>
            </div>
            <Link href={`/${lang}/admin/users`} className="mt-3 block text-xs text-blue-600 hover:text-blue-800">
              Manage Users →
            </Link>
          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-md shadow-sm border p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Access</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href={`/${lang}/admin/teams`}
              className="p-3 border border-gray-200 rounded-md hover:border-[#F28C38] hover:bg-orange-50 transition-colors group"
            >
              <Users className="w-5 h-5 text-gray-400 group-hover:text-[#F28C38] mb-2" />
              <h4 className="text-sm font-medium text-gray-900 group-hover:text-[#F28C38]">Teams</h4>
              <p className="text-xs text-gray-600">{dashboardOverview?.teams?.total || 0} registered</p>
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
