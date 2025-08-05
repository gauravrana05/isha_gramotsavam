import { adminDb } from '@/lib/firebase/admin';
import { serializeFirestoreDocs } from '@/lib/utils/firestore';
import VolunteerAssignmentForm from '@/components/admin/VolunteerAssignmentForm';
import VenueVolunteerList from '@/components/admin/VenueVolunteerList';

async function getVolunteers() {
  const volunteersSnapshot = await adminDb.collection('users')
    .where('role', 'in', ['verification_volunteer', 'general_volunteer', 'technical_volunteer'])
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
      <div className="mb-8">
        <VolunteerAssignmentForm volunteers={volunteers} venues={venues} />
      </div>

      {/* Current Assignments */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Current Assignments</h2>
        <VenueVolunteerList assignments={assignments} showVenueName={true} />
      </div>
    </div>
  );
}
