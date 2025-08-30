'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/server/trpc/react';
import { 
  AdvancedTable,
  PageLoader,
  type Column,
  type FilterField,
  type TableParams,
} from '@/components/ui';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import { 
  Plus,
  MapPin,
  Building,
  CheckCircle,
  Trash2,
  ArrowRight,
} from 'lucide-react';

interface ClusterDivisionMappingData {
  id: string;
  eventId: string;
  clusterVenueMappingId: string;
  divisionVenueMappingId: string;
  clusterVenueMapping: {
    id: string;
    venue: {
      id: string;
      name: string;
      district: string;
      state: string;
      address: string;
    };
    level: 'cluster';
    maxTeams: number;
  };
  divisionVenueMapping: {
    id: string;
    venue: {
      id: string;
      name: string;
      district: string;
      state: string;
      address: string;
    };
    level: 'division';
    maxTeams: number;
  };
}

export default function ClusterDivisionMappingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = React.use(params);
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();

  // State management
  const [selectedMappings, setSelectedMappings] = useState<Set<string | number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<ClusterDivisionMappingData | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>('');

  // Table state
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: { page: 1, pageSize: 50 },
    sorting: { field: 'clusterVenueMapping', direction: 'asc' },
    filters: {},
  });

  // Auth check
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push(`/${lang}/auth/login`);
    }
  }, [user, userProfile, authLoading, router, lang]);

  // Get events
  const { data: eventsData } = api.admin.events.getEvents.useQuery({
    limit: 100,
    status: 'upcoming',
  });

  // Set default event
  useEffect(() => {
    if (eventsData?.events && eventsData.events.length > 0 && !selectedEvent) {
      setSelectedEvent(eventsData.events[0].id);
    }
  }, [eventsData, selectedEvent]);

  const loading = authLoading;

  // Table columns
  const columns: Column<ClusterDivisionMappingData>[] = [
    {
      key: 'clusterVenue',
      header: 'Cluster Venue',
      sortable: true,
      render: (_, mapping) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{mapping.clusterVenueMapping.venue.name}</div>
          <div className="text-gray-500">{mapping.clusterVenueMapping.venue.address}</div>
          <div className="text-gray-500">
            {mapping.clusterVenueMapping.venue.district}, {mapping.clusterVenueMapping.venue.state}
          </div>
        </div>
      ),
    },
    {
      key: 'mapping',
      header: 'Mapping',
      render: () => (
        <div className="flex items-center justify-center">
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </div>
      ),
    },
    {
      key: 'divisionVenue',
      header: 'Division Venue',
      render: (_, mapping) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{mapping.divisionVenueMapping.venue.name}</div>
          <div className="text-gray-500">{mapping.divisionVenueMapping.venue.address}</div>
          <div className="text-gray-500">
            {mapping.divisionVenueMapping.venue.district}, {mapping.divisionVenueMapping.venue.state}
          </div>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      render: (_, mapping) => (
        <div className="text-sm">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              C: {mapping.clusterVenueMapping.maxTeams}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              D: {mapping.divisionVenueMapping.maxTeams}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: () => (
        <div className="flex items-center">
          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
          <span className="text-green-600 text-sm font-medium">Mapped</span>
        </div>
      ),
    },
  ];

  // Filter fields
  const filterFields: FilterField[] = [
    {
      key: 'clusterDistrict',
      label: 'Cluster District',
      type: 'text',
      placeholder: 'Filter by cluster district...',
    },
    {
      key: 'divisionDistrict',
      label: 'Division District',
      type: 'text',
      placeholder: 'Filter by division district...',
    },
  ];

  // Header actions
  const headerActions = (
    <div className="flex items-center space-x-3">
      <select
        value={selectedEvent}
        onChange={(e) => setSelectedEvent(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      >
        <option value="">Select Event</option>
        {eventsData?.events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.name}
          </option>
        ))}
      </select>

      <button
        onClick={() => setShowCreateModal(true)}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        disabled={!selectedEvent || loading}
      >
        <Plus className="w-4 h-4 mr-2" />
        Map Cluster to Division
      </button>
    </div>
  );

  if (loading && !selectedEvent) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdvancedTable<ClusterDivisionMappingData>
          data={[]}
          columns={columns}
          loading={loading}
          tableParams={tableParams}
          onTableParamsChange={setTableParams}
          selectedRows={selectedMappings}
          onSelectedRowsChange={setSelectedMappings}
          filterFields={filterFields}
          headerActions={headerActions}
          title="Cluster to Division Venue Mapping"
          subtitle="Map cluster venues to division venues for tournament progression"
          emptyState={{
            icon: MapPin,
            title: 'No mappings found',
            description: selectedEvent ? 'No cluster-division mappings found for the selected event and filters.' : 'Please select an event to view cluster-division mappings.',
          }}
          searchable
          searchPlaceholder="Search cluster venues, division venues, or locations..."
        />

        {/* Create Mapping Modal */}
        {showCreateModal && (
          <EnhancedModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            title="Map Cluster to Division Venue"
            subtitle="Assign cluster venues to division venues for tournament progression"
            size="lg"
          >
            <div className="space-y-6">
              <div className="text-center py-8 text-gray-500">
                <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Cluster-Division mapping functionality will be implemented based on the tournament logic.</p>
              </div>
            </div>
          </EnhancedModal>
        )}
      </div>
    </div>
  );
}
