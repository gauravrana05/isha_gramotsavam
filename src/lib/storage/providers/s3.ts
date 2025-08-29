import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { StorageProvider, ProgressCallback } from '../types';

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private region: string;

  constructor() {
    // Get configuration from environment variables
    const region = process.env.AWS_S3_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const bucket = process.env.AWS_S3_BUCKET;

    if (!region || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error('Missing required S3 configuration. Please set AWS_S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET environment variables.');
    }

    this.region = region;
    this.bucket = bucket;

    // Initialize S3 client
    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async upload(path: string, file: File, onProgress?: ProgressCallback): Promise<string> {
    try {
      // Validate file
      if (!file || file.size === 0) {
        throw new Error('Invalid file');
      }

      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        throw new Error('File size must be less than 100MB');
      }

      // Clean the path (remove leading slash if present)
      const key = path.startsWith('/') ? path.slice(1) : path;

      // Use multipart upload with progress tracking
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: file,
          ContentType: file.type || 'application/octet-stream',
          CacheControl: 'max-age=3600',
        },
      });

      // Track upload progress
      if (onProgress) {
        upload.on('httpUploadProgress', (progress) => {
          if (progress.loaded && progress.total) {
            onProgress({
              progress: Math.round((progress.loaded / progress.total) * 100),
              bytesTransferred: progress.loaded,
              totalBytes: progress.total,
              fileName: file.name,
            });
          }
        });
      }

      await upload.done();

      // Return the public URL
      return this.getPublicUrl(path);
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(error instanceof Error ? error.message : 'S3 upload failed');
    }
  }

  getPublicUrl(path: string): string {
    // Clean the path (remove leading slash if present)
    const key = path.startsWith('/') ? path.slice(1) : path;
    
    // Generate standard S3 public URL
    // Format: https://bucket-name.s3.region.amazonaws.com/key
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encodeURIComponent(key)}`;
  }

  async delete(path: string): Promise<void> {
    try {
      // Clean the path (remove leading slash if present)
      const key = path.startsWith('/') ? path.slice(1) : path;

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error(error instanceof Error ? error.message : 'S3 delete failed');
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      // Clean the path (remove leading slash if present)
      const key = path.startsWith('/') ? path.slice(1) : path;

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      // If the error is 404 (Not Found), the object doesn't exist
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      
      // For other errors, log them but return false
      console.error('S3 exists check error:', error);
      return false;
    }
  }
}