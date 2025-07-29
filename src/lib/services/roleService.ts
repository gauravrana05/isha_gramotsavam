import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';

export type UserRole = 'public' | 'player' | 'captain' | 'verification_volunteer' | 'admin';

export interface EventRoleData {
  roleId: string;
  userId: string;
  role: UserRole;
  eventId: string;
  eventName: string;
  teamId?: string;
  roleStartDate: any; // Firebase Timestamp
  roleEndDate: any; // Firebase Timestamp
  isActive: boolean;
  autoExpire: boolean;
  assignedBy: string;
  assignedAt: any; // Firebase Timestamp
  permissions: string[];
  metadata?: { [key: string]: any };
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
}

export interface RoleServiceResult {
  success: boolean;
  roleId?: string;
  role?: UserRole;
  error?: string;
  message?: string;
}

class RoleService {
  // Assign a role to a user for a specific event
  async assignEventRole(
    userId: string, 
    role: UserRole, 
    eventId: string, 
    teamId?: string,
    metadata?: { [key: string]: any }
  ): Promise<RoleServiceResult> {
    try {
      const assignRoleFunction = httpsCallable(functions, 'assignEventRole');
      const result = await assignRoleFunction({
        userId,
        role,
        eventId,
        teamId,
        assignedBy: 'system',
        metadata
      });

      if (result.data && typeof result.data === 'object') {
        const data = result.data as any;
        return {
          success: data.success || false,
          roleId: data.roleId,
          message: data.message
        };
      }

      return { success: false, error: 'Invalid response from role assignment' };
    } catch (error: any) {
      console.error('Error assigning event role:', error);
      return {
        success: false,
        error: error.message || 'Failed to assign role'
      };
    }
  }

  // Promote user to player
  async promoteToPlayer(userId: string, teamId: string, eventId: string): Promise<RoleServiceResult> {
    try {
      const promoteFunction = httpsCallable(functions, 'promoteToPlayer');
      const result = await promoteFunction({
        userId,
        teamId,
        eventId
      });

      if (result.data && typeof result.data === 'object') {
        const data = result.data as any;
        return {
          success: data.success || false,
          message: data.message
        };
      }

      return { success: false, error: 'Invalid response from player promotion' };
    } catch (error: any) {
      console.error('Error promoting to player:', error);
      return {
        success: false,
        error: error.message || 'Failed to promote to player'
      };
    }
  }

  // Promote user to team captain
  async promoteToTeamCaptain(teamId: string, eventId: string): Promise<RoleServiceResult> {
    try {
      const promoteFunction = httpsCallable(functions, 'promoteToTeamCaptain');
      const result = await promoteFunction({
        teamId,
        eventId
      });

      if (result.data && typeof result.data === 'object') {
        const data = result.data as any;
        return {
          success: data.success || false,
          roleId: data.roleId,
          message: data.message
        };
      }

      return { success: false, error: 'Invalid response from captain promotion' };
    } catch (error: any) {
      console.error('Error promoting to team captain:', error);
      return {
        success: false,
        error: error.message || 'Failed to promote to captain'
      };
    }
  }

  // Get user's current role for an event
  async getCurrentEventRole(eventId: string, userId?: string): Promise<RoleServiceResult> {
    try {
      const getRoleFunction = httpsCallable(functions, 'getCurrentEventRole');
      const result = await getRoleFunction({
        eventId,
        userId
      });

      if (result.data && typeof result.data === 'object') {
        const data = result.data as any;
        return {
          success: data.success || false,
          role: data.role as UserRole
        };
      }

      return { success: false, error: 'Invalid response from get role' };
    } catch (error: any) {
      console.error('Error getting current event role:', error);
      return {
        success: false,
        error: error.message || 'Failed to get current role',
        role: 'public' // Default fallback
      };
    }
  }

  // Check if user has specific permission
  hasPermission(userRole: UserRole, permission: string): boolean {
    const rolePermissions: { [key in UserRole]: string[] } = {
      public: ["view_public_content"],
      player: ["view_public_content", "view_team", "update_profile", "view_matches"],
      captain: ["view_public_content", "view_team", "update_profile", "view_matches", "manage_team", "add_players", "view_team_stats", "submit_team"],
      verification_volunteer: ["view_public_content", "verify_teams", "verify_players", "view_all_teams"],
      admin: ["view_public_content", "verify_teams", "verify_players", "view_all_teams", "manage_team", "add_players", "view_team_stats", "submit_team", "manage_all", "system_config", "user_management", "assign_roles"]
    };

    return rolePermissions[userRole]?.includes(permission) || false;
  }

  // Check if user can perform action
  canPerformAction(userRole: UserRole, action: string): boolean {
    const actionPermissionMap: { [key: string]: string } = {
      'create_team': 'view_public_content', // Anyone can create team (becomes captain)
      'manage_team': 'manage_team',
      'add_players': 'add_players',
      'verify_team': 'verify_teams',
      'verify_player': 'verify_players',
      'view_admin_panel': 'system_config',
      'assign_roles': 'assign_roles'
    };

    const requiredPermission = actionPermissionMap[action];
    return requiredPermission ? this.hasPermission(userRole, requiredPermission) : false;
  }

  // Get role display information
  getRoleDisplayInfo(role: UserRole): { name: string; description: string; color: string } {
    const roleInfo: { [key in UserRole]: { name: string; description: string; color: string } } = {
      public: {
        name: 'Public User',
        description: 'Can view public content and register for events',
        color: 'gray'
      },
      player: {
        name: 'Player',
        description: 'Team member participating in tournaments',
        color: 'blue'
      },
      captain: {
        name: 'Team Captain',
        description: 'Team leader with player management rights',
        color: 'green'
      },
      verification_volunteer: {
        name: 'Verification Volunteer',
        description: 'Volunteer with document verification rights',
        color: 'purple'
      },
      admin: {
        name: 'Administrator',
        description: 'Full system administration rights',
        color: 'red'
      }
    };

    return roleInfo[role];
  }

  // Expire roles (admin only)
  async expireEventRoles(): Promise<RoleServiceResult> {
    try {
      const expireFunction = httpsCallable(functions, 'expireEventRoles');
      const result = await expireFunction({});

      if (result.data && typeof result.data === 'object') {
        const data = result.data as any;
        return {
          success: data.success || false,
          message: data.message
        };
      }

      return { success: false, error: 'Invalid response from expire roles' };
    } catch (error: any) {
      console.error('Error expiring event roles:', error);
      return {
        success: false,
        error: error.message || 'Failed to expire roles'
      };
    }
  }
}

// Export singleton instance
export const roleService = new RoleService();
export default roleService;