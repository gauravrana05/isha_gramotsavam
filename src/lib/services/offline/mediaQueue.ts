/**
 * Media Upload Queue System for Volunteer Posts and Media
 * Handles offline media uploads with smart retry logic and compression
 * Supports posts, images, videos, documents with priority-based processing
 */

import { getVolunteerStorage, VolunteerDocument } from './volunteerStorage';
import { getBackgroundSyncManager } from './backgroundSync';

export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'document' | 'audio';
  file: File | Blob;
  fileName: string;
  mimeType: string;
  size: number;
  
  // Processing state
  status: 'pending' | 'processing' | 'compressing' | 'uploading' | 'completed' | 'failed';
  progress: number; // 0-100
  
  // Metadata
  uploadedUrl?: string;
  thumbnailUrl?: string;
  compressedSize?: number;
  
  // Error handling
  error?: string;
  retryCount: number;
  lastAttempt?: number;
}

export interface PostUpload {
  id: string;
  userId: string;
  venueId?: string;
  
  // Post content
  content: {
    title?: string;
    description?: string;
    body?: string;
    tags?: string[];
    category?: 'match_update' | 'team_photo' | 'venue_update' | 'announcement' | 'other';
  };
  
  // Media attachments
  mediaItems: MediaItem[];
  primaryMedia?: string; // ID of primary media item
  
  // Upload state
  status: 'draft' | 'queued' | 'uploading' | 'completed' | 'failed';
  uploadProgress: number; // 0-100
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  // Timing
  createdAt: number;
  scheduledFor?: number;
  completedAt?: number;
  
  // Error handling
  error?: string;
  retryCount: number;
  maxRetries: number;
  
  // Metadata
  totalSize: number;
  estimatedUploadTime?: number; // in seconds
}

export interface CompressionConfig {
  images: {
    maxWidth: number;
    maxHeight: number;
    quality: number; // 0-1
    format: 'webp' | 'jpeg' | 'original';
  };
  videos: {
    maxSize: number; // in MB
    quality: 'low' | 'medium' | 'high';
    maxDuration?: number; // in seconds
  };
}

export interface UploadStats {
  totalPosts: number;
  pendingPosts: number;
  uploadedToday: number;
  failedToday: number;
  
  totalMediaItems: number;
  pendingMediaItems: number;
  
  totalSize: number; // bytes
  uploadedSize: number; // bytes
  
  averageUploadTime: number; // seconds
  successRate: number; // percentage
  
  networkUsage: {
    wifi: number; // MB
    cellular: number; // MB
  };
}

export class MediaUploadQueue {
  private storage: Awaited<ReturnType<typeof getVolunteerStorage>> | null = null;
  private backgroundSync = getBackgroundSyncManager();
  
  private uploadQueue: Map<string, PostUpload> = new Map();
  private activeUploads: Set<string> = new Set();
  
  // Configuration
  private readonly MAX_CONCURRENT_UPLOADS = 2;
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly COMPRESSION_CONFIG: CompressionConfig = {
    images: {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.8,
      format: 'webp',
    },
    videos: {
      maxSize: 50, // MB
      quality: 'medium',
      maxDuration: 300, // 5 minutes
    },
  };
  
  // Callbacks
  private onUploadProgress?: (postId: string, progress: number) => void;
  private onUploadComplete?: (postId: string, success: boolean) => void;
  private onMediaProcessed?: (mediaId: string, processedUrl: string) => void;

  constructor(
    onUploadProgress?: (postId: string, progress: number) => void,
    onUploadComplete?: (postId: string, success: boolean) => void,
    onMediaProcessed?: (mediaId: string, processedUrl: string) => void
  ) {
    this.onUploadProgress = onUploadProgress;
    this.onUploadComplete = onUploadComplete;
    this.onMediaProcessed = onMediaProcessed;
  }

  /**
   * Initialize media upload queue
   */
  async initialize(): Promise<void> {
    if (!this.storage) {
      this.storage = await getVolunteerStorage();
    }
    
    // Load pending uploads from storage
    await this.loadPendingUploads();
    
    // Start upload processing loop
    this.startUploadLoop();
    
    console.log('📸 Media upload queue initialized');
  }

