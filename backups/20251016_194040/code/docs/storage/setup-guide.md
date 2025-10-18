# AWS S3 Storage Setup Guide

## Overview

This guide covers the setup and configuration of AWS S3 storage for the LocalEx platform, including:
- AWS account setup
- S3 bucket creation and configuration
- CloudFront CDN setup
- IAM permissions
- Local development with LocalStack
- Environment configuration

---

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Node.js 18+ installed
- LocalEx project cloned and dependencies installed

---

## Production Setup

### Step 1: Create S3 Bucket

1. **Log in to AWS Console**
   - Navigate to https://console.aws.amazon.com/
   - Go to S3 service

2. **Create New Bucket**
   ```bash
   aws s3 mb s3://localex-storage --region us-east-1
   ```

3. **Configure Bucket Settings**
   - **Block Public Access**: Keep enabled for security
   - **Versioning**: Enable for backup and recovery
   - **Encryption**: Enable SSE-S3 (Server-Side Encryption)
   - **Object Lock**: Optional, for compliance requirements

4. **Set Bucket Policy**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "AllowCloudFrontAccess",
         "Effect": "Allow",
         "Principal": {
           "Service": "cloudfront.amazonaws.com"
         },
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::localex-storage/*",
         "Condition": {
           "StringEquals": {
             "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
           }
         }
       }
     ]
   }
   ```

5. **Configure CORS**
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedOrigins": ["https://localex.com", "https://www.localex.com"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

### Step 2: Create IAM User and Policies

1. **Create IAM User**
   ```bash
   aws iam create-user --user-name localex-storage-user
   ```

2. **Create IAM Policy**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:ListBucket",
           "s3:GetObjectAcl",
           "s3:PutObjectAcl"
         ],
         "Resource": [
           "arn:aws:s3:::localex-storage",
           "arn:aws:s3:::localex-storage/*"
         ]
       }
     ]
   }
   ```

3. **Attach Policy to User**
   ```bash
   aws iam put-user-policy --user-name localex-storage-user --policy-name LocalExStoragePolicy --policy-document file://storage-policy.json
   ```

4. **Create Access Keys**
   ```bash
   aws iam create-access-key --user-name localex-storage-user
   ```
   
   Save the `AccessKeyId` and `SecretAccessKey` for environment configuration.

### Step 3: Setup CloudFront CDN

1. **Create CloudFront Distribution**
   ```bash
   aws cloudfront create-distribution --origin-domain-name localex-storage.s3.amazonaws.com --default-root-object index.html
   ```

2. **Configure Distribution Settings**
   - **Origin**: S3 bucket (localex-storage)
   - **Origin Access**: Origin Access Control (OAC)
   - **Viewer Protocol Policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP Methods**: GET, HEAD, OPTIONS
   - **Cache Policy**: CachingOptimized
   - **Compress Objects**: Yes

3. **Configure Custom Domain (Optional)**
   - Add CNAME record in your DNS:
     ```
     cdn.localex.com CNAME d1234abcd.cloudfront.net
     ```
   - Add alternate domain name in CloudFront distribution
   - Request/upload SSL certificate in ACM

4. **Configure Cache Behaviors**
   - **Images** (*.jpg, *.png, *.webp):
     - TTL: 30 days
     - Compress: Yes
   - **Documents** (*.pdf):
     - TTL: 7 days
     - Compress: Yes

### Step 4: Configure Lifecycle Policies

1. **Create Lifecycle Rule for Temp Files**
   ```json
   {
     "Rules": [
       {
         "Id": "DeleteTempFiles",
         "Status": "Enabled",
         "Prefix": "temp/",
         "Expiration": {
           "Days": 1
         }
       },
       {
         "Id": "ArchiveOldPhotos",
         "Status": "Enabled",
         "Prefix": "items/",
         "Transitions": [
           {
             "Days": 365,
             "StorageClass": "GLACIER"
           }
         ]
       }
     ]
   }
   ```

2. **Apply Lifecycle Policy**
   ```bash
   aws s3api put-bucket-lifecycle-configuration --bucket localex-storage --lifecycle-configuration file://lifecycle-policy.json
   ```

---

## Local Development Setup

### Option 1: LocalStack (Recommended)

1. **Install LocalStack**
   ```bash
   pip install localstack
   ```

2. **Start LocalStack**
   ```bash
   localstack start
   ```

3. **Create Local S3 Bucket**
   ```bash
   aws --endpoint-url=http://localhost:4566 s3 mb s3://localex-storage
   ```

4. **Configure Environment**
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=test
   AWS_SECRET_ACCESS_KEY=test
   S3_BUCKET=localex-storage
   S3_ENDPOINT=http://localhost:4566
   S3_FORCE_PATH_STYLE=true
   ```

### Option 2: AWS Free Tier

1. **Use Production Setup** with separate bucket:
   ```bash
   aws s3 mb s3://localex-storage-dev --region us-east-1
   ```

2. **Configure Environment**
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_dev_access_key
   AWS_SECRET_ACCESS_KEY=your_dev_secret_key
   S3_BUCKET=localex-storage-dev
   ```

---

## Environment Configuration

### Required Environment Variables

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
S3_BUCKET=localex-storage
S3_CDN_URL=https://cdn.localex.com
S3_ENDPOINT=http://localhost:4566  # For LocalStack only
S3_FORCE_PATH_STYLE=true           # For LocalStack only

# Storage Configuration
STORAGE_MAX_FILE_SIZE=10485760           # 10MB
STORAGE_ALLOWED_TYPES=image/jpeg,image/png,image/webp,image/gif
STORAGE_TEMP_EXPIRY=86400000             # 24 hours
STORAGE_ENABLE_VIRUS_SCAN=false          # Set to true in production

# Image Processing Configuration
IMAGE_MAX_WIDTH=4000
IMAGE_MAX_HEIGHT=4000
IMAGE_QUALITY=85
IMAGE_THUMBNAIL_SIZE=300
IMAGE_MEDIUM_SIZE=800
IMAGE_LARGE_SIZE=1200
IMAGE_ENABLE_WEBP=true
IMAGE_STRIP_EXIF=true

# CloudFront Configuration (Optional)
CLOUDFRONT_DISTRIBUTION_ID=E1234ABCDEFG
```

### Update .env File

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Update with your AWS credentials and configuration

3. Verify configuration:
   ```bash
   npm run storage:test
   ```

---

## Verification

### Test S3 Connection

```bash
# Run storage test suite
npm run storage:test
```

### Test File Upload

```typescript
import { getStorageService } from './src/services/storage.service';

const storageService = getStorageService();

// Upload test file
const buffer = Buffer.from('Hello, World!');
const result = await storageService.uploadFile('test/hello.txt', buffer);

console.log('Upload successful:', result.url);
```

### Test Image Processing

```typescript
import { getImageProcessingService } from './src/services/image-processing.service';
import * as fs from 'fs';

const imageService = getImageProcessingService();

// Process image
const imageBuffer = fs.readFileSync('test-image.jpg');
const result = await imageService.processAndUpload(imageBuffer, 'test/image', true);

console.log('Processed image:', result);
```

---

## Troubleshooting

### Issue: "Access Denied" Error

**Solution**:
1. Verify IAM user has correct permissions
2. Check bucket policy allows access
3. Verify AWS credentials in `.env` file

### Issue: "Bucket Does Not Exist"

**Solution**:
1. Verify bucket name in `.env` matches actual bucket
2. Check AWS region is correct
3. Create bucket if it doesn't exist:
   ```bash
   aws s3 mb s3://localex-storage --region us-east-1
   ```

### Issue: "Connection Timeout"

**Solution**:
1. Check internet connection
2. Verify AWS endpoint is correct
3. For LocalStack, ensure it's running:
   ```bash
   localstack status
   ```

### Issue: "File Too Large"

**Solution**:
1. Check `STORAGE_MAX_FILE_SIZE` in `.env`
2. Increase limit if needed (max 5GB for S3)
3. Use multipart upload for large files

### Issue: "Invalid Image Format"

**Solution**:
1. Check `STORAGE_ALLOWED_TYPES` in `.env`
2. Verify image is not corrupted
3. Try converting image to supported format

---

## Security Best Practices

### 1. Access Control

- **Use IAM roles** instead of access keys when possible
- **Rotate access keys** regularly (every 90 days)
- **Use least privilege principle** for IAM policies
- **Enable MFA** for AWS account

### 2. Data Protection

- **Enable encryption** at rest (SSE-S3 or SSE-KMS)
- **Use HTTPS** for all transfers
- **Enable versioning** for backup and recovery
- **Configure lifecycle policies** for data retention

### 3. Monitoring

- **Enable CloudTrail** for audit logging
- **Set up CloudWatch alarms** for unusual activity
- **Monitor S3 access logs**
- **Review IAM access regularly**

### 4. Cost Optimization

- **Use lifecycle policies** to move old data to cheaper storage
- **Enable intelligent tiering** for automatic cost optimization
- **Monitor storage usage** and clean up unused files
- **Use CloudFront** to reduce S3 data transfer costs

---

## Next Steps

1. ✅ Complete AWS account setup
2. ✅ Create S3 bucket and configure permissions
3. ✅ Set up CloudFront CDN
4. ✅ Configure environment variables
5. ✅ Run storage test suite
6. 📖 Review [Operational Guide](operational-guide.md)
7. 📖 Review [API Reference](api-reference.md)

---

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [LocalStack Documentation](https://docs.localstack.cloud/)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)

---

*Last Updated: October 8, 2024*  
*Phase 1.4 - AWS S3 Storage Integration*

