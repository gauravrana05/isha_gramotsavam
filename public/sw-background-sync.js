/**
 * Service Worker Background Sync Integration
 * Handles true background synchronization when the app is not active
 * Integrates with the BackgroundSyncManager for reliable offline operations
 */

// Import background sync utilities (in a real implementation, these would be bundled)
// For now, we'll implement the core logic directly in the service worker

const SYNC_TAG_PREFIX = 'volunteer-sync';
const MEDIA_SYNC_TAG = 'volunteer-media-sync';
const BATCH_SYNC_TAG = 'volunteer-batch-sync';

// Background sync event handlers
self.addEventListener('sync', event => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag.startsWith(SYNC_TAG_PREFIX)) {
    event.waitUntil(handleBackgroundSync(event.tag));
  } else if (event.tag === MEDIA_SYNC_TAG) {
    event.waitUntil(handleMediaSync());
  } else if (event.tag === BATCH_SYNC_TAG) {
    event.waitUntil(handleBatchSync());
  }
});

// Periodic background sync (for browsers that support it)
self.addEventListener('periodicsync', event => {
  console.log('[SW] Periodic sync event:', event.tag);
  
  if (event.tag === 'volunteer-health-check') {
    event.waitUntil(performHealthCheck());
  }
});

// Message handling from main thread
self.addEventListener('message', event => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'REGISTER_SYNC':
      registerSyncTag(payload.tag, payload.options);
      break;
    case 'CANCEL_SYNC':
      cancelSyncTag(payload.tag);
      break;
    case 'GET_SYNC_STATUS':
      event.ports[0].postMessage(getSyncStatus());
      break;
  }
});

/**
 * Handle background sync for volunteer actions
 */
async function handleBackgroundSync(tag) {
  console.log('[SW] Handling background sync:', tag);
  
  try {
    // Open IndexedDB to get pending sync actions
    const db = await openVolunteerDB();
    const pendingActions = await getPendingSyncActions(db);
    
    if (pendingActions.length === 0) {
      console.log('[SW] No pending actions to sync');
      return;
    }
    
    console.log(`[SW] Processing ${pendingActions.length} pending actions`);
    
    // Process actions in batches
    const BATCH_SIZE = 5;
    const results = [];
    
    for (let i = 0; i < pendingActions.length; i += BATCH_SIZE) {
      const batch = pendingActions.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(action => processSyncAction(action, db))
      );
      results.push(...batchResults);
    }
    
    // Update sync statistics
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`[SW] Background sync completed: ${successful} successful, ${failed} failed`);
    
    // Record sync event
    await recordSyncEvent(db, {
      type: 'background_sync_complete',
      timestamp: Date.now(),
      metadata: { successful, failed, total: pendingActions.length }
    });
    
    // Show notification for failed syncs if any
    if (failed > 0) {
      await showSyncNotification({
        type: 'sync_partial_failure',
        successful,
        failed,
        total: pendingActions.length
      });
    }
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    
    // Record error event
    try {
      const db = await openVolunteerDB();
      await recordSyncEvent(db, {
        type: 'background_sync_error',
        timestamp: Date.now(),
        error: error.message,
        metadata: { tag }
      });
    } catch (dbError) {
      console.error('[SW] Failed to record sync error:', dbError);
    }
    
    // Show error notification
    await showSyncNotification({
      type: 'sync_error',
      error: error.message
    });
  }
}

/**
 * Handle media sync in background
 */
async function handleMediaSync() {
  console.log('[SW] Handling media sync');
  
  try {
    const db = await openVolunteerDB();
    const pendingMediaUploads = await getPendingMediaUploads(db);
    
    if (pendingMediaUploads.length === 0) {
      console.log('[SW] No pending media uploads');
      return;
    }
    
    console.log(`[SW] Processing ${pendingMediaUploads.length} media uploads`);
    
    // Process media uploads one by one (to avoid overwhelming the network)
    let successful = 0;
    let failed = 0;
    
    for (const upload of pendingMediaUploads) {
      try {
        await processMediaUpload(upload, db);
        successful++;
        
        // Show progress notification for large uploads
        if (upload.totalSize > 10 * 1024 * 1024) { // > 10MB
          await showProgressNotification(successful, pendingMediaUploads.length);
        }
        
      } catch (error) {
        console.error('[SW] Media upload failed:', upload.id, error);
        failed++;
        
        // Update upload status in DB
        await updateMediaUploadStatus(db, upload.id, 'failed', error.message);
      }
    }
    
    console.log(`[SW] Media sync completed: ${successful} successful, ${failed} failed`);
    
    // Show completion notification
    await showSyncNotification({
      type: 'media_sync_complete',
      successful,
      failed,
      total: pendingMediaUploads.length
    });
    
  } catch (error) {
    console.error('[SW] Media sync failed:', error);
    await showSyncNotification({
      type: 'media_sync_error',
      error: error.message
    });
  }
}

