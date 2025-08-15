'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image, Video, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Progress from '@/components/ui/progress/ProgressBar';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useMediaUpload } from '@/hooks/media/useMediaUpload';
import { MediaMetadata, MEDIA_CONFIG } from '@/lib/types/media';

interface MediaUploadProps {
  venueId: string;
  contextType?: 'fixture' | 'match' | null;
  contextId?: string | null;
  fixtureId?: string;
  matchId?: string;
  onUploadComplete?: (results: any[]) => void;
  onUploadError?: (error: string) => void;
  multiple?: boolean;
  acceptedTypes?: 'image' | 'video' | 'all';
}

interface FileWithMetadata {
  file: File;
  id: string;
  preview?: string;
  metadata: MediaMetadata;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  venueId,
  contextType,
  contextId,
  fixtureId,
  matchId,
  onUploadComplete,
  onUploadError,
  multiple = true,
  acceptedTypes = 'all'
}) => {
  // Support both new context props and legacy props
  const effectiveContextType = contextType || (fixtureId ? 'fixture' : matchId ? 'match' : null);
  const effectiveContextId = contextId || fixtureId || matchId;
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadResults, setUploadResults] = useState<Record<string, { success: boolean; error?: string }>>({});
  
  const { uploadFixtureMedia, uploadMatchMedia, uploadVenueMedia, uploadMultipleMedia } = useMediaUpload();

  const getAcceptedMimeTypes = useCallback(() => {
    const imageTypes = MEDIA_CONFIG.ALLOWED_TYPES.IMAGE;
    const videoTypes = MEDIA_CONFIG.ALLOWED_TYPES.VIDEO;
    
    switch (acceptedTypes) {
      case 'image':
        return imageTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {});
      case 'video':
        return videoTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {});
      default:
        return [...imageTypes, ...videoTypes].reduce((acc, type) => ({ ...acc, [type]: [] }), {});
    }
  }, [acceptedTypes]);

  const validateFile = useCallback((file: File): string | null => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return 'File must be an image or video';
    }
    
    const mediaType = isImage ? 'IMAGE' : 'VIDEO';
    const maxSize = MEDIA_CONFIG.MAX_FILE_SIZE[mediaType];
    const allowedTypes = MEDIA_CONFIG.ALLOWED_TYPES[mediaType];
    
    if (file.size > maxSize) {
      const sizeMB = Math.round(maxSize / (1024 * 1024));
      return `File size must be less than ${sizeMB}MB`;
    }

    // Fix: allowedTypes may be string[] but TS error expects never[] if not typed properly.
    // To resolve, ensure allowedTypes is string[] and file.type is string.
    if (Array.isArray(allowedTypes) && !allowedTypes.includes(file.type)) {
      return `File type ${file.type} not supported`;
    }

    return null;
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles: FileWithMetadata[] = [];
    
    acceptedFiles.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        onUploadError?.(error);
        return;
      }
      
      const fileWithMetadata: FileWithMetadata = {
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          title: file.name.replace(/\.[^/.]+$/, ''),
          description: '',
          tags: [],
          capturedDuring: 'match',
          location: ''
        }
      };
      
      if (file.type.startsWith('image/')) {
        fileWithMetadata.preview = URL.createObjectURL(file);
      }
      
      validFiles.push(fileWithMetadata);
    });
    
    if (!multiple && validFiles.length > 0) {
      setFiles([validFiles[0]]);
    } else {
      setFiles(prev => [...prev, ...validFiles]);
    }
  }, [validateFile, multiple, onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: getAcceptedMimeTypes(),
    multiple,
    disabled: uploading
  });

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== fileId);
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return newFiles;
    });
    
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
    
    setUploadResults(prev => {
      const newResults = { ...prev };
      delete newResults[fileId];
      return newResults;
    });
  }, []);

  const updateFileMetadata = useCallback((fileId: string, metadata: Partial<MediaMetadata>) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, metadata: { ...f.metadata, ...metadata } }
        : f
    ));
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setUploadProgress({});
    setUploadResults({});
    
    try {
      if (files.length === 1) {
        // Single file upload
        const fileData = files[0];
        const progressCallback = (progress: any) => {
          setUploadProgress({ [fileData.id]: progress.progress });
        };
        
        let result;
        if (effectiveContextType === 'fixture' && effectiveContextId) {
          result = await uploadFixtureMedia(effectiveContextId, venueId, fileData.file, fileData.metadata);
        } else if (effectiveContextType === 'match' && effectiveContextId) {
          result = await uploadMatchMedia(effectiveContextId, venueId, fileData.file, fileData.metadata);
        } else {
          result = await uploadVenueMedia(venueId, fileData.file, fileData.metadata);
        }
        
        setUploadResults({ [fileData.id]: result });
        
        if (result.success) {
          onUploadComplete?.([result]);
          setFiles([]);
        } else {
          onUploadError?.(result.error || 'Upload failed');
        }
      } else {
        // Multiple file upload
        const uploads = files.map(fileData => ({
          file: fileData.file,
          metadata: fileData.metadata,
          context: effectiveContextType === 'fixture' && effectiveContextId
            ? { type: 'fixture' as const, fixtureId: effectiveContextId, venueId }
            : effectiveContextType === 'match' && effectiveContextId
            ? { type: 'match' as const, matchId: effectiveContextId, venueId }
            : { type: 'venue' as const, venueId }
        }));
        
        const result = await uploadMultipleMedia(uploads);
        
        // Update results for each file
        const newResults: Record<string, { success: boolean; error?: string }> = {};
        files.forEach((fileData, index) => {
          const uploadResult = result.results[index];
          newResults[fileData.id] = uploadResult;
        });
        setUploadResults(newResults);
        
        if (result.success) {
          onUploadComplete?.(result.results);
          setFiles([]);
        } else {
          onUploadError?.(result.errors?.join(', ') || 'Some uploads failed');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onUploadError?.(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8">
      {/* Hero Upload Area */}
      <div className="relative">
        <div
          {...getRootProps()}
          className={`
            relative overflow-hidden rounded-2xl p-6 md:p-12 text-center cursor-pointer transition-all duration-300 ease-in-out
            ${isDragActive 
              ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 scale-[1.02] shadow-xl' 
              : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 hover:from-blue-100 hover:via-indigo-100 hover:to-purple-100 border-2 border-dashed border-blue-200 hover:border-blue-300'
            }
            ${uploading ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-lg'}
            min-h-[250px] md:min-h-[300px] flex flex-col items-center justify-center
          `}
        >
          <input {...getInputProps()} />
          
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
            <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-1/4 left-1/3 w-32 h-32 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
          </div>

          {/* Upload Icon */}
          <div className={`
            relative z-10 mb-4 md:mb-6 p-4 md:p-6 rounded-full transition-all duration-300
            ${isDragActive 
              ? 'bg-white/20 backdrop-blur-sm' 
              : 'bg-white/60 hover:bg-white/80 shadow-lg'
            }
          `}>
            <Upload className={`
              h-12 w-12 md:h-16 md:w-16 transition-all duration-300
              ${isDragActive ? 'text-white scale-110' : 'text-blue-600 hover:scale-105'}
            `} />
          </div>

          {/* Upload Text */}
          <div className="relative z-10">
            {isDragActive ? (
              <div className="text-white">
                <h3 className="text-xl md:text-2xl font-bold mb-2">Drop your files here!</h3>
                <p className="text-base md:text-lg opacity-90">We&apos;ll handle the rest</p>
              </div>
            ) : (
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                  Upload Your Media
                </h3>
                <p className="text-sm md:text-lg text-gray-600 mb-4">
                  <span className="hidden md:inline">Drag & drop files here, or click to browse</span>
                  <span className="md:hidden">Tap to browse files</span>
                </p>
                <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 text-xs md:text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                    <span>Images up to 10MB</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
                    <span>Videos up to 100MB</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Supported Formats */}
          <div className={`
            relative z-10 mt-4 md:mt-6 flex flex-wrap justify-center gap-1 md:gap-2
            ${isDragActive ? 'text-white/80' : 'text-gray-400'}
          `}>
            {['JPG', 'PNG', 'MP4', 'MOV', 'WEBP'].map((format) => (
              <span key={format} className="px-2 md:px-3 py-1 bg-white/10 rounded-full text-xs font-medium backdrop-blur-sm">
                {format}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Files Ready for Upload */}
      {files.length > 0 && (
        <div className="space-y-6">
          {/* Header with Upload Button */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900">
                Ready to Upload ({files.length})
              </h3>
              <p className="text-sm md:text-base text-gray-600">Review and add details to your media</p>
            </div>
            {!uploading && Object.keys(uploadResults).length === 0 && (
              <Button 
                onClick={handleUpload} 
                className="w-full md:w-auto px-4 md:px-8 py-3 md:py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm md:text-base"
              >
                <Upload className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">Upload {files.length} {files.length === 1 ? 'File' : 'Files'}</span>
              </Button>
            )}
          </div>

          {/* File Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {files.map((fileData) => (
              <div key={fileData.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* File Preview Header */}
                <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100">
                  {fileData.file.type.startsWith('image/') && fileData.preview ? (
                    <img
                      src={fileData.preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Video className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                  
                  {/* File Type Badge */}
                  <div className="absolute top-3 left-3">
                    <Badge 
                      variant={fileData.file.type.startsWith('image/') ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {fileData.file.type.startsWith('image/') ? (
                        <>
                          <Image className="h-3 w-3 mr-1" />
                          IMAGE
                        </>
                      ) : (
                        <>
                          <Video className="h-3 w-3 mr-1" />
                          VIDEO
                        </>
                      )}
                    </Badge>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFile(fileData.id)}
                    disabled={uploading}
                    className="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Status Indicators */}
                  {uploadResults[fileData.id] && (
                    <div className="absolute bottom-3 right-3">
                      {uploadResults[fileData.id].success ? (
                        <div className="bg-green-500 text-white p-2 rounded-full">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="bg-red-500 text-white p-2 rounded-full">
                          <AlertCircle className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                {uploadProgress[fileData.id] !== undefined && (
                  <div className="px-4 py-2 bg-blue-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-blue-600">Uploading...</span>
                      <span className="text-sm text-blue-600">{Math.round(uploadProgress[fileData.id])}%</span>
                    </div>
                    {/* Progress is a custom component, but it does na prop. */}
                    <div className="relative w-full h-2 bg-blue-200 rot accept 'value' as ounded">
                      <div
                        className="absolute left-0 top-0 h-2 bg-blue-600 rounded"
                        style={{
                          width: `${uploadProgress[fileData.id]}%`,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {uploadResults[fileData.id] && !uploadResults[fileData.id].success && (
                  <div className="px-4 py-3 bg-red-50 border-t border-red-100">
                    <p className="text-sm text-red-600">
                      {uploadResults[fileData.id].error}
                    </p>
                  </div>
                )}

                {/* File Info & Metadata */}
                <div className="p-4 space-y-4">
                  <div>
                    <p className="font-medium text-gray-900 truncate" title={fileData.file.name}>
                      {fileData.file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(fileData.file.size)}
                    </p>
                  </div>

                  {/* Metadata Form - Only show if not uploading and no results */}
                  {!uploading && !uploadResults[fileData.id] && (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`title-${fileData.id}`} className="text-sm font-medium">Title</Label>
                        <Input
                          id={`title-${fileData.id}`}
                          value={fileData.metadata.title}
                          onChange={(e) => updateFileMetadata(fileData.id, { title: e.target.value })}
                          placeholder="Enter title"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`captured-${fileData.id}`} className="text-sm font-medium">Context</Label>
                        <Select
                          value={fileData.metadata.capturedDuring}
                          onValueChange={(value) => updateFileMetadata(fileData.id, { capturedDuring: value as any })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="When was this captured?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pre-match">Pre-match</SelectItem>
                            <SelectItem value="match">During Match</SelectItem>
                            <SelectItem value="post-match">Post-match</SelectItem>
                            <SelectItem value="ceremony">Ceremony</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor={`description-${fileData.id}`} className="text-sm font-medium">Description</Label>
                        <Textarea
                          id={`description-${fileData.id}`}
                          value={fileData.metadata.description || ''}
                          onChange={(e) => updateFileMetadata(fileData.id, { description: e.target.value })}
                          placeholder="What's happening here?"
                          rows={2}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`tags-${fileData.id}`} className="text-sm font-medium">Tags</Label>
                        <Input
                          id={`tags-${fileData.id}`}
                          value={fileData.metadata.tags?.join(', ') || ''}
                          onChange={(e) => updateFileMetadata(fileData.id, { 
                            tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                          })}
                          placeholder="goal, celebration, team-photo"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};