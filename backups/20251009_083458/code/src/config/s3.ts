/**
 * AWS S3 Configuration
 * 
 * Configures AWS SDK v3 for S3 storage operations with support for:
 * - Production AWS S3
 * - Local development with LocalStack
 * - Multi-region support
 * - Credential management
 * - Error handling and retries
 */

import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

/**
 * S3 Configuration Interface
 */
export interface S3Config {
  region: string;
  bucket: string;
  cdnUrl: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

/**
 * Storage Configuration Interface
 */
export interface StorageConfig {
  maxFileSize: number;
  allowedTypes: string[];
  tempExpiry: number;
  enableVirusScan: boolean;
}

/**
 * Image Processing Configuration Interface
 */
export interface ImageConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  thumbnailSize: number;
  mediumSize: number;
  largeSize: number;
  enableWebP: boolean;
  stripExif: boolean;
}

/**
 * Get S3 Configuration from Environment
 */
export function getS3Config(): S3Config {
  const config: S3Config = {
    region: process.env['AWS_REGION'] || 'us-east-1',
    bucket: process.env['S3_BUCKET'] || 'localex-storage',
    cdnUrl: process.env['S3_CDN_URL'] || '',
  };

  // Add endpoint for LocalStack or custom S3-compatible storage
  if (process.env['S3_ENDPOINT']) {
    config.endpoint = process.env['S3_ENDPOINT'];
  }

  // Force path style for LocalStack
  if (process.env['S3_FORCE_PATH_STYLE'] === 'true') {
    config.forcePathStyle = true;
  }

  // Add credentials if provided
  if (process.env['AWS_ACCESS_KEY_ID'] && process.env['AWS_SECRET_ACCESS_KEY']) {
    config.credentials = {
      accessKeyId: process.env['AWS_ACCESS_KEY_ID'],
      secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'],
    };
  }

  return config;
}

/**
 * Get Storage Configuration from Environment
 */
export function getStorageConfig(): StorageConfig {
  return {
    maxFileSize: parseInt(process.env['STORAGE_MAX_FILE_SIZE'] || '10485760', 10), // 10MB default
    allowedTypes: (process.env['STORAGE_ALLOWED_TYPES'] || 'image/jpeg,image/png,image/webp,image/gif').split(','),
    tempExpiry: parseInt(process.env['STORAGE_TEMP_EXPIRY'] || '86400000', 10), // 24 hours default
    enableVirusScan: process.env['STORAGE_ENABLE_VIRUS_SCAN'] === 'true',
  };
}

/**
 * Get Image Processing Configuration from Environment
 */
export function getImageConfig(): ImageConfig {
  return {
    maxWidth: parseInt(process.env['IMAGE_MAX_WIDTH'] || '4000', 10),
    maxHeight: parseInt(process.env['IMAGE_MAX_HEIGHT'] || '4000', 10),
    quality: parseInt(process.env['IMAGE_QUALITY'] || '85', 10),
    thumbnailSize: parseInt(process.env['IMAGE_THUMBNAIL_SIZE'] || '300', 10),
    mediumSize: parseInt(process.env['IMAGE_MEDIUM_SIZE'] || '800', 10),
    largeSize: parseInt(process.env['IMAGE_LARGE_SIZE'] || '1200', 10),
    enableWebP: process.env['IMAGE_ENABLE_WEBP'] !== 'false',
    stripExif: process.env['IMAGE_STRIP_EXIF'] !== 'false',
  };
}

/**
 * Create S3 Client Instance
 */
export function createS3Client(): S3Client {
  const config = getS3Config();

  const clientConfig: S3ClientConfig = {
    region: config.region,
    ...(config.forcePathStyle !== undefined && { forcePathStyle: config.forcePathStyle }),
  };

  // Add endpoint for LocalStack
  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
  }

  // Add credentials if provided
  if (config.credentials) {
    clientConfig.credentials = config.credentials;
  }

  // Configure retries
  clientConfig.maxAttempts = 3;

  return new S3Client(clientConfig);
}

/**
 * Singleton S3 Client Instance
 */
let s3Client: S3Client | null = null;

/**
 * Get or Create S3 Client Instance
 */
export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = createS3Client();
  }
  return s3Client;
}

/**
 * Close S3 Client Connection
 */
export async function closeS3Client(): Promise<void> {
  if (s3Client) {
    s3Client.destroy();
    s3Client = null;
  }
}

/**
 * Test S3 Connection
 */
export async function testS3Connection(): Promise<boolean> {
  try {
    const { HeadBucketCommand } = await import('@aws-sdk/client-s3');
    const client = getS3Client();
    const config = getS3Config();

    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    return true;
  } catch (error) {
    console.error('S3 connection test failed:', error);
    return false;
  }
}

/**
 * S3 Configuration Validation
 */
export function validateS3Config(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = getS3Config();

  if (!config.region) {
    errors.push('AWS_REGION is required');
  }

  if (!config.bucket) {
    errors.push('S3_BUCKET is required');
  }

  // In production, credentials are required
  if (process.env['NODE_ENV'] === 'production') {
    if (!config.credentials?.accessKeyId) {
      errors.push('AWS_ACCESS_KEY_ID is required in production');
    }
    if (!config.credentials?.secretAccessKey) {
      errors.push('AWS_SECRET_ACCESS_KEY is required in production');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Export Configuration Objects
 */
export const s3Config = getS3Config();
export const storageConfig = getStorageConfig();
export const imageConfig = getImageConfig();

/**
 * Export Default S3 Client
 */
export default getS3Client();

