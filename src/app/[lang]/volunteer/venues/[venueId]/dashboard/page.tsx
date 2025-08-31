'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/server/trpc/react';
import { 
  AdvancedTable,
  type Column,
  type ActionButton,
  SingleStatCard,
  PageLoader
} from '@/components/ui';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const { addNotification } = useNotification();
  const router = useRouter();

  // State for modals and interactions
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [selectedAction, setSelectedAction] = useState<QuickActionData | null>(null);

  // tRPC queries for dashboard data
  const { 
    data: teamsData, 
    isLoading: teamsLoading, 
    error: teamsError 
  } = api.volunteers.venue.getVenueTeams.useQuery(
    { venueId },
    { enabled: !authLoading && !!user && ['general_volunteer', 'technical_volunteer'].includes(userProfile?.role || '') }
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
  const teams = teamsData?.teams || [];
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
    const pendingCount = teams.filter(team => team.status === 'submitted' || team.status === 'pending' || !team.status).length;
    const activeFixtures = fixtures.filter(f => f.status === 'in_progress').length;
    const completedFixtures = fixtures.filter(f => f.status === 'completed').length;

    return {
      totalTeams,
      checkedInCount,
      verifiedCount,
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

  // Venue fallback data
  const venue = {
    id: venueId,
    name: `Venue ${venueId}`,
    location: 'Match Day Verification Center'
  };

  if (authLoading || loading) {
    return <PageLoader />;
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold font-fira mb-2 text-[#4A2F1D]">
          {venue?.name || 'Volunteer Dashboard'}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 font-fira">
          {venue?.location || 'Technical Volunteer Station'} - Match Day Management
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SingleStatCard
          stat={{
            label: "Total Teams",
            value: stats.totalTeams,
            icon: Users,
            onClick: () => router.push(`/${lang}/volunteer/venues/${venueId}/teams`)
          }}
          showShadow={true}
        />
        
        <SingleStatCard
          stat={{
            label: "Checked In",
            value: stats.checkedInCount,
            icon: CheckCircle,
            color: "success",
            onClick: () => router.push(`/${lang}/volunteer/venues/${venueId}/teams?teamStatus=checked_in`)
          }}
          showShadow={true}
        />
        
        <SingleStatCard
          stat={{
            label: "Confirmed",
            value: stats.verifiedCount,
            icon: UserCheck,
            color: "info",
            onClick: () => router.push(`/${lang}/volunteer/venues/${venueId}/teams?teamStatus=verified`)
          }}
          showShadow={true}
        />
        
        <SingleStatCard
          stat={{
            label: "Unconfirmed",
            value: stats.pendingCount,
            icon: AlertCircle,
            color: "warning",
            onClick: () => router.push(`/${lang}/volunteer/venues/${venueId}/teams?teamStatus=submitted`)
          }}
          showShadow={true}
        />
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
        headerActions={
          <button
            onClick={() => router.push(`/${lang}/volunteer/profile`)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <User className="w-4 h-4 mr-2" />
            My Profile
          </button>
        }
        emptyState={{
          icon: AlertCircle,
          title: 'No actions available',
          description: 'Check your volunteer assignment status.'
        }}
        pagination={{ enabled: false }}
        persistState={false}
      />

      <div className="mt-8">
        <PostCreator />
      </div>

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

      {/* Profile Modal */}
      <EnhancedModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Volunteer Profile"
        subtitle="Your assignment and profile information"
        size="lg"
        mobileFullScreen={true}
        scrollableBody={true}
        footer={
          <div className="flex justify-end">
            <button
              onClick={() => setShowProfileModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Volunteer Information</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm"><span className="font-medium">Name:</span> {userProfile?.name || 'N/A'}</p>
              <p className="text-sm"><span className="font-medium">Role:</span> {userProfile?.role || 'N/A'}</p>
              <p className="text-sm"><span className="font-medium">Venue ID:</span> {venueId}</p>
            </div>
          </div>
        </div>
      </EnhancedModal>

      {/* Floating Action Button for Mobile */}
      <div className="md:hidden fixed bottom-4 right-4">
        <button 
          onClick={() => setShowPostCreator(true)} 
          className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      <EnhancedModal
        isOpen={showPostCreator}
        onClose={() => setShowPostCreator(false)}
        title="Create a New Post"
        size="2xl"
      >
        <PostCreator compact onPostCreated={() => setShowPostCreator(false)} />
      </EnhancedModal>

    </div>
  );
}