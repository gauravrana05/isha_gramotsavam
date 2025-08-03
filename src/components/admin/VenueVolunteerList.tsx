'use client'

import { removeVolunteerAssignment } from '@/lib/actions/admin/volunteerAssignment';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { UserCheck, UserX } from 'lucide-react';

interface VolunteerAssignment {
  id: string;
  volunteerName: string;
  volunteerType: string;
  status: string;
  venueName?: string;
  venueId?: string;
}

interface VenueVolunteerListProps {
  assignments: VolunteerAssignment[];
  showVenueName?: boolean;
  venueFilter?: string;
  onAssignmentRemoved?: () => void;
}

export default function VenueVolunteerList({ 
  assignments, 
  showVenueName = true, 
  venueFilter,
  onAssignmentRemoved 
}: VenueVolunteerListProps) {
  // Filter assignments if venueFilter is provided
  const filteredAssignments = venueFilter 
    ? assignments.filter(assignment => assignment.venueId === venueFilter)
    : assignments;

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      await removeVolunteerAssignment(assignmentId);
      if (onAssignmentRemoved) {
        onAssignmentRemoved();
      }
    } catch (error) {
      console.error('Failed to remove assignment:', error);
    }
  };

  if (filteredAssignments.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <UserX className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No volunteer assignments found.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredAssignments.map(assignment => (
        <Card key={assignment.id} className="p-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">{assignment.volunteerName}</h3>
            </div>
            
            {showVenueName && assignment.venueName && (
              <p className="text-sm text-gray-600">
                <strong>Venue:</strong> {assignment.venueName}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                  {assignment.volunteerType}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span 
                  className={`inline-block w-2 h-2 rounded-full ${
                    assignment.status === 'confirmed' ? 'bg-green-500' :
                    assignment.status === 'active' ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}
                />
                <span className="text-xs capitalize text-gray-600">{assignment.status}</span>
              </div>
            </div>
            
            <Button 
              onClick={() => handleRemoveAssignment(assignment.id)}
              variant="destructive" 
              size="sm" 
              className="w-full mt-3"
            >
              Remove Assignment
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}