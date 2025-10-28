# LocalEx API Development Plan
*Bridging Architecture with Real Functionality*

**Version**: 1.0  
**Date**: October 19, 2025  
**Purpose**: Replace mock services with real API endpoints  
**Timeline**: 4-6 weeks

---

## 🎯 **API Development Strategy**

### **Current State Analysis**
```
What We Have:                    What We Need:
┌─────────────────┐              ┌─────────────────┐
│   Mock Services │     →        │   Real APIs     │
│   (No Users)    │              │   (Functional)  │
└─────────────────┘              └─────────────────┘

✅ Business Logic Classes        ❌ Express.js Server
✅ Database Schema              ❌ API Endpoints
✅ TypeScript Interfaces        ❌ Authentication
✅ Service Methods              ❌ Error Handling
```

### **Development Approach**
**Preserve + Enhance**: Keep all existing architecture, add real API layer

```
Architecture Preservation:
┌─────────────────────────────────────────────────────────┐
│  Keep All Existing Code:                                │
│  ✅ UserContext, ItemContext, TradingContext classes    │
│  ✅ All TypeScript interfaces and types                 │
│  ✅ All business logic and service methods              │
│  ✅ All database schema and operations                  │
│  ✅ All testing framework and documentation             │
└─────────────────────────────────────────────────────────┘

API Layer Addition:
┌─────────────────────────────────────────────────────────┐
│  Add New API Layer:                                     │
│  ➕ Express.js server with endpoints                    │
│  ➕ JWT authentication middleware                       │
│  ➕ Request/response handling                           │
│  ➕ Error handling and validation                       │
│  ➕ Database connection and transactions                │
└─────────────────────────────────────────────────────────┘
```

---

## 🏗️ **API Architecture Design**

### **Server Structure**
```
src/
├── api/                    # New API layer
│   ├── server.ts          # Express server setup
│   ├── middleware/        # Authentication, validation
│   ├── routes/            # API endpoint definitions
│   └── controllers/       # Request handling logic
├── contexts/              # Existing business logic (keep)
├── config/                # Existing configuration (keep)
├── services/              # Existing services (keep)
└── database/              # Existing database (keep)
```

### **API Endpoint Structure**
```
/api/v1/
├── auth/
│   ├── POST   /register   # User registration
│   ├── POST   /login      # User login
│   ├── POST   /logout     # User logout
│   └── GET    /profile    # Get user profile
├── items/
│   ├── GET    /           # List/search items
│   ├── POST   /           # Create item listing
│   ├── GET    /:id        # Get item details
│   ├── PUT    /:id        # Update item listing
│   └── DELETE /:id        # Delete item listing
├── trades/
│   ├── GET    /           # List user's trades
│   ├── POST   /           # Create new trade
│   ├── GET    /:id        # Get trade details
│   ├── PUT    /:id        # Update trade status
│   └── POST   /:id/offers # Make/respond to offers
└── credits/
    ├── GET    /balance    # Get account balance
    ├── POST   /deposit    # Add credits
    └── GET    /history    # Transaction history
```

---

## 📋 **Development Phases**

### **Phase 1: Foundation Setup (Week 1)**
**Goal**: Set up Express.js server and basic infrastructure

#### **Day 1-2: Server Setup**
```typescript
// src/api/server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRoutes } from './routes/auth';
import { itemRoutes } from './routes/items';
import { tradeRoutes } from './routes/trades';
import { creditRoutes } from './routes/credits';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/items', itemRoutes);
app.use('/api/v1/trades', tradeRoutes);
app.use('/api/v1/credits', creditRoutes);

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
```

#### **Day 3-4: Authentication Middleware**
```typescript
// src/api/middleware/auth.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    displayName: string;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};
```

