import { adminDb } from '@/lib/firebase/admin';
import { Card } from '@/components/ui/Card';
import LocationMappingContainer from './LocationMappingContainer';
import { serializeFirestoreDocs } from '@/lib/utils/firestore';


async function getVenues() {
  const venuesSnapshot = await adminDb.collection('venues').where('isActive', '==', true).get();
  return venuesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      address: {
        state: data.address?.state || data.state || '',
        district: data.address?.district || data.district || '',
        taluk: data.address?.taluk || data.taluk || '',
        panchayat: data.address?.panchayat || data.panchayat || '',
      },
      type: data.type || 'cluster'
    };
  });
}

function analyzeVenueDistribution(venues: any[]) {
  // Group venues by district and count cluster venues only
  const districtCounts = venues
    .filter(venue => venue.type === 'cluster')
    .reduce((acc, venue) => {
      const district = venue.address.district;
      const state = venue.address.state;
      if (district) {
        if (!acc[district]) {
          acc[district] = { count: 0, state };
        }
        acc[district].count++;
      }
      return acc;
    }, {} as Record<string, { count: number; state: string }>);

  // Return districts with multiple cluster venues
  return Object.entries(districtCounts)
    .filter(([_district, data]) => (data as { count: number; state: string }).count > 1)
    .map(([district, data]) => {
      const d = data as { count: number; state: string };
      return {
        district,
        count: d.count,
        state: d.state
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
  const districtsWithMultipleVenues = analyzeVenueDistribution(venues);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Venue Location Mapping</h1>
          <p className="mt-1 text-sm text-gray-500">Map venues to locations for automatic team assignment</p>
        </div>
        <div>
          <LocationMappingContainer
            venues={venues}
            mappings={mappings}
            districtsWithMultipleVenues={districtsWithMultipleVenues}
            headerButtonOnly={true}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xl font-bold text-gray-900">{venues.length}</div>
          <p className="text-sm text-gray-500">Total Venues</p>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">
            {venues.filter(v => v.type === 'cluster').length - districtsWithMultipleVenues.reduce((sum, d) => sum + d.count, 0)}
          </div>
          <p className="text-sm text-gray-500">Auto-assigned Districts</p>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-orange-600">{districtsWithMultipleVenues.length}</div>
          <p className="text-sm text-gray-500">Districts Requiring Mapping</p>
        </Card>
      </div>

      {/* Mappings Table */}
      {mappings.length > 0 && (
        <LocationMappingContainer
          venues={venues}
          mappings={mappings}
          districtsWithMultipleVenues={districtsWithMultipleVenues}
          headerButtonOnly={false}
        />
      )}
    </div>
  );
}