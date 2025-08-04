'use client';

import { useCallback, useState } from 'react';
import { useDocument, DocumentType } from '@/context/DocumentContext';

export interface UseDocumentManagerOptions {
  onSuccess?: (type: DocumentType, url: string) => void;
  onError?: (type: DocumentType, error: string) => void;
  autoRetry?: boolean;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
}

export interface UseDocumentManagerReturn {
  // Upload operations
  uploadDocument: (type: DocumentType, file: File) => Promise<string | null>;
  replaceDocument: (type: DocumentType, file: File) => Promise<string | null>;
  deleteDocument: (type: DocumentType) => Promise<boolean>;
  
  // File validation
  validateFile: (file: File) => { valid: boolean; error?: string };
  
  // State queries
  getDocumentUrl: (type: DocumentType) => string | null;
  isUploading: (type?: DocumentType) => boolean;
  getUploadProgress: (type: DocumentType) => number;
  getError: (type: DocumentType) => string | null;
  
  // Utility methods
  clearError: (type: DocumentType) => void;
  refreshDocuments: () => Promise<void>;
  
  // Bulk operations
  uploadMultiple: (uploads: Array<{ type: DocumentType; file: File }>) => Promise<Array<{ type: DocumentType; url: string | null; error?: string }>>;
  
  // Document status
  isProfileComplete: () => boolean;
  getMissingDocuments: () => DocumentType[];
}

export const useDocumentManager = (options: UseDocumentManagerOptions = {}): UseDocumentManagerReturn => {
  const {
    onSuccess,
    onError,
    autoRetry = false,
    maxFileSize = 5, // 5MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  } = options;

  const documentContext = useDocument();
  const [retryCount, setRetryCount] = useState<Record<string, number>>({});

  // File validation
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return { valid: false, error: `File size must be less than ${maxFileSize}MB` };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only image files (JPEG, PNG, WebP) are allowed' };
    }

    // Check if file is corrupted (basic check)
    if (file.size === 0) {
      return { valid: false, error: 'File appears to be corrupted or empty' };
    }

    return { valid: true };
  }, [maxFileSize, allowedTypes]);

  // Upload with retry logic
  const uploadWithRetry = useCallback(async (
    type: DocumentType, 
    file: File,
    operation: 'upload' | 'replace'
  ): Promise<string | null> => {
    const key = `${type}-${operation}`;
    const currentRetryCount = retryCount[key] || 0;

    try {
      // Validate file before upload
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      let result: string;
      if (operation === 'upload') {
        result = await documentContext.uploadDocument(type, file);
      } else {
        result = await documentContext.replaceDocument(type, file);
      }

      // Reset retry count on success
      setRetryCount(prev => ({ ...prev, [key]: 0 }));
      
      onSuccess?.(type, result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed';
      
      // Retry logic
      if (autoRetry && currentRetryCount < 2) {
        setRetryCount(prev => ({ ...prev, [key]: currentRetryCount + 1 }));
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, currentRetryCount) * 1000));
        return uploadWithRetry(type, file, operation);
      }

      onError?.(type, errorMessage);
      return null;
    }
  }, [documentContext, validateFile, retryCount, autoRetry, onSuccess, onError]);

  // Main operations
  const uploadDocument = useCallback(async (type: DocumentType, file: File): Promise<string | null> => {
    return uploadWithRetry(type, file, 'upload');
  }, [uploadWithRetry]);

  const replaceDocument = useCallback(async (type: DocumentType, file: File): Promise<string | null> => {
    return uploadWithRetry(type, file, 'replace');
  }, [uploadWithRetry]);

  const deleteDocument = useCallback(async (type: DocumentType): Promise<boolean> => {
    try {
      await documentContext.deleteDocument(type);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      onError?.(type, errorMessage);
      return false;
    }
  }, [documentContext, onError]);

  // State queries
  const getDocumentUrl = useCallback((type: DocumentType): string | null => {
    return documentContext.getDocumentUrl(type);
  }, [documentContext]);

  const isUploading = useCallback((type?: DocumentType): boolean => {
    return documentContext.isUploading(type);
  }, [documentContext]);

  const getUploadProgress = useCallback((type: DocumentType): number => {
    return documentContext.documents[type].progress;
  }, [documentContext.documents]);

  const getError = useCallback((type: DocumentType): string | null => {
    return documentContext.documents[type].error;
  }, [documentContext.documents]);

  const clearError = useCallback((type: DocumentType) => {
    documentContext.clearError(type);
  }, [documentContext]);

  const refreshDocuments = useCallback(async (): Promise<void> => {
    await documentContext.refreshDocuments();
  }, [documentContext]);

  // Bulk operations
  const uploadMultiple = useCallback(async (
    uploads: Array<{ type: DocumentType; file: File }>
  ): Promise<Array<{ type: DocumentType; url: string | null; error?: string }>> => {
    const results = await Promise.allSettled(
      uploads.map(async ({ type, file }) => {
        const url = await uploadDocument(type, file);
        return { type, url };
      })
    );

    return results.map((result, index) => {
      const { type } = uploads[index];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          type,
          url: null,
          error: result.reason?.message || 'Upload failed'
        };
      }
    });
  }, [uploadDocument]);

  // Document status helpers
  const isProfileComplete = useCallback((): boolean => {
    const aadhaarFront = getDocumentUrl('aadhaarFront');
    const aadhaarBack = getDocumentUrl('aadhaarBack');
    return !!(aadhaarFront && aadhaarBack);
  }, [getDocumentUrl]);

  const getMissingDocuments = useCallback((): DocumentType[] => {
    const missing: DocumentType[] = [];
    const types: DocumentType[] = ['profilePhoto', 'aadhaarFront', 'aadhaarBack'];
    
    types.forEach(type => {
      if (!getDocumentUrl(type)) {
        missing.push(type);
      }
    });
    
    return missing;
  }, [getDocumentUrl]);

  return {
    // Upload operations
    uploadDocument,
    replaceDocument,
    deleteDocument,
    
    // File validation
    validateFile,
    
    // State queries
    getDocumentUrl,
    isUploading,
    getUploadProgress,
    getError,
    
    // Utility methods
    clearError,
    refreshDocuments,
    
    // Bulk operations
    uploadMultiple,
    
    // Document status
    isProfileComplete,
    getMissingDocuments
  };
};

