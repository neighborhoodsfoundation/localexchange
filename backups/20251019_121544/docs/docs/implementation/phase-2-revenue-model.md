# LocalEx Revenue Model & Payment Processing

**Document Type**: Business Requirements & Technical Architecture  
**Status**: 🔴 **CRITICAL - REQUIRES LEGAL/COMPLIANCE REVIEW**  
**Date**: October 9, 2025  
**Approval Required**: YES - Before Implementation  

---

## ⚠️ **CRITICAL WARNINGS**

### **1. App Store Compliance Risk**
This revenue model involves **real money transactions** for physical goods. We must ensure:
- ✅ **Complies with Apple App Store guidelines** (Section 3.1.1 - In-App Purchase)
- ✅ **Complies with Google Play policies** (Physical Goods & Services exceptions)
- ⚠️ **Legal review REQUIRED** before implementation
- ⚠️ **Positioning is critical**: This is NOT "digital content", it's "facilitating physical trades"

### **2. Financial Regulations**
- 🔐 **PCI-DSS Level 1 Compliance** required (handling card data)
- 📋 **Money Transmitter Licenses** may be required (state-by-state in US)
- 📋 **KYC/AML Compliance** may be required depending on volume
- 🌍 **International regulations** if expanding beyond US

### **3. Recommended Immediate Actions**
1. **Legal consultation** on App Store compliance
2. **Financial consultant** on money transmission requirements
3. **Payment processor selection** (Stripe Connect recommended)
4. **Compliance audit** before launch

---

## 💰 **Revenue Model**

### **Fee Structure**

#### **Fee Type 1: Platform Transaction Fee** (Fixed Per Person)
```
Amount: $1.99 per person per trade
Charged to: BOTH buyer AND seller
Total per trade: $3.98 ($1.99 × 2)
When charged: At trade confirmation (when escrow created)
Payment method: Debit card (stored payment method)
Purpose: Platform access, infrastructure costs, support
```

#### **Fee Type 2: Buyer Marketplace Fee** (Percentage)
```
Amount: 3.75% of system-generated item value
Charged to: Buyer ONLY
Calculation basis: System-generated value (AI pricing)
When charged: At trade confirmation (when escrow created)
Payment method: Debit card (stored payment method)
Purpose: Business operations, feature development, marketplace services
```

### **Example Trade Calculation**

**Scenario**: User A (seller) has a fridge, system values it at $400
```
Item System Value: $400.00

Buyer (User B) Pays:
├── Item value (in credits): 400 credits
├── Platform fee: $1.99 (USD, debit card)
├── Marketplace fee (3.75%): $15.00 (USD, debit card)
└── TOTAL: 400 credits + $17.99 USD

Seller (User A) Pays:
├── Receives from escrow: 400 credits
├── Platform fee: $1.99 (USD, debit card)
└── NET: 400 credits - $1.99 USD fee

LocalEx Revenue Per Trade:
├── Platform fees: $3.98 ($1.99 × 2)
├── Marketplace fee: $15.00 (3.75% of $400)
└── TOTAL: $18.98 per trade
```

### **Annual Revenue Projections**

**Conservative Estimates**:
```
Scenario 1: 1,000 users, 100 trades/day
├── Daily revenue: $1,898 (100 trades × $18.98)
├── Monthly revenue: $56,940
├── Annual revenue: $683,280

Scenario 2: 10,000 users, 1,000 trades/day
├── Daily revenue: $18,980
├── Monthly revenue: $569,400
├── Annual revenue: $6,832,800

Scenario 3: 100,000 users, 10,000 trades/day
├── Daily revenue: $189,800
├── Monthly revenue: $5,694,000
├── Annual revenue: $68,328,000
```

**Payment Processor Costs** (Stripe: 2.9% + $0.30 per charge):
```
Per Trade (2 platform fees + 1 marketplace fee = 3 charges):
├── Buyer platform fee: $1.99 → Stripe fee: $0.36 → Net: $1.63
├── Seller platform fee: $1.99 → Stripe fee: $0.36 → Net: $1.63
├── Marketplace fee: $15.00 → Stripe fee: $0.74 → Net: $14.26
└── TOTAL: $18.98 gross → $1.46 Stripe fees → $17.52 net (92.3%)

At 100 trades/day:
├── Gross revenue: $1,898/day
├── Stripe fees: $146/day (7.7%)
├── Net revenue: $1,752/day
└── Annual net: $639,480
```

