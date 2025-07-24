import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export const updateTeamPlayersSummary = functions.firestore.document('teams/{teamId}').onUpdate(async (change, context) => {
  const teamBefore = change.before.data();
  const teamAfter = change.after.data();

  if (JSON.stringify(teamBefore?.players) === JSON.stringify(teamAfter?.players)) {
    console.log('Players array did not change.');
    return null;
  }

  const teamId = context.params.teamId;
  const updatedPlayers = teamAfter?.players || [];

  const denormalizedPlayers: any[] = [];

  try {
    for (const playerRef of updatedPlayers) {
      if (playerRef.playerId) {
         const userDoc = await admin.firestore().collection('users').doc(playerRef.playerId).get();
         if (userDoc.exists) {
           const userData = userDoc.data();
           if (userData) {
             denormalizedPlayers.push({
               playerId: userDoc.id,
               name: userData.name || '',
               mobile: userData.phoneNumber || '',
               isProfileComplete: userData.isProfileComplete || false,
               isVerified: userData.isVerified || false,
               joinedAt: playerRef.joinedAt || null,
             });
           }
         } else {
             console.warn(`User document not found for playerId: ${playerRef.playerId}`);
         }
      }
    }

    await admin.firestore().collection('teams').doc(teamId).update({
      players: denormalizedPlayers,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Team ${teamId} players summary updated.`);

    return null;
  } catch (error) {
    console.error(`Error updating team ${teamId} players summary:`, error);
    return null;
  }
});