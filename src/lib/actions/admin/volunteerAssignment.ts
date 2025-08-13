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

    // Update volunteer's role if assigned as technical
    if (volunteerType === 'technical') {
      await adminDb.collection('users').doc(volunteerId).update({
        role: 'technical_volunteer',
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    revalidatePath('/admin/users/volunteers/assign-venues');
    revalidatePath('/admin/users/volunteers');
    
    return { 
      success: true, 
      message: 'Volunteer assigned to venue successfully',
      assignmentId: docRef.id
    };
  } catch (error) {
    console.error('Error assigning volunteer to venue:', error);
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
      
      // If volunteer was technical, change them back to general
      if (assignmentData?.volunteerType === 'technical' && assignmentData?.volunteerId) {
        await adminDb.collection('users').doc(assignmentData.volunteerId).update({
          role: 'general_volunteer',
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    }

    revalidatePath('/admin/users/volunteers/assign-venues');
    revalidatePath('/admin/users/volunteers');
    
    return { 
      success: true, 
      message: 'Volunteer assignment removed successfully'
    };
  } catch (error) {
    console.error('Error removing volunteer assignment:', error);
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
    console.error('Error updating volunteer assignment status:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}