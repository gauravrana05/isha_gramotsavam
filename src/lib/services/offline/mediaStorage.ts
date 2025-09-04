/**
 * Media-specific IndexedDB storage
 * Handles venue media posts, image/video metadata
 * Content filtering by venue and approval status tracking
 */

export interface MediaDocument {
  id: string;
  data: any;
  timestamp: number;
  lastModified: number;
  venueId?: string;
  version: number;
  synced: boolean;
  deleted?: boolean;
  priority: 'high' | 'medium' | 'low';
  size: number;
}

export interface MediaItemRecord extends MediaDocument {
  data: {
    id: string;
    venueId: string;
    uploadedBy: string;
    uploaderName: string;
    uploaderRole: 'volunteer' | 'admin';
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    caption?: string;
    description?: string;
    tags?: string[];
    likes: number;
    comments: number;
    isLiked?: boolean;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: string;
    createdAt: string;
    metadata?: {
      width?: number;
      height?: number;
      duration?: number;
      fileSize?: number;
      mimeType?: string;
    };
  };
}

export interface MediaLikeRecord extends MediaDocument {
  data: {
    id: string;
    mediaId: string;
    userId: string;
    userName: string;
    createdAt: string;
  };
}

export interface MediaCommentRecord extends MediaDocument {
  data: {
    id: string;
    mediaId: string;
    userId: string;
    userName: string;
    userRole: 'captain' | 'player' | 'volunteer';
    content: string;
    createdAt: string;
    editedAt?: string;
  };
}

const MEDIA_DB_CONFIG = {
  name: 'MediaOfflineDB',
  version: 1,
  stores: [
    {
      name: 'mediaItems',
      keyPath: 'id',
      indexes: [
        { name: 'venueId', keyPath: 'data.venueId' },
        { name: 'type', keyPath: 'data.type' },
        { name: 'uploadedBy', keyPath: 'data.uploadedBy' },
        { name: 'approvalStatus', keyPath: 'data.approvalStatus' },
        { name: 'createdAt', keyPath: 'data.createdAt' }
      ]
    },
    {
      name: 'mediaLikes',
      keyPath: 'id',
      indexes: [
        { name: 'mediaId', keyPath: 'data.mediaId' },
        { name: 'userId', keyPath: 'data.userId' }
      ]
    },
    {
      name: 'mediaComments',
      keyPath: 'id',
      indexes: [
        { name: 'mediaId', keyPath: 'data.mediaId' },
        { name: 'userId', keyPath: 'data.userId' },
        { name: 'createdAt', keyPath: 'data.createdAt' }
      ]
    },
    {
      name: 'cachedMedia',
      keyPath: 'id',
      indexes: [
        { name: 'mediaId', keyPath: 'mediaId' },
        { name: 'timestamp', keyPath: 'timestamp' }
      ]
    }
  ]
};

class MediaStorageManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(MEDIA_DB_CONFIG.name, MEDIA_DB_CONFIG.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        MEDIA_DB_CONFIG.stores.forEach(storeConfig => {
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

  async putMediaItem(mediaItem: MediaItemRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mediaItems'], 'readwrite');
      const store = transaction.objectStore('mediaItems');
      const request = store.put(mediaItem);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getVenueMedia(venueId: string, type?: 'image' | 'video', limit?: number): Promise<MediaItemRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mediaItems'], 'readonly');
      const store = transaction.objectStore('mediaItems');
      const index = store.index('venueId');
      const request = index.getAll(venueId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let mediaItems = (request.result || [])
          .filter((item: MediaItemRecord) => item.data.approvalStatus === 'approved');

        if (type) {
          mediaItems = mediaItems.filter((item: MediaItemRecord) => item.data.type === type);
        }

        mediaItems.sort((a: MediaItemRecord, b: MediaItemRecord) => 
          new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
        );

        resolve(limit ? mediaItems.slice(0, limit) : mediaItems);
      };
    });
  }

  async getMediaItem(mediaId: string): Promise<MediaItemRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mediaItems'], 'readonly');
      const store = transaction.objectStore('mediaItems');
      const request = store.get(mediaId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async likeMedia(mediaId: string, userId: string, userName: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const likeId = `${mediaId}_${userId}`;
    const likeRecord: MediaLikeRecord = {
      id: likeId,
      data: {
        id: likeId,
        mediaId,
        userId,
        userName,
        createdAt: new Date().toISOString()
      },
      timestamp: Date.now(),
      lastModified: Date.now(),
      version: 1,
      synced: false,
      priority: 'low',
      size: JSON.stringify({ mediaId, userId }).length
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mediaLikes', 'mediaItems'], 'readwrite');
      
      // Add like record
      const likesStore = transaction.objectStore('mediaLikes');
      const likeRequest = likesStore.put(likeRecord);

      likeRequest.onsuccess = () => {
        // Update media item like count
        const mediaStore = transaction.objectStore('mediaItems');
        const mediaRequest = mediaStore.get(mediaId);
        
        mediaRequest.onsuccess = () => {
          const mediaItem = mediaRequest.result;
          if (mediaItem) {
            mediaItem.data.likes = (mediaItem.data.likes || 0) + 1;
            mediaItem.data.isLiked = true;
            mediaItem.lastModified = Date.now();
            mediaItem.synced = false;
            
            const updateRequest = mediaStore.put(mediaItem);
            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = () => reject(updateRequest.error);
          } else {
            resolve();
          }
        };
        
        mediaRequest.onerror = () => reject(mediaRequest.error);
      };

      likeRequest.onerror = () => reject(likeRequest.error);
    });
  }

  async unlikeMedia(mediaId: string, userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const likeId = `${mediaId}_${userId}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mediaLikes', 'mediaItems'], 'readwrite');
      
      // Remove like record
      const likesStore = transaction.objectStore('mediaLikes');
      const likeRequest = likesStore.delete(likeId);

      likeRequest.onsuccess = () => {
        // Update media item like count
        const mediaStore = transaction.objectStore('mediaItems');
        const mediaRequest = mediaStore.get(mediaId);
        
        mediaRequest.onsuccess = () => {
          const mediaItem = mediaRequest.result;
          if (mediaItem) {
            mediaItem.data.likes = Math.max((mediaItem.data.likes || 0) - 1, 0);
            mediaItem.data.isLiked = false;
            mediaItem.lastModified = Date.now();
            mediaItem.synced = false;
            
            const updateRequest = mediaStore.put(mediaItem);
            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = () => reject(updateRequest.error);
          } else {
            resolve();
          }
        };
        
        mediaRequest.onerror = () => reject(mediaRequest.error);
      };

      likeRequest.onerror = () => reject(likeRequest.error);
    });
  }

  async getMediaComments(mediaId: string): Promise<MediaCommentRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mediaComments'], 'readonly');
      const store = transaction.objectStore('mediaComments');
      const index = store.index('mediaId');
      const request = index.getAll(mediaId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const comments = (request.result || [])
          .sort((a: MediaCommentRecord, b: MediaCommentRecord) => 
            new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime()
          );
        resolve(comments);
      };
    });
  }

  async cacheMediaBlob(mediaId: string, blob: Blob): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const cacheRecord = {
      id: `cache_${mediaId}`,
      mediaId,
      blob,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedMedia'], 'readwrite');
      const store = transaction.objectStore('cachedMedia');
      const request = store.put(cacheRecord);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getCachedMediaBlob(mediaId: string): Promise<Blob | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedMedia'], 'readonly');
      const store = transaction.objectStore('cachedMedia');
      const request = store.get(`cache_${mediaId}`);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && Date.now() - result.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
          resolve(result.blob);
        } else {
          resolve(null);
        }
      };
    });
  }
}

// Global storage instance
let mediaStorageInstance: MediaStorageManager | null = null;

export async function getMediaStorage(): Promise<MediaStorageManager> {
  if (!mediaStorageInstance) {
    mediaStorageInstance = new MediaStorageManager();
    await mediaStorageInstance.init();
  }
  
  return mediaStorageInstance;
}
