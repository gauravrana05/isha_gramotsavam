import { adminDb } from '@/lib/firebase/admin';
import { serializeFirestoreDocs } from '@/lib/utils/firestore';
import VolunteerAssignmentForm from '@/components/admin/VolunteerAssignmentForm';
import VenueVolunteerList from '@/components/admin/VenueVolunteerList';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, MapPin } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: {
    lang: string;
    venueId: string;
  };
}

async function getVenue(venueId: string) {
  const venueDoc = await adminDb.collection('venues').doc(venueId).get();
  if (!venueDoc.exists) {
    throw new Error('Venue not found');
  }
  return {
    id: venueDoc.id,
    ...venueDoc.data()
  };
}

async function getVolunteers() {
  const volunteersSnapshot = await adminDb.collection('users')
    .where('role', 'in', ['verification_volunteer', 'general_volunteer', 'technical_volunteer'])
    .where('isActive', '==', true)
    .get();
  return serializeFirestoreDocs(volunteersSnapshot.docs);
}

async function getVenueAssignments(venueId: string) {
  const assignmentsSnapshot = await adminDb.collection('volunteerVenueAssignment')
    .where('venueId', '==', venueId)
    .get();
  return serializeFirestoreDocs(assignmentsSnapshot.docs);
}

export default async function VenueVolunteersPage({ params }: PageProps) {
  const { lang, venueId } = params;
  
  const [venue, volunteers, assignments] = await Promise.all([
    getVenue(venueId),
    getVolunteers(),
    getVenueAssignments(venueId)
  ]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Link 
            href={`/${lang}/admin/venues/${venueId}`}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Venue
          </Link>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center space-x-3 mb-4">
            <MapPin className="w-6 h-6 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
              <p className="text-gray-600">
                {venue.address?.district || venue.district}, {venue.address?.state || venue.state}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Type:</span>
              <span className="ml-2 font-medium capitalize">{venue.type}</span>
            </div>
            <div>
              <span className="text-gray-500">Capacity:</span>
              <span className="ml-2 font-medium">{venue.capacity || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500">Sports:</span>
              <span className="ml-2 font-medium">{venue.supportedSports?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Volunteer Assignment Form */}
      <div className="mb-8">
        <VolunteerAssignmentForm 
          volunteers={volunteers} 
          preSelectedVenueId={venueId}
          preSelectedVenueName={venue.name}
        />
      </div>

      {/* Current Volunteer Assignments */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Assigned Volunteers</h2>
        <VenueVolunteerList 
          assignments={assignments} 
          showVenueName={false}
        />
      </div>
    </div>
  );
}