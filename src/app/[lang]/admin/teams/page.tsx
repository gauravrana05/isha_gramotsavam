"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAdminTeams, getAdminTeamStats } from '@/lib/actions/admin/optimizedTeamQueries';
import { 
  Users,
  Trophy,
  MapPin,
  Calendar,
  Clock,
  Eye,
  Search,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  Download,
  Loader2
} from 'lucide-react';
import { 
  AdvancedTable,
  StatsCard,
  StatusBadge,
  type Column,
  type ActionButton,
  type FilterField,
  type ExportConfig
} from '@/components/ui';

interface TeamData {
  id: string;
  name: string;
  sportName: string;
  sportId: string;
  captainProfile: {
    name: string;
    phone: string;
  };
  panchayat: string;
  district: string;
  state: string;
  genderCategory: string;
  currentPlayers: number;
  maxPlayers: number;
  status: string;
  createdAt: any;
  eventId: string;
  clusterVenue?: string;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 25;

  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

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

    loadTeams();
    loadStats();
  }, [user, userProfile, authLoading, lang, router, statusFilter, sportFilter, districtFilter, genderFilter, currentPage]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      const result = await getAdminTeams({
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        status: statusFilter as
          | "all"
          | "verified"
          | "rejected"
          | "draft"
          | "submitted"
          | "active",
        verificationStatus: "all", // or set based on a filter if you have one
        currentTournamentLevel: "all", // or set based on a filter if you have one
        sportName: sportFilter !== 'all' ? sportFilter : undefined,
        district: districtFilter !== 'all' ? districtFilter : undefined,
        genderCategory: genderFilter === 'M'
          ? 'men'
          : genderFilter === 'F'
          ? 'women'
          : 'all',
        searchQuery: searchTerm || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }, user.uid);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Fix: Map LightweightTeam[] to TeamData[] by filling missing fields with defaults/nulls
      setTeams(
        (result.teams ?? []).map((team: any) => ({
          ...team,
          sportId: team.sportId ?? null,
          state: team.state ?? null,
          createdAt: team.createdAt ?? null,
          eventId: team.eventId ?? null,
        }))
      );
      setHasMore(result.pagination?.hasMore ?? false);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load teams. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      if (!user?.uid) return;

      const result = await getAdminTeamStats({
        district: districtFilter !== 'all' ? districtFilter : undefined,
        sportName: sportFilter !== 'all' ? sportFilter : undefined,
        genderCategory:
          genderFilter === 'M'
            ? 'men'
            : genderFilter === 'F'
            ? 'women'
            : 'all',
        currentTournamentLevel: "all", // or set based on a filter if you have one
      }, user.uid);

      if (result.success) {
        setStats(result.stats);
      }
    } catch (err: any) {
      console.error('Error loading team stats:', err);
    }
  };

  // Remove client-side filtering since it's now handled by the server
  const filteredTeams = teams;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'success';
      case 'submitted': return 'info';
      case 'pending': return 'warning';
      case 'draft': return 'inactive';
      case 'rejected': return 'error';
      default: return 'inactive';
    }
  };

  // Define table columns for AdvancedTable (removed created column)
  const columns: Column<TeamData>[] = [
    {
      key: 'name',
      header: 'Team',
      accessor: 'name',
      sortable: true,
      priority: 'high',
      width: '200px',
      minWidth: '180px',
      render: (_, team) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{team.name}</div>
          <div className="text-xs text-gray-500 capitalize">{team.genderCategory}</div>
        </div>
      ),
    },
    {
      key: 'sport',
      header: 'Sport',
      accessor: 'sportName',
      sortable: true,
      priority: 'high',
      width: '120px',
    },
    {
      key: 'captain',
      header: 'Captain',
      accessor: (team) => team.captainProfile?.name || '',
      sortable: true,
      priority: 'medium',
      width: '180px',
      render: (_, team) => (
        <div>
          <div className="text-sm text-gray-900">{team.captainProfile.name}</div>
          <div className="text-xs text-gray-500">{team.captainProfile.phone}</div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      accessor: 'panchayat',
      sortable: true,
      priority: 'medium',
      width: '180px',
      render: (_, team) => (
        <div>
          <div className="text-sm text-gray-900">{team.panchayat}</div>
          <div className="text-xs text-gray-500">{team.district}</div>
        </div>
      ),
    },
    {
      key: 'venue',
      header: 'Venue',
      accessor: 'clusterVenue',
      priority: 'low',
      width: '140px',
      render: (_, team) => (
        <div className="text-sm text-gray-500">
          {team.clusterVenue || <span className="text-gray-400 italic">Not assigned</span>}
        </div>
      ),
    },
    {
      key: 'players',
      header: 'Players',
      accessor: 'currentPlayers',
      sortable: true,
      priority: 'medium',
      width: '100px',
      render: (_, team) => (
        <div className="text-sm text-gray-900">
          {team.currentPlayers}/{team.maxPlayers}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      priority: 'high',
      width: '120px',
      render: (_, team) => (
        <StatusBadge 
          status={getStatusColor(team.status)}
          customLabel={team.status.replace('_', ' ')}
          variant="soft"
        />
      ),
    },
  ];

  // Define action buttons for AdvancedTable
  const actions: ActionButton<TeamData>[] = [
    {
      label: 'View',
      icon: Eye,
      onClick: (team) => router.push(`/${lang}/admin/teams/${team.id}`),
      variant: 'primary',
    },
  ];

  // Define filters specific to teams (existing filters from the page)
  const teamFilters: FilterField[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Submitted', value: 'submitted' },
        { label: 'Pending', value: 'pending' },
        { label: 'Verified', value: 'verified' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
    {
      key: 'sportName',
      label: 'Sport',
      type: 'select',
      options: [
        { label: 'Volleyball', value: 'Volleyball' },
        { label: 'Throwball', value: 'Throwball' },
      ],
    },
    {
      key: 'district',
      label: 'District',
      type: 'select',
      options: stats?.byDistrict ? Object.keys(stats.byDistrict).sort().map(district => ({
        label: `${district} (${stats.byDistrict[district]})`,
        value: district
      })) : [],
    },
    {
      key: 'genderCategory',
      label: 'Gender Category',
      type: 'select',
      options: [
        { label: 'Men', value: 'M' },
        { label: 'Women', value: 'F' },
      ],
    },
  ];

  // Define export options specific to teams
  const exportOptions: ExportConfig[] = [
    {
      label: 'Export CSV',
      format: 'csv',
      onExport: () => {
        const csvContent = [
          ['Team Name', 'Sport', 'Gender Category', 'Captain', 'Captain Phone', 'Location', 'Venue', 'Players', 'Status'].join(','),
          ...filteredTeams.map(team => [
            team.name,
            team.sportName,
            team.genderCategory,
            team.captainProfile.name,
            team.captainProfile.phone,
            `${team.panchayat}, ${team.district}`,
            team.clusterVenue || 'Not assigned',
            `${team.currentPlayers}/${team.maxPlayers}`,
            team.status
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `teams_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
    },
  ];

  // Define stats for StatsCard
  const statsData = stats ? [
    {
      label: 'Total',
      value: stats.total || teams.length,
      color: 'info' as const,
    },
    {
      label: 'Verified',
      value: stats.byStatus?.verified || teams.filter(t => t.status === 'verified').length,
      color: 'success' as const,
    },
    {
      label: 'Submitted',
      value: stats.byStatus?.submitted || teams.filter(t => t.status === 'submitted').length,
      color: 'info' as const,
    },
    {
      label: 'Pending',
      value: stats.byStatus?.pending || teams.filter(t => t.status === 'pending').length,
      color: 'warning' as const,
    },
    {
      label: 'Players',
      value: stats.playerStats?.totalPlayers || teams.reduce((total, team) => total + team.currentPlayers, 0),
      color: 'secondary' as const,
    },
  ] : [];

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
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-fira">Teams Management</h1>
          <p className="text-gray-600 text-sm font-roboto">View and manage team registrations</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600 font-roboto">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      {statsData.length > 0 && (
        <div className="mb-8">
          <StatsCard 
            stats={statsData}
            columns={5}
            size="base"
            showBorder
          />
        </div>
      )}

      {/* Advanced Table with all features */}
      <AdvancedTable
        data={filteredTeams}
        columns={columns}
        actions={actions}
        loading={loading}
        
        // Search functionality
        searchable={true}
        searchPlaceholder="Search teams, captains, or locations..."
        
        // Filter functionality
        filterable={true}
        filters={teamFilters}
        
        // Sort functionality
        sortable={true}
        multiSort={true}
        defaultSort={[{ key: 'name', direction: 'asc' }]}
        
        // Pagination - Note: Since this uses server-side data loading,
        // we'll need to handle this differently or disable for now
        pagination={{
          enabled: false // Disable until we implement server-side pagination
        }}
        
        // Export options
        exportOptions={exportOptions}
        
        // Selection (for future bulk actions)
        selectable={false}
        
        // Empty state
        emptyState={{
          icon: Users,
          title: 'No teams found',
          description: searchTerm || teamFilters.some(f => f.key) 
            ? 'Try adjusting your search or filters' 
            : 'Teams will appear here as they register',
        }}
        
        keyExtractor={(team) => team.id}
        stickyHeader={true}
      />

      {/* Load More Button (for existing pagination) */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={loading}
            className="px-6 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors disabled:opacity-50 flex items-center mx-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              'Load More Teams'
            )}
          </button>
        </div>
      )}
    </div>
  );
}