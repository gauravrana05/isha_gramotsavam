'use client'

import { useState, useEffect } from 'react';
import { createVenueLocationMapping } from '@/lib/actions/admin/venueMapping';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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

interface VenueLocationMappingFormProps {
  venues: Venue[];
  districtsWithMultipleVenues: { district: string; count: number; state: string }[];
}

export default function VenueLocationMappingForm({ venues, districtsWithMultipleVenues }: VenueLocationMappingFormProps) {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [availableTaluks, setAvailableTaluks] = useState<string[]>([]);
  const [selectedTaluks, setSelectedTaluks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [maxTeams, setMaxTeams] = useState(20);

  // Filter venues to only show those in districts with multiple venues
  const eligibleVenues = venues.filter(venue => 
    districtsWithMultipleVenues.some(d => d.district === venue.address.district)
  );

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
      
      console.log('Selected venue:', venue);
      console.log('Loading taluks for:', venue.address.state, venue.address.district);
      
      // Load taluks for the venue's district
      await loadTaluks(venue.address.state, venue.address.district);
    }
  };

  const loadTaluks = async (state: string, district: string) => {
    setLoading(true);
    try {
      console.log('Fetching taluks for:', state, district);
      const data = await pincodeService.getTaluksByDistrict(state, district);
      console.log('Received data:', data);
      setAvailableTaluks(data.taluks || []);
      setSelectedTaluks([]);
    } catch (err: any) {
      console.error('Error loading taluks:', err);
      setError(err.message || 'Failed to load taluks');
      setAvailableTaluks([]);
    } finally {
      setLoading(false);
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

    const formData = new FormData();
    formData.append('eventId', 'isha_gramotsavam_2025');
    formData.append('venueId', selectedVenue.id);
    formData.append('venueName', selectedVenue.name);
    formData.append('venueType', 'cluster');
    formData.append('state', selectedVenue.address.state);
    formData.append('districts', selectedVenue.address.district);
    formData.append('taluks', selectedTaluks.join(','));
    formData.append('panchayats', ''); // Empty since we're not using panchayats
    formData.append('maxTeams', maxTeams.toString());

    try {
      await createVenueLocationMapping(formData);
      // Reset form
      setSelectedVenue(null);
      setAvailableTaluks([]);
      setSelectedTaluks([]);
      setMaxTeams(20);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to create mapping');
    }
  };

  if (districtsWithMultipleVenues.length === 0) {
    return (
      <Card className="mb-8 p-6">
        <h2 className="text-lg font-semibold mb-4">Venue Location Mapping</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-green-600 text-sm">
              ✓ All districts have single cluster venues. No manual mapping required.
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Teams will be automatically assigned to their district&apos;s cluster venue.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-8 p-6">
      <h2 className="text-lg font-semibold mb-4">Create Venue-Taluk Mapping</h2>
      
      {districtsWithMultipleVenues.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="text-yellow-800 text-sm font-medium mb-2">
            ⚠️ Districts requiring manual mapping:
          </div>
          <div className="text-sm text-yellow-700">
            {districtsWithMultipleVenues.map(d => 
              `${d.district} (${d.count} venues)`
            ).join(', ')}
          </div>
          <p className="text-xs text-yellow-600 mt-2">
            Map venues to specific taluks to avoid conflicts during team assignment.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Venue Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Select Venue (Districts with multiple venues only)</label>
          <select 
            value={selectedVenue?.id || ''}
            onChange={handleVenueChange}
            required 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
          >
            <option value="">Choose a venue to map...</option>
            {eligibleVenues.map(venue => (
              <option key={venue.id} value={venue.id}>
                {venue.name} ({venue.address.district})
              </option>
            ))}
          </select>
        </div>

        {selectedVenue && (
          <>
            {/* Venue Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Selected Venue</h3>
              <div className="text-sm text-gray-600">
                <div><strong>Name:</strong> {selectedVenue.name}</div>
                <div><strong>Location:</strong> {selectedVenue.address.district}, {selectedVenue.address.state}</div>
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
                        className="rounded border-gray-300 text-[#3A7F3F] focus:ring-[#3A7F3F]"
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
              />
            </div>

            {/* Selection Summary */}
            {selectedTaluks.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Mapping Summary</h4>
                <div className="text-sm text-blue-800">
                  <div><strong>Venue:</strong> {selectedVenue.name}</div>
                  <div><strong>Will serve teams from:</strong></div>
                  <div className="ml-4 mt-1">
                    <strong>Taluks:</strong> {selectedTaluks.join(', ')}
                  </div>
                  <div className="mt-2"><strong>Max Teams:</strong> {maxTeams}</div>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading || selectedTaluks.length === 0}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Create Mapping'}
            </Button>
          </>
        )}
      </form>
    </Card>
  );
}