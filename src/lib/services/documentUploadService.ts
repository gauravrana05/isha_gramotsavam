import { getStorageProvider, generateStoragePath } from '@/lib/storage';
import type { ProgressCallback, UploadProgress } from '@/lib/storage';

interface DocumentUploadPaths {
  profilePhoto: (userId: string) => string;
  aadhaarFront: (userId: string) => string;
  aadhaarBack: (userId: string) => string;
}

// Helper function to get file extension from file
const getFileExtension = (file: File): string => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension || 'jpg';
};

export const STORAGE_PATHS: DocumentUploadPaths = {
  profilePhoto: (userId: string) => generateStoragePath.profilePhoto(userId),
  aadhaarFront: (userId: string) => generateStoragePath.aadhaarFront(userId),
  aadhaarBack: (userId: string) => generateStoragePath.aadhaarBack(userId)
};

export const getTeamPhotoStoragePath = (teamId: string): string => {
  return generateStoragePath.teamPhoto(teamId);
};

export class DocumentUploadService {
  
  async uploadProfilePhoto(
    userId: string, 
    file: File, 
    onProgress?: ProgressCallback
  ): Promise<string> {
    const extension = getFileExtension(file);
    const storagePath = generateStoragePath.profilePhoto(userId, extension);
    return this.uploadFile(storagePath, file, onProgress);
  }
  
  async uploadAadhaarFront(
    userId: string, 
    file: File, 
    onProgress?: ProgressCallback
  ): Promise<string> {
    const extension = getFileExtension(file);
    const storagePath = generateStoragePath.aadhaarFront(userId, extension);
    return this.uploadFile(storagePath, file, onProgress);
  }
  
  async uploadAadhaarBack(
    userId: string, 
    file: File, 
    onProgress?: ProgressCallback
  ): Promise<string> {
    const extension = getFileExtension(file);
    const storagePath = generateStoragePath.aadhaarBack(userId, extension);
    return this.uploadFile(storagePath, file, onProgress);
  }

  async uploadTeamPhoto(
    teamId: string, 
    file: File, 
    onProgress?: ProgressCallback
  ): Promise<string> {
    const extension = getFileExtension(file);
    const storagePath = generateStoragePath.teamPhoto(teamId, extension);
    return this.uploadFile(storagePath, file, onProgress);
  }

  getStoragePath(
    userId: string, 
    documentType: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack'
  ): string {
    return STORAGE_PATHS[documentType](userId);
  }
  
  private async uploadFile(
    storagePath: string, 
    file: File, 
    onProgress?: ProgressCallback
  ): Promise<string> {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }

    const storageProvider = getStorageProvider();
    return await storageProvider.upload(storagePath, file, onProgress);
  }
  
  async getDocumentURL(
    userId: string, 
    documentType: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack'
  ): Promise<string | null> {
    try {
      const storagePath = STORAGE_PATHS[documentType](userId);
      const storageProvider = getStorageProvider();
      return storageProvider.getPublicUrl(storagePath);
    } catch (error) {
      return null;
    }
  }
  
  async checkDocumentExists(
    userId: string, 
    documentType: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack'
  ): Promise<boolean> {
    try {
      const storagePath = STORAGE_PATHS[documentType](userId);
      const storageProvider = getStorageProvider();
      
      // Use exists method if available, otherwise fallback to URL check
      if (storageProvider.exists) {
        return await storageProvider.exists(storagePath);
      } else {
        const url = await this.getDocumentURL(userId, documentType);
        return url !== null;
      }
    } catch {
      return false;
    }
  }

  async deleteDocument(
    userId: string,
    documentType: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack'
  ): Promise<void> {
    try {
      const storagePath = STORAGE_PATHS[documentType](userId);
      const storageProvider = getStorageProvider();
      await storageProvider.delete(storagePath);
    } catch (error) {
      throw new Error(`Failed to delete ${documentType}`);
    }
  }

  async replaceDocument(
    userId: string,
    documentType: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack',
    newFile: File,
    onProgress?: ProgressCallback
  ): Promise<string> {
    try {
      // Delete existing document if it exists
      if (await this.checkDocumentExists(userId, documentType)) {
        await this.deleteDocument(userId, documentType);
      }
      
      // Upload new document
      switch (documentType) {
        case 'profilePhoto':
          return await this.uploadProfilePhoto(userId, newFile, onProgress);
        case 'aadhaarFront':
          return await this.uploadAadhaarFront(userId, newFile, onProgress);
        case 'aadhaarBack':
          return await this.uploadAadhaarBack(userId, newFile, onProgress);
        default:
          throw new Error(`Invalid document type: ${documentType}`);
      }
    } catch (error) {
      throw error;
    }
  }

  // Utility method to validate Aadhaar document
  async validateAadhaarDocument(file: File): Promise<boolean> {
    // Add client-side validation logic
    // This is a placeholder - you would implement actual validation
    
    // Check file size
    if (file.size > 5 * 1024 * 1024) return false;
    
    // Check file type
    if (!file.type.startsWith('image/')) return false;
    
    // Additional validation could include:
    // - Image quality check
    // - OCR validation
    // - Format validation
    
    return true;
  }

}

// Export singleton instance
export const documentUploadService = new DocumentUploadService();