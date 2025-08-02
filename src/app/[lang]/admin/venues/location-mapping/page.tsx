import { adminDb } from '@/lib/firebase/admin';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import VenueLocationMappingForm from './VenueLocationMappingForm';
import { deleteVenueLocationMapping } from '@/lib/actions/admin/venueMapping';
import { serializeFirestoreDocs } from '@/lib/utils/firestore';

async function getVenues() {
  const venuesSnapshot = await adminDb.collection('venues').where('isActive', '==', true).get();
  return venuesSnapshot.docs.map(doc => {
    const data = doc.data();
    // Only return the fields needed for the form
    return {
      id: doc.id,
      name: data.name,
    };
  });
}

async function getVenueLocationMappings() {
  const mappingsSnapshot = await adminDb.collection('venueLocationMapping')
    .where('isActive', '==', true).get();
  return serializeFirestoreDocs(mappingsSnapshot.docs);
}

export default async function VenueLocationMappingPage() {
  const venues = await getVenues();
  const mappings = await getVenueLocationMappings();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Venue Location Mapping</h1>
        <p className="text-gray-600">Map venues to locations for automatic team assignment</p>
      </div>

      {/* Create New Mapping Form */}
      <VenueLocationMappingForm venues={venues} />

      {/* Existing Mappings */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Existing Mappings</h2>
        
        {mappings.length === 0 ? (
          <Card className="p-4">
            <p className="text-gray-500">No venue location mappings found.</p>
          </Card>
        ) : (
          mappings.map(mapping => (
            <Card key={mapping.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold">{mapping.venueName}</h3>
                  <p className="text-sm text-gray-600 capitalize">Type: {mapping.venueType}</p>
                  <p className="text-sm">Max Teams: {mapping.maxTeams}</p>
                  
                  <div className="mt-2 space-y-1">
                    {mapping.assignedLocations.state && (
                      <p className="text-sm"><strong>State:</strong> {mapping.assignedLocations.state}</p>
                    )}
                    {mapping.assignedLocations.districts?.length > 0 && (
                      <p className="text-sm"><strong>Districts:</strong> {mapping.assignedLocations.districts.join(', ')}</p>
                    )}
                    {mapping.assignedLocations.taluks?.length > 0 && (
                      <p className="text-sm"><strong>Taluks:</strong> {mapping.assignedLocations.taluks.join(', ')}</p>
                    )}
                  </div>
                </div>
                
                <form action={deleteVenueLocationMapping.bind(null, mapping.id)}>
                  <Button type="submit" variant="destructive" size="sm">
                    Deactivate
                  </Button>
                </form>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}