'use client';

import React from 'react';
import { useOfflineVenueData } from '@/hooks/useOfflineVenueData';
import { useOfflineTeams } from '@/hooks/useOfflineTeams';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/utils/i18n';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Play, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Eye,
  Plus,
  BarChart3,
  Camera,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  sport: { id: string; name: string; };
  level: string;
  status: 'draft' | 'teams_assigned' | 'in_progress' | 'completed';
  genderCategory: string;
  teams: number;
  stats: {
    totalTeams: number;
    matchesCompleted: number;
    matchesTotal: number;
    progress: number;
  };
}

interface SportGroup {
  sportId: string;
  sportName: string;
  genderCategory: string;
  teams: any[];
}

function VolunteerFixturesPage() {
  // console.log('🎭 [FixturesPage] Component render started', { timestamp: new Date().toISOString() });
  
  const params = useParams();
  const router = useRouter();
  const { venueId, lang } = params as { venueId: string; lang: string };
  const { user } = useAuth();
  const { t } = useTranslation();
  
  // console.log('📍 [FixturesPage] Params and user:', { venueId, lang, userId: user?.id });

  // Removed render tracking debug code to prevent interference

  // Get venue tournament data from offline storage
  const { 
    venueData, 
    isLoading: loading, 
    error,
    refetch
  } = useOfflineVenueData(venueId);

  // Get teams data for accurate stats (same pattern as dashboard)
  const { 
    teams: teamsData, 
    isLoading: teamsLoading, 
    error: teamsError 
  } = useOfflineTeams(venueId);
  
  // console.log('🎯 [FixturesPage] Hook results:', { 
  //   hasVenueData: !!venueData, 
  //   loading, 
  //   teamsLoading,
  //   hasError: !!error,
  //   hasTeamsError: !!teamsError,
  //   teamsCount: teamsData?.length || 0,
  //   timestamp: new Date().toISOString()
  // });

  // Simplified refetch - no polling to avoid cascade issues
  // Tournament data is mostly static, so manual refresh is sufficient
  const handleRefresh = () => {
    refetch();
  };

  // FIXED: Remove all problematic memoizations - use direct data access
  const tournament = venueData?.tournament || venueData?.fixtures?.[0] || null;
  
  // Stabilize teams data to prevent unnecessary recalculations  
  const stableTeamsData = teamsData || [];
  
  // FIXED: Simplify teamsBySport - remove useMemo to prevent dependency issues
  const teamsBySport = venueData?.teamsBySport || [];
  
  // FIXED: Add proper memoization to prevent infinite render loops
  const totalTeams = stableTeamsData.length;
  
  // Memoize expensive filter operation
  const checkedInTeams = React.useMemo(() => 
    stableTeamsData.filter(team => team.status === 'checked_in').length,
    [stableTeamsData.length] // Use length as dependency to avoid object instability
  );
  
  // Memoize expensive reduce operations
  const fixtures = venueData?.fixtures || [];
  const totalMatches = React.useMemo(() => 
    fixtures.reduce((sum: number, fixture: any) => sum + (fixture.matches?.length || 0), 0),
    [fixtures.length] // Use length as dependency
  );
  
  const completedMatches = React.useMemo(() => 
    fixtures.reduce((sum: number, fixture: any) => 
      sum + (fixture.matches?.filter((m: any) => m.status === 'completed').length || 0), 0),
    [fixtures.length] // Use length as dependency
  );
  
  const progress = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;
  
  // Memoize stats object to prevent recreation
  const stats = React.useMemo(() => ({
    totalTeams,
    checkedInTeams,
    matchesCompleted: completedMatches,
    matchesTotal: totalMatches,
    progress
  }), [totalTeams, checkedInTeams, completedMatches, totalMatches, progress]);

  // Memoize helper functions to prevent recreation on every render
  const getStatusColor = React.useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'teams_assigned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const getStatusIcon = React.useCallback((status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'teams_assigned': return <Users className="w-4 h-4" />;
      case 'draft': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  }, []);

  // Simplified loading logic - prioritize teams data since that's most critical
  const [loadingTimeout, setLoadingTimeout] = React.useState(false);
  
  React.useEffect(() => {
    // Reset timeout when teams finish loading
    if (!teamsLoading) {
      setLoadingTimeout(false);
      return;
    }
    
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 3000); // 3 second timeout for teams only
    
    return () => clearTimeout(timer);
  }, [teamsLoading]);
  
  // Show loading only if teams are loading (venue data is secondary)
  const isActuallyLoading = teamsLoading && !loadingTimeout;
  
  // console.log('🎯 [FixturesPage] Detailed loading state:', {
  //   'useOfflineVenueData.loading': loading,
  //   'useOfflineTeams.loading': teamsLoading,
  //   'loadingTimeout': loadingTimeout,
  //   'isActuallyLoading': isActuallyLoading,
  //   'willShowLoadingScreen': isActuallyLoading
  // });
  
  if (isActuallyLoading) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] py-4 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Loading Header Skeleton */}
          <div className="mb-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>

          {/* Loading Stats Cards Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-4 shadow-sm">
                <div className="animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-12"></div>
                    </div>
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Loading Main Content */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="animate-pulse">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F28C38] mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-48 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center p-6">
        <div className="text-center bg-white rounded-lg p-8 shadow-sm border max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Tournament</h1>
          <p className="text-gray-600 mb-6">{error.message}</p>
          <button 
            onClick={handleRefresh}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F0E5] py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t('volunteer.fixtures.title', 'Tournament Management')}
              </h1>
              <p className="text-gray-600">
                {t('volunteer.fixtures.subtitle', 'Manage tournament schedules and progress')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Live Update Indicator */}
              {venueData?.tournament?.status === 'in_progress' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <Wifi className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm font-medium">Live Updates</span>
                </div>
              )}
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Teams</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTeams}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Matches</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.matchesCompleted}/{stats.matchesTotal}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.progress}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Status</p>
                <p className="text-lg font-bold text-gray-900 capitalize">
                  {tournament?.status?.replace('_', ' ') || 'No Tournament'}
                </p>
              </div>
              <Trophy className="w-8 h-8 text-[#F28C38]" />
            </div>
          </div>
        </div>

        {/* Tournament Card */}
        {tournament ? (
          <div className="bg-white rounded-lg border shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Trophy className="w-6 h-6 text-[#F28C38] mr-3" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{tournament.name}</h3>
                  <p className="text-gray-600">
                    {tournament.sport?.name} • {tournament.genderCategory} • {tournament.level}
                  </p>
                </div>
              </div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(tournament.status)}`}>
                {getStatusIcon(tournament.status)}
                <span className="ml-2 capitalize">{tournament.status.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Tournament Progress</span>
                <span className="text-sm text-gray-600">{tournament.stats.progress}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[#F28C38] h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${tournament.stats.progress}%` }}
                />
              </div>
            </div>

            {/* Tournament Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{tournament.teams}</div>
                <div className="text-sm text-gray-600">Teams</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {tournament.stats.matchesCompleted}/{tournament.stats.matchesTotal}
                </div>
                <div className="text-sm text-gray-600">Matches</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{tournament.stats.progress}%</div>
                <div className="text-sm text-gray-600">Complete</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => tournament?.id && router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/${tournament.id}`)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors"
                disabled={!tournament?.id}
              >
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">View Bracket</span>
              </button>

              <button
                onClick={() => tournament?.id && router.push(`/${lang}/volunteer/venues/${venueId}/matches?fixture=${tournament.id}`)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={tournament?.status === 'completed' || !tournament?.id}
              >
                <Play className="w-4 h-4" />
                <span className="text-sm font-medium">Live Matches</span>
              </button>

              <button
                onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/media/upload?fixtureId=${tournament.id}`)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span className="text-sm font-medium">Upload Media</span>
              </button>

              <button
                onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/${tournament.id}/stats`)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm font-medium">Tournament Stats</span>
              </button>
            </div>
          </div>
        ) : (
          /* Create Tournament Section */
          <div className="bg-white rounded-lg border shadow-sm p-6 mb-8">
            <div className="text-center mb-6">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Tournament</h3>
              <p className="text-gray-600">Create a tournament when teams are ready to compete</p>
            </div>

            {teamsBySport.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Available Sports</h4>
                {teamsBySport.map((sportGroup: SportGroup) => {
                  const canCreateTournament = (sportGroup.teams || []).length >= 2;
                  
                  return (
                    <div 
                      key={`${sportGroup.sportName}_${sportGroup.genderCategory}`} 
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <Trophy className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <h5 className="font-medium text-gray-900 capitalize">
                            {sportGroup.sportName} - {sportGroup.genderCategory}
                          </h5>
                          <p className="text-sm text-gray-600">
                            {(sportGroup.teams || []).length} teams ready
                          </p>
                        </div>
                      </div>
                      
                      {canCreateTournament ? (
                        <button
                          onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/create-tournament/seeding?sport=${sportGroup.sportId}&gender=${sportGroup.genderCategory}&level=cluster`)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-sm font-medium">Create Tournament</span>
                        </button>
                      ) : (
                        <div className="text-sm text-gray-500 px-3 py-2 bg-gray-100 rounded-lg">
                          Need 2+ teams
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No teams checked in yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Teams need to be checked in before creating tournaments
                </p>
                <button
                  onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/teams`)}
                  className="mt-4 text-[#F28C38] hover:text-[#E67A26] text-sm font-medium"
                >
                  View Teams →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default VolunteerFixturesPage;