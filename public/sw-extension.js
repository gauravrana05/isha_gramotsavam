/**
 * Service Worker extension for background sync and push notifications
 * Enhances next-pwa with offline-first capabilities and push notification support
 */

// Background sync configuration
const SYNC_TAG = 'isha-gramotsavam-sync';
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 60000; // 1 minute

// Push notification configuration
const NOTIFICATION_TAG = 'isha-gramotsavam-notification';
const NOTIFICATION_ICON = '/icons/icon-192x192.png';
const NOTIFICATION_BADGE = '/icons/icon-192x192.png';

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

// Legacy message handler removed - now handled in enhanced message handler below

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

/**
 * Push notification handlers
 */

// Push event listener
self.addEventListener('push', event => {
  console.log('Push notification received:', event);

  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  let notificationData;
  try {
    notificationData = event.data.json();
  } catch (error) {
    console.error('Invalid notification data:', error);
    return;
  }

  const {
    title,
    message,
    type = 'info',
    actionUrl,
    userId,
    notificationId,
    createdBy,
    timestamp
  } = notificationData;

  // Get notification icon and badge based on type
  const { icon, badge } = getNotificationAssets(type);

  // Create notification options
  const options = {
    body: message,
    icon,
    badge,
    tag: notificationId || `notification-${Date.now()}`,
    data: {
      notificationId,
      actionUrl,
      userId,
      type,
      timestamp: timestamp || Date.now(),
      createdBy
    },
    actions: [],
    requireInteraction: type === 'emergency' || type === 'system_announcement',
    silent: false,
    renotify: true,
  };

  // Add action buttons based on notification type
  if (actionUrl) {
    options.actions.push({
      action: 'view',
      title: 'View Details',
      icon: '/icons/icon-192x192.png'
    });
  }

  // Add mark as read action for non-emergency notifications
  if (type !== 'emergency') {
    options.actions.push({
      action: 'mark-read',
      title: 'Mark as Read',
      icon: '/icons/icon-192x192.png'
    });
  }

  // Add dismiss action
  options.actions.push({
    action: 'dismiss',
    title: 'Dismiss',
    icon: '/icons/icon-192x192.png'
  });

  // Show notification
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('Notification displayed successfully');
        // Store notification in IndexedDB for offline access
        return storeNotificationOffline(notificationData);
      })
      .catch(error => {
        console.error('Failed to display notification:', error);
      })
  );
});

// Notification click event listener
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const { action } = event;
  const { notificationId, actionUrl, type, userId } = event.notification.data;

  console.log('Notification clicked:', { action, notificationId, actionUrl });

  switch (action) {
    case 'view':
      // Open the action URL or default to app
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then(clientList => {
            const targetUrl = actionUrl || '/';
            
            // Check if app is already open
            for (const client of clientList) {
              if (client.url.includes(window.location.origin)) {
                client.focus();
                client.postMessage({
                  type: 'NAVIGATE_TO',
                  url: targetUrl,
                  notificationId
                });
                return;
              }
            }
            
            // Open new window
            return clients.openWindow(targetUrl);
          })
          .then(() => {
            // Mark as read when viewed
            return markNotificationAsRead(notificationId, userId);
          })
      );
      break;

    case 'mark-read':
      // Mark notification as read
      event.waitUntil(
        markNotificationAsRead(notificationId, userId)
          .then(() => {
            console.log('Notification marked as read:', notificationId);
          })
      );
      break;

    case 'dismiss':
    default:
      // Just close the notification
      console.log('Notification dismissed:', notificationId);
      break;
  }
});

// Notification close event listener
self.addEventListener('notificationclose', event => {
  console.log('Notification closed:', event.notification.data);
  
  // Track notification close events
  const { notificationId } = event.notification.data;
  if (notificationId) {
    console.log('Tracking notification close:', notificationId);
  }
});

/**
 * Get notification assets based on type
 */
function getNotificationAssets(type) {
  const baseIcon = NOTIFICATION_ICON;
  const baseBadge = NOTIFICATION_BADGE;

  // You could customize icons based on notification type
  const typeIcons = {
    info: baseIcon,
    success: baseIcon,
    warning: baseIcon,
    error: baseIcon,
    team_invitation: baseIcon,
    verification_update: baseIcon,
    match_result: baseIcon,
    venue_assignment: baseIcon,
    system_announcement: baseIcon,
    match_reminder: baseIcon,
    tournament_update: baseIcon,
    emergency: baseIcon,
  };

  return {
    icon: typeIcons[type] || baseIcon,
    badge: baseBadge,
  };
}

