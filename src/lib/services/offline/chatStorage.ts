/**
 * Chat-specific IndexedDB storage
 * Handles venue chat messages, participants, send/receive queue
 * Real-time sync capabilities for mobile chat
 */

export interface ChatDocument {
  id: string;
  data: any;
  timestamp: number;
  lastModified: number;
  venueId?: string;
  userId?: string;
  version: number;
  synced: boolean;
  deleted?: boolean;
  priority: 'high' | 'medium' | 'low';
  size: number;
}

export interface ChatMessageRecord extends ChatDocument {
  data: {
    id: string;
    venueId: string;
    senderId: string;
    senderName: string;
    senderRole: 'captain' | 'player' | 'volunteer';
    content: string;
    type: 'text' | 'image' | 'system';
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    createdAt: string;
    editedAt?: string;
    replyToId?: string;
  };
}

export interface ChatParticipantRecord extends ChatDocument {
  data: {
    id: string;
    venueId: string;
    userId: string;
    userName: string;
    role: 'captain' | 'player' | 'volunteer';
    isOnline: boolean;
    lastSeen: string;
    joinedAt: string;
  };
}

export interface ChatSendQueue {
  id: string;
  venueId: string;
  tempId: string;
  content: string;
  type: 'text' | 'image';
  mediaFile?: File;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'sending' | 'failed';
}

const CHAT_DB_CONFIG = {
  name: 'ChatOfflineDB',
  version: 1,
  stores: [
    {
      name: 'messages',
      keyPath: 'id',
      indexes: [
        { name: 'venueId', keyPath: 'data.venueId' },
        { name: 'senderId', keyPath: 'data.senderId' },
        { name: 'createdAt', keyPath: 'data.createdAt' },
        { name: 'type', keyPath: 'data.type' }
      ]
    },
    {
      name: 'participants',
      keyPath: 'id',
      indexes: [
        { name: 'venueId', keyPath: 'data.venueId' },
        { name: 'userId', keyPath: 'data.userId' },
        { name: 'role', keyPath: 'data.role' },
        { name: 'isOnline', keyPath: 'data.isOnline' }
      ]
    },
    {
      name: 'sendQueue',
      keyPath: 'id',
      indexes: [
        { name: 'venueId', keyPath: 'venueId' },
        { name: 'status', keyPath: 'status' },
        { name: 'timestamp', keyPath: 'timestamp' }
      ]
    },
    {
      name: 'typingIndicators',
      keyPath: 'id',
      indexes: [
        { name: 'venueId', keyPath: 'venueId' },
        { name: 'userId', keyPath: 'userId' }
      ]
    }
  ]
};

class ChatStorageManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CHAT_DB_CONFIG.name, CHAT_DB_CONFIG.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        CHAT_DB_CONFIG.stores.forEach(storeConfig => {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const store = db.createObjectStore(storeConfig.name, { keyPath: storeConfig.keyPath });
            
            storeConfig.indexes?.forEach(indexConfig => {
              store.createIndex(indexConfig.name, indexConfig.keyPath, indexConfig.options);
            });
          }
        });
      };
    });
  }

  async putMessage(message: ChatMessageRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const request = store.put(message);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getVenueMessages(venueId: string, limit?: number): Promise<ChatMessageRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('venueId');
      const request = index.getAll(venueId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const messages = (request.result || [])
          .sort((a: ChatMessageRecord, b: ChatMessageRecord) => 
            new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
          );
        
        resolve(limit ? messages.slice(0, limit) : messages);
      };
    });
  }

  async getVenueParticipants(venueId: string): Promise<ChatParticipantRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['participants'], 'readonly');
      const store = transaction.objectStore('participants');
      const index = store.index('venueId');
      const request = index.getAll(venueId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async addToSendQueue(message: ChatSendQueue): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sendQueue'], 'readwrite');
      const store = transaction.objectStore('sendQueue');
      const request = store.put(message);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getPendingSendQueue(): Promise<ChatSendQueue[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sendQueue'], 'readonly');
      const store = transaction.objectStore('sendQueue');
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async updateSendQueueStatus(messageId: string, status: 'sending' | 'failed', retryCount?: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sendQueue'], 'readwrite');
      const store = transaction.objectStore('sendQueue');
      const getRequest = store.get(messageId);

      getRequest.onsuccess = () => {
        const message = getRequest.result;
        if (message) {
          message.status = status;
          if (retryCount !== undefined) {
            message.retryCount = retryCount;
          }
          
          const putRequest = store.put(message);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async removeSentMessage(messageId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sendQueue'], 'readwrite');
      const store = transaction.objectStore('sendQueue');
      const request = store.delete(messageId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async setTypingIndicator(venueId: string, userId: string, isTyping: boolean): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const indicatorId = `${venueId}_${userId}`;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['typingIndicators'], 'readwrite');
      const store = transaction.objectStore('typingIndicators');
      
      if (isTyping) {
        const indicator = {
          id: indicatorId,
          venueId,
          userId,
          timestamp: Date.now()
        };
        const request = store.put(indicator);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } else {
        const request = store.delete(indicatorId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }
    });
  }

  async getTypingUsers(venueId: string): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['typingIndicators'], 'readonly');
      const store = transaction.objectStore('typingIndicators');
      const index = store.index('venueId');
      const request = index.getAll(venueId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const indicators = request.result || [];
        const recentIndicators = indicators.filter((indicator: any) => 
          Date.now() - indicator.timestamp < 5000 // 5 seconds
        );
        resolve(recentIndicators.map((indicator: any) => indicator.userId));
      };
    });
  }
}

// Global storage instance
let chatStorageInstance: ChatStorageManager | null = null;

export async function getChatStorage(): Promise<ChatStorageManager> {
  if (!chatStorageInstance) {
    chatStorageInstance = new ChatStorageManager();
    await chatStorageInstance.init();
  }
  
  return chatStorageInstance;
}
