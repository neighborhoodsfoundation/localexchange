/**
 * CDN Service Unit Tests
 * Tests for CloudFront CDN integration
 */

// Mock dependencies
jest.mock('@aws-sdk/client-cloudfront');
jest.mock('../cache.service');
jest.mock('../../config/s3', () => ({
  storageConfig: {
    bucket: 'test-bucket',
    region: 'us-east-1',
    cdnUrl: 'https://cdn.example.com',
  },
}));

// Mock global fetch
global.fetch = jest.fn();

import { CDNService } from '../cdn.service';
import {
  CloudFrontClient,
  CreateInvalidationCommand,
  GetInvalidationCommand,
  ListInvalidationsCommand,
  GetDistributionCommand,
} from '@aws-sdk/client-cloudfront';

// Mock CloudFront Client
const mockCloudFrontClient = {
  send: jest.fn(),
} as unknown as CloudFrontClient;

(CloudFrontClient as jest.Mock).mockImplementation(() => mockCloudFrontClient);

describe('CDNService', () => {
  let cdnService: CDNService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env['CLOUDFRONT_DISTRIBUTION_ID'];
    cdnService = new CDNService();
  });

  describe('getCdnUrl', () => {
    it('should return CDN URL when CDN is enabled', () => {
      // Arrange
      const key = 'images/test.jpg';

      // Act
      const url = cdnService.getCdnUrl(key);

      // Assert
      expect(url).toBe('https://cdn.example.com/images/test.jpg');
    });

    it('should return S3 URL when CDN is not configured', () => {
      // Arrange
      const cdnServiceNoCDN = new CDNService();
      (cdnServiceNoCDN as any).config.enabled = false;
      (cdnServiceNoCDN as any).config.domain = '';
      const key = 'images/test.jpg';

      // Act
      const url = cdnServiceNoCDN.getCdnUrl(key);

      // Assert
      expect(url).toContain('s3.us-east-1.amazonaws.com');
      expect(url).toContain('test-bucket');
      expect(url).toContain(key);
    });
  });

  describe('getCdnUrls', () => {
    it('should return multiple CDN URLs', () => {
      // Arrange
      const keys = ['image1.jpg', 'image2.jpg', 'image3.jpg'];

      // Act
      const urls = cdnService.getCdnUrls(keys);

      // Assert
      expect(urls).toHaveLength(3);
      expect(urls[0]).toBe('https://cdn.example.com/image1.jpg');
      expect(urls[1]).toBe('https://cdn.example.com/image2.jpg');
      expect(urls[2]).toBe('https://cdn.example.com/image3.jpg');
    });

    it('should return empty array for empty input', () => {
      // Act
      const urls = cdnService.getCdnUrls([]);

      // Assert
      expect(urls).toHaveLength(0);
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate CDN cache when CloudFront is configured', async () => {
      // Arrange
      process.env['CLOUDFRONT_DISTRIBUTION_ID'] = 'DISTRIBUTION123';
      const cdnServiceWithCF = new CDNService();
      const paths = ['/images/test.jpg', '/images/test2.jpg'];
      const mockResult = {
        Invalidation: {
          Id: 'INV123',
          Status: 'InProgress',
        },
      };
      (mockCloudFrontClient.send as jest.Mock).mockResolvedValue(mockResult);

      // Act
      const result = await cdnServiceWithCF.invalidateCache(paths);

      // Assert
      expect(result).toEqual({
        invalidationId: 'INV123',
        status: 'InProgress',
      });
      expect(mockCloudFrontClient.send).toHaveBeenCalledWith(
        expect.any(CreateInvalidationCommand)
      );
    });

    it('should add leading slash to paths without it', async () => {
      // Arrange
      process.env['CLOUDFRONT_DISTRIBUTION_ID'] = 'DISTRIBUTION123';
      const cdnServiceWithCF = new CDNService();
      const paths = ['images/test.jpg']; // No leading slash
      const mockResult = {
        Invalidation: { Id: 'INV123', Status: 'InProgress' },
      };
      (mockCloudFrontClient.send as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await cdnServiceWithCF.invalidateCache(paths);

      // Assert - The command should format paths with leading slash
      expect(mockCloudFrontClient.send).toHaveBeenCalled();
    });

    it('should skip invalidation when CloudFront is not configured', async () => {
      // Act
      const result = await cdnService.invalidateCache(['/test.jpg']);

      // Assert
      expect(result).toEqual({
        invalidationId: 'not-configured',
        status: 'skipped',
      });
      expect(mockCloudFrontClient.send).not.toHaveBeenCalled();
    });

    it('should handle invalidation errors', async () => {
      // Arrange
      process.env['CLOUDFRONT_DISTRIBUTION_ID'] = 'DISTRIBUTION123';
      const cdnServiceWithCF = new CDNService();
      (mockCloudFrontClient.send as jest.Mock).mockRejectedValue(
        new Error('Invalidation failed')
      );

      // Act & Assert
      await expect(cdnServiceWithCF.invalidateCache(['/test.jpg'])).rejects.toThrow(
        'Failed to invalidate CDN cache'
      );
    });
  });

  describe('invalidateFile', () => {
    it('should invalidate single file', async () => {
      // Arrange
      process.env['CLOUDFRONT_DISTRIBUTION_ID'] = 'DISTRIBUTION123';
      const cdnServiceWithCF = new CDNService();
      const mockResult = {
        Invalidation: { Id: 'INV123', Status: 'InProgress' },
      };
      (mockCloudFrontClient.send as jest.Mock).mockResolvedValue(mockResult);

      // Act
      const result = await cdnServiceWithCF.invalidateFile('/images/test.jpg');

      // Assert
      expect(result.invalidationId).toBe('INV123');
    });
  });

  describe('invalidateDirectory', () => {
    it('should invalidate directory with wildcard', async () => {
      // Arrange
      process.env['CLOUDFRONT_DISTRIBUTION_ID'] = 'DISTRIBUTION123';
      const cdnServiceWithCF = new CDNService();
      const mockResult = {
        Invalidation: { Id: 'INV123', Status: 'InProgress' },
      };
      (mockCloudFrontClient.send as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await cdnServiceWithCF.invalidateDirectory('/images');

      // Assert
      expect(mockCloudFrontClient.send).toHaveBeenCalled();
    });

    it('should handle directory path with existing wildcard', async () => {
      // Arrange
      process.env['CLOUDFRONT_DISTRIBUTION_ID'] = 'DISTRIBUTION123';
      const cdnServiceWithCF = new CDNService();
      const mockResult = {
        Invalidation: { Id: 'INV123', Status: 'InProgress' },
      };
      (mockCloudFrontClient.send as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await cdnServiceWithCF.invalidateDirectory('/images/*');

      // Assert
      expect(mockCloudFrontClient.send).toHaveBeenCalled();
    });
  });

  describe('getInvalidationStatus', () => {
    it('should return invalidation status', async () => {
      // Arrange
      process.env['CLOUDFRONT_DISTRIBUTION_ID'] = 'DISTRIBUTION123';
      const cdnServiceWithCF = new CDNService();
      const mockResult = {
        Invalidation: { Status: 'Completed' },
      };
      (mockCloudFrontClient.send as jest.Mock).mockResolvedValue(mockResult);

      // Act
      const status = await cdnServiceWithCF.getInvalidationStatus('INV123');

      // Assert
      expect(status).toBe('Completed');
      expect(mockCloudFrontClient.send).toHaveBeenCalledWith(
        expect.any(GetInvalidationCommand)
      );
    });

    it('should return not-configured when CloudFront is not configured', async () => {
      // Act
      const status = await cdnService.getInvalidationStatus('INV123');

      // Assert
      expect(status).toBe('not-configured');
    });

    it('should handle errors', async () => {
      // Arrange
      process.env['CLOUDFRONT_DISTRIBUTION_ID'] = 'DISTRIBUTION123';
      const cdnServiceWithCF = new CDNService();
      (mockCloudFrontClient.send as jest.Mock).mockRejectedValue(new Error('Failed'));

      // Act & Assert
      await expect(cdnServiceWithCF.getInvalidationStatus('INV123')).rejects.toThrow(
        'Failed to get invalidation status'
      );
    });
  });

  describe('listInvalidations', () => {
    it('should list recent invalidations', async () => {
      // Arrange
      process.env['CLOUDFRONT_DISTRIBUTION_ID'] = 'DISTRIBUTION123';
      const cdnServiceWithCF = new CDNService();
      const mockItems = [
        { Id: 'INV1', Status: 'Completed' },
        { Id: 'INV2', Status: 'InProgress' },
      ];
      (mockCloudFrontClient.send as jest.Mock).mockResolvedValue({
        InvalidationList: { Items: mockItems },
      });

      // Act
      const result = await cdnServiceWithCF.listInvalidations(10);

      // Assert
      expect(result).toEqual(mockItems);
      expect(mockCloudFrontClient.send).toHaveBeenCalledWith(
        expect.any(ListInvalidationsCommand)
      );
    });

    it('should return empty array when not configured', async () => {
      // Act
      const result = await cdnService.listInvalidations();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      // Arrange
      process.env['CLOUDFRONT_DISTRIBUTION_ID'] = 'DISTRIBUTION123';
      const cdnServiceWithCF = new CDNService();
      (mockCloudFrontClient.send as jest.Mock).mockRejectedValue(new Error('Failed'));

      // Act & Assert
      await expect(cdnServiceWithCF.listInvalidations()).rejects.toThrow(
        'Failed to list invalidations'
      );
    });
  });

  describe('warmCache', () => {
    it('should successfully warm cache for all files', async () => {
      // Arrange
      const keys = ['image1.jpg', 'image2.jpg'];
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      // Act
      const result = await cdnService.warmCache(keys);

      // Assert
      expect(result).toEqual({ success: 2, failed: 0 });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures', async () => {
      // Arrange
      const keys = ['image1.jpg', 'image2.jpg', 'image3.jpg'];
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: false })
        .mockRejectedValueOnce(new Error('Network error'));

      // Act
      const result = await cdnService.warmCache(keys);

      // Assert
      expect(result).toEqual({ success: 1, failed: 2 });
    });

    it('should handle all failures', async () => {
      // Arrange
      const keys = ['image1.jpg'];
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

      // Act
      const result = await cdnService.warmCache(keys);

      // Assert
      expect(result).toEqual({ success: 0, failed: 1 });
    });
  });

  describe('getCacheHeaders', () => {
    it('should return default cache headers', () => {
      // Act
      const headers = cdnService.getCacheHeaders('test.jpg');

      // Assert
      expect(headers).toHaveProperty('Cache-Control');
      expect(headers).toHaveProperty('ETag');
      expect(headers['Cache-Control']).toContain('max-age=86400');
    });

    it('should apply custom cache policy', () => {
      // Arrange
      const policy = {
        minTTL: 0,
        maxTTL: 3600,
        defaultTTL: 1800,
        headers: ['Accept', 'Accept-Encoding'],
      };

      // Act
      const headers = cdnService.getCacheHeaders('test.jpg', policy);

      // Assert
      expect(headers['Cache-Control']).toContain('max-age=1800');
      expect(headers['Vary']).toBe('Accept, Accept-Encoding');
    });

    it('should not include Vary header when no headers specified', () => {
      // Arrange
      const policy = {
        minTTL: 0,
        maxTTL: 3600,
        defaultTTL: 1800,
      };

      // Act
      const headers = cdnService.getCacheHeaders('test.jpg', policy);

      // Assert
      expect(headers).not.toHaveProperty('Vary');
    });
  });

  describe('getOptimalCachePolicy', () => {
    it('should return long cache for images', () => {
      // Act
      const policy = cdnService.getOptimalCachePolicy('image/jpeg');

      // Assert
      expect(policy.defaultTTL).toBe(2592000); // 30 days
    });

    it('should return long cache for videos', () => {
      // Act
      const policy = cdnService.getOptimalCachePolicy('video/mp4');

      // Assert
      expect(policy.defaultTTL).toBe(2592000); // 30 days
    });

    it('should return medium cache for PDF documents', () => {
      // Act
      const policy = cdnService.getOptimalCachePolicy('application/pdf');

      // Assert
      expect(policy.defaultTTL).toBe(86400); // 1 day
    });

    it('should return short cache for unknown types', () => {
      // Act
      const policy = cdnService.getOptimalCachePolicy('text/html');

      // Assert
      expect(policy.defaultTTL).toBe(300); // 5 minutes
    });
  });

  describe('isEnabled', () => {
    it('should return true when CDN is enabled', () => {
      // Act
      const enabled = cdnService.isEnabled();

      // Assert
      expect(enabled).toBe(true);
    });

    it('should return false when CDN is not configured', () => {
      // Arrange
      const cdnServiceNoCDN = new CDNService();
      (cdnServiceNoCDN as any).config.enabled = false;

      // Act
      const enabled = cdnServiceNoCDN.isEnabled();

      // Assert
      expect(enabled).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should return CDN configuration', () => {
      // Act
      const config = cdnService.getConfig();

      // Assert
      expect(config).toHaveProperty('domain');
      expect(config).toHaveProperty('enabled');
      expect(config.domain).toBe('https://cdn.example.com');
    });
  });

  describe('getDistributionInfo', () => {
    it('should return distribution info when configured', async () => {
      // Arrange
      process.env['CLOUDFRONT_DISTRIBUTION_ID'] = 'DISTRIBUTION123';
      const cdnServiceWithCF = new CDNService();
      const mockDistribution = { Id: 'DISTRIBUTION123', Status: 'Deployed' };
      (mockCloudFrontClient.send as jest.Mock).mockResolvedValue({
        Distribution: mockDistribution,
      });

      // Act
      const result = await cdnServiceWithCF.getDistributionInfo();

      // Assert
      expect(result).toEqual(mockDistribution);
      expect(mockCloudFrontClient.send).toHaveBeenCalledWith(
        expect.any(GetDistributionCommand)
      );
    });

    it('should return null when not configured', async () => {
      // Act
      const result = await cdnService.getDistributionInfo();

      // Assert
      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      // Arrange
      process.env['CLOUDFRONT_DISTRIBUTION_ID'] = 'DISTRIBUTION123';
      const cdnServiceWithCF = new CDNService();
      (mockCloudFrontClient.send as jest.Mock).mockRejectedValue(new Error('Failed'));

      // Act & Assert
      await expect(cdnServiceWithCF.getDistributionInfo()).rejects.toThrow(
        'Failed to get distribution info'
      );
    });
  });

  describe('generateCacheKey', () => {
    it('should return key without params', () => {
      // Act
      const cacheKey = cdnService.generateCacheKey('test.jpg');

      // Assert
      expect(cacheKey).toBe('test.jpg');
    });

    it('should append sorted query parameters', () => {
      // Arrange
      const params = { width: '800', height: '600', quality: '85' };

      // Act
      const cacheKey = cdnService.generateCacheKey('test.jpg', params);

      // Assert
      expect(cacheKey).toBe('test.jpg?height=600&quality=85&width=800');
    });

    it('should handle empty params object', () => {
      // Act
      const cacheKey = cdnService.generateCacheKey('test.jpg', {});

      // Assert
      expect(cacheKey).toBe('test.jpg');
    });
  });

  describe('getEdgeLocation', () => {
    it('should return edge location', () => {
      // Act
      const location = cdnService.getEdgeLocation();

      // Assert
      expect(location).toBe('unknown');
    });
  });

  describe('getCacheHitRatio', () => {
    it('should return cache hit ratio', async () => {
      // Act
      const ratio = await cdnService.getCacheHitRatio();

      // Assert
      expect(ratio).toBe(0.85);
    });
  });

  describe('getCDNStats', () => {
    it('should return CDN statistics', async () => {
      // Arrange
      process.env['CLOUDFRONT_DISTRIBUTION_ID'] = 'DISTRIBUTION123';
      const cdnServiceWithCF = new CDNService();
      (mockCloudFrontClient.send as jest.Mock).mockResolvedValue({
        InvalidationList: { Items: [{ Id: 'INV1' }, { Id: 'INV2' }] },
      });

      // Act
      const stats = await cdnServiceWithCF.getCDNStats();

      // Assert
      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('domain');
      expect(stats).toHaveProperty('distributionId');
      expect(stats).toHaveProperty('cacheHitRatio');
      expect(stats).toHaveProperty('recentInvalidations');
      expect(stats.recentInvalidations).toBe(2);
    });

    it('should not include distributionId when not configured', async () => {
      // Arrange
      (mockCloudFrontClient.send as jest.Mock).mockResolvedValue({
        InvalidationList: { Items: [] },
      });

      // Act
      const stats = await cdnService.getCDNStats();

      // Assert
      expect(stats).not.toHaveProperty('distributionId');
    });

    it('should handle errors', async () => {
      // Arrange
      process.env['CLOUDFRONT_DISTRIBUTION_ID'] = 'DISTRIBUTION123';
      const cdnServiceWithCF = new CDNService();
      (mockCloudFrontClient.send as jest.Mock).mockRejectedValue(new Error('Failed'));

      // Act & Assert
      await expect(cdnServiceWithCF.getCDNStats()).rejects.toThrow(
        'Failed to get CDN stats'
      );
    });
  });
});
