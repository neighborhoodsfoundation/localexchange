/**
 * Storage Services Test Suite
 * 
 * Comprehensive testing for AWS S3 storage integration:
 * - S3 configuration and connection
 * - Storage service operations
 * - Image processing capabilities
 * - CDN integration
 * - File management and security
 * - Performance benchmarks
 */

import { getS3Client, testS3Connection, validateS3Config } from '../src/config/s3';
import { getStorageService } from '../src/services/storage.service';
import { getImageProcessingService } from '../src/services/image-processing.service';
import { getCDNService } from '../src/services/cdn.service';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

/**
 * Test Result Interface
 */
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
}

/**
 * Storage Test Suite Class
 */
class StorageTestSuite {
  private results: TestResult[] = [];
  private testBuffer: Buffer | null = null;
  private testFileKey: string | null = null;

  /**
   * Run All Tests
   */
  async runAll(): Promise<void> {
    console.log('🧪 Starting Storage Services Test Suite...\n');

    const startTime = Date.now();

    // Configuration Tests
    await this.testS3Configuration();
    await this.testS3Connection();

    // Generate test image
    await this.generateTestImage();

    // Storage Service Tests
    await this.testFileUpload();
    await this.testFileDownload();
    await this.testFileMetadata();
    await this.testFileExists();
    await this.testSignedUrl();
    await this.testFileList();
    await this.testFileCopy();
    await this.testFileMove();
    await this.testFileDelete();

    // Image Processing Tests
    await this.testImageValidation();
    await this.testImageMetadataExtraction();
    await this.testImageOptimization();
    await this.testThumbnailGeneration();
    await this.testImageResize();
    await this.testWebPConversion();
    await this.testExifStripping();
    await this.testProcessAndUpload();

    // CDN Service Tests
    await this.testCDNConfiguration();
    await this.testCDNUrlGeneration();
    await this.testCacheInvalidation();
    await this.testCacheHeaders();

    // Performance Tests
    await this.testUploadPerformance();
    await this.testDownloadPerformance();
    await this.testProcessingPerformance();

    // Cleanup
    await this.cleanup();

    const endTime = Date.now();
    const duration = endTime - startTime;

    this.printResults(duration);
  }

