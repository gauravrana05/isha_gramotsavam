'use client'

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClusterDivisionMapping, createStateClusterMapping } from '@/lib/actions/admin/venueMapping';

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
  clusterVenueName: string;
  divisionVenueName: string;
  clusterState: string;
}

interface ClusterDivisionMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  clusterVenues: Venue[];
  divisionVenues: Venue[];
  existingMappings: ClusterDivisionMapping[];
}

export default function ClusterDivisionMappingModal({
  isOpen,
  onClose,
  clusterVenues,
  divisionVenues,
  existingMappings
}: ClusterDivisionMappingModalProps) {
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mappingMode, setMappingMode] = useState<'single' | 'multiple'>('multiple');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDivision) {
      setError('Please select a division venue');
      return;
    }

    if (mappingMode === 'multiple' && selectedClusters.length === 0) {
      setError('Please select at least one cluster venue');
      return;
    }

    if (mappingMode === 'single' && selectedClusters.length === 0) {
      setError('Please select a cluster venue');
      return;
    }

    const divisionVenue = divisionVenues.find(v => v.id === selectedDivision);
    if (!divisionVenue) {
      setError('Invalid division venue selection');
      return;
    }

    // Check for existing mappings
    const conflicts = selectedClusters.filter(clusterId => {
      const clusterVenue = clusterVenues.find(v => v.id === clusterId);
      return clusterVenue && existingMappings.some(m => 
        m.clusterVenueName === clusterVenue.name
      );
    });

    if (conflicts.length > 0) {
      const conflictNames = conflicts.map(id => 
        clusterVenues.find(v => v.id === id)?.name
      ).join(', ');
      setError(`The following cluster venues are already mapped: ${conflictNames}`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (mappingMode === 'multiple') {
        // Use the state cluster mapping for multiple clusters
        const formData = new FormData();
        formData.append('eventId', 'isha_gramotsavam_2025');
        formData.append('state', divisionVenue.state);
        formData.append('clusterVenueIds', selectedClusters.join(','));
        formData.append('divisionVenueId', selectedDivision);

        const result = await createStateClusterMapping(formData);
        
        if (result.success) {
          // Reset form and close modal
          setSelectedDivision('');
          setSelectedClusters([]);
          onClose();
        } else {
          setError(result.error || 'Failed to create mappings');
        }
      } else {
        // Single mapping mode
        const clusterVenue = clusterVenues.find(v => v.id === selectedClusters[0]);
        if (!clusterVenue) {
          setError('Invalid cluster venue selection');
          return;
        }

        const formData = new FormData();
        formData.append('eventId', 'isha_gramotsavam_2025');
        formData.append('clusterVenueId', selectedClusters[0]);
        formData.append('clusterVenueName', clusterVenue.name);
        formData.append('divisionVenueId', selectedDivision);
        formData.append('divisionVenueName', divisionVenue.name);

        const result = await createClusterDivisionMapping(formData);
        
        if (result.success) {
          // Reset form and close modal
          setSelectedDivision('');
          setSelectedClusters([]);
          onClose();
        } else {
          setError(result.error || 'Failed to create mapping');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error creating mapping:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFilteredClusters = () => {
    if (!selectedDivision) return clusterVenues;
    
    const divisionVenue = divisionVenues.find(v => v.id === selectedDivision);
    if (!divisionVenue) return clusterVenues;
    
    // Filter clusters in the same state as the selected division
    return clusterVenues.filter(c => c.state === divisionVenue.state);
  };

  const handleClusterToggle = (clusterId: string) => {
    if (mappingMode === 'single') {
      setSelectedClusters([clusterId]);
    } else {
      setSelectedClusters(prev => 
        prev.includes(clusterId) 
          ? prev.filter(id => id !== clusterId)
          : [...prev, clusterId]
      );
    }
    setError('');
  };

  const handleDivisionChange = (divisionId: string) => {
    setSelectedDivision(divisionId);
    setSelectedClusters([]); // Reset clusters when division changes
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Create Division to Cluster Mapping</h2>
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

          {/* Mapping Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mapping Mode
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="multiple"
                  checked={mappingMode === 'multiple'}
                  onChange={(e) => setMappingMode(e.target.value as 'multiple')}
                  className="mr-2"
                />
                Multiple Clusters to One Division
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="single"
                  checked={mappingMode === 'single'}
                  onChange={(e) => setMappingMode(e.target.value as 'single')}
                  className="mr-2"
                />
                Single Mapping
              </label>
            </div>
          </div>

          {/* Division Venue Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Division Venue <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedDivision}
              onChange={(e) => handleDivisionChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Division Venue</option>
              {divisionVenues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name} - {venue.district}, {venue.state}
                </option>
              ))}
            </select>
          </div>

          {/* Cluster Venues Selection */}
          {selectedDivision && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cluster Venues in {divisionVenues.find(v => v.id === selectedDivision)?.state} <span className="text-red-500">*</span>
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                {getFilteredClusters().length === 0 ? (
                  <p className="text-gray-500 text-sm">No cluster venues found in the same state.</p>
                ) : (
                  <div className="space-y-2">
                    {getFilteredClusters().map(venue => {
                      const isAlreadyMapped = existingMappings.some(m => m.clusterVenueName === venue.name);
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
                            type={mappingMode === 'single' ? 'radio' : 'checkbox'}
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
                <strong>Note:</strong> Only cluster venues in the same state as the selected division venue are shown.
                {mappingMode === 'multiple' && ' You can select multiple cluster venues to map to this division.'}
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
              Create {selectedClusters.length > 1 ? 'Mappings' : 'Mapping'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}