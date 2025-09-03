'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContextWrapper';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/server/trpc/react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/utils/i18n';
import { LanguageCode } from '@/lib/utils/i18n-server';
import LanguageSelectionModal from '@/components/volunteer/LanguageSelectionModal';
import { 
  AdvancedTable,
  type Column,
  type ActionButton,
  SingleStatCard,
  VolunteerPageLoader
} from '@/components/ui';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import Link from 'next/link';
import { 
  Loader2, 
  Users, 
  CheckCircle, 
  UserCheck, 
  Trophy, 
  Calendar, 
  Camera, 
  AlertCircle,
  Settings,
  User,
  ArrowRight,
  Target,
  Clock,
  FileText,
  Plus
} from 'lucide-react';
import PostCreator from '@/components/posts/PostCreator';

interface PageProps {
  params: Promise<{
    venueId: string;
    lang: string;
  }>;
}

interface QuickActionData {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: any;
  color: string;
  count?: number;
  status?: 'active' | 'pending' | 'completed';
}

export default function VolunteerDashboard({ params }: PageProps) {
  const { venueId, lang } = use(params);
  const { user, userProfile, loading: authLoading } = useAuth();
  const { isOnline, pendingActions, syncStatus } = useOffline();
  const { addNotification } = useNotification();
  const router = useRouter();

  // State for modals and interactions
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [selectedAction, setSelectedAction] = useState<QuickActionData | null>(null);

  // Language modal state
  const searchParams = useSearchParams();
  const showLanguageModal = searchParams.get('showLanguageModal') === 'true';
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false);

  // Language preference mutation
  const utils = api.useUtils();
  const updateLanguageMutation = api.profile.updateLanguagePreference.useMutation({
    onSuccess: async () => {
      addNotification('Language preference updated successfully', 'success');
      // Invalidate profile queries to refresh user data
      await utils.profile.checkCompletion.invalidate();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to update language preference', 'error');
      setIsUpdatingLanguage(false);
    }
  });

  // tRPC queries for dashboard data
  const { 
    data: teamsData, 
    isLoading: teamsLoading, 
    error: teamsError 
  } = api.volunteers.venue.getVenueTeams.useQuery(
    { venueId: venueId || '' },
    { enabled: !authLoading && !!user && !!venueId && venueId.length > 0 && ['general_volunteer', 'technical_volunteer'].includes(userProfile?.role || '') }
  );

  const { 
    data: checkedInTeamsData, 
    isLoading: checkedInLoading 
  } = api.volunteers.venue.getVenueCheckedInTeams.useQuery(
    { venueId },
    { enabled: !authLoading && !!user && ['general_volunteer', 'technical_volunteer'].includes(userProfile?.role || '') }
  );

  const { 
    data: fixturesData, 
    isLoading: fixturesLoading 
  } = api.volunteers.venue.getVenueFixtures.useQuery(
    { venueId },
    { enabled: !authLoading && !!user && ['general_volunteer', 'technical_volunteer'].includes(userProfile?.role || '') }
  );

  // Loading and error states
  const teams = teamsData || [];
  const fixtures = fixturesData || [];
  const checkedInTeamsResult = checkedInTeamsData || { success: false };
  const loading = authLoading || teamsLoading || checkedInLoading || fixturesLoading;
  const error = teamsError?.message || '';


  // Auth check
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.replace(`/${lang}/login`);
      return;
    }

    if (!['general_volunteer', 'technical_volunteer'].includes(userProfile?.role || '')) {
      router.replace(`/${lang}/public`);
      return;
    }
  }, [user, userProfile, authLoading, lang, router]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalTeams = teams.length;
    const checkedInCount = teams.filter(team => team.status === 'checked_in').length;
    const verifiedCount = teams.filter(team => team.status === 'verified').length;
    const rejectedCount = teams.filter(team => team.status === 'rejected').length;
    const pendingCount = teams.filter(team => 
      ['draft', 'submitted', 'pending'].includes(team.status) || !team.status
    ).length;
    const activeFixtures = fixtures.filter(f => f.status === 'in_progress').length;
    const completedFixtures = fixtures.filter(f => f.status === 'completed').length;

    return {
      totalTeams,
      checkedInCount,
      verifiedCount,
      rejectedCount,
      pendingCount,
      activeFixtures,
      completedFixtures,
      totalFixtures: fixtures.length
    };
  }, [teams, fixtures]);

  // Generate quick actions data
  const quickActions = useMemo<QuickActionData[]>(() => [
    {
      id: 'teams',
      title: 'Team Verification',
      description: 'Verify and check-in teams for tournaments',
      href: `/${lang}/volunteer/venues/${venueId}/teams`,
      icon: Users,
      color: 'from-green-50 to-green-100 border-green-200',
      count: stats.totalTeams,
      status: stats.pendingCount > 0 ? 'pending' : 'completed'
    },
    {
      id: 'fixtures',
      title: 'Tournament Management',
      description: 'Create and manage tournament brackets',
      href: `/${lang}/volunteer/venues/${venueId}/fixtures`,
      icon: Trophy,
      color: 'from-blue-50 to-blue-100 border-blue-200',
      count: stats.totalFixtures,
      status: stats.activeFixtures > 0 ? 'active' : 'pending'
    },
    {
      id: 'matches',
      title: 'Match Management',
      description: 'Score matches and update results',
      href: `/${lang}/volunteer/venues/${venueId}/matches`,
      icon: Calendar,
      color: 'from-orange-50 to-orange-100 border-orange-200',
      count: 0, // Will be updated with match count
      status: 'pending'
    },
    {
      id: 'media',
      title: 'Media Upload',
      description: 'Upload photos and videos',
      href: `/${lang}/volunteer/venues/${venueId}/media`,
      icon: Camera,
      color: 'from-purple-50 to-purple-100 border-purple-200',
      count: 0, // Will be updated with media count
      status: 'pending'
    }
  ], [lang, venueId, stats]);

  // Quick action table columns
  const quickActionColumns = useMemo<Column<QuickActionData>[]>(() => [
    {
      key: 'title',
      header: 'Action',
      sortable: true,
      render: (_, action) => (
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-gradient-to-r ${action.color}`}>
            <action.icon className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{action.title}</div>
            <div className="text-sm text-gray-600">{action.description}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'count',
      header: 'Count',
      sortable: true,
      render: (_, action) => (
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{action.count || 0}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (_, action) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          action.status === 'completed' ? 'bg-green-100 text-green-800' :
          action.status === 'active' ? 'bg-blue-100 text-blue-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {action.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
          {action.status === 'active' && <Clock className="w-3 h-3 mr-1" />}
          {action.status === 'pending' && <AlertCircle className="w-3 h-3 mr-1" />}
          {action.status?.charAt(0).toUpperCase() + action.status?.slice(1)}
        </span>
      ),
    }
  ], []);

  // Quick action table actions
  const quickActionActions = useMemo<ActionButton<QuickActionData>[]>(() => [
    {
      label: 'Open',
      icon: ArrowRight,
      onClick: (action) => router.push(action.href),
      variant: 'primary',
    }
  ], [router]);

  // Handle quick action row click
  const handleQuickActionClick = (action: QuickActionData) => {
    router.push(action.href);
  };

  // Handle language selection
  const handleLanguageSelect = async (languageCode: LanguageCode) => {
    if (!languageCode) {
      addNotification('Please select a language', 'error');
      return;
    }
    
    setIsUpdatingLanguage(true);
    try {
      await updateLanguageMutation.mutateAsync({ language: languageCode });
      
      // Redirect to volunteer home page with new language
      window.location.href = `/${languageCode}/volunteer`;
    } catch (error) {
      console.error('Failed to update language:', error);
      setIsUpdatingLanguage(false);
    }
  };

  // Handle language modal cancel
  const handleLanguageCancel = () => {
    // Just stay on current page, modal will close
  };

  // Show language selection modal if user has no language preference
  if (user && userProfile && !userProfile.languagePreference && !authLoading && !isUpdatingLanguage) {
    return (
      <>
        <div className="py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F28C38] mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-40 mx-auto mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
        
        <LanguageSelectionModal
          isOpen={true}
          onLanguageSelect={handleLanguageSelect}
          onCancel={handleLanguageCancel}
          onClose={handleLanguageCancel}
          currentLanguage={lang as LanguageCode}
          isLoading={isUpdatingLanguage}
        />
      </>
    );
  }

  // Content loading state (keeps sidebar visible)
  if (authLoading || loading) {
    return (
      <div className="py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>

        {/* Loading Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-6 shadow-sm">
              <div className="animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="w-10 h-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg border p-6 shadow-sm">
            <div className="animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-6 shadow-sm">
            <div className="animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
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
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user || !['general_volunteer', 'technical_volunteer'].includes(userProfile?.role || '')) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-orange-800 font-medium">Working Offline</span>
            </div>
            {pendingActions.length > 0 && (
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                {pendingActions.length} actions pending sync
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sync Status */}
      {isOnline && syncStatus === 'syncing' && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-blue-800 font-medium">Syncing offline actions...</span>
          </div>
        </div>
      )}

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
        {/* Total Teams */}
        <div 
          onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/teams`)}
          className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-3 sm:p-6 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-lg border-0"
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-3">
              <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-900 mb-1">{stats.totalTeams}</div>
            <div className="text-sm font-medium text-blue-700">Total Teams</div>
          </div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200 rounded-full -mr-10 -mt-10 opacity-20"></div>
        </div>

        {/* Verified Teams */}
        <div 
          onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/teams?teamStatus=verified`)}
          className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-3 sm:p-6 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-lg border-0"
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-3">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-emerald-900 mb-1">{stats.verifiedCount}</div>
            <div className="text-sm font-medium text-emerald-700">Verified</div>
          </div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-200 rounded-full -mr-10 -mt-10 opacity-20"></div>
        </div>

        {/* Pending Teams */}
        <div 
          onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/teams?teamStatus=submitted`)}
          className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-3 sm:p-6 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-lg border-0"
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-3">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Clock className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-amber-900 mb-1">{stats.pendingCount}</div>
            <div className="text-sm font-medium text-amber-700">Pending</div>
          </div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200 rounded-full -mr-10 -mt-10 opacity-20"></div>
        </div>

        {/* Active Fixtures */}
        <div 
          onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/fixtures?status=in_progress`)}
          className="relative overflow-hidden bg-gradient-to-br from-violet-50 to-violet-100 rounded-2xl p-3 sm:p-6 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-lg border-0"
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-3">
              <div className="w-14 h-14 bg-violet-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Trophy className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-violet-900 mb-1">{stats.activeFixtures}</div>
            <div className="text-sm font-medium text-violet-700">Active Fixtures</div>
          </div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-violet-200 rounded-full -mr-10 -mt-10 opacity-20"></div>
        </div>
      </div>

      {/* Quick Actions Table */}
      <AdvancedTable<QuickActionData>
        data={quickActions}
        columns={quickActionColumns}
        actions={quickActionActions}
        loading={false}
        searchable={false}
        filterable={false}
        sortable={false}
        selectable={false}
        onRowClick={handleQuickActionClick}
        keyExtractor={(action) => action.id}
        emptyState={{
          icon: AlertCircle,
          title: 'No actions available',
          description: 'Check your volunteer assignment status.'
        }}
        pagination={{ enabled: false }}
        persistState={false}
      />

      {/* Active Fixtures Section - if there are fixtures */}
      {fixtures.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-[#F28C38]" />
            Active Tournaments
          </h2>
          <div className="space-y-3">
            {fixtures.slice(0, 5).map(fixture => (
              <div key={fixture.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div>
                  <h3 className="font-medium">{fixture.name}</h3>
                  <p className="text-sm text-gray-600">
                    {fixture.assignedTeams?.length || 0} teams • Status: {fixture.status}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Link href={`/${lang}/volunteer/venues/${venueId}/fixtures/${fixture.id}`}>
                    <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                      <Trophy className="w-4 h-4 mr-1" />
                      Manage
                    </button>
                  </Link>
                  {fixture.status === 'in_progress' && (
                    <Link href={`/${lang}/volunteer/venues/${venueId}/matches?fixture=${fixture.id}`}>
                      <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26]">
                        <Calendar className="w-4 h-4 mr-1" />
                        Live
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {fixtures.length > 5 && (
              <div className="text-center pt-2">
                <Link href={`/${lang}/volunteer/venues/${venueId}/fixtures`}>
                  <button className="text-[#F28C38] hover:text-[#E67A26] font-medium text-sm">
                    View All {fixtures.length} Tournaments
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Button for Mobile and Desktop */}
      <div className="fixed bottom-4 right-4">
        <button 
          onClick={() => setShowPostCreator(true)} 
          className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Post Creator Modal */}
      <PostCreator 
        isOpen={showPostCreator}
        onClose={() => setShowPostCreator(false)}
        onPostCreated={() => setShowPostCreator(false)}
        compact={true}
      />

    </div>
  );
}