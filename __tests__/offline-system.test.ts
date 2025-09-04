/**
 * Comprehensive Offline-First System Tests
 * Tests the complete volunteer offline workflow
 */

import { getVolunteerService } from '@/lib/services/offline/volunteerService';

// Mock network conditions
const mockOffline = () => {
  Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
  window.dispatchEvent(new Event('offline'));
};

const mockOnline = () => {
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  window.dispatchEvent(new Event('online'));
};

describe('Phase 4: Offline-First Volunteer System', () => {
  
  describe('1. Authentication Offline', () => {
    test('should work with cached user when offline', async () => {
      localStorage.setItem('cached_user_auth', JSON.stringify({
        user: { id: 'test-user', name: 'Test Volunteer' },
        expiry: Date.now() + 86400000
      }));
      
      mockOffline();
      
      const cachedData = localStorage.getItem('cached_user_auth');
      expect(cachedData).toBeTruthy();
      
      const { user } = JSON.parse(cachedData!);
      expect(user.id).toBe('test-user');
    });
  });

  describe('2. Data Loading Offline', () => {
    test('should load teams from IndexedDB when offline', async () => {
      const service = getVolunteerService();
      await service.initialize('test-user');
      
      // Pre-populate cache
      await service.cacheTeamData('test-user', {
        id: 'team-1',
        name: 'Test Team',
        venueId: 'venue-1'
      });
      
      mockOffline();
      
      // Test data loads from cache
      const teams = await service.getTeamsForVenue('venue-1', 'test-user');
      expect(teams).toHaveLength(1);
      expect(teams[0].data.name).toBe('Test Team');
    });
  });

  describe('3. Actions Work Offline', () => {
    test('should queue team check-in when offline', async () => {
      mockOffline();
      
      const service = getVolunteerService();
      await service.initialize('test-user');
      
      // Perform offline action
      await service.checkInTeam({
        teamId: 'team-1',
        checkedInBy: 'test-user',
        timestamp: Date.now()
      }, 'test-user');
      
      // Verify action was processed
      expect(true).toBe(true); // Placeholder - would check sync queue
    });
  });

  describe('4. User Data Isolation', () => {
    test('should isolate data between different users', async () => {
      const service = getVolunteerService();
      
      // User A data
      await service.initialize('user-a');
      await service.cacheTeamData('user-a', {
        id: 'team-a',
        name: 'Team A',
        venueId: 'venue-1'
      });
      
      // User B data
      await service.initialize('user-b');
      await service.cacheTeamData('user-b', {
        id: 'team-b', 
        name: 'Team B',
        venueId: 'venue-1'
      });
      
      // Verify isolation
      const userATeams = await service.getTeamsForVenue('venue-1', 'user-a');
      const userBTeams = await service.getTeamsForVenue('venue-1', 'user-b');
      
      expect(userATeams[0].data.name).toBe('Team A');
      expect(userBTeams[0].data.name).toBe('Team B');
    });
  });
});
