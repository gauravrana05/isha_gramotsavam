'use server'

// import { adminDb } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { VenueLocationMapping, ClusterDivisionMapping } from '@/lib/types/fixtures';

export async function createVenueLocationMapping(formData: FormData) {
  try {
    const mappingData: Omit<VenueLocationMapping, 'mappingId' | 'createdAt' | 'updatedAt'> = {
      eventId: formData.get('eventId') as string,
      venueId: formData.get('venueId') as string,
      venueName: formData.get('venueName') as string,
      venueType: formData.get('venueType') as 'cluster' | 'division',
      assignedLocations: {
        state: formData.get('state') as string || undefined,
        districts: (formData.get('districts') as string)?.split(',').map(d => d.trim()).filter(Boolean) || undefined,
        taluks: (formData.get('taluks') as string)?.split(',').map(t => t.trim()).filter(Boolean) || undefined,
        panchayats: (formData.get('panchayats') as string)?.split(',').map(p => p.trim()).filter(Boolean) || undefined
      },
      maxTeams: parseInt(formData.get('maxTeams') as string),
      isActive: true
    };

    // Add timestamp fields
    const mappingWithTimestamps = {
      ...mappingData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await adminDb.collection('venueLocationMapping').add(mappingWithTimestamps);
    
    // Update the document with its own ID
    await docRef.update({ mappingId: docRef.id });

    revalidatePath('/admin/venues/location-mapping');
    
    return { 
      success: true, 
      message: 'Venue location mapping created successfully',
      mappingId: docRef.id
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function updateVenueLocationMapping(mappingId: string, formData: FormData) {
  try {
    const updateData = {
      venueId: formData.get('venueId') as string,
      venueName: formData.get('venueName') as string,
      venueType: formData.get('venueType') as 'cluster' | 'division',
      assignedLocations: {
        state: formData.get('state') as string || undefined,
        districts: (formData.get('districts') as string)?.split(',').map(d => d.trim()).filter(Boolean) || undefined,
        taluks: (formData.get('taluks') as string)?.split(',').map(t => t.trim()).filter(Boolean) || undefined,
        panchayats: (formData.get('panchayats') as string)?.split(',').map(p => p.trim()).filter(Boolean) || undefined
      },
      maxTeams: parseInt(formData.get('maxTeams') as string),
      isActive: formData.get('isActive') === 'true',
      updatedAt: new Date()
    };

    await adminDb.collection('venueLocationMapping').doc(mappingId).update(updateData);

    revalidatePath('/admin/venues/location-mapping');
    
    return { 
      success: true, 
      message: 'Venue location mapping updated successfully'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function createClusterDivisionMapping(formData: FormData) {
  // Legacy function - redirect to new grouped format
  return createGroupedClusterDivisionMapping(formData);
}

export async function deleteVenueLocationMapping(mappingId: string) {
  try {
    await adminDb.collection('venueLocationMapping').doc(mappingId).update({
      isActive: false,
      updatedAt: new Date()
    });

    revalidatePath('/admin/venues/location-mapping');
    
    return { 
      success: true, 
      message: 'Venue location mapping deactivated successfully'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function deleteClusterDivisionMapping(mappingId: string) {
  try {
    await adminDb.collection('clusterDivisionMapping').doc(mappingId).update({
      isActive: false,
      updatedAt: new Date()
    });

    revalidatePath('/admin/venues/cluster-division-mapping');
    
    return { 
      success: true, 
      message: 'Cluster-division mapping deactivated successfully'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Remove specific clusters from a grouped mapping
export async function removeClusterFromDivisionMapping(mappingId: string, clusterVenueIds: string[]) {
  try {
    const mappingDoc = await adminDb.collection('clusterDivisionMapping').doc(mappingId).get();
    if (!mappingDoc.exists) {
      return { success: false, error: 'Mapping not found' };
    }

    const mappingData = mappingDoc.data();
    const existingClusterIds = mappingData?.assignedClusters?.clusterVenueIds || [];
    const existingClusterNames = mappingData?.assignedClusters?.clusterVenueNames || [];

    // Remove specified clusters
    const updatedClusterIds = existingClusterIds.filter((id: string) => !clusterVenueIds.includes(id));
    const updatedClusterNames = existingClusterNames.filter((_: string, index: number) => 
      !clusterVenueIds.includes(existingClusterIds[index])
    );

    if (updatedClusterIds.length === 0) {
      // If no clusters left, deactivate the mapping
      await mappingDoc.ref.update({
        isActive: false,
        updatedAt: new Date()
      });
      return { 
        success: true, 
        message: 'Mapping deactivated as no clusters remain'
      };
    } else {
      // Update with remaining clusters
      await mappingDoc.ref.update({
        'assignedClusters.clusterVenueIds': updatedClusterIds,
        'assignedClusters.clusterVenueNames': updatedClusterNames,
        updatedAt: new Date()
      });
    }

    revalidatePath('/admin/venues/cluster-division-mapping');
    return { 
      success: true, 
      message: `Removed ${clusterVenueIds.length} clusters from mapping`
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Create grouped cluster-division mapping (new format like location mapping)
export async function createGroupedClusterDivisionMapping(formData: FormData) {
  try {
    const eventId = formData.get('eventId') as string;
    const state = formData.get('state') as string;
    const clusterVenueIds = (formData.get('clusterVenueIds') as string).split(',').filter(Boolean);
    const divisionVenueId = formData.get('divisionVenueId') as string;
    

    // Validate required fields
    if (!eventId || !state || !divisionVenueId || clusterVenueIds.length === 0) {
      return { success: false, error: 'Missing required fields' };
    }

    // Get venue details
    const venuesSnapshot = await adminDb.collection('venues').where('isActive', '==', true).get();
    const venues = venuesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const divisionVenue = venues.find((v: any) => v.id === divisionVenueId);
    const clusterVenues = venues.filter((v: any) => clusterVenueIds.includes(v.id));
    
    if (!divisionVenue) {
      return { success: false, error: 'Division venue not found' };
    }

    if (clusterVenues.length !== clusterVenueIds.length) {
      return { success: false, error: 'Some cluster venues not found' };
    }

    const now = new Date();
    const mappingData = {
      eventId,
      divisionVenueId,
      divisionVenueName: (divisionVenue as any).name,
      venueType: 'division' as const,
      assignedClusters: {
        state,
        clusterVenueIds,
        clusterVenueNames: clusterVenues.map((v: any) => v.name)
      },
      isActive: true,
      autoMapped: false,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await adminDb.collection('clusterDivisionMapping').add(mappingData);
    await docRef.update({ mappingId: docRef.id });

    revalidatePath('/admin/venues/cluster-division-mapping');
    
    return { 
      success: true, 
      message: 'Cluster-division mapping created successfully',
      mappingId: docRef.id
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Update grouped cluster-division mapping
export async function updateGroupedClusterDivisionMapping(mappingId: string, formData: FormData) {
  try {
    const eventId = formData.get('eventId') as string;
    const state = formData.get('state') as string;
    const clusterVenueIds = (formData.get('clusterVenueIds') as string).split(',').filter(Boolean);
    const divisionVenueId = formData.get('divisionVenueId') as string;
    

    // Validate required fields
    if (!eventId || !state || !divisionVenueId || clusterVenueIds.length === 0) {
      return { success: false, error: 'Missing required fields' };
    }

    // Get venue details
    const venuesSnapshot = await adminDb.collection('venues').where('isActive', '==', true).get();
    const venues = venuesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const divisionVenue = venues.find((v: any) => v.id === divisionVenueId);
    const clusterVenues = venues.filter((v: any) => clusterVenueIds.includes(v.id));
    
    if (!divisionVenue) {
      return { success: false, error: 'Division venue not found' };
    }

    if (clusterVenues.length !== clusterVenueIds.length) {
      return { success: false, error: 'Some cluster venues not found' };
    }

    const updateData = {
      eventId,
      divisionVenueId,
      divisionVenueName: (divisionVenue as any).name,
      venueType: 'division' as const,
      assignedClusters: {
        state,
        clusterVenueIds,
        clusterVenueNames: clusterVenues.map((v: any) => v.name)
      },
      isActive: true,
      autoMapped: false,
      updatedAt: new Date()
    };

    await adminDb.collection('clusterDivisionMapping').doc(mappingId).update(updateData);

    revalidatePath('/admin/venues/cluster-division-mapping');
    
    return { 
      success: true, 
      message: 'Cluster-division mapping updated successfully'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Legacy function - redirects to new grouped format
export async function createStateClusterMapping(formData: FormData) {
  return createGroupedClusterDivisionMapping(formData);
}

// Auto-map clusters in states with single division venue
export async function autoMapClustersToDivisions() {
  try {
    // Get all venues
    const venuesSnapshot = await adminDb.collection('venues').where('isActive', '==', true).get();
    const venues = venuesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Group venues by state and type
    const stateGroups = venues.reduce((acc: any, venue: any) => {
      const state = venue.state;
      if (!acc[state]) {
        acc[state] = { clusters: [], divisions: [] };
      }
      if (venue.type === 'cluster') {
        acc[state].clusters.push(venue);
      } else if (venue.type === 'division') {
        acc[state].divisions.push(venue);
      }
      return acc;
    }, {});

    const autoMappings = [];
    const errors = [];

    // Process states with single division venue
    for (const [state, stateVenues] of Object.entries(stateGroups)) {
      const { clusters, divisions } = stateVenues as any;
      
      if (divisions.length === 1 && clusters.length > 0) {
        const divisionVenue = divisions[0];
        
        // Check if auto-mapping already exists
        const existingMapping = await adminDb.collection('clusterDivisionMapping')
          .where('eventId', '==', 'isha_gramotsavam_2025')
          .where('divisionVenueId', '==', divisionVenue.id)
          .where('isActive', '==', true)
          .get();

        if (existingMapping.empty) {
          try {
            const mappingData = {
              eventId: 'isha_gramotsavam_2025',
              divisionVenueId: divisionVenue.id,
              divisionVenueName: divisionVenue.name,
              venueType: 'division',
              assignedClusters: {
                state: state,
                clusterVenueIds: clusters.map((c: any) => c.id),
                clusterVenueNames: clusters.map((c: any) => c.name)
              },
              isActive: true,
              autoMapped: true,
              createdAt: new Date(),
              updatedAt: new Date()
            };

            const docRef = await adminDb.collection('clusterDivisionMapping').add(mappingData);
            await docRef.update({ mappingId: docRef.id });
            
            autoMappings.push({
              state,
              division: divisionVenue.name,
              clustersCount: clusters.length
            });
          } catch (error) {
            errors.push(`Error auto-mapping ${state}: ${error}`);
          }
        }
      }
    }

    revalidatePath('/admin/venues/cluster-division-mapping');
    return { 
      success: true, 
      message: `Auto-mapped ${autoMappings.length} states`,
      autoMappings,
      errors
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

