import { adminDb } from '@/lib/firebase/admin';
import { createClusterDivisionMapping, deleteClusterDivisionMapping } from '@/lib/actions/admin/venueMapping';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { serializeFirestoreDocs } from '@/lib/utils/firestore';

async function getVenues() {
  const venuesSnapshot = await adminDb.collection('venues').where('isActive', '==', true).get();
  return serializeFirestoreDocs(venuesSnapshot.docs);
}

async function getClusterDivisionMappings() {
  const mappingsSnapshot = await adminDb.collection('clusterDivisionMapping')
    .where('isActive', '==', true).get();
  return serializeFirestoreDocs(mappingsSnapshot.docs);
}

export default async function ClusterDivisionMappingPage() {
  const venues = await getVenues();
  const mappings = await getClusterDivisionMappings();

  const clusterVenues = venues.filter(v => v.type === 'cluster' || !v.type);
  const divisionVenues = venues.filter(v => v.type === 'division' || !v.type);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Cluster-Division Mapping</h1>
        <p className="text-gray-600">Map cluster venues to division venues for team progression</p>
      </div>

      {/* Create New Mapping Form */}
      <Card className="mb-8 p-6">
        <h2 className="text-lg font-semibold mb-4">Create New Mapping</h2>
        <form action={createClusterDivisionMapping} className="space-y-4">
          <input type="hidden" name="eventId" value="isha_gramotsavam_2025" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cluster Venue</label>
              <select name="clusterVenueId" required className="w-full p-2 border rounded">
                <option value="">Select Cluster Venue</option>
                {clusterVenues.map(venue => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Division Venue</label>
              <select name="divisionVenueId" required className="w-full p-2 border rounded">
                <option value="">Select Division Venue</option>
                {divisionVenues.map(venue => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button type="submit">Create Mapping</Button>
        </form>
      </Card>

      {/* Existing Mappings */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Existing Mappings</h2>
        
        {mappings.length === 0 ? (
          <Card className="p-4">
            <p className="text-gray-500">No cluster-division mappings found.</p>
          </Card>
        ) : (
          mappings.map(mapping => (
            <Card key={mapping.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-600">{mapping.clusterVenueName}</h3>
                      <p className="text-sm text-gray-500">Cluster Venue</p>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        →
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-600">{mapping.divisionVenueName}</h3>
                      <p className="text-sm text-gray-500">Division Venue</p>
                    </div>
                  </div>
                </div>
                
                <form action={deleteClusterDivisionMapping.bind(null, mapping.id)}>
                  <Button type="submit" variant="destructive" size="sm">
                    Remove
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