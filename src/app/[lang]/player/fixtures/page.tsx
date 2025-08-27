"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from '@/lib/trpc/react';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
import type { FilterField } from '@/components/ui/FilterSidebar';
import Image from "next/image";
import { 
  Calendar, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Play,
  Trophy,
  MapPin,
  Users,
  Target,
  Eye,
  Star
} from "lucide-react";

interface PlayerTeam {
  teamId: string;
  name: string;
  sportName: string;
  panchayat: string;
  district: string;
  state: string;
  venue?: {
    id: string;
    name: string;
    address: string;
  };
  status: string;
  currentPlayers: number;
  maxPlayers: number;
}

interface PlayerFixture {
  id: string;
  name: string;
  sportId: string;
  sportName?: string;
  genderCategory: string;
  venue: {
    id: string;
    name: string;
    address: string;
    district: string;
    state: string;
  };
  status: string;
  level: string;
  assignedTeams: Array<{
    id: string;
    name: string;
    tournamentNumber?: number;
  }>;
  totalMatches: number;
  completedMatches: number;
  createdAt: string;
  updatedAt: string;
  hasPlayerTeam?: boolean;
  playerTeamNames?: string[];
}

export default function PlayerFixturesPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // Get teams using tRPC
  const { data: teams = [], isLoading: teamsLoading, error: teamsError } = api.teams.getMyTeams.useQuery(
    undefined,
    {
      enabled: !authLoading && !!user && userProfile?.profile_complete && user.role === 'player',
    }
  );

  // Get fixtures using tRPC
  const { data: fixtures = [], isLoading: fixturesLoading, error: fixturesError } = api.teams.getMyTeamFixtures.useQuery(
    undefined,
    {
      enabled: !authLoading && !!user && userProfile?.profile_complete && user.role === 'player',
    }
  );

  const loading = authLoading || teamsLoading || fixturesLoading;
  const error = teamsError?.message || fixturesError?.message;

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (!userProfile?.profile_complete) {
      router.push(`/${lang}/profile/complete`);
      return;
    }
  }, [user, userProfile, authLoading, router, lang]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getTeamStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // AdvancedTable configuration
  const columns: Column<PlayerFixture>[] = [
    {
      key: 'name',
      header: 'Tournament',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center">
            <Trophy className="w-5 h-5 text-gray-400 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {item.name}
                {item.hasPlayerTeam && (
                  <Star className="w-4 h-4 text-yellow-500 ml-2 inline" />
                )}
              </div>
              <div className="text-sm text-gray-500">{item.sportName} • {item.genderCategory}</div>
              <div className="text-sm text-gray-500">Level: {item.level}</div>
              {item.hasPlayerTeam && item.playerTeamNames && (
                <div className="text-xs text-blue-600 mt-1">
                  Your teams: {item.playerTeamNames.join(', ')}
                </div>
              )}
            </div>
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'venue',
      header: 'Venue',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div>
            {item.venue ? (
              <div>
                <div className="text-sm font-medium text-gray-900 flex items-center">
                  <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                  {item.venue.name}
                </div>
                <div className="text-xs text-gray-500">{item.venue.address}</div>
              </div>
            ) : (
              <span className="text-sm text-gray-500">Venue TBD</span>
            )}
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'assignedTeams',
      header: 'Teams',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center">
            <Users className="w-4 h-4 text-gray-400 mr-1" />
            <span className="text-sm text-gray-900">{item.assignedTeams?.length || 0}</span>
          </div>
        );
      }
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (value, item, index) => {
        if (!item) return null;
        const completed = item.bracket?.matches?.filter(m => m.status === 'completed').length || 0;
        const total = item.bracket?.matches?.length || 0;
        return (
          <div>
            <div className="text-sm text-gray-900">{completed} / {total}</div>
            <div className="text-xs text-gray-500">matches completed</div>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
            {getStatusIcon(item.status)}
            <span className="ml-1 capitalize">{item.status.replace('_', ' ')}</span>
          </span>
        );
      },
      sortable: true
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => router.push(`/${lang}/player/fixtures/${item.id}`)}
              className="text-[#F28C38] hover:text-[#E67A26] flex items-center text-sm"
            >
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </button>
          </div>
        );
      }
    }
  ];

  const filters: FilterField[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'All', value: '' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' }
      ]
    },
    {
      key: 'level',
      label: 'Level',
      type: 'select',
      options: [
        { label: 'All Levels', value: '' },
        ...Array.from(new Set(fixtures.map(f => f.level))).map(level => ({
          label: level,
          value: level
        }))
      ]
    },
    {
      key: 'hasPlayerTeam',
      label: 'My Teams Only',
      type: 'select',
      options: [
        { label: 'All Tournaments', value: '' },
        { label: 'My Teams Only', value: 'true' }
      ]
    },
    {
      key: 'sportName',
      label: 'Sport',
      type: 'text'
    }
  ];

  // Custom filter function for hasPlayerTeam
  const customFilterFunction = (item: PlayerFixture, filters: Record<string, any>): boolean => {
    if (filters.hasPlayerTeam === 'true') {
      return item.hasPlayerTeam === true;
    }
    return true;
  };

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
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
            Tournament Fixtures
          </h1>
          <p className="text-gray-600">
            View tournaments and fixture schedules for your teams
          </p>
        </div>

        {/* Teams Overview */}
        {teams.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#4A2F1D] mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Your Teams
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <div key={team.teamId} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTeamStatusColor(team.status)}`}>
                      {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Trophy className="w-4 h-4 mr-1" />
                      {team.sportName}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {team.panchayat}, {team.district}
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {team.currentPlayers}/{team.maxPlayers} players
                    </div>
                    {team.venue && (
                      <div className="text-xs text-blue-600 mt-2">
                        Venue: {team.venue.name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tournament Fixtures Table */}
        <AdvancedTable
          title="Tournament Fixtures"
          subtitle="View tournaments and fixture schedules for your teams"
          data={fixtures}
          columns={columns}
          loading={loading}
          
          searchable={true}
          searchPlaceholder="Search tournaments, sports, venues..."
          searchFields={['name', 'sportName']}
          
          filterable={true}
          filters={filters}
          
          sortable={true}
          defaultSort={[{ key: 'createdAt', direction: 'desc' }]}
          
          pagination={{ enabled: true, pageSize: 10 }}
          
          persistState={true}
          stateKey="player-fixtures"
          
          emptyState={{
            icon: Calendar,
            title: teams.length > 0 ? 'No Fixtures Available' : 'No Team Memberships',
            description: teams.length > 0 
              ? 'No tournament fixtures have been created for your team venues yet.'
              : "You haven't joined any teams yet. Contact team captains to get added to teams."
          }}
        />
      </div>
    </div>
  );
}