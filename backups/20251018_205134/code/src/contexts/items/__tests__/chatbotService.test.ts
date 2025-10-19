/**
 * Chatbot Service Tests
 * 
 * Unit tests for LLM chatbot functionality including session management,
 * message handling, and AI response generation.
 */

import {
  createChatbotSession,
  sendChatbotMessage,
  getConversationHistory,
  endChatbotSession,
  isSessionActive,
  getSessionStats,
  CHATBOT_CONFIG
} from '../chatbotService';
import {
  UserIntent,
  ConversationStage,
  ChatbotSession,
  ItemCondition
} from '../items.types';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockSession: ChatbotSession = {
  id: 'chat_123',
  userId: 'user_123',
  itemId: 'item_123',
  context: {
    userIntent: UserIntent.GENERAL_HELP,
    conversationStage: ConversationStage.GREETING,
    previousValuations: [],
    userPreferences: {}
  },
  messages: [
    {
      id: 'msg_1',
      sessionId: 'chat_123',
      role: 'ASSISTANT',
      content: 'Hello! How can I help you today?',
      createdAt: new Date()
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true
};

// const mockMessage: ChatbotMessage = {
//   id: 'msg_2',
//   sessionId: 'chat_123',
//   role: 'USER',
//   content: 'I need help with pricing my item',
//   createdAt: new Date()
// };

// ============================================================================
// CREATE CHATBOT SESSION TESTS
// ============================================================================

describe('createChatbotSession', () => {
  it('should create session successfully', async () => {
    const result = await createChatbotSession('user_123');
    
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.userId).toBe('user_123');
    expect(result.itemId).toBeUndefined();
    expect(result.context).toBeDefined();
    expect(result.messages).toBeDefined();
    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.isActive).toBe(true);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should create session with item ID', async () => {
    const result = await createChatbotSession('user_123', 'item_123');
    
    expect(result).toBeDefined();
    expect(result.userId).toBe('user_123');
    expect(result.itemId).toBe('item_123');
  });

  it('should create session with context', async () => {
    const context = {
      userIntent: UserIntent.SELL_ITEM,
      conversationStage: ConversationStage.ANALYZING_ITEM,
      previousValuations: ['valuation_1'],
      userPreferences: {
        priceRange: { min: 100, max: 500 },
        preferredCondition: [ItemCondition.GOOD],
        categoriesOfInterest: ['Electronics'],
        locationRadius: 25
      }
    };
    
    const result = await createChatbotSession('user_123', 'item_123', context);
    
    expect(result).toBeDefined();
    expect(result.context.userIntent).toBe(UserIntent.SELL_ITEM);
    expect(result.context.conversationStage).toBe(ConversationStage.ANALYZING_ITEM);
    expect(result.context.previousValuations).toContain('valuation_1');
    expect(result.context.userPreferences?.priceRange).toEqual({ min: 100, max: 500 });
  });

  it('should include welcome message', async () => {
    const result = await createChatbotSession('user_123');
    
    expect(result.messages.length).toBeGreaterThan(0);
    const welcomeMessage = result.messages[0];
    expect(welcomeMessage?.role).toBe('ASSISTANT');
    expect(welcomeMessage?.content).toContain('Hello');
    expect(welcomeMessage?.content).toContain('help');
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // This should not throw but return a mock result
    const result = await createChatbotSession('invalid_user');
    
    expect(result).toBeDefined();
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});

// ============================================================================
// SEND CHATBOT MESSAGE TESTS
// ============================================================================

describe('sendChatbotMessage', () => {
  it('should send message successfully', async () => {
    const result = await sendChatbotMessage('chat_123', 'Hello, AI!');
    
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.sessionId).toBe('chat_123');
    expect(result.role).toBe('ASSISTANT');
    expect(result.content).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should send message with metadata', async () => {
    const metadata = {
      itemId: 'item_123',
      confidence: 0.85
    };
    
    const result = await sendChatbotMessage('chat_123', 'Hello, AI!', metadata);
    
    expect(result).toBeDefined();
    expect(result.metadata).toBeDefined();
  });

  it('should handle session not found', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const result = await sendChatbotMessage('invalid_session', 'Hello, AI!');
    
    expect(result).toBeDefined();
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const result = await sendChatbotMessage('chat_123', '');
    
    expect(result).toBeDefined();
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});

// ============================================================================
// GET CONVERSATION HISTORY TESTS
// ============================================================================

describe('getConversationHistory', () => {
  it('should get conversation history successfully', async () => {
    const result = await getConversationHistory('chat_123');
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle session not found', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const result = await getConversationHistory('invalid_session');
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});

// ============================================================================
// END CHATBOT SESSION TESTS
// ============================================================================

describe('endChatbotSession', () => {
  it('should end session successfully', async () => {
    await expect(endChatbotSession('chat_123')).resolves.not.toThrow();
  });

  it('should handle session not found', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    await expect(endChatbotSession('invalid_session')).resolves.not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});

// ============================================================================
// SESSION VALIDATION TESTS
// ============================================================================

describe('isSessionActive', () => {
  it('should return true for active session', () => {
    const result = isSessionActive(mockSession);
    
    expect(result).toBe(true);
  });

  it('should return false for inactive session', () => {
    const inactiveSession = {
      ...mockSession,
      isActive: false
    };
    
    const result = isSessionActive(inactiveSession);
    
    expect(result).toBe(false);
  });

  it('should return false for expired session', () => {
    const expiredSession = {
      ...mockSession,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    };
    
    const result = isSessionActive(expiredSession);
    
    expect(result).toBe(false);
  });

  it('should return true for recent session', () => {
    const recentSession = {
      ...mockSession,
      createdAt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    };
    
    const result = isSessionActive(recentSession);
    
    expect(result).toBe(true);
  });
});

// ============================================================================
// SESSION STATS TESTS
// ============================================================================

describe('getSessionStats', () => {
  it('should get session stats successfully', () => {
    const result = getSessionStats(mockSession);
    
    expect(result).toBeDefined();
    expect(result.messageCount).toBe(1);
    expect(result.sessionDuration).toBeGreaterThan(0);
    expect(result.isActive).toBe(true);
  });

  it('should calculate correct message count', () => {
    const sessionWithMultipleMessages = {
      ...mockSession,
      messages: [
        { id: 'msg_1', sessionId: 'chat_123', role: 'USER' as const, content: 'Hello', createdAt: new Date() },
        { id: 'msg_2', sessionId: 'chat_123', role: 'ASSISTANT' as const, content: 'Hi', createdAt: new Date() },
        { id: 'msg_3', sessionId: 'chat_123', role: 'USER' as const, content: 'How are you?', createdAt: new Date() }
      ]
    };
    
    const result = getSessionStats(sessionWithMultipleMessages);
    
    expect(result.messageCount).toBe(3);
  });

  it('should calculate correct session duration', () => {
    const sessionWithDuration = {
      ...mockSession,
      createdAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
    };
    
    const result = getSessionStats(sessionWithDuration);
    
    expect(result.sessionDuration).toBeGreaterThan(0);
    expect(result.sessionDuration).toBeLessThan(15 * 60 * 1000); // Less than 15 minutes
  });

  it('should handle inactive session', () => {
    const inactiveSession = {
      ...mockSession,
      isActive: false
    };
    
    const result = getSessionStats(inactiveSession);
    
    expect(result.isActive).toBe(false);
  });
});

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe('CHATBOT_CONFIG', () => {
  it('should have correct configuration values', () => {
    expect(CHATBOT_CONFIG.MAX_SESSION_DURATION).toBe(30 * 60 * 1000); // 30 minutes
    expect(CHATBOT_CONFIG.MAX_MESSAGES_PER_SESSION).toBe(50);
    expect(CHATBOT_CONFIG.RESPONSE_TIMEOUT).toBe(10000); // 10 seconds
    expect(CHATBOT_CONFIG.CONFIDENCE_THRESHOLD).toBe(0.7);
    expect(CHATBOT_CONFIG.CONTEXT_WINDOW_SIZE).toBe(10);
    expect(CHATBOT_CONFIG.SYSTEM_PROMPT).toBeDefined();
    expect(CHATBOT_CONFIG.INTENT_RECOGNITION_PROMPT).toBeDefined();
  });

  it('should have valid system prompt', () => {
    expect(CHATBOT_CONFIG.SYSTEM_PROMPT).toContain('LocalEx AI Assistant');
    expect(CHATBOT_CONFIG.SYSTEM_PROMPT).toContain('helpful');
    expect(CHATBOT_CONFIG.SYSTEM_PROMPT).toContain('accurate');
  });

  it('should have valid intent recognition prompt', () => {
    expect(CHATBOT_CONFIG.INTENT_RECOGNITION_PROMPT).toContain('SELL_ITEM');
    expect(CHATBOT_CONFIG.INTENT_RECOGNITION_PROMPT).toContain('BUY_ITEM');
    expect(CHATBOT_CONFIG.INTENT_RECOGNITION_PROMPT).toContain('GET_VALUATION');
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Chatbot Service Integration', () => {
  it('should handle complete conversation flow', async () => {
    // Create session
    const session = await createChatbotSession('user_123', 'item_123');
    expect(session).toBeDefined();
    expect(session.messages.length).toBeGreaterThan(0);
    
    // Send message
    const message = await sendChatbotMessage(session.id, 'I need help with pricing');
    expect(message).toBeDefined();
    expect(message.role).toBe('ASSISTANT');
    
    // Get history
    const history = await getConversationHistory(session.id);
    expect(history).toBeDefined();
    expect(Array.isArray(history)).toBe(true);
    
    // End session
    await expect(endChatbotSession(session.id)).resolves.not.toThrow();
  });

  it('should handle multiple messages in session', async () => {
    const session = await createChatbotSession('user_123');
    
    // Send multiple messages
    const message1 = await sendChatbotMessage(session.id, 'Hello');
    const message2 = await sendChatbotMessage(session.id, 'How are you?');
    const message3 = await sendChatbotMessage(session.id, 'Can you help me?');
    
    expect(message1).toBeDefined();
    expect(message2).toBeDefined();
    expect(message3).toBeDefined();
    
    // Get history
    const history = await getConversationHistory(session.id);
    expect(history.length).toBeGreaterThan(0);
  });

  it('should handle session expiration', async () => {
    const session = await createChatbotSession('user_123');
    
    // Check if session is active
    const isActive = isSessionActive(session);
    expect(isActive).toBe(true);
    
    // Get stats
    const stats = getSessionStats(session);
    expect(stats.isActive).toBe(true);
    expect(stats.messageCount).toBeGreaterThan(0);
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // These should not throw but handle errors gracefully
    await expect(createChatbotSession('user_123')).resolves.not.toThrow();
    await expect(sendChatbotMessage('chat_123', 'Hello')).resolves.not.toThrow();
    await expect(getConversationHistory('chat_123')).resolves.not.toThrow();
    await expect(endChatbotSession('chat_123')).resolves.not.toThrow();
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle invalid parameters gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // These should not throw but handle errors gracefully
    await expect(sendChatbotMessage('', 'Hello')).resolves.not.toThrow();
    await expect(getConversationHistory('')).resolves.not.toThrow();
    await expect(endChatbotSession('')).resolves.not.toThrow();
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
