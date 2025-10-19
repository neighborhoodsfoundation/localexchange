/**
 * Index Service Unit Tests
 * Tests for OpenSearch index management service
 */

// Mock OpenSearch client
jest.mock('../../config/opensearch', () => ({
  opensearchClient: {
    indices: {
      exists: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      stats: jest.fn(),
      refresh: jest.fn(),
      forcemerge: jest.fn(),
      putIndexTemplate: jest.fn(),
    },
    cluster: {
      health: jest.fn(),
    },
  },
  INDEX_NAMES: {
    ITEMS: 'localex_items',
    USERS: 'localex_users',
    CATEGORIES: 'localex_categories',
    SEARCH_LOGS: 'localex_search_logs',
  },
  SEARCH_CONFIG: {
    INDEX_SHARDS: 1,
    INDEX_REPLICAS: 0,
    REFRESH_INTERVAL: '1s',
    INDEX_PREFIX: 'localex',
  },
}));

import { indexService } from '../index.service';
import { opensearchClient } from '../../config/opensearch';

describe('IndexService', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('createItemsIndex', () => {
    it('should create items index successfully', async () => {
      // Arrange
      (opensearchClient.indices.exists as jest.Mock).mockResolvedValue({ body: false });
      (opensearchClient.indices.create as jest.Mock).mockResolvedValue({ body: {} });

      // Act
      await indexService.createItemsIndex();

      // Assert
      expect(opensearchClient.indices.create).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Created index'));
    });

    it('should skip creation if index already exists', async () => {
      // Arrange
      (opensearchClient.indices.exists as jest.Mock).mockResolvedValue({ body: true });

      // Act
      await indexService.createItemsIndex();

      // Assert
      expect(opensearchClient.indices.create).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
    });

    it('should throw error on creation failure', async () => {
      // Arrange
      (opensearchClient.indices.exists as jest.Mock).mockResolvedValue({ body: false });
      (opensearchClient.indices.create as jest.Mock).mockRejectedValue(new Error('Creation error'));

      // Act & Assert
      await expect(indexService.createItemsIndex()).rejects.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('createUsersIndex', () => {
    it('should create users index successfully', async () => {
      // Arrange
      (opensearchClient.indices.exists as jest.Mock).mockResolvedValue({ body: false });
      (opensearchClient.indices.create as jest.Mock).mockResolvedValue({ body: {} });

      // Act
      await indexService.createUsersIndex();

      // Assert
      expect(opensearchClient.indices.create).toHaveBeenCalled();
    });

    it('should skip creation if index already exists', async () => {
      // Arrange
      (opensearchClient.indices.exists as jest.Mock).mockResolvedValue({ body: true });

      // Act
      await indexService.createUsersIndex();

      // Assert
      expect(opensearchClient.indices.create).not.toHaveBeenCalled();
    });
  });

  describe('createCategoriesIndex', () => {
    it('should create categories index successfully', async () => {
      // Arrange
      (opensearchClient.indices.exists as jest.Mock).mockResolvedValue({ body: false });
      (opensearchClient.indices.create as jest.Mock).mockResolvedValue({ body: {} });

      // Act
      await indexService.createCategoriesIndex();

      // Assert
      expect(opensearchClient.indices.create).toHaveBeenCalled();
    });
  });

  describe('createSearchLogsIndex', () => {
    it('should create search logs index successfully', async () => {
      // Arrange
      (opensearchClient.indices.exists as jest.Mock).mockResolvedValue({ body: false });
      (opensearchClient.indices.create as jest.Mock).mockResolvedValue({ body: {} });

      // Act
      await indexService.createSearchLogsIndex();

      // Assert
      expect(opensearchClient.indices.create).toHaveBeenCalled();
    });
  });

  describe('createAllIndices', () => {
    it('should create all indices successfully', async () => {
      // Arrange
      (opensearchClient.indices.exists as jest.Mock).mockResolvedValue({ body: false });
      (opensearchClient.indices.create as jest.Mock).mockResolvedValue({ body: {} });

      // Act
      await indexService.createAllIndices();

      // Assert
      expect(opensearchClient.indices.create).toHaveBeenCalledTimes(4);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('All indices created successfully')
      );
    });

    it('should throw error if any index creation fails', async () => {
      // Arrange
      (opensearchClient.indices.exists as jest.Mock).mockResolvedValue({ body: false });
      (opensearchClient.indices.create as jest.Mock)
        .mockResolvedValueOnce({ body: {} })
        .mockRejectedValueOnce(new Error('Creation error'));

      // Act & Assert
      await expect(indexService.createAllIndices()).rejects.toThrow();
    });
  });

  describe('deleteAllIndices', () => {
    it('should delete all existing indices', async () => {
      // Arrange
      (opensearchClient.indices.exists as jest.Mock).mockResolvedValue({ body: true });
      (opensearchClient.indices.delete as jest.Mock).mockResolvedValue({ body: {} });

      // Act
      await indexService.deleteAllIndices();

      // Assert
      expect(opensearchClient.indices.delete).toHaveBeenCalledTimes(4);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('All indices deleted successfully')
      );
    });

    it('should skip non-existent indices', async () => {
      // Arrange
      (opensearchClient.indices.exists as jest.Mock).mockResolvedValue({ body: false });

      // Act
      await indexService.deleteAllIndices();

      // Assert
      expect(opensearchClient.indices.delete).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      // Arrange
      (opensearchClient.indices.exists as jest.Mock).mockResolvedValue({ body: true });
      (opensearchClient.indices.delete as jest.Mock).mockRejectedValue(new Error('Delete error'));

      // Act
      await indexService.deleteAllIndices();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('getIndexStats', () => {
    it('should return index statistics', async () => {
      // Arrange
      const mockStats = {
        body: {
          indices: {
            localex_items: { total: { docs: { count: 100 } } },
          },
          _all: { total: { docs: { count: 100 } } },
        },
      };
      (opensearchClient.indices.stats as jest.Mock).mockResolvedValue(mockStats);

      // Act
      const stats = await indexService.getIndexStats();

      // Assert
      expect(stats).toHaveProperty('indices');
      expect(stats).toHaveProperty('total');
      expect(opensearchClient.indices.stats).toHaveBeenCalled();
    });

    it('should throw error on stats failure', async () => {
      // Arrange
      (opensearchClient.indices.stats as jest.Mock).mockRejectedValue(new Error('Stats error'));

      // Act & Assert
      await expect(indexService.getIndexStats()).rejects.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('refreshIndices', () => {
    it('should refresh all indices successfully', async () => {
      // Arrange
      (opensearchClient.indices.refresh as jest.Mock).mockResolvedValue({ body: {} });

      // Act
      await indexService.refreshIndices();

      // Assert
      expect(opensearchClient.indices.refresh).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Indices refreshed successfully')
      );
    });

    it('should throw error on refresh failure', async () => {
      // Arrange
      (opensearchClient.indices.refresh as jest.Mock).mockRejectedValue(
        new Error('Refresh error')
      );

      // Act & Assert
      await expect(indexService.refreshIndices()).rejects.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('optimizeIndices', () => {
    it('should optimize all indices successfully', async () => {
      // Arrange
      (opensearchClient.indices.forcemerge as jest.Mock).mockResolvedValue({ body: {} });

      // Act
      await indexService.optimizeIndices();

      // Assert
      expect(opensearchClient.indices.forcemerge).toHaveBeenCalledTimes(4);
    });

    it('should handle optimization errors gracefully', async () => {
      // Arrange
      (opensearchClient.indices.forcemerge as jest.Mock).mockRejectedValue(
        new Error('Optimize error')
      );

      // Act
      await indexService.optimizeIndices();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('createIndexTemplates', () => {
    it('should create index templates successfully', async () => {
      // Arrange
      (opensearchClient.indices.putIndexTemplate as jest.Mock).mockResolvedValue({ body: {} });

      // Act
      await indexService.createIndexTemplates();

      // Assert
      expect(opensearchClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Created index template')
      );
    });

    it('should handle template creation errors gracefully', async () => {
      // Arrange
      (opensearchClient.indices.putIndexTemplate as jest.Mock).mockRejectedValue(
        new Error('Template error')
      );

      // Act
      await indexService.createIndexTemplates();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      // Arrange
      (opensearchClient.cluster.health as jest.Mock).mockResolvedValue({
        body: { status: 'green' },
      });
      (opensearchClient.indices.stats as jest.Mock).mockResolvedValue({
        body: {
          indices: {},
          _all: {},
        },
      });

      // Act
      const health = await indexService.healthCheck();

      // Assert
      expect(health.status).toBe('green');
      expect(health.details).toBeDefined();
    });

    it('should return error status on failure', async () => {
      // Arrange
      (opensearchClient.cluster.health as jest.Mock).mockRejectedValue(
        new Error('Health check error')
      );

      // Act
      const health = await indexService.healthCheck();

      // Assert
      expect(health.status).toBe('error');
      expect(health.details).toHaveProperty('error');
    });
  });
});

/**
 * Test Coverage Summary:
 * - Index creation (items, users, categories, search logs) ✅
 * - Bulk index operations ✅
 * - Index deletion ✅
 * - Index statistics ✅
 * - Index refresh ✅
 * - Index optimization ✅
 * - Index templates ✅
 * - Health check ✅
 * - Error handling ✅
 * 
 * Target Coverage: 85%+
 * Critical Logic: Index creation, deletion, optimization
 */

