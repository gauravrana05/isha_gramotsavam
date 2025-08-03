'use client'

import { useState } from 'react';
import { assignVolunteerToVenue } from '@/lib/actions/admin/volunteerAssignment';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Volunteer {
  id: string;
  displayName?: string;
  name?: string;
  role: string;
}

interface Venue {
  id: string;
  name: string;
}

interface VolunteerAssignmentFormProps {
  volunteers: Volunteer[];
  venues?: Venue[];
  preSelectedVenueId?: string;
  preSelectedVenueName?: string;
  onAssignmentSuccess?: () => void;
}

export default function VolunteerAssignmentForm({ 
  volunteers, 
  venues, 
  preSelectedVenueId, 
  preSelectedVenueName,
  onAssignmentSuccess 
}: VolunteerAssignmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData(e.currentTarget);
      
      // Add selected volunteer name
      const volunteerId = formData.get('volunteerId') as string;
      const selectedVolunteer = volunteers.find(v => v.id === volunteerId);
      if (selectedVolunteer) {
        formData.set('volunteerName', selectedVolunteer.displayName || selectedVolunteer.name || '');
      }

      // Add venue name if not pre-selected
      if (!preSelectedVenueId && venues) {
        const venueId = formData.get('venueId') as string;
        const selectedVenue = venues.find(v => v.id === venueId);
        if (selectedVenue) {
          formData.set('venueName', selectedVenue.name);
        }
      }

      await assignVolunteerToVenue(formData);
      
      setSuccess('Volunteer assigned successfully!');
      e.currentTarget.reset();
      
      if (onAssignmentSuccess) {
        onAssignmentSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to assign volunteer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">
        {preSelectedVenueId ? `Assign Volunteer to ${preSelectedVenueName}` : 'Assign Volunteer'}
      </h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="eventId" value="isha_gramotsavam_2025" />
        <input type="hidden" name="assignedBy" value="admin" />
        
        {preSelectedVenueId && (
          <>
            <input type="hidden" name="venueId" value={preSelectedVenueId} />
            <input type="hidden" name="venueName" value={preSelectedVenueName || ''} />
          </>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Volunteer</label>
            <select 
              name="volunteerId" 
              required 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
            >
              <option value="">Select Volunteer</option>
              {volunteers.map(volunteer => (
                <option key={volunteer.id} value={volunteer.id}>
                  {volunteer.displayName || volunteer.name} - {volunteer.role?.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          
          {!preSelectedVenueId && venues && (
            <div>
              <label className="block text-sm font-medium mb-2">Venue</label>
              <select 
                name="venueId" 
                required 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
              >
                <option value="">Select Venue</option>
                {venues.map(venue => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-2">Volunteer Type</label>
            <select 
              name="volunteerType" 
              required 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
            >
              <option value="general">General</option>
              <option value="technical">Technical</option>
            </select>
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={loading}
          className="w-full md:w-auto"
        >
          {loading ? 'Assigning...' : 'Assign Volunteer'}
        </Button>
      </form>
    </Card>
  );
}