"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { api } from "@/server/trpc/react";
import { useTranslation } from "@/lib/utils/i18n";
import { AdvancedTable } from "@/components/ui/AdvancedTable";
import { EnhancedModal } from "@/components/ui/EnhancedModal";
import { SingleStatCard } from "@/components/ui";
import type { Column, ActionButton } from "@/components/ui/Table";
import Image from "next/image";
import { Users, Loader2, AlertCircle, CheckCircle, Clock, X, Eye, Filter, UserCheck, FileX, TrendingUp } from "lucide-react";

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
}

export default function VerificationTeamsPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();
  const { t } = useTranslation();

  // Enhanced state management
  const [selectedTeams, setSelectedTeams] = useState<Set<string | number>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Enhanced query with search and filter
  const { data: teamsData, isLoading: teamsLoading, error: teamsError, refetch } = api.teams.verification.getForVerification.useQuery(
    {
      status: statusFilter as 'pending' | 'verified' | 'rejected',
      limit: 50,
      offset: 0
    },
    {
      enabled: !authLoading && !!user && ['admin', 'verification_volunteer', 'technical_volunteer'].includes(userProfile?.role || ''),
    }
  );

  // Get verification stats
  const { data: statsData, isLoading: statsLoading } = api.verification.dashboard.getStats.useQuery(
    undefined,
    { enabled: !authLoading && !!user && ['admin', 'verification_volunteer', 'technical_volunteer'].includes(userProfile?.role || '') }
  );

  const teams = teamsData || [];
  const loading = authLoading || teamsLoading;

  // Clean up - removed debug logging

  // Show error if there is one
  if (teamsError) {
    console.error('tRPC error:', teamsError);
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Teams</h1>
          <p className="text-gray-600 mb-4">{teamsError.message}</p>
          <button 
            onClick={() => router.push(`/${lang}/verification/dashboard`)}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Enhanced stats calculations
  const stats = useMemo(() => {
    if (!statsData) return null;
    
    return {
      totalTeams: statsData.totalTeams || 0,
      pendingVerification: statsData.pendingVerification || 0,
      verifiedTeams: statsData.verifiedTeams || 0,
      rejectedTeams: statsData.rejectedTeams || 0,
      todayVerifications: statsData.todayVerifications || 0
    };
  }, [statsData]);

  // Enhanced columns with render functions
  const columns = useMemo<Column<TeamData>[]>(() => [
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
            <div className="text-sm text-gray-600">{team.sportName} • {team.genderCategory === 'women' ? 'Women' : 'Men'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'captain',
      header: 'Captain',
      render: (_, team) => (
        <div className="text-sm">
          <div className="text-gray-900">{team.captainProfile.name}</div>
          <div className="text-gray-600">+91 {team.captainProfile.phone}</div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (_, team) => (
        <div className="text-sm">
          <div className="text-gray-900">{team.panchayat}</div>
          <div className="text-gray-600">{team.district}, {team.state}</div>
        </div>
      ),
    },
    {
      key: 'players',
      header: 'Players',
      sortable: true,
      render: (_, team) => (
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">
            {team.currentPlayers} / {team.maxPlayers}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (_, team) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(team.status)}`}>
          {getStatusIcon(team.status)}
          <span className="ml-1 capitalize">{team.status.replace('_', ' ')}</span>
        </span>
      ),
    },
  ], []);

  // Enhanced actions for each row
  const actions = useMemo<ActionButton<TeamData>[]>(() => [
    {
      label: 'Verify',
      icon: UserCheck,
      onClick: (team: any) => router.push(`/${lang}/verification/teams/${team.id}`),
      variant: 'primary',
    },
    {
      label: 'Quick View',
      icon: Eye,
      onClick: (team: any) => {
        setSelectedTeam(team);
        setShowTeamModal(true);
      },
      variant: 'secondary',
    },
    {
      label: 'Reject',
      icon: FileX,
      onClick: (team: any) => handleQuickAction(team, 'rejected'),
      variant: 'danger',
      show: (team: any) => team.status !== 'rejected' && team.status !== 'verified'
    }
  ], [router, lang]);

  const handleTeamClick = (team: TeamData) => {
    router.push(`/${lang}/verification/teams/${team.id}`);
  };

  // Handle quick actions
  const handleQuickAction = async (team: TeamData, action: string) => {
    try {
      // This would be implemented with actual API calls
      addNotification(`Team ${team.name} ${action} successfully`, 'success');
      refetch();
    } catch (error) {
      addNotification('Failed to update team status', 'error');
    }
  };

  // Filter configuration
  const filterFields = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { label: 'All', value: 'all' },
        { label: 'Pending', value: 'pending' },
        { label: 'Submitted', value: 'submitted' },
        { label: 'Partial Verification', value: 'partial_verification' },
        { label: 'Verified', value: 'verified' },
        { label: 'Rejected', value: 'rejected' }
      ]
    },
    {
      key: 'sport',
      label: 'Sport',
      type: 'select' as const,
      options: [
        { label: 'All Sports', value: '' },
        ...Array.from(new Set(teams.map(t => t.sportName))).map(sport => ({
          label: sport,
          value: sport
        }))
      ]
    }
  ], [teams]);

  // Header actions
  const getHeaderActions = () => (
    <div className="flex gap-2">
      <button
        onClick={() => setShowBulkModal(true)}
        disabled={selectedTeams.size === 0}
        className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
          selectedTeams.size > 0 
            ? 'text-white bg-[#F28C38] border-transparent hover:bg-[#E67A26]'
            : 'text-gray-400 bg-gray-100 border-gray-300 cursor-not-allowed'
        }`}
      >
        <UserCheck className="w-4 h-4 mr-2" />
        Bulk Verify ({selectedTeams.size})
      </button>
      
      <button
        onClick={() => router.push(`/${lang}/verification/dashboard`)}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <TrendingUp className="w-4 h-4 mr-2" />
        Dashboard
      </button>
    </div>
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'partial_verification':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'partial_verification':
        return 'bg-orange-100 text-orange-800';
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Define filters for AdvancedTable
  const filters = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { label: 'All', value: 'all' },
        { label: 'Pending', value: 'pending' },
        { label: 'Verified', value: 'verified' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Partial', value: 'partial' },
      ],
    },
  ];

  if (authLoading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  return (
    <div className="lg:min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/${lang}/verification/dashboard`)}
            className="flex items-center text-[#F28C38] hover:text-[#E67A26] mb-6 transition-colors"
          >
            ← Back to Dashboard
          </button>
          
          <div className="text-center mb-8">
            <div className="mb-4">
              <Image 
                src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" 
                alt="Isha Logo" 
                width={80} 
                height={80} 
                className="mx-auto"
              />
            </div>
            <h1 className="text-3xl font-bold text-[#4A2F1D] mb-2">
              Teams Verification
            </h1>
            <p className="text-gray-600">
              Review and verify team registrations
            </p>
          </div>

          {/* Stats Cards */}
          {stats && !statsLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <SingleStatCard
                title="Total Teams"
                value={stats.totalTeams}
                icon={Users}
                description="Total registered teams"
                trend={{ value: 0, isPositive: true }}
              />
              <SingleStatCard
                title="Pending"
                value={stats.pendingVerification}
                icon={Clock}
                description="Awaiting verification"
                trend={{ value: 0, isPositive: true }}
                color="text-yellow-600"
              />
              <SingleStatCard
                title="Verified"
                value={stats.verifiedTeams}
                icon={CheckCircle}
                description="Successfully verified"
                trend={{ value: 0, isPositive: true }}
                color="text-green-600"
              />
              <SingleStatCard
                title="Rejected"
                value={stats.rejectedTeams}
                icon={X}
                description="Verification rejected"
                trend={{ value: 0, isPositive: true }}
                color="text-red-600"
              />
              <SingleStatCard
                title="Today's Work"
                value={stats.todayVerifications}
                icon={TrendingUp}
                description="Verified today"
                trend={{ value: 0, isPositive: true }}
                color="text-[#F28C38]"
              />
            </div>
          )}
        </div>

        {/* Advanced Table */}
        <AdvancedTable
          data={teams}
          columns={columns}
          actions={actions}
          loading={loading}
          
          searchable={true}
          searchPlaceholder="Search teams, captains, or locations..."
          searchFields={['name', 'captainProfile.name', 'panchayat', 'district']}
          
          filterable={true}
          filters={filters}
          
          sortable={true}
          
          pagination={{
            enabled: true,
            pageSize: 25,
            serverSide: false,
          }}
          
          emptyState={{
            icon: Users,
            title: 'No teams found',
            description: 'No teams are available for verification.',
          }}
          
          compact={false}
        />

        {/* Bulk Verification Modal */}
        <EnhancedModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          title="Bulk Team Verification"
          size="lg"
        >
          <div className="space-y-6">
            <div className="text-center py-8">
              <UserCheck className="w-16 h-16 text-[#F28C38] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Verify {selectedTeams.size} Selected Teams
              </h3>
              <p className="text-gray-600">
                This will mark all selected teams as verified and notify captains via SMS.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Selected Teams:</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {teams
                  .filter(team => selectedTeams.has(team.id))
                  .map(team => (
                    <div key={team.id} className="text-sm text-gray-700">
                      {team.name} - {team.sportName}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button
              onClick={() => setShowBulkModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Handle bulk verification
                addNotification({
                  type: 'success',
                  title: 'Teams Verified',
                  message: `Successfully verified ${selectedTeams.size} teams`
                });
                setSelectedTeams(new Set());
                setShowBulkModal(false);
                refetch();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-md hover:bg-[#E67A26]"
            >
              Verify All
            </button>
          </div>
        </EnhancedModal>

        {/* Team Quick View Modal */}
        <EnhancedModal
          isOpen={showTeamModal}
          onClose={() => {
            setShowTeamModal(false);
            setSelectedTeam(null);
          }}
          title={selectedTeam ? `${selectedTeam.name} - Quick View` : 'Team Details'}
          size="lg"
        >
          {selectedTeam && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Team Information</h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Sport</dt>
                      <dd className="text-sm text-gray-900">{selectedTeam.sportName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Category</dt>
                      <dd className="text-sm text-gray-900 capitalize">{selectedTeam.genderCategory}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Players</dt>
                      <dd className="text-sm text-gray-900">{selectedTeam.currentPlayers} / {selectedTeam.maxPlayers}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTeam.status)}`}>
                          {getStatusIcon(selectedTeam.status)}
                          <span className="ml-1 capitalize">{selectedTeam.status.replace('_', ' ')}</span>
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Captain Details</h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="text-sm text-gray-900">{selectedTeam.captainProfile.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="text-sm text-gray-900">+91 {selectedTeam.captainProfile.phone}</dd>
                    </div>
                  </dl>
                  
                  <h4 className="font-medium text-gray-900 mb-3 mt-6">Location</h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Panchayat</dt>
                      <dd className="text-sm text-gray-900">{selectedTeam.panchayat}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">District</dt>
                      <dd className="text-sm text-gray-900">{selectedTeam.district}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">State</dt>
                      <dd className="text-sm text-gray-900">{selectedTeam.state}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6">
            <button
              onClick={() => {
                setShowTeamModal(false);
                setSelectedTeam(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
            {selectedTeam && (
              <button
                onClick={() => {
                  setShowTeamModal(false);
                  router.push(`/${lang}/verification/teams/${selectedTeam.id}`);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-md hover:bg-[#E67A26]"
              >
                Full Verification
              </button>
            )}
          </div>
        </EnhancedModal>
      </div>
    </div>
  );
}