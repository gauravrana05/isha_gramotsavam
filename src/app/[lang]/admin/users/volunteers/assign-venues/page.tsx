import { adminDb } from '@/lib/firebase/admin';
import { assignVolunteerToVenue, removeVolunteerAssignment } from '@/lib/actions/admin/volunteerAssignment';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { serializeFirestoreDocs } from '@/lib/utils/firestore';

async function getVolunteers() {
  const volunteersSnapshot = await adminDb.collection('users')
    .where('role', 'in', ['verification_volunteer', 'checkin_volunteer', 'media_volunteer'])
    .where('isActive', '==', true)
    .get();
  return serializeFirestoreDocs(volunteersSnapshot.docs);
}

async function getVenues() {
  const venuesSnapshot = await adminDb.collection('venues').where('isActive', '==', true).get();
  return serializeFirestoreDocs(venuesSnapshot.docs);
}

async function getVolunteerAssignments() {
  const assignmentsSnapshot = await adminDb.collection('volunteerVenueAssignment').get();
  return serializeFirestoreDocs(assignmentsSnapshot.docs);
}

export default async function VolunteerVenueAssignmentPage() {
  const volunteers = await getVolunteers();
  const venues = await getVenues();
  const assignments = await getVolunteerAssignments();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Volunteer Venue Assignment</h1>
        <p className="text-gray-600">Assign volunteers to venues for tournament management</p>
      </div>

      {/* Assign Volunteer Form */}
      <Card className="mb-8 p-6">
        <h2 className="text-lg font-semibold mb-4">Assign Volunteer</h2>
        <form action={assignVolunteerToVenue} className="space-y-4">
          <input type="hidden" name="eventId" value="isha_gramotsavam_2025" />
          <input type="hidden" name="assignedBy" value="admin" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Volunteer</label>
              <select name="volunteerId" required className="w-full p-2 border rounded">
                <option value="">Select Volunteer</option>
                {volunteers.map(volunteer => (
                  <option key={volunteer.id} value={volunteer.id}>
                    {volunteer.displayName || volunteer.name} - {volunteer.role?.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <input type="hidden" name="volunteerName" value="" />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Venue</label>
              <select name="venueId" required className="w-full p-2 border rounded">
                <option value="">Select Venue</option>
                {venues.map(venue => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
              <input type="hidden" name="venueName" value="" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Volunteer Type</label>
              <select name="volunteerType" required className="w-full p-2 border rounded">
                <option value="verification">Verification</option>
                <option value="checkin">Check-in</option>
                <option value="media">Media</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Contact Phone</label>
              <input 
                type="tel" 
                name="contactPhone" 
                required
                placeholder="e.g., +91-9876543210"
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <Button type="submit">Assign Volunteer</Button>
        </form>
      </Card>

      {/* Current Assignments */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Current Assignments</h2>
        
        {assignments.length === 0 ? (
          <Card className="p-4">
            <p className="text-gray-500">No volunteer assignments found.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map(assignment => (
              <Card key={assignment.id} className="p-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">{assignment.volunteerName}</h3>
                  <p className="text-sm text-gray-600">{assignment.venueName}</p>
                  <p className="text-sm">
                    <span className="capitalize font-medium">{assignment.volunteerType}</span> Volunteer
                  </p>
                  <p className="text-sm">{assignment.contactPhone}</p>
                  <div className="flex items-center space-x-2">
                    <span 
                      className={`inline-block w-2 h-2 rounded-full ${
                        assignment.status === 'confirmed' ? 'bg-green-500' :
                        assignment.status === 'active' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}
                    />
                    <span className="text-sm capitalize">{assignment.status}</span>
                  </div>
                  
                  <form action={removeVolunteerAssignment.bind(null, assignment.id)} className="mt-3">
                    <Button type="submit" variant="destructive" size="sm" className="w-full">
                      Remove Assignment
                    </Button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
