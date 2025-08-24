// 'use server'

// import { adminDb } from '@/lib/firebase/admin';
// import { FieldValue } from 'firebase-admin/firestore';
// import { z } from 'zod';

// // Input validation schemas
// const VerifyTeamSchema = z.object({
//   teamId: z.string().min(1, 'Team ID is required'),
//   status: z.enum(['approved', 'rejected'], { required_error: 'Status must be approved or rejected' }),
//   comments: z.string().max(500, 'Comments too long').optional(),
//   verifiedBy: z.string().min(1, 'Verified by is required')
// });

// const VerifyPlayerSchema = z.object({
//   teamId: z.string().min(1, 'Team ID is required'),
//   playerId: z.string().min(1, 'Player ID is required'),
//   status: z.enum(['verified', 'rejected'], { required_error: 'Status must be verified or rejected' }),
//   comments: z.string().max(500, 'Comments too long').optional(),
//   volunteerId: z.string().min(1, 'Volunteer ID is required')
// });

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

// export async function verifyTeam(request: z.infer<typeof VerifyTeamSchema>) {
//   try {
//     // Validate input
//     const validatedRequest = VerifyTeamSchema.parse(request);
//     const { teamId, status, comments, verifiedBy } = validatedRequest;

//     // Check if user has verification permissions
//     const userDoc = await adminDb.collection("users").doc(verifiedBy).get();
//     if (!userDoc.exists) {
//       return { success: false, error: "Volunteer not found" };
//     }

//     const userData = userDoc.data();
//     if (!userData || !['verification_volunteer', 'admin'].includes(userData.role)) {
//       return { success: false, error: "Not authorized to verify teams" };
//     }

//     // Get team data
//     const teamDoc = await adminDb.collection("teams").doc(teamId).get();
//     if (!teamDoc.exists) {
//       return { success: false, error: "Team not found" };
//     }

//     const teamData = teamDoc.data();

//     // Use transaction for consistency
//     await adminDb.runTransaction(async (transaction) => {
//       // Update team verification status
//       const teamRef = adminDb.collection("teams").doc(teamId);
//       transaction.update(teamRef, {
//         verificationStatus: status,
//         verifiedBy: verifiedBy,
//         verifiedAt: FieldValue.serverTimestamp(),
//         verificationComments: comments || '',
//         status: status === 'approved' ? 'active' : 'rejected',
//         updatedAt: FieldValue.serverTimestamp()
//       });

//       // Update verification record
//       const verificationRef = adminDb
//         .collection("teams").doc(teamId)
//         .collection("verification").doc("initial");
      
//       transaction.update(verificationRef, {
//         status: status,
//         verifiedBy: verifiedBy,
//         verifiedAt: FieldValue.serverTimestamp(),
//         comments: comments || '',
//         updatedAt: FieldValue.serverTimestamp()
//       });

//       // Send notification to team captain
//       const notificationRef = adminDb.collection("notifications").doc();
//       transaction.set(notificationRef, {
//         type: "team_verification_result",
//         title: status === 'approved' ? "Team Approved!" : "Team Verification Required",
//         message: status === 'approved' 
//           ? `Your team "${teamData?.name}" has been approved and is now active.`
//           : `Your team "${teamData?.name}" requires attention. Please check the comments and resubmit.`,
//         teamId: teamId,
//         targetUsers: [teamData?.captainId],
//         data: {
//           teamName: teamData?.name,
//           status: status,
//           comments: comments || '',
//           verifiedBy: verifiedBy
//         },
//         createdAt: FieldValue.serverTimestamp(),
//         read: false
//       });
//     });

//     // Console log removed

//     return {
//       success: true,
//       message: `Team ${status} successfully`
//     };

//   } catch (error) {
//     // Error handling removed
    
//     if (error instanceof z.ZodError) {
//       return { 
//         success: false, 
//         error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
//       };
//     }
    
//     return { 
//       success: false, 
//       error: error instanceof Error ? error.message : "Failed to verify team"
//     };
//   }
// }

// export async function verifyPlayer(request: z.infer<typeof VerifyPlayerSchema>) {
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

//     // Use transaction for consistency
//     await adminDb.runTransaction(async (transaction) => {
//       // Update player verification status
//       const playerRef = adminDb
//         .collection("teams").doc(teamId)
//         .collection("players").doc(playerId);
      
//       transaction.update(playerRef, {
//         verificationStatus: status,
//         verifiedBy: volunteerId,
//         verifiedAt: FieldValue.serverTimestamp(),
//         verificationComments: comments || '',
//         updatedAt: FieldValue.serverTimestamp()
//       });
//     });

