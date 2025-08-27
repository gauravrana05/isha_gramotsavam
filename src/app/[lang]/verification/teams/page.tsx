"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/server/trpc/react";
import { useTranslation } from "@/lib/utils/i18n";
import { AdvancedTable } from "@/components/ui/AdvancedTable";
import type { Column } from "@/components/ui/Table";
import Image from "next/image";
import { Users, Loader2, AlertCircle, CheckCircle, Clock, X, Eye, Filter } from "lucide-react";

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
  const { t } = useTranslation();

  // Try with a simple query first
  const { data: teamsData, isLoading: teamsLoading, error: teamsError } = api.teams.getForVerification.useQuery(
    {
      searchTerm: '',
      statusFilter: 'all',
    },
    {
      enabled: !authLoading && !!user,
    }
  );

  const teams = teamsData?.teams || [];
  const loading = authLoading || teamsLoading;

  // Clean up - removed debug logging

  // Show error if there is one
  if (teamsError) {
    console.error('tRPC error:', teamsError);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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

  // Define columns for AdvancedTable
  const columns: Column<TeamData>[] = [
    {
      key: 'name',
      header: 'Team',
      accessor: (team) => (
        <div>
          <div className="font-semibold text-gray-900">{team.name}</div>
          <div className="text-sm text-gray-600">{team.sportName} • {team.genderCategory === 'women' ? 'Women' : 'Men'}</div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'captain',
      header: 'Captain',
      accessor: (team) => (
        <div className="text-sm">
          <div className="text-gray-900">{team.captainProfile.name}</div>
          <div className="text-gray-600">+91 {team.captainProfile.phone}</div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      accessor: (team) => (
        <div className="text-sm">
          <div className="text-gray-900">{team.panchayat}</div>
          <div className="text-gray-600">{team.district}, {team.state}</div>
        </div>
      ),
    },
    {
      key: 'players',
      header: 'Players',
      accessor: (team) => `${team.currentPlayers} / ${team.maxPlayers}`,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (team) => (
        <div className="flex items-center">
          {getStatusIcon(team.status)}
          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(team.status)}`}>
            {team.status}
          </span>
        </div>
      ),
    },
  ];

  // Actions for each row
  const actions = [
    {
      label: 'Review',
      icon: Eye,
      onClick: (team: TeamData) => router.push(`/${lang}/verification/teams/${team.id}`),
      variant: 'primary' as const,
    },
  ];

  const handleTeamClick = (teamId: string) => {
    router.push(`/${lang}/verification/teams/${teamId}`);
  };

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
      </div>
    </div>
  );
}