---

## 🏗️ **Technical Architecture**

### **Payment Processing Architecture**

```
┌────────────────────────────────────────────────────────┐
│              LocalEx Payment Flow                      │
├────────────────────────────────────────────────────────┤
│                                                        │
│  User adds debit card                                  │
│         │                                              │
│         ▼                                              │
│  ┌──────────────┐                                      │
│  │ Stripe.js    │  (Frontend tokenization)            │
│  │ Collects card│  NO card data touches our servers   │
│  └──────┬───────┘                                      │
│         │                                              │
│         │ Card token                                   │
│         ▼                                              │
│  ┌──────────────────────┐                              │
│  │ LocalEx Backend      │                              │
│  │ Payment Service      │                              │
│  └──────┬───────────────┘                              │
│         │                                              │
│         │ Save payment method                          │
│         ▼                                              │
│  ┌──────────────────────┐                              │
│  │ Stripe API           │                              │
│  │ PaymentMethod stored │                              │
│  └──────┬───────────────┘                              │
│         │                                              │
│         │ Payment method ID                            │
│         ▼                                              │
│  ┌──────────────────────┐                              │
│  │ PostgreSQL           │                              │
│  │ user_payment_methods │  (Stores Stripe PM ID only) │
│  └──────────────────────┘                              │
│                                                        │
│  ═══════════════════════════════════════════════════   │
│                                                        │
│  Trade reaches escrow stage                            │
│         │                                              │
│         ▼                                              │
│  ┌──────────────────────┐                              │
│  │ Trading Service      │                              │
│  │ createEscrow()       │                              │
│  └──────┬───────────────┘                              │
│         │                                              │
│         │ Calculate fees                               │
│         ▼                                              │
│  ┌──────────────────────┐                              │
│  │ Fee Calculation      │                              │
│  │ - Platform: $1.99×2  │                              │
│  │ - Marketplace: 3.75% │                              │
│  └──────┬───────────────┘                              │
│         │                                              │
│         │ Charge fees                                  │
│         ▼                                              │
│  ┌──────────────────────┐                              │
│  │ Payment Service      │                              │
│  │ chargeFees()         │                              │
│  └──────┬───────────────┘                              │
│         │                                              │
│         ├─────────────────┐                            │
│         │                 │                            │
│         ▼                 ▼                            │
│  ┌─────────────┐   ┌─────────────┐                    │
│  │ Charge buyer│   │Charge seller│                    │
│  │ $17.99      │   │ $1.99       │                    │
│  └─────┬───────┘   └─────┬───────┘                    │
│        │                 │                            │
│        │ Stripe API      │ Stripe API                 │
│        ▼                 ▼                            │
│  ┌──────────────────────────────┐                      │
│  │ Stripe Payment Intent        │                      │
│  │ 3D Secure if required        │                      │
│  └──────┬───────────────────────┘                      │
│         │                                              │
│         │ Payment success                              │
│         ▼                                              │
│  ┌──────────────────────┐                              │
│  │ Create credits escrow│                              │
│  │ Reveal identity      │                              │
│  │ Proceed to meetup    │                              │
│  └──────────────────────┘                              │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### **Database Schema Changes**

#### **NEW: Payment Methods Table**
```sql
CREATE TABLE user_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Stripe payment method (NO raw card data stored)
    stripe_payment_method_id VARCHAR(255) NOT NULL, -- pm_xxxxx
    stripe_customer_id VARCHAR(255) NOT NULL,       -- cus_xxxxx
    
    -- Card metadata (for display only)
    card_brand VARCHAR(20),        -- 'visa', 'mastercard', 'amex', etc.
    card_last4 VARCHAR(4),         -- Last 4 digits for display
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    
    -- Validation
    is_verified BOOLEAN DEFAULT false,
    verification_amount_cents INTEGER, -- Micro-deposit verification
    verification_completed_at TIMESTAMP,
    
    -- Status
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    
    -- Ensure one default per user
    CONSTRAINT unique_default_per_user UNIQUE (user_id, is_default) 
      WHERE is_default = true
);

