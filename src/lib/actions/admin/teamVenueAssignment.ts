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

    // Check if team is already assigned
    const existingAssignment = await adminDb
      .collection('teamVenueAssignment')
      .where('teamId', '==', teamData.id)
      .limit(1)
      .get();

    if (!existingAssignment.empty) {
      return { success: true, message: 'Team already assigned' };
    }

    // Find matching venue
    const venue = await findMatchingVenue(teamData, '');

    if (!venue) {
      // Queue for manual assignment
      await queueForManualAssignment(teamData, '', 'No matching venue found');
      return { success: true, message: 'Queued for manual assignment', requiresManualAssignment: true };
    }

    // Check venue capacity
    const currentAssignments = await adminDb
      .collection('teamVenueAssignment')
      .where('venueId', '==', venue.venueId)
      .where('status', 'in', ['assigned', 'confirmed'])
      .get();

    if (currentAssignments.size >= venue.maxTeams) {
      await queueForManualAssignment(teamData, '', 'Venue at capacity');
      return { success: true, message: 'Venue at capacity, queued for manual assignment', requiresManualAssignment: true };
    }

    // Create team venue assignment record
    const assignmentData = {
      teamId: teamData.id,
      teamName: teamData.name,
      venueId: venue.venueId,
      venueName: venue.venueName,
      clusterVenueId: venue.venueId,        // Add for volunteer queries
      clusterVenueName: venue.venueName,    // Add for volunteer queries
      assignmentLevel: 'cluster',
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
      clusterVenueId: venue.venueId,
      currentLevel: 'cluster',
      updatedAt: FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      message: 'Team successfully assigned to venue',
      assignment: {
        venueId: venue.venueId,
        venueName: venue.venueName,
        assignmentLevel: 'cluster'
      }
    };

  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function findMatchingVenue(teamData: TeamData, eventId: string) {
  try {
    // Step 1: Get all active cluster venues in team's district
    const venuesSnapshot = await adminDb
      .collection('venues')
      .where('isActive', '==', true)
      .where('type', '==', 'cluster')
      .get();


    const districtVenues = venuesSnapshot.docs.filter(doc => {
      const venue = doc.data();
      return venue.address?.district === teamData.district || venue.district === teamData.district;
    });

    // Step 2: If exactly one venue in district, assign directly
    if (districtVenues.length === 1) {
      const venue = districtVenues[0].data();
      return {
        venueId: districtVenues[0].id,
        venueName: venue.name,
        maxTeams: venue.capacity || 50
      };
    }

    // Step 3: If multiple venues in district, use location mapping
    if (districtVenues.length > 1) {
      
      // Get venue-location mappings (without event ID constraint)
      const mappingsSnapshot = await adminDb
        .collection('venueLocationMapping')
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
          
          // Found matching venue mapping
          return {
            venueId: mapping.venueId,
            venueName: mapping.venueName,
            maxTeams: mapping.maxTeams
          };
        }
      }
      
    }

    // Step 4: No venues in district
    if (districtVenues.length === 0) {
    }

    return null;
  } catch (error) {
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
      reason,
      status: 'pending_manual_assignment',
      queuedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const queueRef = await adminDb.collection('manualVenueAssignmentQueue').add(queueData);
    await queueRef.update({ queueId: queueRef.id });
    
  } catch (error) {
  }
}

