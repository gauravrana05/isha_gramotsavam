'use server'

import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

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

    // Validate and format phone number
    const cleanPhone = phoneNumber.replace(/^\+91/, '').replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return {
        success: false,
        error: 'Invalid phone number: Must be 10 digits'
      };
    }
    const formattedPhone = `+91${cleanPhone}`;

    let userId: string;
    let existingUser = false;

    // Default documents structure for new users
    const defaultDocuments = {
      profilePhoto: {
        storagePath: '',
        url: null,
        verified: false,
        uploadedAt: null,
        uploadedBy: null,
      },
      aadhaarFront: {
        storagePath: '',
        url: null,
        verified: false,
        uploadedAt: null,
        uploadedBy: null,
      },
      aadhaarBack: {
        storagePath: '',
        url: null,
        verified: false,
        uploadedAt: null,
        uploadedBy: null,
      },
    };

    // Check if user exists in Firebase Authentication
    try {
      console.log("coming here):");
      const existingAuthUser = await adminAuth.getUserByPhoneNumber(formattedPhone);
      console.log("didnt reach here");
      userId = existingAuthUser.uid;
      existingUser = true;

      // Check if user already has volunteer role
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.role === 'volunteer' || validRoles.includes(userData?.role)) {
          return {
            success: false,
            error: 'A volunteer with this phone number already exists'
          };
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create new Firebase Auth user
        const userRecord = await adminAuth.createUser({
          phoneNumber: formattedPhone,
          displayName: `${firstName} ${lastName}`,
          email: email,
          disabled: false,
        });
        userId = userRecord.uid;
        existingUser = false;
      } else {
        console.error('Error checking existing user:', error);
        return {
          success: false,
          error: 'Error checking existing user'
        };
      }
    }

    // Check if user with email already exists (but only for new users)
    if (!existingUser) {
      const existingUserByEmail = await adminDb.collection('users')
        .where('email', '==', email)
        .get();

      if (!existingUserByEmail.empty) {
        // If we created a new Firebase Auth user, clean it up
        if (!existingUser) {
          try {
            await adminAuth.deleteUser(userId);
          } catch (cleanupError) {
            console.error('Error cleaning up created user:', cleanupError);
          }
        }
        return {
          success: false,
          error: 'A user with this email already exists'
        };
      }
    }

    // Create volunteer user document
    const volunteerData = {
      uid: userId,
      firstName,
      lastName,
      phoneNumber: cleanPhone,
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
      // Documents structure
      documents: defaultDocuments,
      // Metadata
      addedBy: 'admin',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Add/Update user document using the Firebase Auth user ID
    await adminDb.collection('users').doc(userId).set(volunteerData, { merge: true });

    // Create audit log
    await adminDb.collection('auditLogs').add({
      action: 'volunteer_added',
      targetType: 'user',
      targetId: userId,
      performedBy: 'admin',
      details: {
        volunteerName: `${firstName} ${lastName}`,
        role,
        email,
        phoneNumber: cleanPhone
      },
      timestamp: FieldValue.serverTimestamp()
    });

    revalidatePath('/admin/users/volunteers');

    console.log(`Volunteer ${userId} ${existingUser ? 'updated' : 'created'} successfully`);

    return {
      success: true,
      message: existingUser ? 'Existing user updated with volunteer role' : 'Volunteer added successfully',
      volunteerId: userId,
      existed: existingUser
    };
  } catch (error) {
    console.error('Error adding volunteer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add volunteer'
    };
  }
}

export async function getVolunteerVenueAssignments(adminUid: string) {
  try {
    // Verify admin permissions
    const adminDoc = await adminDb.collection('users').doc(adminUid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return {
        success: false,
        error: 'Unauthorized: Admin access required'
      };
    }

    // Get all volunteer venue assignments
    const assignmentsSnapshot = await adminDb.collection('volunteerVenueAssignment').get();
    
    const assignments: Record<string, string> = {};
    assignmentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.volunteerId && data.venueName) {
        assignments[data.volunteerId] = data.venueName;
      }
    });

    return {
      success: true,
      assignments
    };
  } catch (error) {
    console.error('Error fetching volunteer venue assignments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch assignments'
    };
  }
}

export async function getVolunteerVenueAssignmentDetails(adminUid: string) {
  try {
    // Verify admin permissions
    const adminDoc = await adminDb.collection('users').doc(adminUid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return {
        success: false,
        error: 'Unauthorized: Admin access required'
      };
    }

    // Get all volunteer venue assignments with full details
    const assignmentsSnapshot = await adminDb.collection('volunteerVenueAssignment').get();
    
    // Get unique venue IDs to fetch venue details
    const venueIds = [...new Set(assignmentsSnapshot.docs.map(doc => doc.data().venueId).filter(Boolean))];
    
    // Fetch venue details including supported sports
    const venuesData: Record<string, any> = {};
    if (venueIds.length > 0) {
      const venuesSnapshot = await adminDb.collection('venues').where('__name__', 'in', venueIds).get();
      venuesSnapshot.docs.forEach(doc => {
        venuesData[doc.id] = doc.data();
      });
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
      const supportedSports = (venue.supportedSports || []).map((sportId: string) => 
        sportsData[sportId]?.displayName || sportsData[sportId]?.name || sportId
      );

      return {
        id: doc.id,
        assignmentId: data.assignmentId || doc.id,
        volunteerId: data.volunteerId,
        volunteerName: data.volunteerName,
        volunteerType: data.volunteerType,
        venueId: data.venueId,
        venueName: data.venueName,
        venueSupportedSports: supportedSports,
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
    console.error('Error fetching volunteer venue assignment details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch assignment details'
    };
  }
}