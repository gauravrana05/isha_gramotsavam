'use server'

import { adminDb } from '@/lib/firebase/admin';
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
    console.error('Error creating venue location mapping:', error);
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
    console.error('Error updating venue location mapping:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function createClusterDivisionMapping(formData: FormData) {
  try {
    const mappingData: Omit<ClusterDivisionMapping, 'mappingId' | 'createdAt' | 'updatedAt'> = {
      eventId: formData.get('eventId') as string,
      clusterVenueId: formData.get('clusterVenueId') as string,
      clusterVenueName: formData.get('clusterVenueName') as string,
      divisionVenueId: formData.get('divisionVenueId') as string,
      divisionVenueName: formData.get('divisionVenueName') as string,
      isActive: true
    };

    // Add timestamp fields
    const mappingWithTimestamps = {
      ...mappingData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await adminDb.collection('clusterDivisionMapping').add(mappingWithTimestamps);
    
    // Update the document with its own ID
    await docRef.update({ mappingId: docRef.id });

    revalidatePath('/admin/venues/cluster-division-mapping');
    
    return { 
      success: true, 
      message: 'Cluster-division mapping created successfully',
      mappingId: docRef.id
    };
  } catch (error) {
    console.error('Error creating cluster-division mapping:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
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
    console.error('Error deleting venue location mapping:', error);
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
    console.error('Error deleting cluster-division mapping:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function autoMapClustersToDivisions(eventId: string) {
  try {
    // Get all active venues
    const venuesSnapshot = await adminDb.collection('venues')
      .where('isActive', '==', true)
      .get();
    
    const venues = venuesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Group venues by state
    const venuesByState = venues.reduce((acc: any, venue: any) => {
      if (!acc[venue.state]) {
        acc[venue.state] = { clusters: [], divisions: [] };
      }
      
      if (venue.type === 'cluster') {
        acc[venue.state].clusters.push(venue);
      } else if (venue.type === 'division') {
        acc[venue.state].divisions.push(venue);
      }
      
      return acc;
    }, {});

    const createdMappings = [];
    const errors = [];

    // Process each state
    for (const [state, stateVenues] of Object.entries(venuesByState)) {
      const { clusters, divisions }: any = stateVenues;
      
      if (divisions.length === 1 && clusters.length > 0) {
        // Auto-map all clusters to the single division
        const division = divisions[0];
        
        for (const cluster of clusters) {
          try {
            // Check if mapping already exists
            const existingMapping = await adminDb.collection('clusterDivisionMapping')
              .where('eventId', '==', eventId)
              .where('clusterVenueId', '==', cluster.id)
              .where('isActive', '==', true)
              .get();

            if (existingMapping.empty) {
              const mappingData = {
                eventId,
                clusterVenueId: cluster.id,
                clusterVenueName: cluster.name,
                divisionVenueId: division.id,
                divisionVenueName: division.name,
                isActive: true,
                autoMapped: true,
                createdAt: new Date(),
                updatedAt: new Date()
              };

              const docRef = await adminDb.collection('clusterDivisionMapping').add(mappingData);
              await docRef.update({ mappingId: docRef.id });
              
              createdMappings.push({
                state,
                cluster: cluster.name,
                division: division.name
              });
            }
          } catch (error) {
            errors.push(`Error mapping ${cluster.name} to ${division.name}: ${error}`);
          }
        }
      }
    }

    revalidatePath('/admin/venues/cluster-division-mapping');
    
    return { 
      success: true, 
      message: `Auto-mapping completed. Created ${createdMappings.length} mappings.`,
      createdMappings,
      errors
    };
  } catch (error) {
    console.error('Error in auto-mapping:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function createStateClusterMapping(formData: FormData) {
  try {
    const state = formData.get('state') as string;
    const clusterVenueIds = (formData.get('clusterVenueIds') as string).split(',');
    const divisionVenueId = formData.get('divisionVenueId') as string;
    const eventId = formData.get('eventId') as string;

    // Get venue details
    const divisionDoc = await adminDb.collection('venues').doc(divisionVenueId).get();
    const divisionData = divisionDoc.data();

    const createdMappings = [];
    const errors = [];

    for (const clusterVenueId of clusterVenueIds) {
      try {
        const clusterDoc = await adminDb.collection('venues').doc(clusterVenueId).get();
        const clusterData = clusterDoc.data();

        // Check if mapping already exists
        const existingMapping = await adminDb.collection('clusterDivisionMapping')
          .where('eventId', '==', eventId)
          .where('clusterVenueId', '==', clusterVenueId)
          .where('isActive', '==', true)
          .get();

        if (existingMapping.empty) {
          const mappingData = {
            eventId,
            clusterVenueId,
            clusterVenueName: clusterData?.name,
            divisionVenueId,
            divisionVenueName: divisionData?.name,
            isActive: true,
            autoMapped: false,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const docRef = await adminDb.collection('clusterDivisionMapping').add(mappingData);
          await docRef.update({ mappingId: docRef.id });
          
          createdMappings.push({
            cluster: clusterData?.name,
            division: divisionData?.name
          });
        }
      } catch (error) {
        errors.push(`Error mapping cluster ${clusterVenueId}: ${error}`);
      }
    }

    revalidatePath('/admin/venues/cluster-division-mapping');
    
    return { 
      success: true, 
      message: `Created ${createdMappings.length} mappings for ${state}.`,
      createdMappings,
      errors
    };
  } catch (error) {
    console.error('Error creating state cluster mapping:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}