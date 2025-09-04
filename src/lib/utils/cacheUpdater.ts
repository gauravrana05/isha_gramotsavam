/**
 * Utility for updating offline cache from TRPC routers
 */

import { VolunteerService } from '@/lib/services/offline/volunteerService';

/**
 * Update offline cache after successful API queries
 */
export async function updateOfflineCache(
  userId: string, 
  data: any, 
  type: 'venue' | 'team' | 'match' | 'player' | 'assignment'
): Promise<void> {
  try {
    // Validate data
    if (!data || !data.id || !userId) {
      return;
    }
    
    // Get service instance
    const volunteerService = await VolunteerService.getServiceForBackend();
    await volunteerService.initialize(userId);
    
    // Cache based on type
    switch (type) {
      case 'venue':
        await volunteerService.cacheVenueData(userId, data);
        break;
      case 'team':
        await volunteerService.cacheTeamData(userId, data);
        // Cache players if included
        if (data.players) {
          for (const player of data.players) {
            await volunteerService.cachePlayerData(userId, player);
          }
        }
        break;
      case 'match':
        await volunteerService.cacheMatchData(userId, data);
        break;
      case 'player':
        await volunteerService.cachePlayerData(userId, data);
        break;
    }
    
  } catch (error) {
    console.warn(`Failed to update offline cache for ${type}:`, error);
    // Don't fail the request if cache update fails
  }
}

/**
 * Batch cache update for arrays of data
 */
export async function batchUpdateCache(
  userId: string,
  dataArray: any[],
  type: 'venue' | 'team' | 'match' | 'player'
): Promise<void> {
  try {
    if (!dataArray?.length || !userId) return;
    
    // Skip cache update on server-side
    if (typeof window === 'undefined') {
      console.log('⏭️ Skipping cache update on server-side');
      return;
    }
    
    const volunteerService = await VolunteerService.getServiceForBackend();
    await volunteerService.initialize(userId);
    
    for (const item of dataArray) {
      await updateOfflineCache(userId, item, type);
    }
    
    console.log(`✅ Batch cached ${dataArray.length} ${type} items`);
    
  } catch (error) {
    console.warn(`Failed to batch update cache for ${type}:`, error);
  }
}
