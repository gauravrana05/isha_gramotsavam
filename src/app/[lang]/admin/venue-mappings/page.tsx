"use client";

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
  type FilterField,
} from '@/components/ui';
import { 
  Plus, 
  MapPin,
  Building2,
  Edit,
  Eye,
  Trash2,
  Users,
  CheckCircle,
  XCircle,
  Trophy,
  Clock,
  Target,
  Loader2
} from 'lucide-react';

interface VenueMappingData {
  id: string;
  eventId: string;
  eventName: string;
  venueId: string;
  venueName: string;
  venueDistrict: string;
  venueState: string;
  venueCapacity: number | null;
  level: 'cluster' | 'division' | 'final';
  maxTeams: number;
  isActive: boolean;
  assignedTeams: {
    cluster: number;
    division: number;
    final: number;
  };
  fixtureCount: number;
  matchCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function VenueMappingsPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  const [selectedLevel, setSelectedLevel] = useState<'all' | 'cluster' | 'division' | 'final'>('all');
  const [selectedEvent, setSelectedEvent] = useState<string>('all');

  // tRPC queries
  const {
    data: mappingsData,
    isLoading: mappingsLoading,
    error: mappingsError,
    refetch: refetchMappings
  } = api.admin.getVenueLocationMappings.useQuery({
    level: selectedLevel,
    eventId: selectedEvent !== 'all' ? selectedEvent : undefined,
    limit: 100
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  const {
    data: eventsData,
    isLoading: eventsLoading
  } = api.admin.getEvents.useQuery({
    limit: 50,
    status: 'all',
    includeStats: false
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  // Delete mapping mutation
  const deleteMappingMutation = api.admin.deleteVenueLocationMapping.useMutation({
    onSuccess: () => {
      refetchMappings();
    },
    onError: (error) => {
      alert(error.message || 'Failed to delete venue mapping');
    }
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

  const loading = mappingsLoading || eventsLoading;
  const error = mappingsError?.message || '';
  const mappings = mappingsData?.mappings || [];
  const events = eventsData?.events || [];

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this venue mapping? This will affect team assignments.')) {
      return;
    }
    
    deleteMappingMutation.mutate({ id: mappingId });
  };

  // Define table columns
  const columns: Column<VenueMappingData>[] = useMemo(() => [
    {
      key: 'venue',
      header: 'Venue Details',
      accessor: 'venueName',
      sortable: true,
      minWidth: 220,
      render: (_, mapping) => (
        <div>
          <div className="text-sm font-medium text-gray-900 flex items-center">
            <Building2 className="w-4 h-4 mr-2 text-gray-400" />
            {mapping.venueName}
          </div>
          <div className="text-sm text-gray-500">
            {mapping.venueDistrict}, {mapping.venueState}
          </div>
          {mapping.venueCapacity && (
            <div className="text-xs text-gray-400">
              Capacity: {mapping.venueCapacity}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      accessor: 'eventName',
      sortable: true,
      minWidth: 180,
      render: (_, mapping) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{mapping.eventName}</div>
        </div>
      ),
    },
    {
      key: 'level',
      header: 'Tournament Level',
      accessor: 'level',
      sortable: true,
      minWidth: 140,
      render: (_, mapping) => {
        const levelConfig = {
          cluster: { color: 'bg-blue-100 text-blue-800', icon: Target },
          division: { color: 'bg-green-100 text-green-800', icon: Trophy },
          final: { color: 'bg-purple-100 text-purple-800', icon: Trophy }
        };
        
        const config = levelConfig[mapping.level];
        const Icon = config.icon;
        
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color} capitalize`}>
            <Icon className="w-3 h-3 mr-1" />
            {mapping.level}
          </span>
        );
      },
    },
    {
      key: 'capacity',
      header: 'Team Capacity',
      accessor: 'maxTeams',
      sortable: true,
      minWidth: 140,
      render: (_, mapping) => {
        const totalAssigned = mapping.assignedTeams.cluster + 
                             mapping.assignedTeams.division + 
                             mapping.assignedTeams.final;
        const available = mapping.maxTeams - totalAssigned;
        const utilizationPercent = Math.round((totalAssigned / mapping.maxTeams) * 100);
        
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              {totalAssigned} / {mapping.maxTeams}
            </div>
            <div className="flex items-center space-x-1">
              <div className={`w-12 h-2 rounded-full bg-gray-200`}>
                <div 
                  className={`h-2 rounded-full ${
                    utilizationPercent >= 90 ? 'bg-red-400' :
                    utilizationPercent >= 75 ? 'bg-yellow-400' :
                    'bg-green-400'
                  }`}
                  style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{utilizationPercent}%</span>
            </div>
            <div className="text-xs text-gray-400">
              {available > 0 ? `${available} available` : 'At capacity'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'activity',
      header: 'Activity',
      accessor: 'fixtureCount',
      minWidth: 120,
      render: (_, mapping) => (
        <div className="text-sm space-y-1">
          <div className="flex items-center space-x-1">
            <Trophy className="w-3 h-3 text-gray-400" />
            <span>{mapping.fixtureCount} fixtures</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <span>{mapping.matchCount} matches</span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'isActive',
      sortable: true,
      minWidth: 100,
      render: (_, mapping) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
          mapping.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {mapping.isActive ? (
            <>
              <CheckCircle className="w-3 h-3 mr-1" />
              Active
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3 mr-1" />
              Inactive
            </>
          )}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      accessor: 'createdAt',
      sortable: true,
      minWidth: 130,
      render: (_, mapping) => (
        <span className="text-sm text-gray-700">
          {mapping.createdAt ? new Date(mapping.createdAt).toLocaleDateString('en-IN', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          }) : '—'}
        </span>
      ),
    }
  ], []);

  const actionButtons: ActionButton<VenueMappingData>[] = useMemo(() => [
    {
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      onClick: (mapping) => router.push(`/${lang}/admin/venue-mappings/${mapping.id}`),
      variant: 'secondary'
    },
    {
      label: 'Edit',
      icon: <Edit className="w-4 h-4" />,
      onClick: (mapping) => router.push(`/${lang}/admin/venue-mappings/${mapping.id}/edit`),
      variant: 'primary'
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: (mapping) => handleDeleteMapping(mapping.id),
      variant: 'danger',
      disabled: (mapping) => (mapping.assignedTeams.cluster + mapping.assignedTeams.division + mapping.assignedTeams.final) > 0
    }
  ], [router, lang]);

  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'level',
      label: 'Tournament Level',
      type: 'select',
      options: [
        { label: 'All Levels', value: 'all' },
        { label: 'Cluster', value: 'cluster' },
        { label: 'Division', value: 'division' },
        { label: 'Final', value: 'final' }
      ]
    },
    {
      key: 'event',
      label: 'Event',
      type: 'select',
      options: [
        { label: 'All Events', value: 'all' },
        ...events.map(event => ({ label: event.name, value: event.id }))
      ]
    }
  ], [events]);

  if (authLoading || loading) {
    return <PageLoader title="Loading venue mappings..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <MapPin className="w-16 h-16 text-red-400 mx-auto mb-3" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Unable to load venue mappings</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const stats = {
    total: mappings.length,
    byLevel: {
      cluster: mappings.filter(m => m.level === 'cluster').length,
      division: mappings.filter(m => m.level === 'division').length,
      final: mappings.filter(m => m.level === 'final').length,
    },
    active: mappings.filter(m => m.isActive).length,
    totalCapacity: mappings.reduce((sum, m) => sum + m.maxTeams, 0),
    totalAssigned: mappings.reduce((sum, m) => 
      sum + m.assignedTeams.cluster + m.assignedTeams.division + m.assignedTeams.final, 0
    )
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Venue Location Mappings</h1>
          <p className="text-gray-600 text-sm">Manage multi-level venue assignments for tournament levels</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push(`/${lang}/admin/venue-mappings/create`)}
          className="flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Mapping
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <SingleStatCard
          title="Total Mappings"
          value={stats.total.toString()}
          icon={<MapPin className="w-5 h-5" />}
          color="blue"
        />
        <SingleStatCard
          title="Cluster Venues"
          value={stats.byLevel.cluster.toString()}
          icon={<Target className="w-5 h-5" />}
          color="blue"
        />
        <SingleStatCard
          title="Division Venues"
          value={stats.byLevel.division.toString()}
          icon={<Trophy className="w-5 h-5" />}
          color="green"
        />
        <SingleStatCard
          title="Final Venues"
          value={stats.byLevel.final.toString()}
          icon={<Trophy className="w-5 h-5" />}
          color="purple"
        />
        <SingleStatCard
          title="Active Mappings"
          value={stats.active.toString()}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
        <SingleStatCard
          title="Capacity Usage"
          value={`${Math.round((stats.totalAssigned / stats.totalCapacity) * 100)}%`}
          icon={<Users className="w-5 h-5" />}
          color="orange"
        />
      </div>

      <AdvancedTable<VenueMappingData>
        data={mappings}
        columns={columns}
        actionButtons={actionButtons}
        loading={loading}
        
        searchable={true}
        searchPlaceholder="Search venues, events, locations..."
        
        filterable={true}
        filters={filterFields}
        
        sortable={true}
        multiSort={true}
        defaultSort={[{ key: 'level', direction: 'asc' }, { key: 'venueName', direction: 'asc' }]}
        
        pagination={{ enabled: true, pageSize: 25 }}
        
        selectable={false}
        keyExtractor={(mapping) => mapping.id}
        stickyHeader={true}
        
        persistState={true}
        stateKey="admin-venue-mappings"
        
        emptyState={{
          icon: MapPin,
          title: 'No venue mappings found',
          description: 'Create your first venue location mapping to get started'
        }}
      />
    </div>
  );
}