CREATE INDEX idx_payment_methods_user ON user_payment_methods (user_id);
CREATE INDEX idx_payment_methods_stripe ON user_payment_methods (stripe_payment_method_id);
```

#### **NEW: Transaction Fees Table**
```sql
CREATE TABLE transaction_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES trades(id),
    
    -- Fee breakdown
    platform_fee_buyer_cents INTEGER NOT NULL,    -- $1.99 = 199 cents
    platform_fee_seller_cents INTEGER NOT NULL,   -- $1.99 = 199 cents
    marketplace_fee_cents INTEGER NOT NULL,       -- 3.75% of item value
    
    -- Calculated values
    item_system_value_cents INTEGER NOT NULL,     -- System-generated value
    marketplace_fee_percentage DECIMAL(5,4) DEFAULT 0.0375, -- 3.75%
    
    total_fees_cents INTEGER GENERATED ALWAYS AS (
        platform_fee_buyer_cents + 
        platform_fee_seller_cents + 
        marketplace_fee_cents
    ) STORED,
    
    -- Payment references
    buyer_payment_intent_id VARCHAR(255),         -- pi_xxxxx
    buyer_charge_id VARCHAR(255),                 -- ch_xxxxx
    seller_payment_intent_id VARCHAR(255),
    seller_charge_id VARCHAR(255),
    
    -- Status tracking
    buyer_fee_status VARCHAR(20) DEFAULT 'PENDING',
    seller_fee_status VARCHAR(20) DEFAULT 'PENDING',
    -- PENDING, PROCESSING, SUCCEEDED, FAILED, REFUNDED
    
    -- Timestamps
    buyer_charged_at TIMESTAMP,
    seller_charged_at TIMESTAMP,
    fees_calculated_at TIMESTAMP DEFAULT NOW(),
    
    -- Refund tracking
    buyer_refund_id VARCHAR(255),
    seller_refund_id VARCHAR(255),
    refunded_at TIMESTAMP,
    refund_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transaction_fees_trade ON transaction_fees (trade_id);
CREATE INDEX idx_transaction_fees_buyer_status ON transaction_fees (buyer_fee_status);
CREATE INDEX idx_transaction_fees_seller_status ON transaction_fees (seller_fee_status);
```

#### **UPDATED: Items Table** (Add System-Generated Value)
```sql
-- Add columns to items table
ALTER TABLE items ADD COLUMN system_generated_value_cents INTEGER;
ALTER TABLE items ADD COLUMN value_confidence_score DECIMAL(3,2); -- 0.00-1.00
ALTER TABLE items ADD COLUMN value_generated_at TIMESTAMP;
ALTER TABLE items ADD COLUMN value_factors JSONB; -- What influenced the value

