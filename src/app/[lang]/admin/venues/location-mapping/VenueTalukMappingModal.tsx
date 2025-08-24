'use client'

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { createVenueLocationMapping, updateVenueLocationMapping } from '@/lib/actions/admin/venueMapping';
import { pincodeService } from '@/lib/services/pincodeService';

interface Venue {
  id: string;
  name: string;
  address: {
    state: string;
    district: string;
    taluk?: string;
    panchayat?: string;
  };
}

interface ExistingMapping {
  id: string;
  mappingId: string;
  venueName: string;
  venueId: string;
  assignedLocations: {
    districts?: string[];
    taluks?: string[];
    state?: string;
  };
  maxTeams: number;
  isActive: boolean;
}

interface VenueTalukMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  venues: Venue[];
  existingMappings: ExistingMapping[];
  districtsWithMultipleVenues: { district: string; count: number; state: string }[];
  editingMapping?: ExistingMapping | null;
}

export default function VenueTalukMappingModal({
  isOpen,
  onClose,
  venues,
  existingMappings,
  districtsWithMultipleVenues,
  editingMapping
}: VenueTalukMappingModalProps) {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [availableTaluks, setAvailableTaluks] = useState<string[]>([]);
  const [selectedTaluks, setSelectedTaluks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [maxTeams, setMaxTeams] = useState(20);

  // Filter venues to only show those in districts with multiple venues and not already assigned
  const eligibleVenues = venues.filter(venue => {
    const isInMultiVenueDistrict = districtsWithMultipleVenues.some(d => d.district === venue.address.district);
    const isAlreadyAssigned = existingMappings.some(mapping => 
      mapping.venueId === venue.id && mapping.isActive
    );
    
    // If editing, allow the currently selected venue
    if (editingMapping && editingMapping.venueId === venue.id) {
      return isInMultiVenueDistrict;
    }
    
    return isInMultiVenueDistrict && !isAlreadyAssigned;
  });

  // Initialize form when editing
  useEffect(() => {
    if (editingMapping && isOpen) {
      const venue = venues.find(v => v.id === editingMapping.venueId);
      if (venue) {
        setSelectedVenue(venue);
        setSelectedTaluks(editingMapping.assignedLocations.taluks || []);
        setMaxTeams(editingMapping.maxTeams);
        // Load taluks for the venue
        loadTaluks(venue.address.state, venue.address.district);
      }
    }
  }, [editingMapping, isOpen, venues]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedVenue(null);
      setAvailableTaluks([]);
      setSelectedTaluks([]);
      setMaxTeams(20);
      setError('');
    }
  }, [isOpen]);

  const loadTaluks = async (state: string, district: string) => {
    setLoading(true);
    try {
      const data = await pincodeService.getTaluksByDistrict(state, district);
      const allTaluks = data.taluks || [];
      
      // Filter out taluks that are already mapped to other venues
      const mappedTaluks = existingMappings
        .filter(mapping => mapping.isActive && (!editingMapping || mapping.id !== editingMapping.id))
        .flatMap(mapping => mapping.assignedLocations?.taluks || []);
      
      const availableTaluks = allTaluks.filter(taluk => !mappedTaluks.includes(taluk));
      
      setAvailableTaluks(availableTaluks);
      if (!editingMapping) {
        setSelectedTaluks([]);
      }
    } catch (err: any) {
      // Error loading taluks
      setError(err.message || 'Failed to load taluks');
      setAvailableTaluks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVenueChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const venueId = e.target.value;
    if (!venueId) {
      setSelectedVenue(null);
      setAvailableTaluks([]);
      setSelectedTaluks([]);
      return;
    }

    const venue = venues.find(v => v.id === venueId);
    if (venue) {
      setSelectedVenue(venue);
      setError('');
      await loadTaluks(venue.address.state, venue.address.district);
    }
  };

  const handleTalukChange = (taluk: string, checked: boolean) => {
    if (checked) {
      setSelectedTaluks(prev => [...prev, taluk]);
    } else {
      setSelectedTaluks(prev => prev.filter(t => t !== taluk));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVenue) {
      setError('Please select a venue');
      return;
    }

    if (selectedTaluks.length === 0) {
      setError('Please select at least one taluk');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('eventId', 'isha_gramotsavam_2025');
    formData.append('venueId', selectedVenue.id);
    formData.append('venueName', selectedVenue.name);
    formData.append('venueType', 'cluster');
    formData.append('state', selectedVenue.address.state);
    formData.append('districts', selectedVenue.address.district);
    formData.append('taluks', selectedTaluks.join(','));
    formData.append('panchayats', '');
    formData.append('maxTeams', maxTeams.toString());

    try {
      if (editingMapping) {
        await updateVenueLocationMapping(editingMapping.id, formData);
      } else {
        await createVenueLocationMapping(formData);
      }
      
      // Reset form and close modal
      setSelectedVenue(null);
      setAvailableTaluks([]);
      setSelectedTaluks([]);
      setMaxTeams(20);
      setError('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save mapping');
    } finally {
      setLoading(false);
    }
  };

  if (districtsWithMultipleVenues.length === 0) {
    return null; // Don't show modal if no districts need mapping
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingMapping ? 'Edit Venue-Taluk Mapping' : 'Create Venue-Taluk Mapping'}
      size="lg"
    >
      <div className="p-6">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Venue Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Venue (Districts with multiple venues only)
            </label>
            {editingMapping ? (
              /* Read-only display when editing */
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                {selectedVenue?.name} ({selectedVenue?.address.district})
                <span className="text-xs text-gray-500 ml-2">(Cannot be changed when editing)</span>
              </div>
            ) : (
              /* Dropdown when creating new */
              <Select 
                value={selectedVenue?.id || ''}
                onValueChange={(value) => handleVenueChange({ target: { value } } as React.ChangeEvent<HTMLSelectElement>)}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a venue to map..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleVenues.map(venue => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name} ({venue.address.district})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {(selectedVenue || editingMapping) && (
            <>
              {/* Venue Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Selected Venue</h3>
                <div className="text-sm text-gray-600">
                  <div><strong>Name:</strong> {selectedVenue?.name || editingMapping?.venueName}</div>
                  <div><strong>Location:</strong> {selectedVenue?.address.district || editingMapping?.assignedLocations.districts?.[0]}, {selectedVenue?.address.state || editingMapping?.assignedLocations.state}</div>
                </div>
              </div>

              {/* Taluk Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Taluks to assign to this venue
                  {loading && <span className="text-blue-500 ml-2">(Loading...)</span>}
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Teams from the selected taluks will be automatically assigned to this venue.
                </p>
                
                {availableTaluks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {availableTaluks.map(taluk => (
                      <label key={taluk} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedTaluks.includes(taluk)}
                          onChange={(e) => handleTalukChange(taluk, e.target.checked)}
                          disabled={loading}
                          className="rounded border-gray-300 text-[#3A7F3F] focus:ring-[#3A7F3F] disabled:opacity-50"
                        />
                        <span className="text-sm">{taluk}</span>
                      </label>
                    ))}
                  </div>
                ) : !loading ? (
                  <div className="text-sm text-gray-500 italic">No taluks available</div>
                ) : null}
              </div>

              {/* Max Teams */}
              <div>
                <label className="block text-sm font-medium mb-2">Maximum Teams</label>
                <input 
                  type="number" 
                  value={maxTeams}
                  onChange={(e) => setMaxTeams(parseInt(e.target.value) || 20)}
                  min="1"
                  max="100"
                  required
                  disabled={loading}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F] disabled:bg-gray-100"
                />
              </div>

              {/* Selection Summary */}
              {selectedTaluks.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Mapping Summary</h4>
                  <div className="text-sm text-blue-800">
                    <div><strong>Venue:</strong> {selectedVenue?.name || editingMapping?.venueName}</div>
                    <div><strong>Will serve teams from:</strong></div>
                    <div className="ml-4 mt-1">
                      <strong>Taluks:</strong> {selectedTaluks.join(', ')}
                    </div>
                    <div className="mt-2"><strong>Max Teams:</strong> {maxTeams}</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || selectedTaluks.length === 0}
              className="flex-1"
            >
              {loading ? 'Saving...' : editingMapping ? 'Update Mapping' : 'Create Mapping'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}