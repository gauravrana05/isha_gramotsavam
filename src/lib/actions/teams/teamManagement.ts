// 'use server'

// import { adminDb } from '@/lib/firebase/admin';
// import { FieldValue } from 'firebase-admin/firestore';
// import { z } from 'zod';

// // Input validation schemas
// const TeamDataSchema = z.object({
//   name: z.string().min(2, 'Team name must be at least 2 characters').max(50, 'Team name too long'),
//   description: z.string().max(200, 'Description too long').optional(),
//   sportId: z.string().min(1, 'Sport ID is required'),
//   sportName: z.string().min(1, 'Sport name is required'),
//   genderCategory: z.enum(['men', 'women', 'mixed']).optional()
// });

// const PlayerDataSchema = z.object({
//   name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
//   firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
//   lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
//   phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number format'),
//   whatsappNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid WhatsApp number format').optional(),
//   dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
//   gender: z.enum(['M', 'F'], 'Gender is required'),
//   village: z.string().min(1, 'Village is required').max(100, 'Village name too long'),
//   panchayat: z.string().min(1, 'Panchayat is required').max(100, 'Panchayat name too long'),
//   taluk: z.string().min(1, 'Taluk is required').max(100, 'Taluk name too long'),
//   district: z.string().min(1, 'District is required').max(100, 'District name too long'),
//   state: z.string().min(1, 'State is required').max(100, 'State name too long'),
//   pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode format').optional(),
//   userId: z.string().optional()
// });

// interface CreateTeamRequest {
//   teamData: z.infer<typeof TeamDataSchema>;
//   captainId: string;
// }

// interface AddPlayerRequest {
//   teamId: string;
//   playerData: z.infer<typeof PlayerDataSchema>;
//   captainId: string;
// }

// function calculateAge(dob: string): number | null {
//   if (!dob) return null;
//   const birthDate = new Date(dob);
//   if (isNaN(birthDate.getTime())) return null;

//   const today = new Date();
//   let age = today.getFullYear() - birthDate.getFullYear();
//   const monthDiff = today.getMonth() - birthDate.getMonth();
  
//   if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
//     age--;
//   }
  
//   return age;
// }

// async function checkPlayerExistsInEvent(
//   playerIdentifier: string, 
//   eventId: string, 
//   identifierType: 'userId' | 'phone'
// ): Promise<{ exists: boolean, teamId?: string, teamName?: string }> {
//   try {
//     // Use collection group query with proper indexing
//     const playersQuery = await adminDb
//       .collectionGroup('players')
//       .where(identifierType, '==', playerIdentifier)
//       .where('isDeleted', '!=', true)
//       .limit(1)
//       .get();

//     if (!playersQuery.empty) {
//       const playerDoc = playersQuery.docs[0];
//       const playerData = playerDoc.data();
//       const teamId = playerData.teamId;
      
//       // Get team data to check event
//       const teamDoc = await adminDb.collection('teams').doc(teamId).get();
//       if (teamDoc.exists && teamDoc.data()?.eventId === eventId) {
//         return {
//           exists: true,
//           teamId: teamId,
//           teamName: teamDoc.data()?.name
//         };
//       }
//     }

//     return { exists: false };
//   } catch (error) {
//     console.error("Error checking player existence in event:", error);
//     return { exists: false };
//   }
// }

// async function validatePlayerEligibility(playerData: any, teamInfo: any): Promise<void> {
//   const age = calculateAge(playerData.dateOfBirth);
//   if (age === null) {
//     throw new Error("Could not calculate player's age from the provided date of birth.");
//   }
//   if (age < 14 || age > 60) {
//     throw new Error(`Player age must be between 14 and 60, but is ${age}`);
//   }

//   if (teamInfo.sportName === 'Throwball' && playerData.gender !== 'F') {
//     throw new Error("Throwball is only for women");
//   }

//   if (playerData.panchayat !== teamInfo.panchayat) {
//     throw new Error(`All players must be from the same panchayat (${teamInfo.panchayat}). Player is from ${playerData.panchayat}.`);
//   }
// }

