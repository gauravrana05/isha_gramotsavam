import { adminDb } from '@/lib/firebase/admin';
import { Card } from '@/components/ui/Card';
import { deleteClusterDivisionMapping } from '@/lib/actions/admin/venueMapping';
import { serializeFirestoreDocs } from '@/lib/utils/firestore';
import ClusterDivisionMappingContainer from './ClusterDivisionMappingContainer';

// Server action for deleting mapping
async function deleteMappingAction(mappingId: string) {
  'use server';
  await deleteClusterDivisionMapping(mappingId);
}

async function getVenues() {
  const venuesSnapshot = await adminDb.collection('venues').where('isActive', '==', true).get();
  return serializeFirestoreDocs(venuesSnapshot.docs);
}

async function getClusterDivisionMappings() {
  const mappingsSnapshot = await adminDb.collection('clusterDivisionMapping')
    .where('isActive', '==', true).get();
  return serializeFirestoreDocs(mappingsSnapshot.docs);
}

function analyzeVenueStateDistribution(venues: any[]) {
  // Group venues by state
  const venuesByState = venues.reduce((acc, venue) => {
    if (!acc[venue.state]) {
      acc[venue.state] = { clusters: [], divisions: [] };
    }
    
    if (venue.type === 'cluster') {
      acc[venue.state].clusters.push(venue);
    } else if (venue.type === 'division') {
      acc[venue.state].divisions.push(venue);
    }
    
    return acc;
  }, {} as Record<string, { clusters: any[]; divisions: any[] }>);

  // Return states categorized by mapping needs
  const singleDivisionStates = Object.entries(venuesByState)
    .filter(([_state, data]) => {
      const d = data as { clusters: any[]; divisions: any[] };
      return d.divisions.length === 1 && d.clusters.length > 0;
    })
    .map(([state, data]) => {
      const d = data as { clusters: any[]; divisions: any[] };
      return {
        state,
        clustersCount: d.clusters.length,
        divisionName: d.divisions[0]?.name
      };
    });


  const multiDivisionStates = Object.entries(venuesByState)
    .filter(([_state, data]) => {
      const d = data as { clusters: any[]; divisions: any[] };
      return d.divisions.length > 1 && d.clusters.length > 0;
    })
    .map(([state, data]) => {
      const d = data as { clusters: any[]; divisions: any[] };
      return {
        state,
        clustersCount: d.clusters.length,
        divisionsCount: d.divisions.length
      };
    });


  return { singleDivisionStates, multiDivisionStates };
}

export default async function ClusterDivisionMappingPage() {
  const venues = await getVenues();
  const mappings = await getClusterDivisionMappings();
  
  const { singleDivisionStates, multiDivisionStates } = analyzeVenueStateDistribution(venues);
  
  // Add venue details to mappings for display
  const enrichedMappings = mappings.map(mapping => {
    const clusterVenue = venues.find(v => v.venueId === mapping.clusterVenueId);
    const divisionVenue = venues.find(v => v.venueId === mapping.divisionVenueId);
    
    return {
      id: mapping.id,
      mappingId: mapping.mappingId,
      clusterVenueName: mapping.clusterVenueName,
      divisionVenueName: mapping.divisionVenueName,
      clusterState: clusterVenue?.state || 'Unknown',
      clusterDistrict: clusterVenue?.district || 'Unknown',
      divisionDistrict: divisionVenue?.district || 'Unknown',
      autoMapped: mapping.autoMapped || false,
      isActive: mapping.isActive,
      createdDate: mapping.createdAt ? new Date(mapping.createdAt).toLocaleDateString() : 'N/A'
    };
  });

  const totalMappings = mappings.length;
  const autoMappedCount = mappings.filter(m => m.autoMapped).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cluster-Division Mapping</h1>
          <p className="mt-1 text-sm text-gray-500">Map cluster venues to division venues for team progression</p>
        </div>
        <div>
          <ClusterDivisionMappingContainer
            venues={venues}
            mappings={enrichedMappings}
            onDelete={deleteMappingAction}
            headerButtonOnly={true}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xl font-bold text-gray-900">{totalMappings}</div>
          <p className="text-sm text-gray-500">Total Mappings</p>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{autoMappedCount}</div>
          <p className="text-sm text-gray-500">Auto-mapped</p>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">{totalMappings - autoMappedCount}</div>
          <p className="text-sm text-gray-500">Manual</p>
        </Card>
      </div>

      {/* Mappings Table */}
      {mappings.length > 0 && (
        <ClusterDivisionMappingContainer
          venues={venues}
          mappings={enrichedMappings}
          onDelete={deleteMappingAction}
          headerButtonOnly={false}
        />
      )}

      {/* State Analysis */}
      {(singleDivisionStates.length > 0 || multiDivisionStates.length > 0) && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Single Division States */}
          {singleDivisionStates.length > 0 && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Auto-mappable States</h3>
              <div className="space-y-2">
                {singleDivisionStates.map(state => (
                  <div key={state.state} className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="font-medium text-green-900">{state.state}</div>
                    <div className="text-sm text-green-700">
                      {state.clustersCount} clusters → {state.divisionName}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Multi Division States */}
          {multiDivisionStates.length > 0 && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Manual Mapping Required</h3>
              <div className="space-y-2">
                {multiDivisionStates.map(state => (
                  <div key={state.state} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="font-medium text-orange-900">{state.state}</div>
                    <div className="text-sm text-orange-700">
                      {state.clustersCount} clusters, {state.divisionsCount} divisions
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}