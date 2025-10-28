/**
 * Dispute Service Tests
 * 
 * Tests for dispute handling and resolution functionality
 * in the Trading Context.
 */

import { 
  createDispute, 
  getUserDisputes, 
  getDispute, 
  getPendingDisputes,
  resolveDispute,
  getDisputeStats,
  DISPUTE_CONFIG
} from '../disputeService';
import { TradeStatus, DisputeIssueType, DisputeResolution, DisputeStatus } from '../trading.types';

// Mock the database and external dependencies
jest.mock('../tradeService', () => ({
  getTrade: jest.fn()
}));

import { getTrade } from '../tradeService';

const mockGetTrade = getTrade as jest.MockedFunction<typeof getTrade>;

describe('Dispute Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDispute', () => {
    it('should successfully create a dispute for completed trade', async () => {
      // Arrange
      const mockTrade = {
        id: 'trade-123',
        itemId: 'item-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-123',
        offeredPrice: 100,
        status: TradeStatus.COMPLETED,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetTrade.mockResolvedValue(mockTrade);

      const request = {
        tradeId: 'trade-123',
        reportedBy: 'buyer-123',
        reportedAgainst: 'seller-123',
        issueType: DisputeIssueType.ITEM_NOT_AS_DESCRIBED,
        description: 'The item was not as described in the listing. It was damaged and missing parts.',
        evidencePhotos: ['photo1.jpg', 'photo2.jpg'],
        requestedResolution: DisputeResolution.REFUND_FULL
      };

      // Act
      const result = await createDispute(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.dispute).toBeDefined();
      expect(result.dispute?.tradeId).toBe('trade-123');
      expect(result.dispute?.reportedBy).toBe('buyer-123');
      expect(result.dispute?.reportedAgainst).toBe('seller-123');
      expect(result.dispute?.issueType).toBe(DisputeIssueType.ITEM_NOT_AS_DESCRIBED);
      expect(result.dispute?.status).toBe(DisputeStatus.PENDING);
    });

    it('should reject dispute for non-participant', async () => {
      // Arrange
      const mockTrade = {
        id: 'trade-123',
        itemId: 'item-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-123',
        offeredPrice: 100,
        status: TradeStatus.COMPLETED,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetTrade.mockResolvedValue(mockTrade);

      const request = {
        tradeId: 'trade-123',
        reportedBy: 'other-user-123', // Not part of trade
        reportedAgainst: 'seller-123',
        issueType: DisputeIssueType.ITEM_NOT_AS_DESCRIBED,
        description: 'The item was not as described.',
        evidencePhotos: [],
        requestedResolution: DisputeResolution.REFUND_FULL
      };

      // Act
      const result = await createDispute(request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('User is not part of this trade');
    });

    it('should reject dispute for non-disputable trade state', async () => {
      // Arrange
      const mockTrade = {
        id: 'trade-123',
        itemId: 'item-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-123',
        offeredPrice: 100,
        status: TradeStatus.OFFER_MADE, // Not disputable
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetTrade.mockResolvedValue(mockTrade);

      const request = {
        tradeId: 'trade-123',
        reportedBy: 'buyer-123',
        reportedAgainst: 'seller-123',
        issueType: DisputeIssueType.ITEM_NOT_AS_DESCRIBED,
        description: 'The item was not as described.',
        evidencePhotos: [],
        requestedResolution: DisputeResolution.REFUND_FULL
      };

      // Act
      const result = await createDispute(request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('not in a disputable state');
    });

    it('should validate dispute request parameters', async () => {
      // Arrange
      const invalidRequest = {
        tradeId: '', // Invalid
        reportedBy: 'buyer-123',
        reportedAgainst: 'seller-123',
        issueType: 'INVALID_TYPE', // Invalid
        description: 'Too short', // Too short
        evidencePhotos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg', 'photo5.jpg', 'photo6.jpg'], // Too many
        requestedResolution: 'INVALID_RESOLUTION' // Invalid
      };

      // Act
      const result = await createDispute(invalidRequest as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Trade ID is required');
      expect(result.error).toContain('Valid issue type is required');
      expect(result.error).toContain(`Description must be at least ${DISPUTE_CONFIG.MIN_DESCRIPTION_LENGTH} characters`);
      expect(result.error).toContain(`Maximum ${DISPUTE_CONFIG.MAX_EVIDENCE_PHOTOS} evidence photos allowed`);
      expect(result.error).toContain('Valid requested resolution is required');
    });

    it('should handle different dispute issue types', async () => {
      // Arrange
      const mockTrade = {
        id: 'trade-123',
        itemId: 'item-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-123',
        offeredPrice: 100,
        status: TradeStatus.COMPLETED,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetTrade.mockResolvedValue(mockTrade);

      const issueTypes = [
        DisputeIssueType.ITEM_NOT_AS_DESCRIBED,
        DisputeIssueType.ITEM_DAMAGED,
        DisputeIssueType.WRONG_ITEM,
        DisputeIssueType.NO_SHOW,
        DisputeIssueType.UNSAFE_BEHAVIOR,
        DisputeIssueType.FRAUD,
        DisputeIssueType.OTHER
      ];

      for (const issueType of issueTypes) {
        const request = {
          tradeId: 'trade-123',
          reportedBy: 'buyer-123',
          reportedAgainst: 'seller-123',
          issueType,
          description: 'This is a detailed description of the issue that meets the minimum length requirement.',
          evidencePhotos: [],
          requestedResolution: DisputeResolution.REFUND_FULL
        };

        // Act
        const result = await createDispute(request);

        // Assert
        expect(result.success).toBe(true);
        expect(result.dispute?.issueType).toBe(issueType);
      }
    });
  });

  describe('getUserDisputes', () => {
    it('should return user disputes', async () => {
      // Act
      const result = await getUserDisputes('user-123');

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter disputes by status', async () => {
      // Act
      const result = await getUserDisputes('user-123', [DisputeStatus.PENDING]);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getDispute', () => {
    it('should return dispute by ID', async () => {
      // Act
      const result = await getDispute('dispute-123');

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('getPendingDisputes', () => {
    it('should return pending disputes for admin', async () => {
      // Act
      const result = await getPendingDisputes(10, 0);

      // Assert
      expect(result).toBeDefined();
      expect(result.disputes).toBeDefined();
      expect(result.total).toBeDefined();
      expect(Array.isArray(result.disputes)).toBe(true);
    });
  });

  describe('resolveDispute', () => {
    it('should successfully resolve dispute with full refund', async () => {
      // Arrange
      const mockDispute = {
        id: 'dispute-123',
        tradeId: 'trade-123',
        reportedBy: 'buyer-123',
        reportedAgainst: 'seller-123',
        issueType: DisputeIssueType.ITEM_NOT_AS_DESCRIBED,
        description: 'Item not as described',
        evidencePhotos: [],
        requestedResolution: DisputeResolution.REFUND_FULL,
        status: DisputeStatus.PENDING,
        createdAt: new Date()
      };

      // Mock getDispute to return the dispute
      jest.spyOn(require('../disputeService'), 'getDispute').mockResolvedValue(mockDispute);

      const request = {
        disputeId: 'dispute-123',
        resolution: DisputeResolution.REFUND_FULL,
        adminNotes: 'Evidence supports buyer claim',
        resolvedBy: 'admin-123'
      };

      // Act
      const result = await resolveDispute(request);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject resolution for non-existent dispute', async () => {
      // Arrange
      jest.spyOn(require('../disputeService'), 'getDispute').mockResolvedValue(null);

      const request = {
        disputeId: 'non-existent',
        resolution: DisputeResolution.REFUND_FULL,
        adminNotes: 'Evidence supports buyer claim',
        resolvedBy: 'admin-123'
      };

      // Act
      const result = await resolveDispute(request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Dispute not found');
    });
  });

  describe('getDisputeStats', () => {
    it('should return dispute statistics', async () => {
      // Act
      const result = await getDisputeStats();

      // Assert
      expect(result).toBeDefined();
      expect(result.totalDisputes).toBeDefined();
      expect(result.pendingDisputes).toBeDefined();
      expect(result.resolvedDisputes).toBeDefined();
      expect(result.averageResolutionTime).toBeDefined();
      expect(result.resolutionDistribution).toBeDefined();
      expect(result.issueTypeDistribution).toBeDefined();
    });
  });

  describe('DISPUTE_CONFIG', () => {
    it('should have correct configuration values', () => {
      expect(DISPUTE_CONFIG.MAX_DESCRIPTION_LENGTH).toBe(1000);
      expect(DISPUTE_CONFIG.MIN_DESCRIPTION_LENGTH).toBe(20);
      expect(DISPUTE_CONFIG.MAX_EVIDENCE_PHOTOS).toBe(5);
      expect(DISPUTE_CONFIG.DISPUTE_WINDOW_DAYS).toBe(7);
      expect(DISPUTE_CONFIG.ADMIN_RESPONSE_TIME_HOURS).toBe(24);
      expect(DISPUTE_CONFIG.ESCALATION_THRESHOLD_HOURS).toBe(72);
      expect(DISPUTE_CONFIG.MAX_DISPUTES_PER_USER_PER_MONTH).toBe(5);
    });
  });
});