#### **Day 5: Database Connection**
```typescript
// src/api/middleware/database.ts
import { Pool } from 'pg';
import { config } from '../../config/database';

const pool = new Pool({
  connectionString: config.connectionString,
  ssl: config.ssl
});

export const getDbConnection = () => pool;

export const withDatabase = (handler: Function) => {
  return async (req: any, res: any, next: any) => {
    try {
      req.db = await pool.connect();
      await handler(req, res, next);
    } catch (error) {
      next(error);
    } finally {
      if (req.db) {
        req.db.release();
      }
    }
  };
};
```

### **Phase 2: User Context API (Week 2)**
**Goal**: Replace mock userService with real API endpoints

#### **User Registration Endpoint**
```typescript
// src/api/controllers/auth.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userService } from '../../contexts/user';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use existing userService (enhanced to work with database)
    const result = await userService.register({
      email,
      password,
      firstName,
      lastName,
      phone: req.body.phone,
      dateOfBirth: new Date(req.body.dateOfBirth)
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: result.user.id, 
        email: result.user.email,
        displayName: result.user.displayName 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      user: result.user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};
```

#### **User Login Endpoint**
```typescript
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Use existing userService
    const result = await userService.login(email, password);

    if (!result.success) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: result.user.id, 
        email: result.user.email,
        displayName: result.user.displayName 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: result.user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};
```

#### **User Profile Endpoint**
```typescript
export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Use existing userService
    const user = await userService.getUserProfile(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};
```

### **Phase 3: Item Context API (Week 3)**
**Goal**: Replace mock itemService with real API endpoints

#### **Item Listing Endpoint**
```typescript
// src/api/controllers/items.ts
import { Request, Response } from 'express';
import { itemService } from '../../contexts/items';
import { authenticateToken } from '../middleware/auth';

export const createItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const itemData = {
      ...req.body,
      sellerId: userId
    };

    // Use existing itemService
    const result = await itemService.createItem(itemData);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({
      success: true,
      item: result.item
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
};
```

#### **Item Search Endpoint**
```typescript
export const searchItems = async (req: Request, res: Response) => {
  try {
    const { query, category, minPrice, maxPrice, location } = req.query;

    // Use existing itemService
    const items = await itemService.searchItems({
      query: query as string,
      category: category as string,
      minPrice: minPrice ? parseInt(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice as string) : undefined,
      location: location as string
    });

    res.json({
      success: true,
      items,
      total: items.length
    });
  } catch (error) {
    console.error('Search items error:', error);
    res.status(500).json({ error: 'Failed to search items' });
  }
};
```

#### **Item Details Endpoint**
```typescript
export const getItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Use existing itemService
    const item = await itemService.getItem(id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Failed to get item' });
  }
};
```

### **Phase 4: Trading Context API (Week 4)**
**Goal**: Replace mock tradingService with real API endpoints

#### **Trade Creation Endpoint**
```typescript
// src/api/controllers/trades.ts
import { Request, Response } from 'express';
import { createTrade } from '../../contexts/trading';
import { authenticateToken } from '../middleware/auth';

export const createTrade = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const tradeData = {
      ...req.body,
      buyerId: userId
    };

    // Use existing trading service
    const result = await createTrade(tradeData);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({
      success: true,
      trade: result.trade
    });
  } catch (error) {
    console.error('Create trade error:', error);
    res.status(500).json({ error: 'Failed to create trade' });
  }
};
```

#### **Trade Management Endpoint**
```typescript
export const getUserTrades = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, type } = req.query;

    // Use existing trading service
    const trades = await getTrades({
      userId,
      status: status ? [status as string] : undefined,
      type: type as string
    });

    res.json({
      success: true,
      trades,
      total: trades.length
    });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ error: 'Failed to get trades' });
  }
};
```

### **Phase 5: Credits Context API (Week 5)**
**Goal**: Replace mock creditsService with real API endpoints

#### **Account Balance Endpoint**
```typescript
// src/api/controllers/credits.ts
import { Request, Response } from 'express';
import { getAccountBalance } from '../../contexts/credits';
import { authenticateToken } from '../middleware/auth';

export const getBalance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Use existing credits service
    const balance = await getAccountBalance({ accountId: userId });

    res.json({
      success: true,
      balance
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
};
```

