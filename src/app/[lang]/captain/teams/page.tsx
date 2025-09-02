'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { AdvancedTable, type Column } from '@/components/ui';
import { Users, Plus, Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';

interface Team {
  id: string;
  name: string;
  sport: { name: string };
  status: string;
  createdAt: Date;
  district: string;
  state: string;
  _count: { players: number };
}

export default function CaptainTeamsPage() {
  const { lang } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const { data: teams, isLoading } = api.teams.management.getUserCaptainTeams.useQuery();

  const columns: Column<Team>[] = [
    {
      key: 'name',
      header: 'Team Name',
      render: (team) => (
        <div className="font-medium text-gray-900">{team.name}</div>
      ),
    },
    {
      key: 'sport',
      header: 'Sport',
      render: (team) => (
        <span className="text-gray-600">{team.sport.name}</span>
      ),
    },
    {
      key: 'players',
      header: 'Players',
      render: (team) => (
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4 text-gray-400" />
          <span>{team._count.players}</span>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (team) => (
        <div className="flex items-center gap-1">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">{team.district}, {team.state}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (team) => (
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {new Date(team.createdAt).toLocaleDateString()}
          </span>
        </div>
      ),
    },
  ];

  const handleRowClick = (team: Team) => {
    router.push(`/${lang}/captain/teams/${team.id}`);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F28C38]"></div></div>;
  }

  return (
    <div className="p-6">
      <AdvancedTable
        data={teams || []}
        columns={columns}
        title="My Teams"
        subtitle="Manage your teams and players"
        onRowClick={handleRowClick}
        headerActions={
          <Link
            href={`/${lang}/captain/teams/create`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#F28C38] hover:bg-[#E07B2A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F28C38] transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </Link>
        }
        showPagination={false}
      />
    </div>
  );
}
