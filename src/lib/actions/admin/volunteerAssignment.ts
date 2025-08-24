'use server'

import { adminDb } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import { VolunteerVenueAssignment } from '@/lib/types/fixtures';
import { FieldValue } from 'firebase-admin/firestore';

export async function assignVolunteerToVenue(formData: FormData) {
  try {
    const volunteerId = formData.get('volunteerId') as string;
    const volunteerType = formData.get('volunteerType') as string;

    const assignmentData: any = {
      eventId: formData.get('eventId') as string,
      volunteerId: volunteerId,
      volunteerName: formData.get('volunteerName') as string,
      volunteerType: volunteerType,
      venueId: formData.get('venueId') as string,
      venueName: formData.get('venueName') as string,
      status: 'assigned',
      assignedBy: formData.get('assignedBy') as string,
      assignedAt: FieldValue.serverTimestamp()
    };

    const assignmentWithTimestamps = {
      ...assignmentData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    // Create the venue assignment
    const docRef = await adminDb.collection('volunteerVenueAssignment').add(assignmentWithTimestamps);
    
    // Update with document ID
    await docRef.update({ assignmentId: docRef.id });

    // Update volunteer's role only if assigned as technical
    if (volunteerType === 'technical') {
      await adminDb.collection('users').doc(volunteerId).update({
        role: 'technical_volunteer',
        updatedAt: FieldValue.serverTimestamp()
      });
    }
    // If assigned as general, role stays as general_volunteer (no change needed)

    revalidatePath('/admin/users/volunteers/assign-venues');
    revalidatePath('/admin/users/volunteers');
    revalidatePath('/admin/venues');
    
    return { 
      success: true, 
      message: 'Volunteer assigned to venue successfully',
      assignmentId: docRef.id
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function removeVolunteerAssignment(assignmentId: string) {
  try {
    // Get the assignment first to check if we need to update volunteer role
    const assignmentDoc = await adminDb.collection('volunteerVenueAssignment').doc(assignmentId).get();
    
    if (assignmentDoc.exists) {
      const assignmentData = assignmentDoc.data();
      
      // Delete the assignment
      await adminDb.collection('volunteerVenueAssignment').doc(assignmentId).delete();
      
      // Always change volunteer back to general_volunteer when assignment is deleted
      if (assignmentData?.volunteerId) {
        await adminDb.collection('users').doc(assignmentData.volunteerId).update({
          role: 'general_volunteer',
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    }

    revalidatePath('/admin/users/volunteers/assign-venues');
    revalidatePath('/admin/users/volunteers');
    revalidatePath('/admin/venues');
    
    return { 
      success: true, 
      message: 'Volunteer assignment removed successfully'
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function updateVolunteerAssignmentStatus(
  assignmentId: string, 
  status: 'assigned' | 'confirmed' | 'active'
) {
  try {
    const updateData: any = {
      status,
      updatedAt: FieldValue.serverTimestamp()
    };

    if (status === 'confirmed') {
      updateData.confirmedAt = FieldValue.serverTimestamp();
    }

    await adminDb.collection('volunteerVenueAssignment').doc(assignmentId).update(updateData);

    revalidatePath('/admin/users/volunteers/assign-venues');
    
    return { 
      success: true, 
      message: `Volunteer assignment ${status} successfully`
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getVolunteerAssignments(volunteerId: string) {
  try {
    // Get volunteer's venue assignments
    const assignmentsQuery = adminDb.collection('volunteerVenueAssignment')
      .where('volunteerId', '==', volunteerId);
    
    const assignmentsSnapshot = await assignmentsQuery.get();
    
    if (assignmentsSnapshot.empty) {
      return {
        success: true,
        assignments: []
      };
    }

    // Get venue details for each assignment
    const venueIdArr = assignmentsSnapshot.docs.map(doc => doc.data().venueId).filter(Boolean);
    const venueIds = Array.from(new Set(venueIdArr));
    const venuesData: Record<string, any> = {};
    
    if (venueIds.length > 0) {
      // Batch query venues
      for (let i = 0; i < venueIds.length; i += 10) { // Firestore 'in' query limit
        const batch = venueIds.slice(i, i + 10);
        const venuesSnapshot = await adminDb.collection('venues')
          .where('__name__', 'in', batch.map(id => adminDb.collection('venues').doc(id)))
          .get();
        
        venuesSnapshot.docs.forEach(doc => {
          venuesData[doc.id] = doc.data();
        });
      }
    }

    // Get sports data for display names
    const sportsSnapshot = await adminDb.collection('sports').get();
    const sportsData: Record<string, any> = {};
    sportsSnapshot.docs.forEach(doc => {
      sportsData[doc.id] = doc.data();
    });

    const assignments = assignmentsSnapshot.docs.map(doc => {
      const data = doc.data();
      const venue = venuesData[data.venueId] || {};
      
      // Handle both array of strings and array of objects for supported sports
      let supportedSports: string[] = [];
      if (venue.supportedSports) {
        supportedSports = venue.supportedSports.map((sport: any) => {
          if (typeof sport === 'string') {
            return sportsData[sport]?.displayName || sportsData[sport]?.name || sport;
          } else if (sport && typeof sport === 'object') {
            return sport.sportName || sportsData[sport.sportId]?.displayName || sportsData[sport.sportId]?.name || sport.sportId;
          }
          return 'Unknown Sport';
        });
      }

      return {
        id: doc.id,
        assignmentId: data.assignmentId || doc.id,
        volunteerId: data.volunteerId,
        volunteerName: data.volunteerName,
        volunteerType: data.volunteerType,
        venueId: data.venueId,
        venueName: data.venueName,
        venueAddress: venue.address || '',
        venueDistrict: venue.district || '',
        venueType: venue.type || '',
        supportedSports,
        status: data.status,
        eventId: data.eventId,
        assignedBy: data.assignedBy,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        assignedAt: data.createdAt?.toDate?.()?.toISOString() || null
      };
    });

    return {
      success: true,
      assignments
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch assignments',
      assignments: []
    };
  }
}