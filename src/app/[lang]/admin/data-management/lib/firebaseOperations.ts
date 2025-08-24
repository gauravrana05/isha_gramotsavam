import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query,
  limit,
  orderBy,
  where,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface PaginationOptions {
  pageSize?: number;
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null;
}

export interface QueryOptions {
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  whereConditions?: Array<{
    field: string;
    operator: any;
    value: any;
  }>;
}

export interface CollectionStats {
  total: number;
  byStatus?: Record<string, number>;
  byType?: Record<string, number>;
}

export class FirebaseCollectionManager {
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  // Create single document
  async create(data: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        // Mark as test data
        isTestData: true,
        testDataCreatedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      // Error handling removed
      throw error;
    }
  }

  // Create multiple documents in batch
  async createBatch(documents: any[]): Promise<string[]> {
    try {
      const batch = writeBatch(db);
      const docIds: string[] = [];
      
      documents.forEach((data) => {
        const docRef = doc(collection(db, this.collectionName));
        batch.set(docRef, {
          ...data,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          // Mark as test data
          isTestData: true,
          testDataCreatedAt: Timestamp.now()
        });
        docIds.push(docRef.id);
      });
      
      await batch.commit();
      return docIds;
    } catch (error) {
      // Error handling removed
      throw error;
    }
  }

  // Read single document
  async read(docId: string): Promise<any | null> {
    try {
      const docRef = doc(db, this.collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      // Error handling removed
      throw error;
    }
  }

  // Read multiple documents with pagination
  async readMany(
    options: QueryOptions & PaginationOptions = {}
  ): Promise<{
    documents: any[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
  }> {
    try {
      const {
        pageSize = 25,
        lastDoc = null,
        orderByField = 'createdAt',
        orderDirection = 'desc',
        whereConditions = []
      } = options;

      let q = query(collection(db, this.collectionName));

      // Add where conditions
      whereConditions.forEach(condition => {
        q = query(q, where(condition.field, condition.operator, condition.value));
      });

      // Add ordering
      q = query(q, orderBy(orderByField, orderDirection));

      // Add pagination
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
      
      q = query(q, limit(pageSize + 1)); // +1 to check if there are more docs

      const querySnapshot = await getDocs(q);
      const documents: any[] = [];
      const docs = querySnapshot.docs;

      // Process documents (exclude the extra one used for pagination check)
      const hasMore = docs.length > pageSize;
      const actualDocs = hasMore ? docs.slice(0, pageSize) : docs;

      actualDocs.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return {
        documents,
        lastDoc: actualDocs[actualDocs.length - 1] || null,
        hasMore
      };
    } catch (error) {
      // Error handling removed
      throw error;
    }
  }

  // Read all test data documents
  async readTestData(): Promise<any[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('isTestData', '==', true),
        orderBy('testDataCreatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const documents: any[] = [];

      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return documents;
    } catch (error) {
      // Error handling removed
      throw error;
    }
  }

  // Update document
  async update(docId: string, data: Partial<any>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      // Error handling removed
      throw error;
    }
  }

  // Delete single document
  async delete(docId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      // Error handling removed
      throw error;
    }
  }

  // Delete multiple documents in batch
  async deleteBatch(docIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      docIds.forEach((docId) => {
        const docRef = doc(db, this.collectionName, docId);
        batch.delete(docRef);
      });
      
      await batch.commit();
    } catch (error) {
      // Error handling removed
      throw error;
    }
  }

  // Delete all test data
  async deleteAllTestData(): Promise<number> {
    try {
      const testDocs = await this.readTestData();
      const docIds = testDocs.map(doc => doc.id);
      
      if (docIds.length > 0) {
        // Delete in batches of 500 (Firestore batch limit)
        const batchSize = 500;
        for (let i = 0; i < docIds.length; i += batchSize) {
          const batchIds = docIds.slice(i, i + batchSize);
          await this.deleteBatch(batchIds);
        }
      }
      
      return docIds.length;
    } catch (error) {
      // Error handling removed
      throw error;
    }
  }

  // Get collection statistics
  async getStats(): Promise<CollectionStats> {
    try {
      const allDocs = await getDocs(collection(db, this.collectionName));
      const total = allDocs.size;

      // Count by status if documents have status field
      const byStatus: Record<string, number> = {};
      const byType: Record<string, number> = {};

      allDocs.forEach((doc) => {
        const data = doc.data();
        
        // Count by status
        if (data.status) {
          byStatus[data.status] = (byStatus[data.status] || 0) + 1;
        }
        
        // Count by type/role
        if (data.role) {
          byType[data.role] = (byType[data.role] || 0) + 1;
        } else if (data.type) {
          byType[data.type] = (byType[data.type] || 0) + 1;
        }
      });

      return {
        total,
        byStatus: Object.keys(byStatus).length > 0 ? byStatus : undefined,
        byType: Object.keys(byType).length > 0 ? byType : undefined
      };
    } catch (error) {
      // Error handling removed
      throw error;
    }
  }
}

// Pre-configured collection managers
export const collectionManagers = {
  users: new FirebaseCollectionManager('users'),
  teams: new FirebaseCollectionManager('teams'),
  events: new FirebaseCollectionManager('events'),
  sports: new FirebaseCollectionManager('sports'),
  venues: new FirebaseCollectionManager('venues'),
  matches: new FirebaseCollectionManager('matches'),
  fixtures: new FirebaseCollectionManager('fixtures'),
  media: new FirebaseCollectionManager('media'),
  notifications: new FirebaseCollectionManager('notifications'),
  systemConfig: new FirebaseCollectionManager('systemConfig'),
  auditLog: new FirebaseCollectionManager('auditLog')
};

// Utility functions
export const firebaseUtils = {
  // Create audit log entry
  async createAuditLog(action: string, collection: string, details: any) {
    try {
      await collectionManagers.auditLog.create({
        action,
        collection,
        details,
        timestamp: Timestamp.now(),
        source: 'admin_data_management'
      });
    } catch (error) {
      // Error handling removed
    }
  },

  // Validate document structure
  validateDocument(data: any, requiredFields: string[]): string[] {
    const errors: string[] = [];
    
    requiredFields.forEach(field => {
      if (!data.hasOwnProperty(field) || data[field] === null || data[field] === undefined) {
        errors.push(`Missing required field: ${field}`);
      }
    });
    
    return errors;
  },

  // Clean test data from all collections
  async cleanAllTestData(): Promise<Record<string, number>> {
    const results: Record<string, number> = {};
    
    for (const [name, manager] of Object.entries(collectionManagers)) {
      try {
        const deleted = await manager.deleteAllTestData();
        results[name] = deleted;
      } catch (error) {
        // Error handling removed
        results[name] = -1; // Indicate error
      }
    }
    
    return results;
  }
};