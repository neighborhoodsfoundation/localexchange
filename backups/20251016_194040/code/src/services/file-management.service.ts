/**
 * File Management Service
 * 
 * High-level file management for LocalEx platform:
 * - Item photo management
 * - Profile photo management
 * - Verification document management
 * - Access control and permissions
 * - Automatic cleanup of orphaned files
 * - File organization and metadata
 */

import { getStorageService, StorageService } from './storage.service';
import { getImageProcessingService, ImageProcessingService } from './image-processing.service';
import { getCDNService, CDNService } from './cdn.service';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

/**
 * File Type Enum
 */
export enum FileType {
  ITEM_PHOTO = 'item_photo',
  PROFILE_PHOTO = 'profile_photo',
  VERIFICATION_DOC = 'verification_doc',
  TEMP_UPLOAD = 'temp_upload',
}

/**
 * File Access Level
 */
export enum AccessLevel {
  PUBLIC = 'public',
  PRIVATE = 'private',
  AUTHENTICATED = 'authenticated',
}

/**
 * File Record
 */
export interface FileRecord {
  id: string;
  userId: string;
  entityId?: string; // Item ID, User ID, etc.
  entityType: FileType;
  key: string;
  url: string;
  variants?: Record<string, { key: string; url: string }>;
  size: number;
  contentType: string;
  accessLevel: AccessLevel;
  metadata?: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Upload Result
 */
export interface UploadResult {
  fileId: string;
  original: {
    key: string;
    url: string;
    width?: number;
    height?: number;
  };
  variants?: Record<string, { key: string; url: string }>;
}

/**
 * File Management Service Class
 */
export class FileManagementService {
  private storageService: StorageService;
  private imageProcessingService: ImageProcessingService;
  private cdnService: CDNService;
  private db: Pool | null = null;

  constructor(db?: Pool) {
    this.storageService = getStorageService();
    this.imageProcessingService = getImageProcessingService();
    this.cdnService = getCDNService();
    this.db = db || null;
  }

  /**
   * Upload Item Photo
   */
  async uploadItemPhoto(
    userId: string,
    itemId: string,
    buffer: Buffer,
    filename: string
  ): Promise<UploadResult> {
    try {
      // Validate image
      const validation = await this.imageProcessingService.validateImage(buffer);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate base key
      const fileId = uuidv4();
      const baseKey = `items/${itemId}/photos/${fileId}`;

      // Process and upload image with variants
      const processed = await this.imageProcessingService.processAndUpload(buffer, baseKey, true);

      // Save file record to database
      if (this.db) {
        await this.saveFileRecord({
          id: fileId,
          userId,
          entityId: itemId,
          entityType: FileType.ITEM_PHOTO,
          key: processed.original.key,
          url: processed.original.url,
          variants: processed.variants,
          size: processed.original.size,
          contentType: 'image/jpeg',
          accessLevel: AccessLevel.PUBLIC,
          metadata: {
            filename,
            width: processed.original.width,
            height: processed.original.height,
          },
          createdAt: new Date(),
        });
      }

      return {
        fileId,
        original: {
          key: processed.original.key,
          url: processed.original.url,
          width: processed.original.width,
          height: processed.original.height,
        },
        variants: processed.variants,
      };
    } catch (error) {
      throw new Error(`Failed to upload item photo: ${(error as Error).message}`);
    }
  }

  /**
   * Upload Profile Photo
   */
  async uploadProfilePhoto(
    userId: string,
    buffer: Buffer,
    filename: string
  ): Promise<UploadResult> {
    try {
      // Validate image
      const validation = await this.imageProcessingService.validateImage(buffer);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Delete existing profile photo
      await this.deleteUserProfilePhotos(userId);

      // Generate base key
      const fileId = uuidv4();
      const baseKey = `profiles/${userId}/photo/${fileId}`;

      // Process and upload image with variants
      const processed = await this.imageProcessingService.processAndUpload(buffer, baseKey, true);

      // Save file record to database
      if (this.db) {
        await this.saveFileRecord({
          id: fileId,
          userId,
          entityId: userId,
          entityType: FileType.PROFILE_PHOTO,
          key: processed.original.key,
          url: processed.original.url,
          variants: processed.variants,
          size: processed.original.size,
          contentType: 'image/jpeg',
          accessLevel: AccessLevel.PUBLIC,
          metadata: {
            filename,
            width: processed.original.width,
            height: processed.original.height,
          },
          createdAt: new Date(),
        });
      }

      return {
        fileId,
        original: {
          key: processed.original.key,
          url: processed.original.url,
          width: processed.original.width,
          height: processed.original.height,
        },
        variants: processed.variants,
      };
    } catch (error) {
      throw new Error(`Failed to upload profile photo: ${(error as Error).message}`);
    }
  }