// Function to handle team progression from division to finals
export async function advanceDivisionWinnersToFinals() {
  try {
    // Get all division venue assignments to find completed tournaments
    const divisionAssignmentsSnapshot = await adminDb
      .collection('teamVenueAssignment')
      .where('assignmentLevel', '==', 'division')
      .get();
    
    const divisionAssignments = divisionAssignmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Group teams by division venue to process winners by venue
    const teamsByDivisionVenue = divisionAssignments.reduce((acc: any, assignment: any) => {
      const venueId = assignment.divisionVenueId || assignment.venueId;
      if (!acc[venueId]) {
        acc[venueId] = [];
      }
      acc[venueId].push(assignment);
      return acc;
    }, {});
    
    const progressionResults = [];
    
    // Process each division venue
    for (const [divisionVenueId, teams] of Object.entries(teamsByDivisionVenue)) {
      try {
        const result = await processDivisionVenueWinners(divisionVenueId as string, teams as any[]);
        progressionResults.push(result);
      } catch (error) {
        progressionResults.push({
          divisionVenueId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return {
      success: true,
      processedVenues: progressionResults.length,
      successfulProgressions: progressionResults.filter(r => r.success).length,
      results: progressionResults
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

async function processDivisionVenueWinners(divisionVenueId: string, teams: any[]) {
  try {
    // Get completed fixtures for this division venue
    const fixturesSnapshot = await adminDb
      .collection('fixtures')
      .where('venueId', '==', divisionVenueId)
      .where('level', '==', 'division')
      .where('status', '==', 'completed')
      .get();
    
    if (fixturesSnapshot.empty) {
      return {
        divisionVenueId,
        success: true,
        message: 'No completed division tournaments yet',
        advancedTeams: 0
      };
    }
    
    // Find the Isha Yoga Center finals venue
    const finalsVenueSnapshot = await adminDb
      .collection('venues')
      .where('type', '==', 'final')
      .where('name', '==', 'Isha Yoga Center')
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    if (finalsVenueSnapshot.empty) {
      return {
        divisionVenueId,
        success: false,
        error: 'Finals venue (Isha Yoga Center) not found'
      };
    }
    
    const finalsVenue = {
      id: finalsVenueSnapshot.docs[0].id,
      ...(finalsVenueSnapshot.docs[0].data() as any)
    };
    
    // Get winners from completed fixtures (top 2 teams per sport/gender)
    const winnersByCategory = new Map();
    
    for (const fixtureDoc of fixturesSnapshot.docs) {
      const fixture = fixtureDoc.data();
      if (fixture.finalStandings && fixture.finalStandings.length > 0) {
        const categoryKey = `${fixture.sportId}_${fixture.genderCategory}`;
        const topTeams = fixture.finalStandings.slice(0, 2); // Top 2 teams advance
        winnersByCategory.set(categoryKey, topTeams);
      }
    }
    
    // Advance the winners to finals (Isha Yoga Center)
    let advancedCount = 0;
    const batch = adminDb.batch();

    for (const categoryKey of Array.from(winnersByCategory.keys())) {
      const winners = winnersByCategory.get(categoryKey);
      if (!winners) continue;
      
      for (const winner of winners) {
        // Skip if winner doesn't have required data
        if (!winner.teamId || !winner.teamName) continue;
        
        // Check if team is already assigned to finals level to avoid duplicates
        const existingAssignmentSnapshot = await adminDb
          .collection('teamVenueAssignment')
          .where('teamId', '==', winner.teamId)
          .where('assignmentLevel', '==', 'final')
          .limit(1)
          .get();
        
        if (!existingAssignmentSnapshot.empty) {
          continue; // Skip if already assigned
        }
        
        // Create finals venue assignment
        const assignmentData = {
          teamId: winner.teamId,
          teamName: winner.teamName,
          finalVenueId: finalsVenue.id,
          finalVenueName: finalsVenue.name,
          assignmentLevel: 'final',
          status: 'assigned',
          assignedAt: FieldValue.serverTimestamp(),
          assignedBy: 'system_auto',
          advancedFrom: 'division',
          sourceDivisionVenueId: divisionVenueId,
          rank: winner.position || winner.rank || 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };
        
        const assignmentRef = adminDb.collection('teamVenueAssignment').doc();
        batch.set(assignmentRef, {
          ...assignmentData,
          assignmentId: assignmentRef.id
        });
        
        // Update team document
        const teamRef = adminDb.collection('teams').doc(winner.teamId);
        batch.update(teamRef, {
          currentLevel: 'final',
          finalVenueId: finalsVenue.id,
          finalVenueName: finalsVenue.name,
          advancedToFinalsAt: FieldValue.serverTimestamp(),
          divisionQualified: true,
          updatedAt: FieldValue.serverTimestamp()
        });
        advancedCount++;
      }
    }
    
    await batch.commit();
    
    return {
      divisionVenueId,
      success: true,
      message: `Advanced ${advancedCount} teams to ${finalsVenue.name} Finals`,
      advancedTeams: advancedCount,
      targetFinalVenue: finalsVenue.name
    };
  } catch (error) {
    return {
      divisionVenueId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// New function to handle team progression from cluster to division
export async function advanceClusterWinnersToDivision() {
  try {
    // Get all cluster venue assignments to find completed tournaments
    const clusterAssignmentsSnapshot = await adminDb
      .collection('teamVenueAssignment')
      .where('assignmentLevel', '==', 'cluster')
      .get();
    
    const clusterAssignments = clusterAssignmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Group teams by cluster venue to process winners by venue
    const teamsByClusterVenue = clusterAssignments.reduce((acc: any, assignment: any) => {
      const venueId = assignment.clusterVenueId || assignment.venueId;
      if (!acc[venueId]) {
        acc[venueId] = [];
      }
      acc[venueId].push(assignment);
      return acc;
    }, {});
    
    const progressionResults = [];
    
    // Process each cluster venue
    for (const [clusterVenueId, teams] of Object.entries(teamsByClusterVenue)) {
      try {
        const result = await processClusterVenueWinners(clusterVenueId as string, teams as any[]);
        progressionResults.push(result);
      } catch (error) {
        progressionResults.push({
          clusterVenueId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return {
      success: true,
      processedVenues: progressionResults.length,
      successfulProgressions: progressionResults.filter(r => r.success).length,
      results: progressionResults
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

async function processClusterVenueWinners(clusterVenueId: string, teams: any[]) {
  try {
    // Get completed fixtures for this cluster venue
    const fixturesSnapshot = await adminDb
      .collection('fixtures')
      .where('venueId', '==', clusterVenueId)
      .where('status', '==', 'completed')
      .get();
    
    if (fixturesSnapshot.empty) {
      return {
        clusterVenueId,
        success: true,
        message: 'No completed tournaments yet',
        advancedTeams: 0
      };
    }
    
    // Get cluster venue details to find state
    const clusterVenueDoc = await adminDb.collection('venues').doc(clusterVenueId).get();
    const clusterVenueData = clusterVenueDoc.data();
    
    if (!clusterVenueData) {
      throw new Error('Cluster venue not found');
    }
    
    const venueState = clusterVenueData.state || clusterVenueData.address?.state;
    
    // Check how many division venues are in this state
    const divisionVenuesSnapshot = await adminDb
      .collection('venues')
      .where('type', '==', 'division')
      .where('isActive', '==', true)
      .get();
    
    const stateDivisionVenues = divisionVenuesSnapshot.docs.filter(doc => {
      const venue = doc.data();
      return venue.state === venueState || venue.address?.state === venueState;
    });
    
    let targetDivisionVenue = null;
    
    if (stateDivisionVenues.length === 1) {
      // Single division venue - auto assign
      targetDivisionVenue = {
        id: stateDivisionVenues[0].id,
        ...stateDivisionVenues[0].data()
      };
    } else if (stateDivisionVenues.length > 1) {
      // Multiple division venues - check cluster-division mapping
      const mappingSnapshot = await adminDb
        .collection('clusterDivisionMapping')
        .where('clusterVenueId', '==', clusterVenueId)
        .where('isActive', '==', true)
        .get();
      
      if (!mappingSnapshot.empty) {
        const mapping = mappingSnapshot.docs[0].data();
        const divisionVenueDoc = await adminDb.collection('venues').doc(mapping.divisionVenueId).get();
        if (divisionVenueDoc.exists) {
          targetDivisionVenue = {
            id: divisionVenueDoc.id,
            ...divisionVenueDoc.data()
          };
        }
      }
    }
    
    if (!targetDivisionVenue) {
      return {
        clusterVenueId,
        success: false,
        error: 'No division venue found or mapped for this cluster'
      };
    }
    
    // Get winners from completed fixtures (top 2 teams per sport/gender)
    const winnersByCategory = new Map();
    
    for (const fixtureDoc of fixturesSnapshot.docs) {
      const fixture = fixtureDoc.data();
      if (fixture.finalStandings && fixture.finalStandings.length > 0) {
        const categoryKey = `${fixture.sportId}_${fixture.genderCategory}`;
        const topTeams = fixture.finalStandings.slice(0, 2); // Top 2 teams advance
        winnersByCategory.set(categoryKey, topTeams);
      }
    }
    
    // Advance the winners
    let advancedCount = 0;
    const batch = adminDb.batch();

    // Fix for Map iteration compatibility with ES5/ES3 targets
    for (const categoryKey of Array.from(winnersByCategory.keys())) {
      const winners = winnersByCategory.get(categoryKey);
      if (!winners) continue;
      for (const winner of winners) {
        // Skip if winner doesn't have required data
        if (!winner.teamId || !winner.teamName) continue;
        
        // Check if team is already assigned to division level to avoid duplicates
        const existingAssignmentSnapshot = await adminDb
          .collection('teamVenueAssignment')
          .where('teamId', '==', winner.teamId)
          .where('assignmentLevel', '==', 'division')
          .limit(1)
          .get();
        
        if (!existingAssignmentSnapshot.empty) {
          continue; // Skip if already assigned
        }
        
        // Create division venue assignment
        const assignmentData = {
          teamId: winner.teamId,
          teamName: winner.teamName,
          divisionVenueId: targetDivisionVenue.id,
          divisionVenueName: (targetDivisionVenue as any).name ?? '',
          assignmentLevel: 'division',
          status: 'assigned',
          assignedAt: FieldValue.serverTimestamp(),
          assignedBy: 'system_auto',
          advancedFrom: 'cluster',
          sourceClusterVenueId: clusterVenueId,
          rank: winner.position || winner.rank || 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };
        
        const assignmentRef = adminDb.collection('teamVenueAssignment').doc();
        batch.set(assignmentRef, {
          ...assignmentData,
          assignmentId: assignmentRef.id
        });
        
        // Update team document
        const teamRef = adminDb.collection('teams').doc(winner.teamId);
        batch.update(teamRef, {
          currentLevel: 'division',
          divisionVenueId: targetDivisionVenue.id,
          divisionVenueName: (targetDivisionVenue as any).name ?? '',
          advancedToDivisionAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
        advancedCount++;
      }
    }
    
    await batch.commit();
    
    return {
      clusterVenueId,
      success: true,
      message: `Advanced ${advancedCount} teams to ${(targetDivisionVenue as any).name ?? ''}`,
      advancedTeams: advancedCount,
      targetDivisionVenue: (targetDivisionVenue as any).name ?? ''
    };
  } catch (error) {
    return {
      clusterVenueId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}