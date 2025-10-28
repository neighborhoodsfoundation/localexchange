/**
 * Feedback Service Tests
 * 
 * Tests for feedback and rating functionality
 * in the Trading Context.
 */

import { 
  leaveFeedback, 
  getUserFeedback, 
  getTradeFeedback, 
  getUserRatingStats,
  reportFeedback,
  moderateFeedback,
  FEEDBACK_CONFIG
} from '../feedbackService';
import { TradeStatus } from '../trading.types';

// Mock the database and external dependencies
jest.mock('../tradeService', () => ({
  getTrade: jest.fn()
}));

import { getTrade } from '../tradeService';

const mockGetTrade = getTrade as jest.MockedFunction<typeof getTrade>;

describe('Feedback Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('leaveFeedback', () => {
    it('should successfully leave feedback for completed trade', async () => {
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
        fromUserId: 'buyer-123',
        toUserId: 'seller-123',
        rating: 5,
        review: 'Great seller, item as described!'
      };

      // Act
      const result = await leaveFeedback(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.feedback).toBeDefined();
      expect(result.feedback?.rating).toBe(5);
      expect(result.feedback?.isPositive).toBe(true);
      expect(result.feedback?.fromUserId).toBe('buyer-123');
      expect(result.feedback?.toUserId).toBe('seller-123');
    });

    it('should reject feedback for non-completed trade', async () => {
      // Arrange
      const mockTrade = {
        id: 'trade-123',
        itemId: 'item-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-123',
        offeredPrice: 100,
        status: TradeStatus.AWAITING_ARRIVAL, // Not completed
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetTrade.mockResolvedValue(mockTrade);

      const request = {
        tradeId: 'trade-123',
        fromUserId: 'buyer-123',
        toUserId: 'seller-123',
        rating: 5,
        review: 'Great seller!'
      };

      // Act
      const result = await leaveFeedback(request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Can only leave feedback for completed trades');
    });

    it('should reject feedback from non-participant', async () => {
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
        fromUserId: 'other-user-123', // Not part of trade
        toUserId: 'seller-123',
        rating: 5,
        review: 'Great seller!'
      };

      // Act
      const result = await leaveFeedback(request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('User is not part of this trade');
    });

    it('should reject self-feedback', async () => {
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
        fromUserId: 'buyer-123',
        toUserId: 'buyer-123', // Same user
        rating: 5,
        review: 'Great seller!'
      };

      // Act
      const result = await leaveFeedback(request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot leave feedback for yourself');
    });

    it('should validate rating range', async () => {
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
        fromUserId: 'buyer-123',
        toUserId: 'seller-123',
        rating: 6, // Invalid rating
        review: 'Great seller!'
      };

      // Act
      const result = await leaveFeedback(request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain(`Rating must be between ${FEEDBACK_CONFIG.MIN_RATING} and ${FEEDBACK_CONFIG.MAX_RATING}`);
    });

    it('should validate review length', async () => {
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
        fromUserId: 'buyer-123',
        toUserId: 'seller-123',
        rating: 5,
        review: 'Too short' // Less than minimum length
      };

      // Act
      const result = await leaveFeedback(request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain(`Review must be at least ${FEEDBACK_CONFIG.MIN_REVIEW_LENGTH} characters`);
    });

    it('should handle negative feedback correctly', async () => {
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
        fromUserId: 'buyer-123',
        toUserId: 'seller-123',
        rating: 2, // Low rating
        review: 'Item was not as described and arrived damaged.'
      };

      // Act
      const result = await leaveFeedback(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.feedback?.rating).toBe(2);
      expect(result.feedback?.isPositive).toBe(false);
    });
  });

  describe('getUserFeedback', () => {
    it('should return user feedback with statistics', async () => {
      // Act
      const result = await getUserFeedback('user-123', 10, 0);

      // Assert
      expect(result).toBeDefined();
      expect(result.feedback).toBeDefined();
      expect(result.total).toBeDefined();
      expect(result.averageRating).toBeDefined();
      expect(result.positiveCount).toBeDefined();
      expect(result.negativeCount).toBeDefined();
    });
  });

  describe('getTradeFeedback', () => {
    it('should return feedback for specific trade', async () => {
      // Act
      const result = await getTradeFeedback('trade-123');

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getUserRatingStats', () => {
    it('should return user rating statistics', async () => {
      // Act
      const result = await getUserRatingStats('user-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.averageRating).toBeDefined();
      expect(result.totalRatings).toBeDefined();
      expect(result.ratingDistribution).toBeDefined();
      expect(result.positivePercentage).toBeDefined();
      expect(result.recentFeedback).toBeDefined();
    });
  });

  describe('reportFeedback', () => {
    it('should successfully report inappropriate feedback', async () => {
      // Arrange
      const feedbackId = 'feedback-123';
      const reason = 'Inappropriate language';
      const reportedBy = 'user-123';

      // Act
      const result = await reportFeedback(feedbackId, reason, reportedBy);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('moderateFeedback', () => {
    it('should successfully approve feedback', async () => {
      // Arrange
      const feedbackId = 'feedback-123';
      const action = 'APPROVE' as const;
      const moderatorId = 'admin-123';

      // Act
      const result = await moderateFeedback(feedbackId, action, moderatorId);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should successfully remove feedback', async () => {
      // Arrange
      const feedbackId = 'feedback-123';
      const action = 'REMOVE' as const;
      const moderatorId = 'admin-123';
      const reason = 'Inappropriate content';

      // Act
      const result = await moderateFeedback(feedbackId, action, moderatorId, reason);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('FEEDBACK_CONFIG', () => {
    it('should have correct configuration values', () => {
      expect(FEEDBACK_CONFIG.MIN_RATING).toBe(1);
      expect(FEEDBACK_CONFIG.MAX_RATING).toBe(5);
      expect(FEEDBACK_CONFIG.MAX_REVIEW_LENGTH).toBe(500);
      expect(FEEDBACK_CONFIG.MIN_REVIEW_LENGTH).toBe(10);
      expect(FEEDBACK_CONFIG.FEEDBACK_WINDOW_DAYS).toBe(7);
      expect(FEEDBACK_CONFIG.REQUIRED_FEEDBACK_FOR_COMPLETION).toBe(true);
    });
  });
});