/**
 * Handle batch sync of multiple data types
 */
async function handleBatchSync() {
  console.log('[SW] Handling batch sync');
  
  try {
    const db = await openVolunteerDB();
    const stats = { actions: 0, media: 0, conflicts: 0 };
    
    // Sync pending actions
    const pendingActions = await getPendingSyncActions(db);
    if (pendingActions.length > 0) {
      await Promise.allSettled(
        pendingActions.map(action => processSyncAction(action, db))
      );
      stats.actions = pendingActions.length;
    }
    
    // Sync pending media
    const pendingMedia = await getPendingMediaUploads(db);
    if (pendingMedia.length > 0) {
      await Promise.allSettled(
        pendingMedia.map(upload => processMediaUpload(upload, db))
      );
      stats.media = pendingMedia.length;
    }
    
    // Resolve pending conflicts
    const pendingConflicts = await getPendingConflicts(db);
    if (pendingConflicts.length > 0) {
      // Only auto-resolve conflicts with high confidence
      const autoResolvable = pendingConflicts.filter(c => 
        c.resolution && c.resolution.confidence > 0.8
      );
      await Promise.allSettled(
        autoResolvable.map(conflict => resolveConflict(conflict, db))
      );
      stats.conflicts = autoResolvable.length;
    }
    
    console.log('[SW] Batch sync completed:', stats);
    
    // Show summary notification
    await showSyncNotification({
      type: 'batch_sync_complete',
      stats
    });
    
  } catch (error) {
    console.error('[SW] Batch sync failed:', error);
    await showSyncNotification({
      type: 'batch_sync_error',
      error: error.message
    });
  }
}

/**
 * Perform health check and maintenance
 */
async function performHealthCheck() {
  console.log('[SW] Performing health check');
  
  try {
    const db = await openVolunteerDB();
    
    // Check storage usage
    const storageUsage = await getStorageUsage(db);
    const STORAGE_LIMIT = 50 * 1024 * 1024; // 50MB
    const usagePercentage = (storageUsage / STORAGE_LIMIT) * 100;
    
    console.log(`[SW] Storage usage: ${usagePercentage.toFixed(1)}%`);
    
    // Cleanup if storage usage is high
    if (usagePercentage > 80) {
      console.log('[SW] Storage usage high, performing cleanup');
      const cleanedUp = await performStorageCleanup(db);
      console.log(`[SW] Cleaned up ${cleanedUp} items`);
      
      // Show cleanup notification
      await showSyncNotification({
        type: 'storage_cleanup',
        cleanedUp,
        usageAfter: Math.max(0, usagePercentage - 20) // Estimate
      });
    }
    
    // Check for old data that needs cleanup
    const oldDataCount = await getOldDataCount(db);
    if (oldDataCount > 0) {
      console.log(`[SW] Found ${oldDataCount} old items for cleanup`);
      await cleanupOldData(db);
    }
    
    // Record health check event
    await recordSyncEvent(db, {
      type: 'health_check_complete',
      timestamp: Date.now(),
      metadata: {
        storageUsage: usagePercentage,
        cleanedUp: oldDataCount
      }
    });
    
  } catch (error) {
    console.error('[SW] Health check failed:', error);
  }
}

/**
 * Process a single sync action
 */
async function processSyncAction(action, db) {
  console.log('[SW] Processing sync action:', action.id, action.type);
  
  // Update action status
  await updateActionStatus(db, action.id, 'processing');
  
  try {
    // Make API request based on action type
    const result = await executeApiCall(action);
    
    if (result.success) {
      // Mark as completed
      await updateActionStatus(db, action.id, 'completed');
      console.log('[SW] Action completed:', action.id);
    } else {
      throw new Error(result.error || 'API call failed');
    }
    
  } catch (error) {
    console.error('[SW] Action failed:', action.id, error.message);
    
    // Update retry count and status
    const newRetryCount = (action.retryCount || 0) + 1;
    const maxRetries = action.maxRetries || 3;
    
    if (newRetryCount >= maxRetries) {
      await updateActionStatus(db, action.id, 'failed', error.message);
    } else {
      // Schedule retry with exponential backoff
      const retryDelay = Math.min(1000 * Math.pow(2, newRetryCount), 300000); // Max 5 minutes
      await updateActionForRetry(db, action.id, newRetryCount, Date.now() + retryDelay, error.message);
      
      // Register sync for retry
      await registerSyncDelayed(`${SYNC_TAG_PREFIX}-retry-${action.id}`, retryDelay);
    }
    
    throw error;
  }
}