  /**
   * Queue a post with media for upload
   */
  async queuePost(postData: Omit<PostUpload, 'id' | 'createdAt' | 'retryCount' | 'uploadProgress' | 'totalSize'>): Promise<string> {
    await this.initialize();
    
    // Calculate total size
    const totalSize = postData.mediaItems.reduce((sum, item) => sum + item.size, 0);
    
    // Validate size limits
    if (totalSize > this.MAX_FILE_SIZE) {
      throw new Error(`Post size (${Math.round(totalSize / 1024 / 1024)}MB) exceeds limit (${Math.round(this.MAX_FILE_SIZE / 1024 / 1024)}MB)`);
    }
    
    const post: PostUpload = {
      ...postData,
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      retryCount: 0,
      uploadProgress: 0,
      totalSize,
      maxRetries: postData.maxRetries || 3,
      estimatedUploadTime: this.estimateUploadTime(totalSize),
    };
    
    // Store in IndexedDB
    await this.storePostUpload(post);
    
    // Add to memory queue
    this.uploadQueue.set(post.id, post);
    
    // Start upload if high priority and online
    if ((post.priority === 'critical' || post.priority === 'high') && navigator.onLine) {
      this.processUploadQueue();
    }
    
    console.log(`📤 Queued post for upload:`, post.id, `(${Math.round(totalSize / 1024)}KB, ${post.mediaItems.length} items)`);
    return post.id;
  }

  /**
   * Queue media item for standalone upload (not part of a post)
   */
  async queueMediaItem(
    mediaFile: File,
    metadata: {
      userId: string;
      venueId?: string;
      category?: string;
      description?: string;
    }
  ): Promise<string> {
    const mediaItem: MediaItem = {
      id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: this.getMediaType(mediaFile),
      file: mediaFile,
      fileName: mediaFile.name,
      mimeType: mediaFile.type,
      size: mediaFile.size,
      status: 'pending',
      progress: 0,
      retryCount: 0,
    };
    
    // Create a minimal post wrapper
    const post: PostUpload = {
      id: `post_${mediaItem.id}`,
      userId: metadata.userId,
      venueId: metadata.venueId,
      content: {
        description: metadata.description,
        category: (metadata.category as any) || 'other',
      },
      mediaItems: [mediaItem],
      primaryMedia: mediaItem.id,
      status: 'queued',
      uploadProgress: 0,
      priority: 'medium',
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      totalSize: mediaFile.size,
      estimatedUploadTime: this.estimateUploadTime(mediaFile.size),
    };
    
    return await this.queuePost(post);
  }

  /**
   * Get upload statistics
   */
  async getUploadStats(): Promise<UploadStats> {
    await this.initialize();
    
    const allPosts = Array.from(this.uploadQueue.values());
    const today = new Date().setHours(0, 0, 0, 0);
    
    const todayPosts = allPosts.filter(post => post.createdAt >= today);
    const uploadedToday = todayPosts.filter(post => post.status === 'completed').length;
    const failedToday = todayPosts.filter(post => post.status === 'failed').length;
    const pendingPosts = allPosts.filter(post => ['queued', 'uploading'].includes(post.status)).length;
    
    const allMediaItems = allPosts.flatMap(post => post.mediaItems);
    const pendingMediaItems = allMediaItems.filter(item => ['pending', 'processing', 'compressing', 'uploading'].includes(item.status)).length;
    
    const totalSize = allPosts.reduce((sum, post) => sum + post.totalSize, 0);
    const uploadedSize = allPosts
      .filter(post => post.status === 'completed')
      .reduce((sum, post) => sum + post.totalSize, 0);
    
    const completedPosts = allPosts.filter(post => post.status === 'completed');
    const averageUploadTime = completedPosts.length > 0 
      ? completedPosts.reduce((sum, post) => sum + (post.estimatedUploadTime || 0), 0) / completedPosts.length
      : 0;
    
    const successfulUploads = allPosts.filter(post => post.status === 'completed').length;
    const successRate = allPosts.length > 0 ? (successfulUploads / allPosts.length) * 100 : 100;
    
    return {
      totalPosts: allPosts.length,
      pendingPosts,
      uploadedToday,
      failedToday,
      totalMediaItems: allMediaItems.length,
      pendingMediaItems,
      totalSize,
      uploadedSize,
      averageUploadTime,
      successRate,
      networkUsage: {
        wifi: Math.round(uploadedSize / 1024 / 1024 * 0.7), // Estimate 70% wifi usage
        cellular: Math.round(uploadedSize / 1024 / 1024 * 0.3), // Estimate 30% cellular usage
      },
    };
  }

