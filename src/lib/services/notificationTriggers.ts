/**
 * Notification Triggers Service
 * Handles automated push notifications for key tournament events
 */

import { api } from '@/server/trpc/react';

export interface NotificationTriggerData {
  userId: string;
  title: string;
  body: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export class NotificationTriggers {
  /**
   * Trigger match reminder notification
   */
  async triggerMatchReminder(matchId: string, timeBeforeStart: number = 30): Promise<void> {
    try {
      // Get match details
      const match = await this.getMatchDetails(matchId);
      if (!match) return;

      const userIds = await this.getMatchParticipants(matchId);
      
      const notification: NotificationTriggerData = {
        userId: '', // Will be set per user
        title: '⚽ Match Starting Soon!',
        body: `${match.team1Name} vs ${match.team2Name} starts in ${timeBeforeStart} minutes`,
        data: {
          type: 'match_reminder',
          matchId,
          url: `/en/mobile/live`
        },
        actions: [
          {
            action: 'view',
            title: 'View Match',
            icon: '/icons/android/android-launchericon-96-96.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ],
        icon: '/icons/android/android-launchericon-192-192.png',
        tag: `match_${matchId}`,
        requireInteraction: true
      };

      // Send to all participants
      await this.sendBulkNotification(userIds, notification);
    } catch (error) {
      console.error('Error triggering match reminder:', error);
    }
  }

  /**
   * Trigger team status update notification
   */
  async triggerTeamStatusUpdate(teamId: string, newStatus: string): Promise<void> {
    try {
      const team = await this.getTeamDetails(teamId);
      if (!team) return;

      const userIds = await this.getTeamMembers(teamId);
      
      const statusMessages = {
        'submitted': 'Your team has been submitted for verification',
        'verified': '✅ Your team has been verified and approved!',
        'rejected': '❌ Your team verification was rejected. Please check requirements.',
        'qualified': '🎉 Congratulations! Your team has qualified for the next round!'
      };

      const notification: NotificationTriggerData = {
        userId: '',
        title: `Team Update: ${team.name}`,
        body: statusMessages[newStatus as keyof typeof statusMessages] || `Team status updated to ${newStatus}`,
        data: {
          type: 'team_status',
          teamId,
          status: newStatus,
          url: `/en/mobile/team`
        },
        actions: [
          {
            action: 'view',
            title: 'View Team',
            icon: '/icons/android/android-launchericon-96-96.png'
          }
        ],
        icon: '/icons/android/android-launchericon-192-192.png',
        tag: `team_${teamId}_${newStatus}`
      };

      await this.sendBulkNotification(userIds, notification);
    } catch (error) {
      console.error('Error triggering team status update:', error);
    }
  }

  /**
   * Trigger team update notification (new player added, etc.)
   */
  async triggerTeamUpdate(teamId: string, updateType: string, details?: any): Promise<void> {
    try {
      const team = await this.getTeamDetails(teamId);
      if (!team) return;

      const userIds = await this.getTeamMembers(teamId);
      
      const updateMessages = {
        'player_added': `New player ${details?.playerName} joined your team`,
        'player_removed': `Player ${details?.playerName} left your team`,
        'player_verified': `Player ${details?.playerName} has been verified`,
        'captain_changed': `Team captain changed to ${details?.captainName}`,
        'venue_assigned': `Your team has been assigned to ${details?.venueName}`
      };

      const notification: NotificationTriggerData = {
        userId: '',
        title: `Team Update: ${team.name}`,
        body: updateMessages[updateType as keyof typeof updateMessages] || 'Team information updated',
        data: {
          type: 'team_update',
          teamId,
          updateType,
          details,
          url: `/en/mobile/team`
        },
        icon: '/icons/android/android-launchericon-192-192.png',
        tag: `team_update_${teamId}`
      };

      await this.sendBulkNotification(userIds, notification);
    } catch (error) {
      console.error('Error triggering team update:', error);
    }
  }

  /**
   * Trigger chat mention notification
   */
  async triggerChatMention(venueId: string, mentionedUserId: string, senderName: string, message: string): Promise<void> {
    try {
      const venue = await this.getVenueDetails(venueId);
      
      const notification: NotificationTriggerData = {
        userId: mentionedUserId,
        title: `💬 ${senderName} mentioned you`,
        body: message.length > 50 ? `${message.substring(0, 50)}...` : message,
        data: {
          type: 'chat_mention',
          venueId,
          senderName,
          url: `/en/mobile/chat`
        },
        actions: [
          {
            action: 'reply',
            title: 'Reply',
            icon: '/icons/android/android-launchericon-96-96.png'
          },
          {
            action: 'view',
            title: 'View Chat'
          }
        ],
        icon: '/icons/android/android-launchericon-192-192.png',
        tag: `chat_mention_${venueId}`,
        requireInteraction: true
      };

      await this.sendSingleNotification(mentionedUserId, notification);
    } catch (error) {
      console.error('Error triggering chat mention:', error);
    }
  }

  /**
   * Trigger emergency venue alert
   */
  async triggerEmergencyAlert(venueId: string, alert: { title: string; message: string; priority: 'high' | 'medium' | 'low' }): Promise<void> {
    try {
      const userIds = await this.getVenueParticipants(venueId);
      
      const notification: NotificationTriggerData = {
        userId: '',
        title: `🚨 ${alert.title}`,
        body: alert.message,
        data: {
          type: 'emergency_alert',
          venueId,
          priority: alert.priority,
          url: `/en/mobile/chat`
        },
        actions: [
          {
            action: 'acknowledge',
            title: 'Acknowledge',
            icon: '/icons/android/android-launchericon-96-96.png'
          }
        ],
        icon: '/icons/android/android-launchericon-192-192.png',
        tag: `emergency_${venueId}`,
        requireInteraction: true
      };

      await this.sendBulkNotification(userIds, notification);
    } catch (error) {
      console.error('Error triggering emergency alert:', error);
    }
  }

  /**
   * Trigger match score update
   */
  async triggerMatchScoreUpdate(matchId: string, team1Score: number, team2Score: number): Promise<void> {
    try {
      const match = await this.getMatchDetails(matchId);
      if (!match) return;

      const userIds = await this.getMatchParticipants(matchId);
      
      const notification: NotificationTriggerData = {
        userId: '',
        title: '⚽ Score Update',
        body: `${match.team1Name} ${team1Score} - ${team2Score} ${match.team2Name}`,
        data: {
          type: 'score_update',
          matchId,
          team1Score,
          team2Score,
          url: `/en/mobile/live`
        },
        icon: '/icons/android/android-launchericon-192-192.png',
        tag: `score_${matchId}`
      };

      await this.sendBulkNotification(userIds, notification);
    } catch (error) {
      console.error('Error triggering score update:', error);
    }
  }

  /**
   * Send notification to single user
   */
  private async sendSingleNotification(userId: string, notification: NotificationTriggerData): Promise<void> {
    try {
      await fetch('/api/trpc/notifications.push.sendPush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          actions: notification.actions,
          icon: notification.icon,
          tag: notification.tag,
          requireInteraction: notification.requireInteraction
        })
      });
    } catch (error) {
      console.error('Error sending single notification:', error);
    }
  }

