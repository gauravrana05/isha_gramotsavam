'use client';

import { useState, useEffect } from 'react';
import { getVenueTeamsForMatchDay } from '@/lib/actions/volunteer/matchDayVerification';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
import { 
  Loader2, 
  Users, 
  CheckCircle, 
  Clock, 
  Eye, 
  Camera,
  MapPin,
  Trophy,
  UserCheck,
  AlertCircle
} from 'lucide-react';

export default function MatchDayTeamsPage() {
  const params = useParams();
  const { venueId } = params as { venueId: string; lang: string };
  const { user, loading: authLoading } = useAuth();
  
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setError('Please log in to access this page');
      setLoading(false);
      return;
    }

    loadTeams();
  }, [user, authLoading, venueId]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const teamsResult = await getVenueTeamsForMatchDay(venueId, user!.uid);
      
      if (teamsResult.success) {
        setTeams(teamsResult.teams ?? []);
      } else {
        setError(teamsResult.error || 'Failed to load teams');
      }
    } catch (err) {
      // Error handling removed
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading teams...</p>
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
            onClick={loadTeams}
            className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'bg-green-100 text-green-800';
      case 'verified':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
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
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getTeamColumns = (): Column<any>[] => [
    {
      key: 'name',
      header: 'Team',
      sortable: true,
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">{item.name || 'N/A'}</div>
            <div className="text-sm text-gray-500">{item.captainProfile?.name || 'N/A'}</div>
          </div>
        );
      }
    },
    {
      key: 'sportName',
      header: 'Sport',
      sortable: true,
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center">
            <Trophy className="w-4 h-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-900">{item.sportName || 'N/A'}</span>
          </div>
        );
      }
    },
    {
      key: 'players',
      header: 'Players',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <span className="text-sm text-gray-900">
            {item.verifiedPlayersCount || 0}/{item.currentPlayers || 0}
          </span>
        );
      }
    },
    {
      key: 'location',
      header: 'Location',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center">
            <MapPin className="w-4 h-4 text-gray-400 mr-2" />
            <div>
              <div className="text-sm text-gray-900">{item.panchayat || 'N/A'}</div>
              <div className="text-sm text-gray-500">{item.district || 'N/A'}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'matchDayStatus',
      header: 'Status',
      sortable: true,
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.matchDayStatus)}`}>
            {getStatusIcon(item.matchDayStatus)}
            <span className="ml-1 capitalize">{item.matchDayStatus || 'pending'}</span>
          </span>
        );
      }
    }
  ];

  const getTeamFilters = () => [
    {
      key: 'matchDayStatus',
      label: 'Status',
      type: 'select' as const,
      options: [
        { label: 'All', value: '' },
        { label: 'Checked In', value: 'checked_in' },
        { label: 'Verified', value: 'verified' },
        { label: 'Pending', value: 'pending' }
      ]
    },
    {
      key: 'sportName',
      label: 'Sport',
      type: 'select' as const,
      options: [
        { label: 'All Sports', value: '' },
        ...Array.from(new Set(teams.map(t => t?.sportName).filter(Boolean))).map(sport => ({
          label: sport,
          value: sport
        }))
      ]
    },
    {
      key: 'district',
      label: 'District',
      type: 'select' as const,
      options: [
        { label: 'All Districts', value: '' },
        ...Array.from(new Set(teams.map(t => t?.district).filter(Boolean))).map(district => ({
          label: district,
          value: district
        }))
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Verification</h1>
        <p className="text-gray-600 text-sm">Match day verification for venue teams</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Teams</p>
              <p className="text-2xl font-bold text-gray-900">{teams.length}</p>
            </div>
            <Users className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Checked In</p>
              <p className="text-2xl font-bold text-green-600">
                {teams.filter(t => t.matchDayStatus === 'checked_in').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Verified</p>
              <p className="text-2xl font-bold text-yellow-600">
                {teams.filter(t => t.matchDayStatus === 'verified').length}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-2xl font-bold text-red-600">
                {teams.filter(t => t.matchDayStatus === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Teams Table */}
      <AdvancedTable
        data={teams}
        columns={getTeamColumns()}
        searchable
        searchPlaceholder="Search teams..."
        filterable
        filters={getTeamFilters()}
        sortable
        pagination={{ enabled: true, pageSize: 25 }}
        keyExtractor={(team) => team?.id || Math.random().toString()}
        emptyState={{
          icon: Users,
          title: 'No teams found',
          description: 'No teams have been assigned to this venue yet.'
        }}
        actions={[
          {
            label: 'View',
            icon: Eye,
            onClick: (team) => window.location.href = `/en/volunteer/venues/${venueId}/teams/${team?.id}`,
            variant: 'primary'
          },
          {
            label: 'Photo',
            icon: Camera,
            onClick: (team) => {/* View photo action */},
            variant: 'secondary',
             // @ts-expect-error: 'show' is not a valid property on ActionButton, but used for conditional rendering
            show: (team : any) => !!team?.teamImageUrl
          }
        ]}
        persistState
        stateKey="venue-teams"
      />
    </div>
  );
}
