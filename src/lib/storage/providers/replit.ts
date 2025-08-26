import { StorageProvider, ProgressCallback } from '../types';

// Placeholder implementation for future Replit storage support
export class ReplitStorageProvider implements StorageProvider {
  constructor() {
    // Future: Initialize Replit storage client
    throw new Error('Replit storage provider not yet implemented');
  }

  async upload(path: string, file: File, onProgress?: ProgressCallback): Promise<string> {
    // Future implementation for Replit storage upload
    throw new Error('Replit upload not yet implemented');
  }

  getPublicUrl(path: string): string {
    // Future implementation for Replit public URLs
    throw new Error('Replit getPublicUrl not yet implemented');
  }

  async delete(path: string): Promise<void> {
    // Future implementation for Replit file deletion
    throw new Error('Replit delete not yet implemented');
  }

  async exists(path: string): Promise<boolean> {
    // Future implementation for Replit file existence check
    throw new Error('Replit exists not yet implemented');
  }
}

// TODO: Implement Replit storage provider
// When Replit storage is available, this class should:
// 1. Initialize Replit storage client
// 2. Implement upload with progress tracking
// 3. Implement getPublicUrl for Replit URLs
// 4. Implement delete functionality
// 5. Implement exists check