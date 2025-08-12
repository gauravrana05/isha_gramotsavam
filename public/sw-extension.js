/**
 * Service Worker extension for background sync
 * Enhances next-pwa with offline-first capabilities
 */

// Background sync configuration
const SYNC_TAG = 'isha-gramotsavam-sync';
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 60000; // 1 minute

// IndexedDB configuration
const DB_NAME = 'IshaGramotsavamOfflineDB';
const DB_VERSION = 1;
const SYNC_STORE = 'syncQueue';

/**
 * Open IndexedDB connection using the same schema as the main app
 */
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      
      // Verify that required stores exist
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        console.error('Database not properly initialized - syncQueue store missing');
        reject(new Error('Database not initialized'));
        return;
      }
      
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log('SW: Database upgrade needed, but main app should handle schema creation');
      
      // Don't create stores here - let the main application handle schema creation
      // This prevents conflicts between service worker and main app database initialization
    };
  });
}

/**
 * Get pending sync actions from IndexedDB
 */
async function getPendingSyncActions() {
  try {
    const db = await openDB();
    const transaction = db.transaction([SYNC_STORE], 'readonly');
    const store = transaction.objectStore(SYNC_STORE);
    const index = store.index('status');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll('PENDING');
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting pending sync actions:', error);
    return [];
  }
}

/**
 * Update sync action status in IndexedDB
 */
async function updateSyncActionStatus(actionId, status, error = null) {
  try {
    const db = await openDB();
    const transaction = db.transaction([SYNC_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_STORE);
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(actionId);
      
      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.status = status;
          action.retryCount = (action.retryCount || 0) + (status === 'FAILED' ? 1 : 0);
          action.lastAttempt = Date.now();
          if (error) action.error = error;
          
          const updateRequest = store.put(action);
          updateRequest.onsuccess = () => resolve(true);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve(false);
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('Error updating sync action status:', error);
    return false;
  }
}

/**
 * Execute a sync action
 */
async function executeSyncAction(action) {
  try {
    let url = '';
    let method = '';
    let body = null;
    
    // Map action types to Firebase REST API endpoints
    switch (action.type) {
      case 'CREATE':
        url = `https://firestore.googleapis.com/v1/projects/your-project-id/databases/(default)/documents/${action.collection}`;
        method = 'POST';
        body = JSON.stringify({
          fields: convertToFirestoreFields(action.data)
        });
        break;
        
      case 'UPDATE':
        url = `https://firestore.googleapis.com/v1/projects/your-project-id/databases/(default)/documents/${action.collection}/${action.documentId}`;
        method = 'PATCH';
        body = JSON.stringify({
          fields: convertToFirestoreFields(action.data)
        });
        break;
        
      case 'DELETE':
        url = `https://firestore.googleapis.com/v1/projects/your-project-id/databases/(default)/documents/${action.collection}/${action.documentId}`;
        method = 'DELETE';
        break;
        
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
    
    // Get authentication token (this would need proper implementation)
    const authToken = await getAuthToken();
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return { success: true, data: await response.json() };
  } catch (error) {
    console.error('Error executing sync action:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Convert plain object to Firestore fields format
 */
function convertToFirestoreFields(data) {
  const fields = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = Number.isInteger(value) ? 
        { integerValue: value } : 
        { doubleValue: value };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      fields[key] = { timestampValue: value.toISOString() };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map(item => convertToFirestoreFields({ item }).item)
        }
      };
    } else if (typeof value === 'object') {
      fields[key] = {
        mapValue: {
          fields: convertToFirestoreFields(value)
        }
      };
    }
  }
  
  return fields;
}

/**
 * Get authentication token (placeholder - needs proper implementation)
 */
async function getAuthToken() {
  // This would need to get a valid Firebase Auth token
  // For now, returning empty string - needs proper Firebase integration
  return '';
}

/**
 * Process background sync
 */
async function processBgSync() {
  console.log('Processing background sync...');
  
  try {
    const pendingActions = await getPendingSyncActions();
    console.log(`Found ${pendingActions.length} pending sync actions`);
    
    let successful = 0;
    let failed = 0;
    
    for (const action of pendingActions) {
      // Skip if exceeded max retries
      if (action.retryCount >= MAX_RETRY_COUNT) {
        console.log(`Skipping action ${action.id} - max retries exceeded`);
        continue;
      }
      
      // Mark as in progress
      await updateSyncActionStatus(action.id, 'IN_PROGRESS');
      
      const result = await executeSyncAction(action);
      
      if (result.success) {
        await updateSyncActionStatus(action.id, 'COMPLETED');
        successful++;
        console.log(`Successfully synced action ${action.id}`);
      } else {
        await updateSyncActionStatus(action.id, 'FAILED', result.error);
        failed++;
        console.error(`Failed to sync action ${action.id}:`, result.error);
      }
    }
    
    console.log(`Background sync completed: ${successful} successful, ${failed} failed`);
    
    // Schedule retry for failed actions
    if (failed > 0) {
      setTimeout(() => {
        self.registration.sync.register(SYNC_TAG);
      }, RETRY_DELAY);
    }
    
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

/**
 * Send sync status notification
 */
async function sendSyncNotification(title, body, data = {}) {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data,
        actions: [
          {
            action: 'view',
            title: 'View Details'
          }
        ]
      });
    }
  }
}