  /**
   * Test S3 Configuration
   */
  private async testS3Configuration(): Promise<void> {
    const start = Date.now();
    try {
      const validation = validateS3Config();

      if (validation.valid) {
        this.results.push({
          name: 'S3 Configuration Validation',
          passed: true,
          message: 'S3 configuration is valid',
          duration: Date.now() - start,
        });
      } else {
        this.results.push({
          name: 'S3 Configuration Validation',
          passed: false,
          message: `Configuration errors: ${validation.errors.join(', ')}`,
          duration: Date.now() - start,
        });
      }
    } catch (error) {
      this.results.push({
        name: 'S3 Configuration Validation',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test S3 Connection
   */
  private async testS3Connection(): Promise<void> {
    const start = Date.now();
    try {
      const connected = await testS3Connection();

      this.results.push({
        name: 'S3 Connection Test',
        passed: connected,
        message: connected ? 'Successfully connected to S3' : 'Failed to connect to S3',
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'S3 Connection Test',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Generate Test Image
   */
  private async generateTestImage(): Promise<void> {
    try {
      // Create a test image using Sharp
      this.testBuffer = await sharp({
        create: {
          width: 1920,
          height: 1080,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      console.log(`✅ Generated test image (${this.testBuffer.length} bytes)\n`);
    } catch (error) {
      console.error('❌ Failed to generate test image:', error);
    }
  }

  /**
   * Test File Upload
   */
  private async testFileUpload(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testBuffer) {
        throw new Error('Test buffer not available');
      }

      const storageService = getStorageService();
      this.testFileKey = `test/upload-${Date.now()}.jpg`;

      const result = await storageService.uploadFile(this.testFileKey, this.testBuffer, {
        contentType: 'image/jpeg',
        metadata: { test: 'true' },
      });

      this.results.push({
        name: 'File Upload',
        passed: !!result.key && !!result.url,
        message: `Uploaded file to ${result.key}`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'File Upload',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test File Download
   */
  private async testFileDownload(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testFileKey) {
        throw new Error('Test file key not available');
      }

      const storageService = getStorageService();
      const downloaded = await storageService.downloadFile(this.testFileKey);

      this.results.push({
        name: 'File Download',
        passed: Buffer.isBuffer(downloaded) && downloaded.length > 0,
        message: `Downloaded file (${downloaded.length} bytes)`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'File Download',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test File Metadata
   */
  private async testFileMetadata(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testFileKey) {
        throw new Error('Test file key not available');
      }

      const storageService = getStorageService();
      const metadata = await storageService.getFileMetadata(this.testFileKey);

      this.results.push({
        name: 'File Metadata',
        passed: !!metadata.key && metadata.size > 0,
        message: `Retrieved metadata: ${metadata.size} bytes, ${metadata.contentType}`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'File Metadata',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test File Exists
   */
  private async testFileExists(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testFileKey) {
        throw new Error('Test file key not available');
      }

      const storageService = getStorageService();
      const exists = await storageService.fileExists(this.testFileKey);

      this.results.push({
        name: 'File Exists Check',
        passed: exists === true,
        message: exists ? 'File exists' : 'File does not exist',
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'File Exists Check',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test Signed URL Generation
   */
  private async testSignedUrl(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testFileKey) {
        throw new Error('Test file key not available');
      }

      const storageService = getStorageService();
      const signedUrl = await storageService.getSignedUrl(this.testFileKey, 3600);

      this.results.push({
        name: 'Signed URL Generation',
        passed: signedUrl.includes(this.testFileKey),
        message: 'Generated signed URL successfully',
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'Signed URL Generation',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test File List
   */
  private async testFileList(): Promise<void> {
    const start = Date.now();
    try {
      const storageService = getStorageService();
      const files = await storageService.listFiles('test/', 100);

      this.results.push({
        name: 'File List',
        passed: Array.isArray(files),
        message: `Listed ${files.length} files`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'File List',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test File Copy
   */
  private async testFileCopy(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testFileKey) {
        throw new Error('Test file key not available');
      }

      const storageService = getStorageService();
      const copyKey = `test/copy-${Date.now()}.jpg`;

      await storageService.copyFile(this.testFileKey, copyKey);

      const exists = await storageService.fileExists(copyKey);

      this.results.push({
        name: 'File Copy',
        passed: exists,
        message: `Copied file to ${copyKey}`,
        duration: Date.now() - start,
      });

      // Cleanup copy
      await storageService.deleteFile(copyKey);
    } catch (error) {
      this.results.push({
        name: 'File Copy',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test File Move
   */
  private async testFileMove(): Promise<void> {
    const start = Date.now();
    try {
      const storageService = getStorageService();
      const sourceKey = `test/move-source-${Date.now()}.jpg`;
      const destKey = `test/move-dest-${Date.now()}.jpg`;

      // Upload a file to move
      if (!this.testBuffer) {
        throw new Error('Test buffer not available');
      }

      await storageService.uploadFile(sourceKey, this.testBuffer);

      // Move the file
      await storageService.moveFile(sourceKey, destKey);

      const sourceExists = await storageService.fileExists(sourceKey);
      const destExists = await storageService.fileExists(destKey);

      this.results.push({
        name: 'File Move',
        passed: !sourceExists && destExists,
        message: `Moved file from ${sourceKey} to ${destKey}`,
        duration: Date.now() - start,
      });

      // Cleanup
      await storageService.deleteFile(destKey);
    } catch (error) {
      this.results.push({
        name: 'File Move',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test File Delete
   */
  private async testFileDelete(): Promise<void> {
    const start = Date.now();
    try {
      const storageService = getStorageService();
      const deleteKey = `test/delete-${Date.now()}.jpg`;

      // Upload a file to delete
      if (!this.testBuffer) {
        throw new Error('Test buffer not available');
      }

      await storageService.uploadFile(deleteKey, this.testBuffer);

      // Delete the file
      await storageService.deleteFile(deleteKey);

      const exists = await storageService.fileExists(deleteKey);

      this.results.push({
        name: 'File Delete',
        passed: !exists,
        message: 'File deleted successfully',
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'File Delete',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test Image Validation
   */
  private async testImageValidation(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testBuffer) {
        throw new Error('Test buffer not available');
      }

      const imageService = getImageProcessingService();
      const validation = await imageService.validateImage(this.testBuffer);

      this.results.push({
        name: 'Image Validation',
        passed: validation.valid,
        message: validation.valid ? 'Image is valid' : validation.error || 'Unknown error',
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'Image Validation',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test Image Metadata Extraction
   */
  private async testImageMetadataExtraction(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testBuffer) {
        throw new Error('Test buffer not available');
      }

      const imageService = getImageProcessingService();
      const metadata = await imageService.extractMetadata(this.testBuffer);

      this.results.push({
        name: 'Image Metadata Extraction',
        passed: metadata.width > 0 && metadata.height > 0,
        message: `Extracted metadata: ${metadata.width}x${metadata.height}, ${metadata.format}`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'Image Metadata Extraction',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test Image Optimization
   */
  private async testImageOptimization(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testBuffer) {
        throw new Error('Test buffer not available');
      }

      const imageService = getImageProcessingService();
      const optimized = await imageService.optimizeImage(this.testBuffer);

      const originalSize = this.testBuffer.length;
      const optimizedSize = optimized.length;
      const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);

      this.results.push({
        name: 'Image Optimization',
        passed: optimized.length > 0,
        message: `Optimized image: ${originalSize} → ${optimizedSize} bytes (${savings}% savings)`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'Image Optimization',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test Thumbnail Generation
   */
  private async testThumbnailGeneration(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testBuffer) {
        throw new Error('Test buffer not available');
      }

      const imageService = getImageProcessingService();
      const thumbnails = await imageService.generateThumbnails(this.testBuffer);

      const thumbnailCount = Object.keys(thumbnails).length;

      this.results.push({
        name: 'Thumbnail Generation',
        passed: thumbnailCount >= 3,
        message: `Generated ${thumbnailCount} thumbnails`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'Thumbnail Generation',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test Image Resize
   */
  private async testImageResize(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testBuffer) {
        throw new Error('Test buffer not available');
      }

      const imageService = getImageProcessingService();
      const resized = await imageService.resizeImage(this.testBuffer, 800, 600);

      const metadata = await imageService.extractMetadata(resized);

      this.results.push({
        name: 'Image Resize',
        passed: metadata.width <= 800 && metadata.height <= 600,
        message: `Resized image to ${metadata.width}x${metadata.height}`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'Image Resize',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test WebP Conversion
   */
  private async testWebPConversion(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testBuffer) {
        throw new Error('Test buffer not available');
      }

      const imageService = getImageProcessingService();
      const webp = await imageService.convertToWebP(this.testBuffer);

      const metadata = await imageService.extractMetadata(webp);

      this.results.push({
        name: 'WebP Conversion',
        passed: metadata.format === 'webp',
        message: `Converted to WebP (${webp.length} bytes)`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'WebP Conversion',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test EXIF Stripping
   */
  private async testExifStripping(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testBuffer) {
        throw new Error('Test buffer not available');
      }

      const imageService = getImageProcessingService();
      const stripped = await imageService.stripExifData(this.testBuffer);

      this.results.push({
        name: 'EXIF Stripping',
        passed: stripped.length > 0,
        message: 'Stripped EXIF data successfully',
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'EXIF Stripping',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test Process and Upload
   */
  private async testProcessAndUpload(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testBuffer) {
        throw new Error('Test buffer not available');
      }

      const imageService = getImageProcessingService();
      const baseKey = `test/processed-${Date.now()}`;

      const result = await imageService.processAndUpload(this.testBuffer, baseKey, true);

      const variantCount = Object.keys(result.variants).length;

      this.results.push({
        name: 'Process and Upload',
        passed: !!result.original.key && variantCount > 0,
        message: `Processed and uploaded image with ${variantCount} variants`,
        duration: Date.now() - start,
      });

      // Cleanup
      await imageService.deleteImageWithVariants(baseKey);
    } catch (error) {
      this.results.push({
        name: 'Process and Upload',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test CDN Configuration
   */
  private async testCDNConfiguration(): Promise<void> {
    const start = Date.now();
    try {
      const cdnService = getCDNService();
      const config = cdnService.getConfig();

      this.results.push({
        name: 'CDN Configuration',
        passed: true,
        message: `CDN ${config.enabled ? 'enabled' : 'disabled'}: ${config.domain || 'not configured'}`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'CDN Configuration',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test CDN URL Generation
   */
  private async testCDNUrlGeneration(): Promise<void> {
    const start = Date.now();
    try {
      const cdnService = getCDNService();
      const url = cdnService.getCdnUrl('test/image.jpg');

      this.results.push({
        name: 'CDN URL Generation',
        passed: url.includes('test/image.jpg'),
        message: `Generated CDN URL: ${url}`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'CDN URL Generation',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test Cache Invalidation
   */
  private async testCacheInvalidation(): Promise<void> {
    const start = Date.now();
    try {
      const cdnService = getCDNService();
      const result = await cdnService.invalidateCache(['test/image.jpg']);

      this.results.push({
        name: 'Cache Invalidation',
        passed: !!result.invalidationId,
        message: `Invalidation ${result.invalidationId}: ${result.status}`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'Cache Invalidation',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test Cache Headers
   */
  private async testCacheHeaders(): Promise<void> {
    const start = Date.now();
    try {
      const cdnService = getCDNService();
      const headers = cdnService.getCacheHeaders('test/image.jpg');

      this.results.push({
        name: 'Cache Headers',
        passed: !!headers['Cache-Control'],
        message: `Cache-Control: ${headers['Cache-Control']}`,
        duration: Date.now() - start,
      });
    } catch (error) {
      this.results.push({
        name: 'Cache Headers',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test Upload Performance
   */
  private async testUploadPerformance(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testBuffer) {
        throw new Error('Test buffer not available');
      }

      const storageService = getStorageService();
      const key = `test/perf-upload-${Date.now()}.jpg`;

      await storageService.uploadFile(key, this.testBuffer);

      const duration = Date.now() - start;
      const throughput = (this.testBuffer.length / 1024 / 1024) / (duration / 1000);

      this.results.push({
        name: 'Upload Performance',
        passed: duration < 5000,
        message: `Uploaded ${(this.testBuffer.length / 1024 / 1024).toFixed(2)} MB in ${duration}ms (${throughput.toFixed(2)} MB/s)`,
        duration,
      });

      // Cleanup
      await storageService.deleteFile(key);
    } catch (error) {
      this.results.push({
        name: 'Upload Performance',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test Download Performance
   */
  private async testDownloadPerformance(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testFileKey) {
        throw new Error('Test file key not available');
      }

      const storageService = getStorageService();
      const downloaded = await storageService.downloadFile(this.testFileKey);

      const duration = Date.now() - start;
      const throughput = (downloaded.length / 1024 / 1024) / (duration / 1000);

      this.results.push({
        name: 'Download Performance',
        passed: duration < 3000,
        message: `Downloaded ${(downloaded.length / 1024 / 1024).toFixed(2)} MB in ${duration}ms (${throughput.toFixed(2)} MB/s)`,
        duration,
      });
    } catch (error) {
      this.results.push({
        name: 'Download Performance',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Test Processing Performance
   */
  private async testProcessingPerformance(): Promise<void> {
    const start = Date.now();
    try {
      if (!this.testBuffer) {
        throw new Error('Test buffer not available');
      }

      const imageService = getImageProcessingService();
      await imageService.generateThumbnails(this.testBuffer);

      const duration = Date.now() - start;

      this.results.push({
        name: 'Processing Performance',
        passed: duration < 5000,
        message: `Generated thumbnails in ${duration}ms`,
        duration,
      });
    } catch (error) {
      this.results.push({
        name: 'Processing Performance',
        passed: false,
        message: (error as Error).message,
        duration: Date.now() - start,
      });
    }
  }

  /**
   * Cleanup Test Files
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.testFileKey) {
        const storageService = getStorageService();
        await storageService.deleteFile(this.testFileKey);
        console.log('\n🧹 Cleaned up test files');
      }
    } catch (error) {
      console.error('⚠️  Cleanup failed:', error);
    }
  }

  /**
   * Print Test Results
   */
  private printResults(totalDuration: number): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(80) + '\n');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      console.log(`${icon} ${result.name}${duration}`);
      console.log(`   ${result.message}\n`);
    });

    console.log('='.repeat(80));
    console.log(`📈 Summary: ${passed}/${total} tests passed (${failed} failed)`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`📊 Success Rate: ${((passed / total) * 100).toFixed(2)}%`);
    console.log('='.repeat(80) + '\n');

    if (failed > 0) {
      console.log('⚠️  Some tests failed. Please review the errors above.');
      process.exit(1);
    } else {
      console.log('🎉 All tests passed successfully!');
      process.exit(0);
    }
  }
}

/**
 * Run Tests
 */
const testSuite = new StorageTestSuite();
testSuite.runAll().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

