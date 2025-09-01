import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

const PAGE_TITLES: Record<string, string> = {
  // Admin routes
  '/admin/dashboard': 'Admin Dashboard',
  '/admin/users': 'User Management',
  '/admin/teams': 'Team Management',
  '/admin/venues': 'Venue Management',
  '/admin/notifications': 'Notifications',
  '/admin/notifications/create': 'Create Notification',
  '/admin/notifications/templates': 'Notification Templates',
  '/admin/matches': 'Match Management',
  '/admin/sports': 'Sports Management',
  '/admin/venue-mappings': 'Venue Mappings',
  '/admin/venue-mappings/create': 'Create Venue Mapping',
  '/admin/audit-logs': 'Audit Logs',
  '/admin/chat': 'Admin Chat',
  '/admin/profile': 'Profile',
  
  // Captain routes
  '/captain/dashboard': 'Captain Dashboard',
  '/captain/teams': 'My Team',
  '/captain/fixtures': 'Fixtures',
  '/captain/matches': 'Matches',
  '/captain/profile': 'Profile',
  
  // Player routes
  '/player/dashboard': 'Player Dashboard',
  '/player/teams': 'My Teams',
  '/player/matches': 'Matches',
  '/player/fixtures': 'Fixtures',
  '/player/profile': 'Profile',
  
  // Volunteer routes
  '/volunteer/dashboard': 'Volunteer Dashboard',
  '/volunteer/venues': 'My Venues',
  '/volunteer/verification': 'Verification',
  
  // Verification routes
  '/verification/dashboard': 'Verification Dashboard',
  '/verification/teams': 'Team Verification',
  '/verification/players': 'Player Verification',
  
  // Profile routes
  '/profile': 'Profile',
  '/profile/complete': 'Complete Profile',
};

export const usePageTitle = (customTitle?: string): string => {
  const pathname = usePathname();
  
  return useMemo(() => {
    if (customTitle) return customTitle;
    
    // Remove language prefix and get base path
    const pathParts = pathname.split('/').filter(part => part.length > 0);
    
    // Skip language part (first segment)
    const relevantParts = pathParts.slice(1);
    const basePath = '/' + relevantParts.join('/');
    
    // Try exact match first
    if (PAGE_TITLES[basePath]) {
      return PAGE_TITLES[basePath];
    }
    
    // Try parent paths for dynamic routes
    for (let i = relevantParts.length - 1; i > 0; i--) {
      const parentPath = '/' + relevantParts.slice(0, i).join('/');
      if (PAGE_TITLES[parentPath]) {
        return PAGE_TITLES[parentPath];
      }
    }
    
    // Special handling for dynamic IDs
    if (relevantParts.length >= 2) {
      const role = relevantParts[0];
      const section = relevantParts[1];
      
      // Handle [id] patterns
      if (section === 'teams' && relevantParts.length > 2) {
        return 'Team Details';
      }
      if (section === 'users' && relevantParts.length > 2) {
        return 'User Details';
      }
      if (section === 'venues' && relevantParts.length > 2) {
        return 'Venue Details';
      }
      if (section === 'matches' && relevantParts.length > 2) {
        return 'Match Details';
      }
      if (section === 'fixtures' && relevantParts.length > 2) {
        return 'Fixture Details';
      }
      if (section === 'notifications' && relevantParts.length > 2) {
        return 'Notification Details';
      }
    }
    
    // Default fallback based on role
    if (relevantParts.length > 0) {
      const role = relevantParts[0];
      const roleNames: Record<string, string> = {
        admin: 'Admin',
        captain: 'Captain',
        player: 'Player',
        volunteer: 'Volunteer',
        verification: 'Verification'
      };
      
      return roleNames[role] ? `${roleNames[role]} Dashboard` : 'Dashboard';
    }
    
    return 'Dashboard';
  }, [pathname, customTitle]);
};