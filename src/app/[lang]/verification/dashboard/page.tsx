"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { api } from "@/server/trpc/react";
import { AdvancedTable } from "@/components/ui/AdvancedTable";
import { EnhancedModal } from "@/components/ui/EnhancedModal";
import { SingleStatCard } from "@/components/ui";
import type { Column, ActionButton } from "@/components/ui/Table";
import { Users, Loader2, AlertCircle, Search, Filter, CheckCircle, Clock, X, Eye, FileCheck, UserCheck, Shield, TrendingUp } from "lucide-react";

interface TeamData {
  id: string;
  name: string;
  sportName: string;
  captainProfile: {
    name: string;
    phone: string;
  };
  panchayat: string;
  district: string;
  state: string;
  currentPlayers: number;
  maxPlayers: number;
  status: string;
  submittedAt: any;
  genderCategory: string;
  verificationStatus?: string;
  pendingPlayersCount?: number;
  verifiedPlayersCount?: number;
}

interface QuickActionData {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: any;
  color: string;
  count?: number;
  priority?: 'high' | 'medium' | 'low';
}

export default function VerificationDashboardPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();

  // State management
  const [selectedTeams, setSelectedTeams] = useState<Set<string | number>>(new Set());
  const [showQuickVerifyModal, setShowQuickVerifyModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);

  // Enhanced tRPC queries for dashboard
  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = api.verification.dashboard.getStats.useQuery(
    undefined,
    { enabled: !authLoading && !!user && ['admin', 'verification_volunteer', 'technical_volunteer'].includes(userProfile?.role || '') }
  );

  const { data: recentActivity, isLoading: recentActivityLoading, error: recentActivityError } = api.verification.dashboard.getRecentActivity.useQuery(
    undefined,
    { enabled: !authLoading && !!user && ['admin', 'verification_volunteer', 'technical_volunteer'].includes(userProfile?.role || '') }
  );

  const { data: quickActions, isLoading: quickActionsLoading } = api.verification.dashboard.getQuickActions.useQuery(
    undefined,
    { enabled: !authLoading && !!user && ['admin', 'verification_volunteer', 'technical_volunteer'].includes(userProfile?.role || '') }
  );

  const loading = authLoading || statsLoading || recentActivityLoading;
  const error = statsError || recentActivityError;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'partial_verification':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <X className="w-4 h-4" />;
      case 'partial_verification':
        return <Clock className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Stats calculations
  const stats = useMemo(() => {
    if (!dashboardStats) return null;
    
    return {
      totalTeams: dashboardStats.totalTeams || 0,
      pendingVerification: dashboardStats.pendingVerification || 0,
      verifiedTeams: dashboardStats.verifiedTeams || 0,
      rejectedTeams: dashboardStats.rejectedTeams || 0,
      totalPlayers: dashboardStats.totalPlayers || 0,
      pendingPlayers: dashboardStats.pendingPlayers || 0,
      verifiedPlayers: dashboardStats.verifiedPlayers || 0,
      todayVerifications: dashboardStats.todayVerifications || 0
    };
  }, [dashboardStats]);

  // Quick actions data
  const quickActionsData = useMemo<QuickActionData[]>(() => [
    {
      id: 'teams',
      title: 'Team Verification',
      description: 'Review and verify team registrations',
      href: `/${lang}/verification/teams`,
      icon: Users,
      color: 'from-blue-50 to-blue-100 border-blue-200',
      count: stats?.pendingVerification || 0,
      priority: 'high'
    },
    {
      id: 'players',
      title: 'Player Documents',
      description: 'Verify player documents and eligibility',
      href: `/${lang}/verification/players`,
      icon: FileCheck,
      color: 'from-green-50 to-green-100 border-green-200',
      count: stats?.pendingPlayers || 0,
      priority: 'high'
    },
    {
      id: 'reports',
      title: 'Verification Reports',
      description: 'View verification statistics and reports',
      href: `/${lang}/verification/reports`,
      icon: TrendingUp,
      color: 'from-purple-50 to-purple-100 border-purple-200',
      count: 0,
      priority: 'medium'
    },
    {
      id: 'settings',
      title: 'Verification Settings',
      description: 'Configure verification parameters',
      href: `/${lang}/verification/settings`,
      icon: Shield,
      color: 'from-orange-50 to-orange-100 border-orange-200',
      count: 0,
      priority: 'low'
    }
  ], [lang, stats]);

  // Recent teams table columns
  const recentActivityColumns = useMemo<Column<TeamData>[]>(() => [
    {
      key: 'name',
      header: 'Team',
      sortable: true,
      render: (_, team) => (
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200`}>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{team.name}</div>
            <div className="text-sm text-gray-600">{team.sportName} • {team.genderCategory}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'captain',
      header: 'Captain',
      render: (_, team) => (
        <div className="text-sm">
          <div className="text-gray-900">
            {team.captainProfile?.firstName} {team.captainProfile?.lastName}
          </div>
          <div className="text-gray-600">+91 {team.captainProfile?.phone}</div>
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (_, team) => (
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">
            {team.verifiedPlayersCount || 0}/{team.currentPlayers || 0}
          </div>
          <div className="text-xs text-gray-500">verified</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (_, team) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(team.verificationStatus || team.status)}`}>
          {getStatusIcon(team.verificationStatus || team.status)}
          <span className="ml-1 capitalize">{(team.verificationStatus || team.status).replace('_', ' ')}</span>
        </span>
      ),
    },
  ], []);

  // Recent teams actions
  const recentActivityActions = useMemo<ActionButton<TeamData>[]>(() => [
    {
      label: 'Verify',
      icon: UserCheck,
      onClick: (team) => router.push(`/${lang}/verification/teams/${team.id}`),
      variant: 'primary',
    },
    {
      label: 'View Details',
      icon: Eye,
      onClick: (team) => {
        setSelectedTeam(team);
        setShowQuickVerifyModal(true);
      },
      variant: 'secondary',
    }
  ], [router, lang]);

  // Quick actions table columns  
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
      header: 'Pending',
      sortable: true,
      render: (_, action) => (
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{action.count || 0}</div>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (_, action) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          action.priority === 'high' ? 'bg-red-100 text-red-800' :
          action.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {action.priority?.charAt(0).toUpperCase() + action.priority?.slice(1)}
        </span>
      ),
    }
  ], []);

  // Quick actions table actions
  const quickActionActions = useMemo<ActionButton<QuickActionData>[]>(() => [
    {
      label: 'Open',
      icon: Eye,
      onClick: (action) => router.push(action.href),
      variant: 'primary',
    }
  ], [router]);

  // Handle quick action row click
  const handleQuickActionClick = (action: QuickActionData) => {
    router.push(action.href);
  };

  // Handle recent team row click
  const handleRecentTeamClick = (team: TeamData) => {
    router.push(`/${lang}/verification/teams/${team.id}`);
  };

  if (loading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading verification dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !user || !['admin', 'verification_volunteer', 'technical_volunteer'].includes(userProfile?.role || '')) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            {error?.message || "You don't have permission to access this page."}
          </p>
          <button 
            onClick={() => router.push(`/${lang}/login`)}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold font-fira mb-2 text-[#4A2F1D]">
          Verification Dashboard
        </h1>
        <p className="text-sm sm:text-base text-gray-600 font-fira">
          Team and player verification management center
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SingleStatCard
          stat={{
            label: "Total Teams",
            value: stats?.totalTeams || 0,
            icon: Users,
            onClick: () => router.push(`/${lang}/verification/teams`)
          }}
          showShadow={true}
        />
        
        <SingleStatCard
          stat={{
            label: "Pending Verification",
            value: stats?.pendingVerification || 0,
            icon: Clock,
            color: "warning",
            onClick: () => router.push(`/${lang}/verification/teams?status=pending`)
          }}
          showShadow={true}
        />
        
        <SingleStatCard
          stat={{
            label: "Verified",
            value: stats?.verifiedTeams || 0,
            icon: CheckCircle,
            color: "success",
            onClick: () => router.push(`/${lang}/verification/teams?status=verified`)
          }}
          showShadow={true}
        />
        
        <SingleStatCard
          stat={{
            label: "Today's Verifications",
            value: stats?.todayVerifications || 0,
            icon: TrendingUp,
            color: "info",
            onClick: () => router.push(`/${lang}/verification/reports?period=today`)
          }}
          showShadow={true}
        />
      </div>

      {/* Quick Actions Table */}
      <AdvancedTable<QuickActionData>
        data={quickActionsData}
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
            onClick={() => router.push(`/${lang}/verification/profile`)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <UserCheck className="w-4 h-4 mr-2" />
            My Profile
          </button>
        }
        emptyState={{
          icon: Shield,
          title: 'No actions available',
          description: 'Verification actions will appear here.'
        }}
        pagination={{ enabled: false }}
        persistState={false}
      />

      {/* Recent Teams Table */}
      {recentActivity && recentActivity.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-[#F28C38]" />
            Recent Submissions
          </h2>
          
          <AdvancedTable<TeamData>
            data={recentActivity}
            columns={recentActivityColumns}
            actions={recentActivityActions}
            loading={recentActivityLoading}
            searchable={true}
            searchPlaceholder="Search teams..."
            filterable={true}
            filters={[
              {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: [
                  { label: 'All', value: '' },
                  { label: 'Pending', value: 'pending' },
                  { label: 'Verified', value: 'verified' },
                  { label: 'Rejected', value: 'rejected' }
                ]
              }
            ]}
            sortable={true}
            selectable={true}
            selectedRows={selectedTeams}
            onSelectionChange={setSelectedTeams}
            onRowClick={handleRecentTeamClick}
            keyExtractor={(team) => team.id}
            headerActions={
              <button
                onClick={() => router.push(`/${lang}/verification/teams`)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26]"
              >
                <Eye className="w-4 h-4 mr-2" />
                View All Teams
              </button>
            }
            emptyState={{
              icon: Users,
              title: 'No recent teams',
              description: 'Recent team submissions will appear here.'
            }}
            pagination={{ enabled: true, pageSize: 5 }}
            persistState={false}
          />
        </div>
      )}

      {/* Team Detail Quick Modal */}
      <EnhancedModal
        isOpen={showQuickVerifyModal}
        onClose={() => {
          setShowQuickVerifyModal(false);
          setSelectedTeam(null);
        }}
        title="Quick Team Review"
        subtitle={selectedTeam ? `${selectedTeam.name} - ${selectedTeam.sportName}` : undefined}
        size="lg"
        mobileFullScreen={true}
        scrollableBody={true}
        footer={
          <div className="flex flex-row space-x-3 sm:justify-end">
            <button
              onClick={() => {
                if (selectedTeam) {
                  router.push(`/${lang}/verification/teams/${selectedTeam.id}`);
                }
              }}
              className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] hover:bg-[#E67A26] text-white rounded-lg font-medium py-2 text-sm transition-colors flex items-center justify-center"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Full Verification
            </button>
            <button
              onClick={() => {
                setShowQuickVerifyModal(false);
                setSelectedTeam(null);
              }}
              className="flex-1 sm:flex-initial sm:px-4 text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg font-medium py-2 text-sm transition-colors"
            >
              Close
            </button>
          </div>
        }
      >
        {selectedTeam && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Team Overview</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Captain:</span>
                  <span>{selectedTeam.captainProfile.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Phone:</span>
                  <span>+91 {selectedTeam.captainProfile.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Location:</span>
                  <span>{selectedTeam.panchayat}, {selectedTeam.district}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Players:</span>
                  <span>{selectedTeam.currentPlayers}/{selectedTeam.maxPlayers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Verified:</span>
                  <span>{selectedTeam.verifiedPlayersCount || 0}/{selectedTeam.currentPlayers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedTeam.verificationStatus || selectedTeam.status)}`}>
                    {getStatusIcon(selectedTeam.verificationStatus || selectedTeam.status)}
                    <span className="ml-1 capitalize">{(selectedTeam.verificationStatus || selectedTeam.status).replace('_', ' ')}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </EnhancedModal>
    </div>
  );
}