-- Example value_factors JSONB:
{
  "age_years": 2,
  "condition": "GOOD",
  "brand": "Samsung",
  "original_retail_price": 1200,
  "comparable_sales": [
    { "price": 380, "sold_date": "2025-09-15", "distance_miles": 12 },
    { "price": 420, "sold_date": "2025-09-20", "distance_miles": 8 }
  ],
  "market_demand": "MEDIUM",
  "depreciation_factor": 0.65
}
```

---

## 💳 **Payment Processing Implementation**

### **Stripe Integration (RECOMMENDED)**

**Why Stripe?**
- ✅ **PCI-DSS Level 1 Certified** (they handle compliance)
- ✅ **Debit card support** (instant bank verification)
- ✅ **3D Secure** (fraud prevention)
- ✅ **Stripe Connect** (marketplace model support)
- ✅ **No money transmitter license required** (they're the merchant of record)
- ✅ **Excellent developer experience**
- ✅ **Robust API** with webhooks

**Alternatives Considered**:
- Braintree (PayPal): Good but less modern API
- Square: Great for retail, less for marketplace
- Adyen: Enterprise-focused, more complex
- Plaid + Dwolla: ACH only, slower

**DECISION**: **Stripe** for payment processing

### **Payment Service Implementation**

```typescript
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  
  constructor() {
    this.stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] || '', {
      apiVersion: '2023-10-16',
    });
  }
  
  /**
   * Add payment method for user (frontend sends token from Stripe.js)
   */
  async addPaymentMethod(
    userId: string,
    paymentMethodId: string // From Stripe.js tokenization
  ): Promise<PaymentMethodResult> {
    
    // 1. Get or create Stripe customer
    const user = await this.userService.getById(userId);
    let stripeCustomerId = user.stripeCustomerId;
    
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
          displayName: user.displayName,
        },
      });
      stripeCustomerId = customer.id;
      await this.userService.updateStripeCustomerId(userId, stripeCustomerId);
    }
    
    // 2. Attach payment method to customer
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });
    
    // 3. Set as default payment method
    await this.stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    
    // 4. Get payment method details
    const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
    
    // 5. Save to database (NO raw card data)
    await pool.query(`
      INSERT INTO user_payment_methods (
        user_id,
        stripe_payment_method_id,
        stripe_customer_id,
        card_brand,
        card_last4,
        card_exp_month,
        card_exp_year,
        is_default,
        is_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)
    `, [
      userId,
      paymentMethodId,
      stripeCustomerId,
      paymentMethod.card?.brand,
      paymentMethod.card?.last4,
      paymentMethod.card?.exp_month,
      paymentMethod.card?.exp_year,
    ]);
    
    return {
      success: true,
      paymentMethodId,
      last4: paymentMethod.card?.last4,
      brand: paymentMethod.card?.brand,
    };
  }
  
  /**
   * Charge transaction fees at escrow creation
   */
  async chargeTransactionFees(
    tradeId: string,
    buyerId: string,
    sellerId: string,
    itemValueCents: number
  ): Promise<FeeChargeResult> {
    
    // 1. Calculate fees
    const fees = this.calculateFees(itemValueCents);
    
    // 2. Get payment methods
    const buyerPaymentMethod = await this.getDefaultPaymentMethod(buyerId);
    const sellerPaymentMethod = await this.getDefaultPaymentMethod(sellerId);
    
    if (!buyerPaymentMethod || !sellerPaymentMethod) {
      throw new Error('Both parties must have a payment method on file');
    }
    
    // 3. Create fee record
    const feeRecord = await this.createFeeRecord(tradeId, fees, itemValueCents);
    
    try {
      // 4. Charge buyer (platform fee + marketplace fee)
      const buyerCharge = await this.chargeBuyer(
        buyerId,
        buyerPaymentMethod.stripePaymentMethodId,
        fees.platformFeeBuyer + fees.marketplaceFee,
        tradeId
      );
      
      // 5. Charge seller (platform fee only)
      const sellerCharge = await this.chargeSeller(
        sellerId,
        sellerPaymentMethod.stripePaymentMethodId,
        fees.platformFeeSeller,
        tradeId
      );
      
      // 6. Update fee record with payment IDs
      await this.updateFeeRecord(feeRecord.id, {
        buyerPaymentIntentId: buyerCharge.paymentIntentId,
        buyerChargeId: buyerCharge.chargeId,
        buyerFeeStatus: 'SUCCEEDED',
        sellerPaymentIntentId: sellerCharge.paymentIntentId,
        sellerChargeId: sellerCharge.chargeId,
        sellerFeeStatus: 'SUCCEEDED',
      });
      
      return {
        success: true,
        totalFeesCharged: fees.platformFeeBuyer + fees.platformFeeSeller + fees.marketplaceFee,
        buyerCharged: fees.platformFeeBuyer + fees.marketplaceFee,
        sellerCharged: fees.platformFeeSeller,
      };
      
    } catch (error) {
      // Handle payment failures
      await this.handlePaymentFailure(tradeId, feeRecord.id, error);
      throw error;
    }
  }
  
  /**
   * Calculate fees based on item value
   */
  private calculateFees(itemValueCents: number): FeeBreakdown {
    const platformFeeBuyer = 199; // $1.99
    const platformFeeSeller = 199; // $1.99
    const marketplaceFeePercentage = 0.0375; // 3.75%
    const marketplaceFee = Math.round(itemValueCents * marketplaceFeePercentage);
    
    return {
      platformFeeBuyer,      // 199 cents = $1.99
      platformFeeSeller,     // 199 cents = $1.99
      marketplaceFee,        // 3.75% of item value
      totalFees: platformFeeBuyer + platformFeeSeller + marketplaceFee,
    };
  }
  
  /**
   * Charge buyer (platform + marketplace fees)
   */
  private async chargeBuyer(
    buyerId: string,
    paymentMethodId: string,
    amountCents: number,
    tradeId: string
  ): Promise<ChargeResult> {
    
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      description: `LocalEx Trade Fees - Trade ${tradeId}`,
      metadata: {
        userId: buyerId,
        tradeId,
        feeType: 'buyer_fees',
      },
      // Require 3D Secure if needed
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
        },
      },
    });
    
    // If requires action (3D Secure), handle it
    if (paymentIntent.status === 'requires_action') {
      // Frontend will handle 3D Secure flow
      return {
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    }
    
    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment failed: ${paymentIntent.status}`);
    }
    
    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      chargeId: paymentIntent.latest_charge as string,
    };
  }
  
  /**
   * Charge seller (platform fee only)
   */
  private async chargeSeller(
    sellerId: string,
    paymentMethodId: string,
    amountCents: number,
    tradeId: string
  ): Promise<ChargeResult> {
    
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      description: `LocalEx Platform Fee - Trade ${tradeId}`,
      metadata: {
        userId: sellerId,
        tradeId,
        feeType: 'seller_platform_fee',
      },
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
        },
      },
    });
    
    if (paymentIntent.status === 'requires_action') {
      return {
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    }
    
    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment failed: ${paymentIntent.status}`);
    }
    
    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      chargeId: paymentIntent.latest_charge as string,
    };
  }
  
  /**
   * Refund fees if trade is disputed/cancelled
   */
  async refundTransactionFees(tradeId: string, reason: string): Promise<RefundResult> {
    const feeRecord = await this.getFeeRecord(tradeId);
    
    const buyerRefund = await this.stripe.refunds.create({
      payment_intent: feeRecord.buyerPaymentIntentId,
      reason: 'requested_by_customer',
      metadata: { tradeId, reason },
    });
    
    const sellerRefund = await this.stripe.refunds.create({
      payment_intent: feeRecord.sellerPaymentIntentId,
      reason: 'requested_by_customer',
      metadata: { tradeId, reason },
    });
    
    await this.updateFeeRecord(feeRecord.id, {
      buyerRefundId: buyerRefund.id,
      sellerRefundId: sellerRefund.id,
      refundedAt: new Date(),
      refundReason: reason,
    });
    
    return {
      success: true,
      buyerRefundId: buyerRefund.id,
      sellerRefundId: sellerRefund.id,
    };
  }
}
```

---

## 🤖 **System-Generated Value (AI Pricing)**

### **Item Valuation Service**

```typescript
@Injectable()
export class ItemValuationService {
  /**
   * Generate system value for item
   */
  async generateItemValue(item: Item): Promise<ItemValuation> {
    // 1. Extract item features
    const features = await this.extractItemFeatures(item);
    
    // 2. Find comparable sales
    const comparables = await this.findComparableSales(item, features);
    
    // 3. Calculate depreciation
    const depreciation = this.calculateDepreciation(features);
    
    // 4. Analyze market demand
    const demand = await this.analyzeMarketDemand(item.category, item.location);
    
    // 5. Generate value
    const value = this.calculateValue(features, comparables, depreciation, demand);
    
    // 6. Calculate confidence score
    const confidence = this.calculateConfidence(comparables, features);
    
    // 7. Store valuation
    await pool.query(`
      UPDATE items
      SET 
        system_generated_value_cents = $1,
        value_confidence_score = $2,
        value_generated_at = NOW(),
        value_factors = $3
      WHERE id = $4
    `, [
      value.valueCents,
      confidence,
      JSON.stringify(value.factors),
      item.id,
    ]);
    
    return {
      valueCents: value.valueCents,
      valueDollars: value.valueCents / 100,
      confidence,
      factors: value.factors,
      comparables: comparables.slice(0, 3), // Show top 3
    };
  }
  
