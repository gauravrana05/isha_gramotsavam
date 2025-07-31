// src/lib/services/sportsService.ts

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  Sport, 
  SportSeason, 
  CreateSportData, 
  UpdateSportData, 
  LegacySportConfig 
} from '@/lib/types/sports';

class SportsService {
  private readonly COLLECTION_NAME = 'sports';

  /**
   * Get all active sports
   */
  async getAllActiveSports(): Promise<Sport[]> {
    try {
      const sportsQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('status', '==', 'active'),
        orderBy('name', 'asc')
      );
      
      const snapshot = await getDocs(sportsQuery);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        sportId: doc.id
      })) as Sport[];
    } catch (error) {
      console.error('Error fetching active sports:', error);
      throw new Error('Failed to fetch sports');
    }
  }

  /**
   * Get all sports (including inactive)
   */
  async getAllSports(): Promise<Sport[]> {
    try {
      const sportsQuery = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('name', 'asc')
      );
      
      const snapshot = await getDocs(sportsQuery);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        sportId: doc.id
      })) as Sport[];
    } catch (error) {
      console.error('Error fetching all sports:', error);
      throw new Error('Failed to fetch sports');
    }
  }

  /**
   * Get a specific sport by ID
   */
  async getSportById(sportId: string): Promise<Sport | null> {
    try {
      const sportDoc = await getDoc(doc(db, this.COLLECTION_NAME, sportId));
      
      if (!sportDoc.exists()) {
        return null;
      }

      return {
        ...sportDoc.data(),
        sportId: sportDoc.id
      } as Sport;
    } catch (error) {
      console.error(`Error fetching sport ${sportId}:`, error);
      throw new Error(`Failed to fetch sport: ${sportId}`);
    }
  }

  /**
   * Create a new sport
   */
  async createSport(sportData: CreateSportData, createdBy: string): Promise<string> {
    try {
      const docData = {
        ...sportData,
        createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), docData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating sport:', error);
      throw new Error('Failed to create sport');
    }
  }

  /**
   * Update an existing sport
   */
  async updateSport(sportId: string, updateData: UpdateSportData): Promise<void> {
    try {
      const sportRef = doc(db, this.COLLECTION_NAME, sportId);
      
      // Get current version for optimistic locking
      const currentDoc = await getDoc(sportRef);
      if (!currentDoc.exists()) {
        throw new Error('Sport not found');
      }

      const currentVersion = currentDoc.data().version || 1;

      await updateDoc(sportRef, {
        ...updateData,
        updatedAt: new Date().toISOString(),
        version: currentVersion + 1
      });
    } catch (error) {
      console.error(`Error updating sport ${sportId}:`, error);
      throw new Error(`Failed to update sport: ${sportId}`);
    }
  }

  /**
   * Delete a sport (soft delete by setting status to inactive)
   */
  async deleteSport(sportId: string): Promise<void> {
    try {
      await this.updateSport(sportId, { 
        status: 'inactive',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error deleting sport ${sportId}:`, error);
      throw new Error(`Failed to delete sport: ${sportId}`);
    }
  }

  /**
   * Get legacy sport config for backward compatibility
   */
  async getLegacySportConfig(sportId: string): Promise<LegacySportConfig | null> {
    try {
      const sport = await this.getSportById(sportId);
      if (!sport) {
        return null;
      }

      return {
        maxPlayers: sport.teamConfig.maxPlayers,
        maxSubstitutes: sport.teamConfig.maxSubstitutes,
        genderCategory: sport.category === 'women' ? 'women' : 
                       sport.category === 'men' ? 'men' : 'mixed'
      };
    } catch (error) {
      console.error(`Error getting legacy config for ${sportId}:`, error);
      return null;
    }
  }

  /**
   * Get sports suitable for a specific gender
   */
  async getSportsByGender(gender: 'M' | 'F'): Promise<Sport[]> {
    try {
      const allSports = await this.getAllActiveSports();
      
      return allSports.filter(sport => {
        if (sport.eligibility.genderRestriction === 'any') return true;
        if (sport.eligibility.genderRestriction === 'male' && gender === 'M') return true;
        if (sport.eligibility.genderRestriction === 'female' && gender === 'F') return true;
        return false;
      });
    } catch (error) {
      console.error(`Error fetching sports for gender ${gender}:`, error);
      throw new Error('Failed to fetch sports by gender');
    }
  }

  /**
   * Check if a user is eligible for a sport
   */
  async checkEligibility(sportId: string, userAge: number, userGender: 'M' | 'F'): Promise<{
    eligible: boolean;
    reasons: string[];
  }> {
    try {
      const sport = await this.getSportById(sportId);
      if (!sport) {
        return { eligible: false, reasons: ['Sport not found'] };
      }

      const reasons: string[] = [];

      // Check gender eligibility
      if (sport.eligibility.genderRestriction === 'male' && userGender !== 'M') {
        reasons.push('This sport is only available for men');
      }
      if (sport.eligibility.genderRestriction === 'female' && userGender !== 'F') {
        reasons.push('This sport is only available for women');
      }

      // Check age eligibility
      if (userAge < sport.eligibility.minAge) {
        reasons.push(`Minimum age requirement: ${sport.eligibility.minAge} years`);
      }
      if (userAge > sport.eligibility.maxAge) {
        reasons.push(`Maximum age limit: ${sport.eligibility.maxAge} years`);
      }

      return {
        eligible: reasons.length === 0,
        reasons
      };
    } catch (error) {
      console.error(`Error checking eligibility for ${sportId}:`, error);
      return { eligible: false, reasons: ['Error checking eligibility'] };
    }
  }

  /**
   * Initialize default sports data (run once during setup)
   */
  async initializeDefaultSports(): Promise<void> {
    try {
      const batch = writeBatch(db);
      const defaultSports = this.getDefaultSportsData();

      for (const sport of defaultSports) {
        const sportRef = doc(collection(db, this.COLLECTION_NAME));
        batch.set(sportRef, {
          ...sport,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          createdBy: 'system'
        });
      }

      await batch.commit();
      console.log('Default sports initialized successfully');
    } catch (error) {
      console.error('Error initializing default sports:', error);
      throw new Error('Failed to initialize default sports');
    }
  }

  /**
   * Get default sports data based on current hardcoded configuration
   */
  private getDefaultSportsData(): Omit<Sport, 'createdAt' | 'updatedAt' | 'version' | 'createdBy'>[] {
    return [
      {
        sportId: 'volleyball',
        name: 'Volleyball',
        displayName: "Men's Volleyball Championship",
        description: 'Traditional volleyball tournament following international rules for men\'s teams',
        category: 'men',
        status: 'active',
        
        teamConfig: {
          minPlayers: 6,
          maxPlayers: 6,
          maxSubstitutes: 6,
          totalTeamSize: 12
        },
        
        eligibility: {
          genderRestriction: 'male',
          minAge: 18,
          maxAge: 45,
          requireSamePanchayat: true,
          customRules: [
            'All players must be from the same panchayat',
            'Valid Aadhaar card required for all players',
            'Team captain must be a registered player'
          ]
        },
        
        eventInfo: {
          registrationStart: '2025-01-01T00:00:00Z',
          registrationEnd: '2025-02-15T23:59:59Z',
          eventStart: '2025-03-01T09:00:00Z',
          eventEnd: '2025-03-07T18:00:00Z',
          venue: 'Isha Yoga Center Sports Complex',
          prizePool: {
            first: 300000,
            second: 200000, 
            third: 100000,
            currency: 'INR'
          }
        },
        
        assets: {
          primaryImage: '/images/sports/volleyball_1.jpg',
          thumbnailImage: '/images/sports/volleyball_1.jpg',
          galleryImages: [
            '/images/sports/volleyball_1.jpg',
            '/images/sports/volleyball_2.jpg'
          ],
          rulesDocument: '/documents/volleyball_rules_2025.pdf'
        }
      },
      
      {
        sportId: 'throwball',
        name: 'Throwball',
        displayName: "Women's Throwball Championship", 
        description: 'Traditional throwball tournament following standard rules for women\'s teams',
        category: 'women',
        status: 'active',
        
        teamConfig: {
          minPlayers: 7,
          maxPlayers: 7,
          maxSubstitutes: 2,
          totalTeamSize: 9
        },
        
        eligibility: {
          genderRestriction: 'female',
          minAge: 18,
          maxAge: 40,
          requireSamePanchayat: true,
          customRules: [
            'All players must be women',
            'All players must be from the same panchayat',
            'Valid Aadhaar card required for all players',
            'Team captain must be a registered player'
          ]
        },
        
        eventInfo: {
          registrationStart: '2025-01-01T00:00:00Z',
          registrationEnd: '2025-02-15T23:59:59Z',
          eventStart: '2025-03-01T09:00:00Z',
          eventEnd: '2025-03-07T18:00:00Z',
          venue: 'Isha Yoga Center Sports Complex',
          prizePool: {
            first: 300000,
            second: 200000,
            third: 100000,
            currency: 'INR'
          }
        },
        
        assets: {
          primaryImage: '/images/sports/throwball_1.jpg',
          thumbnailImage: '/images/sports/throwball_1.jpg',
          galleryImages: [
            '/images/sports/throwball_1.jpg',
            '/images/sports/mobile_throwball_3.png',
            '/images/sports/web_throwball_3.png'
          ],
          rulesDocument: '/documents/throwball_rules_2025.pdf'
        }
      }
    ];
  }
}

// Export singleton instance
export const sportsService = new SportsService();
export default sportsService;