'use client'

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
// import { db } from '@/lib/firebase/config';
// import { collection, getDocs, query, where } from 'firebase/firestore';

interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface VolunteerAssignment {
  volunteerId: string;
  volunteerName: string;
  volunteerEmail: string;
  volunteerType: 'general' | 'technical';
}

interface VenueVolunteerAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (assignment: VolunteerAssignment) => void;
  currentAssignments: VolunteerAssignment[];
  venueName: string;
}

export default function VenueVolunteerAssignmentModal({
  isOpen,
  onClose,
  onAssign,
  currentAssignments,
  venueName
}: VenueVolunteerAssignmentModalProps) {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState('');
  const [volunteerType, setVolunteerType] = useState<'general' | 'technical'>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [error, setError] = useState('');

  // Load volunteers when modal opens
  useEffect(() => {
    if (isOpen) {
      loadVolunteers();
    }
  }, [isOpen]);

  const loadVolunteers = async () => {
    try {
      setLoadingVolunteers(true);
      const usersCollection = collection(db, 'users');
      
      // Only get general_volunteer users (available for assignment)
      const volunteersQuery = query(usersCollection, where('role', '==', 'general_volunteer'));
      const volunteersSnapshot = await getDocs(volunteersQuery);
      const volunteersData = volunteersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Volunteer));
      
      const activeVolunteers = volunteersData.filter(volunteer => volunteer.isActive !== false);
      setVolunteers(activeVolunteers);
    } catch (err: any) {
      // Error handling removed
      setError('Failed to load volunteers. Please try again.');
    } finally {
      setLoadingVolunteers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVolunteer) {
      setError('Please select a volunteer');
      return;
    }

    // Check if volunteer is already assigned
    const isAlreadyAssigned = currentAssignments.some(
      assignment => assignment.volunteerId === selectedVolunteer
    );

    if (isAlreadyAssigned) {
      setError('This volunteer is already assigned to this venue');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const volunteer = volunteers.find(v => v.id === selectedVolunteer);
      if (!volunteer) {
        setError('Selected volunteer not found');
        return;
      }

      const assignment: VolunteerAssignment = {
        volunteerId: selectedVolunteer,
        volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
        volunteerEmail: volunteer.email,
        volunteerType: volunteerType
      };

      onAssign(assignment);
      
      // Reset form
      setSelectedVolunteer('');
      setVolunteerType('general');
      onClose();
    } catch (err: any) {
      setError('Failed to assign volunteer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedVolunteer('');
    setVolunteerType('general');
    setError('');
    onClose();
  };

  // Filter out already assigned volunteers
  const availableVolunteers = volunteers.filter(volunteer => 
    !currentAssignments.some(assignment => assignment.volunteerId === volunteer.id)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Assign Volunteer</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Venue Display */}
          <div>
            <label className="block text-sm font-medium mb-2">Venue</label>
            <input
              type="text"
              value={venueName || 'New Venue'}
              disabled
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
            />
          </div>

          {/* Volunteer Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Volunteer</label>
            {loadingVolunteers ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading volunteers...
              </div>
            ) : (
              <select 
                value={selectedVolunteer}
                onChange={(e) => {
                  setSelectedVolunteer(e.target.value);
                  setError('');
                }}
                required 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
              >
                <option value="">Select Volunteer</option>
                {availableVolunteers.map(volunteer => (
                  <option key={volunteer.id} value={volunteer.id}>
                    {volunteer.firstName} {volunteer.lastName} - {volunteer.email}
                  </option>
                ))}
              </select>
            )}
            {!loadingVolunteers && availableVolunteers.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                No volunteers available for assignment
              </p>
            )}
          </div>
          
          {/* Volunteer Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Volunteer Type</label>
            <select 
              value={volunteerType}
              onChange={(e) => setVolunteerType(e.target.value as 'general' | 'technical')}
              required 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A7F3F] focus:border-[#3A7F3F]"
            >
              <option value="general">General</option>
              <option value="technical">Technical</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !selectedVolunteer || loadingVolunteers}
              loading={isSubmitting}
              className="flex-1"
            >
              Assign Volunteer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}