  /**
   * Extract features from item
   */
  private async extractItemFeatures(item: Item): Promise<ItemFeatures> {
    return {
      category: item.category,
      brand: item.brand || 'unknown',
      model: item.model || 'unknown',
      ageYears: this.calculateAge(item.purchaseDate),
      condition: item.condition, // NEW, LIKE_NEW, GOOD, FAIR, POOR
      hasPhotos: item.photos.length,
      originalRetailPrice: item.originalRetailPrice, // User-provided (optional)
    };
  }
  
  /**
   * Find comparable sales in area
   */
  private async findComparableSales(
    item: Item,
    features: ItemFeatures
  ): Promise<ComparableSale[]> {
    
    // Search completed trades in OpenSearch
    const comparables = await this.searchService.search({
      query: {
        bool: {
          must: [
            { match: { category: features.category } },
            { match: { brand: features.brand } },
            { term: { status: 'COMPLETED' } },
          ],
          filter: [
            // Within 50 miles
            {
              geo_distance: {
                distance: '50mi',
                location: {
                  lat: item.locationLat,
                  lon: item.locationLng,
                },
              },
            },
            // Within last 90 days
            {
              range: {
                completed_at: {
                  gte: 'now-90d',
                },
              },
            },
          ],
        },
      },
      sort: [
        { completed_at: 'desc' },
        { '_score': 'desc' },
      ],
      size: 10,
    });
    
    return comparables.hits.map(hit => ({
      price: hit._source.agreedPriceCredits,
      soldDate: hit._source.completedAt,
      distanceMiles: this.calculateDistance(item.location, hit._source.location),
      condition: hit._source.condition,
    }));
  }
  
