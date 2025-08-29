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
  Target,
  Users,
  CheckCircle,
  Calendar,
  Navigation,
  Upload,
  Download,
  Loader2
} from 'lucide-react';

interface TalukMappingData {
  id: string;
  eventId: string;
  eventName: string;
  district: string;
  state: string;
  taluk: string;
  clusterVenueMapping: {
    id: string;
    venueName: string;
    venueDistrict: string;
    venueState: string;
  };
  createdAt: string | null;
  updatedAt: string | null;
}

export default function TalukMappingsPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [showBulkCreate, setShowBulkCreate] = useState(false);

  // tRPC queries
  const {
    data: mappingsData,
    isLoading: mappingsLoading,
    error: mappingsError,
    refetch: refetchMappings
  } = api.admin.getTalukClusterMappings.useQuery({
    eventId: selectedEvent !== 'all' ? selectedEvent : undefined,
    district: selectedDistrict !== 'all' ? selectedDistrict : undefined,
    limit: 200
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
  const deleteMappingMutation = api.admin.deleteTalukClusterMapping.useMutation({
    onSuccess: () => {
      refetchMappings();
    },
    onError: (error) => {
      alert(error.message || 'Failed to delete taluk mapping');
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
    if (!confirm('Are you sure you want to delete this taluk cluster mapping? This will affect team routing logic.')) {
      return;
    }
    
    deleteMappingMutation.mutate({ id: mappingId });
  };

  // Get unique districts for filtering
  const uniqueDistricts = useMemo(() => {
    const districts = [...new Set(mappings.map(m => m.district))].sort();
    return districts;
  }, [mappings]);

  // Define table columns
  const columns: Column<TalukMappingData>[] = useMemo(() => [
    {
      key: 'location',
      header: 'Taluk Location',
      accessor: 'taluk',
      sortable: true,
      minWidth: 200,
      render: (_, mapping) => (
        <div>
          <div className="text-sm font-medium text-gray-900 flex items-center">
            <Navigation className="w-4 h-4 mr-2 text-gray-400" />
            {mapping.taluk}
          </div>
          <div className="text-sm text-gray-500">{mapping.district}</div>
          <div className="text-xs text-gray-400">{mapping.state}</div>
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
      key: 'clusterVenue',
      header: 'Assigned Cluster Venue',
      accessor: 'clusterVenueMapping.venueName',
      sortable: true,
      minWidth: 250,
      render: (_, mapping) => (
        <div>
          <div className="text-sm font-medium text-gray-900 flex items-center">
            <Building2 className="w-4 h-4 mr-2 text-blue-600" />
            {mapping.clusterVenueMapping.venueName}
          </div>
          <div className="text-sm text-gray-500">
            {mapping.clusterVenueMapping.venueDistrict}, {mapping.clusterVenueMapping.venueState}
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 mt-1">
            <Target className="w-3 h-3 mr-1" />
            Cluster Level
          </span>
        </div>
      ),
    },
    {
      key: 'routing',
      header: 'Routing Priority',
      accessor: 'id',
      minWidth: 140,
      render: (_, mapping) => (
        <div className="flex items-center">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-green-100 text-green-800 mr-2">
            1
          </span>
          <div>
            <div className="text-sm font-medium text-gray-900">Tier 1</div>
            <div className="text-xs text-gray-500">Direct Mapping</div>
          </div>
        </div>
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

  const actionButtons: ActionButton<TalukMappingData>[] = useMemo(() => [
    {
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      onClick: (mapping) => router.push(`/${lang}/admin/taluk-mappings/${mapping.id}`),
      variant: 'secondary'
    },
    {
      label: 'Edit',
      icon: <Edit className="w-4 h-4" />,
      onClick: (mapping) => router.push(`/${lang}/admin/taluk-mappings/${mapping.id}/edit`),
      variant: 'primary'
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: (mapping) => handleDeleteMapping(mapping.id),
      variant: 'danger'
    }
  ], [router, lang]);

  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'event',
      label: 'Event',
      type: 'select',
      options: [
        { label: 'All Events', value: 'all' },
        ...events.map(event => ({ label: event.name, value: event.id }))
      ]
    },
    {
      key: 'district',
      label: 'District',
      type: 'select',
      options: [
        { label: 'All Districts', value: 'all' },
        ...uniqueDistricts.map(district => ({ label: district, value: district }))
      ]
    }
  ], [events, uniqueDistricts]);

  if (authLoading || loading) {
    return <PageLoader title="Loading taluk cluster mappings..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Navigation className="w-16 h-16 text-red-400 mx-auto mb-3" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Unable to load taluk mappings</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const stats = {
    total: mappings.length,
    byState: mappings.reduce((acc, m) => {
      acc[m.state] = (acc[m.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byDistrict: mappings.reduce((acc, m) => {
      acc[m.district] = (acc[m.district] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    uniqueTaluks: new Set(mappings.map(m => m.taluk)).size,
    uniqueDistricts: new Set(mappings.map(m => m.district)).size,
    uniqueVenues: new Set(mappings.map(m => m.clusterVenueMapping.id)).size
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Taluk Cluster Mappings</h1>
          <p className="text-gray-600 text-sm">Tier-1 routing: Direct taluk → cluster venue assignments</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowBulkCreate(true)}
            className="flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Create
          </Button>
          <Button
            variant="primary"
            onClick={() => router.push(`/${lang}/admin/taluk-mappings/create`)}
            className="flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Mapping
          </Button>
        </div>
      </div>

      {/* Routing Explanation */}
      <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3" />
          <div>
            <h3 className="font-semibold text-green-900">Tier-1 Direct Routing</h3>
            <div className="text-sm text-green-700 mt-1">
              <p>Taluk cluster mappings provide the highest priority routing for team venue assignments.</p>
              <p className="mt-1">When a team from a specific taluk registers, they are automatically assigned to their mapped cluster venue (if capacity allows).</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <SingleStatCard
          title="Total Mappings"
          value={stats.total.toString()}
          icon={<Navigation className="w-5 h-5" />}
          color="blue"
        />
        <SingleStatCard
          title="Unique Taluks"
          value={stats.uniqueTaluks.toString()}
          icon={<MapPin className="w-5 h-5" />}
          color="green"
        />
        <SingleStatCard
          title="Districts Covered"
          value={stats.uniqueDistricts.toString()}
          icon={<Building2 className="w-5 h-5" />}
          color="purple"
        />
        <SingleStatCard
          title="Cluster Venues"
          value={stats.uniqueVenues.toString()}
          icon={<Target className="w-5 h-5" />}
          color="orange"
        />
        <SingleStatCard
          title="States"
          value={Object.keys(stats.byState).length.toString()}
          icon={<MapPin className="w-5 h-5" />}
          color="indigo"
        />
        <SingleStatCard
          title="Active Events"
          value={events.filter(e => e.status === 'active').length.toString()}
          icon={<Calendar className="w-5 h-5" />}
          color="red"
        />
      </div>

      <AdvancedTable<TalukMappingData>
        data={mappings}
        columns={columns}
        actionButtons={actionButtons}
        loading={loading}
        
        searchable={true}
        searchPlaceholder="Search taluks, districts, venues..."
        
        filterable={true}
        filters={filterFields}
        
        sortable={true}
        multiSort={true}
        defaultSort={[{ key: 'state', direction: 'asc' }, { key: 'district', direction: 'asc' }, { key: 'taluk', direction: 'asc' }]}
        
        pagination={{ enabled: true, pageSize: 25 }}
        
        selectable={false}
        keyExtractor={(mapping) => mapping.id}
        stickyHeader={true}
        
        persistState={true}
        stateKey="admin-taluk-mappings"
        
        emptyState={{
          icon: Navigation,
          title: 'No taluk mappings found',
          description: 'Create your first taluk cluster mapping to enable Tier-1 routing'
        }}
        
        exportOptions={[
          {
            label: 'Export CSV',
            format: 'csv',
            onExport: () => {
              const csv = [
                ['Event', 'State', 'District', 'Taluk', 'Cluster Venue', 'Venue District', 'Created'].join(','),
                ...mappings.map(m => [
                  m.eventName,
                  m.state,
                  m.district,
                  m.taluk,
                  m.clusterVenueMapping.venueName,
                  m.clusterVenueMapping.venueDistrict,
                  m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ''
                ].join(','))
              ].join('\n');

              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `taluk_cluster_mappings_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }
          }
        ]}
      />
    </div>
  );
}