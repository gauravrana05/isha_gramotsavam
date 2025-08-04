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
        where('isActive', '==', true),
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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

      await updateDoc(sportRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(`Error updating sport ${sportId}:`, error);
      throw new Error(`Failed to update sport: ${sportId}`);
    }
  }

  /**
   * Delete a sport (soft delete by setting isActive to false)
   */
  async deleteSport(sportId: string): Promise<void> {
    try {
      await this.updateSport(sportId, { 
        isActive: false
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
        maxPlayers: sport.maxPlayers,
        maxSubstitutes: sport.maxSubstitutes,
        genderCategory: sport.genderCategories?.[0] || 'mixed'
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
        // Check if sport allows the user's gender
        return sport.genderCategories.includes(gender === 'M' ? 'men' : 'women');

      });
    } catch (error) {
      console.error(`Error fetching sports for gender ${gender}:`, error);
      throw new Error('Failed to fetch sports by gender');
    }
  }

  /**
   * Check if a user is eligible for a sport
   */
  async checkEligibility(sportId: string, userAge: number, userGender: string): Promise<{
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
      const userGenderCategory = userGender === 'M' ? 'men' : 'women';
      if (!sport.genderCategories.includes(userGenderCategory)) {
        reasons.push(`This sport is only available for: ${sport.genderCategories.join(', ')}`);
      }

      // Check age eligibility
      if (userAge < sport.minAge) {
        reasons.push(`Minimum age requirement: ${sport.minAge} years`);
      }
      if (sport.maxAge && userAge > sport.maxAge) {
        reasons.push(`Maximum age limit: ${sport.maxAge} years`);
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
   * Get sport configuration for team creation
   */
  async getSportConfig(sportId: string): Promise<{
    maxPlayers: number;
    maxSubstitutes: number;
    genderCategories: string[];
  } | null> {
    try {
      const sport = await this.getSportById(sportId);
      if (!sport) {
        return null;
      }

      return {
        maxPlayers: sport.maxPlayers,
        maxSubstitutes: sport.maxSubstitutes,
        genderCategories: sport.genderCategories
      };
    } catch (error) {
      console.error(`Error getting sport config for ${sportId}:`, error);
      return null;
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
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
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
   * Get default sports data based on the new schema
   */
  private getDefaultSportsData(): Omit<Sport, 'sportId' | 'createdAt' | 'updatedAt'>[] {
    return [
      {
        name: 'Volleyball',
        displayName: 'Volleyball',
        description: 'Traditional volleyball tournament following international rules',
        category: 'team',
        genderCategories: ['men', 'women'],
        
        // Team Requirements
        minPlayers: 6,
        maxPlayers: 6,
        minSubstitutes: 1,
        maxSubstitutes: 6,
        
        // Age Restrictions
        minAge: 16,
        maxAge: 100,
        maxPlayersUnder21: 3,
        allowPET: true,
        
        // Geographic Restrictions
        restrictedToStates: [],
        
        // Scoring System
        scoringSystem: {
          pointsToWin: 25,
          setsToWin: 3,
          timeLimit: 90,
          customRules: [
            'Must win by 2 points',
            'Maximum 2 timeouts per team per set',
            'Maximum 6 substitutions per set'
          ]
        },
        
        // Media & Assets
        iconURL: '',
        bannerImageURL: '',
        rulesPDF: '',
        
        // Availability
        isActive: true,
        availableInEvents: ['gramotsavam_2025']
      },
      
      {
        name: 'Throwball',
        displayName: 'Throwball',
        description: 'Traditional 7-a-side throwball for women - authentic rural sport',
        category: 'team',
        genderCategories: ['women'],
        
        // Team Requirements
        minPlayers: 7,
        maxPlayers: 7,
        minSubstitutes: 1,
        maxSubstitutes: 6,
        
        // Age Restrictions
        minAge: 16,
        maxAge: 100,
        maxPlayersUnder21: 3,
        allowPET: true,
        
        // Geographic Restrictions
        restrictedToStates: [],
        
        // Scoring System
        scoringSystem: {
          pointsToWin: 15,
          setsToWin: 2,
          timeLimit: 60,
          customRules: [
            'Must win by 2 points',
            'Maximum 1 timeout per team per set',
            'Maximum 3 substitutions per set',
            'No serving from the net line'
          ]
        },
        
        // Media & Assets
        iconURL: '',
        bannerImageURL: '',
        rulesPDF: '',
        
        // Availability
        isActive: true,
        availableInEvents: ['gramotsavam_2025']
      }
    ];
  }
}

// Export singleton instance
export const sportsService = new SportsService();
export default sportsService;