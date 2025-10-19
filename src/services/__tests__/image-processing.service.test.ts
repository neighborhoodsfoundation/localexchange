/**
 * Image Processing Service Unit Tests
 * Tests for Sharp-based image processing operations
 */

// Mock dependencies
jest.mock('sharp');
jest.mock('../storage.service');
jest.mock('../../config/s3', () => ({
  storageConfig: {
    maxFileSize: 10485760, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
}));

import { ImageProcessingService } from '../image-processing.service';
import sharp from 'sharp';

// Mock Sharp
const mockSharpInstance = {
  metadata: jest.fn(),
  rotate: jest.fn().mockReturnThis(),
  resize: jest.fn().mockReturnThis(),
  withMetadata: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(),
};

(sharp as unknown as jest.Mock).mockReturnValue(mockSharpInstance);

// Mock Storage Service
const mockStorageService = {
  uploadFile: jest.fn(),
  listFiles: jest.fn(),
  deleteFiles: jest.fn(),
};

jest.mock('../storage.service', () => ({
  getStorageService: jest.fn(() => mockStorageService),
  StorageService: jest.fn(),
}));

describe('ImageProcessingService', () => {
  let imageProcessingService: ImageProcessingService;

  beforeEach(() => {
    jest.clearAllMocks();
    imageProcessingService = new ImageProcessingService();
    
    // Reset sharp mock
    (sharp as unknown as jest.Mock).mockReturnValue(mockSharpInstance);
  });

  describe('validateImage', () => {
    it('should validate correct image successfully', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      mockSharpInstance.metadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'jpeg',
        hasAlpha: false,
      });
      mockSharpInstance.toBuffer.mockResolvedValue(buffer);

      // Act
      const result = await imageProcessingService.validateImage(buffer);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.width).toBe(1920);
      expect(result.metadata?.height).toBe(1080);
    });

    it('should reject image exceeding file size limit', async () => {
      // Arrange
      const buffer = Buffer.alloc(20 * 1024 * 1024); // 20MB
      mockSharpInstance.metadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'jpeg',
      });

      // Act
      const result = await imageProcessingService.validateImage(buffer);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should reject image exceeding dimension limits', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      mockSharpInstance.metadata.mockResolvedValue({
        width: 5000,
        height: 5000,
        format: 'jpeg',
      });

      // Act
      const result = await imageProcessingService.validateImage(buffer);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toContain('dimensions');
    });

    it('should reject unsupported image format', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      mockSharpInstance.metadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'tiff',
      });

      // Act
      const result = await imageProcessingService.validateImage(buffer);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toContain('format');
    });

    it('should handle invalid image buffer', async () => {
      // Arrange
      const buffer = Buffer.from('invalid-data');
      mockSharpInstance.metadata.mockRejectedValue(new Error('Invalid image'));

      // Act
      const result = await imageProcessingService.validateImage(buffer);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid image file');
    });
  });

  describe('extractMetadata', () => {
    it('should extract image metadata successfully', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      mockSharpInstance.metadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'jpeg',
        hasAlpha: false,
        orientation: 1,
        exif: { Make: 'Canon' },
      });

      // Act
      const result = await imageProcessingService.extractMetadata(buffer);

      // Assert
      expect(result).toEqual({
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: buffer.length,
        hasAlpha: false,
        orientation: 1,
        exif: { Make: 'Canon' },
      });
    });

    it('should handle metadata extraction errors', async () => {
      // Arrange
      const buffer = Buffer.from('invalid-data');
      mockSharpInstance.metadata.mockRejectedValue(new Error('Metadata failed'));

      // Act & Assert
      await expect(imageProcessingService.extractMetadata(buffer)).rejects.toThrow(
        'Failed to extract image metadata'
      );
    });
  });

  describe('processImage', () => {
    it('should process image with default options', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      const processedBuffer = Buffer.from('processed-image-data');
      mockSharpInstance.toBuffer.mockResolvedValue(processedBuffer);

      // Act
      const result = await imageProcessingService.processImage(buffer);

      // Assert
      expect(result).toBe(processedBuffer);
      expect(mockSharpInstance.rotate).toHaveBeenCalled();
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({
        quality: 85,
        progressive: true,
      });
    });

    it('should resize image when resize options provided', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      const processedBuffer = Buffer.from('processed-image-data');
      mockSharpInstance.toBuffer.mockResolvedValue(processedBuffer);

      // Act
      await imageProcessingService.processImage(buffer, {
        resize: { width: 800, height: 600, fit: 'cover' },
      });

      // Assert
      expect(mockSharpInstance.resize).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        fit: 'cover',
        withoutEnlargement: true,
      });
    });

    it('should convert to PNG format', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      const processedBuffer = Buffer.from('processed-image-data');
      mockSharpInstance.toBuffer.mockResolvedValue(processedBuffer);

      // Act
      await imageProcessingService.processImage(buffer, { format: 'png' });

      // Assert
      expect(mockSharpInstance.png).toHaveBeenCalledWith({ compressionLevel: 9 });
    });

    it('should convert to WebP format', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      const processedBuffer = Buffer.from('processed-image-data');
      mockSharpInstance.toBuffer.mockResolvedValue(processedBuffer);

      // Act
      await imageProcessingService.processImage(buffer, { format: 'webp', quality: 90 });

      // Assert
      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 90 });
    });

    it('should strip EXIF data', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      const processedBuffer = Buffer.from('processed-image-data');
      mockSharpInstance.toBuffer.mockResolvedValue(processedBuffer);

      // Act
      await imageProcessingService.processImage(buffer, { stripExif: true });

      // Assert
      expect(mockSharpInstance.withMetadata).toHaveBeenCalledWith({
        orientation: undefined,
        exif: {},
        icc: undefined,
      });
    });

    it('should handle processing errors', async () => {
      // Arrange
      const buffer = Buffer.from('invalid-data');
      mockSharpInstance.toBuffer.mockRejectedValue(new Error('Processing failed'));

      // Act & Assert
      await expect(imageProcessingService.processImage(buffer)).rejects.toThrow(
        'Failed to process image'
      );
    });
  });

  describe('generateThumbnails', () => {
    it('should generate all thumbnail sizes', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      const thumbnailBuffer = Buffer.from('thumbnail-data');
      mockSharpInstance.toBuffer.mockResolvedValue(thumbnailBuffer);

      // Act
      const result = await imageProcessingService.generateThumbnails(buffer);

      // Assert
      expect(result).toHaveProperty('thumbnail');
      expect(result).toHaveProperty('medium');
      expect(result).toHaveProperty('large');
      expect(result['thumbnail']).toBe(thumbnailBuffer);
    });

    it('should handle thumbnail generation errors gracefully', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      mockSharpInstance.toBuffer.mockRejectedValue(new Error('Thumbnail failed'));

      // Act
      const result = await imageProcessingService.generateThumbnails(buffer);

      // Assert
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('optimizeImage', () => {
    it('should optimize image with detected format', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      const optimizedBuffer = Buffer.from('optimized-data');
      mockSharpInstance.metadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'jpeg',
      });
      mockSharpInstance.toBuffer.mockResolvedValue(optimizedBuffer);

      // Act
      const result = await imageProcessingService.optimizeImage(buffer);

      // Assert
      expect(result).toBe(optimizedBuffer);
    });

    it('should optimize with target format', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      const optimizedBuffer = Buffer.from('optimized-data');
      mockSharpInstance.metadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'png',
      });
      mockSharpInstance.toBuffer.mockResolvedValue(optimizedBuffer);

      // Act
      await imageProcessingService.optimizeImage(buffer, 'webp');

      // Assert
      expect(mockSharpInstance.webp).toHaveBeenCalled();
    });
  });

  describe('convertToWebP', () => {
    it('should convert image to WebP format', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      const webpBuffer = Buffer.from('webp-data');
      mockSharpInstance.toBuffer.mockResolvedValue(webpBuffer);

      // Act
      const result = await imageProcessingService.convertToWebP(buffer);

      // Assert
      expect(result).toBe(webpBuffer);
      expect(mockSharpInstance.webp).toHaveBeenCalled();
    });
  });

  describe('resizeImage', () => {
    it('should resize image to specified dimensions', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      const resizedBuffer = Buffer.from('resized-data');
      mockSharpInstance.toBuffer.mockResolvedValue(resizedBuffer);

      // Act
      const result = await imageProcessingService.resizeImage(buffer, 800, 600, 'cover');

      // Assert
      expect(result).toBe(resizedBuffer);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        fit: 'cover',
        withoutEnlargement: true,
      });
    });
  });

  describe('processAndUpload', () => {
    it('should process and upload image with variants', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      const baseKey = 'items/123/image';
      
      mockSharpInstance.metadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'jpeg',
        hasAlpha: false,
      });
      
      const processedBuffer = Buffer.from('processed-data');
      mockSharpInstance.toBuffer.mockResolvedValue(processedBuffer);
      
      mockStorageService.uploadFile.mockResolvedValue({
        key: 'uploaded-key',
        url: 'https://example.com/image.jpg',
        etag: '"abc123"',
      });

      // Act
      const result = await imageProcessingService.processAndUpload(buffer, baseKey, true);

      // Assert
      expect(result.original).toBeDefined();
      expect(result.original.url).toBe('https://example.com/image.jpg');
      expect(result.variants).toBeDefined();
      expect(mockStorageService.uploadFile).toHaveBeenCalled();
    });

    it('should reject invalid images', async () => {
      // Arrange
      const buffer = Buffer.alloc(20 * 1024 * 1024); // 20MB - too large
      const baseKey = 'items/123/image';
      
      mockSharpInstance.metadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'jpeg',
      });

      // Act & Assert
      await expect(
        imageProcessingService.processAndUpload(buffer, baseKey)
      ).rejects.toThrow();
    });

    it('should process without variants when disabled', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      const baseKey = 'items/123/image';
      
      mockSharpInstance.metadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'jpeg',
        hasAlpha: false,
      });
      
      const processedBuffer = Buffer.from('processed-data');
      mockSharpInstance.toBuffer.mockResolvedValue(processedBuffer);
      
      mockStorageService.uploadFile.mockResolvedValue({
        key: 'uploaded-key',
        url: 'https://example.com/image.jpg',
        etag: '"abc123"',
      });

      // Act
      const result = await imageProcessingService.processAndUpload(buffer, baseKey, false);

      // Assert
      expect(result.original).toBeDefined();
      expect(Object.keys(result.variants)).toHaveLength(0);
    });
  });

  describe('deleteImageWithVariants', () => {
    it('should delete all image variants', async () => {
      // Arrange
      const baseKey = 'items/123/image';
      const mockFiles = [
        { key: 'items/123/image/original.jpg', size: 1000 },
        { key: 'items/123/image/thumbnail.jpg', size: 100 },
        { key: 'items/123/image/medium.jpg', size: 500 },
      ];
      mockStorageService.listFiles.mockResolvedValue(mockFiles);
      mockStorageService.deleteFiles.mockResolvedValue(undefined);

      // Act
      await imageProcessingService.deleteImageWithVariants(baseKey);

      // Assert
      expect(mockStorageService.listFiles).toHaveBeenCalledWith(baseKey);
      expect(mockStorageService.deleteFiles).toHaveBeenCalledWith([
        'items/123/image/original.jpg',
        'items/123/image/thumbnail.jpg',
        'items/123/image/medium.jpg',
      ]);
    });

    it('should handle no variants found', async () => {
      // Arrange
      const baseKey = 'items/123/image';
      mockStorageService.listFiles.mockResolvedValue([]);

      // Act
      await imageProcessingService.deleteImageWithVariants(baseKey);

      // Assert
      expect(mockStorageService.listFiles).toHaveBeenCalledWith(baseKey);
      expect(mockStorageService.deleteFiles).not.toHaveBeenCalled();
    });
  });

  describe('getImageDimensions', () => {
    it('should return image dimensions', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      mockSharpInstance.metadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'jpeg',
      });

      // Act
      const result = await imageProcessingService.getImageDimensions(buffer);

      // Assert
      expect(result).toEqual({ width: 1920, height: 1080 });
    });
  });

  describe('calculateAspectRatio', () => {
    it('should calculate aspect ratio correctly', () => {
      // Act
      const result = imageProcessingService.calculateAspectRatio(1920, 1080);

      // Assert
      expect(result).toBeCloseTo(1.778, 2);
    });
  });

  describe('calculateDimensionsForWidth', () => {
    it('should calculate dimensions for target width', () => {
      // Act
      const result = imageProcessingService.calculateDimensionsForWidth(1920, 1080, 800);

      // Assert
      expect(result.width).toBe(800);
      expect(result.height).toBe(450);
    });
  });

  describe('calculateDimensionsForHeight', () => {
    it('should calculate dimensions for target height', () => {
      // Act
      const result = imageProcessingService.calculateDimensionsForHeight(1920, 1080, 600);

      // Assert
      expect(result.width).toBe(1067);
      expect(result.height).toBe(600);
    });
  });

  describe('stripExifData', () => {
    it('should strip EXIF data from image', async () => {
      // Arrange
      const buffer = Buffer.from('fake-image-data');
      const strippedBuffer = Buffer.from('stripped-data');
      mockSharpInstance.toBuffer.mockResolvedValue(strippedBuffer);

      // Act
      const result = await imageProcessingService.stripExifData(buffer);

      // Assert
      expect(result).toBe(strippedBuffer);
      expect(mockSharpInstance.withMetadata).toHaveBeenCalledWith({
        orientation: undefined,
        exif: {},
        icc: undefined,
      });
    });

    it('should handle strip errors', async () => {
      // Arrange
      const buffer = Buffer.from('invalid-data');
      mockSharpInstance.toBuffer.mockRejectedValue(new Error('Strip failed'));

      // Act & Assert
      await expect(imageProcessingService.stripExifData(buffer)).rejects.toThrow(
        'Failed to strip EXIF data'
      );
    });
  });
});