  /**
   * Send notification to multiple users
   */
  private async sendBulkNotification(userIds: string[], notification: NotificationTriggerData): Promise<void> {
    try {
      await fetch('/api/trpc/notifications.push.sendBulkPush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          actions: notification.actions,
          icon: notification.icon,
          tag: notification.tag
        })
      });
    } catch (error) {
      console.error('Error sending bulk notification:', error);
    }
  }

  /**
   * Helper: Get match details
   */
  private async getMatchDetails(matchId: string): Promise<any> {
    try {
      const response = await fetch(`/api/trpc/matches.getById?input=${encodeURIComponent(JSON.stringify({ id: matchId }))}`);
      const data = await response.json();
      return data.result?.data;
    } catch (error) {
      console.error('Error getting match details:', error);
      return null;
    }
  }

  /**
   * Helper: Get team details
   */
  private async getTeamDetails(teamId: string): Promise<any> {
    try {
      const response = await fetch(`/api/trpc/teams.getById?input=${encodeURIComponent(JSON.stringify({ id: teamId }))}`);
      const data = await response.json();
      return data.result?.data;
    } catch (error) {
      console.error('Error getting team details:', error);
      return null;
    }
  }

  /**
   * Helper: Get venue details
   */
  private async getVenueDetails(venueId: string): Promise<any> {
    try {
      const response = await fetch(`/api/trpc/venues.getById?input=${encodeURIComponent(JSON.stringify({ id: venueId }))}`);
      const data = await response.json();
      return data.result?.data;
    } catch (error) {
      console.error('Error getting venue details:', error);
      return null;
    }
  }

  /**
   * Helper: Get match participants (team members)
   */
  private async getMatchParticipants(matchId: string): Promise<string[]> {
    // This would need to be implemented based on your data structure
    // Return array of user IDs who should receive match notifications
    return [];
  }

  /**
   * Helper: Get team members
   */
  private async getTeamMembers(teamId: string): Promise<string[]> {
    // This would need to be implemented based on your data structure
    // Return array of user IDs who are team members
    return [];
  }

  /**
   * Helper: Get venue participants
   */
  private async getVenueParticipants(venueId: string): Promise<string[]> {
    // This would need to be implemented based on your data structure
    // Return array of user IDs who are at this venue
    return [];
  }
}

// Global instance
export const notificationTriggers = new NotificationTriggers();
