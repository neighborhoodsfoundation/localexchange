/**
 * S3 Configuration
 * 
 * AWS S3 configuration and client setup for LocalEx
 */

import { S3Client } from '@aws-sdk/client-s3';

// S3 Configuration
export const s3Config = {
  bucket: process.env['AWS_S3_BUCKET'] || 'localex-dev',
  region: process.env['AWS_REGION'] || 'us-east-1',
  accessKeyId: process.env['AWS_ACCESS_KEY_ID'],
  secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY']
};

// S3 Client
export const getS3Client = (): S3Client => {
  return new S3Client({
    region: s3Config.region,
    credentials: s3Config.accessKeyId && s3Config.secretAccessKey ? {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey
    } : undefined
  });
};

// Image Configuration
export const imageConfig = {
  maxWidth: 4000,
  maxHeight: 4000,
  maxSizeMB: 10,
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  thumbnailSizes: [150, 300, 600]
};

// CDN Configuration
export const cdnConfig = {
  distributionId: process.env['CLOUDFRONT_DISTRIBUTION_ID'],
  domain: process.env['CLOUDFRONT_DOMAIN'] || 'd1234567890.cloudfront.net',
  enabled: process.env['CDN_ENABLED'] === 'true'
};