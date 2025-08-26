'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { documentUploadService } from '@/lib/services/documentUploadService';
import { api } from '@/server/trpc/react';
import type { UploadProgress } from '@/lib/storage';
import type { UserDocuments } from '@/lib/types/user';

export type DocumentType = keyof UserDocuments;

export interface DocumentState {
  url: string | null;
  uploading: boolean;
  progress: number;
  error: string | null;
}

export interface DocumentContextType {
  documents: Record<DocumentType, DocumentState>;
  uploadDocument: (type: DocumentType, file: File) => Promise<string>;
  deleteDocument: (type: DocumentType) => Promise<void>;
  replaceDocument: (type: DocumentType, file: File) => Promise<string>;
  getDocumentUrl: (type: DocumentType) => string | null;
  isUploading: (type?: DocumentType) => boolean;
  clearError: (type: DocumentType) => void;
  refreshDocuments: () => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

interface DocumentProviderProps {
  children: ReactNode;
}

export const DocumentProvider: React.FC<DocumentProviderProps> = ({ children }) => {
  const { user, userProfile } = useAuth();

  const [documents, setDocuments] = useState<Record<DocumentType, DocumentState>>({
    profilePhoto: { url: null, uploading: false, progress: 0, error: null },
    aadhaarFront: { url: null, uploading: false, progress: 0, error: null },
    aadhaarBack: { url: null, uploading: false, progress: 0, error: null },
    teamPhoto: { url: null, uploading: false, progress: 0, error: null }
  });

  // Initialize documents from user profile (based on schema structure)
  useEffect(() => {
    if (userProfile?.documents) {
      setDocuments(prev => ({
        ...prev,
        profilePhoto: {
          ...prev.profilePhoto,
          url: userProfile.documents.profilePhoto?.url || null
        },
        aadhaarFront: {
          ...prev.aadhaarFront,
          url: userProfile.documents.aadhaarFront?.url || null
        },
        aadhaarBack: {
          ...prev.aadhaarBack,
          url: userProfile.documents.aadhaarBack?.url || null
        }
      }));
    }
  }, [userProfile]);

  const updateDocumentState = useCallback((type: DocumentType, updates: Partial<DocumentState>) => {
    setDocuments(prev => ({
      ...prev,
      [type]: { ...prev[type], ...updates }
    }));
  }, []);

  const uploadDocument = useCallback(async (type: DocumentType, file: File): Promise<string> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    updateDocumentState(type, { uploading: true, progress: 0, error: null });

    try {
      const onProgress = (progress: UploadProgress) => {
        updateDocumentState(type, { progress: progress.progress });
      };

      let downloadURL: string;
      
      switch (type) {
        case 'profilePhoto':
          downloadURL = await documentUploadService.uploadProfilePhoto(user.id, file, onProgress);
          break;
        case 'aadhaarFront':
          downloadURL = await documentUploadService.uploadAadhaarFront(user.id, file, onProgress);
          break;
        case 'aadhaarBack':
          downloadURL = await documentUploadService.uploadAadhaarBack(user.id, file, onProgress);
          break;
        default:
          throw new Error(`Invalid document type: ${type}`);
      }

      // Update user document in database via direct fetch to tRPC endpoint
      const response = await fetch('/api/trpc/profile.updateImageUpload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          imageType: type,
          imagePath: downloadURL,
        }),
      });

      if (!response.ok) {
        throw new Error(`Database update failed: ${response.status}`);
      }

      await response.json();

      updateDocumentState(type, { 
        url: downloadURL, 
        uploading: false, 
        progress: 100,
        error: null 
      });

      return downloadURL;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      updateDocumentState(type, { 
        uploading: false, 
        progress: 0, 
        error: errorMessage 
      });
      throw error;
    }
  }, [user, documents, updateDocumentState]);

  const deleteDocument = useCallback(async (type: DocumentType): Promise<void> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    updateDocumentState(type, { error: null });

    try {
      // Only allow deletion for valid document types
      if (type !== 'profilePhoto' && type !== 'aadhaarFront' && type !== 'aadhaarBack') {
        throw new Error(`Invalid document type: ${type}`);
      }

      await documentUploadService.deleteDocument(user.id, type);

      // TODO: Update user document via tRPC once profile endpoints are created
      // For now, just update local state - tRPC integration pending

      updateDocumentState(type, { url: null, uploading: false, progress: 0, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      updateDocumentState(type, { error: errorMessage });
      throw error;
    }
  }, [user, updateDocumentState]);

  const replaceDocument = useCallback(async (type: DocumentType, file: File): Promise<string> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    updateDocumentState(type, { uploading: true, progress: 0, error: null });

    try {
      const onProgress = (progress: UploadProgress) => {
        updateDocumentState(type, { progress: progress.progress });
      };

      // Only allow replacement for valid document types
      if (type !== 'profilePhoto' && type !== 'aadhaarFront' && type !== 'aadhaarBack') {
        throw new Error(`Invalid document type: ${type}`);
      }

      const downloadURL = await documentUploadService.replaceDocument(user.id, type, file, onProgress);

      // TODO: Update user document via tRPC once profile endpoints are created
      // For now, just update local state - tRPC integration pending

      updateDocumentState(type, { 
        url: downloadURL, 
        uploading: false, 
        progress: 100,
        error: null 
      });

      return downloadURL;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Replace failed';
      updateDocumentState(type, { 
        uploading: false, 
        progress: 0, 
        error: errorMessage 
      });
      throw error;
    }
  }, [user, updateDocumentState]);

  const getDocumentUrl = useCallback((type: DocumentType): string | null => {
    return documents[type]?.url || null;
  }, [documents]);

  const isUploading = useCallback((type?: DocumentType): boolean => {
    if (type) {
      return documents[type]?.uploading || false;
    }
    return Object.values(documents).some(doc => doc?.uploading);
  }, [documents]);

  const clearError = useCallback((type: DocumentType) => {
    updateDocumentState(type, { error: null });
  }, [updateDocumentState]);

  const refreshDocuments = useCallback(async (): Promise<void> => {
    if (!user?.id) return;

    try {
      const types: DocumentType[] = ['profilePhoto', 'aadhaarFront', 'aadhaarBack'];
      
      for (const type of types) {
        const url = await documentUploadService.getDocumentURL(user.id, type as 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack');
        updateDocumentState(type as 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack', { url, error: null });
      }
    } catch (error) {
      // Error handling removed
    }
  }, [user, updateDocumentState]);

  const value: DocumentContextType = {
    documents,
    uploadDocument,
    deleteDocument,
    replaceDocument,
    getDocumentUrl,
    isUploading,
    clearError,
    refreshDocuments
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocument = (): DocumentContextType => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
};