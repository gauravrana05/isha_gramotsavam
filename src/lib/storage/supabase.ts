import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mvvbnuzqngloikfyzjya.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dmJudXpxbmdsb2lrZnl6anlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwOTAxODgsImV4cCI6MjA3MTY2NjE4OH0.gwgPJPIEhc_HVnbHPsRxY_MzOLVVVN88lqRKrRxLfNA'
const supabaseStorageEndpoint = 'https://mvvbnuzqngloikfyzjya.storage.supabase.co/storage/v1/s3'

export const supabase = createClient(supabaseUrl, supabaseKey)

export const storage = {
  // Upload file to Supabase storage
  upload: async (bucket: string, path: string, file: File) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    return data
  },

  // Get public URL for a file
  getPublicUrl: (bucket: string, path: string) => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  },

  // Delete file from storage
  remove: async (bucket: string, paths: string[]) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove(paths)

    if (error) {
      throw new Error(`Delete failed: ${error.message}`)
    }

    return data
  },

  // Create storage bucket
  createBucket: async (bucketName: string, options?: { public: boolean }) => {
    const { data, error } = await supabase.storage
      .createBucket(bucketName, {
        public: options?.public ?? false,
        allowedMimeTypes: ['image/*', 'application/pdf'],
        fileSizeLimit: 10485760, // 10MB
      })

    if (error) {
      throw new Error(`Bucket creation failed: ${error.message}`)
    }

    return data
  }
}

// Storage bucket configurations
export const STORAGE_BUCKETS = {
  PROFILE_IMAGES: 'profile-images',
  TEAM_PHOTOS: 'team-photos', 
  DOCUMENTS: 'documents',
  MEDIA_UPLOADS: 'media-uploads'
} as const

// Helper function to generate file paths
export const generateStoragePath = {
  profileImages: (userId: string, fileName: string) => 
    `${userId}/profile/${fileName}`,
  
  aadhaarDocument: (userId: string, type: 'front' | 'back', fileName: string) =>
    `${userId}/documents/aadhaar_${type}/${fileName}`,
  
  teamPhoto: (teamId: string, fileName: string) =>
    `${teamId}/photos/${fileName}`,
  
  mediaUpload: (userId: string, mediaType: string, fileName: string) =>
    `${userId}/media/${mediaType}/${fileName}`,
}