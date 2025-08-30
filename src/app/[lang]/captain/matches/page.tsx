"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from '@/server/trpc/react';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
import type { FilterField } from '@/components/ui/FilterSidebar';
import Link from "next/link";
import Image from "next/image";
import { 
  Zap, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Play,
  Trophy,
  MapPin,
  Users,
  Target,
  Calendar,
  Hash,
  Star,
  Award,
  UserCheck
} from "lucide-react";

interface CaptainTeam {
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

interface CaptainMatch {
  matchId: string;
  fixtureId: string;
  fixtureName: string;
  sportName?: string;
  genderCategory?: string;
  venue: {
    id: string;
    name: string;
    address: string;
  };
  roundName: string;
  matchNumber: number;
  status: string;
  team1?: {
    teamId: string;
    teamName: string;
    tournamentNumber?: number;
  } | null;
  team2?: {
    teamId: string;
    teamName: string;
    tournamentNumber?: number;
  } | null;
  result?: {
    winnerName: string;
    winnerTeamId: string;
    score: {
      team1Score: number;
      team2Score: number;
    };
  } | null;
  createdAt: string;
  updatedAt: string;
  isCaptainInvolved?: boolean;
  captainTeamSide?: 'team1' | 'team2' | null;
  isCaptainTeamWinner?: boolean;
}

export default function CaptainMatchesPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // Get teams using tRPC
  const { data: teams = [], isLoading: teamsLoading, error: teamsError } = api.teams.management.getMyTeams.useQuery(
    undefined,
    {
      enabled: !authLoading && !!user && userProfile?.profileComplete && user.role === 'captain',
    }
  );

  // Get matches using tRPC
  const { data: matches = [], isLoading: matchesLoading, error: matchesError } = api.teams.management.getMyTeamMatches.useQuery(
    undefined,
    {
      enabled: !authLoading && !!user && userProfile?.profileComplete && (user.role === 'captain' || user.role === 'player'),
    }
  );

  const loading = authLoading || teamsLoading || matchesLoading;
  const error = teamsError?.message || matchesError?.message;

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (!userProfile?.profileComplete) {
      router.push(`/${lang}/profile/complete`);
      return;
    }
  }, [user, userProfile, authLoading, router, lang]);


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'ready': return <Clock className="w-4 h-4" />;
      case 'scheduled': return <AlertCircle className="w-4 h-4" />;
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
  const columns: Column<CaptainMatch>[] = [
    {
      key: 'matchNumber',
      header: 'Match',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center text-sm font-medium text-gray-900">
            <Hash className="w-4 h-4 text-gray-400 mr-1" />
            #{item.matchNumber}
            {item.isCaptainInvolved && (
              <Star className="w-4 h-4 text-yellow-500 ml-2" />
            )}
          </div>
        );
      },
      sortable: true,
      width: '100px'
    },
    {
      key: 'teams',
      header: 'Match Details',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div>
            <div className="space-y-1 mb-2">
              <div className="flex items-center text-sm">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                <span className={`font-medium ${
                  item.captainTeamSide === 'team1' ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {item.team1?.teamName || 'TBD'}
                  {item.team1?.tournamentNumber && (
                    <span className="ml-1 text-gray-500">#{item.team1.tournamentNumber}</span>
                  )}
                  {item.captainTeamSide === 'team1' && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Your Team</span>
                  )}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                <span className={`font-medium ${
                  item.captainTeamSide === 'team2' ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {item.team2?.teamName || 'TBD'}
                  {item.team2?.tournamentNumber && (
                    <span className="ml-1 text-gray-500">#{item.team2.tournamentNumber}</span>
                  )}
                  {item.captainTeamSide === 'team2' && (
                    <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Your Team</span>
                  )}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {item.fixtureName} • {item.roundName}
            </div>
            {item.sportName && (
              <div className="text-xs text-gray-500">
                {item.sportName} • {item.genderCategory}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'venue',
      header: 'Venue',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div>
            {item.venue ? (
              <div className="flex items-center text-sm text-gray-900">
                <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                <div>
                  <div className="font-medium">{item.venue.name}</div>
                  <div className="text-xs text-gray-500">{item.venue.address}</div>
                </div>
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
      key: 'result',
      header: 'Result',
      render: (value, item, index) => {
        if (!item) return null;
        if (!item.result) {
          return <span className="text-sm text-gray-500">Pending</span>;
        }
        return (
          <div className="text-sm">
            <div className={`font-medium flex items-center ${
              item.isCaptainTeamWinner ? 'text-green-800' : 'text-gray-900'
            }`}>
              {item.isCaptainTeamWinner && (
                <Award className="w-4 h-4 text-green-600 mr-1" />
              )}
              Winner: {item.result.winnerName}
            </div>
            {item.result.score && (
              <div className="text-xs text-gray-500 mt-1">
                Score: {item.result.score.team1Score} - {item.result.score.team2Score}
              </div>
            )}
            {item.isCaptainTeamWinner && (
              <div className="text-xs text-green-600 mt-1 font-medium">
                🎉 Your Team Won!
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (value, item, index) => {
        if (!item || !item.createdAt) return <span className="text-sm text-gray-500">-</span>;
        return (
          <div className="text-sm text-gray-900">
            {new Date(item.createdAt).toLocaleString('en-IN', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
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
              onClick={() => router.push(`/${lang}/captain/matches/${item.matchId}`)}
              className="text-[#F28C38] hover:text-[#E67A26] flex items-center text-sm"
            >
              <Target className="w-4 h-4 mr-1" />
              View Details
            </button>
            <button
              onClick={() => router.push(`/${lang}/captain/teams`)}
              className="text-gray-600 hover:text-gray-800 flex items-center text-sm"
            >
              <UserCheck className="w-4 h-4 mr-1" />
              Manage Team
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
        { label: 'Ready', value: 'ready' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' }
      ]
    },
    {
      key: 'roundName',
      label: 'Round',
      type: 'select',
      options: [
        { label: 'All Rounds', value: '' },
        ...Array.from(new Set(matches.map(m => m.roundName))).map(round => ({
          label: round,
          value: round
        }))
      ]
    },
    {
      key: 'isCaptainInvolved',
      label: 'My Matches Only',
      type: 'select',
      options: [
        { label: 'All Matches', value: '' },
        { label: 'My Matches Only', value: 'true' }
      ]
    },
    {
      key: 'fixtureName',
      label: 'Tournament',
      type: 'text'
    }
  ];

  // Custom filter function
  const customFilterFunction = (item: CaptainMatch, filters: Record<string, any>): boolean => {
    if (filters.isCaptainInvolved === 'true') {
      return item.isCaptainInvolved === true;
    }
    return true;
  };

  if (authLoading || loading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="lg:min-h-screen bg-gray-50">
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
            Your Team Matches
          </h1>
          <p className="text-gray-600">
            Live matches and results for your teams
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

        {/* Stats Cards */}
        {matches.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Matches</p>
                  <p className="text-2xl font-bold text-gray-900">{matches.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Ready to Play</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {matches.filter(m => m.status === 'ready').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {matches.filter(m => m.status === 'in_progress').length}
                  </p>
                </div>
                <Play className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {matches.filter(m => m.status === 'completed').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </div>
        )}

        {/* Tournament Matches Table */}
        <AdvancedTable
          title="Your Team Matches"
          subtitle="Live matches and results for your teams"
          data={matches}
          columns={columns}
          loading={loading}
          
          searchable={true}
          searchPlaceholder="Search matches, teams, tournaments..."
          searchFields={['fixtureName', 'roundName']}
          
          filterable={true}
          filters={filters}
          
          sortable={true}
          defaultSort={[{ key: 'createdAt', direction: 'desc' }]}
          
          pagination={{ enabled: true, pageSize: 10 }}
          
          persistState={true}
          stateKey="captain-matches"
          
          emptyState={{
            icon: teams.length > 0 ? Zap : Users,
            title: teams.length > 0 ? 'No Matches Available' : 'No Teams Created',
            description: teams.length > 0 
              ? 'No matches have been scheduled for your teams yet.'
              : "You haven't created any teams yet. Create a team to see match schedules."
          }}
        />
      </div>
    </div>
  );
}