// export async function createTeamEnhanced(request: CreateTeamRequest) {
//   try {
//     // Validate input
//     const validatedTeamData = TeamDataSchema.parse(request.teamData);
//     const { captainId } = request;
    
//     if (!captainId) {
//       return { success: false, error: "Captain ID is required" };
//     }

//     // Get user profile for captain details
//     const userDoc = await adminDb.collection("users").doc(captainId).get();
//     if (!userDoc.exists) {
//       return { success: false, error: "User profile not found" };
//     }

//     const userProfile = userDoc.data();
//     if (!userProfile) {
//       return { success: false, error: "User profile data not found" };
//     }
    
//     const captainAge = calculateAge(userProfile.dob);

//     // Validate gender-sport eligibility
//     if (validatedTeamData.sportName === 'Throwball' && userProfile.gender !== 'F') {
//       return { success: false, error: "Throwball is only for women" };
//     }

//     // Check if user is already captain or player in another team for this event
//     const eventId = "gramotsavam_2025";
//     const userExistsCheck = await checkPlayerExistsInEvent(captainId, eventId, 'userId');
//     if (userExistsCheck.exists) {
//       return { 
//         success: false, 
//         error: `You are already registered in team "${userExistsCheck.teamName}" for this event. Each player can only join one team per event.`
//       };
//     }

//     // Also check by phone number
//     if (userProfile.phoneNumber) {
//       const phoneExistsCheck = await checkPlayerExistsInEvent(userProfile.phoneNumber, eventId, 'phone');
//       if (phoneExistsCheck.exists) {
//         return { 
//           success: false, 
//           error: `A player with your phone number is already registered in team "${phoneExistsCheck.teamName}" for this event. Each player can only join one team per event.`
//         };
//       }
//     }

//     // Load sport configuration with fallback
//     let sportConfig = { maxPlayers: 6, maxSubstitutes: 6, genderCategories: ['mixed'] };
//     try {
//       const sportDoc = await adminDb.collection("sports").doc(validatedTeamData.sportId).get();
//       if (sportDoc.exists) {
//         const sportData = sportDoc.data();
//         sportConfig = {
//           maxPlayers: sportData?.maxPlayers || 6,
//           maxSubstitutes: sportData?.maxSubstitutes || 6,
//           genderCategories: sportData?.genderCategories || ['mixed']
//         };
//       }
//     } catch (error) {
//       console.error("Error loading sport configuration:", error);
//     }

//     // Use transaction for data consistency
//     const result = await adminDb.runTransaction(async (transaction) => {
//       // Create team document
//       const teamRef = adminDb.collection("teams").doc();
      
//       const teamData = {
//         name: validatedTeamData.name,
//         description: validatedTeamData.description || '',
//         captainId: captainId,
//         captainProfile: {
//           name: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
//           phone: userProfile.phoneNumber,
//           panchayat: userProfile.panchayat
//         },
        
//         eventId: eventId,
//         sportId: validatedTeamData.sportId,
//         sportName: validatedTeamData.sportName,
//         genderCategory: validatedTeamData.genderCategory || sportConfig.genderCategories[0] || 'mixed',
        
//         maxPlayers: sportConfig.maxPlayers,
//         maxSubstitutes: sportConfig.maxSubstitutes,
//         currentPlayers: 1,
//         currentSubstitutes: 0,
        
//         panchayat: userProfile.panchayat,
//         taluk: userProfile.taluk || "",
//         district: userProfile.district,
//         state: userProfile.state,
        
//         status: "draft",
        
//         createdAt: FieldValue.serverTimestamp(),
//         updatedAt: FieldValue.serverTimestamp()
//       };

//       transaction.set(teamRef, teamData);

//       // Add captain as first player
//       const playerRef = teamRef.collection("players").doc(captainId);
//       const playerData = {
//         playerId: captainId,
//         userId: captainId,
//         teamId: teamRef.id,
        