  /**
   * Calculate depreciation based on age and condition
   */
  private calculateDepreciation(features: ItemFeatures): number {
    // Depreciation curves by category
    const depreciationRates = {
      'Electronics': 0.20, // 20% per year
      'Furniture': 0.10,   // 10% per year
      'Appliances': 0.12,  // 12% per year
      'Tools': 0.08,       // 8% per year
      'Sports': 0.15,      // 15% per year
    };
    
    const annualRate = depreciationRates[features.category] || 0.15;
    
    // Condition multipliers
    const conditionFactors = {
      'NEW': 1.0,
      'LIKE_NEW': 0.85,
      'GOOD': 0.65,
      'FAIR': 0.45,
      'POOR': 0.25,
    };
    
    const conditionFactor = conditionFactors[features.condition] || 0.65;
    
    // Calculate retained value
    const retainedValue = Math.pow(1 - annualRate, features.ageYears) * conditionFactor;
    
    return Math.max(0.1, retainedValue); // Never less than 10% of original
  }
  
  /**
   * Calculate final value
   */
  private calculateValue(
    features: ItemFeatures,
    comparables: ComparableSale[],
    depreciation: number,
    demand: MarketDemand
  ): { valueCents: number; factors: any } {
    
    let estimatedValue: number;
    
    if (comparables.length >= 3) {
      // Use comparable sales (preferred)
      const avgComparable = comparables.reduce((sum, c) => sum + c.price, 0) / comparables.length;
      estimatedValue = avgComparable;
    } else if (features.originalRetailPrice) {
      // Use depreciation model
      estimatedValue = features.originalRetailPrice * depreciation;
    } else {
      // Use category averages (fallback)
      estimatedValue = await this.getCategoryAverageValue(features.category);
    }
    
    // Apply demand multiplier
    const demandMultiplier = {
      'HIGH': 1.15,    // 15% premium for high demand
      'MEDIUM': 1.0,   // No adjustment
      'LOW': 0.85,     // 15% discount for low demand
    }[demand.level] || 1.0;
    
    const finalValue = Math.round(estimatedValue * demandMultiplier);
    
    return {
      valueCents: finalValue * 100, // Convert dollars to cents
      factors: {
        ageYears: features.ageYears,
        condition: features.condition,
        brand: features.brand,
        originalRetailPrice: features.originalRetailPrice,
        comparableSales: comparables,
        depreciation,
        demandLevel: demand.level,
        demandMultiplier,
      },
    };
  }
}
```

---

## 📱 **App Store Compliance Strategy**

### **Apple App Store - Section 3.1.1 Analysis**

**Rule**: Apps may not use in-app purchase to sell physical goods or services
**LocalEx Position**: ✅ **We are NOT selling goods**, we are **facilitating trades between users**

**Compliance Strategy**:
```
What we ARE doing:
✅ Facilitating peer-to-peer trades (physical goods exchange)
✅ Charging platform fees for service (like Uber, Airbnb)
✅ Processing payments for marketplace access
✅ Goods exchange happens OUTSIDE the app (in person)

What we are NOT doing:
❌ Selling goods directly to users
❌ Acting as a merchant
❌ Fulfilling orders
❌ Holding inventory