// Specialized hooks for specific document types
export const useProfilePhoto = (options?: UseDocumentManagerOptions) => {
  const manager = useDocumentManager(options);
  
  return {
    url: manager.getDocumentUrl('profilePhoto'),
    upload: (file: File) => manager.uploadDocument('profilePhoto', file),
    replace: (file: File) => manager.replaceDocument('profilePhoto', file),
    delete: () => manager.deleteDocument('profilePhoto'),
    isUploading: manager.isUploading('profilePhoto'),
    progress: manager.getUploadProgress('profilePhoto'),
    error: manager.getError('profilePhoto'),
    clearError: () => manager.clearError('profilePhoto')
  };
};

export const useAadhaarDocuments = (options?: UseDocumentManagerOptions) => {
  const manager = useDocumentManager(options);
  
  return {
    front: {
      url: manager.getDocumentUrl('aadhaarFront'),
      upload: (file: File) => manager.uploadDocument('aadhaarFront', file),
      replace: (file: File) => manager.replaceDocument('aadhaarFront', file),
      delete: () => manager.deleteDocument('aadhaarFront'),
      isUploading: manager.isUploading('aadhaarFront'),
      progress: manager.getUploadProgress('aadhaarFront'),
      error: manager.getError('aadhaarFront'),
      clearError: () => manager.clearError('aadhaarFront')
    },
    back: {
      url: manager.getDocumentUrl('aadhaarBack'),
      upload: (file: File) => manager.uploadDocument('aadhaarBack', file),
      replace: (file: File) => manager.replaceDocument('aadhaarBack', file),
      delete: () => manager.deleteDocument('aadhaarBack'),
      isUploading: manager.isUploading('aadhaarBack'),
      progress: manager.getUploadProgress('aadhaarBack'),
      error: manager.getError('aadhaarBack'),
      clearError: () => manager.clearError('aadhaarBack')
    },
    isComplete: manager.isProfileComplete,
    uploadBoth: (frontFile: File, backFile: File) => manager.uploadMultiple([
      { type: 'aadhaarFront', file: frontFile },
      { type: 'aadhaarBack', file: backFile }
    ])
  };
};