//         name: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
//         phone: userProfile.phoneNumber,
//         dateOfBirth: userProfile.dob,
//         age: captainAge,
//         gender: userProfile.gender,
        
//         position: "main",
//         addedAt: FieldValue.serverTimestamp(),
//         addedBy: captainId,
        
//         profileComplete: userProfile.isProfileComplete || false,
//         profileData: {
//           firstName: userProfile.firstName,
//           lastName: userProfile.lastName,
//           whatsappNumber: userProfile.whatsappNumber,
//           village: userProfile.village || "",
//           panchayat: userProfile.panchayat,
//           taluk: userProfile.taluk || "",
//           district: userProfile.district,
//           state: userProfile.state,
//           pincode: userProfile.pincode || ""
//         },
        
//         documents: {
//           profilePhoto: {
//             storagePath: userProfile.documents?.profilePhoto?.storagePath || "",
//             url: userProfile.documents?.profilePhoto?.url || null,
//             verified: userProfile.documents?.profilePhoto?.verified || false,
//             uploadedBy: captainId,
//             uploadedAt: userProfile.documents?.profilePhoto?.uploadedAt || null
//           },
//           aadhaarFront: {
//             storagePath: userProfile.documents?.aadhaarFront?.storagePath || "",
//             url: userProfile.documents?.aadhaarFront?.url || null,
//             verified: userProfile.documents?.aadhaarFront?.verified || false,
//             uploadedBy: captainId,
//             uploadedAt: userProfile.documents?.aadhaarFront?.uploadedAt || null
//           },
//           aadhaarBack: {
//             storagePath: userProfile.documents?.aadhaarBack?.storagePath || "",
//             url: userProfile.documents?.aadhaarBack?.url || null,
//             verified: userProfile.documents?.aadhaarBack?.verified || false,
//             uploadedBy: captainId,
//             uploadedAt: userProfile.documents?.aadhaarBack?.uploadedAt || null
//           }
//         },
        
//         verificationStatus: "pending",
//         isDeleted: false
//       };

//       transaction.set(playerRef, playerData);

//       // Create verification record
//       const verificationRef = teamRef.collection("verification").doc("initial");
//       transaction.set(verificationRef, {
//         verificationId: "initial",
//         teamId: teamRef.id,
//         status: "pending",
        
//         checks: {
//           samePanchayatVerified: false,
//           ageRequirementsVerified: false,
//           playerCountVerified: false,
//           documentsVerified: false,
//           allChecksComplete: false
//         },
        
//         playersTotal: 1,
//         playersVerified: 0,
//         playersRejected: 0,
//         playersPending: 1,
        
//         createdAt: FieldValue.serverTimestamp()
//       });

//       return teamRef.id;
//     });

//     console.log(`Enhanced team ${result} created successfully`);

//     return {
//       success: true,
//       teamId: result,
//       message: "Team created successfully"
//     };
//   } catch (error) {
//     console.error("Error creating enhanced team:", error);
    
//     if (error instanceof z.ZodError) {
//       return { 
//         success: false, 
//         error: `Validation error: ${(error as z.ZodError).issues.map((e: any) => e.message).join(', ')}`
//       };
//     }
    
//     return { 
//       success: false, 
//       error: error instanceof Error ? error.message : "Failed to create team"
//     };
//   }
// }

// export async function addPlayerToTeamEnhanced(request: AddPlayerRequest) {
//   try {
//     // Validate input
//     const validatedPlayerData = PlayerDataSchema.parse(request.playerData);
//     const { teamId, captainId } = request;

//     if (!teamId || !captainId) {
//       return { success: false, error: "Team ID and Captain ID are required" };
//     }

//     // Validate team ownership and get team info
//     const teamDoc = await adminDb.collection("teams").doc(teamId).get();
//     if (!teamDoc.exists) {
//       return { success: false, error: "Team not found" };
//     }

//     const teamInfo = teamDoc.data();
//     if (teamInfo?.captainId !== captainId) {
//       return { success: false, error: "Not authorized to manage this team" };
//     }

