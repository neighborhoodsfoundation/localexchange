/**
 * CDN Service
 * 
 * Provides CloudFront CDN integration for fast content delivery:
 * - Cache invalidation
 * - CDN URL generation
 * - Cache warming
 * - Cache policy management
 * - Edge location optimization
 */

import {
  CloudFrontClient,
  CreateInvalidationCommand,
  GetInvalidationCommand,
  ListInvalidationsCommand,
  GetDistributionCommand,
} from '@aws-sdk/client-cloudfront';
import { s3Config } from '../config/s3';
import { getCacheService } from './cache.service';

/**
 * CDN Configuration
 */
export interface CDNConfig {
  distributionId?: string;
  domain: string;
  enabled: boolean;
}

/**
 * Cache Invalidation Options
 */
export interface InvalidationOptions {
  paths: string[];
  callerReference?: string;
}

/**
 * Cache Policy
 */
export interface CachePolicy {
  minTTL: number;
  maxTTL: number;
  defaultTTL: number;
  headers?: string[];
  queryStrings?: string[];
  cookies?: string[];
}

/**
 * CDN Service Class
 */
export class CDNService {
  private cloudFrontClient: CloudFrontClient | null = null;
  private cacheService: any;
  private config: CDNConfig;

  constructor() {
    this.config = this.getCDNConfig();
    this.cacheService = getCacheService();

    // Initialize CloudFront client only if distribution ID is provided
    if (this.config.distributionId) {
      this.cloudFrontClient = new CloudFrontClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        } : undefined,
      });
    }
  }

  /**
   * Get CDN Configuration
   */
  private getCDNConfig(): CDNConfig {
    return {
      distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
      domain: s3Config.cdnUrl || '',
      enabled: !!s3Config.cdnUrl,
    };
  }

  /**
   * Get CDN URL for a File
   */
  getCdnUrl(key: string): string {
    if (!this.config.enabled) {
      // Fallback to S3 URL if CDN is not configured
      return `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${key}`;
    }

    return `${this.config.domain}/${key}`;
  }

  /**
   * Get Multiple CDN URLs
   */
  getCdnUrls(keys: string[]): string[] {
    return keys.map(key => this.getCdnUrl(key));
  }

  /**
   * Invalidate CDN Cache
   */
  async invalidateCache(paths: string[]): Promise<{ invalidationId: string; status: string }> {
    try {
      if (!this.cloudFrontClient || !this.config.distributionId) {
        console.warn('CloudFront not configured, skipping cache invalidation');
        return { invalidationId: 'not-configured', status: 'skipped' };
      }

      // Ensure paths start with /
      const formattedPaths = paths.map(path => path.startsWith('/') ? path : `/${path}`);

      const callerReference = `invalidation-${Date.now()}`;

      const command = new CreateInvalidationCommand({
        DistributionId: this.config.distributionId,
        InvalidationBatch: {
          CallerReference: callerReference,
          Paths: {
            Quantity: formattedPaths.length,
            Items: formattedPaths,
          },
        },
      });

      const result = await this.cloudFrontClient.send(command);

      return {
        invalidationId: result.Invalidation?.Id || '',
        status: result.Invalidation?.Status || 'unknown',
      };
    } catch (error) {
      console.error('Error invalidating CDN cache:', error);
      throw new Error(`Failed to invalidate CDN cache: ${(error as Error).message}`);
    }
  }

  /**
   * Invalidate Single File
   */
  async invalidateFile(key: string): Promise<{ invalidationId: string; status: string }> {
    return await this.invalidateCache([key]);
  }

  /**
   * Invalidate Directory
   */
  async invalidateDirectory(prefix: string): Promise<{ invalidationId: string; status: string }> {
    const path = prefix.endsWith('*') ? prefix : `${prefix}/*`;
    return await this.invalidateCache([path]);
  }

  /**
   * Get Invalidation Status
   */
  async getInvalidationStatus(invalidationId: string): Promise<string> {
    try {
      if (!this.cloudFrontClient || !this.config.distributionId) {
        return 'not-configured';
      }

      const command = new GetInvalidationCommand({
        DistributionId: this.config.distributionId,
        Id: invalidationId,
      });

      const result = await this.cloudFrontClient.send(command);
      return result.Invalidation?.Status || 'unknown';
    } catch (error) {
      console.error('Error getting invalidation status:', error);
      throw new Error(`Failed to get invalidation status: ${(error as Error).message}`);
    }
  }

  /**
   * List Recent Invalidations
   */
  async listInvalidations(maxItems: number = 100): Promise<any[]> {
    try {
      if (!this.cloudFrontClient || !this.config.distributionId) {
        return [];
      }

      const command = new ListInvalidationsCommand({
        DistributionId: this.config.distributionId,
        MaxItems: maxItems.toString(),
      });

      const result = await this.cloudFrontClient.send(command);
      return result.InvalidationList?.Items || [];
    } catch (error) {
      console.error('Error listing invalidations:', error);
      throw new Error(`Failed to list invalidations: ${(error as Error).message}`);
    }
  }

  /**
   * Warm CDN Cache
   * 
   * Pre-fetch files to edge locations for faster delivery
   */
  async warmCache(keys: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const key of keys) {
      try {
        const url = this.getCdnUrl(key);
        
        // Make a HEAD request to warm the cache
        const response = await fetch(url, { method: 'HEAD' });
        
        if (response.ok) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to warm cache for ${key}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Get Cache Headers for File
   */
  getCacheHeaders(key: string, policy?: CachePolicy): Record<string, string> {
    const defaultPolicy: CachePolicy = {
      minTTL: 0,
      maxTTL: 31536000, // 1 year
      defaultTTL: 86400, // 1 day
    };

    const finalPolicy = policy || defaultPolicy;

    const headers: Record<string, string> = {
      'Cache-Control': `public, max-age=${finalPolicy.defaultTTL}`,
    };

    // Add ETag support
    headers['ETag'] = `"${Date.now()}"`;

    // Add Vary header if needed
    if (finalPolicy.headers && finalPolicy.headers.length > 0) {
      headers['Vary'] = finalPolicy.headers.join(', ');
    }

    return headers;
  }

  /**
   * Get Optimal Cache Policy for Content Type
   */
  getOptimalCachePolicy(contentType: string): CachePolicy {
    // Images: Long cache
    if (contentType.startsWith('image/')) {
      return {
        minTTL: 0,
        maxTTL: 31536000, // 1 year
        defaultTTL: 2592000, // 30 days
      };
    }

    // Videos: Long cache
    if (contentType.startsWith('video/')) {
      return {
        minTTL: 0,
        maxTTL: 31536000, // 1 year
        defaultTTL: 2592000, // 30 days
      };
    }

    // Documents: Medium cache
    if (contentType === 'application/pdf' || contentType.startsWith('application/')) {
      return {
        minTTL: 0,
        maxTTL: 604800, // 7 days
        defaultTTL: 86400, // 1 day
      };
    }

    // Default: Short cache
    return {
      minTTL: 0,
      maxTTL: 3600, // 1 hour
      defaultTTL: 300, // 5 minutes
    };
  }

  /**
   * Check if CDN is Enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get CDN Configuration
   */
  getConfig(): CDNConfig {
    return this.config;
  }

  /**
   * Get Distribution Information
   */
  async getDistributionInfo(): Promise<any> {
    try {
      if (!this.cloudFrontClient || !this.config.distributionId) {
        return null;
      }

      const command = new GetDistributionCommand({
        Id: this.config.distributionId,
      });

      const result = await this.cloudFrontClient.send(command);
      return result.Distribution;
    } catch (error) {
      console.error('Error getting distribution info:', error);
      throw new Error(`Failed to get distribution info: ${(error as Error).message}`);
    }
  }

  /**
   * Generate Cache Key
   */
  generateCacheKey(key: string, params?: Record<string, string>): string {
    if (!params || Object.keys(params).length === 0) {
      return key;
    }

    const queryString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    return `${key}?${queryString}`;
  }

  /**
   * Get Edge Location (Simulated)
   * 
   * In production, this would use CloudFront's edge location detection
   */
  getEdgeLocation(): string {
    // This is a simplified version
    // In production, you would use CloudFront's edge location headers
    return 'unknown';
  }

  /**
   * Calculate Cache Hit Ratio
   */
  async getCacheHitRatio(timeRange: number = 3600000): Promise<number> {
    try {
      // This would integrate with CloudWatch metrics in production
      // For now, return a simulated value
      return 0.85; // 85% cache hit ratio
    } catch (error) {
      console.error('Error calculating cache hit ratio:', error);
      return 0;
    }
  }

  /**
   * Get CDN Statistics
   */
  async getCDNStats(): Promise<{
    enabled: boolean;
    domain: string;
    distributionId?: string;
    cacheHitRatio: number;
    recentInvalidations: number;
  }> {
    try {
      const cacheHitRatio = await this.getCacheHitRatio();
      const invalidations = await this.listInvalidations(10);

      return {
        enabled: this.config.enabled,
        domain: this.config.domain,
        distributionId: this.config.distributionId,
        cacheHitRatio,
        recentInvalidations: invalidations.length,
      };
    } catch (error) {
      console.error('Error getting CDN stats:', error);
      throw new Error(`Failed to get CDN stats: ${(error as Error).message}`);
    }
  }
}

/**
 * Singleton CDN Service Instance
 */
let cdnService: CDNService | null = null;

/**
 * Get or Create CDN Service Instance
 */
export function getCDNService(): CDNService {
  if (!cdnService) {
    cdnService = new CDNService();
  }
  return cdnService;
}

/**
 * Export Default CDN Service
 */
export default getCDNService();

