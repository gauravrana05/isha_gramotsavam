import { StorageProvider } from './types';
import { SupabaseStorageProvider } from './providers/supabase';
import { ReplitStorageProvider } from './providers/replit';
import { S3StorageProvider } from './providers/s3';

// Singleton storage provider instance
let storageProviderInstance: StorageProvider | null = null;

/**
 * Get the configured storage provider based on environment variables
 * Uses singleton pattern to avoid creating multiple instances
 */
export function getStorageProvider(): StorageProvider {
  if (storageProviderInstance) {
    return storageProviderInstance;
  }

  const provider = process.env.NEXT_PUBLIC_STORAGE_PROVIDER || process.env.STORAGE_PROVIDER || 'supabase';

  switch (provider.toLowerCase()) {
    case 'replit':
      storageProviderInstance = new ReplitStorageProvider();
      break;
      
    case 's3':
      storageProviderInstance = new S3StorageProvider();
      break;
      
    case 'supabase':
    default:
      storageProviderInstance = new SupabaseStorageProvider();
      break;
  }

  return storageProviderInstance;
}

/**
 * Reset the storage provider instance (useful for testing)
 */
export function resetStorageProvider(): void {
  storageProviderInstance = null;
}

/**
 * Initialize storage provider (create buckets, etc.)
 */
export async function initializeStorage(): Promise<void> {
  const provider = getStorageProvider();
  
  // Initialize Supabase buckets if using Supabase
  if (provider instanceof SupabaseStorageProvider) {
    await provider.initializeBuckets();
  }
  
  // Future: Add initialization for other providers as needed
}

/**
 * Get the current storage provider name
 */
export function getStorageProviderName(): string {
  return process.env.NEXT_PUBLIC_STORAGE_PROVIDER || process.env.STORAGE_PROVIDER || 'supabase';
}