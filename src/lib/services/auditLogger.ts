import { db } from '@/lib/db';

interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  static async log(entry: Omit<AuditLogEntry, 'timestamp'>) {
    try {
      await db.auditLog.create({
        data: {
          ...entry,
          timestamp: new Date(),
        }
      });
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      // Don't throw - audit logging shouldn't break main functionality
    }
  }

  static async logAdminAction(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>
  ) {
    await this.log({
      userId,
      action: `ADMIN_${action}`,
      resource,
      resourceId,
      details
    });
  }

  static async logVolunteerAction(
    userId: string,
    action: string,
    resource: string,
    venueId?: string,
    details?: Record<string, any>
  ) {
    await this.log({
      userId,
      action: `VOLUNTEER_${action}`,
      resource,
      resourceId: venueId,
      details
    });
  }

  static async logPlayerAction(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>
  ) {
    await this.log({
      userId,
      action: `PLAYER_${action}`,
      resource,
      resourceId,
      details
    });
  }
}