  /**
   * Cancel a pending upload
   */
  async cancelUpload(postId: string): Promise<boolean> {
    const post = this.uploadQueue.get(postId);
    if (!post || post.status === 'completed') {
      return false;
    }
    
    // Stop active upload if in progress
    if (this.activeUploads.has(postId)) {
      this.activeUploads.delete(postId);
    }
    
    // Update status
    post.status = 'failed';
    post.error = 'Cancelled by user';
    this.uploadQueue.set(postId, post);
    
    // Update in storage
    await this.storePostUpload(post);
    
    console.log(`❌ Cancelled upload:`, postId);
    return true;
  }

  /**
   * Retry a failed upload
   */
  async retryUpload(postId: string): Promise<boolean> {
    const post = this.uploadQueue.get(postId);
    if (!post || post.status !== 'failed') {
      return false;
    }
    
    // Reset status
    post.status = 'queued';
    post.uploadProgress = 0;
    post.error = undefined;
    
    // Reset media items
    post.mediaItems.forEach(item => {
      item.status = 'pending';
      item.progress = 0;
      item.error = undefined;
    });
    
    this.uploadQueue.set(postId, post);
    await this.storePostUpload(post);
    
    // Trigger upload
    this.processUploadQueue();
    
    console.log(`🔄 Retrying upload:`, postId);
    return true;
  }

  /**
   * Process the upload queue
   */
  private async processUploadQueue(): Promise<void> {
    if (this.activeUploads.size >= this.MAX_CONCURRENT_UPLOADS) {
      return; // Already at max capacity
    }
    
    const pendingPosts = Array.from(this.uploadQueue.values())
      .filter(post => post.status === 'queued' && !this.activeUploads.has(post.id))
      .sort((a, b) => this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority));
    
    const availableSlots = this.MAX_CONCURRENT_UPLOADS - this.activeUploads.size;
    const postsToProcess = pendingPosts.slice(0, availableSlots);
    
