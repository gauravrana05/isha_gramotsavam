'use server'

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface TeamData {
  id: string;
  name: string;
  state: string;
  district: string;
  panchayat: string;
}

export async function assignTeamToVenue(teamData: TeamData) {
  try {
    const eventId = 'isha_gramotsavam_2025';

    // Check if team is already assigned
    const existingAssignment = await adminDb
      .collection('teamVenueAssignment')
      .where('teamId', '==', teamData.id)
      .where('eventId', '==', eventId)
      .limit(1)
      .get();

    if (!existingAssignment.empty) {
      console.log('Team already assigned to venue');
      return { success: true, message: 'Team already assigned' };
    }

    // Find matching venue
    const venue = await findMatchingVenue(teamData, eventId);

    if (!venue) {
      // Queue for manual assignment
      await queueForManualAssignment(teamData, eventId, 'No matching venue found');
      console.log('Team queued for manual assignment');
      return { success: true, message: 'Queued for manual assignment', requiresManualAssignment: true };
    }

    // Check venue capacity
    const currentAssignments = await adminDb
      .collection('teamVenueAssignment')
      .where('venueId', '==', venue.venueId)
      .where('eventId', '==', eventId)
      .where('status', 'in', ['assigned', 'confirmed'])
      .get();

    if (currentAssignments.size >= venue.maxTeams) {
      await queueForManualAssignment(teamData, eventId, 'Venue at capacity');
      console.log('Team queued for manual assignment - venue at capacity');
      return { success: true, message: 'Venue at capacity, queued for manual assignment', requiresManualAssignment: true };
    }

    // Create team venue assignment record
    const assignmentData = {
      teamId: teamData.id,
      teamName: teamData.name,
      venueId: venue.venueId,
      venueName: venue.venueName,
      eventId,
      status: 'assigned',
      assignedAt: FieldValue.serverTimestamp(),
      assignedBy: 'system_auto',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const assignmentRef = await adminDb.collection('teamVenueAssignment').add(assignmentData);
    await assignmentRef.update({ assignmentId: assignmentRef.id });

    // Also update team document with venue name
    await adminDb.collection('teams').doc(teamData.id).update({
      clusterVenue: venue.venueName,
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log('Team successfully assigned to venue:', venue.venueName);
    return { 
      success: true, 
      message: 'Team successfully assigned to venue',
      assignment: {
        venueId: venue.venueId,
        venueName: venue.venueName
      }
    };

  } catch (error) {
    console.error('Failed to assign team to venue:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function findMatchingVenue(teamData: TeamData, eventId: string) {
  try {
    // Get venue-location mappings
    const mappingsSnapshot = await adminDb
      .collection('venueLocationMapping')
      .where('eventId', '==', eventId)
      .where('isActive', '==', true)
      .get();

    // Check each mapping for team location match
    for (const mappingDoc of mappingsSnapshot.docs) {
      const mapping = mappingDoc.data();
      
      if (mapping.assignedLocations) {
        const locations = mapping.assignedLocations;
        
        // Check state match
        if (locations.state && locations.state !== teamData.state) continue;
        
        // Check district match
        if (locations.districts?.length > 0 && !locations.districts.includes(teamData.district)) continue;
        
        // Check panchayat match (if specified)
        if (locations.panchayats?.length > 0 && !locations.panchayats.includes(teamData.panchayat)) continue;
        
        // Found matching venue
        return {
          venueId: mapping.venueId,
          venueName: mapping.venueName,
          maxTeams: mapping.maxTeams
        };
      }
    }

    // If no mapping found, try single venue in district
    const venuesSnapshot = await adminDb
      .collection('venues')
      .where('isActive', '==', true)
      .where('type', '==', 'cluster')
      .get();

    const districtVenues = venuesSnapshot.docs.filter(doc => {
      const venue = doc.data();
      return venue.address?.district === teamData.district || venue.district === teamData.district;
    });

    if (districtVenues.length === 1) {
      const venue = districtVenues[0].data();
      return {
        venueId: districtVenues[0].id,
        venueName: venue.name,
        maxTeams: venue.capacity || 50
      };
    }

    return null;
  } catch (error) {
    console.error('Error finding matching venue:', error);
    return null;
  }
}

async function queueForManualAssignment(teamData: TeamData, eventId: string, reason: string) {
  try {
    const queueData = {
      teamId: teamData.id,
      teamName: teamData.name,
      teamLocation: {
        state: teamData.state,
        district: teamData.district,
        panchayat: teamData.panchayat
      },
      eventId,
      reason,
      status: 'pending_manual_assignment',
      queuedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const queueRef = await adminDb.collection('manualVenueAssignmentQueue').add(queueData);
    await queueRef.update({ queueId: queueRef.id });
  } catch (error) {
    console.error('Error queuing team for manual assignment:', error);
  }
}