  /**
   * Upload Verification Document
   */
  async uploadVerificationDocument(
    userId: string,
    buffer: Buffer,
    filename: string,
    documentType: string
  ): Promise<UploadResult> {
    try {
      // Generate base key
      const fileId = uuidv4();
      const baseKey = `verification/${userId}/${documentType}/${fileId}`;

      // Upload file (no variants for documents)
      const key = `${baseKey}/${filename}`;
      const upload = await this.storageService.uploadFile(key, buffer, {
        contentType: 'application/octet-stream',
        acl: 'private',
        metadata: {
          userId,
          documentType,
          filename,
        },
      });

      // Save file record to database
      if (this.db) {
        await this.saveFileRecord({
          id: fileId,
          userId,
          entityId: userId,
          entityType: FileType.VERIFICATION_DOC,
          key: upload.key,
          url: upload.url,
          size: buffer.length,
          contentType: 'application/octet-stream',
          accessLevel: AccessLevel.PRIVATE,
          metadata: {
            filename,
            documentType,
          },
          createdAt: new Date(),
        });
      }

      return {
        fileId,
        original: {
          key: upload.key,
          url: upload.url,
        },
      };
    } catch (error) {
      throw new Error(`Failed to upload verification document: ${(error as Error).message}`);
    }
  }

  /**
   * Get Item Photos
   */
  async getItemPhotos(itemId: string): Promise<FileRecord[]> {
    if (!this.db) {
      throw new Error('Database connection not available');
    }

    try {
      const result = await this.db.query(
        `SELECT * FROM files WHERE entity_id = $1 AND entity_type = $2 ORDER BY created_at ASC`,
        [itemId, FileType.ITEM_PHOTO]
      );

      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get item photos: ${(error as Error).message}`);
    }
  }

  /**
   * Get User Profile Photo
   */
  async getUserProfilePhoto(userId: string): Promise<FileRecord | null> {
    if (!this.db) {
      throw new Error('Database connection not available');
    }

    try {
      const result = await this.db.query(
        `SELECT * FROM files WHERE entity_id = $1 AND entity_type = $2 ORDER BY created_at DESC LIMIT 1`,
        [userId, FileType.PROFILE_PHOTO]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to get user profile photo: ${(error as Error).message}`);
    }
  }

  /**
   * Delete Item Photos
   */
  async deleteItemPhotos(itemId: string): Promise<void> {
    try {
      const photos = await this.getItemPhotos(itemId);

      for (const photo of photos) {
        // Delete from storage
        await this.imageProcessingService.deleteImageWithVariants(photo.key.split('/').slice(0, -1).join('/'));

        // Invalidate CDN cache
        if (this.cdnService.isEnabled()) {
          await this.cdnService.invalidateFile(photo.key);
        }

        // Delete from database
        if (this.db) {
          await this.db.query(`DELETE FROM files WHERE id = $1`, [photo.id]);
        }
      }
    } catch (error) {
      throw new Error(`Failed to delete item photos: ${(error as Error).message}`);
    }
  }

  /**
   * Delete User Profile Photos
   */
  private async deleteUserProfilePhotos(userId: string): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      const result = await this.db.query(
        `SELECT * FROM files WHERE entity_id = $1 AND entity_type = $2`,
        [userId, FileType.PROFILE_PHOTO]
      );

