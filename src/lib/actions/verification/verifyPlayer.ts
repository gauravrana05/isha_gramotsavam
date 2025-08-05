// 'use server'

// import { adminDb } from '@/lib/firebase/admin';
// import { FieldValue } from 'firebase-admin/firestore';
// import { z } from 'zod';

// // Input validation schema
// const VerifyPlayerSchema = z.object({
//   teamId: z.string().min(1, 'Team ID is required'),
//   playerId: z.string().min(1, 'Player ID is required'),
//   status: z.enum(['verified', 'rejected'], { required_error: 'Status must be verified or rejected' }),
//   comments: z.string().max(500, 'Comments too long').optional(),
//   volunteerId: z.string().min(1, 'Volunteer ID is required')
// });

// interface VerifyPlayerRequest extends z.infer<typeof VerifyPlayerSchema> {}

// async function updateTeamVerificationRecord(teamId: string): Promise<void> {
//   const playersSnapshot = await adminDb
//     .collection("teams").doc(teamId)
//     .collection("players")
//     .where("isDeleted", "!=", true)
//     .get();

//   const totalPlayers = playersSnapshot.size;
//   const verifiedPlayers = playersSnapshot.docs.filter(doc => 
//     doc.data().verificationStatus === "verified"
//   ).length;
//   const rejectedPlayers = playersSnapshot.docs.filter(doc => 
//     doc.data().verificationStatus === "rejected"
//   ).length;
//   const pendingPlayers = totalPlayers - verifiedPlayers - rejectedPlayers;

//   const allChecksComplete = pendingPlayers === 0 && rejectedPlayers === 0;

//   await adminDb
//     .collection("teams").doc(teamId)
//     .collection("verification").doc("initial")
//     .update({
//       playersTotal: totalPlayers,
//       playersVerified: verifiedPlayers,
//       playersRejected: rejectedPlayers,
//       playersPending: pendingPlayers,
//       'checks.allChecksComplete': allChecksComplete,
//       updatedAt: FieldValue.serverTimestamp()
//     });

//   // If all players are verified, update team status
//   if (allChecksComplete && verifiedPlayers === totalPlayers) {
//     await adminDb.collection("teams").doc(teamId).update({
//       status: "verified",
//       verificationStatus: "verified",
//       updatedAt: FieldValue.serverTimestamp()
//     });
//   }
// }

// export async function verifyPlayer(request: VerifyPlayerRequest) {
//   try {
//     // Validate input
//     const validatedRequest = VerifyPlayerSchema.parse(request);
//     const { teamId, playerId, status, comments, volunteerId } = validatedRequest;

//     // Check if user has verification permissions
//     const userDoc = await adminDb.collection("users").doc(volunteerId).get();
//     if (!userDoc.exists) {
//       return { success: false, error: "Volunteer not found" };
//     }

//     const userData = userDoc.data();
//     if (!userData || !['verification_volunteer', 'admin'].includes(userData.role)) {
//       return { success: false, error: "Not authorized to verify players" };
//     }

//     // Check if player exists
//     const playerDoc = await adminDb
//       .collection("teams").doc(teamId)
//       .collection("players").doc(playerId)
//       .get();

//     if (!playerDoc.exists) {
//       return { success: false, error: "Player not found" };
//     }

//     // Update player verification status
//     await adminDb
//       .collection("teams").doc(teamId)
//       .collection("players").doc(playerId)
//       .update({
//         verificationStatus: status,
//         verifiedBy: volunteerId,
//         verifiedAt: FieldValue.serverTimestamp(),
//         verificationComments: comments || '',
//         updatedAt: FieldValue.serverTimestamp()
//       });

//     // Update team verification record
//     await updateTeamVerificationRecord(teamId);

//     console.log(`Player ${playerId} in team ${teamId} ${status} by ${volunteerId}`);

//     return {
//       success: true,
//       message: `Player ${status} successfully`
//     };

//   } catch (error) {
//     console.error("Error verifying player:", error);
    
//     if (error instanceof z.ZodError) {
//       return { 
//         success: false, 
//         error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
//       };
//     }
    
//     return { 
//       success: false, 
//       error: error instanceof Error ? error.message : "Failed to verify player"
//     };
//   }
// }