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