/**
 * File Management Service Unit Tests
 * Tests for high-level file management operations
 */

// Mock UUID first
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

// Create mock objects before they're used
const mockStorageService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getSignedUrl: jest.fn(),
  listFiles: jest.fn(),
  deleteFiles: jest.fn(),
};

const mockImageProcessingService = {
  validateImage: jest.fn(),
  processAndUpload: jest.fn(),
  deleteImageWithVariants: jest.fn(),
};

const mockCDNService = {
  isEnabled: jest.fn(),
  invalidateFile: jest.fn(),
};

// Mock service modules
jest.mock('../storage.service', () => ({
  getStorageService: jest.fn(() => mockStorageService),
  StorageService: jest.fn(),
}));

jest.mock('../image-processing.service', () => ({
  getImageProcessingService: jest.fn(() => mockImageProcessingService),
  ImageProcessingService: jest.fn(),
}));

jest.mock('../cdn.service', () => ({
  getCDNService: jest.fn(() => mockCDNService),
  CDNService: jest.fn(),
}));

import { FileManagementService, FileType, AccessLevel } from '../file-management.service';
import { Pool } from 'pg';

// Mock Database Pool
const mockDb = {
  query: jest.fn(),
} as unknown as Pool;

describe('FileManagementService', () => {
  let fileManagementService: FileManagementService;

  beforeEach(() => {
    jest.clearAllMocks();
    fileManagementService = new FileManagementService(mockDb);
  });

  describe('uploadItemPhoto', () => {
    it('should upload item photo with variants', async () => {
      // Arrange
      const userId = 'user-123';
      const itemId = 'item-456';
      const buffer = Buffer.from('fake-image-data');
      const filename = 'test-photo.jpg';

      (mockImageProcessingService.validateImage as jest.Mock).mockResolvedValue({
        valid: true,
        metadata: { width: 1920, height: 1080, format: 'jpeg' },
      });

      (mockImageProcessingService.processAndUpload as jest.Mock).mockResolvedValue({
        original: {
          key: 'items/item-456/photos/test-uuid-123/original.jpg',
          url: 'https://cdn.example.com/original.jpg',
          width: 1920,
          height: 1080,
          size: 123456,
        },
        variants: {
          thumbnail: {
            key: 'items/item-456/photos/test-uuid-123/thumbnail.jpg',
            url: 'https://cdn.example.com/thumbnail.jpg',
            width: 300,
            height: 169,
            size: 12345,
          },
        },
      });

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Act
      const result = await fileManagementService.uploadItemPhoto(userId, itemId, buffer, filename);

      // Assert
      expect(result.fileId).toBe('test-uuid-123');
      expect(result.original.url).toBe('https://cdn.example.com/original.jpg');
      expect(result.variants).toBeDefined();
      expect(mockImageProcessingService.validateImage).toHaveBeenCalledWith(buffer);
      expect(mockImageProcessingService.processAndUpload).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should reject invalid image', async () => {
      // Arrange
      const userId = 'user-123';
      const itemId = 'item-456';
      const buffer = Buffer.from('invalid-data');
      const filename = 'bad-file.txt';

      (mockImageProcessingService.validateImage as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Invalid image format',
      });

      // Act & Assert
      await expect(
        fileManagementService.uploadItemPhoto(userId, itemId, buffer, filename)
      ).rejects.toThrow('Failed to upload item photo');
    });
  });

  describe('uploadProfilePhoto', () => {
    it('should upload profile photo and delete existing ones', async () => {
      // Arrange
      const userId = 'user-123';
      const buffer = Buffer.from('fake-image-data');
      const filename = 'profile.jpg';

      (mockImageProcessingService.validateImage as jest.Mock).mockResolvedValue({
        valid: true,
        metadata: { width: 800, height: 800, format: 'jpeg' },
      });

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // deleteUserProfilePhotos query
        .mockResolvedValueOnce({ rows: [] }); // saveFileRecord query

      (mockImageProcessingService.processAndUpload as jest.Mock).mockResolvedValue({
        original: {
          key: 'profiles/user-123/photo/test-uuid-123/original.jpg',
          url: 'https://cdn.example.com/profile.jpg',
          width: 800,
          height: 800,
          size: 65536,
        },
        variants: {},
      });

      // Act
      const result = await fileManagementService.uploadProfilePhoto(userId, buffer, filename);

      // Assert
      expect(result.fileId).toBe('test-uuid-123');
      expect(result.original.url).toBe('https://cdn.example.com/profile.jpg');
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should reject invalid profile photo', async () => {
      // Arrange
      const userId = 'user-123';
      const buffer = Buffer.from('invalid-data');
      const filename = 'bad-profile.txt';

      (mockImageProcessingService.validateImage as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Invalid image format',
      });

      // Act & Assert
      await expect(
        fileManagementService.uploadProfilePhoto(userId, buffer, filename)
      ).rejects.toThrow('Failed to upload profile photo');
    });
  });

  describe('uploadVerificationDocument', () => {
    it('should upload verification document', async () => {
      // Arrange
      const userId = 'user-123';
      const buffer = Buffer.from('document-data');
      const filename = 'passport.pdf';
      const documentType = 'passport';

      (mockStorageService.uploadFile as jest.Mock).mockResolvedValue({
        key: 'verification/user-123/passport/test-uuid-123/passport.pdf',
        url: 'https://s3.example.com/passport.pdf',
        etag: '"abc123"',
      });

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Act
      const result = await fileManagementService.uploadVerificationDocument(
        userId,
        buffer,
        filename,
        documentType
      );

      // Assert
      expect(result.fileId).toBe('test-uuid-123');
      expect(result.original.key).toContain('passport');
      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        expect.stringContaining('verification'),
        buffer,
        expect.objectContaining({ acl: 'private' })
      );
    });
  });

  describe('getItemPhotos', () => {
    it('should retrieve all item photos', async () => {
      // Arrange
      const itemId = 'item-456';
      const mockPhotos = [
        {
          id: 'photo-1',
          entity_id: itemId,
          entity_type: FileType.ITEM_PHOTO,
          url: 'https://cdn.example.com/photo1.jpg',
        },
        {
          id: 'photo-2',
          entity_id: itemId,
          entity_type: FileType.ITEM_PHOTO,
          url: 'https://cdn.example.com/photo2.jpg',
        },
      ];

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: mockPhotos });

      // Act
      const result = await fileManagementService.getItemPhotos(itemId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('photo-1');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM files'),
        [itemId, FileType.ITEM_PHOTO]
      );
    });

    it('should throw error when database not available', async () => {
      // Arrange
      const serviceWithoutDb = new FileManagementService();
      const itemId = 'item-456';

      // Act & Assert
      await expect(serviceWithoutDb.getItemPhotos(itemId)).rejects.toThrow(
        'Database connection not available'
      );
    });
  });

  describe('getUserProfilePhoto', () => {
    it('should retrieve user profile photo', async () => {
      // Arrange
      const userId = 'user-123';
      const mockPhoto = {
        id: 'photo-1',
        entity_id: userId,
        entity_type: FileType.PROFILE_PHOTO,
        url: 'https://cdn.example.com/profile.jpg',
      };

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockPhoto] });

      // Act
      const result = await fileManagementService.getUserProfilePhoto(userId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('photo-1');
    });

    it('should return null when no profile photo exists', async () => {
      // Arrange
      const userId = 'user-123';
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Act
      const result = await fileManagementService.getUserProfilePhoto(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('deleteItemPhotos', () => {
    it('should delete all item photos and invalidate CDN', async () => {
      // Arrange
      const itemId = 'item-456';
      const mockPhotos = [
        {
          id: 'photo-1',
          key: 'items/item-456/photos/uuid-1/original.jpg',
          userId: 'user-123',
        },
      ];

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockPhotos }) // getItemPhotos
        .mockResolvedValueOnce({ rows: [] }); // DELETE query

      (mockImageProcessingService.deleteImageWithVariants as jest.Mock).mockResolvedValue(undefined);
      (mockCDNService.isEnabled as jest.Mock).mockReturnValue(true);
      (mockCDNService.invalidateFile as jest.Mock).mockResolvedValue(undefined);

      // Act
      await fileManagementService.deleteItemPhotos(itemId);

      // Assert
      expect(mockImageProcessingService.deleteImageWithVariants).toHaveBeenCalled();
      expect(mockCDNService.invalidateFile).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM files'),
        ['photo-1']
      );
    });

    it('should skip CDN invalidation when CDN disabled', async () => {
      // Arrange
      const itemId = 'item-456';
      const mockPhotos = [
        {
          id: 'photo-1',
          key: 'items/item-456/photos/uuid-1/original.jpg',
          userId: 'user-123',
        },
      ];

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockPhotos })
        .mockResolvedValueOnce({ rows: [] });

      (mockCDNService.isEnabled as jest.Mock).mockReturnValue(false);

      // Act
      await fileManagementService.deleteItemPhotos(itemId);

      // Assert
      expect(mockCDNService.invalidateFile).not.toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should delete file owned by user', async () => {
      // Arrange
      const fileId = 'file-123';
      const userId = 'user-123';
      const mockFile = {
        id: fileId,
        user_id: userId,
        key: 'items/item-456/photos/uuid/original.jpg',
        entity_type: FileType.ITEM_PHOTO,
      };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockFile] }) // SELECT query
        .mockResolvedValueOnce({ rows: [] }); // DELETE query

      (mockImageProcessingService.deleteImageWithVariants as jest.Mock).mockResolvedValue(undefined);
      (mockCDNService.isEnabled as jest.Mock).mockReturnValue(false);

      // Act
      await fileManagementService.deleteFile(fileId, userId);

      // Assert
      expect(mockImageProcessingService.deleteImageWithVariants).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM files'),
        [fileId]
      );
    });

    it('should reject deletion of file not owned by user', async () => {
      // Arrange
      const fileId = 'file-123';
      const userId = 'user-123';

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Act & Assert
      await expect(fileManagementService.deleteFile(fileId, userId)).rejects.toThrow(
        'File not found or access denied'
      );
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL for private file', async () => {
      // Arrange
      const fileId = 'file-123';
      const userId = 'user-123';
      const mockFile = {
        id: fileId,
        user_id: userId,
        key: 'verification/user-123/document.pdf',
        access_level: AccessLevel.PRIVATE,
      };

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockFile] });
      (mockStorageService.getSignedUrl as jest.Mock).mockResolvedValue(
        'https://signed-url.example.com'
      );

      // Act
      const result = await fileManagementService.getSignedUrl(fileId, userId);

      // Assert
      expect(result).toBe('https://signed-url.example.com');
      expect(mockStorageService.getSignedUrl).toHaveBeenCalledWith(mockFile.key, 3600);
    });

    it('should deny access to private file for non-owner', async () => {
      // Arrange
      const fileId = 'file-123';
      const userId = 'user-456'; // Different user
      const mockFile = {
        id: fileId,
        user_id: 'user-123',
        key: 'verification/user-123/document.pdf',
        access_level: AccessLevel.PRIVATE,
      };

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockFile] });

      // Act & Assert
      await expect(fileManagementService.getSignedUrl(fileId, userId)).rejects.toThrow(
        'Access denied'
      );
    });

    it('should throw error for non-existent file', async () => {
      // Arrange
      const fileId = 'file-999';
      const userId = 'user-123';

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Act & Assert
      await expect(fileManagementService.getSignedUrl(fileId, userId)).rejects.toThrow(
        'File not found'
      );
    });
  });

  describe('reorderItemPhotos', () => {
    it('should reorder photos for item owner', async () => {
      // Arrange
      const itemId = 'item-456';
      const userId = 'user-123';
      const photoIds = ['photo-2', 'photo-1', 'photo-3'];
      const mockPhotos = [
        { id: 'photo-1', userId: 'user-123' },
        { id: 'photo-2', userId: 'user-123' },
        { id: 'photo-3', userId: 'user-123' },
      ];

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockPhotos }) // getItemPhotos
        .mockResolvedValue({ rows: [] }); // UPDATE queries

      // Act
      await fileManagementService.reorderItemPhotos(itemId, userId, photoIds);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE files'),
        expect.arrayContaining(['0', 'photo-2'])
      );
    });

    it('should reject reordering photos not owned by user', async () => {
      // Arrange
      const itemId = 'item-456';
      const userId = 'user-123';
      const photoIds = ['photo-1', 'photo-2'];
      const mockPhotos = [
        { id: 'photo-1', userId: 'user-999' }, // Different owner
      ];

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: mockPhotos });

      // Act & Assert
      await expect(
        fileManagementService.reorderItemPhotos(itemId, userId, photoIds)
      ).rejects.toThrow('Access denied for one or more photos');
    });
  });

  describe('cleanupExpiredFiles', () => {
    it('should delete expired temporary files', async () => {
      // Arrange
      const mockExpiredFiles = [
        {
          id: 'file-1',
          key: 'temp/file1.jpg',
          expires_at: new Date('2024-01-01'),
        },
        {
          id: 'file-2',
          key: 'temp/file2.jpg',
          expires_at: new Date('2024-01-01'),
        },
      ];

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockExpiredFiles }) // SELECT expired files
        .mockResolvedValue({ rows: [] }); // DELETE queries

      (mockStorageService.deleteFile as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await fileManagementService.cleanupExpiredFiles();

      // Assert
      expect(result.deleted).toBe(2);
      expect(mockStorageService.deleteFile).toHaveBeenCalledTimes(2);
    });

    it('should continue cleanup even if some files fail', async () => {
      // Arrange
      const mockExpiredFiles = [
        { id: 'file-1', key: 'temp/file1.jpg', expires_at: new Date('2024-01-01') },
        { id: 'file-2', key: 'temp/file2.jpg', expires_at: new Date('2024-01-01') },
      ];

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockExpiredFiles })
        .mockResolvedValue({ rows: [] });

      (mockStorageService.deleteFile as jest.Mock)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined);

      // Act
      const result = await fileManagementService.cleanupExpiredFiles();

      // Assert
      expect(result.deleted).toBe(1); // Only one succeeded
    });
  });

  describe('getStorageStatistics', () => {
    it('should return storage statistics for user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockStats = [
        {
          entity_type: FileType.ITEM_PHOTO,
          type_count: '5',
          type_size: '500000',
        },
        {
          entity_type: FileType.PROFILE_PHOTO,
          type_count: '1',
          type_size: '50000',
        },
      ];

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: mockStats });

      // Act
      const result = await fileManagementService.getStorageStatistics(userId);

      // Assert
      expect(result.totalFiles).toBe(6);
      expect(result.totalSize).toBe(550000);
      expect(result.byType[FileType.ITEM_PHOTO]).toEqual({
        count: 5,
        size: 500000,
      });
      expect(result.byType[FileType.PROFILE_PHOTO]).toEqual({
        count: 1,
        size: 50000,
      });
    });

    it('should return global statistics when no userId provided', async () => {
      // Arrange
      const mockStats = [
        {
          entity_type: FileType.ITEM_PHOTO,
          type_count: '100',
          type_size: '10000000',
        },
      ];

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: mockStats });

      // Act
      const result = await fileManagementService.getStorageStatistics();

      // Assert
      expect(result.totalFiles).toBe(100);
      expect(result.totalSize).toBe(10000000);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.not.stringContaining('WHERE user_id'),
        []
      );
    });
  });
});