Comparable Apps (Approved):
├── OfferUp: Charges fees for promoted listings
├── Mercari: Charges selling fees
├── Poshmark: Charges 20% commission
├── StubHub: Charges service fees
└── Airbnb: Charges host/guest fees (not IAP)
```

**Recommended App Store Description Language**:
```
"LocalEx is a marketplace platform that connects local buyers and sellers. 
Transaction fees ($1.99 per person + 3.75% buyer fee) cover platform 
infrastructure, security, and support. All trades are completed in person 
at safe public locations. LocalEx does not sell goods - users trade directly 
with each other."
```

### **Google Play Store Compliance**

**Policy**: Physical Goods & Services Exception
**LocalEx Position**: ✅ **Physical goods traded locally, fees for platform service**

**Compliance**: ✅ Should be approved (follows Mercari, OfferUp model)

---

## 🔐 **Security & Compliance**

### **PCI-DSS Compliance**

**Stripe Handles**:
- ✅ All card data collection (Stripe.js tokenization)
- ✅ PCI-DSS Level 1 certification
- ✅ Secure card storage
- ✅ 3D Secure authentication
- ✅ Fraud detection

**We Handle**:
- Store Stripe tokens only (NOT raw card data)
- Secure API calls to Stripe
- Proper error handling
- Audit trail of all charges

**Our PCI Scope**: **SAQ-A** (lowest scope - we never touch card data)

### **Fraud Prevention**

```typescript
// Fraud checks before charging fees
async performFraudChecks(userId: string, amountCents: number): Promise<FraudCheck> {
  const checks = {
    // 1. Velocity check (too many charges in short time)
    velocityCheck: await this.checkTransactionVelocity(userId),
    
    // 2. Amount check (unusually high for user)
    amountCheck: await this.checkUnusualAmount(userId, amountCents),
    
    // 3. Device fingerprint (same device, different account)
    deviceCheck: await this.checkDeviceFingerprint(userId),
    
    // 4. Stripe Radar (automatic fraud detection)
    stripeRadar: true, // Stripe automatically checks
  };
  
  const riskScore = this.calculateRiskScore(checks);
  
  if (riskScore > 80) {
    // Block transaction, require manual review
    return { allowed: false, reason: 'HIGH_RISK', requiresReview: true };
  }
  
  return { allowed: true, riskScore };
}
```

---

## 💡 **Trade Flow with Fees**

### **Complete Updated Trade Flow**

```
1. ITEM LISTING
   ├── User A lists fridge
   ├── System generates value: $400 (AI pricing)
   ├── Display to marketplace
   └── User A pays: $0 (listing is free)

2. OFFER MADE
   ├── User B sees fridge, offers 400 credits
   ├── User B must have: 400 credits + payment method on file
   └── Fees: $0 (not charged yet)

3. OFFER ACCEPTED
   ├── User A accepts 400 credits
   └── Fees: $0 (not charged yet)

4. LOCATION & TIME COORDINATION
   ├── Both select Safe Zone
   ├── Both confirm time
   └── Fees: $0 (not charged yet)

5. FEE CALCULATION & ESCROW CREATION ← FEES CHARGED HERE
   ├── Calculate fees:
   │   ├── Platform fee buyer: $1.99
   │   ├── Platform fee seller: $1.99
   │   ├── Marketplace fee: $15.00 (3.75% of $400)
   │   └── Total: $18.98
   │
   ├── Charge buyer: $17.99 ($1.99 + $15.00)
   ├── Charge seller: $1.99
   │
   ├── If payment succeeds:
   │   ├── Create credits escrow (lock 400 credits)
   │   ├── Reveal identity (photos, vehicle)
   │   └── Proceed to meetup
   │
   └── If payment fails:
       ├── Trade cancelled
       ├── Notify users
       └── Prompt to update payment method

6. MEETUP & HANDOFF
   ├── Both arrive
   ├── Exchange fridge
   └── Both confirm handoff

7. COMPLETION
   ├── Release escrow: 400 credits → User A
   ├── User A net: 400 credits - $1.99 fee
   ├── User B net: -400 credits - $17.99 fees
   └── LocalEx revenue: $18.98

8. DISPUTE/CANCELLATION (if needed)
   ├── Refund all fees to both parties
   ├── Return credits from escrow
   └── LocalEx revenue: $0