    for (const post of postsToProcess) {
      this.processPostUpload(post);
    }
  }

  /**
   * Process a single post upload
   */
  private async processPostUpload(post: PostUpload): Promise<void> {
    this.activeUploads.add(post.id);
    
    try {
      console.log(`📤 Starting upload for post:`, post.id);
      
      // Update status
      post.status = 'uploading';
      post.uploadProgress = 0;
      this.uploadQueue.set(post.id, post);
      
      // Step 1: Process and compress media items
      const totalSteps = post.mediaItems.length + 1; // +1 for final post upload
      let completedSteps = 0;
      
      for (const mediaItem of post.mediaItems) {
        await this.processMediaItem(mediaItem, post);
        completedSteps++;
        
        // Update overall progress
        post.uploadProgress = Math.round((completedSteps / totalSteps) * 90); // Reserve 10% for final post
        this.uploadQueue.set(post.id, post);
        
        if (this.onUploadProgress) {
          this.onUploadProgress(post.id, post.uploadProgress);
        }
      }
      
      // Step 2: Upload the post with media references
      await this.uploadPostData(post);
      
      // Step 3: Complete upload
      post.status = 'completed';
      post.uploadProgress = 100;
      post.completedAt = Date.now();
      this.uploadQueue.set(post.id, post);
      await this.storePostUpload(post);
      
      console.log(`✅ Post upload completed:`, post.id);
      
      if (this.onUploadComplete) {
        this.onUploadComplete(post.id, true);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      post.status = 'failed';
      post.error = errorMessage;
      post.retryCount++;
      
      this.uploadQueue.set(post.id, post);
      await this.storePostUpload(post);
      
      console.error(`❌ Post upload failed:`, post.id, errorMessage);
      
      if (this.onUploadComplete) {
        this.onUploadComplete(post.id, false);
      }
      
      // Schedule retry if within limits
      if (post.retryCount < post.maxRetries) {
        setTimeout(() => {
          post.status = 'queued';
          this.uploadQueue.set(post.id, post);
          this.processUploadQueue();
        }, this.calculateRetryDelay(post.retryCount));
      }
      
    } finally {
      this.activeUploads.delete(post.id);
      
      // Process next item in queue
      setTimeout(() => this.processUploadQueue(), 100);
    }
  }

  /**
   * Process and upload a single media item
   */
  private async processMediaItem(mediaItem: MediaItem, post: PostUpload): Promise<void> {
    mediaItem.status = 'processing';
    
    try {
      // Step 1: Compress if needed
      let processedFile = mediaItem.file;
      
      if (this.shouldCompressMedia(mediaItem)) {
        mediaItem.status = 'compressing';
        processedFile = await this.compressMedia(mediaItem);
        mediaItem.compressedSize = processedFile.size;
      }
      
      // Step 2: Upload media
      mediaItem.status = 'uploading';
      const uploadResult = await this.uploadMediaFile(processedFile, mediaItem, post);
      
      // Step 3: Update media item with results
      mediaItem.uploadedUrl = uploadResult.url;
      mediaItem.thumbnailUrl = uploadResult.thumbnailUrl;
      mediaItem.status = 'completed';
      mediaItem.progress = 100;
      
      if (this.onMediaProcessed) {
        this.onMediaProcessed(mediaItem.id, uploadResult.url);
      }
      
    } catch (error) {
      mediaItem.status = 'failed';
      mediaItem.error = error instanceof Error ? error.message : 'Processing failed';
      mediaItem.retryCount++;
      
      throw error; // Propagate to parent post upload
    }
  }

  /**
   * Upload the post data with media references
   */
  private async uploadPostData(post: PostUpload): Promise<void> {
    // Prepare post data with media URLs
    const postData = {
      content: post.content,
      mediaItems: post.mediaItems.map(item => ({
        id: item.id,
        type: item.type,
        fileName: item.fileName,
        url: item.uploadedUrl,
        thumbnailUrl: item.thumbnailUrl,
        size: item.size,
        compressedSize: item.compressedSize,
      })),
      primaryMedia: post.primaryMedia,
      venueId: post.venueId,
      userId: post.userId,
      createdAt: post.createdAt,
    };
    
    // Queue for background sync
    await this.backgroundSync.queueAction({
      type: 'media_upload',
      priority: post.priority,
      payload: postData,
      userId: post.userId,
      venueId: post.venueId,
      maxRetries: 5,
    });
    
    console.log('📮 Post data queued for background sync:', post.id);
  }

  /**
   * Upload a media file with streaming for large files
   */
  private async uploadMediaFile(
    file: File | Blob, 
    mediaItem: MediaItem, 
    post: PostUpload
  ): Promise<{ url: string; thumbnailUrl?: string }> {
    console.log(`📸 Uploading media:`, mediaItem.fileName, `(${Math.round(file.size / 1024)}KB)`);
    
    // Use streaming upload for files larger than 5MB
    const STREAM_THRESHOLD = 5 * 1024 * 1024; // 5MB
    
    if (file.size > STREAM_THRESHOLD) {
      return await this.streamUploadMediaFile(file, mediaItem, post);
    } else {
      return await this.regularUploadMediaFile(file, mediaItem, post);
    }
  }

  /**
   * Stream upload for large media files to reduce memory usage
   */
  private async streamUploadMediaFile(
    file: File | Blob,
    mediaItem: MediaItem,
    post: PostUpload
  ): Promise<{ url: string; thumbnailUrl?: string }> {
    console.log(`🌊 Streaming upload for large file:`, mediaItem.fileName);
    
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let uploadedBytes = 0;
    
    try {
      // Initialize resumable upload session
      const sessionId = await this.initializeUploadSession(file, mediaItem, post);
      
      // Upload file in chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        // Upload chunk with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            await this.uploadChunk(sessionId, chunk, chunkIndex, totalChunks);
            uploadedBytes += chunk.size;
            
            // Update progress
            const progress = Math.round((uploadedBytes / file.size) * 100);
            mediaItem.progress = progress;
            
            console.log(`📤 Uploaded chunk ${chunkIndex + 1}/${totalChunks} (${progress}%)`);
            break;
            
          } catch (error) {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw new Error(`Failed to upload chunk ${chunkIndex} after ${maxRetries} retries: ${error}`);
            }
            
            // Exponential backoff for chunk retry
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
            console.warn(`⚠️ Retrying chunk ${chunkIndex} (attempt ${retryCount + 1}/${maxRetries})`);
          }
        }
      }
      
      // Finalize upload
      const result = await this.finalizeUploadSession(sessionId);
      
      console.log(`✅ Streaming upload completed:`, mediaItem.fileName);
      return result;
      
    } catch (error) {
      console.error(`❌ Streaming upload failed:`, mediaItem.fileName, error);
      throw error;
    }
  }

  /**
   * Regular upload for smaller files
   */
  private async regularUploadMediaFile(
    file: File | Blob,
    mediaItem: MediaItem,
    post: PostUpload
  ): Promise<{ url: string; thumbnailUrl?: string }> {
    // Simulate upload progress
    const uploadTime = Math.random() * 3000 + 1000; // 1-4 seconds
    const steps = 10;
    
    for (let i = 0; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, uploadTime / steps));
      mediaItem.progress = Math.round((i / steps) * 100);
    }
    
    // Generate mock URLs
    const timestamp = Date.now();
    const mockUrl = `https://cdn.example.com/media/${post.userId}/${timestamp}/${mediaItem.fileName}`;
    const mockThumbnailUrl = mediaItem.type === 'image' || mediaItem.type === 'video'
      ? `https://cdn.example.com/thumbnails/${post.userId}/${timestamp}/thumb_${mediaItem.fileName}`
      : undefined;
    
    return {
      url: mockUrl,
      thumbnailUrl: mockThumbnailUrl,
    };
  }

  /**
   * Initialize resumable upload session
   */
  private async initializeUploadSession(
    file: File | Blob,
    mediaItem: MediaItem,
    post: PostUpload
  ): Promise<string> {
    // Mock implementation - in real app would call cloud storage API
    console.log('🚀 Initializing upload session for:', mediaItem.fileName);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock session ID
    return `upload_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Upload a single chunk
   */
  private async uploadChunk(
    sessionId: string,
    chunk: Blob,
    chunkIndex: number,
    totalChunks: number
  ): Promise<void> {
    console.log(`📦 Uploading chunk ${chunkIndex + 1}/${totalChunks} (${Math.round(chunk.size / 1024)}KB)`);
    
    // Simulate chunk upload - in real implementation would use fetch with chunk data
    const uploadTime = 200 + Math.random() * 300; // 200-500ms per chunk
    await new Promise(resolve => setTimeout(resolve, uploadTime));
    
    // Simulate occasional chunk failures for testing retry logic
    if (Math.random() < 0.05) { // 5% chance of chunk failure
      throw new Error(`Simulated chunk upload failure for chunk ${chunkIndex}`);
    }
  }

  /**
   * Finalize upload session and get final URLs
   */
  private async finalizeUploadSession(sessionId: string): Promise<{ url: string; thumbnailUrl?: string }> {
    console.log('🏁 Finalizing upload session:', sessionId);
    
    // Simulate finalization delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate final URLs
    const timestamp = Date.now();
    const mockUrl = `https://cdn.example.com/streamed/${sessionId}`;
    const mockThumbnailUrl = `https://cdn.example.com/thumbnails/streamed/thumb_${sessionId}`;
    
    return {
      url: mockUrl,
      thumbnailUrl: mockThumbnailUrl,
    };
  }

  /**
   * Compress media file if needed
   */
  private async compressMedia(mediaItem: MediaItem): Promise<File | Blob> {
    console.log(`🗜️ Compressing ${mediaItem.type}:`, mediaItem.fileName);
    
    if (mediaItem.type === 'image') {
      return await this.compressImage(mediaItem.file as File);
    } else if (mediaItem.type === 'video') {
      return await this.compressVideo(mediaItem.file as File);
    }
    
    return mediaItem.file; // No compression for other types
  }

  /**
   * Compress image using Canvas API
   */
  private async compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const { maxWidth, maxHeight, quality, format } = this.COMPRESSION_CONFIG.images;
        
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx!.drawImage(img, 0, 0, width, height);
        
        const outputFormat = format === 'original' ? file.type : `image/${format}`;
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Image compression failed'));
          }
        }, outputFormat, quality);
      };
      
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Compress video (mock implementation - in real app would use FFmpeg.wasm)
   */
  private async compressVideo(file: File): Promise<Blob> {
    console.log('🎬 Video compression (simulated)');
    
    // Simulate compression delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In real implementation, this would use FFmpeg.wasm or similar
    // For now, return original file (or a mock compressed version)
    const compressionRatio = 0.7; // Simulate 30% size reduction
    const compressedSize = Math.floor(file.size * compressionRatio);
    
    return file.slice(0, compressedSize); // Mock compression
  }

  /**
   * Check if media should be compressed
   */
  private shouldCompressMedia(mediaItem: MediaItem): boolean {
    const { images, videos } = this.COMPRESSION_CONFIG;
    
    switch (mediaItem.type) {
      case 'image':
        return mediaItem.size > 1024 * 1024; // Compress images > 1MB
      case 'video':
        return mediaItem.size > videos.maxSize * 1024 * 1024; // Compress videos > max size
      default:
        return false;
    }
  }

  /**
   * Get media type from file
   */
  private getMediaType(file: File): MediaItem['type'] {
    const mimeType = file.type.toLowerCase();
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }

  /**
   * Estimate upload time based on file size and connection
   */
  private estimateUploadTime(sizeBytes: number): number {
    // Estimate based on average upload speed (1 Mbps = conservative estimate)
    const avgUploadSpeedBps = 1024 * 1024 / 8; // 1 Mbps in bytes per second
    const estimatedSeconds = sizeBytes / avgUploadSpeedBps;
    
    // Add overhead (30% extra time for processing, retries, etc.)
    return Math.ceil(estimatedSeconds * 1.3);
  }

  /**
   * Get priority weight for sorting
   */
  private getPriorityWeight(priority: PostUpload['priority']): number {
    switch (priority) {
      case 'critical': return 1;
      case 'high': return 2;
      case 'medium': return 3;
      case 'low': return 4;
      default: return 5;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    return Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 second delay
  }

  /**
   * Store post upload in IndexedDB
   */
  private async storePostUpload(post: PostUpload): Promise<void> {
    if (!this.storage) return;
    
    const document: VolunteerDocument = {
      id: post.id,
      data: post,
      timestamp: post.createdAt,
      lastModified: Date.now(),
      userId: post.userId,
      venueId: post.venueId,
      version: 1,
      synced: post.status === 'completed',
      priority: this.mapPostPriorityToStorage(post.priority),
      size: post.totalSize,
    };
    
    await this.storage.store('mediaQueue', document);
  }

  /**
   * Map post priority to storage priority
   */
  private mapPostPriorityToStorage(priority: PostUpload['priority']): 'high' | 'medium' | 'low' {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Load pending uploads from storage
   */
  private async loadPendingUploads(): Promise<void> {
    if (!this.storage) return;
    
    try {
      const storedUploads = await this.storage.query('mediaQueue', {
        filter: (doc) => !doc.deleted && doc.data.status !== 'completed'
      });
      
      for (const storedUpload of storedUploads) {
        const post = storedUpload.data as PostUpload;
        this.uploadQueue.set(post.id, post);
      }
      
      console.log(`📱 Loaded ${this.uploadQueue.size} pending media uploads from storage`);
    } catch (error) {
      console.error('Failed to load pending uploads:', error);
    }
  }

  /**
   * Start upload processing loop
   */
  private startUploadLoop(): void {
    // Check for pending uploads every 15 seconds
    setInterval(() => {
      if (navigator.onLine && this.uploadQueue.size > 0) {
        this.processUploadQueue();
      }
    }, 15 * 1000);
    
    console.log('⏰ Media upload loop started (15s interval)');
  }

  /**
   * Clean up completed uploads older than specified time
   */
  async cleanupOldUploads(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoffTime = Date.now() - maxAge;
    let removedCount = 0;
    
    for (const [postId, post] of this.uploadQueue.entries()) {
      if (post.status === 'completed' && post.createdAt < cutoffTime) {
        this.uploadQueue.delete(postId);
        
        // Remove from storage
        try {
          await this.storage?.delete('mediaQueue', postId, true);
          removedCount++;
        } catch (error) {
          console.warn(`Failed to remove old upload ${postId}:`, error);
        }
      }
    }
    
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} old media uploads`);
    }
    
    return removedCount;
  }
}

// Singleton instance
let mediaQueueInstance: MediaUploadQueue | null = null;

/**
 * Get the singleton media upload queue instance
 */
export const getMediaUploadQueue = (
  onUploadProgress?: (postId: string, progress: number) => void,
  onUploadComplete?: (postId: string, success: boolean) => void,
  onMediaProcessed?: (mediaId: string, processedUrl: string) => void
): MediaUploadQueue => {
  if (!mediaQueueInstance) {
    mediaQueueInstance = new MediaUploadQueue(onUploadProgress, onUploadComplete, onMediaProcessed);
  }
  return mediaQueueInstance;
};

export default MediaUploadQueue;