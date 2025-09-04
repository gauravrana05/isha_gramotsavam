'use client';

import Image from 'next/image';

import React, { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
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
  const [showModal, setShowModal] = useState(false);

  const handleFileSelect = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  const utils = api.useUtils();

  // Use tRPC mutation for updating image upload
  const updateImageMutation = api.profile.updateImageUpload.useMutation({
    onSuccess: () => {
      utils.teams.players.getTeamPlayers.invalidate();
      utils.profile.getProfile.invalidate();
    }
  });

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
      // Create FormData for server-side upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', playerUserId);
      formData.append('documentType', documentType);

      // Upload to server-side API endpoint
      const uploadResponse = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      const downloadURL = uploadResult.url;

      // Update user document in database via tRPC
      await updateImageMutation.mutateAsync({
        userId: playerUserId,
        imageType: documentType,
        imagePath: downloadURL,
      });

      setProgress(100);
      onSuccess?.(downloadURL);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      let errorMsg = 'Upload failed. Please try again.';
      
      if (error instanceof Error) {
        // Convert technical errors to user-friendly messages
        if (error.message.includes('<!DOCTYPE') || error.message.includes('not valid JSON')) {
          errorMsg = 'Server configuration error. Please contact support.';
        } else if (error.message.includes('Network')) {
          errorMsg = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('size')) {
          errorMsg = 'File is too large. Please choose a smaller image.';
        } else if (error.message.includes('format') || error.message.includes('type')) {
          errorMsg = 'Invalid file format. Please choose a valid image file.';
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          errorMsg = 'Permission denied. Please contact support.';
        } else {
          // For other errors, show a generic message but log the actual error
          console.error('Upload error details:', error.message);
          errorMsg = 'Upload failed. Please try again or contact support if the problem persists.';
        }
      }
      
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const handleImageClick = () => {
    if (currentUrl && !uploading) {
      setShowModal(true);
    }
  };

  const renderProfileVariant = () => (
    <div className={`relative ${className}`}>
      <div className="relative mb-4">
        {currentUrl ? (
          <Image
            src={currentUrl}
            alt={label}
            width={64} height={64} className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 cursor-pointer"
            onClick={handleImageClick}
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
            <Camera width={64} height={64} className="w-12 h-12 text-gray-400" />
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
            <Camera width={64} height={64} className="w-3 h-3" />
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
    <div className={`border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-[#CE4520] transition-colors ${disabled ? 'opacity-50' : ''} ${className}`}>
      <div className="text-center">
        {currentUrl ? (
          <div className="w-full h-full mb-4">
            <Image
              src={currentUrl}
              alt={label}
              width={350}
              height={350}
              className="w-full h-full max-h-[350px] object-cover rounded-lg mx-auto border border-gray-200 cursor-pointer"
              onClick={handleImageClick}
            />
          </div>
        ) : (
          <Upload width={64} height={64} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        )}
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">{label}</h3>
        
        <button
          onClick={handleFileSelect}
          disabled={disabled || uploading}
          className="bg-[#CE4520] text-white px-4 py-2 rounded-lg hover:bg-[#1565C0] transition-colors font-fira disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <div className="flex items-center space-x-2">
              <LoadingSpinner size="xs" color="white" />
              <span>Uploading...</span>
            </div>
          ) : (
            <span>{currentUrl ? 'Replace' : 'Upload'}</span>
          )}
        </button>

        {progress > 0 && progress < 100 && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#CE4520] h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}% uploaded</p>
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
          <Image
            src={currentUrl}
            alt={label}
            width={64} height={64} className="w-12 h-12 object-cover rounded border border-gray-200 cursor-pointer"
            onClick={handleImageClick}
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
                <Upload width={64} height={64} className="w-3 h-3" />
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
              <X width={64} height={64} className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Full Screen Modal */}
      {showModal && currentUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X width={64} height={64} className="w-8 h-8" />
            </button>
            <Image
              src={currentUrl}
              alt={label}
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerDocumentUpload;