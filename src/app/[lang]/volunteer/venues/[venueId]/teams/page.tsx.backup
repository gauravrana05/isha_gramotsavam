'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { TableControls } from '@/components/ui/TableControls';
import FilterSidebar, { type ActiveFilter, type FilterField } from '@/components/ui/FilterSidebar';
import { VerificationStatusSelector } from '@/components/ui/StatusSelector';
import CreateTeamModal from '@/components/volunteer/CreateTeamModal';
import PlayerDocumentUpload from '@/components/players/PlayerDocumentUpload';
import { api } from '@/server/trpc/react';
import { useNotification } from '@/context/NotificationContext';
import { 
  Loader2, 
  Users, 
  CheckCircle, 
  Clock, 
  Eye, 
  Camera,
  MapPin,
  UserCheck,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Shield,
  User,
  X,
  Phone,
  Calendar,
  XCircle,
  Filter
} from 'lucide-react';

interface PageProps {
  params: Promise<{
    venueId: string;
    lang: string;
  }>;
}

interface TeamData {
  id: string;
  name: string;
  status: string;
  captainProfile?: {
    name: string;
    phone: string;
  };
  currentPlayers: number;
  verifiedPlayersCount: number;
  panchayat?: string;
  district?: string;
  sportName?: string;
}

interface PlayerData {
  id: string;
  name: string;
  phone: string;
  age: number;
  gender: string;
  position: string;
  verificationStatus: string;
  documents?: {
    profilePhoto?: { url: string };
    aadhaarFront?: { url: string };
    aadhaarBack?: { url: string };
  };
  userId?: string;
}

export default function TeamsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { venueId, lang } = resolvedParams;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();
  
  // State management
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [teamPlayers, setTeamPlayers] = useState<Record<string, PlayerData[]>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [teamMatchTypes, setTeamMatchTypes] = useState<Record<string, 'team' | 'player'>>({});
  const [previewImage, setPreviewImage] = useState<{url: string; label: string} | null>(null);
  const [createTeamModal, setCreateTeamModal] = useState(false);
  
  // Data fetching with tRPC
  const { 
    data: teamsData, 
    isLoading: teamsLoading, 
    error: teamsError,
    refetch: refetchTeams
  } = api.volunteers.venue.getVenueTeams.useQuery(
    { venueId },
    { enabled: !!user && !!venueId }
  );

  const teams = teamsData || [];

  // Filter configuration
  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'teamStatus',
      label: 'Team Status',
      type: 'select',
      category: 'Team',
      options: [
        { label: 'Submitted', value: 'submitted' },
        { label: 'Verified', value: 'verified' },
        { label: 'Checked-In', value: 'checked_in' },
        { label: 'Rejected', value: 'rejected' }
      ]
    },
    {
      key: 'playerStatus',
      label: 'Player Status',
      type: 'select',
      category: 'Player',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Verified', value: 'verified' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' }
      ]
    }
  ], []);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'bg-green-100 text-green-800';
      case 'verified':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
      case 'submitted':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checked_in':
        return <CheckCircle className="w-4 h-4" />;
      case 'verified':
        return <UserCheck className="w-4 h-4" />;
      case 'pending':
      case 'submitted':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Load team players (mock implementation - replace with actual tRPC call)
  const loadTeamPlayers = useCallback(async (teamId: string, force = false) => {
    if (teamPlayers[teamId] && !force) return;
    
    try {
      // TODO: Replace with actual tRPC call to get team players
      // const playersData = await api.volunteers.team.getTeamPlayers.query({ teamId });
      
      // Mock data for now - replace with actual implementation
      const mockPlayers: PlayerData[] = [
        {
          id: `player-${teamId}-1`,
          name: 'Player 1',
          phone: '9876543210',
          age: 25,
          gender: 'M',
          position: 'forward',
          verificationStatus: 'pending',
          documents: {
            profilePhoto: { url: '/placeholder-avatar.jpg' }
          }
        }
      ];
      
      setTeamPlayers(prev => ({
        ...prev,
        [teamId]: mockPlayers
      }));
    } catch (error) {
      console.error('Failed to load players for team:', teamId, error);
    }
  }, [teamPlayers]);

  const toggleTeamExpanded = useCallback(async (teamId: string) => {
    const newExpanded = new Set(expandedTeams);
    
    if (expandedTeams.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
      await loadTeamPlayers(teamId);
    }
    
    setExpandedTeams(newExpanded);
  }, [expandedTeams, loadTeamPlayers]);

  const findPlayerTeam = useCallback((playerId: string) => {
    for (const team of teams) {
      if (teamPlayers[team.id]) {
        const foundPlayer = teamPlayers[team.id].find((p: PlayerData) => p.id === playerId);
        if (foundPlayer) return team.id;
      }
    }
    return undefined;
  }, [teams, teamPlayers]);
  sport: {
    name: string;
  } | null;
  venueLevel: string;
  playerCount: number;
  genderCategory: string;
  district: string;
  state: string;
}

