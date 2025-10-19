/**
 * Arrival Tracking Tests
 * 
 * Tests for arrival tracking and handoff confirmation functionality
 * in the Trading Context.
 */

import { confirmArrival, confirmHandoff } from '../tradeService';
import { TradeStatus } from '../trading.types';

// Mock the database and external dependencies
jest.mock('../../credits', () => ({
  processPayment: jest.fn(),
  releaseEscrowFunds: jest.fn(),
  refundEscrowFunds: jest.fn(),
  calculateTradeFees: jest.fn()
}));

// Mock the getTrade function
jest.mock('../tradeService', () => {
  const originalModule = jest.requireActual('../tradeService');
  return {
    ...originalModule,
    getTrade: jest.fn(),
    updateTradeStatus: jest.fn()
  };
});

import { getTrade, updateTradeStatus } from '../tradeService';

const mockGetTrade = getTrade as jest.MockedFunction<typeof getTrade>;
const mockUpdateTradeStatus = updateTradeStatus as jest.MockedFunction<typeof updateTradeStatus>;

describe('Arrival Tracking System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('confirmArrival', () => {
    it('should successfully confirm buyer arrival', async () => {
      // Arrange
      const mockTrade = {
        id: 'trade-123',
        itemId: 'item-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-123',
        offeredPrice: 100,
        status: TradeStatus.AWAITING_ARRIVAL,
        meetupDetails: {
          id: 'meetup-123',
          tradeId: 'trade-123',
          locationLat: 39.7817,
          locationLng: -89.6501,
          meetingTime: new Date(),
          arrivalWindow: 15,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetTrade.mockResolvedValue(mockTrade);
      mockUpdateTradeStatus.mockResolvedValue(true);

      const request = {
        tradeId: 'trade-123',
        userId: 'buyer-123',
        locationLat: 39.7817,
        locationLng: -89.6501
      };

      // Act
      const result = await confirmArrival(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.arrivalStatus).toBeDefined();
      expect(result.arrivalStatus?.buyerArrived).toBe(true);
      expect(result.arrivalStatus?.sellerArrived).toBe(false);
      expect(mockUpdateTradeStatus).toHaveBeenCalledWith('trade-123', TradeStatus.BOTH_ARRIVED);
    });

    it('should successfully confirm seller arrival', async () => {
      // Arrange
      const mockTrade = {
        id: 'trade-123',
        itemId: 'item-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-123',
        offeredPrice: 100,
        status: TradeStatus.AWAITING_ARRIVAL,
        meetupDetails: {
          id: 'meetup-123',
          tradeId: 'trade-123',
          locationLat: 39.7817,
          locationLng: -89.6501,
          meetingTime: new Date(),
          arrivalWindow: 15,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetTrade.mockResolvedValue(mockTrade);
      mockUpdateTradeStatus.mockResolvedValue(true);

      const request = {
        tradeId: 'trade-123',
        userId: 'seller-123',
        locationLat: 39.7817,
        locationLng: -89.6501
      };

      // Act
      const result = await confirmArrival(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.arrivalStatus).toBeDefined();
      expect(result.arrivalStatus?.buyerArrived).toBe(false);
      expect(result.arrivalStatus?.sellerArrived).toBe(true);
    });

    it('should handle both parties arriving', async () => {
      // Arrange
      const mockTrade = {
        id: 'trade-123',
        itemId: 'item-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-123',
        offeredPrice: 100,
        status: TradeStatus.AWAITING_ARRIVAL,
        meetupDetails: {
          id: 'meetup-123',
          tradeId: 'trade-123',
          locationLat: 39.7817,
          locationLng: -89.6501,
          meetingTime: new Date(),
          arrivalWindow: 15,
          buyerArrivedAt: new Date(), // Buyer already arrived
          createdAt: new Date(),
          updatedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetTrade.mockResolvedValue(mockTrade);
      mockUpdateTradeStatus.mockResolvedValue(true);

      const request = {
        tradeId: 'trade-123',
        userId: 'seller-123',
        locationLat: 39.7817,
        locationLng: -89.6501
      };

      // Act
      const result = await confirmArrival(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.arrivalStatus).toBeDefined();
      expect(result.arrivalStatus?.buyerArrived).toBe(true);
      expect(result.arrivalStatus?.sellerArrived).toBe(true);
      expect(result.arrivalStatus?.bothArrivedAt).toBeDefined();
      expect(mockUpdateTradeStatus).toHaveBeenCalledWith('trade-123', TradeStatus.BOTH_ARRIVED);
    });

    it('should reject arrival confirmation for invalid trade state', async () => {
      // Arrange
      const mockTrade = {
        id: 'trade-123',
        itemId: 'item-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-123',
        offeredPrice: 100,
        status: TradeStatus.OFFER_MADE, // Wrong state
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetTrade.mockResolvedValue(mockTrade);

      const request = {
        tradeId: 'trade-123',
        userId: 'buyer-123',
        locationLat: 39.7817,
        locationLng: -89.6501
      };

      // Act
      const result = await confirmArrival(request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('not in correct state');
    });

    it('should reject arrival confirmation for non-participant', async () => {
      // Arrange
      const mockTrade = {
        id: 'trade-123',
        itemId: 'item-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-123',
        offeredPrice: 100,
        status: TradeStatus.AWAITING_ARRIVAL,
        meetupDetails: {
          id: 'meetup-123',
          tradeId: 'trade-123',
          locationLat: 39.7817,
          locationLng: -89.6501,
          meetingTime: new Date(),
          arrivalWindow: 15,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetTrade.mockResolvedValue(mockTrade);

      const request = {
        tradeId: 'trade-123',
        userId: 'other-user-123', // Not part of trade
        locationLat: 39.7817,
        locationLng: -89.6501
      };

      // Act
      const result = await confirmArrival(request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('not part of this trade');
    });

    it('should validate request parameters', async () => {
      // Arrange
      const invalidRequest = {
        tradeId: '', // Invalid
        userId: 'buyer-123',
        locationLat: 200, // Invalid latitude
        locationLng: -89.6501
      };

      // Act
      const result = await confirmArrival(invalidRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Trade ID is required');
      expect(result.error).toContain('Latitude must be between -90 and 90');
    });
  });

  describe('confirmHandoff', () => {
    it('should successfully confirm handoff completion', async () => {
      // Arrange
      const mockTrade = {
        id: 'trade-123',
        itemId: 'item-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-123',
        offeredPrice: 100,
        status: TradeStatus.BOTH_ARRIVED,
        meetupDetails: {
          id: 'meetup-123',
          tradeId: 'trade-123',
          locationLat: 39.7817,
          locationLng: -89.6501,
          meetingTime: new Date(),
          arrivalWindow: 15,
          buyerArrivedAt: new Date(),
          sellerArrivedAt: new Date(),
          bothArrivedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetTrade.mockResolvedValue(mockTrade);
      mockUpdateTradeStatus.mockResolvedValue(true);

      const request = {
        tradeId: 'trade-123',
        userId: 'buyer-123',
        itemAsDescribed: true,
        issues: []
      };

      // Act
      const result = await confirmHandoff(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.handoffConfirmation).toBeDefined();
      expect(result.handoffConfirmation?.buyerConfirmed).toBe(true);
      expect(result.handoffConfirmation?.itemAsDescribed).toBe(true);
      expect(mockUpdateTradeStatus).toHaveBeenCalledWith('trade-123', TradeStatus.HANDOFF_PENDING);
    });

    it('should complete trade when both parties confirm handoff', async () => {
      // Arrange
      const mockTrade = {
        id: 'trade-123',
        itemId: 'item-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-123',
        offeredPrice: 100,
        status: TradeStatus.BOTH_ARRIVED,
        meetupDetails: {
          id: 'meetup-123',
          tradeId: 'trade-123',
          locationLat: 39.7817,
          locationLng: -89.6501,
          meetingTime: new Date(),
          arrivalWindow: 15,
          buyerArrivedAt: new Date(),
          sellerArrivedAt: new Date(),
          bothArrivedAt: new Date(),
          handoffConfirmedAt: new Date(), // Seller already confirmed
          createdAt: new Date(),
          updatedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetTrade.mockResolvedValue(mockTrade);
      mockUpdateTradeStatus.mockResolvedValue(true);

      const request = {
        tradeId: 'trade-123',
        userId: 'buyer-123',
        itemAsDescribed: true,
        issues: []
      };

      // Act
      const result = await confirmHandoff(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.handoffConfirmation?.bothConfirmedAt).toBeDefined();
      expect(mockUpdateTradeStatus).toHaveBeenCalledWith('trade-123', TradeStatus.COMPLETED);
    });

    it('should reject handoff confirmation if both parties have not arrived', async () => {
      // Arrange
      const mockTrade = {
        id: 'trade-123',
        itemId: 'item-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-123',
        offeredPrice: 100,
        status: TradeStatus.BOTH_ARRIVED,
        meetupDetails: {
          id: 'meetup-123',
          tradeId: 'trade-123',
          locationLat: 39.7817,
          locationLng: -89.6501,
          meetingTime: new Date(),
          arrivalWindow: 15,
          buyerArrivedAt: new Date(),
          // sellerArrivedAt missing
          createdAt: new Date(),
          updatedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetTrade.mockResolvedValue(mockTrade);

      const request = {
        tradeId: 'trade-123',
        userId: 'buyer-123',
        itemAsDescribed: true,
        issues: []
      };

      // Act
      const result = await confirmHandoff(request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Both parties must arrive');
    });

    it('should validate handoff request parameters', async () => {
      // Arrange
      const invalidRequest = {
        tradeId: '', // Invalid
        userId: 'buyer-123',
        itemAsDescribed: 'yes', // Should be boolean
        issues: 'some issues' // Should be array
      };

      // Act
      const result = await confirmHandoff(invalidRequest as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Trade ID is required');
      expect(result.error).toContain('Item as described status is required');
      expect(result.error).toContain('Issues must be an array');
    });
  });
});
