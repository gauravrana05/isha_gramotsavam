'use client'

import { createVenueLocationMapping } from '@/lib/actions/admin/venueMapping';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Venue {
  id: string;
  name: string;
}

interface VenueLocationMappingFormProps {
  venues: Venue[];
}

export default function VenueLocationMappingForm({ venues }: VenueLocationMappingFormProps) {
  const handleVenueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const venueNameInput = document.querySelector('input[name="venueName"]') as HTMLInputElement;
    if (venueNameInput) venueNameInput.value = selectedOption.text;
  };

  return (
    <Card className="mb-8 p-6">
      <h2 className="text-lg font-semibold mb-4">Create New Mapping</h2>
      <form action={createVenueLocationMapping} className="space-y-4">
        <input type="hidden" name="eventId" value="isha_gramotsavam_2025" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Venue</label>
            <select 
              name="venueId" 
              required 
              className="w-full p-2 border rounded"
              onChange={handleVenueChange}
            >
              <option value="">Select Venue</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
            <input type="hidden" name="venueName" />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Venue Type</label>
            <select name="venueType" required className="w-full p-2 border rounded">
              <option value="cluster">Cluster</option>
              <option value="division">Division</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">State</label>
          <input 
            type="text" 
            name="state" 
            placeholder="e.g., Tamil Nadu"
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Districts (comma separated)</label>
          <input 
            type="text" 
            name="districts" 
            placeholder="e.g., Coimbatore, Tirupur"
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Taluks (comma separated)</label>
          <input 
            type="text" 
            name="taluks" 
            placeholder="e.g., Coimbatore North, Coimbatore South"
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max Teams</label>
          <input 
            type="number" 
            name="maxTeams" 
            min="1"
            max="100"
            required
            className="w-full p-2 border rounded"
          />
        </div>

        <Button type="submit">Create Mapping</Button>
      </form>
    </Card>
  );
}