'use server'

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function checkAndUpdateProfileCompletion(userId: string) {
  try {
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data();
    
    const isComplete = checkProfileCompletion(userData);
    
    console.log("isComplete", isComplete);
    if (isComplete && !userData?.isProfileComplete) {
      await userDocRef.update({
        isProfileComplete: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      if (userData?.currentTeamId) {
        const teamRef = adminDb.collection("teams").doc(userData.currentTeamId);
        await teamRef.update({
          updatedAt: FieldValue.serverTimestamp(),
        });

        const playerRef = adminDb
        .collection("teams").doc(teamRef.id)
        .collection("players").doc(userId);
        await playerRef.update({
          isProfileComplete: true,
          'documents.profilePhoto.url': userData.documents.profilePhoto?.url || null,
          'documents.aadhaarFront.url': userData.documents.aadhaarFront?.url || null,
          'documents.aadhaarBack.url': userData.documents.aadhaarBack?.url || null,

        updatedAt: FieldValue.serverTimestamp()
      })
      }
     

      return { success: true, isComplete: true, message: 'Profile and team updated' };
    } 
    
    return { success: true, isComplete: userData?.isProfileComplete || false };
    
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Optimized team verification
async function checkAndUpdateTeamVerification(userId: string) {
  try {
    // Single query with OR condition (if possible)
    const teamsQuery = adminDb.collection("teams")
      .where("players", "array-contains", {userId: userId});
    
    const teamsSnapshot = await teamsQuery.get();
    
    if (teamsSnapshot.empty) return [];
    
    // Get all captain IDs in one go
    const captainIds = teamsSnapshot.docs
      .map(doc => doc.data().captainId)
      .filter(Boolean);
    
    // Batch read all captain documents
    const captainRefs = captainIds.map(id => adminDb.collection("users").doc(id));
    const captainDocs = await adminDb.getAll(...captainRefs);
    
    // Create captain lookup map
    const captainMap = new Map();
    captainDocs.forEach(doc => {
      if (doc.exists) {
        captainMap.set(doc.id, doc.data());
      }
    });
    
    // Process teams in parallel
    const teamUpdates = [];
    
    for (const teamDoc of teamsSnapshot.docs) {
      const teamData = teamDoc.data();
      const teamId = teamDoc.id;
      
      // Check if all players are verified
      const allPlayersVerified = checkTeamVerification(teamData, captainMap);
      
      if (allPlayersVerified && teamData.status !== 'verified') {
        teamUpdates.push({
          ref: adminDb.collection("teams").doc(teamId),
          data: {
            status: 'verified',
            verifiedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          }
        });
      }
    }
    
    return teamUpdates;
    
  } catch (error) {
    console.error(`Error checking team verification for user ${userId}:`, error);
    return [];
  }
}

// Helper functions
function checkProfileCompletion(userData: any): boolean {
  const hasDocuments = Boolean(
    userData?.documents?.aadhaarFront?.url &&
    userData?.documents?.aadhaarBack?.url &&
    userData?.documents?.profilePhoto?.url
  );
  
  const hasFields = Boolean(
    userData?.firstName && 
    userData?.lastName && 
    userData?.dob && 
    userData?.gender && 
    userData?.whatsappNumber && 
    userData?.pincode && 
    userData?.state && 
    userData?.taluk &&
    userData?.district && 
    userData?.panchayat
  );
  console.log(hasDocuments,"hasFields",  hasFields);
  console.log(userData);
  return hasDocuments && hasFields;
}

function checkTeamVerification(teamData: any, captainMap: Map<string, any>): boolean {
  const allPlayers = teamData.players || [];
  
  // Add captain if exists
  if (teamData.captainId && captainMap.has(teamData.captainId)) {
    const captainData = captainMap.get(teamData.captainId);
    allPlayers.push({
      userId: teamData.captainId,
      verificationStatus: captainData?.verificationStatus || 'pending',
      documents: captainData?.documents || {}
    });
  }
  
  return allPlayers.every((player: any) => {
    const docs = player.documents || {};
    return (
      player.verificationStatus === 'verified' &&
      docs.profilePhoto?.verified &&
      docs.aadhaarFront?.verified &&
      docs.aadhaarBack?.verified
    );
  });
}