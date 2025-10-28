/**
 * Image Processing Service
 * 
 * Provides comprehensive image processing capabilities:
 * - Image validation and format detection
 * - Multiple thumbnail generation
 * - Image optimization and compression
 * - Format conversion (JPEG, PNG, WebP)
 * - EXIF metadata handling
 * - Image resizing with aspect ratio preservation
 */

import sharp, { Sharp, FormatEnum } from 'sharp';
import { imageConfig } from '../config/s3';
import { getStorageService, StorageService } from './storage.service';

/**
 * Image Size Configuration
 */
export interface ImageSize {
  name: string;
  width: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

/**
 * Image Processing Options
 */
export interface ProcessingOptions {
  quality?: number;
  format?: keyof FormatEnum;
  stripExif?: boolean;
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  };
}

/**
 * Image Metadata
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
  orientation?: number;
  exif?: any;
}

/**
 * Processed Image Result
 */
export interface ProcessedImage {
  original: {
    key: string;
    url: string;
    width: number;
    height: number;
    size: number;
  };
  variants: {
    [key: string]: {
      key: string;
      url: string;
      width: number;
      height: number;
      size: number;
    };
  };
}

/**
 * Image Processing Service Class
 */
export class ImageProcessingService {
  private storageService: StorageService;

  constructor() {
    this.storageService = getStorageService();
  }

  /**
   * Validate Image File
   */
  async validateImage(buffer: Buffer): Promise<{ valid: boolean; error?: string; metadata?: ImageMetadata }> {
    try {
      const metadata = await this.extractMetadata(buffer);

      // Check file size
      if (buffer.length > 10 * 1024 * 1024) { // 10MB max
        return {
          valid: false,
          error: `Image size ${buffer.length} bytes exceeds maximum 10MB`,
        };
      }

      // Check dimensions
      if (metadata.width > imageConfig.maxWidth || metadata.height > imageConfig.maxHeight) {
        return {
          valid: false,
          error: `Image dimensions ${metadata.width}x${metadata.height} exceed maximum ${imageConfig.maxWidth}x${imageConfig.maxHeight}`,
        };
      }

      // Check format
      const allowedFormats = ['jpeg', 'png', 'webp', 'gif'];
      if (!allowedFormats.includes(metadata.format)) {
        return {
          valid: false,
          error: `Image format ${metadata.format} is not allowed`,
        };
      }

      return {
        valid: true,
        metadata,
      };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid image file: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Extract Image Metadata
   */
  async extractMetadata(buffer: Buffer): Promise<ImageMetadata> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        hasAlpha: metadata.hasAlpha || false,
        orientation: metadata.orientation || 1,
        exif: metadata.exif || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to extract image metadata: ${(error as Error).message}`);
    }
  }

  /**
   * Process Image with Options
   */
  async processImage(buffer: Buffer, options: ProcessingOptions = {}): Promise<Buffer> {
    try {
      let image: Sharp = sharp(buffer);

      // Auto-rotate based on EXIF orientation
      image = image.rotate();

      // Resize if specified
      if (options.resize) {
        image = image.resize({
          width: options.resize.width,
          height: options.resize.height,
          fit: options.resize.fit || 'inside',
          withoutEnlargement: true,
        });
      }

      // Strip EXIF data if requested
      if (options.stripExif !== false) {
        image = image.withMetadata({
          orientation: undefined,
          exif: {},
          icc: undefined,
        });
      }

      // Convert format if specified
      const format = options.format || 'jpeg';
      const quality = options.quality || 80;

      switch (format) {
        case 'jpeg':
          image = image.jpeg({ quality, progressive: true });
          break;
        case 'png':
          image = image.png({ compressionLevel: 9 });
          break;
        case 'webp':
          image = image.webp({ quality });
          break;
        default:
          image = image.jpeg({ quality, progressive: true });
      }

      return await image.toBuffer();
    } catch (error) {
      throw new Error(`Failed to process image: ${(error as Error).message}`);
    }
  }

  /**
   * Generate Image Thumbnails
   */
  async generateThumbnails(buffer: Buffer): Promise<{ [key: string]: Buffer }> {
    const sizes: ImageSize[] = [
      { name: 'thumbnail', width: 150, fit: 'cover' },
      { name: 'medium', width: 400, fit: 'inside' },
      { name: 'large', width: 800, fit: 'inside' },
    ];

    const thumbnails: { [key: string]: Buffer } = {};

    for (const size of sizes) {
      try {
        const processed = await this.processImage(buffer, {
          resize: {
            width: size.width,
            height: size.height,
            fit: size.fit,
          } as { width?: number; height?: number; fit?: "fill" | "cover" | "contain" | "inside" | "outside"; },
          quality: 80,
          stripExif: true,
        });

        thumbnails[size.name] = processed;
      } catch (error) {
        console.error(`Failed to generate ${size.name} thumbnail:`, error);
      }
    }

    return thumbnails;
  }

  /**
   * Optimize Image
   */
  async optimizeImage(buffer: Buffer, targetFormat?: keyof FormatEnum): Promise<Buffer> {
    try {
      const metadata = await this.extractMetadata(buffer);
      const format = targetFormat || (metadata.format as keyof FormatEnum);

      return await this.processImage(buffer, {
        format,
        quality: 80,
        stripExif: true,
      });
    } catch (error) {
      throw new Error(`Failed to optimize image: ${(error as Error).message}`);
    }
  }

  /**
   * Convert Image to WebP
   */
  async convertToWebP(buffer: Buffer): Promise<Buffer> {
    try {
      return await this.processImage(buffer, {
        format: 'webp',
        quality: 80,
        stripExif: true,
      });
    } catch (error) {
      throw new Error(`Failed to convert image to WebP: ${(error as Error).message}`);
    }
  }

  /**
   * Resize Image
   */
  async resizeImage(
    buffer: Buffer,
    width?: number,
    height?: number,
    fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' = 'inside'
  ): Promise<Buffer> {
    try {
      return await this.processImage(buffer, {
        resize: { width, height, fit } as { width?: number; height?: number; fit?: "fill" | "cover" | "contain" | "inside" | "outside"; },
        stripExif: true,
      });
    } catch (error) {
      throw new Error(`Failed to resize image: ${(error as Error).message}`);
    }
  }

  /**
   * Process and Upload Image with Variants
   */
  async processAndUpload(
    buffer: Buffer,
    baseKey: string,
    generateVariants: boolean = true
  ): Promise<ProcessedImage> {
    try {
      // Validate image
      const validation = await this.validateImage(buffer);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const metadata = validation.metadata!;

      // Process original image
      const originalProcessed = await this.optimizeImage(buffer);
      const originalMetadata = await this.extractMetadata(originalProcessed);

      // Upload original
      const originalKey = `${baseKey}/original.jpg`;
      const originalUpload = await this.storageService.uploadFile(originalKey, originalProcessed, {
        contentType: 'image/jpeg',
        metadata: {
          width: originalMetadata.width.toString(),
          height: originalMetadata.height.toString(),
          originalFormat: metadata.format,
        },
      });

      const result: ProcessedImage = {
        original: {
          key: originalUpload.key,
          url: originalUpload.url,
          width: originalMetadata.width,
          height: originalMetadata.height,
          size: originalProcessed.length,
        },
        variants: {},
      };

      // Generate and upload variants
      if (generateVariants) {
        const thumbnails = await this.generateThumbnails(buffer);

        for (const [name, thumbnailBuffer] of Object.entries(thumbnails)) {
          const variantKey = `${baseKey}/${name}.jpg`;
          const variantMetadata = await this.extractMetadata(thumbnailBuffer);

          const variantUpload = await this.storageService.uploadFile(variantKey, thumbnailBuffer, {
            contentType: 'image/jpeg',
            metadata: {
              width: variantMetadata.width.toString(),
              height: variantMetadata.height.toString(),
              variant: name,
            },
          });

          result.variants[name] = {
            key: variantUpload.key,
            url: variantUpload.url,
            width: variantMetadata.width,
            height: variantMetadata.height,
            size: thumbnailBuffer.length,
          };
        }

        // Generate WebP versions if enabled
        if (true) { // WebP conversion enabled
          try {
            const webpOriginal = await this.convertToWebP(buffer);
            const webpKey = `${baseKey}/original.webp`;
            const webpUpload = await this.storageService.uploadFile(webpKey, webpOriginal, {
              contentType: 'image/webp',
            });

            result.variants['webp'] = {
              key: webpUpload.key,
              url: webpUpload.url,
              width: originalMetadata.width,
              height: originalMetadata.height,
              size: webpOriginal.length,
            };
          } catch (error) {
            console.error('Failed to generate WebP version:', error);
          }
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to process and upload image: ${(error as Error).message}`);
    }
  }

  /**
   * Delete Image and All Variants
   */
  async deleteImageWithVariants(baseKey: string): Promise<void> {
    try {
      // List all files with this base key
      const files = await this.storageService.listFiles(baseKey);
      const keys = files.map(file => file.key);

      if (keys.length > 0) {
        await this.storageService.deleteFiles(keys);
      }
    } catch (error) {
      throw new Error(`Failed to delete image variants: ${(error as Error).message}`);
    }
  }

  /**
   * Get Image Dimensions
   */
  async getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
    try {
      const metadata = await this.extractMetadata(buffer);
      return {
        width: metadata.width,
        height: metadata.height,
      };
    } catch (error) {
      throw new Error(`Failed to get image dimensions: ${(error as Error).message}`);
    }
  }

  /**
   * Calculate Aspect Ratio
   */
  calculateAspectRatio(width: number, height: number): number {
    return width / height;
  }

  /**
   * Calculate Dimensions for Target Width
   */
  calculateDimensionsForWidth(originalWidth: number, originalHeight: number, targetWidth: number): { width: number; height: number } {
    const aspectRatio = this.calculateAspectRatio(originalWidth, originalHeight);
    return {
      width: targetWidth,
      height: Math.round(targetWidth / aspectRatio),
    };
  }

  /**
   * Calculate Dimensions for Target Height
   */
  calculateDimensionsForHeight(originalWidth: number, originalHeight: number, targetHeight: number): { width: number; height: number } {
    const aspectRatio = this.calculateAspectRatio(originalWidth, originalHeight);
    return {
      width: Math.round(targetHeight * aspectRatio),
      height: targetHeight,
    };
  }

  /**
   * Strip EXIF Data from Image
   */
  async stripExifData(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .withMetadata({
          orientation: undefined,
          exif: {},
          icc: undefined,
        })
        .toBuffer();
    } catch (error) {
      throw new Error(`Failed to strip EXIF data: ${(error as Error).message}`);
    }
  }
}

/**
 * Singleton Image Processing Service Instance
 */
let imageProcessingService: ImageProcessingService | null = null;

/**
 * Get or Create Image Processing Service Instance
 */
export function getImageProcessingService(): ImageProcessingService {
  if (!imageProcessingService) {
    imageProcessingService = new ImageProcessingService();
  }
  return imageProcessingService;
}

/**
 * Export Default Image Processing Service
 */
export default getImageProcessingService();

