"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { 
  Plus, 
  Calendar,
  Edit,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  Trophy
} from 'lucide-react';

interface EventData {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'registration_open' | 'registration_closed' | 'active' | 'completed' | 'cancelled';
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  createdByName: string;
  teamCount?: number;
  fixtureCount?: number;
  matchCount?: number;
  venueCount?: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function AdminEventsPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // tRPC query with enhanced parameters
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents
  } = api.admin.getEvents.useQuery({
    limit: 100,
    status: 'all',
    includeStats: true
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

  const loading = eventsLoading;
  const error = eventsError?.message || '';
  const events = eventsData?.events || [];

  // Define table columns
  const columns: Column<EventData>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Event Name',
      accessor: 'name',
      sortable: true,
      minWidth: 200,
      render: (_, event) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{event.name}</div>
          <div className="text-sm text-gray-500">{event.description || 'No description'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      minWidth: 120,
      render: (_, event) => {
        const statusConfig = {
          'draft': { color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
          'active': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
          'upcoming': { color: 'bg-blue-100 text-blue-800', icon: Clock },
          'completed': { color: 'bg-purple-100 text-purple-800', icon: Trophy },
        };
        
        const config = statusConfig[event.status as keyof typeof statusConfig] || statusConfig.draft;
        const Icon = config.icon;
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            <Icon className="w-3 h-3 mr-1" />
            {event.status}
          </span>
        );
      },
    },
    {
      key: 'dates',
      header: 'Event Dates',
      accessor: 'startDate',
      sortable: true,
      minWidth: 150,
      render: (_, event) => (
        <div className="text-sm text-gray-900">
          {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'Not set'}
          {event.endDate && (
            <div className="text-xs text-gray-500">
              to {new Date(event.endDate).toLocaleDateString()}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'registration',
      header: 'Registration',
      accessor: 'registrationDeadline',
      sortable: true,
      minWidth: 130,
      render: (_, event) => (
        <div className="text-sm text-gray-900">
          {event.registrationDeadline ? (
            <>
              <div>Until</div>
              <div className="text-xs">{new Date(event.registrationDeadline).toLocaleDateString()}</div>
            </>
          ) : 'Not set'}
        </div>
      ),
    },
    {
      key: 'teams',
      header: 'Teams',
      accessor: 'teamCount',
      sortable: true,
      minWidth: 80,
      render: (_, event) => (
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-900">{event.teamCount}</span>
        </div>
      ),
    },
    {
      key: 'fixtures',
      header: 'Fixtures',
      accessor: 'fixtureCount',
      sortable: true,
      minWidth: 80,
      render: (_, event) => (
        <div className="flex items-center space-x-1">
          <Trophy className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-900">{event.fixtureCount}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      accessor: 'createdAt',
      sortable: true,
      minWidth: 120,
      render: (_, event) => (
        <span className="text-sm text-gray-500">
          {event.createdAt ? new Date(event.createdAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
    }
  ], []);

  // Define action buttons
  const actions: ActionButton<EventData>[] = useMemo(() => [
    {
      label: 'View',
      icon: Eye,
      onClick: (event) => router.push(`/${lang}/admin/events/${event.id}`),
      variant: 'primary',
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (event) => router.push(`/${lang}/admin/events/${event.id}/edit`),
      variant: 'secondary',
    }
  ], [router, lang]);

  if (authLoading || loading) {
    return <PageLoader title="Loading events..." variant="minimal" />;
  }

  if (!user || userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events Management</h1>
          <p className="text-gray-600 text-sm">Manage tournament events and competitions</p>
        </div>
        
        <Button
          onClick={() => router.push(`/${lang}/admin/events/create`)}
          leftIcon={Plus}
          variant="primary"
          size="sm"
        >
          Create Event
        </Button>
      </div>

      {/* Stats Cards */}
      {events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <SingleStatCard
            stat={{
              label: "Total Events",
              value: events.length.toString(),
              icon: Calendar,
              color: "info"
            }}
          />
          <SingleStatCard
            stat={{
              label: "Active Events",
              value: events.filter((e: EventData) => e.status === 'active').length.toString(),
              icon: CheckCircle,
              color: "success"
            }}
          />
          <SingleStatCard
            stat={{
              label: "Total Teams",
              value: events.reduce((sum: number, event: EventData) => sum + event.teamCount, 0).toString(),
              icon: Users,
              color: "primary"
            }}
          />
          <SingleStatCard
            stat={{
              label: "Total Fixtures",
              value: events.reduce((sum: number, event: EventData) => sum + event.fixtureCount, 0).toString(),
              icon: Trophy,
              color: "secondary"
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
      <AdvancedTable<EventData>
        data={events}
        columns={columns}
        actions={actions}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search events..."
        filterable={false}
        sortable={true}
        keyExtractor={(event) => event.id}
        emptyState={{
          icon: Calendar,
          title: 'No events found',
          description: 'No events have been created yet.'
        }}
      />
    </div>
  );
}