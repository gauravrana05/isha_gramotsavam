'use client';

import Image from 'next/image';

import React, { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { documentUploadService } from '@/lib/services/documentUploadService';
import { LoadingSpinner } from '@/components/ui/loaders';

export interface TeamPhotoUploadProps {
  teamId: string;
  currentUrl?: string | null;
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: 'default' | 'card';
  accept?: string;
  maxSizeMB?: number;
}

const TeamPhotoUpload: React.FC<TeamPhotoUploadProps> = ({
  teamId,
  currentUrl,
  onSuccess,
  onError,
  className = '',
  variant = 'default',
  accept = 'image/*',
  maxSizeMB = 5
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

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
      formData.append('userId', teamId); // teamId is used as userId parameter for team photos
      formData.append('documentType', 'teamPhoto');

      // Upload to server-side API endpoint
      const uploadResponse = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const { url: downloadURL } = await uploadResponse.json();

      setUploading(false);
      setProgress(100);
      onSuccess?.(downloadURL);
    } catch (error) {
      let errorMessage = 'Upload failed. Please try again.';
      
      if (error instanceof Error) {
        // Convert technical errors to user-friendly messages
        if (error.message.includes('<!DOCTYPE') || error.message.includes('not valid JSON')) {
          errorMessage = 'Server configuration error. Please contact support.';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('size')) {
          errorMessage = 'File is too large. Please choose a smaller image.';
        } else if (error.message.includes('format') || error.message.includes('type')) {
          errorMessage = 'Invalid file format. Please choose a valid image file.';
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          errorMessage = 'Permission denied. Please contact support.';
        } else {
          // For other errors, show a generic message but log the actual error
          console.error('Upload error:', error.message);
          errorMessage = 'Upload failed. Please try again or contact support if the problem persists.';
        }
      }
      
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

  const renderCardVariant = () => (
    <div className={`border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-[#CE4520] transition-colors ${className}`}>
      <div className="text-center">
        {currentUrl ? (
          <div className="mb-4">
            <Image
              src={currentUrl}
              alt="Team Photo"
              width={64} height={64} className="w-32 h-20 object-cover rounded-lg mx-auto border border-gray-200"
            />
          </div>
        ) : (
          <Upload width={64} height={64} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        )}
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">Team Photo</h3>
        
        <button
          onClick={handleFileSelect}
          disabled={uploading}
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
        disabled={uploading}
      />
    </div>
  );

  const renderDefaultVariant = () => (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Team Photo
      </label>
      
      <div className="flex items-center space-x-4">
        {currentUrl && (
          <Image
            src={currentUrl}
            alt="Current Team Photo"
            width={64} height={64} className="w-20 h-20 object-cover rounded-lg border border-gray-200"
          />
        )}
        
        <div className="flex-1">
          <button
            onClick={handleFileSelect}
            disabled={uploading}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#CE4520] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="flex items-center justify-center space-x-2">
                <LoadingSpinner size="xs" color="primary" />
                <span>Uploading...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Upload width={64} height={64} className="w-4 h-4" />
                <span>{currentUrl ? 'Replace Photo' : 'Upload Photo'}</span>
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
              <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}% uploaded</p>
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
        disabled={uploading}
      />
    </div>
  );

  return (
    <div>
      {variant === 'card' ? renderCardVariant() : renderDefaultVariant()}
      
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex justify-between items-start">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600"
            >
              <X width={64} height={64} className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPhotoUpload;