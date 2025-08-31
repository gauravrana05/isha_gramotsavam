'use client';

import Image from 'next/image';

import React, { useState } from 'react';
import { Eye, Download, Trash2, CheckCircle, XCircle, X } from 'lucide-react';
import { useDocumentManager } from '@/hooks/documents';
import { DocumentType } from '@/context/DocumentContext';

export interface DocumentPreviewProps {
  type: DocumentType;
  url: string | null;
  label: string;
  verified?: boolean;
  onDelete?: () => void;
  onView?: () => void;
  className?: string;
  showActions?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  type,
  url,
  label,
  verified = false,
  onDelete,
  onView,
  className = '',
  showActions = true,
  size = 'md'
}) => {
  const { deleteDocument, isUploading } = useDocumentManager();
  const loading = isUploading(type);
  const [showModal, setShowModal] = useState(false);

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${label}?`)) {
      const success = await deleteDocument(type);
      if (success) {
        onDelete?.();
      }
    }
  };

  const handleView = () => {
    if (url) {
      setShowModal(true);
      onView?.();
    }
  };

  const handleImageClick = () => {
    if (url && !loading) {
      setShowModal(true);
    }
  };

  const handleDownload = () => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${label}_${type}`;
      link.click();
    }
  };

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  if (!url) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center ${className}`}>
        <span className="text-gray-400 text-xs text-center">No {label}</span>
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      <div className={`${sizeClasses[size]} relative`}>
        <Image
          src={url}
          alt={label}
          className="w-full h-full object-cover rounded-lg border border-gray-200 cursor-pointer"
          onClick={handleImageClick}
        />
        

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Actions Overlay */}
        {showActions && !loading && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-lg transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex space-x-2">
              <button
                onClick={handleView}
                className="p-2 bg-white rounded-full text-gray-700 hover:text-blue-600 transition-colors"
                title="View"
              >
                <Eye width={64} height={64} className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleDownload}
                className="p-2 bg-white rounded-full text-gray-700 hover:text-green-600 transition-colors"
                title="Download"
              >
                <Download width={64} height={64} className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleDelete}
                className="p-2 bg-white rounded-full text-gray-700 hover:text-red-600 transition-colors"
                title="Delete"
              >
                <Trash2 width={64} height={64} className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Label */}
      <div className="mt-2 text-center">
        <p className="text-xs font-medium text-gray-700">{label}</p>
      </div>

      {/* Full Screen Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X width={64} height={64} className="w-8 h-8" />
            </button>
            <Image
              src={url!}
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

export default DocumentPreview;