      for (const photo of result.rows) {
        // Delete from storage
        await this.imageProcessingService.deleteImageWithVariants(photo.key.split('/').slice(0, -1).join('/'));

        // Invalidate CDN cache
        if (this.cdnService.isEnabled()) {
          await this.cdnService.invalidateFile(photo.key);
        }

        // Delete from database
        await this.db.query(`DELETE FROM files WHERE id = $1`, [photo.id]);
      }
    } catch (error) {
      console.error('Error deleting user profile photos:', error);
    }
  }

  /**
   * Delete Single File
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not available');
    }

    try {
      // Get file record
      const result = await this.db.query(
        `SELECT * FROM files WHERE id = $1 AND user_id = $2`,
        [fileId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('File not found or access denied');
      }

      const file = result.rows[0];

      // Delete from storage
      if (file.entity_type === FileType.ITEM_PHOTO || file.entity_type === FileType.PROFILE_PHOTO) {
        await this.imageProcessingService.deleteImageWithVariants(file.key.split('/').slice(0, -1).join('/'));
      } else {
        await this.storageService.deleteFile(file.key);
      }

      // Invalidate CDN cache
      if (this.cdnService.isEnabled()) {
        await this.cdnService.invalidateFile(file.key);
      }

      // Delete from database
      await this.db.query(`DELETE FROM files WHERE id = $1`, [fileId]);
    } catch (error) {
      throw new Error(`Failed to delete file: ${(error as Error).message}`);
    }
  }

  /**
   * Get Signed URL for Private File
   */
  async getSignedUrl(fileId: string, userId: string, expiresIn: number = 3600): Promise<string> {
    if (!this.db) {
      throw new Error('Database connection not available');
    }

    try {
      // Get file record
      const result = await this.db.query(
        `SELECT * FROM files WHERE id = $1`,
        [fileId]
      );

      if (result.rows.length === 0) {
        throw new Error('File not found');
      }

      const file = result.rows[0];

      // Check access permissions
      if (file.access_level === AccessLevel.PRIVATE && file.user_id !== userId) {
        throw new Error('Access denied');
      }

      // Generate signed URL
      return await this.storageService.getSignedUrl(file.key, expiresIn);
    } catch (error) {
      throw new Error(`Failed to get signed URL: ${(error as Error).message}`);
    }
  }

  /**
   * Reorder Item Photos
   */
  async reorderItemPhotos(itemId: string, userId: string, photoIds: string[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not available');
    }

    try {
      // Verify ownership
      const photos = await this.getItemPhotos(itemId);
      const ownedPhotoIds = photos.filter(p => p.userId === userId).map(p => p.id);

      for (let i = 0; i < photoIds.length; i++) {
        const photoId = photoIds[i];
        
        if (!photoId || !ownedPhotoIds.includes(photoId)) {
          throw new Error('Access denied for one or more photos');
        }

        await this.db.query(
          `UPDATE files SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{order}', $1::text::jsonb) WHERE id = $2`,
          [i.toString(), photoId]
        );
      }
    } catch (error) {
      throw new Error(`Failed to reorder photos: ${(error as Error).message}`);
    }
  }

  /**
   * Cleanup Expired Temp Files
   */
  async cleanupExpiredFiles(): Promise<{ deleted: number }> {
    if (!this.db) {
      throw new Error('Database connection not available');
    }

    try {
      // Get expired files
      const result = await this.db.query(
        `SELECT * FROM files WHERE expires_at IS NOT NULL AND expires_at < NOW()`
      );

      let deleted = 0;

      for (const file of result.rows) {
        try {
          // Delete from storage
          await this.storageService.deleteFile(file.key);

          // Delete from database
          await this.db.query(`DELETE FROM files WHERE id = $1`, [file.id]);

          deleted++;
        } catch (error) {
          console.error(`Failed to delete expired file ${file.id}:`, error);
        }
      }

      return { deleted };
    } catch (error) {
      throw new Error(`Failed to cleanup expired files: ${(error as Error).message}`);
    }
  }

  /**
   * Save File Record to Database
   */
  private async saveFileRecord(record: FileRecord): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      await this.db.query(
        `INSERT INTO files (id, user_id, entity_id, entity_type, key, url, variants, size, content_type, access_level, metadata, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          record.id,
          record.userId,
          record.entityId,
          record.entityType,
          record.key,
          record.url,
          JSON.stringify(record.variants || {}),
          record.size,
          record.contentType,
          record.accessLevel,
          JSON.stringify(record.metadata || {}),
          record.createdAt,
          record.expiresAt,
        ]
      );
    } catch (error) {
      console.error('Error saving file record:', error);
      throw new Error(`Failed to save file record: ${(error as Error).message}`);
    }
  }

  /**
   * Get Storage Statistics
   */
  async getStorageStatistics(userId?: string): Promise<{
    totalFiles: number;
    totalSize: number;
    byType: Record<string, { count: number; size: number }>;
  }> {
    if (!this.db) {
      throw new Error('Database connection not available');
    }

    try {
      let query = `
        SELECT 
          COUNT(*) as total_files,
          SUM(size) as total_size,
          entity_type,
          COUNT(*) as type_count,
          SUM(size) as type_size
        FROM files
      `;

      const params: any[] = [];

      if (userId) {
        query += ` WHERE user_id = $1`;
        params.push(userId);
      }

      query += ` GROUP BY entity_type`;

      const result = await this.db.query(query, params);

      const byType: Record<string, { count: number; size: number }> = {};
      let totalFiles = 0;
      let totalSize = 0;

      for (const row of result.rows) {
        byType[row.entity_type] = {
          count: parseInt(row.type_count),
          size: parseInt(row.type_size),
        };
        totalFiles += parseInt(row.type_count);
        totalSize += parseInt(row.type_size);
      }

      return {
        totalFiles,
        totalSize,
        byType,
      };
    } catch (error) {
      throw new Error(`Failed to get storage statistics: ${(error as Error).message}`);
    }
  }
}

/**
 * Singleton File Management Service Instance
 */
let fileManagementService: FileManagementService | null = null;

/**
 * Get or Create File Management Service Instance
 */
export function getFileManagementService(db?: Pool): FileManagementService {
  if (!fileManagementService) {
    fileManagementService = new FileManagementService(db);
  }
  return fileManagementService;
}

/**
 * Export Default File Management Service
 */
export default getFileManagementService();

