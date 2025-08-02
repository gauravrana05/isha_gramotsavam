'use server'

import { adminDb } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';

export async function addVolunteer(formData: FormData) {
  try {
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const sameAsWhatsapp = formData.get('sameAsWhatsapp') === 'true';
    const whatsappNumber = sameAsWhatsapp ? phoneNumber : (formData.get('whatsappNumber') as string);
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;

    // Validate required fields
    if (!firstName || !lastName || !phoneNumber || !email || !role) {
      return {
        success: false,
        error: 'All fields are required'
      };
    }

    // Validate role
    const validRoles = ['verification_volunteer', 'general_volunteer', 'technical_volunteer'];
    if (!validRoles.includes(role)) {
      return {
        success: false,
        error: 'Invalid volunteer role'
      };
    }

    // Check if user with phone number already exists
    const existingUserByPhone = await adminDb.collection('users')
      .where('phoneNumber', '==', phoneNumber)
      .get();

    if (!existingUserByPhone.empty) {
      return {
        success: false,
        error: 'A user with this phone number already exists'
      };
    }

    // Check if user with email already exists
    const existingUserByEmail = await adminDb.collection('users')
      .where('email', '==', email)
      .get();

    if (!existingUserByEmail.empty) {
      return {
        success: false,
        error: 'A user with this email already exists'
      };
    }

    // Create volunteer user document
    const volunteerData = {
      firstName,
      lastName,
      phoneNumber,
      whatsappNumber,
      email,
      role,
      isActive: true,
      isProfileComplete: true,
      isPhoneVerified: false,
      isEmailVerified: false,
      // Profile fields
      displayName: `${firstName} ${lastName}`,
      // Default volunteer permissions
      permissions: {
        canManageTeams: role === 'technical_volunteer',
        canVerifyDocuments: role === 'verification_volunteer',
        canAccessVenues: true,
      },
      // Metadata
      addedBy: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to users collection
    const userRef = await adminDb.collection('users').add(volunteerData);

    // Create audit log
    await adminDb.collection('auditLogs').add({
      action: 'volunteer_added',
      targetType: 'user',
      targetId: userRef.id,
      performedBy: 'admin',
      details: {
        volunteerName: `${firstName} ${lastName}`,
        role,
        email,
        phoneNumber
      },
      timestamp: new Date()
    });

    revalidatePath('/admin/users/volunteers');

    return {
      success: true,
      message: 'Volunteer added successfully',
      volunteerId: userRef.id
    };
  } catch (error) {
    console.error('Error adding volunteer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add volunteer'
    };
  }
}