//     // Check team capacity
//     if (teamInfo.currentPlayers >= teamInfo.maxPlayers) {
//       return { success: false, error: "Team is at maximum capacity" };
//     }

//     // Check player eligibility
//     await validatePlayerEligibility(validatedPlayerData, teamInfo);

//     // Check for duplicates
//     const eventId = teamInfo.eventId || "gramotsavam_2025";
//     const phoneExistsCheck = await checkPlayerExistsInEvent(validatedPlayerData.phone, eventId, 'phone');
//     if (phoneExistsCheck.exists) {
//       return { 
//         success: false, 
//         error: `Player with phone ${validatedPlayerData.phone} is already registered in team "${phoneExistsCheck.teamName}" for this event.`
//       };
//     }

//     if (validatedPlayerData.userId) {
//       const userIdExistsCheck = await checkPlayerExistsInEvent(validatedPlayerData.userId, eventId, 'userId');
//       if (userIdExistsCheck.exists) {
//         return { 
//           success: false, 
//           error: `Player is already registered in team "${userIdExistsCheck.teamName}" for this event.`
//         };
//       }
//     }

//     const playerAge = calculateAge(validatedPlayerData.dateOfBirth);

//     // Use transaction for consistency
//     const result = await adminDb.runTransaction(async (transaction) => {
//       // Create or get Firebase user
//       let firebaseUserId = validatedPlayerData.userId || "";
      
//       if (!firebaseUserId) {
//         try {
//           // Check if user exists by phone
//           try {
//             const existingUser = await adminDb.auth().getUserByPhoneNumber(`+91${validatedPlayerData.phone}`);
//             firebaseUserId = existingUser.uid;
//           } catch (error: any) {
//             if (error.code === 'auth/user-not-found') {
//               // Create new user
//               const userRecord = await adminDb.auth().createUser({
//                 phoneNumber: `+91${validatedPlayerData.phone}`,
//                 displayName: validatedPlayerData.name,
//                 disabled: false
//               });
//               firebaseUserId = userRecord.uid;
//             } else {
//               throw error;
//             }
//           }
//         } catch (error) {
//           throw new Error(`Failed to create user account: ${error.message}`);
//         }
//       }

//       // Update user profile
//       const userProfileRef = adminDb.collection("users").doc(firebaseUserId);
//       const userProfileData = {
//         firstName: validatedPlayerData.firstName,
//         lastName: validatedPlayerData.lastName,
//         phoneNumber: validatedPlayerData.phone,
//         whatsappNumber: validatedPlayerData.whatsappNumber || validatedPlayerData.phone,
//         dob: validatedPlayerData.dateOfBirth,
//         gender: validatedPlayerData.gender,
//         village: validatedPlayerData.village,
//         panchayat: validatedPlayerData.panchayat,
//         taluk: validatedPlayerData.taluk,
//         district: validatedPlayerData.district,
//         state: validatedPlayerData.state,
//         role: "player",
//         isProfileComplete: false,
//         currentTeamId: teamId,
//         updatedAt: FieldValue.serverTimestamp()
//       };
      
//       transaction.set(userProfileRef, userProfileData, { merge: true });

//       // Add player to team
//       const playerRef = adminDb.collection("teams").doc(teamId).collection("players").doc(firebaseUserId);
//       const playerDoc = {
//         playerId: firebaseUserId,
//         userId: firebaseUserId,
//         teamId: teamId,
        
//         name: validatedPlayerData.name,
//         phone: validatedPlayerData.phone,
//         dateOfBirth: validatedPlayerData.dateOfBirth,
//         age: playerAge,
//         gender: validatedPlayerData.gender,
        
//         position: "main",
//         addedAt: FieldValue.serverTimestamp(),
//         addedBy: captainId,
        
//         profileComplete: false,
//         profileData: {
//           firstName: validatedPlayerData.firstName,
//           lastName: validatedPlayerData.lastName,
//           whatsappNumber: validatedPlayerData.whatsappNumber || validatedPlayerData.phone,
//           village: validatedPlayerData.village,
//           panchayat: validatedPlayerData.panchayat,
//           taluk: validatedPlayerData.taluk,
//           district: validatedPlayerData.district,
//           state: validatedPlayerData.state,
//           pincode: validatedPlayerData.pincode || ""
//         },
        
//         documents: {
//           profilePhoto: { verified: false },
//           aadhaarFront: { verified: false },
//           aadhaarBack: { verified: false }
//         },
        
//         verificationStatus: "pending",
//         isDeleted: false
//       };

//       transaction.set(playerRef, playerDoc);

//       // Update team player count
//       const teamRef = adminDb.collection("teams").doc(teamId);
//       transaction.update(teamRef, {
//         currentPlayers: FieldValue.increment(1),
//         updatedAt: FieldValue.serverTimestamp()
//       });

//       return firebaseUserId;
//     });

//     console.log(`Player ${result} added to team ${teamId}`);

//     return {
//       success: true,
//       playerId: result,
//       message: "Player added successfully"
//     };
//   } catch (error) {
//     console.error("Error adding player to team:", error);
    
//     if (error instanceof z.ZodError) {
//       return { 
//         success: false, 
//         error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
//       };
//     }
    
//     return { 
//       success: false, 
//       error: error instanceof Error ? error.message : "Failed to add player to team"
//     };
//   }
// }

// export async function submitTeamForVerification(teamId: string, captainId: string) {
//   try {
//     if (!teamId || !captainId) {
//       return { success: false, error: "Team ID and Captain ID are required" };
//     }

//     // Validate team completeness
//     const teamDoc = await adminDb.collection("teams").doc(teamId).get();
    
//     if (!teamDoc.exists) {
//       return { success: false, error: "Team not found" };
//     }

//     const team = teamDoc.data();
    
//     if (team?.captainId !== captainId) {
//       return { success: false, error: "Not authorized to submit this team" };
//     }

//     if (team.currentPlayers < team.maxPlayers) {
//       return { success: false, error: `Team needs ${team.maxPlayers - team.currentPlayers} more players` };
//     }

//     // Use transaction for consistency
//     await adminDb.runTransaction(async (transaction) => {
//       // Update team status
//       const teamRef = adminDb.collection("teams").doc(teamId);
//       transaction.update(teamRef, {
//         status: "submitted",
//         submittedAt: FieldValue.serverTimestamp(),
//         updatedAt: FieldValue.serverTimestamp()
//       });

//       // Create notification for verification volunteers
//       const notificationRef = adminDb.collection("notifications").doc();
//       transaction.set(notificationRef, {
//         type: "team_submitted_for_verification",
//         title: "New Team Submitted for Verification",
//         message: `Team "${team.name}" (${team.sportName}) has been submitted for verification`,
//         teamId: teamId,
//         targetRoles: ["verification_volunteer", "admin"],
//         data: {
//           teamName: team.name,
//           sportName: team.sportName,
//           captainName: team.captainProfile.name,
//           playerCount: team.currentPlayers,
//           panchayat: team.panchayat,
//           district: team.district,
//           genderCategory: team.genderCategory || 'mixed'
//         },
//         createdAt: FieldValue.serverTimestamp(),
//         read: false
//       });

//       // Send confirmation to captain
//       const confirmationRef = adminDb.collection("notifications").doc();
//       transaction.set(confirmationRef, {
//         type: "team_submission_confirmation",
//         title: "Team Submitted Successfully",
//         message: `Your team "${team.name}" has been submitted for verification. You will be notified once the review is complete.`,
//         teamId: teamId,
//         targetUsers: [captainId],
//         createdAt: FieldValue.serverTimestamp(),
//         read: false
//       });
//     });

//     console.log(`Team ${teamId} submitted for verification successfully`);

//     return {
//       success: true,
//       teamId: teamId,
//       message: "Team submitted for verification successfully"
//     };
//   } catch (error) {
//     console.error("Error submitting team for verification:", error);
//     return { 
//       success: false, 
//       error: error instanceof Error ? error.message : "Failed to submit team for verification"
//     };
//   }
// }