/**
 * Process a media upload
 */
async function processMediaUpload(upload, db) {
  console.log('[SW] Processing media upload:', upload.id);
  
  await updateMediaUploadStatus(db, upload.id, 'processing');
  
  try {
    // Process each media item
    for (const mediaItem of upload.mediaItems) {
      if (mediaItem.status !== 'pending') continue;
      
      // Get file data from IndexedDB
      const fileData = await getMediaFileData(db, mediaItem.id);
      if (!fileData) {
        throw new Error(`Media file not found: ${mediaItem.id}`);
      }
      
      // Upload media file
      const uploadResult = await uploadMediaFile(fileData, mediaItem, upload);
      
      // Update media item with results
      await updateMediaItemStatus(db, mediaItem.id, 'completed', {
        uploadedUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl
      });
    }
    
    // Mark upload as completed
    await updateMediaUploadStatus(db, upload.id, 'completed');
    
    console.log('[SW] Media upload completed:', upload.id);
    
  } catch (error) {
    console.error('[SW] Media upload failed:', upload.id, error.message);
    await updateMediaUploadStatus(db, upload.id, 'failed', error.message);
    throw error;
  }
}

/**
 * Execute API call for sync action
 */
async function executeApiCall(action) {
  const { type, payload, userId } = action;
  
  // Determine API endpoint based on action type
  const endpoint = getApiEndpoint(type);
  if (!endpoint) {
    throw new Error(`Unknown action type: ${type}`);
  }
  
  // Prepare request
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getAuthToken(userId)}`,
    },
    body: JSON.stringify(payload),
  };
  
  // Make request with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const response = await fetch(endpoint, {
      ...request,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    return { success: true, data: result };
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('API call timeout');
    }
    
    throw error;
  }
}

/**
 * Upload media file to cloud storage
 */
async function uploadMediaFile(fileData, mediaItem, upload) {
  // Mock implementation - in real app would upload to cloud storage
  console.log('[SW] Uploading media file:', mediaItem.fileName);
  
  // Simulate upload delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Return mock URLs
  const timestamp = Date.now();
  return {
    url: `https://cdn.example.com/media/${upload.userId}/${timestamp}/${mediaItem.fileName}`,
    thumbnailUrl: mediaItem.type === 'image' || mediaItem.type === 'video' 
      ? `https://cdn.example.com/thumbnails/${upload.userId}/${timestamp}/thumb_${mediaItem.fileName}`
      : undefined,
  };
}

/**
 * Show sync notification to user
 */
async function showSyncNotification(options) {
  const { type } = options;
  
  let title, body, icon;
  
  switch (type) {
    case 'sync_partial_failure':
      title = 'Sync Partially Complete';
      body = `${options.successful} of ${options.total} items synced. ${options.failed} failed.`;
      icon = '/icons/icon-warning.png';
      break;
      
    case 'sync_error':
      title = 'Sync Failed';
      body = `Background sync encountered an error: ${options.error}`;
      icon = '/icons/icon-error.png';
      break;
      
    case 'media_sync_complete':
      title = 'Media Upload Complete';
      body = `${options.successful} of ${options.total} media files uploaded successfully.`;
      icon = '/icons/icon-success.png';
      break;
      
    case 'media_sync_error':
      title = 'Media Upload Failed';
      body = `Media upload encountered an error: ${options.error}`;
      icon = '/icons/icon-error.png';
      break;
      
    case 'batch_sync_complete':
      title = 'Background Sync Complete';
      body = `Synced ${options.stats.actions} actions, ${options.stats.media} media files, resolved ${options.stats.conflicts} conflicts.`;
      icon = '/icons/icon-success.png';
      break;
      
    case 'storage_cleanup':
      title = 'Storage Optimized';
      body = `Cleaned up ${options.cleanedUp} items. Storage usage now ${options.usageAfter.toFixed(1)}%.`;
      icon = '/icons/icon-info.png';
      break;
      
    default:
      return;
  }
  
  // Only show notification if app is not visible
  if (!await isAppVisible()) {
    await self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icons/badge-72x72.png',
      tag: `sync-${type}`,
      data: { type, timestamp: Date.now() },
    });
  }
}

/**
 * Show progress notification for long operations
 */