export default function VolunteerTeamsPage({ params }: PageProps) {
  const { venueId, lang } = use(params);
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  // tRPC query for teams data
  const { 
    data: teamsData, 
    isLoading: teamsLoading, 
    error: teamsError 
  } = api.volunteers.venue.getVenueTeams.useQuery(
    { venueId, includePlayerCount: true },
    { enabled: !authLoading && !!user && ['general_volunteer', 'technical_volunteer'].includes(userProfile?.role || '') }
  );

  const teams = teamsData || [];
  const loading = authLoading || teamsLoading;

  // Table columns
  const columns = useMemo<Column<TeamData>[]>(() => [
    {
      key: 'name',
      header: 'Team',
      sortable: true,
      render: (_, team) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {team.name}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {team.sport?.name} • {team.genderCategory}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'captain',
      header: 'Captain',
      sortable: false,
      render: (_, team) => (
        <div>
          <p className="text-sm font-medium text-gray-900">
            {team.captainUser ? 
              `${team.captainUser.firstName} ${team.captainUser.lastName}` : 
              'N/A'
            }
          </p>
          {team.captainUser?.phone && (
            <p className="text-sm text-gray-500 flex items-center">
              <Phone className="w-3 h-3 mr-1" />
              {team.captainUser.phone}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      sortable: true,
      render: (_, team) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{team.district}</p>
          <p className="text-sm text-gray-500">{team.state}</p>
        </div>
      ),
    },
    {
      key: 'players',
      header: 'Players',
      sortable: true,
      render: (_, team) => (
        <div className="text-center">
          <span className="text-lg font-semibold text-gray-900">
            {team.playerCount}
          </span>
        </div>
      ),
    },
    {
      key: 'level',
      header: 'Level',
      sortable: true,
      render: (_, team) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
          team.venueLevel === 'final' ? 'bg-purple-100 text-purple-800' :
          team.venueLevel === 'division' ? 'bg-blue-100 text-blue-800' :
          'bg-green-100 text-green-800'
        }`}>
          <Trophy className="w-3 h-3 mr-1" />
          {team.venueLevel}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (_, team) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          team.status === 'verified' ? 'bg-green-100 text-green-800' :
          team.status === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {team.status === 'verified' && <CheckCircle className="w-3 h-3 mr-1" />}
          {team.status === 'rejected' && <AlertCircle className="w-3 h-3 mr-1" />}
          {!['verified', 'rejected'].includes(team.status) && <Clock className="w-3 h-3 mr-1" />}
          {team.status === 'verified' ? 'Verified' :
           team.status === 'rejected' ? 'Rejected' :
           team.status === 'submitted' ? 'Submitted' :
           team.status === 'draft' ? 'Draft' : 
           'Pending'}
        </span>
      ),
    }
  ], []);

  // Filter functions
  const filterFields = useMemo(() => [
    {
      key: 'status' as keyof TeamData,
      label: 'Status',
      type: 'select' as const,
      options: [
        { label: 'All Statuses', value: '' },
        { label: 'Verified', value: 'verified' },
        { label: 'Submitted', value: 'submitted' },
        { label: 'Draft', value: 'draft' },
        { label: 'Rejected', value: 'rejected' },
      ]
    },
    {
      key: 'venueLevel' as keyof TeamData,
      label: 'Level',
      type: 'select' as const,
      options: [
        { label: 'All Levels', value: '' },
        { label: 'Cluster', value: 'cluster' },
        { label: 'Division', value: 'division' },
        { label: 'Final', value: 'final' },
      ]
    }
  ], []);

  if (loading) {
    return <PageLoader />;
  }

  if (teamsError) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">{teamsError.message}</p>
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

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <AdvancedTable<TeamData>
        data={teams}
        columns={columns}
        loading={false}
        searchable={true}
        searchPlaceholder="Search teams, captains, or locations..."
        filterable={true}
        filterFields={filterFields}
        sortable={true}
        selectable={false}
        keyExtractor={(team) => team.id}
        emptyState={{
          icon: Users,
          title: 'No teams found',
          description: 'No teams are currently assigned to this venue.'
        }}
        pagination={{ 
          enabled: true,
          pageSize: 20
        }}
        headerActions={
          <button
            onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/dashboard`)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Back to Dashboard
          </button>
        }
      />
    </div>
  );
}