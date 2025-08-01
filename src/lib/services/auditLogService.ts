import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export interface AuditLogData {
  // Action Details
  action: string; // 'team_player_verification', 'onground_player_verification', 'volunteer_document_upload', 'volunteer_media_upload'
  resource: string; // 'team', 'player', 'document', 'media'
  resourceId: string;
  
  // User Context (Volunteer performing action)
  userId: string; // Volunteer's user ID
  userRole: string; // 'verification_volunteer' | 'volunteer_technical' | 'volunteer_general'
  ipAddress: string;
  userAgent: string;
  
  // Volunteer-specific Context
  venueId?: string; // Venue where volunteer is assigned
  verificationType?: 'document_verification' | 'onground_verification' | 'eligibility_check';
  
  // Target Information (Who/What is being acted upon)
  targetUserId?: string; // Player being verified or whose document is being uploaded
  targetTeamId?: string; // Team being verified
  
  // Document Upload Context (when volunteer uploads for user)
  documentType?: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack';
  uploadReason?: string; // Why volunteer is uploading
  
  // Media Upload Context  
  mediaType?: 'photo' | 'video';
  mediaCategory?: 'team_photo' | 'match_action' | 'celebration' | 'venue_documentation';
  
  // Changes Made
  changeDescription: string; // Brief description of what changed
  oldValue?: string; // Previous key value
  newValue?: string; // New key value
  
  // Context
  eventId?: string;
  teamId?: string;
  matchId?: string;
  playerId?: string;
  mediaId?: string;
  
  // Result
  success: boolean;
  errorMessage?: string;
}

class AuditLogService {
  private getClientInfo() {
    return {
      ipAddress: 'unknown', // Would need server-side implementation for real IP
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
    };
  }

  async logPlayerVerification(
    userId: string,
    userRole: string,
    targetTeamId: string,
    targetPlayerId: string,
    previousStatus: string,
    newStatus: string,
    venueId?: string,
    reason?: string
  ) {
    const logData: AuditLogData = {
      action: 'team_player_verification',
      resource: 'player',
      resourceId: targetPlayerId,
      userId,
      userRole,
      venueId,
      verificationType: 'document_verification',
      targetUserId: targetPlayerId,
      targetTeamId,
      changeDescription: `Player verification status changed from ${previousStatus} to ${newStatus}`,
      oldValue: previousStatus,
      newValue: newStatus,
      success: true,
      ...this.getClientInfo()
    };

    await this.createLog(logData);
  }

  async logDocumentUpload(
    userId: string,
    userRole: string,
    targetUserId: string,
    documentType: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack',
    uploadReason: string,
    venueId?: string
  ) {
    const logData: AuditLogData = {
      action: 'volunteer_document_upload',
      resource: 'document',
      resourceId: `${targetUserId}_${documentType}`,
      userId,
      userRole,
      venueId,
      targetUserId,
      documentType,
      uploadReason,
      changeDescription: `Volunteer uploaded ${documentType} for user: ${uploadReason}`,
      success: true,
      ...this.getClientInfo()
    };

    await this.createLog(logData);
  }

  async logMediaUpload(
    userId: string,
    userRole: string,
    mediaType: 'photo' | 'video',
    mediaCategory: 'team_photo' | 'match_action' | 'celebration' | 'venue_documentation',
    mediaId: string,
    venueId?: string,
    teamId?: string,
    matchId?: string
  ) {
    const logData: AuditLogData = {
      action: 'volunteer_media_upload',
      resource: 'media',
      resourceId: mediaId,
      userId,
      userRole,
      venueId,
      mediaType,
      mediaCategory,
      teamId,
      matchId,
      mediaId,
      changeDescription: `Volunteer uploaded ${mediaType} for ${mediaCategory}`,
      success: true,
      ...this.getClientInfo()
    };

    await this.createLog(logData);
  }

  async logOngroundVerification(
    userId: string,
    userRole: string,
    targetUserId: string,
    verificationType: 'eligibility_check' | 'onground_verification',
    result: string,
    venueId?: string,
    teamId?: string,
    matchId?: string
  ) {
    const logData: AuditLogData = {
      action: 'onground_player_verification',
      resource: 'player', 
      resourceId: targetUserId,
      userId,
      userRole,
      venueId,
      verificationType,
      targetUserId,
      teamId,
      matchId,
      changeDescription: `On-ground ${verificationType} completed with result: ${result}`,
      newValue: result,
      success: true,
      ...this.getClientInfo()
    };

    await this.createLog(logData);
  }

  private async createLog(logData: AuditLogData) {
    try {
      await addDoc(collection(db, 'auditLog'), {
        ...logData,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Don't throw error to prevent breaking the main functionality
    }
  }
}

export const auditLogService = new AuditLogService();