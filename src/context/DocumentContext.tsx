'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { documentUploadService, UploadProgress } from '@/lib/services/documentUploadService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
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
    aadhaarBack: { url: null, uploading: false, progress: 0, error: null }
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
    if (!user?.uid) {
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
          downloadURL = await documentUploadService.uploadProfilePhoto(user.uid, file, onProgress);
          break;
        case 'aadhaarFront':
          downloadURL = await documentUploadService.uploadAadhaarFront(user.uid, file, onProgress);
          break;
        case 'aadhaarBack':
          downloadURL = await documentUploadService.uploadAadhaarBack(user.uid, file, onProgress);
          break;
        default:
          throw new Error(`Invalid document type: ${type}`);
      }

      // Update Firestore user document with both storagePath and url
      const storagePath = documentUploadService.getStoragePath(user.uid, type);
      const userRef = doc(db, 'users', user.uid);
      const updateData: any = {
        [`documents.${type}.storagePath`]: storagePath,
        [`documents.${type}.url`]: downloadURL,
        [`documents.${type}.uploadedAt`]: serverTimestamp(),
        [`documents.${type}.uploadedBy`]: user.uid,
        [`documents.${type}.verified`]: false, // Admin needs to verify
        updatedAt: serverTimestamp()
      };

      // Check if profile is complete with both Aadhaar documents
      if (type === 'aadhaarFront' || type === 'aadhaarBack') {
        const hasAadhaarFront = type === 'aadhaarFront' || documents.aadhaarFront.url;
        const hasAadhaarBack = type === 'aadhaarBack' || documents.aadhaarBack.url;
        
        if (hasAadhaarFront && hasAadhaarBack) {
          updateData.isProfileComplete = true;
        }
      }

      await updateDoc(userRef, updateData);

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
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    updateDocumentState(type, { error: null });

    try {
      await documentUploadService.deleteDocument(user.uid, type);

      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      const updateData: any = {
        [`documents.${type}`]: null
      };

      // Update profile completion status if deleting Aadhaar documents
      if (type === 'aadhaarFront' || type === 'aadhaarBack') {
        updateData.isProfileComplete = false;
      }

      await updateDoc(userRef, updateData);

      updateDocumentState(type, { url: null, uploading: false, progress: 0, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      updateDocumentState(type, { error: errorMessage });
      throw error;
    }
  }, [user, updateDocumentState]);

  const replaceDocument = useCallback(async (type: DocumentType, file: File): Promise<string> => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    updateDocumentState(type, { uploading: true, progress: 0, error: null });

    try {
      const onProgress = (progress: UploadProgress) => {
        updateDocumentState(type, { progress: progress.progress });
      };

      const downloadURL = await documentUploadService.replaceDocument(user.uid, type, file, onProgress);

      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        [`documents.${type}.url`]: downloadURL,
        [`documents.${type}.uploadedAt`]: new Date().toISOString()
      });

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
    return documents[type].url;
  }, [documents]);

  const isUploading = useCallback((type?: DocumentType): boolean => {
    if (type) {
      return documents[type].uploading;
    }
    return Object.values(documents).some(doc => doc.uploading);
  }, [documents]);

  const clearError = useCallback((type: DocumentType) => {
    updateDocumentState(type, { error: null });
  }, [updateDocumentState]);

  const refreshDocuments = useCallback(async (): Promise<void> => {
    if (!user?.uid) return;

    try {
      const types: DocumentType[] = ['profilePhoto', 'aadhaarFront', 'aadhaarBack'];
      
      for (const type of types) {
        const url = await documentUploadService.getDocumentURL(user.uid, type);
        updateDocumentState(type, { url, error: null });
      }
    } catch (error) {
      console.error('Error refreshing documents:', error);
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