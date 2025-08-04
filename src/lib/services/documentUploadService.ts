import { storage } from '@/lib/firebase/config';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

interface DocumentUploadPaths {
  profilePhoto: (userId: string) => string;
  aadhaarFront: (userId: string) => string;
  aadhaarBack: (userId: string) => string;
}

export const STORAGE_PATHS: DocumentUploadPaths = {
  profilePhoto: (userId: string) => `profilePhotos/${userId}/profile_photo`,
  aadhaarFront: (userId: string) => `aadhaar/${userId}/front_${Date.now()}`,
  aadhaarBack: (userId: string) => `aadhaar/${userId}/back_${Date.now()}`
};

export const getTeamPhotoStoragePath = (teamId: string): string => {
  return `teamPhotos/${teamId}/team_photo_${Date.now()}`;
};

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
}

export class DocumentUploadService {
  
  async uploadProfilePhoto(
    userId: string, 
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const storagePath = STORAGE_PATHS.profilePhoto(userId);
    return this.uploadFile(storagePath, file, onProgress);
  }
  
  async uploadAadhaarFront(
    userId: string, 
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const storagePath = STORAGE_PATHS.aadhaarFront(userId);
    return this.uploadFile(storagePath, file, onProgress);
  }
  
  async uploadAadhaarBack(
    userId: string, 
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const storagePath = STORAGE_PATHS.aadhaarBack(userId);
    return this.uploadFile(storagePath, file, onProgress);
  }

  async uploadTeamPhoto(
    teamId: string, 
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const storagePath = getTeamPhotoStoragePath(teamId);
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
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }

    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          // Track upload progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress({
              progress,
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes
            });
          }
        },
        (error) => {
          console.error('Upload error:', error);
          reject(new Error(`Upload failed: ${error.message}`));
        },
        async () => {
          try {
            // Get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            reject(new Error('Failed to get download URL'));
          }
        }
      );
    });
  }
  
  async getDocumentURL(
    userId: string, 
    documentType: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack'
  ): Promise<string | null> {
    try {
      const storagePath = STORAGE_PATHS[documentType](userId);
      const storageRef = ref(storage, storagePath);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.log(`Document not found: ${documentType} for user ${userId}`);
      return null;
    }
  }
  
  async checkDocumentExists(
    userId: string, 
    documentType: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack'
  ): Promise<boolean> {
    try {
      const url = await this.getDocumentURL(userId, documentType);
      return url !== null;
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
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch (error) {
      console.error(`Error deleting ${documentType} for user ${userId}:`, error);
      throw new Error(`Failed to delete ${documentType}`);
    }
  }

  async replaceDocument(
    userId: string,
    documentType: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack',
    newFile: File,
    onProgress?: (progress: UploadProgress) => void
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
      console.error(`Error replacing ${documentType}:`, error);
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