```

---

## 📊 **Financial Reporting & Compliance**

### **Required Financial Records**

```sql
-- Revenue reporting view
CREATE VIEW revenue_report AS
SELECT 
  DATE(fees.created_at) as date,
  COUNT(DISTINCT fees.trade_id) as total_trades,
  
  SUM(fees.platform_fee_buyer_cents) / 100.0 as platform_fees_buyer,
  SUM(fees.platform_fee_seller_cents) / 100.0 as platform_fees_seller,
  SUM(fees.marketplace_fee_cents) / 100.0 as marketplace_fees,
  
  SUM(fees.total_fees_cents) / 100.0 as gross_revenue,
  
  -- Estimate Stripe fees (2.9% + $0.30 per charge)
  SUM(
    (fees.platform_fee_buyer_cents * 0.029 + 30) +
    (fees.platform_fee_seller_cents * 0.029 + 30) +
    (fees.marketplace_fee_cents * 0.029 + 30)
  ) / 100.0 as estimated_stripe_fees,
  
  -- Net revenue
  (SUM(fees.total_fees_cents) - SUM(
    (fees.platform_fee_buyer_cents * 0.029 + 30) +
    (fees.platform_fee_seller_cents * 0.029 + 30) +
    (fees.marketplace_fee_cents * 0.029 + 30)
  )) / 100.0 as net_revenue
  
FROM transaction_fees fees
WHERE fees.buyer_fee_status = 'SUCCEEDED'
  AND fees.seller_fee_status = 'SUCCEEDED'
GROUP BY DATE(fees.created_at)
ORDER BY date DESC;
```

### **Tax Compliance**

- **1099-K Requirements**: If user receives >$20,000 and >200 transactions, Stripe sends 1099-K
- **Sales Tax**: Physical goods trades between individuals are typically tax-exempt
- **Our Revenue**: Subject to corporate income tax

---

## ✅ **Implementation Checklist**

### **Phase 2.1: Payment Infrastructure (Add to roadmap)**

**Week 1-2: Stripe Integration**
- [ ] Create Stripe account (business verification)
- [ ] Integrate Stripe.js (frontend tokenization)
- [ ] Implement payment method storage
- [ ] Test 3D Secure flow
- [ ] Test fraud detection

**Week 3-4: Fee Calculation & Charging**
- [ ] Implement AI pricing service (item valuation)
- [ ] Implement fee calculation logic
- [ ] Integrate fee charging into escrow flow
- [ ] Test payment failures and retries
- [ ] Implement refund logic

**Week 5-6: Compliance & Testing**
- [ ] **Legal review of App Store compliance**
- [ ] **Financial consultant on money transmission**
- [ ] Security audit (PCI scope validation)
- [ ] Load testing (100 concurrent charges)
- [ ] Beta testing with real payments

---

## ⚠️ **CRITICAL DECISIONS REQUIRED**

### **Decision 1: App Store Compliance**
- **WHO**: Legal counsel specializing in App Store policies
- **WHEN**: Before any payment code is written
- **COST**: $2,000-5,000 for legal review
- **RISK**: App rejection if non-compliant

### **Decision 2: Money Transmitter Licenses**
- **WHO**: Financial compliance consultant
- **WHEN**: Before beta launch
- **COST**: Varies by state ($5,000-50,000+ if needed)
- **MITIGATION**: Stripe may handle this if we use Connect properly

### **Decision 3: International Expansion**
- **ISSUE**: Different regulations in each country
- **RECOMMENDATION**: Start US-only, expand later
- **WHEN**: Phase 3+

---

## 📝 **Summary**

**Revenue Model**:
- ✅ $1.99 platform fee per person per trade
- ✅ 3.75% marketplace fee on buyer
- ✅ Average $18.98 revenue per trade
- ✅ Projected $639K/year at 100 trades/day (after Stripe fees)

**Technical Implementation**:
- ✅ Stripe for payment processing (PCI-compliant)
- ✅ AI pricing for item valuation
- ✅ Fees charged at escrow creation
- ✅ Refunds if trade disputed/cancelled

**Compliance Requirements**:
- ⚠️ **Legal review REQUIRED** for App Store compliance
- ⚠️ **Financial consultant** for money transmission
- ✅ PCI-DSS handled by Stripe
- ✅ Fraud prevention via Stripe Radar

**Next Steps**:
1. **Legal review** (IMMEDIATE)
2. **Financial compliance** (IMMEDIATE)
3. Update Phase 2 timeline (add 2-3 weeks for payments)
4. Begin Stripe integration after approvals

---

*Document Status: DRAFT - Requires Legal and Financial Review*  
*Created: October 9, 2025*  
*Next Review: After legal consultation*