#### **Transaction History Endpoint**
```typescript
export const getTransactionHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = 50, offset = 0 } = req.query;

    // Use existing credits service
    const transactions = await getTransactionHistory({
      accountId: userId,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({
      success: true,
      transactions,
      total: transactions.length
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({ error: 'Failed to get transaction history' });
  }
};
```

---

## 🔧 **Service Enhancement Strategy**

### **Enhancing Existing Services**
**Don't replace, enhance**: Modify existing services to work with real database

#### **Before (Mock Implementation)**
```typescript
// src/contexts/user/userService.ts
export const userService = {
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    // Mock implementation
    return {
      success: true,
      user: mockUser,
      token: 'mock-token'
    };
  }
};
```

#### **After (Real Implementation)**
```typescript
// src/contexts/user/userService.ts
import { getDbConnection } from '../../api/middleware/database';
import bcrypt from 'bcrypt';

export const userService = {
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    try {
      const db = await getDbConnection();
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Insert user into database
      const result = await db.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, display_name) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userData.email, hashedPassword, userData.firstName, userData.lastName, userData.displayName]
      );
      
      const user = result.rows[0];
      
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          displayName: user.display_name,
          createdAt: user.created_at
        }
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Registration failed'
      };
    }
  }
};
```

---

## 📊 **API Testing Strategy**

### **API Testing Framework**
```typescript
// tests/api/auth.test.ts
import request from 'supertest';
import app from '../../src/api/server';

describe('Auth API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.token).toBeDefined();
    });

    it('should reject invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
```

### **Integration Testing**
```typescript
// tests/api/integration.test.ts
describe('API Integration Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Register and login user
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'integration@test.com',
        password: 'password123',
        firstName: 'Integration',
        lastName: 'Test'
      });

    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
  });

  it('should create item listing', async () => {
    const itemData = {
      title: 'Test Item',
      description: 'A test item',
      categoryId: 'test-category',
      priceCredits: 100,
      condition: 'GOOD'
    };

    const response = await request(app)
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${authToken}`)
      .send(itemData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.item.title).toBe(itemData.title);
  });
});
```

---

## 🚀 **Deployment Strategy**

### **Development Environment**
```bash
# Start development server
npm run dev

# API will be available at:
# http://localhost:3000/api/v1/
```

### **API Documentation**
```typescript
// Use Swagger/OpenAPI for documentation
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LocalEx API',
      version: '1.0.0',
      description: 'LocalEx Trading Platform API'
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      }
    ]
  },
  apis: ['./src/api/routes/*.ts']
};

const specs = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
```

---

## 📋 **Success Metrics**

### **API Performance**
```
Response Time Targets:
- Authentication: <200ms
- Item Operations: <300ms
- Trade Operations: <400ms
- Search Operations: <500ms

Availability Targets:
- 99.9% uptime
- <1% error rate
- Graceful error handling
```

### **Development Progress**
```
Week 1: ✅ Server setup and authentication
Week 2: ✅ User management APIs
Week 3: ✅ Item management APIs
Week 4: ✅ Trading APIs
Week 5: ✅ Credits APIs
Week 6: ✅ Testing and optimization
```

---

## 🎯 **Next Steps**

### **Immediate Actions**
1. **Set up Express.js server** (Day 1)
2. **Implement authentication middleware** (Day 2-3)
3. **Create first API endpoint** (Day 4)
4. **Test with Postman/curl** (Day 5)

### **Week 1 Goals**
- ✅ Working Express.js server
- ✅ JWT authentication
- ✅ User registration/login APIs
- ✅ Basic error handling

### **Week 2 Goals**
- ✅ Complete user management APIs
- ✅ Database integration
- ✅ API testing framework
- ✅ Documentation setup

---

**🎉 This approach preserves all our excellent architectural work while adding the real API layer needed for a functional MVP!**
