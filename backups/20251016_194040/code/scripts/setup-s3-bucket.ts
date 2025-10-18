/**
 * S3 Bucket Setup Script for LocalStack
 * 
 * Creates the required S3 bucket and configures it for local development
 */

import { S3Client, CreateBucketCommand, PutBucketCorsCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { s3Config } from '../src/config/s3';
import dotenv from 'dotenv';

dotenv.config();

async function setupS3Bucket() {
  console.log('🪣 Setting up S3 bucket for LocalEx...\n');

  try {
    // Create S3 client
    const s3Client = new S3Client({
      region: s3Config.region,
      endpoint: s3Config.endpoint,
      forcePathStyle: s3Config.forcePathStyle,
      credentials: s3Config.credentials || {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
    });

    // Check if bucket already exists
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: s3Config.bucket }));
      console.log(`✅ Bucket ${s3Config.bucket} already exists`);
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        // Bucket doesn't exist, create it
        console.log(`📦 Creating bucket: ${s3Config.bucket}...`);

        await s3Client.send(new CreateBucketCommand({
          Bucket: s3Config.bucket,
        }));

        console.log(`✅ Bucket ${s3Config.bucket} created successfully`);
      } else {
        throw error;
      }
    }

    // Configure CORS
    console.log('🔧 Configuring CORS...');

    await s3Client.send(new PutBucketCorsCommand({
      Bucket: s3Config.bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    }));

    console.log('✅ CORS configured successfully');

    console.log('\n✨ S3 bucket setup complete!');
    console.log(`\nBucket Name: ${s3Config.bucket}`);
    console.log(`Region: ${s3Config.region}`);
    console.log(`Endpoint: ${s3Config.endpoint || 'AWS S3'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up S3 bucket:', error);
    process.exit(1);
  }
}

setupS3Bucket();

