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
  XCircle,
  Clock,
  Edit,
  Trash2,
} from 'lucide-react';

interface TalukMappingData {
  id: string;
  eventId: string;
  district: string;
  state: string;
  taluk: string;
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
    level: 'cluster' | 'division' | 'final';
    maxTeams: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface PendingTaluk {
  state: string;
  district: string;
  taluk: string;
  availableVenues: {
    id: string;
    venue: {
      id: string;
      name: string;
      address: string;
    };
    maxTeams: number;
  }[];
}

export default function LocationMappingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = React.use(params);
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();

  // State management
  const [selectedMappings, setSelectedMappings] = useState<Set<string | number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<TalukMappingData | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<'cluster' | 'division' | 'final'>('cluster');
  const [isEditMode, setIsEditMode] = useState(false);

  // Table state
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: { page: 1, pageSize: 50 },
    sorting: { field: 'district', direction: 'asc' },
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

  // Get existing taluk mappings
  const {
    data: talukMappingsData,
    isLoading: mappingsLoading,
    error: mappingsError,
    refetch: refetchMappings
  } = api.admin.mappings.getTalukClusterMappings.useQuery({
    eventId: selectedEvent,
    district: tableParams.filters.district as string,
    state: tableParams.filters.state as string,
  }, {
    enabled: !!selectedEvent,
  });

  // Get pending taluks for mapping
  const {
    data: pendingTaluksData,
    isLoading: pendingLoading,
  } = api.admin.mappings.getPendingTalukMappings.useQuery({
    eventId: selectedEvent,
    level: selectedLevel,
  }, {
    enabled: !!selectedEvent,
  });

  // Mutations
  const createMappingMutation = api.admin.mappings.createTalukClusterMapping.useMutation({
    onSuccess: () => {
      addNotification('Taluk mapping created successfully', 'success');
      setShowCreateModal(false);
      refetchMappings();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to create mapping', 'error');
    },
  });

  const updateMappingMutation = api.admin.mappings.updateTalukClusterMapping.useMutation({
    onSuccess: () => {
      addNotification('Taluk mapping updated successfully', 'success');
      setShowViewModal(false);
      setIsEditMode(false);
      setSelectedMapping(null);
      refetchMappings();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to update mapping', 'error');
    },
  });

  const deleteMappingsMutation = api.admin.mappings.deleteTalukClusterMappings.useMutation({
    onSuccess: () => {
      addNotification('Taluk mappings deleted successfully', 'success');
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
    return talukMappingsData || [];
  }, [talukMappingsData]);

  const loading = authLoading || mappingsLoading;

  // Table columns
  const columns: Column<TalukMappingData>[] = [
    {
      key: 'location',
      header: 'Location',
      sortable: true,
      render: (_, mapping) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{mapping.taluk}</div>
          <div className="text-gray-500">{mapping.district}, {mapping.state}</div>
        </div>
      ),
    },
    {
      key: 'venue',
      header: 'Assigned Venue',
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
      key: 'level',
      header: 'Level',
      render: (_, mapping) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          mapping.venueLocationMapping.level === 'cluster' ? 'bg-blue-100 text-blue-700' :
          mapping.venueLocationMapping.level === 'division' ? 'bg-green-100 text-green-700' :
          'bg-purple-100 text-purple-700'
        }`}>
          {mapping.venueLocationMapping.level.charAt(0).toUpperCase() + mapping.venueLocationMapping.level.slice(1)}
        </span>
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

      <select
        value={selectedLevel}
        onChange={(e) => setSelectedLevel(e.target.value as 'cluster' | 'division' | 'final')}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      >
        <option value="cluster">Cluster Level</option>
        <option value="division">Division Level</option>
        <option value="final">Final Level</option>
      </select>

      <button
        onClick={() => setShowCreateModal(true)}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        disabled={!selectedEvent || loading}
      >
        <Plus className="w-4 h-4 mr-2" />
        Map Taluk
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
  const getRowActions = (mapping: TalukMappingData) => [
    {
      label: 'View Details',
      onClick: () => {
        setSelectedMapping(mapping);
        setShowViewModal(true);
      },
      icon: MapPin,
    },
    {
      label: 'Edit Mapping',
      onClick: () => {
        setSelectedMapping(mapping);
        setIsEditMode(true);
        setShowViewModal(true);
      },
      icon: Edit,
    },
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
        <AdvancedTable<TalukMappingData>
          data={(mappings || []) as TalukMappingData[]}
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
          title="Location Mapping"
          subtitle="Map taluks to cluster venues for tournament organization"
          emptyState={{
            icon: MapPin,
            title: 'No mappings found',
            description: selectedEvent ? 'No taluk mappings found for the selected event and filters.' : 'Please select an event to view location mappings.',
          }}
          searchable
          searchPlaceholder="Search taluks, venues, or locations..."
        />

        {/* Create Mapping Modal */}
        {showCreateModal && (
          <EnhancedModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            title="Create Taluk Mapping"
            subtitle="Map a taluk to a cluster venue"
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
                          <p className="text-sm font-medium text-gray-700">Available Venues:</p>
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
                  <p>All taluks are already mapped for this event.</p>
                </div>
              )}
            </div>
          </EnhancedModal>
        )}

        {/* View/Edit Mapping Modal */}
        {showViewModal && selectedMapping && (
          <EnhancedModal
            isOpen={showViewModal}
            onClose={() => {
              setShowViewModal(false);
              setIsEditMode(false);
              setSelectedMapping(null);
            }}
            title={isEditMode ? "Edit Mapping" : "Mapping Details"}
            subtitle={`${selectedMapping.taluk} - ${selectedMapping.district}`}
            size="lg"
            footer={
              isEditMode ? (
                <div className="flex flex-row space-x-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditMode(false);
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    disabled={updateMappingMutation.isPending}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <Edit className="w-4 h-4 mr-2 inline" />
                    Edit Mapping
                  </button>
                </div>
              )
            }
          >
            <div className="space-y-6">
              {/* Location Information */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-4">Location Information</h4>
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
              <div className="bg-green-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-4">Assigned Venue</h4>
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
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedMapping.venueLocationMapping.level === 'cluster' ? 'bg-blue-100 text-blue-700' :
                      selectedMapping.venueLocationMapping.level === 'division' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {selectedMapping.venueLocationMapping.level.charAt(0).toUpperCase() + selectedMapping.venueLocationMapping.level.slice(1)}
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