async function showProgressNotification(current, total) {
  const progress = Math.round((current / total) * 100);
  
  if (!await isAppVisible()) {
    await self.registration.showNotification('Upload Progress', {
      body: `Uploading media files: ${current}/${total} (${progress}%)`,
      icon: '/icons/icon-upload.png',
      tag: 'upload-progress',
      silent: true,
    });
  }
}

/**
 * Check if app is currently visible
 */
async function isAppVisible() {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  
  return clients.some(client => client.visibilityState === 'visible');
}

/**
 * Register delayed sync
 */
async function registerSyncDelayed(tag, delay) {
  setTimeout(async () => {
    try {
      await self.registration.sync.register(tag);
      console.log('[SW] Registered delayed sync:', tag);
    } catch (error) {
      console.error('[SW] Failed to register delayed sync:', error);
    }
  }, delay);
}

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const { type } = event.notification.data || {};
  
  // Open app when notification is clicked
  event.waitUntil(
    self.clients.openWindow('/')
  );
});

// Helper functions for IndexedDB operations
async function openVolunteerDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VolunteerWorkflowDB', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create stores if they don't exist
      const storeNames = ['syncQueue', 'mediaQueue', 'conflicts', 'syncEvents'];
      storeNames.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
  });
}

async function getPendingSyncActions(db) {
  const transaction = db.transaction(['syncQueue'], 'readonly');
  const store = transaction.objectStore('syncQueue');
  const request = store.getAll();
  
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const actions = request.result
        .filter(doc => doc.data.status === 'pending' && doc.data.scheduledFor <= Date.now())
        .map(doc => doc.data);
      resolve(actions);
    };
  });
}

async function getPendingMediaUploads(db) {
  const transaction = db.transaction(['mediaQueue'], 'readonly');
  const store = transaction.objectStore('mediaQueue');
  const request = store.getAll();
  
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const uploads = request.result
        .filter(doc => doc.data.status === 'queued')
        .map(doc => doc.data);
      resolve(uploads);
    };
  });
}

async function getPendingConflicts(db) {
  const transaction = db.transaction(['conflicts'], 'readonly');
  const store = transaction.objectStore('conflicts');
  const request = store.getAll();
  
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const conflicts = request.result
        .filter(doc => doc.data.status === 'detected')
        .map(doc => doc.data);
      resolve(conflicts);
    };
  });
}

async function updateActionStatus(db, actionId, status, error = null) {
  const transaction = db.transaction(['syncQueue'], 'readwrite');
  const store = transaction.objectStore('syncQueue');
  
  const getRequest = store.get(actionId);
  
  return new Promise((resolve, reject) => {
    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (record) {
        record.data.status = status;
        record.data.lastAttempt = Date.now();
        if (error) record.data.error = error;
        if (status === 'completed') record.synced = true;
        
        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Additional helper functions would be implemented here...
// This is a comprehensive foundation for service worker background sync

console.log('[SW] Background sync service worker loaded');

// Register for periodic sync if supported
if ('periodicSync' in self.registration) {
  self.registration.periodicSync.register('volunteer-health-check', {
    minInterval: 60 * 60 * 1000, // 1 hour
  }).catch(error => {
    console.log('[SW] Periodic sync not available:', error);
  });
}

// Utility functions
function getApiEndpoint(actionType) {
  const endpoints = {
    'team_checkin': '/api/trpc/admin.teams.checkIn',
    'player_verification': '/api/trpc/admin.players.verify',
    'match_score': '/api/trpc/admin.matches.updateScore',
    'media_upload': '/api/trpc/admin.media.upload',
    'player_update': '/api/trpc/admin.players.update',
    'team_update': '/api/trpc/admin.teams.update',
  };
  
  return endpoints[actionType];
}

async function getAuthToken(userId) {
  // In real implementation, would get auth token from IndexedDB or generate JWT
  return 'mock-auth-token';
}

async function recordSyncEvent(db, event) {
  const transaction = db.transaction(['syncEvents'], 'readwrite');
  const store = transaction.objectStore('syncEvents');
  
  const eventDoc = {
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    data: event,
    timestamp: event.timestamp,
    lastModified: Date.now(),
    userId: 'system',
    version: 1,
    synced: false,
    priority: 'low',
    size: JSON.stringify(event).length,
  };
  
  return new Promise((resolve, reject) => {
    const request = store.add(eventDoc);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Expose functions for testing
self.volunteerSyncFunctions = {
  handleBackgroundSync,
  handleMediaSync,
  handleBatchSync,
  performHealthCheck,
};