'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { 
  AdvancedTable,
  SingleStatCard,
  PageLoader,
  Button,
  type Column,
  type ActionButton,
} from '@/components/ui';
import { type FixtureData } from '@/lib/types';
import { 
  Plus, 
  Trophy,
  Users,
  MapPin,
  Calendar,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  Target
} from 'lucide-react';

export default function AdminFixturesPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // tRPC query
  const {
    data: fixturesResponse,
    isLoading: fixturesLoading,
    error: fixturesError
  } = api.admin.events.getFixtures.useQuery({
    limit: 100,
    status: 'all'
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

  const loading = fixturesLoading;
  const error = fixturesError?.message || '';
  const fixtures = fixturesResponse?.fixtures || [];

  // Transform fixtures to match FixtureData interface
  const transformedFixtures = fixtures.map(fixture => ({
    id: fixture.id,
    name: fixture.name,
    genderCategory: fixture.genderCategory,
    status: fixture.status,
    eventId: fixture.eventId,
    level: fixture.level,
    sportId: fixture.sportId,
    venueLevelMappingId: fixture.venueLevelMappingId,
    eventName: fixture.event?.name || 'No Event',
    sportName: 'Unknown Sport', // Will be populated by separate query if needed
    matchCount: 0, // Will be populated by separate query if needed
    createdAt: fixture.createdAt,
    updatedAt: fixture.updatedAt,
    deletedAt: fixture.deletedAt
  }));

  // Define table columns
  const columns: Column<FixtureData>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Fixture Name',
      accessor: 'name',
      sortable: true,
      minWidth: 200,
      render: (_, fixture) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{fixture.name}</div>
          <div className="text-sm text-gray-500">{fixture.sportName} • {fixture.level}</div>
        </div>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      accessor: (fixture) => fixture.eventName,
      sortable: true,
      minWidth: 150,
      render: (_, fixture) => (
        <span className="text-sm text-gray-900">{fixture.eventName}</span>
      ),
    },
    {
      key: 'matches',
      header: 'Matches',
      accessor: (fixture) => fixture.matchCount,
      sortable: true,
      minWidth: 100,
      render: (_, fixture) => (
        <div className="flex items-center space-x-1">
          <Play className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-900">{fixture.matchCount}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      minWidth: 120,
      render: (_, fixture) => {
        const statusConfig = {
          'draft': { color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
          'teams_assigned': { color: 'bg-blue-100 text-blue-800', icon: Users },
          'in_progress': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
          'completed': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
        };
        
        const config = statusConfig[fixture.status as keyof typeof statusConfig] || statusConfig.draft;
        const Icon = config.icon;
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            <Icon className="w-3 h-3 mr-1" />
            {fixture.status.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      key: 'dates',
      header: 'Timeline',
      accessor: (fixture) => fixture.startDate,
      sortable: true,
      minWidth: 150,
      render: (_, fixture) => (
        <div className="text-sm text-gray-900">
          {fixture.startDate ? new Date(fixture.startDate).toLocaleDateString() : 'Not set'}
          {fixture.endDate && (
            <div className="text-xs text-gray-500">
              to {new Date(fixture.endDate).toLocaleDateString()}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      accessor: 'createdAt',
      sortable: true,
      minWidth: 120,
      render: (_, fixture) => (
        <span className="text-sm text-gray-500">
          {fixture.createdAt ? new Date(fixture.createdAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
    }
  ], []);

  // Define action buttons
  const actions: ActionButton<FixtureData>[] = useMemo(() => [
    {
      label: 'View',
      icon: Eye,
      onClick: (fixture) => router.push(`/${lang}/admin/fixtures/${fixture.id}`),
      variant: 'primary',
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (fixture) => router.push(`/${lang}/admin/fixtures/${fixture.id}/edit`),
      variant: 'secondary',
    }
  ], [router, lang]);

  if (authLoading || loading) {
    return <PageLoader title="Loading fixtures..." variant="minimal" />;
  }

  if (!user || userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fixtures Management</h1>
          <p className="text-gray-600 text-sm">Manage tournament fixtures and brackets</p>
        </div>
        
        <Button
          onClick={() => router.push(`/${lang}/admin/fixtures/create`)}
          leftIcon={Plus}
          variant="primary"
          size="sm"
        >
          Create Fixture
        </Button>
      </div>

      {/* Stats Cards */}
      {transformedFixtures.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <SingleStatCard
            stat={{
              label: "Total Fixtures",
              value: transformedFixtures.length.toString(),
              icon: Trophy,
              color: "info"
            }}
          />
          <SingleStatCard
            stat={{
              label: "Active Fixtures",
              value: transformedFixtures.filter(f => f.status === 'teams_assigned' || f.status === 'in_progress').length.toString(),
              icon: Play,
              color: "warning"
            }}
          />
          <SingleStatCard
            stat={{
              label: "Completed",
              value: transformedFixtures.filter(f => f.status === 'completed').length.toString(),
              icon: CheckCircle,
              color: "success"
            }}
          />
          <SingleStatCard
            stat={{
              label: "Total Matches",
              value: transformedFixtures.reduce((sum, fixture) => sum + (fixture.matchCount || 0), 0).toString(),
              icon: Target,
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
      <AdvancedTable<FixtureData>
        data={transformedFixtures as unknown as FixtureData[]}
        columns={columns}
        actions={actions}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search fixtures..."
        filterable={false}
        sortable={true}
        keyExtractor={(fixture) => fixture.id}
        emptyState={{
          icon: Trophy,
          title: 'No fixtures found',
          description: 'No tournament fixtures have been created yet.'
        }}
      />
    </div>
  );
}