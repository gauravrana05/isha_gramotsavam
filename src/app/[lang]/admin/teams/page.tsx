"use client";

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
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
  PageLoader,
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
  currentVenueAssignment?: {
    venueId: string;
    venueName: string;
    assignmentLevel: string;
    assignedAt: string | null;
  };
}

export default function AdminTeamsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const router = useRouter();
  const { lang } = useParams();
  const { user, loading: authLoading } = useAuth();

  // Build filters object
  const filters = useMemo(() => ({
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    status: statusFilter as any,
    sportName: sportFilter !== 'all' ? sportFilter : undefined,
    district: districtFilter !== 'all' ? districtFilter : undefined,
    genderCategory: genderFilter as any,
    searchQuery: searchTerm || undefined,
  }), [statusFilter, sportFilter, districtFilter, genderFilter, searchTerm, currentPage, pageSize]);

  // tRPC queries
  const { 
    data: teamsData, 
    isLoading: teamsLoading, 
    error: teamsError 
  } = api.teams.getAdminTeams.useQuery(filters, {
    enabled: !!user && user.role === 'admin'
  });

  const { 
    data: statsData, 
    isLoading: statsLoading 
  } = api.teams.getAdminTeamStats.useQuery({}, {
    enabled: !!user && user.role === 'admin'
  });

  // Auth check
  if (authLoading) {
    return <PageLoader title="Loading..." />;
  }

  if (!user) {
    router.push(`/${lang}/login`);
    return null;
  }

  if (user.role !== 'admin') {
    router.push(`/${lang}/player/dashboard`);
    return null;
  }

  const teams = teamsData?.teams || [];
  const stats = statsData?.stats;
  const loading = teamsLoading || statsLoading;
  const error = teamsError?.message || '';
  const hasMore = teamsData?.pagination?.hasMore || false;

  // Table columns configuration
  const columns: Column<TeamData>[] = [
    {
      key: 'name',
      header: 'Team Name',
      sortable: true,
      render: (team) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{team.name}</span>
          <span className="text-sm text-gray-500">{team.sportName} - {team.genderCategory}</span>
        </div>
      )
    },
    {
      key: 'captainProfile',
      header: 'Captain',
      render: (team) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">{team.captainProfile?.name || 'N/A'}</span>
          <span className="text-xs text-gray-500">{team.captainProfile?.phone || 'N/A'}</span>
        </div>
      )
    },
    {
      key: 'location',
      header: 'Location',
      render: (team) => (
        <div className="flex flex-col">
          <span className="text-sm text-gray-900">{team.panchayat || 'N/A'}</span>
          <span className="text-xs text-gray-500">{team.district}, {team.state}</span>
        </div>
      )
    },
    {
      key: 'players',
      header: 'Players',
      render: (team) => (
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4 text-gray-400" />
          <span className={`text-sm ${team.currentPlayers >= team.maxPlayers ? 'text-green-600' : 'text-amber-600'}`}>
            {team.currentPlayers}/{team.maxPlayers}
          </span>
        </div>
      )
    },
    {
      key: 'venue',
      header: 'Venue Assignment',
      render: (team) => {
        const venue = team.currentVenueAssignment;
        if (!venue) {
          return <span className="text-sm text-gray-400">Not assigned</span>;
        }
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{venue.venueName}</span>
            <span className="text-xs text-gray-500 capitalize">{venue.assignmentLevel}</span>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (team) => {
        const statusConfig = {
          'draft': { color: 'gray', icon: AlertCircle },
          'submitted': { color: 'blue', icon: Clock },
          'verified': { color: 'green', icon: CheckCircle },
          'rejected': { color: 'red', icon: XCircle },
          'active': { color: 'green', icon: Trophy }
        };
        
        const config = statusConfig[team.status as keyof typeof statusConfig] || statusConfig.draft;
        const Icon = config.icon;
        
        return (
          <StatusBadge 
            status={team.status} 
            color={config.color} 
            icon={<Icon className="w-3 h-3" />}
          />
        );
      }
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (team) => (
        <span className="text-sm text-gray-500">
          {new Date(team.createdAt).toLocaleDateString()}
        </span>
      )
    }
  ];

  // Action buttons for each row
  const actionButtons: ActionButton<TeamData>[] = [
    {
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      onClick: (team) => router.push(`/${lang}/admin/teams/${team.id}`),
      variant: 'secondary'
    }
  ];

  // Filter fields configuration
  const filterFields: FilterField[] = [
    {
      key: 'search',
      type: 'search',
      placeholder: 'Search teams...',
      value: searchTerm,
      onChange: setSearchTerm
    },
    {
      key: 'status',
      type: 'select',
      label: 'Status',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'draft', label: 'Draft' },
        { value: 'submitted', label: 'Submitted' },
        { value: 'verified', label: 'Verified' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'active', label: 'Active' }
      ]
    },
    {
      key: 'sport',
      type: 'select',
      label: 'Sport',
      value: sportFilter,
      onChange: setSportFilter,
      options: [
        { value: 'all', label: 'All Sports' },
        ...(stats?.bySport ? Object.keys(stats.bySport).map(sport => ({
          value: sport,
          label: `${sport} (${stats.bySport[sport]})`
        })) : [])
      ]
    },
    {
      key: 'district',
      type: 'select',
      label: 'District',
      value: districtFilter,
      onChange: setDistrictFilter,
      options: [
        { value: 'all', label: 'All Districts' },
        ...(stats?.byDistrict ? Object.keys(stats.byDistrict).map(district => ({
          value: district,
          label: `${district} (${stats.byDistrict[district]})`
        })) : [])
      ]
    },
    {
      key: 'gender',
      type: 'select',
      label: 'Gender Category',
      value: genderFilter,
      onChange: setGenderFilter,
      options: [
        { value: 'all', label: 'All Categories' },
        { value: 'men', label: 'Men' },
        { value: 'women', label: 'Women' },
        { value: 'mixed', label: 'Mixed' }
      ]
    }
  ];

  // Export configuration
  const exportConfig: ExportConfig = {
    filename: 'teams-export',
    headers: [
      'Team Name', 'Sport', 'Captain Name', 'Captain Phone', 
      'Panchayat', 'District', 'State', 'Players', 'Status', 'Created Date'
    ],
    data: teams.map(team => [
      team.name,
      team.sportName,
      team.captainProfile?.name || 'N/A',
      team.captainProfile?.phone || 'N/A',
      team.panchayat || 'N/A',
      team.district || 'N/A',
      team.state || 'N/A',
      `${team.currentPlayers}/${team.maxPlayers}`,
      team.status,
      new Date(team.createdAt).toLocaleDateString()
    ])
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Teams"
            value={stats.total?.toString() || '0'}
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <StatsCard
            title="Verified Teams"
            value={stats.verificationStats?.fullyVerified?.toString() || '0'}
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
          />
          <StatsCard
            title="Total Players"
            value={stats.playerStats?.totalPlayers?.toString() || '0'}
            icon={<User className="w-5 h-5" />}
            color="purple"
          />
          <StatsCard
            title="Average Players/Team"
            value={stats.playerStats?.averagePlayersPerTeam?.toFixed(1) || '0'}
            icon={<Trophy className="w-5 h-5" />}
            color="orange"
          />
        </div>
      )}

      {/* Teams Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Team Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage and monitor all registered teams
          </p>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">Error: {error}</p>
          </div>
        )}

        <AdvancedTable<TeamData>
          data={teams}
          columns={columns}
          actionButtons={actionButtons}
          filterFields={filterFields}
          loading={loading}
          exportConfig={exportConfig}
          pagination={{
            currentPage,
            pageSize,
            hasMore,
            onPageChange: setCurrentPage
          }}
          emptyState={{
            title: 'No teams found',
            description: 'No teams match your current filters.',
            icon: <Users className="w-12 h-12 text-gray-400" />
          }}
        />
      </div>
    </div>
  );
}