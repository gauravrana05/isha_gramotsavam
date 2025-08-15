'use client'

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClusterDivisionMapping } from '@/lib/actions/admin/venueMapping';

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
  const [selectedCluster, setSelectedCluster] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCluster || !selectedDivision) {
      setError('Please select both cluster and division venues');
      return;
    }

    // Check if mapping already exists
    const clusterVenue = clusterVenues.find(v => v.id === selectedCluster);
    const divisionVenue = divisionVenues.find(v => v.id === selectedDivision);
    
    if (!clusterVenue || !divisionVenue) {
      setError('Invalid venue selection');
      return;
    }

    const existingMapping = existingMappings.find(m => 
      m.clusterVenueName === clusterVenue.name
    );

    if (existingMapping) {
      setError(`${clusterVenue.name} is already mapped to ${existingMapping.divisionVenueName}`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('eventId', 'isha_gramotsavam_2025');
      formData.append('clusterVenueId', selectedCluster);
      formData.append('clusterVenueName', clusterVenue.name);
      formData.append('divisionVenueId', selectedDivision);
      formData.append('divisionVenueName', divisionVenue.name);

      const result = await createClusterDivisionMapping(formData);
      
      if (result.success) {
        // Reset form and close modal
        setSelectedCluster('');
        setSelectedDivision('');
        onClose();
        // Page will refresh due to revalidatePath in server action
      } else {
        setError(result.error || 'Failed to create mapping');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error creating mapping:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFilteredDivisions = () => {
    if (!selectedCluster) return divisionVenues;
    
    const clusterVenue = clusterVenues.find(v => v.id === selectedCluster);
    if (!clusterVenue) return divisionVenues;
    
    // Filter divisions in the same state as the selected cluster
    return divisionVenues.filter(d => d.state === clusterVenue.state);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Create Cluster-Division Mapping</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Cluster Venue Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cluster Venue
            </label>
            <select
              value={selectedCluster}
              onChange={(e) => {
                setSelectedCluster(e.target.value);
                setSelectedDivision(''); // Reset division when cluster changes
                setError('');
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Cluster Venue</option>
              {clusterVenues.map(venue => {
                const isAlreadyMapped = existingMappings.some(m => m.clusterVenueName === venue.name);
                return (
                  <option 
                    key={venue.id} 
                    value={venue.id}
                    disabled={isAlreadyMapped}
                  >
                    {venue.name} - {venue.district}, {venue.state}
                    {isAlreadyMapped && ' (Already Mapped)'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Division Venue Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Division Venue
            </label>
            <select
              value={selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value);
                setError('');
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={!selectedCluster}
            >
              <option value="">Select Division Venue</option>
              {getFilteredDivisions().map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name} - {venue.district}, {venue.state}
                </option>
              ))}
            </select>
            {selectedCluster && getFilteredDivisions().length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                No division venues found in the same state as the selected cluster.
              </p>
            )}
          </div>

          {/* Info Box */}
          {selectedCluster && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-700 text-sm">
                <strong>Note:</strong> Division venues are filtered to show only those in the same state as the selected cluster venue.
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
              disabled={isSubmitting || !selectedCluster || !selectedDivision}
              loading={isSubmitting}
            >
              Create Mapping
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}