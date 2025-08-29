'use client';

import React, { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { useDocumentManager } from '@/hooks/documents';
import { DocumentType } from '@/context/DocumentContext';
import { LoadingSpinner } from '@/components/ui/loaders';
import { useAuth } from '@/context/AuthContext';
export interface DocumentUploadProps {
  type: DocumentType;
  label: string;
  currentUrl?: string | null;
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: 'default' | 'profile' | 'card';
  accept?: string;
  maxSizeMB?: number;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  type,
  label,
  currentUrl,
  onSuccess,
  onError,
  className = '',
  variant = 'default',
  accept = 'image/*',
  maxSizeMB = 5
}) => {
  const {user} = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const { uploadDocument, isUploading, getUploadProgress, getError, clearError } = useDocumentManager({
    onSuccess: async (docType, url) => {
      if (docType === type) {
        onSuccess?.(url);
      }
    },
    onError: (docType, error) => {
      if (docType === type) {
        onError?.(error);
      }
    },
    maxFileSize: maxSizeMB
  });

  const uploading = isUploading(type);
  const progress = getUploadProgress(type);
  const error = getError(type);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    clearError(type);
    await uploadDocument(type, file);
    
    // Reset input value to allow re-uploading same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          <img
            src={currentUrl}
            alt={label}
            className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 cursor-pointer"
            onClick={handleImageClick}
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
        disabled={uploading}
        className="bg-[#CE4520] text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-[#1565C0] transition-colors font-fira disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <div className="flex items-center space-x-2">
            <LoadingSpinner size="xs" color="white" />
            <span>Uploading...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Camera className="w-4 h-4" />
            <span>{currentUrl ? 'Change Photo' : 'Upload Photo'}</span>
          </div>
        )}
      </button>

      {progress > 0 && progress < 100 && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-[#CE4520] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}% uploaded</p>
        </div>
      )}

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

  const renderCardVariant = () => (
    <div className={`border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-[#CE4520] transition-colors ${className}`}>
      <div className="text-center">
        {currentUrl ? (
          <div className="mb-4 w-full h-full">
            <img
              src={currentUrl}
              alt={label}
              className="w-full h-full max-h-[400px] object-cover rounded-lg mx-auto border border-gray-200 cursor-pointer"
              onClick={handleImageClick}
            />
          </div>
        ) : (
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        )}
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">{label}</h3>
        
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
    <div className={`${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      <div className="flex items-center space-x-4">
        {currentUrl && (
          <img
            src={currentUrl}
            alt={label}
            className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer"
            onClick={handleImageClick}
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
                <Upload className="w-4 h-4" />
                <span>{currentUrl ? 'Replace File' : 'Choose File'}</span>
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
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex justify-between items-start">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={() => clearError(type)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
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
              <X className="w-8 h-8" />
            </button>
            <img
              src={currentUrl}
              alt={label}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;