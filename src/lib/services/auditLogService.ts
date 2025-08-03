import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Define the object shapes for clarity
interface Actor {
  uid: string;
  name: string;
  role: string;
}

interface TeamInfo {
  id: string;
  name: string;
}

interface PlayerInfo {
  id: string;
  name: string;
}

export const auditLogService = {
  /**
   * Logs the verification status change for a single player.
   */
  logPlayerVerification: async (
    actor: Actor,
    team: TeamInfo,
    player: PlayerInfo,
    oldStatus: string,
    newStatus: string,
    reason: string | null
  ) => {
    try {
      await addDoc(collection(db, "auditLog"), {
        action: "PLAYER_VERIFICATION",
        actor,
        team,
        player,
        oldValue: oldStatus,
        newValue: newStatus,
        details: {
          reason: reason,
        },
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating player verification audit log:", error);
    }
  },

  /**
   * Logs a bulk verification action for multiple players.
   */
  logBulkPlayerVerification: async (
    actor: Actor,
    team: TeamInfo,
    playerCount: number,
    status: 'approved' | 'rejected',
    reason: string
  ) => {
    try {
      await addDoc(collection(db, "auditLog"), {
        action: "BULK_PLAYER_VERIFICATION",
        actor,
        team,
        newValue: status,
        details: {
          playerCount: playerCount,
          reason: reason,
        },
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating bulk verification audit log:", error);
    }
  },

  /**
   * Logs a change in the overall team status.
   */
  logTeamStatusChange: async (
    actor: Actor,
    team: TeamInfo,
    oldStatus: string,
    newStatus: string,
    reason: string
  ) => {
    try {
      await addDoc(collection(db, "auditLog"), {
        action: "TEAM_STATUS_CHANGE",
        actor,
        team,
        oldValue: oldStatus,
        newValue: newStatus,
        details: {
          reason: reason,
        },
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating team status change audit log:", error);
    }
  },
};