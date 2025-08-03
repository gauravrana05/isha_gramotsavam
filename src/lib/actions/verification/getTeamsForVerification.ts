'use server'

import { adminDb } from '@/lib/firebase/admin';

interface Team {
  id: string;
  name: string;
  sportName: string;
  captainProfile: {
    name: string;
    phone: string;
  };
  panchayat: string;
  district: string;
  state: string;
  genderCategory: string;
  currentPlayers: number;
  maxPlayers: number;
  status: string;
  submittedAt: any;
  createdAt: any;
}

interface Player {
  id: string;
  playerId: string;
  userId: string;
  name: string;
  phone: string;
  age: number;
  gender: string;
  position: string;
  profileComplete: boolean;
  documents: {
    profilePhoto: { url?: string | null; verified: boolean };
    aadhaarFront: { url?: string | null; verified: boolean };
    aadhaarBack: { url?: string | null; verified: boolean };
  };
  verificationStatus: string;
  verificationComments?: string[];
}

export async function getTeamsPendingVerification(volunteerId: string) {
  try {
    // Check if user has verification permissions
    const userDoc = await adminDb.collection("users").doc(volunteerId).get();
    if (!userDoc.exists) {
      return { success: false, error: "User not found" };
    }

    const userData = userDoc.data();
    if (!userData || !['verification_volunteer', 'admin'].includes(userData.role)) {
      return { success: false, error: "Not authorized to view verification queue" };
    }

    // Get teams with submitted status
    const teamsQuery = await adminDb
      .collection("teams")
      .where("status", "==", "submitted")
      .orderBy("submittedAt", "desc")
      .limit(50)
      .get();

    const teams: Team[] = teamsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Team));

    return {
      success: true,
      teams: teams
    };

  } catch (error) {
    console.error("Error getting teams pending verification:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get verification queue"
    };
  }
}

export async function getTeamForVerification(teamId: string, volunteerId: string) {
  try {
    if (!teamId) {
      return { success: false, error: "Team ID is required" };
    }

    // Check if user has verification permissions
    const userDoc = await adminDb.collection("users").doc(volunteerId).get();
    if (!userDoc.exists) {
      return { success: false, error: "User not found" };
    }

    const userData = userDoc.data();
    if (!userData || !['verification_volunteer', 'admin'].includes(userData.role)) {
      return { success: false, error: "Not authorized to view team details" };
    }

    // Get team data
    const teamDoc = await adminDb.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      return { success: false, error: "Team not found" };
    }

    // Get team players (excluding deleted players)
    const playersQuery = await adminDb
      .collection("teams").doc(teamId)
      .collection("players")
      .where("isDeleted", "!=", true)
      .get();

    const players: Player[] = playersQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Player));

    // Get verification record
    const verificationDoc = await adminDb
      .collection("teams").doc(teamId)
      .collection("verification").doc("initial")
      .get();

    const verification = verificationDoc.exists ? verificationDoc.data() : null;

    return {
      success: true,
      team: {
        id: teamDoc.id,
        ...teamDoc.data()
      },
      players: players,
      verification: verification
    };

  } catch (error) {
    console.error("Error getting team for verification:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get team details"
    };
  }
}