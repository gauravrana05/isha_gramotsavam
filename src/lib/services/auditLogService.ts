import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Simple audit log interface
interface AuditLog {
  action: 'player_verification' | 'document_upload' | 'onground_verification';
  volunteer: {
    id: string;
    name: string;
    role: 'verification_volunteer' | 'technical_volunteer';
  };
  player?: { 
    id: string; 
    name: string; 
  };
  team?: { 
    id: string; 
    name: string; 
  };
  venue?: string;
  documentType?: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack';
  status: 'approved' | 'rejected' | 'uploaded' | 'verified';
  comments?: string;
  success: boolean;
  timestamp: any;
}

export const auditLogService = {
  /**
   * Logs player verification by verification_volunteer (document verification)
   */
  logPlayerVerification: async (
    volunteerId: string,
    volunteerName: string,
    playerId: string,
    playerName: string,
    teamId: string,
    teamName: string,
    status: 'approved' | 'rejected',
    comments?: string
  ) => {
    try {
      await addDoc(collection(db, "auditLogs"), {
        action: "player_verification",
        volunteer: {
          id: volunteerId,
          name: volunteerName,
          role: "verification_volunteer"
        },
        player: {
          id: playerId,
          name: playerName
        },
        team: {
          id: teamId,
          name: teamName
        },
        status: status,
        comments: comments || '',
        success: true,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating player verification audit log:", error);
    }
  },

  /**
   * Logs document upload by technical_volunteer during match day
   */
  logDocumentUpload: async (
    volunteerId: string,
    volunteerName: string,
    playerId: string,
    playerName: string,
    teamId: string,
    teamName: string,
    venue: string,
    documentType: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack',
    success: boolean = true,
    comments?: string
  ) => {
    try {
      await addDoc(collection(db, "auditLogs"), {
        action: "document_upload",
        volunteer: {
          id: volunteerId,
          name: volunteerName,
          role: "technical_volunteer"
        },
        player: {
          id: playerId,
          name: playerName
        },
        team: {
          id: teamId,
          name: teamName
        },
        venue: venue,
        documentType: documentType,
        status: "uploaded",
        comments: comments || '',
        success: success,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating document upload audit log:", error);
    }
  },

  /**
   * Logs on-ground verification by technical_volunteer
   */
  logOnGroundVerification: async (
    volunteerId: string,
    volunteerName: string,
    playerId: string,
    playerName: string,
    teamId: string,
    teamName: string,
    venue: string,
    status: 'verified' | 'rejected',
    comments?: string
  ) => {
    try {
      await addDoc(collection(db, "auditLogs"), {
        action: "onground_verification",
        volunteer: {
          id: volunteerId,
          name: volunteerName,
          role: "technical_volunteer"
        },
        player: {
          id: playerId,
          name: playerName
        },
        team: {
          id: teamId,
          name: teamName
        },
        venue: venue,
        status: status,
        comments: comments || '',
        success: true,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating on-ground verification audit log:", error);
    }
  },

  /**
   * Legacy function for backward compatibility - maps to new player verification
   */
  logBulkPlayerVerification: async (
    actor: any,
    team: any,
    playerCount: number,
    status: 'approved' | 'rejected',
    reason: string
  ) => {
    try {
      await addDoc(collection(db, "auditLogs"), {
        action: "player_verification",
        volunteer: {
          id: actor.uid,
          name: actor.name,
          role: actor.role
        },
        team: {
          id: team.id,
          name: team.name
        },
        status: status,
        comments: `Bulk verification of ${playerCount} players: ${reason}`,
        success: true,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating bulk verification audit log:", error);
    }
  },

  /**
   * Legacy function for backward compatibility - maps to new player verification
   */
  logTeamStatusChange: async (
    actor: any,
    team: any,
    oldStatus: string,
    newStatus: string,
    reason: string
  ) => {
    try {
      await addDoc(collection(db, "auditLogs"), {
        action: "player_verification",
        volunteer: {
          id: actor.uid,
          name: actor.name,
          role: actor.role
        },
        team: {
          id: team.id,
          name: team.name
        },
        status: newStatus as any,
        comments: `Team status changed from ${oldStatus} to ${newStatus}: ${reason}`,
        success: true,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating team status change audit log:", error);
    }
  },
};