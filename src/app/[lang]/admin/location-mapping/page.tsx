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
import { LocationMappingData } from '@/lib/types';
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

export default function LocationMappingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = React.use(params);
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();

  // State management
  const [selectedMappings, setSelectedMappings] = useState<Set<string | number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<LocationMappingData | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>('');

  // Table state
  const [tableParams, setTableParams] = useState<TableParams>({
    page: 1,
    pageSize: 50,
    filters: [],
    search: '',
    sort: { field: 'locationName', direction: 'asc' },
  });

  // Auth check
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push(`/${lang}/auth/login`);
    }
  }, [user, userProfile, authLoading, router, lang]);

  // Get events (ongoing = registration_open, registration_closed, active)
  const { data: eventsData, isLoading: eventsLoading } = api.admin.events.getEvents.useQuery({
    limit: 1,
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
    locationType: undefined,
    state: '',
    district: '',
    locationName: '',
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

  // Set default event (always use first ongoing event)
  useEffect(() => {
    console.log('Events data:', eventsData);
    if (eventsData?.events && eventsData.events.length > 0) {
      console.log('Setting selectedEvent to:', eventsData.events[0].id);
      setSelectedEvent(eventsData.events[0].id);
    } else {
      console.log('No events found or events data is empty');
    }
  }, [eventsData]);

  console.log('Parent selectedEvent:', selectedEvent);

  // Memoized data processing
  const mappings = useMemo(() => {
    return locationMappingsData || [];
  }, [locationMappingsData]);

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
          <div className="font-medium text-gray-900">{mapping.venueLocationMapping?.venue.name || 'N/A'}</div>
          <div className="text-gray-500">{mapping.venueLocationMapping?.venue.address || 'N/A'}</div>
          <div className="text-gray-500">
            {mapping.venueLocationMapping?.venue.district || 'N/A'}, {mapping.venueLocationMapping?.venue.state || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Max Teams',
      render: (_, mapping) => (
        <div className="text-sm text-gray-900">
          {mapping.venueLocationMapping?.maxTeams || 'N/A'}
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
        disabled={eventsLoading || mappingsLoading}
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

  if (authLoading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Explanation Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <MapPin className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Location Cluster Mappings</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Map districts and taluks to cluster venues for tournament organization. Each location can be assigned to a specific cluster venue where teams from that area will compete.
                </p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li><strong>District Mapping:</strong> Assign entire districts to cluster venues</li>
                  <li><strong>Taluk Mapping:</strong> Assign specific taluks within districts to cluster venues</li>
                  <li><strong>Venue Assignment:</strong> Teams from mapped locations will compete at the assigned cluster venue</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <AdvancedTable<LocationMappingData>
          data={(mappings || []) as LocationMappingData[]}
          columns={columns}
          loading={eventsLoading || mappingsLoading}
          selectedRows={selectedMappings}
          onSelectedRowsChange={setSelectedMappings}
          filterFields={filterFields}
          headerActions={headerActions}
          getRowActions={getRowActions}
          onRowClick={(mapping) => {
            setSelectedMapping(mapping);
            setShowEditModal(true);
          }}
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
          <CreateLocationMappingModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            selectedEvent={selectedEvent}
            onSuccess={() => {
              refetchMappings();
              setShowCreateModal(false);
            }}
          />
        )}

        {/* Edit Mapping Modal */}
        {showEditModal && selectedMapping && (
          <EditLocationMappingModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedMapping(null);
            }}
            mapping={selectedMapping}
            selectedEvent={selectedEvent}
            onSuccess={() => {
              refetchMappings();
              setShowEditModal(false);
              setSelectedMapping(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Create Location Mapping Modal Component
interface CreateLocationMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: string;
  onSuccess: () => void;
}

function CreateLocationMappingModal({ isOpen, onClose, selectedEvent, onSuccess }: CreateLocationMappingModalProps) {
  const { addNotification } = useNotification();
  const [locationType, setLocationType] = useState<'district' | 'taluk'>('district');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>('');

  // Get cluster venues for the event - filtered by district for taluk mapping
  const { data: venuesData, isLoading: venuesLoading, error: venuesError } = api.admin.venues.getVenueLevelMappings.useQuery({
    eventId: selectedEvent,
    level: 'cluster',
    district: locationType === 'taluk' ? selectedDistrict : undefined, // Only filter by district for taluk mapping
  }, {
    enabled: !!selectedEvent && !!selectedState && (locationType === 'district' || (locationType === 'taluk' && !!selectedDistrict)),
  });

  console.log('Modal selectedEvent:', selectedEvent);
  console.log('Modal venuesData:', venuesData);

  // Get all current mappings to filter out already mapped locations and venues
  const { data: allMappingsData } = api.admin.mappings.getLocationClusterMappings.useQuery({
    eventId: selectedEvent,
  }, {
    enabled: !!selectedEvent,
  });

  // Get states, districts, taluks from location service
  const { data: statesData } = api.location.getStates.useQuery();
  const { data: districtsData } = api.location.getDistricts.useQuery({
    state: selectedState,
  }, {
    enabled: !!selectedState,
  });
  const { data: taluksData } = api.location.getTaluks.useQuery({
    state: selectedState,
    district: selectedDistrict,
  }, {
    enabled: locationType === 'taluk' && !!selectedState && !!selectedDistrict,
  });

  // Create mapping mutation
  const createMappingMutation = api.admin.mappings.createLocationClusterMapping.useMutation({
    onSuccess: () => {
      addNotification('Location mappings created successfully', 'success');
      onSuccess();
      resetForm();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to create mappings', 'error');
    },
  });

  const resetForm = () => {
    setLocationType('district');
    setSelectedState('');
    setSelectedDistrict('');
    setSelectedLocations([]);
    setSelectedVenue('');
  };

  const handleSubmit = () => {
    if (!selectedState || selectedLocations.length === 0 || !selectedVenue) {
      addNotification('Please fill all required fields', 'error');
      return;
    }

    if (locationType === 'taluk' && !selectedDistrict) {
      addNotification('Please select a district for taluk mapping', 'error');
      return;
    }

    createMappingMutation.mutate({
      eventId: selectedEvent,
      locationType,
      locationNames: selectedLocations,
      state: selectedState,
      district: locationType === 'taluk' ? selectedDistrict : undefined,
      clusterVenueMappingId: selectedVenue,
    });
  };

  // Prepare options for MultiSelect
  const locationOptions = locationType === 'district' 
    ? (districtsData || []).map(d => ({ value: d, label: d }))
    : (taluksData || []).map(t => ({ value: t, label: t }));

  // Location options for MultiSelect - filtered to exclude already mapped locations
  const availableLocationOptions = useMemo(() => {
    if (!allMappingsData) return [];
    
    // Get already mapped locations for current event
    const mappedLocations = allMappingsData.map(m => m.locationName);
    
    if (locationType === 'district') {
      return (districtsData || [])
        .filter(district => !mappedLocations.includes(district.name))
        .map(district => ({
          label: district?.name || district || 'Unknown',
          value: district?.name || district || 'Unknown'
        }));
    } else {
      return (taluksData || [])
        .filter(taluk => !mappedLocations.includes(taluk.name))
        .map(taluk => ({
          label: taluk?.name || taluk || 'Unknown',
          value: taluk?.name || taluk || 'Unknown'
        }));
    }
  }, [locationType, districtsData, taluksData, allMappingsData]);

  // Filtered venues based on availability and state (for district mapping)
  const availableVenues = useMemo(() => {
    if (!venuesData || !allMappingsData) return [];
    
    // Get already used venue IDs for current event
    const usedVenueIds = allMappingsData.map(m => m.venueLocationMapping.venue.id);
    
    return venuesData.filter(venueMapping => {
      const venue = venueMapping.venue;
      
      // Check if venue is already used
      const isVenueUsed = usedVenueIds.includes(venue.id);
      
      // For district mapping, filter by state (since API doesn't support state filtering)
      let stateMatch = true;
      if (locationType === 'district' && selectedState) {
        stateMatch = venue.state === selectedState;
      }
      
      return !isVenueUsed && stateMatch;
    });
  }, [venuesData, allMappingsData, locationType, selectedState]);

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Map Locations to Cluster Venue"
      subtitle="Create bulk location mappings"
      size="lg"
      mobileFullScreen={true}
      scrollableBody={true}
      className="sm:max-h-[90vh]"
      footer={
        <div className="flex flex-row space-x-3 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={createMappingMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-[#F28C38] rounded-lg hover:bg-[#E67A26] disabled:bg-gray-400"
            disabled={createMappingMutation.isPending || !selectedState || selectedLocations.length === 0 || !selectedVenue}
          >
            {createMappingMutation.isPending ? 'Creating...' : `Create ${selectedLocations.length} Mapping(s)`}
          </button>
        </div>
      }
    >
      <div className="space-y-6 sm:min-h-[90vh] scrollbar-none">
        {/* Location Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Location Type</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="district"
                checked={locationType === 'district'}
                onChange={(e) => {
                  setLocationType(e.target.value as 'district');
                  setSelectedDistrict('');
                  setSelectedLocations([]);
                }}
                className="mr-2"
              />
              District Mapping
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="taluk"
                checked={locationType === 'taluk'}
                onChange={(e) => {
                  setLocationType(e.target.value as 'taluk');
                  setSelectedLocations([]);
                }}
                className="mr-2"
              />
              Taluk Mapping
            </label>
          </div>
        </div>

        {/* State Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {(statesData || []).map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* District Selection (for taluk mapping) */}
        {locationType === 'taluk' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">District *</label>
            <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
              <SelectTrigger>
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                {(districtsData || []).map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Location Multi-Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {locationType === 'district' ? 'Districts' : 'Taluks'} *
          </label>
          <MultiSelect
            options={availableLocationOptions}
            value={selectedLocations}
            onValueChange={setSelectedLocations}
            placeholder={`Select ${locationType}s...`}
            disabled={!selectedState || (locationType === 'taluk' && !selectedDistrict)}
          />
          <div className="text-xs text-gray-500 mt-1">
            Only showing {locationType}s that are not already mapped to other venues
          </div>
        </div>

        {/* Venue Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cluster Venue *</label>
          {venuesLoading ? (
            <div className="px-3 py-2 border border-gray-300 rounded-lg">
              <div className="animate-pulse flex items-center space-x-2">
                <div className="h-4 bg-gray-200 rounded w-4"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
              </div>
            </div>
          ) : venuesError ? (
            <div className="px-3 py-2 border border-red-300 rounded-lg text-red-500">
              Error loading venues: {venuesError.message}
            </div>
          ) : (
            <Select value={selectedVenue} onValueChange={setSelectedVenue}>
              <SelectTrigger>
                <SelectValue placeholder="Select cluster venue" />
              </SelectTrigger>
              <SelectContent>
                {availableVenues.length === 0 ? (
                  <SelectItem value="no-venues" disabled>
                    {locationType === 'district' 
                      ? !selectedState
                        ? 'Select state first to see available venues'
                        : `No available cluster venues in ${selectedState}`
                      : !selectedDistrict 
                        ? 'Select district first to see available venues'
                        : `No available cluster venues in ${selectedDistrict}, ${selectedState}`
                    }
                  </SelectItem>
                ) : (
                  availableVenues.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.venue.name} - {venue.venue.district}, {venue.venue.state}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
          <div className="text-xs text-gray-500 mt-1">
            {locationType === 'district' 
              ? selectedState 
                ? `Venues in ${selectedState} that are not already mapped`
                : 'Select state first to see available venues'
              : selectedDistrict 
                ? `Venues in ${selectedDistrict}, ${selectedState} that are not already mapped`
                : 'Select district first to see available venues'
            }
          </div>
        </div>

        {/* Summary */}
        {selectedLocations.length > 0 && selectedVenue && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Mapping Summary</h4>
            <p className="text-sm text-blue-800">
              Creating {selectedLocations.length} {locationType} mapping(s) to the selected cluster venue.
            </p>
            <div className="mt-2 text-xs text-blue-700">
              Selected {locationType}s: {selectedLocations.join(', ')}
            </div>
          </div>
        )}
      </div>
    </EnhancedModal>
  );
}

// Edit Location Mapping Modal Component
interface EditLocationMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapping: LocationMappingData;
  selectedEvent: string;
  onSuccess: () => void;
}

function EditLocationMappingModal({ isOpen, onClose, mapping, selectedEvent, onSuccess }: EditLocationMappingModalProps) {
  const { addNotification } = useNotification();
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // State for form data - initialize with current mapping data
  const [locationType, setLocationType] = useState<'district' | 'taluk'>(mapping.locationType);
  const [selectedState, setSelectedState] = useState<string>(mapping.state || '');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(mapping.district || '');
  const [selectedVenue, setSelectedVenue] = useState<string>(mapping.venueLocationMapping.venue.id || '');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([mapping.locationName]);

  // Get all current mappings to find related locations
  const { data: allMappingsData } = api.admin.mappings.getLocationClusterMappings.useQuery({
    eventId: selectedEvent,
  }, {
    enabled: !!selectedEvent && isEditMode,
  });

  // Update selectedLocations when entering edit mode to show all related locations
  useEffect(() => {
    if (allMappingsData && isEditMode) {
      // Find all mappings with the same venue, location type, and state
      const relatedLocations = allMappingsData
        .filter(m => 
          m.venueLocationMapping.venue.id === mapping.venueLocationMapping.venue.id &&
          m.locationType === mapping.locationType && 
          m.state === mapping.state &&
          (mapping.locationType === 'district' || m.district === mapping.district)
        )
        .map(m => m.locationName);
      
      if (relatedLocations.length > 0) {
        setSelectedLocations(relatedLocations);
      }
    }
  }, [allMappingsData, isEditMode, mapping]);

  // Reset form data when entering edit mode
  useEffect(() => {
    if (isEditMode) {
      console.log('Entering edit mode, setting form data:', {
        locationType: mapping.locationType,
        state: mapping.state,
        district: mapping.district,
        venueId: mapping.venueLocationMapping.venue.id
      });
      setLocationType(mapping.locationType);
      setSelectedState(mapping.state || '');
      setSelectedDistrict(mapping.district || '');
      setSelectedVenue(mapping.venueLocationMapping.venue.id || '');
    }
  }, [isEditMode, mapping]);

  // Get cluster venues for the event - filtered by district for taluk mapping
  const { data: venuesData, isLoading: venuesLoading, error: venuesError } = api.admin.venues.getVenueLevelMappings.useQuery({
    eventId: selectedEvent,
    level: 'cluster',
    district: locationType === 'taluk' ? selectedDistrict : undefined, // Only filter by district for taluk mapping
  }, {
    enabled: !!selectedEvent && !!selectedState && (locationType === 'district' || (locationType === 'taluk' && !!selectedDistrict)),
  });

  // Get states, districts, taluks from location service
  const { data: statesData } = api.location.getStates.useQuery();
  const { data: districtsData } = api.location.getDistricts.useQuery({
    state: selectedState,
  }, {
    enabled: !!selectedState,
  });
  const { data: taluksData } = api.location.getTaluks.useQuery({
    state: selectedState,
    district: selectedDistrict,
  }, {
    enabled: !!selectedState && !!selectedDistrict,
  });

  // Location options for MultiSelect - filtered to exclude already mapped locations
  const availableLocationOptions = useMemo(() => {
    if (!allMappingsData) return [];
    
    // Get already mapped locations for current event
    const mappedLocations = allMappingsData.map(m => m.locationName);
    
    if (locationType === 'district') {
      return (districtsData || [])
        .filter(district => !mappedLocations.includes(district.name))
        .map(district => ({
          label: district?.name || district || 'Unknown',
          value: district?.name || district || 'Unknown'
        }));
    } else {
      return (taluksData || [])
        .filter(taluk => !mappedLocations.includes(taluk.name))
        .map(taluk => ({
          label: taluk?.name || taluk || 'Unknown',
          value: taluk?.name || taluk || 'Unknown'
        }));
    }
  }, [locationType, districtsData, taluksData, allMappingsData]);

  // Filtered venues based on availability and state (for district mapping)
  const availableVenues = useMemo(() => {
    if (!venuesData || !allMappingsData) return [];
    
    // Get already used venue IDs for current event
    const usedVenueIds = allMappingsData.map(m => m.venueLocationMapping.venue.id);
    
    return venuesData.filter(venueMapping => {
      const venue = venueMapping.venue;
      
      // Check if venue is already used
      const isVenueUsed = usedVenueIds.includes(venue.id);
      
      // For district mapping, filter by state (since API doesn't support state filtering)
      let stateMatch = true;
      if (locationType === 'district' && selectedState) {
        stateMatch = venue.state === selectedState;
      }
      
      return !isVenueUsed && stateMatch;
    });
  }, [venuesData, allMappingsData, locationType, selectedState]);

  // Location options for MultiSelect - filtered to exclude already mapped locations
  const locationOptions = useMemo(() => {
    if (!allMappingsData) return [];
    
    // Get already mapped locations for current event (excluding current mapping if editing)
    const mappedLocations = allMappingsData
      .filter(m => m.id !== mapping?.id) // Exclude current mapping when editing
      .map(m => m.locationName);
    
    let availableLocations = [];
    if (locationType === 'district') {
      availableLocations = (districtsData || [])
        .filter(district => !mappedLocations.includes(district.name))
        .map(district => ({
          label: district?.name || district || 'Unknown',
          value: district?.name || district || 'Unknown'
        }));
    } else {
      availableLocations = (taluksData || [])
        .filter(taluk => !mappedLocations.includes(taluk.name))
        .map(taluk => ({
          label: taluk?.name || taluk || 'Unknown',
          value: taluk?.name || taluk || 'Unknown'
        }));
    }

    // When editing, always include currently selected locations
    if (isEditMode && selectedLocations.length > 0) {
      selectedLocations.forEach(location => {
        if (!availableLocations.find(opt => opt.value === location)) {
          availableLocations.push({
            label: location,
            value: location
          });
        }
      });
    }

    return availableLocations;
  }, [locationType, districtsData, taluksData, allMappingsData, mapping?.id, isEditMode, selectedLocations]);

  // Filtered venues based on availability and state (for district mapping)
  const filteredVenues = useMemo(() => {
    if (!venuesData || !allMappingsData) return [];
    
    // Get already used venue IDs for current event (excluding current mapping if editing)
    const usedVenueIds = allMappingsData
      .filter(m => m.id !== mapping?.id) // Allow keeping same venue when editing
      .map(m => m.venueLocationMapping.venue.id);
    
    const availableVenues = venuesData.filter(venueMapping => {
      const venue = venueMapping.venue;
      
      // Check if venue is already used (exclude current mapping's venue)
      const isVenueUsed = usedVenueIds.includes(venue.id);
      
      // For district mapping, filter by state (since API doesn't support state filtering)
      let stateMatch = true;
      if (locationType === 'district' && selectedState) {
        stateMatch = venue.state === selectedState;
      }
      
      return !isVenueUsed && stateMatch;
    });

    // When editing, always include the current venue even if it doesn't match location filters
    if (isEditMode && mapping && selectedVenue) {
      const currentVenue = venuesData.find(v => v.venueId === selectedVenue);
      if (currentVenue && !availableVenues.find(v => v.venueId === selectedVenue)) {
        availableVenues.unshift(currentVenue); // Add current venue at the beginning
      }
    }

    return availableVenues;
  }, [venuesData, allMappingsData, mapping?.id, isEditMode, selectedVenue, locationType, selectedState]);

  // Delete and recreate mapping mutation (since there's no update API)
  const deleteMappingMutation = api.admin.mappings.deleteLocationClusterMapping.useMutation();
  const createMappingMutation = api.admin.mappings.createLocationClusterMapping.useMutation({
    onSuccess: () => {
      addNotification('Location mapping updated successfully', 'success');
      setIsEditMode(false);
      onSuccess();
    },
    onError: (error) => {
      console.error('Error updating mapping:', error);
      const errorMessage = error.message || 'Failed to update mapping. Please try again.';
      addNotification(errorMessage, 'error');
    },
  });

  // Delete all related mappings mutation
  const deleteAllMappingsMutation = api.admin.mappings.deleteLocationClusterMapping.useMutation({
    onSuccess: () => {
      addNotification('All related mappings deleted successfully', 'success');
      setShowDeleteConfirm(false);
      onSuccess();
    },
    onError: (error) => {
      console.error('Error deleting mappings:', error);
      const errorMessage = error.message || 'Failed to delete mappings. Please try again.';
      addNotification(errorMessage, 'error');
    },
  });

  const handleDeleteAllMappings = async () => {
    if (!allMappingsData) return;

    try {
      // Find all related mappings (same venue, location type, state, district)
      const relatedMappingIds = allMappingsData
        .filter(m => 
          m.venueLocationMapping.venue.id === mapping.venueLocationMapping.venue.id &&
          m.locationType === mapping.locationType && 
          m.state === mapping.state &&
          (mapping.locationType === 'district' || m.district === mapping.district)
        )
        .map(m => m.id);
      
      if (relatedMappingIds.length > 0) {
        await deleteAllMappingsMutation.mutateAsync({
          mappingIds: relatedMappingIds
        });
      }
    } catch (error) {
      console.error('Failed to delete mappings:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedVenue || selectedLocations.length === 0) {
      addNotification('Please select a venue and at least one location', 'error');
      return;
    }

    try {
      // First, delete all related mappings
      if (allMappingsData) {
        const relatedMappingIds = allMappingsData
          .filter(m => 
            m.venueLocationMapping.venue.id === mapping.venueLocationMapping.venue.id &&
            m.locationType === mapping.locationType && 
            m.state === mapping.state &&
            (mapping.locationType === 'district' || m.district === mapping.district)
          )
          .map(m => m.id);
        
        if (relatedMappingIds.length > 0) {
          await deleteMappingMutation.mutateAsync({
            mappingIds: relatedMappingIds
          });
        }
      }

      // Then create new mappings
      await createMappingMutation.mutateAsync({
        eventId: selectedEvent,
        locationType: locationType,
        locationNames: selectedLocations,
        state: selectedState,
        district: locationType === 'taluk' ? selectedDistrict : undefined,
        clusterVenueMappingId: selectedVenue,
      });
    } catch (error) {
      console.error('Failed to update mapping:', error);
    }
  };

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Location Mapping" : "View Location Mapping"}
      size="lg"
      mobileFullScreen={true}
      scrollableBody={true}
      footer={
        <div className="flex flex-row space-x-3 sm:justify-between">
          <div className="flex space-x-3">
            {isEditMode && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteAllMappingsMutation.isPending}
                className="flex-1 sm:flex-initial sm:px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium py-2 text-sm"
              >
                Delete Mapping
              </button>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={deleteMappingMutation.isPending || createMappingMutation.isPending || deleteAllMappingsMutation.isPending}
              className="flex-1 sm:flex-initial sm:px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium py-2 text-sm"
            >
              {isEditMode ? 'Cancel' : 'Close'}
            </button>
            {isEditMode ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={deleteMappingMutation.isPending || createMappingMutation.isPending}
                className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors font-medium py-2 text-sm"
              >
                {(deleteMappingMutation.isPending || createMappingMutation.isPending) ? 'Updating...' : 'Update Mapping'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditMode(true)}
                className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors font-medium py-2 text-sm"
              >
                Edit Mapping
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {!isEditMode ? (
          /* View Mode - Current Mapping Info */
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Mapping Details</h3>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Type:</span>
                <span className="font-medium capitalize">{mapping.locationType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">State:</span>
                <span className="font-medium">{mapping.state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">District:</span>
                <span className="font-medium">{mapping.district || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Location:</span>
                <span className="font-medium">{mapping.locationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Venue:</span>
                <span className="font-medium">{mapping.venueLocationMapping.venue.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Venue District:</span>
                <span className="font-medium">{mapping.venueLocationMapping.venue.district}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Address:</span>
                <span className="font-medium text-right max-w-xs">{mapping.venueLocationMapping.venue.address}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Edit Mode - Same form as create modal */
          <>
            {/* Location Type Selection - Read Only in Edit Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location Type *</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 capitalize">
                {locationType}
              </div>
              <div className="text-xs text-gray-500 mt-1">Location type cannot be changed when editing</div>
            </div>

            {/* State Selection - Read Only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                {selectedState || 'No state selected'}
              </div>
              <div className="text-xs text-gray-500 mt-1">State cannot be changed when editing</div>
            </div>

            {/* District Selection (only for taluk type) */}
            {locationType === 'taluk' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">District *</label>
                <div className="text-xs text-gray-500 mb-1">Current: {selectedDistrict}</div>
                <Select value={selectedDistrict} onValueChange={(value) => {
                  console.log('District changed to:', value);
                  setSelectedDistrict(value);
                  setSelectedLocations([]);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent>
                    {(districtsData || []).map((district, index) => (
                      <SelectItem key={district.id || district.name || index} value={district.name}>
                        {district.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Location Multi-Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locationType === 'district' ? 'Districts' : 'Taluks'} *
              </label>
              <MultiSelect
                options={locationOptions}
                value={selectedLocations}
                onValueChange={setSelectedLocations}
                placeholder={`Select ${locationType}s...`}
                disabled={!selectedState || (locationType === 'taluk' && !selectedDistrict)}
              />
              <div className="text-xs text-gray-500 mt-1">
                Only showing {locationType}s that are not already mapped to other venues
              </div>
            </div>

            {/* Venue Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cluster Venue *</label>
              {venuesLoading ? (
                <div className="px-3 py-2 border border-gray-300 rounded-lg">
                  <div className="animate-pulse flex items-center space-x-2">
                    <div className="h-4 bg-gray-200 rounded w-4"></div>
                    <div className="h-4 bg-gray-200 rounded flex-1"></div>
                  </div>
                </div>
              ) : venuesError ? (
                <div className="px-3 py-2 border border-red-300 rounded-lg text-red-500">
                  Error loading venues: {venuesError.message}
                </div>
              ) : (
                <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cluster venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredVenues.length === 0 ? (
                      <SelectItem value="no-venues" disabled>
                        {locationType === 'district' 
                          ? !selectedState
                            ? 'Select state first to see available venues'
                            : `No available cluster venues in ${selectedState}`
                          : !selectedDistrict 
                            ? 'Select district first to see available venues'
                            : `No available cluster venues in ${selectedDistrict}, ${selectedState}`
                        }
                      </SelectItem>
                    ) : (
                      filteredVenues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.venueId}>
                          {venue.venue.name} - {venue.venue.district}, {venue.venue.state}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {locationType === 'district' 
                  ? `Venues in ${selectedState} that are not already mapped`
                  : selectedDistrict 
                    ? `Venues in ${selectedDistrict}, ${selectedState} that are not already mapped`
                    : 'Select district first to see available venues'
                }
              </div>
            </div>

            {/* Summary */}
            {selectedLocations.length > 0 && selectedVenue && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Mapping Summary</h4>
                <p className="text-sm text-blue-800">
                  Updating {selectedLocations.length} {locationType} mapping(s) to the selected cluster venue.
                </p>
                <div className="mt-2 text-xs text-blue-700">
                  Selected {locationType}s: {selectedLocations.join(', ')}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete All Related Mappings</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will delete all mappings for this venue and location group. This action cannot be undone.
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteAllMappingsMutation.isPending}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllMappings}
                disabled={deleteAllMappingsMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
              >
                {deleteAllMappingsMutation.isPending ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </EnhancedModal>
  );
}
