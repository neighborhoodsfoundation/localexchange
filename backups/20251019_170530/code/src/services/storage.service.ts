/**
 * Storage Service
 * 
 * Provides core file storage operations using AWS S3:
 * - File upload with multipart support
 * - File download and streaming
 * - File deletion and cleanup
 * - Signed URL generation for secure access
 * - File metadata management
 * - Progress tracking for uploads
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  PutObjectCommandInput,
  GetObjectCommandInput,
  DeleteObjectCommandInput,
  HeadObjectCommandInput,
  CopyObjectCommandInput,
  ListObjectsV2CommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { getS3Client, s3Config } from '../config/s3';
import { Readable } from 'stream';
import mime from 'mime-types';

/**
 * File Upload Options
 */
export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read';
  cacheControl?: string;
  onProgress?: (progress: number) => void;
}

/**
 * File Metadata
 */
export interface FileMetadata {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  etag: string;
  metadata?: Record<string, string>;
}

/**
 * Storage Service Class
 */
export class StorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.s3Client = getS3Client();
    this.bucket = s3Config.bucket;
  }

  /**
   * Upload File to S3
   */
  async uploadFile(
    key: string,
    data: Buffer | Readable | string,
    options: UploadOptions = {}
  ): Promise<{ key: string; url: string; etag: string }> {
    try {
      // Determine content type
      const contentType = options.contentType || mime.lookup(key) || 'application/octet-stream';

      // Validate file size if it's a Buffer
      if (Buffer.isBuffer(data) && data.length > 10 * 1024 * 1024) { // 10MB max
        throw new Error(`File size exceeds maximum allowed size of 10MB`);
      }

      // Validate content type
      if (!this.isAllowedContentType(contentType)) {
        throw new Error(`Content type ${contentType} is not allowed`);
      }

      const params: PutObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        ACL: options.acl || 'private',
        CacheControl: options.cacheControl || 'public, max-age=31536000',
        Metadata: options.metadata,
      };

      // Use multipart upload for large files
      if (Buffer.isBuffer(data) && data.length > 5 * 1024 * 1024) {
        return await this.multipartUpload(key, data, params, options.onProgress);
      }

      // Regular upload for smaller files
      const command = new PutObjectCommand(params);
      const result = await this.s3Client.send(command);

      const url = this.getPublicUrl(key);

      return {
        key,
        url,
        etag: result.ETag || '',
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Failed to upload file: ${(error as Error).message}`);
    }
  }

  /**
   * Multipart Upload for Large Files
   */
  private async multipartUpload(
    key: string,
    _data: Buffer,
    params: PutObjectCommandInput,
    onProgress?: (progress: number) => void
  ): Promise<{ key: string; url: string; etag: string }> {
    const upload = new Upload({
      client: this.s3Client,
      params,
    });

    if (onProgress) {
      upload.on('httpUploadProgress', (progress) => {
        if (progress.loaded && progress.total) {
          const percentage = (progress.loaded / progress.total) * 100;
          onProgress(percentage);
        }
      });
    }

    const result = await upload.done();

    return {
      key,
      url: this.getPublicUrl(key),
      etag: result.ETag || '',
    };
  }

  /**
   * Download File from S3
   */
  async downloadFile(key: string): Promise<Buffer> {
    try {
      const params: GetObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
      };

      const command = new GetObjectCommand(params);
      const result = await this.s3Client.send(command);

      if (!result.Body) {
        throw new Error('File body is empty');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of result.Body as any) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error(`Failed to download file: ${(error as Error).message}`);
    }
  }

  /**
   * Get File Stream from S3
   */
  async getFileStream(key: string): Promise<Readable> {
    try {
      const params: GetObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
      };

      const command = new GetObjectCommand(params);
      const result = await this.s3Client.send(command);

      if (!result.Body) {
        throw new Error('File body is empty');
      }

      return result.Body as Readable;
    } catch (error) {
      console.error('Error getting file stream:', error);
      throw new Error(`Failed to get file stream: ${(error as Error).message}`);
    }
  }

  /**
   * Delete File from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const params: DeleteObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
      };

      const command = new DeleteObjectCommand(params);
      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${(error as Error).message}`);
    }
  }

  /**
   * Delete Multiple Files from S3
   */
  async deleteFiles(keys: string[]): Promise<void> {
    try {
      if (keys.length === 0) {
        return;
      }

      const params = {
        Bucket: this.bucket,
        Delete: {
          Objects: keys.map(key => ({ Key: key })),
          Quiet: false,
        },
      };

      const command = new DeleteObjectsCommand(params);
      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting files:', error);
      throw new Error(`Failed to delete files: ${(error as Error).message}`);
    }
  }

  /**
   * Get File Metadata
   */
  async getFileMetadata(key: string): Promise<FileMetadata> {
    try {
      const params: HeadObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
      };

      const command = new HeadObjectCommand(params);
      const result = await this.s3Client.send(command);

      return {
        key,
        size: result.ContentLength || 0,
        contentType: result.ContentType || 'application/octet-stream',
        lastModified: result.LastModified || new Date(),
        etag: result.ETag || '',
        metadata: result.Metadata || {},
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error(`Failed to get file metadata: ${(error as Error).message}`);
    }
  }

  /**
   * Check if File Exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.getFileMetadata(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Copy File within S3
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      const params: CopyObjectCommandInput = {
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
      };

      const command = new CopyObjectCommand(params);
      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error copying file:', error);
      throw new Error(`Failed to copy file: ${(error as Error).message}`);
    }
  }

  /**
   * Move File within S3
   */
  async moveFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      await this.copyFile(sourceKey, destinationKey);
      await this.deleteFile(sourceKey);
    } catch (error) {
      console.error('Error moving file:', error);
      throw new Error(`Failed to move file: ${(error as Error).message}`);
    }
  }

  /**
   * List Files in Directory
   */
  async listFiles(prefix: string, maxKeys: number = 1000): Promise<FileMetadata[]> {
    try {
      const params: ListObjectsV2CommandInput = {
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      };

      const command = new ListObjectsV2Command(params);
      const result = await this.s3Client.send(command);

      if (!result.Contents) {
        return [];
      }

      return result.Contents.map(item => ({
        key: item.Key || '',
        size: item.Size || 0,
        contentType: 'application/octet-stream',
        lastModified: item.LastModified || new Date(),
        etag: item.ETag || '',
      }));
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error(`Failed to list files: ${(error as Error).message}`);
    }
  }

  /**
   * Generate Signed URL for Secure Access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${(error as Error).message}`);
    }
  }

  /**
   * Generate Signed Upload URL
   */
  async getSignedUploadUrl(key: string, contentType: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error('Error generating signed upload URL:', error);
      throw new Error(`Failed to generate signed upload URL: ${(error as Error).message}`);
    }
  }

  /**
   * Get Public URL for File
   */
  getPublicUrl(key: string): string {
    if ((s3Config as any).cdnUrl) {
      return `${(s3Config as any).cdnUrl}/${key}`;
    }

    if ((s3Config as any).endpoint) {
      return `${(s3Config as any).endpoint}/${this.bucket}/${key}`;
    }

    return `https://${this.bucket}.s3.${s3Config.region}.amazonaws.com/${key}`;
  }

  /**
   * Validate Content Type
   */
  private isAllowedContentType(contentType: string): boolean {
    // If no restrictions, allow all
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']; // Default allowed types
    if (allowedTypes.length === 0) {
      return true;
    }

    return allowedTypes.some((allowed: string) => {
      // Exact match
      if (allowed === contentType) {
        return true;
      }

      // Wildcard match (e.g., image/*)
      if (allowed.endsWith('/*')) {
        const prefix = allowed.slice(0, -2);
        return contentType.startsWith(prefix);
      }

      return false;
    });
  }

  /**
   * Generate Unique File Key
   */
  generateFileKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = filename.split('.').pop();
    return `${prefix}/${timestamp}-${random}.${extension}`;
  }

  /**
   * Get Storage Statistics
   */
  async getStorageStats(prefix?: string): Promise<{ count: number; totalSize: number }> {
    try {
      const files = await this.listFiles(prefix || '', 10000);
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      return {
        count: files.length,
        totalSize,
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      throw new Error(`Failed to get storage stats: ${(error as Error).message}`);
    }
  }
}

/**
 * Singleton Storage Service Instance
 */
let storageService: StorageService | null = null;

/**
 * Get or Create Storage Service Instance
 */
export function getStorageService(): StorageService {
  if (!storageService) {
    storageService = new StorageService();
  }
  return storageService;
}

/**
 * Export Default Storage Service
 */
export default getStorageService();