//     // Update team verification record (outside transaction to avoid conflicts)
//     await updateTeamVerificationRecord(teamId);

//     // Console log removed

//     return {
//       success: true,
//       message: `Player ${status} successfully`
//     };

//   } catch (error) {
//     // Error handling removed
    
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

// export async function getTeamsPendingVerification(volunteerId: string, limit: number = 50, offset: number = 0) {
//   try {
//     if (!volunteerId) {
//       return { success: false, error: "Volunteer ID is required" };
//     }

//     // Check if user has verification permissions
//     const userDoc = await adminDb.collection("users").doc(volunteerId).get();
//     if (!userDoc.exists) {
//       return { success: false, error: "Volunteer not found" };
//     }

//     const userData = userDoc.data();
//     if (!userData || !['verification_volunteer', 'admin'].includes(userData.role)) {
//       return { success: false, error: "Not authorized to view verification queue" };
//     }

//     // Get teams with submitted status (with pagination)
//     const teamsQuery = await adminDb
//       .collection("teams")
//       .where("status", "==", "submitted")
//       .orderBy("submittedAt", "desc")
//       .limit(limit)
//       .offset(offset)
//       .get();

//     const teams = teamsQuery.docs.map(doc => {
//       const data = doc.data();
//       return {
//         id: doc.id,
//         ...data,
//         submittedAt: data.submittedAt?.toDate?.()?.toISOString() || null,
//         createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
//         updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
//       };
//     });

//     return {
//       success: true,
//       teams: teams,
//       hasMore: teams.length === limit // Simple pagination indicator
//     };

//   } catch (error) {
//     // Error handling removed
//     return { 
//       success: false, 
//       error: error instanceof Error ? error.message : "Failed to get verification queue"
//     };
//   }
// }

// export async function getTeamForVerification(teamId: string, volunteerId: string) {
//   try {
//     if (!teamId || !volunteerId) {
//       return { success: false, error: "Team ID and Volunteer ID are required" };
//     }

//     // Check if user has verification permissions
//     const userDoc = await adminDb.collection("users").doc(volunteerId).get();
//     if (!userDoc.exists) {
//       return { success: false, error: "Volunteer not found" };
//     }

//     const userData = userDoc.data();
//     if (!userData || !['verification_volunteer', 'admin'].includes(userData.role)) {
//       return { success: false, error: "Not authorized to view team details" };
//     }

//     // Get team data
//     const teamDoc = await adminDb.collection("teams").doc(teamId).get();
//     if (!teamDoc.exists) {
//       return { success: false, error: "Team not found" };
//     }

//     // Get team players with proper query
//     const playersQuery = await adminDb
//       .collection("teams").doc(teamId)
//       .collection("players")
//       .where("isDeleted", "!=", true)
//       .get();

//     const players = playersQuery.docs.map(doc => {
//       const data = doc.data();
//       return {
//         id: doc.id,
//         ...data,
//         addedAt: data.addedAt?.toDate?.()?.toISOString() || null,
//         verifiedAt: data.verifiedAt?.toDate?.()?.toISOString() || null,
//         updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
//       };
//     });

//     // Get verification record
//     const verificationDoc = await adminDb
//       .collection("teams").doc(teamId)
//       .collection("verification").doc("initial")
//       .get();

//     const verification = verificationDoc.exists ? {
//       ...verificationDoc.data(),
//       createdAt: verificationDoc.data()?.createdAt?.toDate?.()?.toISOString() || null,
//       updatedAt: verificationDoc.data()?.updatedAt?.toDate?.()?.toISOString() || null,
//       verifiedAt: verificationDoc.data()?.verifiedAt?.toDate?.()?.toISOString() || null
//     } : null;

//     const teamData = teamDoc.data();
//     const serializedTeam = {
//       id: teamDoc.id,
//       ...teamData,
//       createdAt: teamData?.createdAt?.toDate?.()?.toISOString() || null,
//       updatedAt: teamData?.updatedAt?.toDate?.()?.toISOString() || null,
//       submittedAt: teamData?.submittedAt?.toDate?.()?.toISOString() || null,
//       verifiedAt: teamData?.verifiedAt?.toDate?.()?.toISOString() || null
//     };

//     return {
//       success: true,
//       team: serializedTeam,
//       players: players,
//       verification: verification
//     };

//   } catch (error) {
//     // Error handling removed
//     return { 
//       success: false, 
//       error: error instanceof Error ? error.message : "Failed to get team details"
//     };
//   }
// }