/**
 * Store notification data offline for later access
 */
async function storeNotificationOffline(notificationData) {
  try {
    const db = await openDB();
    const transaction = db.transaction(['notifications'], 'readwrite');
    const store = transaction.objectStore('notifications');

    const offlineNotification = {
      ...notificationData,
      id: notificationData.notificationId || `offline-${Date.now()}`,
      receivedAt: Date.now(),
      read: false,
      offline: true
    };

    return new Promise((resolve, reject) => {
      const request = store.put(offlineNotification);
      request.onsuccess = () => {
        console.log('Notification stored offline:', offlineNotification.id);
        resolve();
      };
      request.onerror = () => {
        console.error('Failed to store notification offline:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error storing notification offline:', error);
  }
}

/**
 * Mark notification as read via API call
 */
async function markNotificationAsRead(notificationId, userId) {
  try {
    // Try to mark as read via network
    const response = await fetch('/api/trpc/notifications.markAsRead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: { notificationId },
      }),
    });

    if (response.ok) {
      console.log('Notification marked as read via API');
      return true;
    }

    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  } catch (error) {
    console.log('Failed to mark as read via API, queuing for sync:', error);
    
    // Queue for background sync if network fails
    return queueNotificationMarkAsRead(notificationId, userId);
  }
}

/**
 * Queue notification mark-as-read for background sync
 */
async function queueNotificationMarkAsRead(notificationId, userId) {
  try {
    const db = await openDB();
    const transaction = db.transaction([SYNC_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_STORE);

    const syncAction = {
      id: `mark-read_${notificationId}_${Date.now()}`,
      type: 'MARK_NOTIFICATION_READ',
      notificationId,
      userId,
      timestamp: Date.now(),
      status: 'PENDING',
      retryCount: 0,
      priority: 'low'
    };

    return new Promise((resolve, reject) => {
      const request = store.add(syncAction);
      request.onsuccess = () => {
        console.log('Queued mark-as-read for sync:', notificationId);
        
        // Try to register sync immediately
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
          self.registration.sync.register(SYNC_TAG);
        }
        
        resolve();
      };
      request.onerror = () => {
        console.error('Failed to queue mark-as-read:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error queuing notification mark-as-read:', error);
    return false;
  }
}

/**
 * Enhanced message handler for push notification management
 */
self.addEventListener('message', event => {
  const { type, data } = event.data || {};

  switch (type) {
    case 'TRIGGER_SYNC':
      console.log('Manual sync triggered from client');
      
      self.registration.sync.register(SYNC_TAG).then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch(error => {
        console.error('Failed to register sync:', error);
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;

    case 'SUBSCRIBE_TO_PUSH':
      // Handle push subscription
      console.log('Push subscription request from client');
      handlePushSubscription(event);
      break;

    case 'UPDATE_NOTIFICATION_SETTINGS':
      // Update notification preferences
      console.log('Updating notification settings:', data);
      updateNotificationSettings(data);
      break;

    default:
      console.log('Unknown message type:', type);
  }
});

/**
 * Handle push subscription from client
 */
async function handlePushSubscription(event) {
  try {
    // Get or create push subscription
    const subscription = await self.registration.pushManager.getSubscription();
    
    if (subscription) {
      event.ports[0].postMessage({
        success: true,
        subscription: subscription.toJSON()
      });
    } else {
      event.ports[0].postMessage({
        success: false,
        error: 'No push subscription available'
      });
    }
  } catch (error) {
    console.error('Failed to handle push subscription:', error);
    event.ports[0].postMessage({
      success: false,
      error: error.message
    });
  }
}

/**
 * Update notification settings in IndexedDB
 */
async function updateNotificationSettings(settings) {
  try {
    const db = await openDB();
    const transaction = db.transaction(['notificationSettings'], 'readwrite');
    const store = transaction.objectStore('notificationSettings');

    const settingsData = {
      id: 'user-settings',
      ...settings,
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(settingsData);
      request.onsuccess = () => {
        console.log('Notification settings updated:', settingsData);
        resolve();
      };
      request.onerror = () => {
        console.error('Failed to update notification settings:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
  }
}

console.log('Background sync and push notification service worker extension loaded');