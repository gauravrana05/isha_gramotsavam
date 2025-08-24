'use client'

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { createGroupedClusterDivisionMapping, updateGroupedClusterDivisionMapping } from '@/lib/actions/admin/venueMapping';

interface Venue {
  id: string;
  name: string;
  type: 'cluster' | 'division' | 'final';
  state: string;
  district: string;
  isActive: boolean;
}

interface ClusterDivisionMapping {
  id: string;
  divisionVenueId?: string; // For editing purposes - division venue ID
  divisionVenueName: string;
  divisionState: string; // Division venue state for editing
  divisionDistrict: string; // Division venue district for editing
  assignedClusters: string[]; // For display purposes - array of cluster names
  assignedClusterIds?: string[]; // For editing purposes - array of cluster venue IDs
  state?: string; // State information for editing
  autoMapped: boolean;
  isActive: boolean;
}

interface ClusterDivisionMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  clusterVenues: Venue[];
  divisionVenues: Venue[];
  existingMappings: ClusterDivisionMapping[];
  statesRequiringMapping: { state: string; divisionsCount: number; clustersCount: number }[];
  editingMapping?: ClusterDivisionMapping | null;
}

export default function ClusterDivisionMappingModal({
  isOpen,
  onClose,
  clusterVenues,
  divisionVenues,
  existingMappings,
  statesRequiringMapping,
  editingMapping
}: ClusterDivisionMappingModalProps) {
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Initialize form when editing
  useEffect(() => {
    if (editingMapping && isOpen) {
      // Use the division venue ID directly if available, otherwise find by name
      if (editingMapping.divisionVenueId) {
        setSelectedDivision(editingMapping.divisionVenueId);
      } else {
        // Fallback: Find the division venue by name
        const divisionVenue = divisionVenues.find(v => v.name === editingMapping.divisionVenueName);
        if (divisionVenue) {
          setSelectedDivision(divisionVenue.id);
        }
      }
      
      // Set selected clusters using cluster IDs if available
      if (editingMapping.assignedClusterIds) {
        setSelectedClusters(editingMapping.assignedClusterIds);
      }
      
    } else if (!editingMapping && isOpen) {
      // Reset form for new mapping
      setSelectedDivision('');
      setSelectedClusters([]);
      setError('');
    }
  }, [editingMapping, isOpen, divisionVenues]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedDivision('');
      setSelectedClusters([]);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Check if there are any states that require manual mapping
  if (!statesRequiringMapping || statesRequiringMapping.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Cluster-Division Mapping</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-green-600 text-sm">
                  ✓ All states have single division venues. No manual mapping required.
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Teams will be automatically assigned to their state&apos;s division venue.
              </p>
            </div>
          </div>
          <div className="flex justify-end p-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDivision) {
      setError('Please select a division venue');
      return;
    }

    if (selectedClusters.length === 0) {
      setError('Please select at least one cluster venue');
      return;
    }

    const divisionVenue = divisionVenues.find(v => v.id === selectedDivision);
    if (!divisionVenue) {
      setError('Invalid division venue selection');
      return;
    }

    // Check for existing mappings (skip this check when editing)
    if (!editingMapping) {
      const conflicts = selectedClusters.filter(clusterId => {
        const clusterVenue = clusterVenues.find(v => v.id === clusterId);
        return clusterVenue && existingMappings.some(m => 
          m.assignedClusters.includes(clusterVenue.name)
        );
      });

      if (conflicts.length > 0) {
        const conflictNames = conflicts.map(id => 
          clusterVenues.find(v => v.id === id)?.name
        ).join(', ');
        setError(`The following cluster venues are already mapped: ${conflictNames}`);
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('eventId', 'isha_gramotsavam_2025');
      formData.append('state', divisionVenue.state);
      formData.append('clusterVenueIds', selectedClusters.join(','));
      formData.append('divisionVenueId', selectedDivision);

      let result;
      if (editingMapping) {
        // Update existing mapping
        result = await updateGroupedClusterDivisionMapping(editingMapping.id, formData);
      } else {
        // Create new mapping
        result = await createGroupedClusterDivisionMapping(formData);
      }
      
      if (result.success) {
        // Reset form and close modal
        setSelectedDivision('');
        setSelectedClusters([]);
        onClose();
      } else {
        setError(result.error || `Failed to ${editingMapping ? 'update' : 'create'} mappings`);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      // Error handling removed
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFilteredClusters = () => {
    if (!selectedDivision) return [];
    
    const divisionVenue = divisionVenues.find(v => v.id === selectedDivision);
    if (!divisionVenue) return [];
    
    // Filter clusters in the same state as the selected division
    return clusterVenues.filter(c => {
      const isInSameState = c.state === divisionVenue.state;
      
      // When editing, allow clusters that are currently assigned to this mapping
      if (editingMapping) {
        const isCurrentlyAssigned = editingMapping.assignedClusters.includes(c.name);
        const isAlreadyMappedElsewhere = existingMappings.some(m => 
          m.id !== editingMapping.id && m.assignedClusters.includes(c.name)
        );
        return isInSameState && !isAlreadyMappedElsewhere;
      } else {
        // When creating new mapping, exclude all already mapped clusters
        const isAlreadyMapped = existingMappings.some(m => 
          m.assignedClusters.includes(c.name)
        );
        return isInSameState && !isAlreadyMapped;
      }
    });
  };

  const getEligibleDivisionVenues = () => {
    // Only show division venues from states that require manual mapping
    const statesNeedingMapping = statesRequiringMapping.map(s => s.state);
    return divisionVenues.filter(v => {
      const isInStateNeedingMapping = statesNeedingMapping.includes(v.state);
      
      // When editing, allow the currently selected division venue
      if (editingMapping) {
        const isCurrentlySelected = v.name === editingMapping.divisionVenueName;
        const isAlreadyMappedElsewhere = existingMappings.some(m => 
          m.id !== editingMapping.id && m.divisionVenueName === v.name && m.isActive
        );
        return isInStateNeedingMapping && (isCurrentlySelected || !isAlreadyMappedElsewhere);
      } else {
        // When creating new mapping, exclude all already mapped division venues
        const isAlreadyMapped = existingMappings.some(m => m.divisionVenueName === v.name && m.isActive);
        return isInStateNeedingMapping && !isAlreadyMapped;
      }
    });
  };

  const handleClusterToggle = (clusterId: string) => {
    setSelectedClusters(prev => 
      prev.includes(clusterId) 
        ? prev.filter(id => id !== clusterId)
        : [...prev, clusterId]
    );
    setError('');
  };

  const handleDivisionChange = (divisionId: string) => {
    setSelectedDivision(divisionId);
    setError('');
    
    // Reset clusters when division changes - let user select manually
    setSelectedClusters([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingMapping ? 'Edit Division to Cluster Mapping' : 'Create Division to Cluster Mapping'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}


          {/* Division Venue Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Division Venue <span className="text-red-500">*</span>
            </label>
            {editingMapping ? (
              /* Read-only display when editing */
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                {editingMapping.divisionVenueName} - {editingMapping.divisionState}
                <span className="text-xs text-gray-500 ml-2">(Cannot be changed when editing)</span>
              </div>
            ) : (
              /* Dropdown when creating new */
              <Select value={selectedDivision} onValueChange={handleDivisionChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Division Venue" />
                </SelectTrigger>
                <SelectContent>
                  {getEligibleDivisionVenues().map(venue => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name} - {venue.district}, {venue.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Cluster Venues Selection */}
          {(selectedDivision || editingMapping) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cluster Venues in {editingMapping ? editingMapping.divisionState : divisionVenues.find(v => v.id === selectedDivision)?.state} <span className="text-red-500">*</span>
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                {getFilteredClusters().length === 0 ? (
                  <p className="text-gray-500 text-sm">No cluster venues found in the same state.</p>
                ) : (
                  <div className="space-y-2">
                    {getFilteredClusters().map(venue => {
                      // When editing, check if this cluster is mapped elsewhere (not in current mapping)
                      const isAlreadyMapped = editingMapping 
                        ? existingMappings.some(m => 
                            m.id !== editingMapping.id && m.assignedClusters.includes(venue.name)
                          )
                        : existingMappings.some(m => 
                            m.assignedClusters.includes(venue.name)
                          );
                      const isSelected = selectedClusters.includes(venue.id);
                      
                      return (
                        <div
                          key={venue.id}
                          className={`flex items-center p-2 rounded border cursor-pointer transition-colors ${
                            isAlreadyMapped 
                              ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60' 
                              : isSelected
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => !isAlreadyMapped && handleClusterToggle(venue.id)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => !isAlreadyMapped && handleClusterToggle(venue.id)}
                            disabled={isAlreadyMapped}
                            className="mr-3"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {venue.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {venue.district}, {venue.state}
                              {isAlreadyMapped && ' - Already Mapped'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {selectedClusters.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Selected: {selectedClusters.length} cluster venue{selectedClusters.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Info Box */}
          {selectedDivision && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-700 text-sm">
                <strong>Note:</strong> Only unmapped cluster venues in the same state are shown. Select the venues you want to map to this division.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !selectedDivision || selectedClusters.length === 0}
              loading={isSubmitting}
            >
              {editingMapping ? 'Update' : 'Create'} {selectedClusters.length > 1 ? 'Mappings' : 'Mapping'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}