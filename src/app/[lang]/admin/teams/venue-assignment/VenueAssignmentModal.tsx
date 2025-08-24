'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, addDoc, collection, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { 
  X, 
  MapPin, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Loader2
} from 'lucide-react';

interface TeamAssignment {
  assignmentId: string;
  teamId: string;
  teamName: string;
  teamLocation: {
    state: string;
    district: string;
    panchayat: string;
  };
  venueId?: string;
  venueName?: string;
  venueType?: 'cluster' | 'division';
  assignmentLevel?: 'cluster' | 'division';
  status: 'assigned' | 'confirmed' | 'checked_in' | 'pending_manual_assignment';
  assignedBy?: string;
  isAutoAssigned: boolean;
  assignedAt?: string;
  queuedAt?: string;
  reason?: string;
  sportName?: string;
  genderCategory?: string;
  currentLevel?: 'cluster' | 'division';
  isPending: boolean;
}

interface Venue {
  id: string;
  name: string;
  type: string;
}

interface VenueAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: TeamAssignment;
  venues: Venue[];
  onSuccess: () => void;
}

export default function VenueAssignmentModal({
  isOpen,
  onClose,
  assignment,
  venues,
  onSuccess
}: VenueAssignmentModalProps) {
  const [selectedVenueId, setSelectedVenueId] = useState<string>(assignment.venueId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter venues based on team's current level
  const getFilteredVenues = () => {
    const currentLevel = assignment.currentLevel || 'cluster';
    
    return venues.filter(venue => {
      // Never show finals venues - they are auto-assigned to division winners
      if (venue.type === 'finals') {
        return false;
      }
      
      // For cluster level teams, show only cluster venues
      if (currentLevel === 'cluster') {
        return venue.type === 'cluster';
      }
      
      // For division level teams, show only division venues
      if (currentLevel === 'division') {
        return venue.type === 'division';
      }
      
      return false;
    });
  };

  const filteredVenues = getFilteredVenues();

  // Helper function to remove undefined values from object
  const cleanObject = (obj: any) => {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        cleaned[key] = obj[key];
      }
    });
    return cleaned;
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedVenueId(assignment.venueId || '');
      setError('');
    }
  }, [isOpen, assignment.venueId]);

  const handleAssignVenue = async () => {
    if (!selectedVenueId) {
      setError('Please select a venue');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const selectedVenue = filteredVenues.find(v => v.id === selectedVenueId);
      if (!selectedVenue) {
        setError('Selected venue not found');
        return;
      }

      if (assignment.isPending) {
        // Create new assignment from pending queue
        const assignmentData = cleanObject({
          teamId: assignment.teamId,
          teamName: assignment.teamName,
          venueId: selectedVenueId,
          venueName: selectedVenue.name,
          clusterVenueId: selectedVenue.type === 'cluster' ? selectedVenueId : undefined,
          clusterVenueName: selectedVenue.type === 'cluster' ? selectedVenue.name : undefined,
          divisionVenueId: selectedVenue.type === 'division' ? selectedVenueId : undefined,
          divisionVenueName: selectedVenue.type === 'division' ? selectedVenue.name : undefined,
          assignmentLevel: selectedVenue.type === 'cluster' ? 'cluster' : 'division',
          status: 'assigned',
          assignedAt: serverTimestamp(),
          assignedBy: 'admin_manual',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Add to teamVenueAssignment collection
        await addDoc(collection(db, 'teamVenueAssignment'), assignmentData);

        // Remove from manual queue
        await deleteDoc(doc(db, 'manualVenueAssignmentQueue', assignment.assignmentId));

        // Update team document
        const teamUpdateData = cleanObject({
          clusterVenue: selectedVenue.type === 'cluster' ? selectedVenue.name : undefined,
          clusterVenueId: selectedVenue.type === 'cluster' ? selectedVenueId : undefined,
          divisionVenue: selectedVenue.type === 'division' ? selectedVenue.name : undefined,
          divisionVenueId: selectedVenue.type === 'division' ? selectedVenueId : undefined,
          currentLevel: selectedVenue.type === 'cluster' ? 'cluster' : 'division',
          updatedAt: serverTimestamp()
        });
        await updateDoc(doc(db, 'teams', assignment.teamId), teamUpdateData);

      } else {
        // Update existing assignment
        const updateData = cleanObject({
          venueId: selectedVenueId,
          venueName: selectedVenue.name,
          clusterVenueId: selectedVenue.type === 'cluster' ? selectedVenueId : undefined,
          clusterVenueName: selectedVenue.type === 'cluster' ? selectedVenue.name : undefined,
          divisionVenueId: selectedVenue.type === 'division' ? selectedVenueId : undefined,
          divisionVenueName: selectedVenue.type === 'division' ? selectedVenue.name : undefined,
          assignmentLevel: selectedVenue.type === 'cluster' ? 'cluster' : 'division',
          assignedBy: 'admin_manual',
          updatedAt: serverTimestamp()
        });

        await updateDoc(doc(db, 'teamVenueAssignment', assignment.assignmentId), updateData);

        // Update team document
        const teamUpdateDataExisting = cleanObject({
          clusterVenue: selectedVenue.type === 'cluster' ? selectedVenue.name : undefined,
          clusterVenueId: selectedVenue.type === 'cluster' ? selectedVenueId : undefined,
          divisionVenue: selectedVenue.type === 'division' ? selectedVenue.name : undefined,
          divisionVenueId: selectedVenue.type === 'division' ? selectedVenueId : undefined,
          currentLevel: selectedVenue.type === 'cluster' ? 'cluster' : 'division',
          updatedAt: serverTimestamp()
        });
        await updateDoc(doc(db, 'teams', assignment.teamId), teamUpdateDataExisting);
      }

      onSuccess();
    } catch (error) {
      console.error('Venue assignment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to assign venue: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {assignment.isPending ? 'Assign Venue' : 'Edit Venue Assignment'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {assignment.isPending ? 'Assign a venue to this pending team' : 'Change venue assignment'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Team Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center mb-2">
              <Users className="w-5 h-5 text-gray-400 mr-2" />
              <span className="font-medium text-gray-900">{assignment.teamName}</span>
              {assignment.isPending && (
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  Pending
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              <div>{assignment.sportName} • {assignment.genderCategory}</div>
              <div>{assignment.teamLocation.panchayat}, {assignment.teamLocation.district}</div>
            </div>
            {assignment.reason && (
              <div className="mt-2 text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                {assignment.reason}
              </div>
            )}
          </div>

          {/* Current Venue (if assigned) */}
          {!assignment.isPending && assignment.venueName && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center text-blue-800">
                <MapPin className="w-4 h-4 mr-2" />
                <span className="font-medium">Current Venue: {assignment.venueName}</span>
              </div>
              <div className="text-sm text-blue-600 mt-1">
                Level: {assignment.assignmentLevel}
              </div>
            </div>
          )}

          {/* Venue Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {assignment.isPending ? 'Select Venue' : 'Change Venue'}
            </label>
            
            {/* Level info */}
            <div className="mb-2 text-sm text-blue-600">
              Showing {assignment.currentLevel || 'cluster'} level venues only
              {filteredVenues.length === 0 && (
                <span className="text-red-600 ml-2">
                  • No venues available for this level
                </span>
              )}
            </div>
            
            <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
              <SelectTrigger>
                <SelectValue placeholder={
                  filteredVenues.length === 0 
                    ? "No venues available" 
                    : "Choose a venue..."
                } />
              </SelectTrigger>
              <SelectContent>
                {filteredVenues.map(venue => (
                  <SelectItem key={venue.id} value={venue.id}>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-medium">{venue.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center text-red-800">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignVenue}
            disabled={loading || !selectedVenueId || filteredVenues.length === 0}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {assignment.isPending ? 'Assign Venue' : 'Update Venue'}
          </Button>
        </div>
      </div>
    </div>
  );
}