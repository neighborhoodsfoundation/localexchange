/**
 * Storage Service Unit Tests
 * Tests for AWS S3 storage operations
 */

// Mock AWS S3 SDK before importing service
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');
jest.mock('@aws-sdk/lib-storage');
jest.mock('../../config/s3', () => ({
  s3Client: mockS3Client,
  storageConfig: {
    bucket: 'test-bucket',
    region: 'us-east-1',
    cdnUrl: 'https://cdn.example.com',
    maxFileSize: 10485760, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    tempExpiry: 86400000,
    enableVirusScan: false,
  },
}));

import { StorageService } from '../storage.service';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

// Mock S3 Client
const mockS3Client = {
  send: jest.fn(),
};

// Mock getSignedUrl
(getSignedUrl as jest.Mock).mockResolvedValue('https://signed-url.example.com');

describe('StorageService', () => {
  let storageService: StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    storageService = new StorageService();
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      // Arrange
      const key = 'test/image.jpg';
      const data = Buffer.from('test-data');
      const mockResult = { ETag: '"abc123"' };
      (mockS3Client.send as jest.Mock).mockResolvedValue(mockResult);

      // Act
      const result = await storageService.uploadFile(key, data, {
        contentType: 'image/jpeg',
      });

      // Assert
      expect(result).toEqual({
        key,
        url: expect.stringContaining(key),
        etag: '"abc123"',
      });
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it('should reject file exceeding max size', async () => {
      // Arrange
      const key = 'test/large-file.jpg';
      const data = Buffer.alloc(20 * 1024 * 1024); // 20MB

      // Act & Assert
      await expect(
        storageService.uploadFile(key, data, { contentType: 'image/jpeg' })
      ).rejects.toThrow('File size exceeds maximum allowed size');
    });

    it('should reject disallowed content type', async () => {
      // Arrange
      const key = 'test/document.pdf';
      const data = Buffer.from('test-data');

      // Act & Assert
      await expect(
        storageService.uploadFile(key, data, { contentType: 'application/pdf' })
      ).rejects.toThrow('Content type application/pdf is not allowed');
    });

    it('should detect content type from file extension', async () => {
      // Arrange
      const key = 'test/image.png';
      const data = Buffer.from('test-data');
      const mockResult = { ETag: '"abc123"' };
      (mockS3Client.send as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await storageService.uploadFile(key, data);

      // Assert
      const call = (mockS3Client.send as jest.Mock).mock.calls[0][0];
      expect(call.input.ContentType).toBe('image/png');
    });

    it('should handle upload errors', async () => {
      // Arrange
      const key = 'test/image.jpg';
      const data = Buffer.from('test-data');
      (mockS3Client.send as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      // Act & Assert
      await expect(
        storageService.uploadFile(key, data, { contentType: 'image/jpeg' })
      ).rejects.toThrow('Failed to upload file');
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      // Arrange
      const key = 'test/image.jpg';
      const mockData = Buffer.from('test-file-content');
      const mockStream = Readable.from([mockData]);
      (mockS3Client.send as jest.Mock).mockResolvedValue({
        Body: mockStream,
      });

      // Act
      const result = await storageService.downloadFile(key);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
    });

    it('should handle download errors', async () => {
      // Arrange
      const key = 'test/missing.jpg';
      (mockS3Client.send as jest.Mock).mockRejectedValue(new Error('Not found'));

      // Act & Assert
      await expect(storageService.downloadFile(key)).rejects.toThrow('Failed to download file');
    });

    it('should handle empty file body', async () => {
      // Arrange
      const key = 'test/empty.jpg';
      (mockS3Client.send as jest.Mock).mockResolvedValue({ Body: null });

      // Act & Assert
      await expect(storageService.downloadFile(key)).rejects.toThrow('File body is empty');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      // Arrange
      const key = 'test/image.jpg';
      (mockS3Client.send as jest.Mock).mockResolvedValue({});

      // Act
      await storageService.deleteFile(key);

      // Assert
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it('should handle delete errors', async () => {
      // Arrange
      const key = 'test/image.jpg';
      (mockS3Client.send as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(storageService.deleteFile(key)).rejects.toThrow('Failed to delete file');
    });
  });

  describe('deleteFiles', () => {
    it('should delete multiple files successfully', async () => {
      // Arrange
      const keys = ['test/image1.jpg', 'test/image2.jpg'];
      (mockS3Client.send as jest.Mock).mockResolvedValue({});

      // Act
      await storageService.deleteFiles(keys);

      // Assert
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(DeleteObjectsCommand));
    });

    it('should handle empty array', async () => {
      // Act
      await storageService.deleteFiles([]);

      // Assert
      expect(mockS3Client.send).not.toHaveBeenCalled();
    });
  });

  describe('getFileMetadata', () => {
    it('should get file metadata successfully', async () => {
      // Arrange
      const key = 'test/image.jpg';
      const mockMetadata = {
        ContentLength: 12345,
        ContentType: 'image/jpeg',
        LastModified: new Date('2025-01-01'),
        ETag: '"abc123"',
        Metadata: { userId: '123' },
      };
      (mockS3Client.send as jest.Mock).mockResolvedValue(mockMetadata);

      // Act
      const result = await storageService.getFileMetadata(key);

      // Assert
      expect(result).toEqual({
        key,
        size: 12345,
        contentType: 'image/jpeg',
        lastModified: mockMetadata.LastModified,
        etag: '"abc123"',
        metadata: { userId: '123' },
      });
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
    });

    it('should handle metadata errors', async () => {
      // Arrange
      const key = 'test/missing.jpg';
      (mockS3Client.send as jest.Mock).mockRejectedValue(new Error('Not found'));

      // Act & Assert
      await expect(storageService.getFileMetadata(key)).rejects.toThrow(
        'Failed to get file metadata'
      );
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      // Arrange
      const key = 'test/image.jpg';
      (mockS3Client.send as jest.Mock).mockResolvedValue({
        ContentLength: 12345,
        ContentType: 'image/jpeg',
        LastModified: new Date(),
        ETag: '"abc123"',
      });

      // Act
      const result = await storageService.fileExists(key);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      // Arrange
      const key = 'test/missing.jpg';
      (mockS3Client.send as jest.Mock).mockRejectedValue(new Error('Not found'));

      // Act
      const result = await storageService.fileExists(key);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('copyFile', () => {
    it('should copy file successfully', async () => {
      // Arrange
      const sourceKey = 'test/image.jpg';
      const destinationKey = 'test/image-copy.jpg';
      (mockS3Client.send as jest.Mock).mockResolvedValue({});

      // Act
      await storageService.copyFile(sourceKey, destinationKey);

      // Assert
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(CopyObjectCommand));
    });

    it('should handle copy errors', async () => {
      // Arrange
      const sourceKey = 'test/image.jpg';
      const destinationKey = 'test/image-copy.jpg';
      (mockS3Client.send as jest.Mock).mockRejectedValue(new Error('Copy failed'));

      // Act & Assert
      await expect(storageService.copyFile(sourceKey, destinationKey)).rejects.toThrow(
        'Failed to copy file'
      );
    });
  });

  describe('moveFile', () => {
    it('should move file successfully', async () => {
      // Arrange
      const sourceKey = 'test/image.jpg';
      const destinationKey = 'test/moved/image.jpg';
      (mockS3Client.send as jest.Mock).mockResolvedValue({});

      // Act
      await storageService.moveFile(sourceKey, destinationKey);

      // Assert
      expect(mockS3Client.send).toHaveBeenCalledTimes(2); // Copy + Delete
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(CopyObjectCommand));
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });
  });

  describe('listFiles', () => {
    it('should list files successfully', async () => {
      // Arrange
      const prefix = 'test/';
      const mockContents = [
        {
          Key: 'test/image1.jpg',
          Size: 12345,
          LastModified: new Date('2025-01-01'),
          ETag: '"abc123"',
        },
        {
          Key: 'test/image2.jpg',
          Size: 67890,
          LastModified: new Date('2025-01-02'),
          ETag: '"def456"',
        },
      ];
      (mockS3Client.send as jest.Mock).mockResolvedValue({ Contents: mockContents });

      // Act
      const result = await storageService.listFiles(prefix);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.key).toBe('test/image1.jpg');
      expect(result[1]?.key).toBe('test/image2.jpg');
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(ListObjectsV2Command));
    });

    it('should return empty array when no files found', async () => {
      // Arrange
      const prefix = 'test/';
      (mockS3Client.send as jest.Mock).mockResolvedValue({ Contents: undefined });

      // Act
      const result = await storageService.listFiles(prefix);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle list errors', async () => {
      // Arrange
      const prefix = 'test/';
      (mockS3Client.send as jest.Mock).mockRejectedValue(new Error('List failed'));

      // Act & Assert
      await expect(storageService.listFiles(prefix)).rejects.toThrow('Failed to list files');
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL successfully', async () => {
      // Arrange
      const key = 'test/image.jpg';

      // Act
      const result = await storageService.getSignedUrl(key);

      // Assert
      expect(result).toBe('https://signed-url.example.com');
      expect(getSignedUrl).toHaveBeenCalled();
    });

    it('should handle signed URL errors', async () => {
      // Arrange
      const key = 'test/image.jpg';
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('Sign failed'));

      // Act & Assert
      await expect(storageService.getSignedUrl(key)).rejects.toThrow(
        'Failed to generate signed URL'
      );
    });

    it('should use custom expiry time', async () => {
      // Arrange
      const key = 'test/image.jpg';
      const expiresIn = 7200;

      // Act
      await storageService.getSignedUrl(key, expiresIn);

      // Assert
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 7200 }
      );
    });
  });

  describe('getSignedUploadUrl', () => {
    it('should generate signed upload URL successfully', async () => {
      // Arrange
      const key = 'test/image.jpg';
      const contentType = 'image/jpeg';

      // Act
      const result = await storageService.getSignedUploadUrl(key, contentType);

      // Assert
      expect(result).toBe('https://signed-url.example.com');
      expect(getSignedUrl).toHaveBeenCalled();
    });
  });

  describe('getPublicUrl', () => {
    it('should generate CDN URL when configured', () => {
      // Arrange
      const key = 'test/image.jpg';

      // Act
      const result = storageService.getPublicUrl(key);

      // Assert
      expect(result).toBe('https://cdn.example.com/test/image.jpg');
    });
  });

  describe('generateFileKey', () => {
    it('should generate unique file key', () => {
      // Arrange
      const prefix = 'uploads';
      const filename = 'test-image.jpg';

      // Act
      const result = storageService.generateFileKey(prefix, filename);

      // Assert
      expect(result).toMatch(/^uploads\/\d+-[a-z0-9]+\.jpg$/);
    });
  });

  describe('getStorageStats', () => {
    it('should calculate storage statistics', async () => {
      // Arrange
      const prefix = 'test/';
      const mockContents = [
        { Key: 'test/file1.jpg', Size: 1000, LastModified: new Date(), ETag: '"abc"' },
        { Key: 'test/file2.jpg', Size: 2000, LastModified: new Date(), ETag: '"def"' },
        { Key: 'test/file3.jpg', Size: 3000, LastModified: new Date(), ETag: '"ghi"' },
      ];
      (mockS3Client.send as jest.Mock).mockResolvedValue({ Contents: mockContents });

      // Act
      const result = await storageService.getStorageStats(prefix);

      // Assert
      expect(result).toEqual({
        count: 3,
        totalSize: 6000,
      });
    });

    it('should handle stats errors', async () => {
      // Arrange
      const prefix = 'test/';
      (mockS3Client.send as jest.Mock).mockRejectedValue(new Error('Stats failed'));

      // Act & Assert
      await expect(storageService.getStorageStats(prefix)).rejects.toThrow(
        'Failed to get storage stats'
      );
    });
  });

  describe('getFileStream', () => {
    it('should get file stream successfully', async () => {
      // Arrange
      const key = 'test/image.jpg';
      const mockStream = Readable.from([Buffer.from('test-data')]);
      (mockS3Client.send as jest.Mock).mockResolvedValue({
        Body: mockStream,
      });

      // Act
      const result = await storageService.getFileStream(key);

      // Assert
      expect(result).toBeInstanceOf(Readable);
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
    });

    it('should handle stream errors', async () => {
      // Arrange
      const key = 'test/missing.jpg';
      (mockS3Client.send as jest.Mock).mockResolvedValue({ Body: null });

      // Act & Assert
      await expect(storageService.getFileStream(key)).rejects.toThrow('File body is empty');
    });
  });
});
