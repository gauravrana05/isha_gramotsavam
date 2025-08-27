"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { 
  AdvancedTable,
  SingleStatCard,
  PageLoader,
  Button
} from '@/components/ui';
import type { Column, ActionButton } from '@/components/ui';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  Trophy, 
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';

interface SportData {
  id: string;
  name: string;
  description: string | null;
  maxPlayers: number;
  teamCount?: number;
  createdAt: string | null;
}

export default function AdminSportsPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // tRPC query
  const {
    data: sportsData,
    isLoading: sportsLoading,
    error: sportsError
  } = api.admin.getSports.useQuery({
    includeTeamCounts: true
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

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
  }, [user, userProfile, authLoading, lang, router]);

  const loading = sportsLoading;
  const error = sportsError?.message || '';
  const sports = sportsData?.sports || [];

  // Delete sport mutation
  const deleteSportMutation = api.admin.deleteSport.useMutation({
    onSuccess: () => {
      // Refetch sports data
      void sportsData;
    },
    onError: (error) => {
      alert(error.message || 'Failed to delete sport');
    }
  });

  const handleDeleteSport = async (sportId: string) => {
    if (!confirm('Are you sure you want to delete this sport?')) {
      return;
    }
    
    deleteSportMutation.mutate({ id: sportId });
  };

  // Define table columns for AdvancedTable
  const columns: Column<SportData>[] = [
    {
      key: 'name',
      header: 'Sport Name',
      accessor: 'name',
      sortable: true,
      minWidth: 200,
      render: (_, sport) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{sport.name}</div>
          <div className="text-sm text-gray-500">{sport.description || 'No description'}</div>
        </div>
      ),
    },
    {
      key: 'maxPlayers',
      header: 'Max Players',
      accessor: 'maxPlayers',
      sortable: true,
      minWidth: 120,
      render: (_, sport) => (
        <span className="text-sm text-gray-900">{sport.maxPlayers}</span>
      ),
    },
    {
      key: 'teamCount',
      header: 'Teams',
      accessor: 'teamCount',
      sortable: true,
      minWidth: 100,
      render: (_, sport) => (
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-900">{sport.teamCount || 0}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      accessor: 'createdAt',
      sortable: true,
      minWidth: 120,
      render: (_, sport) => (
        <span className="text-sm text-gray-500">
          {sport.createdAt ? new Date(sport.createdAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
  ];

  // Define action buttons for AdvancedTable
  const actions: ActionButton<SportData>[] = [
    {
      label: 'View',
      icon: Eye,
      onClick: (sport) => router.push(`/${lang}/admin/sports/${sport.id}`),
      variant: 'primary',
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (sport) => router.push(`/${lang}/admin/sports/${sport.id}/edit`),
      variant: 'secondary',
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: (sport) => handleDeleteSport(sport.id),
      variant: 'danger',
      disabled: (sport) => deleteSportMutation.isPending,
    },
  ];

  if (authLoading || loading) {
    return <PageLoader title="Loading sports..." variant="minimal" />;
  }

  if (!user || userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sports Management</h1>
          <p className="text-gray-600 text-sm">Manage sports and their configurations</p>
        </div>
        
        <Button
          onClick={() => router.push(`/${lang}/admin/sports/create`)}
          leftIcon={Plus}
          variant="primary"
          size="sm"
        >
          Add Sport
        </Button>
      </div>

      {/* Stats Cards */}
      {sports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SingleStatCard
            stat={{
              label: "Total Sports",
              value: sports.length.toString(),
              icon: Trophy,
              color: "info"
            }}
          />
          <SingleStatCard
            stat={{
              label: "Total Teams",
              value: sports.reduce((sum, sport) => sum + (sport.teamCount || 0), 0).toString(),
              icon: Users,
              color: "success"
            }}
          />
          <SingleStatCard
            stat={{
              label: "Avg Teams/Sport",
              value: (sports.reduce((sum, sport) => sum + (sport.teamCount || 0), 0) / sports.length).toFixed(1),
              icon: Clock,
              color: "primary"
            }}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* AdvancedTable */}
      <AdvancedTable<SportData>
        data={sports}
        columns={columns}
        actions={actions}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search sports..."
        filterable={false}
        sortable={true}
        keyExtractor={(sport) => sport.id}
        emptyState={{
          icon: Trophy,
          title: 'No sports found',
          description: 'No sports have been added yet.'
        }}
      />
    </div>
  );
}