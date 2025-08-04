'use client';

import React, { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { documentUploadService } from '@/lib/services/documentUploadService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { LoadingSpinner } from '@/components/ui/loaders';

export type PlayerDocumentType = 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack';

export interface PlayerDocumentUploadProps {
  playerId: string;
  playerUserId: string;
  documentType: PlayerDocumentType;
  label: string;
  currentUrl?: string | null;
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
  onProfileComplete?: (isComplete: boolean) => void;
  className?: string;
  variant?: 'default' | 'profile' | 'card';
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
}

const PlayerDocumentUpload: React.FC<PlayerDocumentUploadProps> = ({
  playerId,
  playerUserId,
  documentType,
  label,
  currentUrl,
  onSuccess,
  onError,
  onProfileComplete,
  className = '',
  variant = 'default',
  accept = 'image/*',
  maxSizeMB = 5,
  disabled = false
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !playerUserId) return;

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      const errorMsg = `File size must be less than ${maxSizeMB}MB`;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      let downloadURL: string;
      
      // Use appropriate upload method based on document type
      switch (documentType) {
        case 'profilePhoto':
          downloadURL = await documentUploadService.uploadProfilePhoto(
            playerUserId,
            file,
            (progress) => setProgress(progress.progress)
          );
          break;
        case 'aadhaarFront':
          downloadURL = await documentUploadService.uploadAadhaarFront(
            playerUserId,
            file,
            (progress) => setProgress(progress.progress)
          );
          break;
        case 'aadhaarBack':
          downloadURL = await documentUploadService.uploadAadhaarBack(
            playerUserId,
            file,
            (progress) => setProgress(progress.progress)
          );
          break;
        default:
          throw new Error(`Invalid document type: ${documentType}`);
      }

      // Update the player's user document in the users collection
      const playerDocRef = doc(db, "users", playerUserId);
      const updateData: any = {
        [`documents.${documentType}.storagePath`]: documentUploadService.getStoragePath(playerUserId, documentType),
        [`documents.${documentType}.url`]: downloadURL,
        [`documents.${documentType}.verified`]: false,
        [`documents.${documentType}.uploadedAt`]: serverTimestamp(),
        [`documents.${documentType}.uploadedBy`]: user.uid,
        [`documents.${documentType}.uploadedByCaptain`]: true,
        updatedAt: serverTimestamp()
      };

      // Note: Profile completion will be handled by checkAndUpdateProfileCompletion 
      // in the parent component after this upload succeeds

      await updateDoc(playerDocRef, updateData);

      setUploading(false);
      setProgress(100);
      onSuccess?.(downloadURL);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setError(errorMessage);
      setUploading(false);
      setProgress(0);
      onError?.(errorMessage);
    }

    // Reset input value to allow re-uploading same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearError = () => {
    setError(null);
  };

  const renderProfileVariant = () => (
    <div className={`relative ${className}`}>
      <div className="relative mb-4">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={label}
            className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
            <Camera className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <LoadingSpinner size="sm" color="white" />
          </div>
        )}
      </div>

      <button
        onClick={handleFileSelect}
        disabled={disabled || uploading}
        className="bg-[#CE4520] text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-[#1565C0] transition-colors font-fira disabled:opacity-50 disabled:cursor-not-allowed text-xs"
      >
        {uploading ? (
          <div className="flex items-center space-x-1">
            <LoadingSpinner size="xs" color="white" />
            <span>Uploading...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1">
            <Camera className="w-3 h-3" />
            <span>{currentUrl ? 'Change' : 'Upload'}</span>
          </div>
        )}
      </button>

      {progress > 0 && progress < 100 && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-[#CE4520] h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}%</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />
    </div>
  );

  const renderCardVariant = () => (
    <div className={`border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-[#CE4520] transition-colors ${disabled ? 'opacity-50' : ''} ${className}`}>
      <div className="text-center">
        {currentUrl ? (
          <div className="mb-3">
            <img
              src={currentUrl}
              alt={label}
              className="w-32 h-20 object-cover rounded-lg mx-auto border border-gray-200"
            />
          </div>
        ) : (
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        )}
        
        <h4 className="text-sm font-medium text-gray-900 mb-2">{label}</h4>
        
        <button
          onClick={handleFileSelect}
          disabled={disabled || uploading}
          className="bg-[#CE4520] text-white px-3 py-1 rounded text-xs hover:bg-[#1565C0] transition-colors font-fira disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <div className="flex items-center space-x-1">
              <LoadingSpinner size="xs" color="white" />
              <span>Uploading...</span>
            </div>
          ) : (
            <span>{currentUrl ? 'Replace' : 'Upload'}</span>
          )}
        </button>

        {progress > 0 && progress < 100 && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-[#CE4520] h-1 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}%</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />
    </div>
  );

  const renderDefaultVariant = () => (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      
      <div className="flex items-center space-x-2">
        {currentUrl && (
          <img
            src={currentUrl}
            alt={label}
            className="w-12 h-12 object-cover rounded border border-gray-200"
          />
        )}
        
        <div className="flex-1">
          <button
            onClick={handleFileSelect}
            disabled={disabled || uploading}
            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#CE4520] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="flex items-center justify-center space-x-1">
                <LoadingSpinner size="xs" color="primary" />
                <span>Uploading...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-1">
                <Upload className="w-3 h-3" />
                <span>{currentUrl ? 'Replace' : 'Upload'}</span>
              </div>
            )}
          </button>

          {progress > 0 && progress < 100 && (
            <div className="mt-1">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-[#CE4520] h-1 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}%</p>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />
    </div>
  );

  const renderContent = () => {
    switch (variant) {
      case 'profile':
        return renderProfileVariant();
      case 'card':
        return renderCardVariant();
      default:
        return renderDefaultVariant();
    }
  };

  return (
    <div>
      {renderContent()}
      
      {error && (
        <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded">
          <div className="flex justify-between items-start">
            <p className="text-red-600 text-xs">{error}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerDocumentUpload;