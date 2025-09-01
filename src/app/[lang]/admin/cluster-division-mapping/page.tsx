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
  type BulkAction,
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
import { MultiSelect } from '@/components/ui/MultiSelect';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/AdvancedSelect';

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
      address: string | null;
    };
    level: 'cluster' | 'division' | 'final';
    maxTeams: number | null;
  };
  divisionVenueMapping: {
    id: string;
    venue: {
      id: string;
      name: string;
      district: string;
      state: string;
      address: string | null;
    };
    level: 'cluster' | 'division' | 'final';
    maxTeams: number | null;
  };
}

// Create Cluster Division Mapping Modal Component
interface CreateClusterDivisionMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: string;
  onSuccess: () => void;
}

function CreateClusterDivisionMappingModal({ isOpen, onClose, selectedEvent, onSuccess }: CreateClusterDivisionMappingModalProps) {
  const { addNotification } = useNotification();
  const utils = api.useUtils();
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDivisionVenue, setSelectedDivisionVenue] = useState<string>('');
  const [selectedClusterVenues, setSelectedClusterVenues] = useState<string[]>([]);

  // Get division venues for the event - filtered by state
  const { data: divisionVenuesData, isLoading: divisionVenuesLoading, error: divisionVenuesError } = api.admin.venues.getVenueLevelMappings.useQuery({
    eventId: selectedEvent,
    level: 'division',
  }, {
    enabled: !!selectedEvent,
  });

  // Get cluster venues for the event - filtered by state
  const { data: clusterVenuesData, isLoading: clusterVenuesLoading, error: clusterVenuesError } = api.admin.venues.getVenueLevelMappings.useQuery({
    eventId: selectedEvent,
    level: 'cluster',
  }, {
    enabled: !!selectedEvent,
  });

  // Get all current mappings to filter out already mapped venues
  const { data: allMappingsData } = api.admin.mappings.getClusterDivisionMappings.useQuery({
    eventId: selectedEvent,
  }, {
    enabled: !!selectedEvent,
  });

  // Check location-cluster mappings to see if cluster venues are already used there
  const { data: locationMappingsData } = api.admin.mappings.getLocationClusterMappings.useQuery({
    eventId: selectedEvent,
  }, {
    enabled: !!selectedEvent,
  });

  // Get states from location service
  const { data: statesData } = api.location.getStates.useQuery();

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedState('');
      setSelectedDivisionVenue('');
      setSelectedClusterVenues([]);
    }
  }, [isOpen]);

  // Validation helpers
  const isStateSelected = !!selectedState;
  const isDivisionSelected = !!selectedDivisionVenue;
  const areClustersSelected = selectedClusterVenues.length > 0;
  const isFormValid = isStateSelected && isDivisionSelected && areClustersSelected;

  // Division venue options - filtered to exclude already mapped venues
  const availableDivisionOptions = useMemo(() => {
    if (!divisionVenuesData || !Array.isArray(divisionVenuesData) || !allMappingsData) return [];
    
    // Get already used division venue IDs for current event
    const usedDivisionIds = allMappingsData.map(m => m.divisionVenueMappingId);
    
    return divisionVenuesData.filter(venueMapping => {
      const venue = venueMapping.venue;
      const isVenueUsed = usedDivisionIds.includes(venueMapping.id);
      const stateMatch = venue.state === selectedState;
      
      return !isVenueUsed && stateMatch;
    });
  }, [divisionVenuesData, allMappingsData, selectedState]);

  // Cluster venue options - filtered to exclude already mapped venues
  const availableClusterOptions = useMemo(() => {
    if (!clusterVenuesData || !Array.isArray(clusterVenuesData) || !allMappingsData) return [];
    
    // Get already used cluster venue IDs for current event
    const usedClusterIds = allMappingsData.map(m => m.clusterVenueMappingId);
    
    console.log('All cluster mappings:', allMappingsData);
    console.log('Used cluster IDs:', usedClusterIds);
    console.log('Available cluster venues before filtering:', clusterVenuesData.length);
    
    const availableVenues = clusterVenuesData.filter(venueMapping => {
      const venue = venueMapping.venue;
      const isVenueUsed = usedClusterIds.includes(venueMapping.id);
      const stateMatch = venue.state === selectedState;
      
      console.log(`Cluster venue ${venue.name} (${venueMapping.id}):`, {
        isVenueUsed,
        stateMatch,
        state: venue.state,
        selectedState
      });
      
      return !isVenueUsed && stateMatch;
    });

    console.log('Available cluster venues after filtering:', availableVenues.length);

    return availableVenues.map(venue => ({
      label: `${venue.venue.name} - ${venue.venue.district}`,
      value: venue.id
    }));
  }, [clusterVenuesData, allMappingsData, selectedState]);

  // Create bulk mapping mutation
  const createBulkMappingMutation = api.admin.mappings.createBulkClusterDivisionMappings.useMutation({
    onSuccess: async (result) => {
      addNotification(result.message, 'success');
      // Invalidate and refetch the cluster-division mappings
      await utils.admin.mappings.getClusterDivisionMappings.invalidate({
        eventId: selectedEvent,
      });
      onSuccess();
      onClose();
      // Reset form
      setSelectedState('');
      setSelectedDivisionVenue('');
      setSelectedClusterVenues([]);
    },
    onError: (error) => {
      console.error('Error creating bulk mappings:', error);
      addNotification(`Failed to create mappings: ${error.message}`, 'error');
    },
  });

  const handleSubmit = async () => {
    console.log('handleSubmit called with:', {
      selectedState,
      selectedDivisionVenue,
      selectedClusterVenues,
    });

    // Validation
    if (!selectedState) {
      console.log('Validation failed: no state selected');
      addNotification('Please select a state', 'error');
      return;
    }

    if (!selectedDivisionVenue) {
      console.log('Validation failed: no division venue selected');
      addNotification('Please select a division venue', 'error');
      return;
    }

    if (selectedClusterVenues.length === 0) {
      console.log('Validation failed: no cluster venues selected');
      addNotification('Please select at least one cluster venue', 'error');
      return;
    }

    // Filter out any undefined values
    const validClusterVenues = selectedClusterVenues.filter(Boolean);
    if (validClusterVenues.length === 0) {
      console.log('Validation failed: no valid cluster venues after filtering');
      addNotification('Please select valid cluster venues', 'error');
      return;
    }

    // Ensure state is not empty
    if (!selectedState || selectedState.trim() === '') {
      console.log('Validation failed: state is empty or whitespace');
      addNotification('State is required but not selected', 'error');
      return;
    }

    const payload = {
      eventId: selectedEvent,
      divisionVenueMappingId: selectedDivisionVenue,
      clusterVenueMappingIds: validClusterVenues,
      state: selectedState,
    };

    console.log('Creating bulk mappings with payload:', payload);
    
    // Create bulk mappings with single API call
    createBulkMappingMutation.mutate(payload);
  };

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Map Clusters to Division Venue"
      subtitle="Create bulk cluster-division mappings"
      size="lg"
      mobileFullScreen={true}
      scrollableBody={true}
      className="sm:max-h-[90vh]"
      footer={
        <div className="flex flex-row space-x-3 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-initial sm:px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium py-2 text-sm"
            disabled={createBulkMappingMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors font-medium py-2 text-sm disabled:bg-gray-400"
            disabled={createBulkMappingMutation.isPending || !isFormValid}
          >
            {createBulkMappingMutation.isPending ? 'Creating...' : `Create ${selectedClusterVenues.length} Mapping(s)`}
          </button>
        </div>
      }
    >
      <div className="space-y-6 sm:min-h-[90vh] scrollbar-none">
        {/* Step 1: State Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
          <Select value={selectedState} onValueChange={(value) => {
            console.log('State changed from:', selectedState, 'to:', value);
            setSelectedState(value);
            setSelectedDivisionVenue('');
            setSelectedClusterVenues([]);
          }}>
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

        {/* Step 2: Division Venue Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Division Venue *</label>
          {divisionVenuesLoading ? (
            <div className="px-3 py-2 border border-gray-300 rounded-lg">
              <div className="animate-pulse flex items-center space-x-2">
                <div className="h-4 bg-gray-200 rounded w-4"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
              </div>
            </div>
          ) : divisionVenuesError ? (
            <div className="px-3 py-2 border border-red-300 rounded-lg text-red-500">
              Error loading division venues: {divisionVenuesError.message}
            </div>
          ) : (
            <Select 
              value={selectedDivisionVenue} 
              onValueChange={(value) => {
                setSelectedDivisionVenue(value);
                setSelectedClusterVenues([]); // Reset cluster selection when division changes
              }} 
              disabled={!isStateSelected}
            >
              <SelectTrigger className={!isStateSelected ? 'bg-gray-100 cursor-not-allowed' : ''}>
                <SelectValue placeholder={!isStateSelected ? "Select state first" : "Select division venue"} />
              </SelectTrigger>
              <SelectContent>
                {availableDivisionOptions.length === 0 ? (
                  <SelectItem value="no-venues" disabled>
                    {!isStateSelected
                      ? 'Select state first to see available venues'
                      : `No available division venues in ${selectedState}`
                    }
                  </SelectItem>
                ) : (
                  availableDivisionOptions.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.venue.name} - {venue.venue.district}, {venue.venue.state}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
          <div className="text-xs text-gray-500 mt-1">
            {!isStateSelected 
              ? 'Select state first to see available venues'
              : isDivisionSelected
                ? `Selected: ${availableDivisionOptions.find(v => v.id === selectedDivisionVenue)?.venue.name}`
                : availableDivisionOptions.length > 0
                  ? `${availableDivisionOptions.length} division venue(s) available in ${selectedState}`
                  : `No available division venues in ${selectedState}`
            }
          </div>
        </div>

        {/* Step 3: Cluster Venues Multi-Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cluster Venues *
          </label>
          {clusterVenuesLoading && isStateSelected ? (
            <div className="px-3 py-2 border border-gray-300 rounded-lg">
              <div className="animate-pulse flex items-center space-x-2">
                <div className="h-4 bg-gray-200 rounded w-4"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
              </div>
            </div>
          ) : clusterVenuesError ? (
            <div className="px-3 py-2 border border-red-300 rounded-lg text-red-500">
              Error loading cluster venues: {clusterVenuesError.message}
            </div>
          ) : (
            <MultiSelect
              options={availableClusterOptions}
              value={selectedClusterVenues}
              onValueChange={setSelectedClusterVenues}
              placeholder={
                !isStateSelected 
                  ? "Select state first" 
                  : !isDivisionSelected 
                    ? "Select division venue first"
                    : "Select cluster venues..."
              }
              disabled={!isStateSelected || !isDivisionSelected}
            />
          )}
          <div className="text-xs text-gray-500 mt-1">
            {!isStateSelected 
              ? 'Select state first'
              : !isDivisionSelected
                ? 'Select division venue first to see available clusters'
                : areClustersSelected
                  ? `${selectedClusterVenues.length} cluster venue(s) selected`
                  : availableClusterOptions.length > 0
                    ? `${availableClusterOptions.length} cluster venue(s) available in ${selectedState}`
                    : `No available cluster venues in ${selectedState}`
            }
          </div>
        </div>
      </div>
    </EnhancedModal>
  );
}

// Edit Cluster Division Mapping Modal Component
interface EditClusterDivisionMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapping: ClusterDivisionMappingData;
  selectedEvent: string;
  onSuccess: () => void;
}

function EditClusterDivisionMappingModal({ isOpen, onClose, mapping, selectedEvent, onSuccess }: EditClusterDivisionMappingModalProps) {
  const { addNotification } = useNotification();
  const utils = api.useUtils();
  
  // Edit mode state - initialize with mapping data like location mapping
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedState, setSelectedState] = useState<string>(mapping?.divisionVenueMapping?.venue?.state || '');
  const [selectedDivisionVenue, setSelectedDivisionVenue] = useState<string>(mapping?.divisionVenueMappingId || '');
  const [selectedClusterVenues, setSelectedClusterVenues] = useState<string[]>(
    mapping?.clusterVenueMappingId ? [mapping.clusterVenueMappingId] : []
  );

  // Get all current mappings to find related clusters and filter venues
  const { data: allMappingsData } = api.admin.mappings.getClusterDivisionMappings.useQuery({
    eventId: selectedEvent,
  }, {
    enabled: !!selectedEvent && isOpen, // Load when modal opens, not just edit mode
  });

  // Update selectedClusterVenues when entering edit mode to show all related clusters
  useEffect(() => {
    if (allMappingsData && isEditMode && mapping) {
      // Find all mappings with the same division venue (this represents the "group" that was created together)
      const relatedMappings = allMappingsData
        .filter(m => m.divisionVenueMappingId === mapping.divisionVenueMappingId);
      
      if (relatedMappings.length > 0) {
        // Extract all cluster venue IDs from the related mappings
        const relatedClusterIds = relatedMappings
          .map(m => m.clusterVenueMappingId)
          .filter(Boolean);
        
        // Update selectedClusterVenues array
        setSelectedClusterVenues(relatedClusterIds);
      }
    }
  }, [allMappingsData, isEditMode, mapping]);

  // Reset form data when entering edit mode - separate useEffect like location-mapping
  useEffect(() => {
    if (isEditMode && mapping) {
      // Set basic form fields
      setSelectedState(mapping.divisionVenueMapping.venue.state);
      setSelectedDivisionVenue(mapping.divisionVenueMappingId);
    }
  }, [isEditMode, mapping]);

  // Get division venues for the event - load when modal is open
  const { data: divisionVenuesData, isLoading: divisionVenuesLoading, error: divisionVenuesError } = api.admin.venues.getVenueLevelMappings.useQuery({
    eventId: selectedEvent,
    level: 'division',
  }, {
    enabled: !!selectedEvent && isOpen,
  });

  // Get cluster venues for the event - load when modal is open  
  const { data: clusterVenuesData, isLoading: clusterVenuesLoading, error: clusterVenuesError } = api.admin.venues.getVenueLevelMappings.useQuery({
    eventId: selectedEvent,
    level: 'cluster',
  }, {
    enabled: !!selectedEvent && isOpen,
  });

  // Get states from location service
  const { data: statesData } = api.location.getStates.useQuery();

  // Location options for cluster venues - filtered to exclude already mapped venues
  const availableClusterOptions = useMemo(() => {
    // Wait for data to load
    if (clusterVenuesLoading || !clusterVenuesData || !Array.isArray(clusterVenuesData)) {
      return [];
    }
    
    if (!allMappingsData) {
      return [];
    }
    
    // Get already used cluster venue IDs for current event (excluding current mapping)
    const usedClusterIds = allMappingsData
      .filter(m => m.divisionVenueMappingId !== mapping.divisionVenueMappingId) // Exclude current mapping group
      .map(m => m.clusterVenueMappingId);
    
    const availableVenues = clusterVenuesData.filter(venueMapping => {
      const venue = venueMapping.venue;
      const isVenueUsed = usedClusterIds.includes(venueMapping.id);
      
      // In edit mode, don&apos;t filter by state initially - let all venues load first
      if (isEditMode) {
        return !isVenueUsed;
      }
      
      // In create mode, filter by selected state
      const stateMatch = selectedState ? venue.state === selectedState : true;
      return !isVenueUsed && stateMatch;
    });

    // When editing, always include currently selected cluster venues
    if (isEditMode && selectedClusterVenues.length > 0) {
      selectedClusterVenues.forEach(clusterVenueId => {
        const currentVenue = clusterVenuesData.find(v => v.id === clusterVenueId);
        if (currentVenue && !availableVenues.find(v => v.id === clusterVenueId)) {
          availableVenues.push(currentVenue);
        }
      });
    }

    const options = availableVenues.map(venue => ({
      label: `${venue.venue.name} - ${venue.venue.district}`,
      value: venue.id
    }));
    
    return options;
  }, [clusterVenuesData, clusterVenuesLoading, allMappingsData, mapping.divisionVenueMappingId, isEditMode, selectedClusterVenues, selectedState]);

  // Filtered division venues based on availability
  const filteredDivisionVenues = useMemo(() => {
    console.log('🔍 Filtering division venues:', {
      divisionVenuesData: (divisionVenuesData as any)?.venueLevelMappings?.length,
      allMappingsData: allMappingsData?.length,
      selectedState,
      isEditMode,
      divisionVenuesLoading
    });
    
    // Wait for data to load
    if (divisionVenuesLoading || !divisionVenuesData || !Array.isArray(divisionVenuesData)) {
      console.log('⏳ Division venues still loading or empty');
      return [];
    }
    
    if (!allMappingsData) {
      console.log('⏳ All mappings data not available yet');
      return [];
    }
    
    // Get already used division venue IDs for current event (excluding current mapping)
    const usedDivisionIds = allMappingsData
      .filter(m => m.id !== mapping.id) // Allow keeping same division venue when editing
      .map(m => m.divisionVenueMappingId);
    
    const availableVenues = divisionVenuesData.filter(venueMapping => {
      const venue = venueMapping.venue;
      const isVenueUsed = usedDivisionIds.includes(venueMapping.id);
      
      // In edit mode, don&apos;t filter by state initially - let all venues load first
      if (isEditMode) {
        return !isVenueUsed;
      }
      
      // In create mode, filter by selected state
      const stateMatch = selectedState ? venue.state === selectedState : true;
      return !isVenueUsed && stateMatch;
    });

    // When editing, always include the current division venue
    if (isEditMode && selectedDivisionVenue) {
      const currentVenue = divisionVenuesData.find(v => v.id === selectedDivisionVenue);
      if (currentVenue && !availableVenues.find(v => v.id === selectedDivisionVenue)) {
        availableVenues.unshift(currentVenue); // Add current venue at the beginning
      }
    }

    console.log('✅ Filtered division venues result:', availableVenues.length);
    return availableVenues;
  }, [divisionVenuesData, divisionVenuesLoading, allMappingsData, mapping.id, isEditMode, selectedDivisionVenue, selectedState]);

  // Update mapping mutation using new API
  const updateMappingMutation = api.admin.mappings.updateClusterDivisionMapping.useMutation({
    onSuccess: async () => {
      addNotification('Cluster-Division mapping updated successfully', 'success');
      setIsEditMode(false);
      // Invalidate and refetch the cluster-division mappings
      await utils.admin.mappings.getClusterDivisionMappings.invalidate({
        eventId: selectedEvent,
      });
      onSuccess();
    },
    onError: (error) => {
      console.error('Error updating mapping:', error);
      const errorMessage = error.message || 'Failed to update mapping. Please try again.';
      addNotification(errorMessage, 'error');
    },
  });

  // Delete all related mappings mutation
  const deleteAllMappingsMutation = api.admin.mappings.deleteClusterDivisionMapping.useMutation({
    onSuccess: async () => {
      addNotification('All related mappings deleted successfully', 'success');
      setShowDeleteConfirm(false);
      // Invalidate and refetch the cluster-division mappings
      await utils.admin.mappings.getClusterDivisionMappings.invalidate({
        eventId: selectedEvent,
      });
      onSuccess();
      onClose();
    },
    onError: (error) => {
      console.error('Error deleting mappings:', error);
      const errorMessage = error.message || 'Failed to delete mappings. Please try again.';
      addNotification(errorMessage, 'error');
    },
  });

  const handleDeleteAllMappings = async () => {
    if (!allMappingsData || !mapping) return;

    try {
      // Find all related mappings (same division venue)
      const relatedMappingIds = allMappingsData
        .filter(m => 
          m.divisionVenueMappingId === mapping.divisionVenueMappingId &&
          m.id // Ensure mapping has valid ID
        )
        .map(m => m.id)
        .filter(Boolean); // Remove any undefined IDs
      
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
    if (!selectedDivisionVenue || selectedClusterVenues.length === 0) {
      addNotification('Please select a division venue and at least one cluster venue', 'error');
      return;
    }

    // Ensure state is not empty
    if (!selectedState || selectedState.trim() === '') {
      addNotification('State is required but not selected', 'error');
      return;
    }

    console.log('Edit modal - updating with state:', selectedState, 'Type:', typeof selectedState);

    try {
      // Use the new update API
      await updateMappingMutation.mutateAsync({
        eventId: selectedEvent,
        divisionVenueMappingId: selectedDivisionVenue,
        clusterVenueMappingIds: selectedClusterVenues.filter(Boolean),
        state: selectedState,
      });
    } catch (error) {
      console.error('Failed to update mappings:', error);
    }
  };

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Cluster-Division Mapping" : "View Cluster-Division Mapping"}
      subtitle={isEditMode ? "Modify cluster-division venue assignments" : "View mapping details"}
      size="lg"
      mobileFullScreen={true}
      scrollableBody={true}
      className="sm:max-h-[90vh]"
      footer={
        isEditMode ? (
          // Edit Mode: justify-between layout - Delete on left, Cancel+Update on right
          <div className="flex flex-col sm:flex-row w-full sm:justify-between space-y-3 sm:space-y-0">
            {/* Left: Delete button */}
            <div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteAllMappingsMutation.isPending}
                className="w-full sm:w-auto px-4 py-2 bg-red-400 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm"
              >
                Delete All Mappings
              </button>
            </div>
            
            {/* Right: Cancel + Update buttons */}
            <div className="flex flex-row space-x-3 pl-4">
              <button
                type="button"
                onClick={onClose}
                disabled={updateMappingMutation.isPending || deleteAllMappingsMutation.isPending}
                className="flex-1 sm:flex-initial sm:px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={updateMappingMutation.isPending}
                className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors font-medium py-2 text-sm"
              >
                {updateMappingMutation.isPending ? 'Updating...' : 'Update Mapping'}
              </button>
            </div>
          </div>
        ) : (
          // View Mode: Clean spaced buttons following guide
          <div className="flex flex-row space-x-3 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial sm:px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium py-2 text-sm"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => setIsEditMode(true)}
              className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors font-medium py-2 text-sm"
            >
              Edit
            </button>
          </div>
        )
      }
    >
      <div className="space-y-6 sm:min-h-[50vh] scrollbar-none">
        {!isEditMode ? (
          // View Mode - Show all related mappings (1 division -> multiple clusters)
          <>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Division Venue Mapping Details</h3>
              
              {/* Division Venue Info */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Division Venue</label>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="font-medium text-gray-900">{mapping.divisionVenueMapping.venue.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{mapping.divisionVenueMapping.venue.address}</div>
                  <div className="text-sm text-gray-500">
                    {mapping.divisionVenueMapping.venue.district}, {mapping.divisionVenueMapping.venue.state}
                  </div>
                  <div className="text-xs text-blue-600 mt-2">
                    Max Teams: {mapping.divisionVenueMapping.maxTeams}
                  </div>
                </div>
              </div>

              {/* All Mapped Cluster Venues */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mapped Cluster Venues {allMappingsData && (
                    <span className="text-xs text-gray-500 font-normal">
                      ({allMappingsData.filter(m => m.divisionVenueMappingId === mapping.divisionVenueMappingId).length} venues)
                    </span>
                  )}
                </label>
                <div className="space-y-3">
                  {allMappingsData?.filter(m => m.divisionVenueMappingId === mapping.divisionVenueMappingId).map((relatedMapping) => (
                    <div key={relatedMapping.id} className="bg-white p-3 rounded-lg border">
                      <div className="font-medium text-gray-900">{relatedMapping.clusterVenueMapping.venue.name}</div>
                      <div className="text-sm text-gray-500">{relatedMapping.clusterVenueMapping.venue.address}</div>
                      <div className="text-sm text-gray-500">
                        {relatedMapping.clusterVenueMapping.venue.district}, {relatedMapping.clusterVenueMapping.venue.state}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Max Teams: {relatedMapping.clusterVenueMapping.maxTeams}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-xs text-blue-700">
                  <strong>Note:</strong> This mapping group was created together. When editing, you can modify all cluster venues assigned to this division venue at once.
                </div>
              </div>
            </div>
          </>
        ) : (
          // Edit Mode
          <>
            {/* State Selection - Read Only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                {selectedState || 'No state selected'}
              </div>
              <div className="text-xs text-gray-500 mt-1">State cannot be changed when editing</div>
            </div>

            {/* Division Venue Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Division Venue *</label>
              {divisionVenuesLoading ? (
                <div className="px-3 py-2 border border-gray-300 rounded-lg">
                  <div className="animate-pulse flex items-center space-x-2">
                    <div className="h-4 bg-gray-200 rounded w-4"></div>
                    <div className="h-4 bg-gray-200 rounded flex-1"></div>
                  </div>
                </div>
              ) : divisionVenuesError ? (
                <div className="px-3 py-2 border border-red-300 rounded-lg text-red-500">
                  Error loading division venues: {divisionVenuesError.message}
                </div>
              ) : (
                <Select value={selectedDivisionVenue} onValueChange={(value) => {
                  setSelectedDivisionVenue(value);
                  setSelectedClusterVenues([]);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select division venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDivisionVenues.length === 0 ? (
                      <SelectItem value="no-venues" disabled>
                        No available division venues in {selectedState}
                      </SelectItem>
                    ) : (
                      filteredDivisionVenues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          {venue.venue.name} - {venue.venue.district}, {venue.venue.state}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Division venues in {selectedState} that are not already mapped
              </div>
            </div>

            {/* Cluster Venues Multi-Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cluster Venues *
              </label>
              {clusterVenuesLoading ? (
                <div className="px-3 py-2 border border-gray-300 rounded-lg">
                  <div className="animate-pulse flex items-center space-x-2">
                    <div className="h-4 bg-gray-200 rounded w-4"></div>
                    <div className="h-4 bg-gray-200 rounded flex-1"></div>
                  </div>
                </div>
              ) : clusterVenuesError ? (
                <div className="px-3 py-2 border border-red-300 rounded-lg text-red-500">
                  Error loading cluster venues: {clusterVenuesError.message}
                </div>
              ) : (
                <MultiSelect
                  options={availableClusterOptions}
                  value={selectedClusterVenues}
                  onValueChange={setSelectedClusterVenues}
                  placeholder="Select cluster venues..."
                  disabled={!selectedState || !selectedDivisionVenue}
                />
              )}
              <div className="text-xs text-gray-500 mt-1">
                Only showing cluster venues that are not already mapped to other divisions
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Division-Cluster Mapping Group</h3>
            <p className="text-sm text-gray-600 mb-2">
              This will permanently delete <strong>all {allMappingsData?.filter(m => m.divisionVenueMappingId === mapping.divisionVenueMappingId).length || 0} cluster venues</strong> mapped to <strong>{mapping.divisionVenueMapping.venue.name}</strong>.
            </p>
            <p className="text-sm text-red-600 mb-4">
              This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteAllMappingsMutation.isPending}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllMappings}
                disabled={deleteAllMappingsMutation.isPending}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
              >
                {deleteAllMappingsMutation.isPending ? 'Deleting...' : 'Delete All Mappings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </EnhancedModal>
  );
}

export default function ClusterDivisionMappingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = React.use(params);
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();
  const utils = api.useUtils();

  // State management
  const [selectedMappings, setSelectedMappings] = useState<Set<string | number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<ClusterDivisionMappingData | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>('');

  // Table state
  const [tableParams, setTableParams] = useState({
    pagination: { page: 1, pageSize: 50 },
    sorting: { field: 'clusterVenueMapping', direction: 'asc' as const },
    filters: [],
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

  // Get cluster-division mappings for selected event
  const { data: mappingsData, isLoading: mappingsLoading } = api.admin.mappings.getClusterDivisionMappings.useQuery({
    eventId: selectedEvent,
  }, {
    enabled: !!selectedEvent,
  });

  // Set selected event from ongoing events
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
  
  // Debug: Check what APIs are available
  console.log('Available admin.mappings APIs:', Object.keys(api.admin.mappings));
  console.log('Available admin APIs:', Object.keys(api.admin));

  const loading = authLoading || eventsLoading || mappingsLoading;

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
      <button
        onClick={() => setShowCreateModal(true)}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        disabled={!selectedEvent || loading}
      >
        <Plus className="w-4 h-4 mr-2" />
        Map Clusters to Division
      </button>
    </div>
  );

  if (authLoading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdvancedTable<ClusterDivisionMappingData>
          data={mappingsData || []}
          columns={columns}
          loading={loading}
          headerActions={headerActions}
          emptyState={{
            icon: MapPin,
            title: 'No mappings found',
            description: selectedEvent ? 'No cluster-division mappings found for the selected event and filters.' : 'Please select an event to view cluster-division mappings.',
          }}
          searchable
          searchPlaceholder="Search cluster venues, division venues, or locations..."
          keyExtractor={(mapping) => mapping.id}
          onRowClick={(mapping) => {
            setSelectedMapping(mapping);
            setShowEditModal(true);
          }}
        />

        {/* Create Mapping Modal */}
        {showCreateModal && (
          <CreateClusterDivisionMappingModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            selectedEvent={selectedEvent}
            onSuccess={() => {
              // The mutation's onSuccess already handles the notification and modal close
              // Data will be automatically refetched due to tRPC's cache invalidation
            }}
          />
        )}
        {/* Edit Mapping Modal */}
        {showEditModal && selectedMapping && (
          <EditClusterDivisionMappingModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedMapping(null);
            }}
            mapping={selectedMapping}
            selectedEvent={selectedEvent}
            onSuccess={() => {
              // Data will be automatically refetched due to tRPC's cache invalidation
              setShowEditModal(false);
              setSelectedMapping(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
