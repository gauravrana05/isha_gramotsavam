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
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import { 
  Plus,
  MapPin,
  Building,
  CheckCircle,
  Trash2,
} from 'lucide-react';

interface LocationMappingData {
  id: string;
  eventId: string;
  locationType: 'district' | 'taluk';
  locationName: string;
  state: string;
  district: string | null;
  clusterVenueMappingId: string;
  venueLocationMapping: {
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
  createdAt: string;
  updatedAt: string;
}

export default function LocationMappingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = React.use(params);
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();

  // State management
  const [selectedMappings, setSelectedMappings] = useState<Set<string | number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>('');

  // Table state
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: { page: 1, pageSize: 50 },
    sorting: { field: 'locationName', direction: 'asc' },
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
    status: 'ongoing',
  });

  // Get existing location mappings
  const {
    data: locationMappingsData,
    isLoading: mappingsLoading,
    error: mappingsError,
    refetch: refetchMappings
  } = api.admin.mappings.getLocationClusterMappings.useQuery({
    eventId: selectedEvent,
    locationType: tableParams.filters.locationType as 'district' | 'taluk' | undefined,
    state: tableParams.filters.state as string,
    district: tableParams.filters.district as string,
    locationName: tableParams.filters.locationName as string,
  }, {
    enabled: !!selectedEvent,
  });

  // Mutations
  const createMappingMutation = api.admin.mappings.createLocationClusterMapping.useMutation({
    onSuccess: () => {
      addNotification('Location mapping created successfully', 'success');
      setShowCreateModal(false);
      refetchMappings();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to create mapping', 'error');
    },
  });

  const deleteMappingsMutation = api.admin.mappings.deleteLocationClusterMappings.useMutation({
    onSuccess: () => {
      addNotification('Location mappings deleted successfully', 'success');
      setSelectedMappings(new Set());
      refetchMappings();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to delete mappings', 'error');
    },
  });

  // Set default event
  useEffect(() => {
    if (eventsData?.events && eventsData.events.length > 0 && !selectedEvent) {
      setSelectedEvent(eventsData.events[0].id);
    }
  }, [eventsData, selectedEvent]);

  // Memoized data processing
  const mappings = useMemo(() => {
    return locationMappingsData || [];
  }, [locationMappingsData]);

  const loading = authLoading || mappingsLoading;

  // Table columns
  const columns: Column<LocationMappingData>[] = [
    {
      key: 'locationType',
      header: 'Type',
      sortable: true,
      render: (_, mapping) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          mapping.locationType === 'district' 
            ? 'bg-purple-100 text-purple-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {mapping.locationType === 'district' ? 'District' : 'Taluk'}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      sortable: true,
      render: (_, mapping) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{mapping.locationName}</div>
          <div className="text-gray-500">
            {mapping.locationType === 'taluk' && mapping.district && `${mapping.district}, `}
            {mapping.state}
          </div>
        </div>
      ),
    },
    {
      key: 'venue',
      header: 'Assigned Cluster Venue',
      render: (_, mapping) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{mapping.venueLocationMapping.venue.name}</div>
          <div className="text-gray-500">{mapping.venueLocationMapping.venue.address}</div>
          <div className="text-gray-500">
            {mapping.venueLocationMapping.venue.district}, {mapping.venueLocationMapping.venue.state}
          </div>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Max Teams',
      render: (_, mapping) => (
        <div className="text-sm text-gray-900">
          {mapping.venueLocationMapping.maxTeams}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, mapping) => (
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
      key: 'locationType',
      label: 'Location Type',
      type: 'select',
      options: [
        { value: '', label: 'All Types' },
        { value: 'district', label: 'District' },
        { value: 'taluk', label: 'Taluk' },
      ],
    },
    {
      key: 'state',
      label: 'State',
      type: 'text',
      placeholder: 'Filter by state...',
    },
    {
      key: 'district',
      label: 'District',
      type: 'text',
      placeholder: 'Filter by district...',
    },
    {
      key: 'locationName',
      label: 'Location Name',
      type: 'text',
      placeholder: 'Filter by location name...',
    },
  ];

  // Header actions
  const headerActions = (
    <div className="flex items-center space-x-3">
      <button
        onClick={() => setShowCreateModal(true)}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        disabled={!selectedEvent || loading}
      >
        <Plus className="w-4 h-4 mr-2" />
        Map Locations
      </button>

      {selectedMappings.size > 0 && (
        <button
          onClick={() => {
            if (confirm(`Delete ${selectedMappings.size} mapping(s)?`)) {
              deleteMappingsMutation.mutate({
                mappingIds: Array.from(selectedMappings) as string[],
              });
            }
          }}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          disabled={deleteMappingsMutation.isPending}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete ({selectedMappings.size})
        </button>
      )}
    </div>
  );

  // Row actions
  const getRowActions = (mapping: LocationMappingData) => [
    {
      label: 'Delete',
      onClick: () => {
        if (confirm('Delete this mapping?')) {
          deleteMappingsMutation.mutate({
            mappingIds: [mapping.id],
          });
        }
      },
      icon: Trash2,
      className: 'text-red-600 hover:text-red-700',
    },
  ];

  if (loading && !selectedEvent) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdvancedTable<LocationMappingData>
          data={(mappings || []) as LocationMappingData[]}
          columns={columns}
          loading={loading}
          error={mappingsError?.message}
          tableParams={tableParams}
          onTableParamsChange={setTableParams}
          selectedRows={selectedMappings}
          onSelectedRowsChange={setSelectedMappings}
          filterFields={filterFields}
          headerActions={headerActions}
          getRowActions={getRowActions}
          emptyState={{
            icon: MapPin,
            title: 'No mappings found',
            description: selectedEvent ? 'No location mappings found for the selected filters.' : 'Please select an event to view location mappings.',
          }}
          searchable
          searchPlaceholder="Search locations, venues, or addresses..."
        />

        {/* Create Mapping Modal */}
        {showCreateModal && (
          <EnhancedModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            title="Map Taluk to Cluster Venue"
            subtitle="Assign taluks to cluster venues"
            size="lg"
            footer={
              <div className="flex flex-row space-x-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  disabled={createMappingMutation.isPending}
                >
                  Cancel
                </button>
              </div>
            }
          >
            <div className="space-y-6">
              {pendingLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading pending taluks...</p>
                </div>
              ) : pendingTaluksData && pendingTaluksData.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Pending Taluk Mappings</h4>
                  <p className="text-sm text-gray-600">Districts with multiple cluster venues need taluk-level mapping</p>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {pendingTaluksData.map((pendingTaluk, index) => (
                      <div key={`${pendingTaluk.state}-${pendingTaluk.district}-${pendingTaluk.taluk}`} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-medium text-gray-900">{pendingTaluk.taluk}</h5>
                            <p className="text-sm text-gray-600">{pendingTaluk.district}, {pendingTaluk.state}</p>
                          </div>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            Pending
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Available Cluster Venues:</p>
                          {pendingTaluk.availableVenues.map((venue) => (
                            <button
                              key={venue.id}
                              onClick={() => {
                                createMappingMutation.mutate({
                                  eventId: selectedEvent,
                                  district: pendingTaluk.district,
                                  state: pendingTaluk.state,
                                  taluk: pendingTaluk.taluk,
                                  clusterVenueMappingId: venue.id,
                                });
                              }}
                              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
                              disabled={createMappingMutation.isPending}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-gray-900">{venue.venue.name}</p>
                                  <p className="text-sm text-gray-600">{venue.venue.address}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Max: {venue.maxTeams}</p>
                                  <p className="text-xs text-gray-500">teams</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>All taluks are already mapped to cluster venues for this event.</p>
                </div>
              )}
            </div>
          </EnhancedModal>
        )}

        {/* View Mapping Modal */}
        {showViewModal && selectedMapping && (
          <EnhancedModal
            isOpen={showViewModal}
            onClose={() => {
              setShowViewModal(false);
              setSelectedMapping(null);
            }}
            title="Mapping Details"
            subtitle={`${selectedMapping.taluk} → ${selectedMapping.venueLocationMapping.venue.name}`}
            size="lg"
          >
            <div className="space-y-6">
              {/* Location Information */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-4">Taluk Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Taluk</label>
                    <p className="text-sm text-gray-900">{selectedMapping.taluk}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                    <p className="text-sm text-gray-900">{selectedMapping.district}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <p className="text-sm text-gray-900">{selectedMapping.state}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-green-600 text-sm font-medium">Mapped</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Venue Information */}
              <div className="bg-blue-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-4">Assigned Cluster Venue</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name</label>
                    <p className="text-sm text-gray-900">{selectedMapping.venueLocationMapping.venue.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <p className="text-sm text-gray-900">{selectedMapping.venueLocationMapping.venue.address}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue Location</label>
                    <p className="text-sm text-gray-900">
                      {selectedMapping.venueLocationMapping.venue.district}, {selectedMapping.venueLocationMapping.venue.state}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tournament Level</label>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      Cluster
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Teams</label>
                    <p className="text-sm text-gray-900">{selectedMapping.venueLocationMapping.maxTeams}</p>
                  </div>
                </div>
              </div>
            </div>
          </EnhancedModal>
        )}
      </div>
    </div>
  );
}