// Background Sync Event Listener
self.addEventListener('sync', event => {
  console.log('Background sync event received:', event.tag);
  
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processBgSync());
  }
});

// Notification Click Handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    // Open the app to view sync details
    event.waitUntil(
      clients.matchAll().then(clientList => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        } else {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Message Handler for manual sync triggers
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    console.log('Manual sync triggered from client');
    
    // Register sync immediately
    self.registration.sync.register(SYNC_TAG).then(() => {
      event.ports[0].postMessage({ success: true });
    }).catch(error => {
      console.error('Failed to register sync:', error);
      event.ports[0].postMessage({ success: false, error: error.message });
    });
  }
});

// Enhanced fetch event for offline-first behavior
self.addEventListener('fetch', event => {
  // Only handle API requests to Firestore
  if (event.request.url.includes('firestore.googleapis.com')) {
    event.respondWith(handleFirestoreRequest(event.request));
  }
});

/**
 * Handle Firestore requests with offline-first strategy
 */
async function handleFirestoreRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    if (response.ok) {
      return response;
    }
    
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.log('Network request failed, falling back to offline handling');
    
    // Queue write operations for background sync
    if (request.method !== 'GET') {
      await queueRequestForSync(request);
      
      // Return a success response to prevent errors in the UI
      return new Response(JSON.stringify({ success: true, offline: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // For read operations, try to get from IndexedDB
    return getOfflineData(request);
  }
}

/**
 * Queue request for background sync
 */
async function queueRequestForSync(request) {
  try {
    // Parse request to create sync action
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const collection = pathParts[pathParts.length - 2] || pathParts[pathParts.length - 1];
    
    let actionType = 'CREATE';
    let documentId = '';
    
    if (request.method === 'PATCH') {
      actionType = 'UPDATE';
      documentId = pathParts[pathParts.length - 1];
    } else if (request.method === 'DELETE') {
      actionType = 'DELETE';
      documentId = pathParts[pathParts.length - 1];
    }
    
    const requestBody = request.method !== 'DELETE' ? await request.json() : {};
    
    const syncAction = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: actionType,
      collection,
      documentId,
      data: requestBody,
      timestamp: Date.now(),
      status: 'PENDING',
      retryCount: 0,
      userId: 'current-user', // This would need proper user context
      priority: 'medium'
    };
    
    // Store in IndexedDB
    const db = await openDB();
    const transaction = db.transaction([SYNC_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_STORE);
    
    await new Promise((resolve, reject) => {
      const request = store.add(syncAction);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    console.log('Queued action for background sync:', syncAction.id);
    
    // Try to register sync immediately if possible
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      self.registration.sync.register(SYNC_TAG);
    }
    
  } catch (error) {
    console.error('Failed to queue request for sync:', error);
  }
}

/**
 * Get offline data from IndexedDB
 */
async function getOfflineData(request) {
  try {
    // This is a simplified implementation
    // In reality, you'd parse the request URL and fetch appropriate data
    return new Response(JSON.stringify({ offline: true, error: 'Data not available offline' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Offline data access failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

console.log('Background sync service worker extension loaded');