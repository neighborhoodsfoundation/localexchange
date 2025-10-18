# Phase 2.0 - Business Logic Requirements & Architecture

**Phase**: 2.0 - Core Business Contexts  
**Document Type**: Requirements, Architecture, & Technology Decisions  
**Status**: 📋 **PLANNING & VALIDATION**  
**Approval Required**: Before Implementation  

---

## 📋 **Document Purpose**

This document serves as the **authoritative requirements specification** for Phase 2.0, establishing:
1. **What** we will build (features and functionality)
2. **Why** we're building it (business value and user needs)
3. **How** we'll build it (technology choices and architecture)
4. **Validation** of approach (risks, alternatives, justification)

**This document must be reviewed and approved before implementation begins.**

---

## 🎯 **Phase 2.0 Objectives**

### **Business Objectives**
1. **Enable Core Trading**: Users can list items, make offers, and complete trades
2. **Ensure Privacy**: Maximum user anonymity throughout platform
3. **Guarantee Safety**: Safe Zone coordination for in-person meetups
4. **Maintain Trust**: Reputation system builds confidence without personal exposure
5. **Financial Integrity**: Escrow system prevents fraud and ensures payment

### **Technical Objectives**
1. **70-80% Test Coverage**: Maintain quality standards from Phase 1
2. **Performance**: Sub-200ms API responses, cached data
3. **Security**: Authentication, authorization, data protection
4. **Scalability**: Support 10,000+ users, 1,000+ daily trades
5. **Maintainability**: Clean architecture, comprehensive documentation

### **User Experience Objectives**
1. **Zero Direct Communication**: Complete trades without messaging
2. **Maximum Privacy**: No personal info until financial commitment
3. **Simplified UX**: System-guided workflow, minimal decisions
4. **Safety First**: Verified Safe Zones, structured coordination
5. **Trust Through Data**: Reputation scores, not personal details

---

## 🏗️ **Core Architecture: The 4 Contexts**

### **Context 1: User Context** 👤
**Purpose**: Anonymous identity, authentication, reputation  
**Complexity**: Medium  
**Dependencies**: None (uses Phase 1 services)  
**Estimated Duration**: 2.5 weeks  

### **Context 2: Item Context** 📦
**Purpose**: Item listings, search, categories, AI-powered valuation  
**Complexity**: High (includes AI features)  
**Dependencies**: User Context  
**Estimated Duration**: 4 weeks (includes AI integration)  

### **Context 3: Credits Context** 💰
**Purpose**: Virtual currency, escrow, transactions  
**Complexity**: High (financial critical)  
**Dependencies**: User Context  
**Estimated Duration**: 2.5 weeks  

### **Context 4: Trading Context** 🤝
**Purpose**: Trade coordination, Safe Zones, meetup, completion  
**Complexity**: Very High (integration of all contexts)  
**Dependencies**: User, Item, Credits Contexts  
**Estimated Duration**: 4 weeks  

**Total Phase 2 Estimated Duration**: **15-16 weeks** (3.5-4 months)  
*Updated: Includes AI features integration (4 weeks) and payment processing implementation (2 weeks)*

---

## 💰 **Core Business Requirement: Revenue Model**

### **Fee Structure**

LocalEx generates revenue through **transaction fees** charged in USD via debit card:

1. **Platform Transaction Fee**: $1.99 per person per trade (charged to BOTH buyer AND seller)
2. **Marketplace Fee**: 3.75% of system-generated item value (charged to BUYER only)

**Example Trade**:
```
Item: Refrigerator (system value: $400)

Buyer Pays:
├── Item value: 400 credits (from account balance)
├── Platform fee: $1.99 USD (debit card)
├── Marketplace fee: $15.00 USD (3.75% of $400, debit card)
└── TOTAL: 400 credits + $17.99 USD

Seller Pays:
├── Receives: 400 credits (added to account)
├── Platform fee: $1.99 USD (debit card)
└── NET: 400 credits - $1.99 USD

LocalEx Revenue: $18.98 per trade
```

### **Business Justification**
1. **Sustainability**: Platform needs revenue to cover infrastructure, support, development
2. **Fair Pricing**: Lower than competitors (eBay 13%, Poshmark 20%, Mercari variable)
3. **Predictable**: Fixed platform fee + small percentage = stable revenue
4. **Transparent**: Fees shown upfront, no surprises
5. **Value Exchange**: Users pay for safety, privacy, and convenience features

### **Payment Processing**
- **Technology**: Stripe (PCI-DSS Level 1 Certified)
- **Payment Method**: Debit cards only (instant settlement)
- **Compliance**: PCI-DSS via Stripe, App Store physical goods exception
- **Security**: 3D Secure, Stripe Radar fraud detection
- **Timing**: Fees charged at escrow creation (before meetup)

### **System-Generated Item Valuation**
Every item receives an AI-generated value estimate for marketplace fee calculation:
- **Algorithm**: Comparable sales + depreciation + market demand
- **Factors**: Age, condition, brand, location, recent sales
- **Confidence Score**: 0.00-1.00 (how confident the system is)
- **User Benefit**: Free market analysis for every item
- **Fee Basis**: 3.75% calculated from this value

### **Critical Requirements**
- ⚠️ **Legal Review Required**: App Store compliance (physical goods exception)
- ⚠️ **Financial Compliance**: Money transmission license requirements (Stripe likely covers)
- ⚠️ **PCI-DSS**: Stripe handles (we never touch card data)
- ⚠️ **App Positioning**: "Marketplace facilitator" NOT "merchant"

**See**: `phase-2-revenue-model.md` for complete technical specifications

---

## 🔐 **Core Innovation 1: Maximum Privacy Model**

### **Requirement**
Users must remain **completely anonymous** until both parties have financially committed to a trade (escrow created).

### **Business Justification**
1. **Privacy Excellence**: Differentiates from all competitors
2. **Safety**: Prevents stalking, harassment, predatory behavior
3. **Fairness**: Eliminates discrimination based on appearance/demographics
4. **Trust Building**: Forces reputation-based decisions, not superficial judgments
5. **Legal Protection**: Minimal PII exposure reduces GDPR/COPPA risks
6. **Market Position**: "The most private trading app" is powerful marketing

### **Technical Implementation**

#### **Information Disclosure Tiers**
```
TIER 1: ALWAYS PUBLIC (Browsing, Offers, All Times)
├── Display name (auto-generated, anonymous): "BlueBird_7432"
├── Generic avatar (color-coded icon, NO photo)
├── Reputation score: ⭐ 4.8 stars
├── Trade statistics: 23 trades, 98% completion
├── Verification badge: ✓ (identity verified by system)
├── Member since: "August 2025"
└── General location: "Springfield area"

TIER 2: ESCROW-GATED (After Credits Locked)
├── Profile photo (for meetup identification)
├── Vehicle description (if provided)
├── Meetup coordination details
└── Still NO: Real name, email, phone, address

TIER 3: NEVER EXPOSED (Private Forever)
├── Real name (first name, last name)
├── Email address
├── Phone number
├── Exact address (lat/lng/zip stored, never shown)
├── Date of birth
└── Verification documents
```

#### **Technology Choices**

**Display Name Generation**:
- **Approach**: Adjective + Noun + 4-digit number
- **Technology**: Cryptographically random selection from curated word lists
- **Pattern**: `${adjective}${noun}_${1000-9999}`
- **Examples**: SwiftEagle_7432, BrightStar_2891, QuickFox_1829
- **Uniqueness**: Database constraint + collision detection
- **Regeneration**: Once per 30 days (prevents gaming system)

**Generic Avatar System**:
- **Approach**: Consistent color-coded icons from display name
- **Technology**: SVG icons with computed colors
- **Storage**: Static assets, served via CDN
- **Caching**: Aggressive (avatars never change)
- **Accessibility**: Color + letter for color-blind users

**Photo Access Control**:
- **Approach**: Database-driven ACL per trade state
- **Technology**: Middleware checks trade state before serving photo
- **Enforcement**: API gateway + signed URLs (S3)
- **Auditing**: All photo access logged
- **Expiry**: Photos inaccessible after trade completes

### **Alternative Approaches Considered**

#### **Alternative 1: Photos Always Visible**
- ❌ **Rejected**: Enables discrimination, stalking, harassment
- ❌ Market standard but creates safety/privacy issues
- ❌ Not aligned with "privacy-first" brand positioning

#### **Alternative 2: Optional Photo Visibility**
- ⚠️ **Considered**: Let users choose to show photos or not
- ❌ **Rejected**: Creates two-tier system, users with photos get more offers
- ❌ Pressure to reveal photos defeats privacy purpose

#### **Alternative 3: Photos Visible After Offer Accepted**
- ⚠️ **Considered**: Earlier than escrow
- ❌ **Rejected**: Not enough commitment, users can back out freely
- ❌ Could enable "fishing" for photos without real intent

#### **Alternative 4: Photos Visible After Location Confirmed** ✅
- ✅ **SELECTED**: Escrow = financial commitment = right timing
- ✅ Both parties invested, unlikely to back out
- ✅ Identity needed for meetup at this point
- ✅ Maximum privacy while still functional

### **Risks & Mitigations**

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Users frustrated by anonymity | Medium | Medium | Excellent reputation system compensates |
| Hard to build trust without photos | Medium | Medium | Trust scores + verification badges |
| Users try to exchange contact info | Medium | Low | Monitor for patterns, ban if abused |
| Fake accounts easier to create | High | Medium | Email verification + ID verification |
| Users back out after seeing photo | Low | High | Financial penalty (escrow forfeit) |

### **Success Metrics**
- [ ] 0% photo visibility during browsing/offers (measured via analytics)
- [ ] Photo access only when trade state = ESCROW_CREATED (enforced by ACL)
- [ ] 100% of users have auto-generated display names
- [ ] 0 direct communication channels available
- [ ] User satisfaction surveys show privacy valued

---

## 🗺️ **Core Innovation 2: Safe Zone Coordination System**

### **Requirement**
System must automatically recommend safe, public meeting locations and coordinate meetups without any direct user communication.

### **Business Justification**
1. **Safety Critical**: In-person meetups are highest-risk aspect of local trading
2. **Liability Reduction**: System recommendations with disclaimers protect platform
3. **User Experience**: Removes "where should we meet?" awkwardness
4. **Competitive Advantage**: No other platform does this systematically
5. **Trust Building**: Shows platform cares about user safety
6. **Brand Position**: "The safest way to trade locally"

### **Technical Requirements**

#### **Safe Zone Database**
**Must include**:
- 4-tier safety classification system
- Geographic coordinates (lat/lng)
- Business hours for tier verification
- Safety features (cameras, parking, lighting)
- Usage tracking (how many trades used this zone)
- Verification status (admin-approved)

**Data sources**:
1. Manual curation (admin adds verified locations)
2. Google Places API (police/fire stations)
3. User suggestions (admin approval required)
4. Partnership program (stores volunteer as Safe Zones)

#### **Location Recommendation Algorithm**
**Must provide**:
- Calculate midpoint between buyer/seller zip codes
- Find 3-5 Safe Zones within search radius
- Rank by: Safety Tier (1-4) → Fairness Score → Distance
- Expand radius if insufficient zones found (5mi → 7.5mi → 10mi)
- Calculate travel distances for both parties
- Estimate travel times
- Compute fairness score (equidistance metric)

#### **Confirmation Workflow Requirements**
**Must support**:
- Both parties independently select preferred zone
- System waits for both to choose SAME zone
- If mismatch, prompt to reconsider
- If > 5 miles, require explicit distance confirmation
- If custom location, show prominent risk warnings
- Both parties must confirm before proceeding

#### **Time Coordination Requirements**
**Must support**:
- ±15 minute arrival window
- Propose/accept/counter time workflow
- Calendar integration
- Reminder notifications (24h, 1h, 15min before)
- Timezone handling
- Timeout if no-show
- Reschedule option

#### **Arrival Tracking Requirements**
**Must support**:
- "I've Arrived" button (geo-fence optional)
- Notify partner when other arrives
- Both-arrived notification
- Late arrival warnings
- No-show detection (window expiry)
- Reputation impact for no-shows

### **Technology Choices**

#### **Geocoding & Mapping**
**Option 1: Google Maps Platform** (Recommended)
- ✅ **Pros**: Industry standard, excellent accuracy, comprehensive features
- ✅ **APIs Needed**: Geocoding, Distance Matrix, Places
- ⚠️ **Cons**: Cost (~$30-50/month at 1,000 trades/month)
- ✅ **Mitigation**: Aggressive caching (90%+ hit rate) → $5-10/month
- **Recommendation**: **Use Google Maps** - ROI justified by quality

**Option 2: OpenStreetMap + Nominatim**
- ✅ **Pros**: Free, open-source
- ❌ **Cons**: Less accurate, no business hours data, self-hosting required
- **Recommendation**: **Avoid** - Hidden costs (hosting, maintenance) > Google fees

**Option 3: Mapbox**
- ✅ **Pros**: Good quality, reasonable pricing
- ⚠️ **Cons**: Similar cost to Google, less comprehensive
- **Recommendation**: **Fallback option** if Google relationship issues

**DECISION**: **Google Maps Platform** with aggressive caching

#### **Distance Calculation**
**Option 1: Haversine Formula** (In-app calculation)
- ✅ **Pros**: Free, fast, no API calls
- ⚠️ **Cons**: "As the crow flies" only, not driving distance
- **Use Case**: Initial filtering and fairness scoring

**Option 2: Google Maps Distance Matrix API**
- ✅ **Pros**: Real driving distance and time
- ⚠️ **Cons**: API cost
- **Use Case**: Final display of travel times

**DECISION**: **Hybrid approach**
- Haversine for initial zone finding and ranking
- Distance Matrix for top 5 zones shown to users
- Caching: Cache all Distance Matrix results (locations don't move)

#### **Geospatial Queries**
**Option 1: PostGIS Extension** (Recommended)
- ✅ **Pros**: Native PostgreSQL, very fast, powerful
- ✅ **Features**: ST_Distance, ST_DWithin, spatial indexes
- ✅ **Performance**: Sub-10ms queries with proper indexing
- **Recommendation**: **Use PostGIS** - Already in PostgreSQL ecosystem

**Option 2: Application-Level Distance Calc**
- ❌ **Cons**: Slower, less efficient
- **Recommendation**: **Avoid** - PostGIS superior

**DECISION**: **PostGIS** for all spatial queries

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Safe zones with geographic index
CREATE TABLE safe_zones (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    location geography(POINT, 4326), -- PostGIS geography type
    -- ... other fields
);

-- Spatial index for fast proximity queries
CREATE INDEX idx_safe_zones_location 
  ON safe_zones USING GIST (location);

-- Find zones within 5 miles
SELECT *, 
  ST_Distance(location, ST_MakePoint($1, $2)::geography) / 1609.34 as distance_miles
FROM safe_zones
WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, 8046.72) -- 5 miles in meters
ORDER BY tier ASC, distance_miles ASC;
```

### **Alternative Approaches Considered**

#### **Safe Zone Alternatives**

**Alternative 1: No Safe Zone System**
- ❌ **Rejected**: Leaves users to figure out meetups alone
- ❌ High safety risk, poor UX
- ❌ Missed competitive differentiation

**Alternative 2: User-Generated Safe Zones Only**
- ⚠️ **Considered**: Users suggest locations
- ❌ **Rejected**: Quality control issues, spam potential
- **Variant**: Allow user suggestions with admin approval (Phase 3)

**Alternative 3: Partnership with Businesses**
- ✅ **Future Enhancement**: Businesses volunteer as Safe Zones
- ✅ Marketing benefit for businesses
- ✅ Revenue potential (premium Safe Zone listings)
- **Status**: Phase 3+ feature

**Alternative 4: Police Department Partnership** ✅
- ✅ **RECOMMENDED**: Official partnerships with police departments
- ✅ Some PDs already designate "Internet Purchase Exchange Locations"
- ✅ Free marketing ("Recommended by Springfield PD")
- ✅ Ultimate safety credibility
- **Action**: Research during Phase 2, implement in Phase 3

### **Risks & Mitigations**

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Insufficient Safe Zones in area | High | High | Multi-tier system, expand radius to 10mi |
| Safe Zone becomes unsafe over time | Low | High | Periodic revalidation, user reporting |
| Users ignore Safe Zones | Medium | High | Warnings + reputation penalty for custom |
| API costs exceed budget | Low | Medium | Aggressive caching (90%+ hit rate) |
| Geocoding inaccurate | Low | Medium | Fallback to manual address entry |
| Map API downtime | Low | High | Cache previous results, graceful degradation |

### **Success Metrics**
- [ ] 80%+ of trades use recommended Safe Zones (vs custom)
- [ ] 90%+ of users confirm location within 5 miles
- [ ] Tier 1 zones (police stations) used in 40%+ of trades
- [ ] Zero safety incidents at verified Safe Zones
- [ ] User satisfaction: 4.5+ stars on safety features

---

## 🚫 **Core Innovation 3: Zero-Communication Trading**

### **Requirement**
Platform must enable complete trades **without any direct user-to-user communication** (no messaging, chat, contact info exchange).

### **Business Justification**
1. **Privacy Protection**: Eliminates all personal info leakage vectors
2. **Scam Prevention**: No "text me instead", no phishing, no social engineering
3. **Harassment Prevention**: Impossible to harass without messaging
4. **Simplicity**: Guided workflow easier than negotiating via messages
5. **Legal Protection**: No user-generated content to moderate
6. **COPPA Compliant**: No chat rooms that could expose minors
7. **Unique Market Position**: "Trade without talking" is unprecedented

### **Technical Implementation**

#### **Communication Replacement Strategy**

**Traditional messaging replaced by**:
```
Messaging Purpose          → LocalEx Solution
─────────────────────────────────────────────────────────
"Is this available?"       → Offer-only (if listed, available)
"Can you do $X?"          → Structured offer/counter (max 2 rounds)
"Where should we meet?"   → System recommends Safe Zones
"When works for you?"     → System coordinates time selection
"What do you look like?"  → Profile photo (after escrow)
"What are you driving?"   → Vehicle info (after escrow)
"I'm here"                → "I've Arrived" button
"I got the item"          → "Confirm Handoff" button
"Great doing business"    → Star rating + optional review
```

#### **Offer/Counter System Design**

**Requirements**:
- Maximum 2 negotiation rounds (1 offer + 1 counter)
- Predefined response options (Accept/Decline/Counter)
- No free-form text during negotiation
- Decision deadline (24-48 hours)

**Rationale**:
- 90% of negotiations resolve in 1-2 rounds
- Simplicity prevents decision paralysis
- Forces decisive action
- Eliminates endless haggling

**Alternative**: Price range acceptance
```typescript
// Seller sets acceptable range at listing time
interface ItemListing {
  listPrice: number;        // 150 credits
  minAcceptablePrice?: number; // 130 credits (optional)
}

// If buyer offers within range → Auto-accepted
// If buyer offers outside range → Seller must manually accept/decline
// Reduces negotiation rounds by ~60%
```

**DECISION**: **Implement both** - Price range (optional) + offer/counter (always available)

#### **Structured Dispute System**

**Requirements**:
- Handle disputes without user-to-user communication
- Predefined issue categories
- Evidence upload (photos of actual item vs description)
- Admin mediation workflow
- Resolution within 72 hours

**Design**:
```typescript
interface DisputeReport {
  tradeId: string;
  reportedBy: 'BUYER' | 'SELLER';
  issueType: 
    | 'ITEM_NOT_AS_DESCRIBED'
    | 'ITEM_DAMAGED'
    | 'WRONG_ITEM'
    | 'NO_SHOW'
    | 'UNSAFE_BEHAVIOR'
    | 'OTHER';
  description: string; // Structured prompts, not free-form
  evidencePhotos: string[]; // URLs to uploaded evidence
  requestedResolution: 'REFUND' | 'PARTIAL_REFUND' | 'RELIST_ITEM';
}
```

**Admin reviews**:
- Views evidence from both parties (no direct communication)
- Makes decision based on platform policies
- Executes resolution (refund, partial, etc.)
- Updates reputation scores

### **Technology Choices**

**Push Notifications**:
- **Technology**: Firebase Cloud Messaging (FCM) for mobile
- **Purpose**: Real-time trade updates without messaging
- **Events**: Offer received, offer accepted, arrival confirmed, etc.

**Real-time Updates**:
- **Technology**: WebSocket OR Server-Sent Events
- **Purpose**: Update UI when partner takes action
- **Events**: Partner selected location, partner arrived, etc.
- **Alternative**: Polling (simpler but less real-time)
- **DECISION**: **Start with polling**, upgrade to WebSocket in Phase 3 if needed

### **Risks & Mitigations**

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Users want to message | High | Medium | Clear UX showing why it's better without |
| Complex items need questions | Medium | Medium | Force detailed item listings, Q&A section |
| Disputes hard without communication | Medium | High | Structured evidence-based dispute system |
| Users share contact externally | Medium | Low | Monitor for patterns, ban if systematic |
| No-shows increase | Low | Medium | Reputation penalties, require escrow |

### **Success Metrics**
- [ ] 95%+ of trades complete without any communication requests
- [ ] < 5% of users request messaging feature
- [ ] User satisfaction: 4.0+ stars on "ease of coordination"
- [ ] Dispute resolution time: < 72 hours average
- [ ] Completion rate: 85%+ (comparable to messaging platforms)

---

## 💰 **Core Innovation 4: Escrow-Gated Identity**

### **Requirement**
Personal identification information (photo, vehicle) is ONLY revealed after escrow is created (credits financially locked).

### **Business Justification**
1. **Prevents Window Shopping**: Can't browse faces without commitment
2. **Eliminates Discrimination**: Offers based on item quality + reputation only
3. **Reduces Flaking**: Financial commitment before personal exposure
4. **Privacy Maximum**: Identity revealed only when necessary
5. **Serious Traders**: Filters out casual/malicious users
6. **Platform Integrity**: Prevents abuse (dating, stalking, etc.)

### **Technical Implementation**

#### **Escrow State Machine**
```
Trade States:
├── OFFER_MADE
├── OFFER_ACCEPTED
├── LOCATION_SELECTED (both confirmed)
├── TIME_SELECTED (both confirmed)
├── ESCROW_CREATED ← IDENTITY REVELATION TRIGGER
├── AWAITING_ARRIVAL
├── BOTH_ARRIVED
├── HANDOFF_CONFIRMED (one party)
├── COMPLETED (both confirmed)
└── CANCELLED/DISPUTED

Photo Visibility:
├── States 1-4: ❌ NO PHOTO
├── States 5-8: ✅ PHOTO VISIBLE
└── State 9+: ❌ NO PHOTO (hidden again)
```

#### **Escrow Creation Logic**
```typescript
async createEscrow(tradeId: string): Promise<EscrowResult> {
  // 1. Validate both parties confirmed location and time
  const meetupDetails = await this.getMeetupDetails(tradeId);
  if (!this.isMeetupFullyConfirmed(meetupDetails)) {
    throw new Error('Location and time must be confirmed first');
  }
  
  // 2. Create escrow transaction (locks buyer's credits)
  const trade = await this.getTrade(tradeId);
  const escrowTxId = await creditsService.createEscrow(
    trade.buyerId,
    trade.sellerId,
    trade.agreedPrice
  );
  
  // 3. Update trade state
  await this.updateTradeStatus(tradeId, 'ESCROW_CREATED');
  
  // 4. TRIGGER: Reveal identity information
  await this.revealIdentityInformation(tradeId);
  
  // 5. Notify both parties
  await this.notifyEscrowCreated(tradeId);
  
  return {
    success: true,
    escrowTransactionId: escrowTxId,
    identityRevealed: true,
    nextStep: 'AWAIT_MEETUP',
  };
}

async revealIdentityInformation(tradeId: string): Promise<void> {
  const trade = await this.getTrade(tradeId);
  
  // Create identity packages for both parties
  const buyerIdentity = await this.createIdentityPackage(trade.buyerId);
  const sellerIdentity = await this.createIdentityPackage(trade.sellerId);
  
  // Store in trade_meetup_details (now accessible)
  await pool.query(`
    UPDATE trade_meetup_details
    SET 
      buyer_display_name = $1,
      buyer_profile_photo_url = $2,
      buyer_vehicle_info = $3,
      seller_display_name = $4,
      seller_profile_photo_url = $5,
      seller_vehicle_info = $6,
      identification_package_created_at = NOW()
    WHERE trade_id = $7
  `, [
    buyerIdentity.displayName,
    buyerIdentity.profilePhotoUrl,
    buyerIdentity.vehicleInfo,
    sellerIdentity.displayName,
    sellerIdentity.profilePhotoUrl,
    sellerIdentity.vehicleInfo,
    tradeId
  ]);
  
  // Log identity revelation for audit
  await auditService.log('IDENTITY_REVEALED', {
    tradeId,
    buyerId: trade.buyerId,
    sellerId: trade.sellerId,
    timestamp: new Date(),
  });
}
```

### **Alternative Approaches Considered**

**Alternative 1: Photos Always Visible**
- ❌ Rejected: See Privacy Model alternatives

**Alternative 2: Photos After Offer Accepted**
- ⚠️ Considered: Earlier revelation
- ❌ Rejected: Not enough commitment, users can back out freely

**Alternative 3: Photos After Payment Complete**
- ❌ Rejected: Too late, users need to identify each other at meetup

**Alternative 4: Photos After Location & Time Confirmed** ✅
- ✅ **SELECTED**: Perfect timing
- ✅ Both committed (location + time chosen)
- ✅ Financial commitment follows (escrow)
- ✅ Identity needed for upcoming meetup

### **Risks & Mitigations**

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| User backs out after seeing photo | Low | High | Escrow forfeit penalty, reputation penalty |
| Photo doesn't match (old photo) | Medium | Medium | Photo verification (AI + manual), freshness requirement |
| No vehicle provided | Medium | Low | Vehicle optional, other ID methods still work |
| Identity info leaked | Low | Critical | Access control, audit trail, legal penalties |

### **Success Metrics**
- [ ] < 2% trade cancellation after identity revelation
- [ ] Photo verification accuracy: 95%+
- [ ] Vehicle description accuracy (user feedback): 90%+
- [ ] Identity-based discrimination reports: 0
- [ ] Privacy violation reports: 0

---

## 🏗️ **Context-by-Context Requirements**

### **Context 1: User Context - Requirements**

#### **Functional Requirements**

**FR-U1: User Registration**
- **Must**: Email-based registration with verification
- **Must**: Auto-generate unique display name
- **Must**: Password strength enforcement (min 12 chars, complexity)
- **Must**: Email verification within 24 hours
- **Must**: CAPTCHA or bot prevention
- **Should**: Social login (Google, Apple) for convenience
- **Should**: Phone number (optional, for account recovery)

**FR-U2: Authentication**
- **Must**: JWT-based authentication
- **Must**: Integration with sessionService (87% tested ✅)
- **Must**: Secure password hashing (bcrypt, 12 rounds)
- **Must**: Account lockout after 5 failed attempts (uses rateLimitService)
- **Must**: Session management across devices
- **Should**: Remember me functionality
- **Should**: Biometric login (mobile apps)

**FR-U3: Profile Management**
- **Must**: Generic avatar generation (color-coded from display name)
- **Must**: Profile photo upload (NOT publicly visible)
- **Must**: Vehicle info management (optional)
- **Must**: Location (zip code) for Safe Zone calculations
- **Must NOT**: Display real name publicly
- **Must NOT**: Display contact info publicly
- **Must NOT**: Display exact address publicly

**FR-U4: Verification System**
- **Must**: ID document upload (driver's license, passport)
- **Must**: Admin review workflow
- **Must**: Verification badge on profile
- **Should**: AI-assisted verification (Phase 3)
- **Should**: Liveness check (selfie video)

**FR-U5: Privacy Controls**
- **Must**: Data export (GDPR compliance)
- **Must**: Account deletion with data retention policy
- **Must**: Display name regeneration (30-day limit)
- **Should**: Privacy settings (who can see trade history)
- **Should**: Block user functionality

**FR-U6: Payment Methods** 💳 (**NEW - Revenue Model**)
- **Must**: Add debit card (Stripe tokenization via Stripe.js)
- **Must**: Store Stripe payment method ID (NO raw card data)
- **Must**: Display card last 4 digits and brand
- **Must**: Set default payment method
- **Must**: Remove payment method capability
- **Must**: Verify card before first trade
- **Must NOT**: Store raw card numbers
- **Must NOT**: Store CVV
- **Must NOT**: Touch card data (PCI scope: SAQ-A)
- **Should**: Support multiple payment methods
- **Should**: Auto-update expired cards (Stripe feature)

#### **Non-Functional Requirements**

**NFR-U1: Performance**
- **Must**: Registration < 2 seconds
- **Must**: Login < 1 second
- **Must**: Profile queries cached (< 50ms from cache)
- **Must**: Password verification < 500ms

**NFR-U2: Security**
- **Must**: HTTPS only (TLS 1.3)
- **Must**: Password never logged or exposed
- **Must**: Email verification prevents fake accounts
- **Must**: Rate limiting on registration (3 per IP per day)
- **Must**: Session tokens expire (30 days max)

**NFR-U3: Testing**
- **Must**: 70%+ code coverage
- **Must**: 80%+ coverage on authentication/password logic
- **Must**: Security penetration testing
- **Must**: Load testing (1,000 concurrent logins)

#### **Technology Recommendations**

**Password Hashing**:
- **Technology**: bcrypt
- **Rounds**: 12 (balance of security and performance)
- **Why**: Industry standard, slow hash prevents brute force
- **Alternative**: Argon2 (more modern, but bcrypt proven)
- **DECISION**: **bcrypt** (proven, well-supported in Node.js)

**Email Verification**:
- **Technology**: JWT tokens in verification links
- **Expiry**: 24 hours
- **Delivery**: Queue service + email provider (SendGrid/Mailgun)
- **Why**: Prevents spam accounts, validates email ownership

**Display Name Generation**:
- **Word Lists**: 200 adjectives + 200 nouns = 40,000 combinations
- **Numbers**: 1000-9999 = 9,000 combinations
- **Total**: 360 million unique names
- **Collision Handling**: Retry up to 10 times
- **Storage**: Database unique constraint

---

### **Context 2: Item Context - Requirements**

#### **Functional Requirements**

**FR-I1: Item Listing Creation**
- **Must**: Title (required, 10-100 chars)
- **Must**: Description (required, 50-2000 chars)
- **Must**: Category selection (required)
- **Must**: Price in credits (required)
- **Must**: Condition (required enum)
- **Must**: Photo upload (1-12 photos)
- **Must**: Primary photo designation
- **Should**: Dimensions, weight, brand (optional metadata)

**FR-I2: Photo Management**
- **Must**: 1-12 photos per item
- **Must**: Uses Phase 1 fileManagementService (86% tested ✅)
- **Must**: Image optimization (Phase 1 imageProcessingService)
- **Must**: CDN delivery (Phase 1 cdnService)
- **Must**: Photo ordering capability
- **Should**: AI-based photo quality scoring
- **Should**: Suggest better photo angles

**FR-I3: Search Integration**
- **Must**: Real-time indexing to OpenSearch
- **Must**: Uses Phase 1 searchService (90% tested ✅)
- **Must**: Full-text search on title/description
- **Must**: Filter by category, price range, location, condition
- **Must**: Sort by relevance, price, date, distance
- **Must**: Geo-location proximity search
- **Should**: Search suggestions as user types
- **Should**: Save searches functionality

**FR-I4: Category System**
- **Must**: Hierarchical categories (parent/child)
- **Must**: Category browsing
- **Must**: Category-based filtering
- **Should**: Popular categories tracking
- **Should**: Category suggestions based on title

**FR-I5: Item Status Management**
- **Must**: ACTIVE (visible in search)
- **Must**: SOLD (marked after trade completes)
- **Must**: REMOVED (user deletes)
- **Must**: DISPUTED (if trade disputed)
- **Should**: PENDING_REVIEW (if flagged for moderation)

**FR-I6: AI Item Valuation** 🤖 (**NEW - Revenue Model**)
- **Must**: Generate system value for every item (for marketplace fee calculation)
- **Must**: Search comparable sales (OpenSearch: category, brand, location, 90 days)
- **Must**: Calculate depreciation based on age and condition
- **Must**: Analyze market demand in user's area
- **Must**: Generate confidence score (0.00-1.00)
- **Must**: Store value, confidence, and factors in database
- **Must**: Update value if item details change significantly
- **Should**: Provide value range (min-max) based on confidence
- **Should**: Show user why value was assigned (comparables, factors)
- **Should**: Allow user to dispute value (admin review)
- **Fallback**: If <3 comparables, use depreciation from user-provided retail price
- **Fallback**: If no retail price, use category average
- **Fallback**: If no data, prompt manual entry (admin review required)

**FR-I7: AI Image Recognition** 🤖 (**NEW - Enhanced User Experience**)
- **Must**: Google Vision API integration for automatic item identification
- **Must**: Extract brand, model, and category from item photos
- **Must**: Assess item condition from visual analysis
- **Must**: Generate item description suggestions
- **Must**: Validate photo quality and suggest improvements
- **Should**: Detect counterfeit items (brand verification)
- **Should**: Suggest better photo angles for listing
- **Should**: Auto-tag items with relevant keywords

**FR-I8: LLM Chatbot Integration** 🤖 (**NEW - User Guidance**)
- **Must**: OpenAI GPT-4 integration for conversational AI
- **Must**: Item-specific guidance and recommendations
- **Must**: Valuation explanation and pricing advice
- **Must**: Listing optimization suggestions
- **Must**: Market trend analysis and insights
- **Must**: User education and onboarding assistance
- **Should**: Multi-language support for diverse users
- **Should**: Context-aware responses based on user history

#### **Non-Functional Requirements**

**NFR-I1: Performance**
- **Must**: Item creation < 3 seconds (including photo upload)
- **Must**: Search results < 200ms (Phase 1 validated ✅)
- **Must**: Photo upload < 5 seconds per photo
- **Must**: Image optimization automatic (Phase 1 service)

**NFR-I2: Data Quality**
- **Must**: Enforce minimum description length (50 chars)
- **Must**: Require at least 1 photo
- **Must**: Validate price > 0
- **Should**: AI-based description quality scoring
- **Should**: Photo clarity validation

**NFR-I3: Testing**
- **Must**: 70%+ code coverage
- **Must**: Test search integration thoroughly
- **Must**: Test photo upload pipeline
- **Must**: Test CPSC safety checks (if implemented)

#### **Technology Recommendations**

**CPSC Product Safety Integration** (Requires Decision):
- **Purpose**: Check if item is recalled or unsafe
- **API**: CPSC.gov API (free)
- **When**: During item creation, flag unsafe items
- **Complexity**: Medium
- **Value**: High (liability protection, user safety)
- **Recommendation**: **Include in Phase 2** - Safety is brand pillar
- **Fallback**: If API down, flag for manual review

**Search Integration**:
- **Approach**: Use existing searchService (90% tested)
- **Real-time Indexing**: Index immediately on item creation
- **Cache Invalidation**: Clear cache on item update
- **Ranking**: Use search scoring from Phase 1 (tunable weights)

**Photo Requirements**:
- **Minimum**: 1 photo (enforce)
- **Maximum**: 12 photos
- **Size Limit**: 10MB per photo (Phase 1 configured)
- **Formats**: JPEG, PNG, WebP (Phase 1 supports)
- **Processing**: Automatic optimization + thumbnails (Phase 1 service)

---

### **Context 3: Credits Context - Requirements**

#### **Functional Requirements**

**FR-C1: Balance Management**
- **Must**: Get current balance (derived from ledger)
- **Must**: Balance queries cached (< 50ms)
- **Must**: Cache invalidation on transactions
- **Must**: Historical balance queries
- **Must**: Low balance notifications

**FR-C2: Transaction Creation**
- **Must**: Double-entry ledger (Phase 1 implemented ✅)
- **Must**: BEFORE INSERT trigger validation (Phase 1 ✅)
- **Must**: Atomic operations (database transactions)
- **Must**: Idempotency keys (prevent duplicates)
- **Must**: Audit trail (PERMANENT retention)
- **Must**: Transaction descriptions
- **Must**: Metadata (trade ID, item ID, etc.)

**FR-C3: Escrow Management**
- **Must**: Create escrow (lock credits in ESCROW account)
- **Must**: Release escrow (transfer to seller)
- **Must**: Refund escrow (return to buyer)
- **Must**: Escrow timeout (auto-refund after 30 days)
- **Must**: Escrow dispute hold
- **Must**: Partial refund capability (for disputes)

**FR-C4: BTC Conversion**
- **Must**: Initiate conversion (redirect to Coinbase Commerce)
- **Must**: Webhook handler for conversion completion
- **Must**: Balance update after conversion
- **Must**: Conversion history
- **Must**: Exchange rate tracking
- **Should**: Minimum conversion amount (reduce fees)
- **Must NOT**: Handle crypto directly in app (App Store compliance)

**FR-C5: Transaction History**
- **Must**: Paginated transaction list
- **Must**: Filter by type (credit/debit/escrow)
- **Must**: Filter by date range
- **Must**: Export for tax purposes (CSV)
- **Must**: Search by description

#### **Non-Functional Requirements**

**NFR-C1: Financial Integrity** (CRITICAL)
- **Must**: Every transaction creates exactly 2 ledger entries (debit + credit)
- **Must**: BEFORE INSERT trigger prevents negative balances
- **Must**: All operations in database transactions (ACID)
- **Must**: No balance stored (always derived from ledger)
- **Must**: Idempotency prevents duplicate transactions
- **Must**: Audit trail immutable (NEVER delete entries)

**NFR-C2: Performance**
- **Must**: Balance query < 100ms (first time, 50ms cached)
- **Must**: Transaction creation < 500ms
- **Must**: Escrow creation < 500ms
- **Must**: Balance cache invalidation < 100ms

**NFR-C3: Testing** (HIGHEST STANDARDS)
- **Must**: **85%+ code coverage** (financial critical)
- **Must**: Test ALL edge cases (negative balance attempts, race conditions, etc.)
- **Must**: Test double-entry consistency
- **Must**: Test escrow lifecycle completely
- **Must**: Load testing (1,000 concurrent transactions)
- **Must**: Chaos testing (simulate failures)

#### **Technology Recommendations**

**Double-Entry Ledger** (Already Implemented ✅):
- **Design**: Phase 1 architecture (BEFORE INSERT triggers)
- **Why**: Financial industry standard, prevents data corruption
- **Performance**: Optimized with indexes

**BTC Conversion Provider**:
- **Option 1: Coinbase Commerce** (Recommended)
  - ✅ Pros: Reputable, simple API, KYC handled by them
  - ✅ Webhooks for conversion completion
  - ⚠️ Fees: ~1% + network fees
  - ✅ App Store compliant (off-app conversion)
  
- **Option 2: BTCPay Server**
  - ✅ Pros: Self-hosted, no fees, privacy-focused
  - ❌ Cons: Complex setup, KYC compliance burden on us
  - ❌ Cons: Lightning Network complexity
  
- **DECISION**: **Coinbase Commerce** - Regulatory compliance offloaded, user trust

**Idempotency Strategy**:
- **Approach**: UUID idempotency keys
- **Storage**: Unique constraint on ledger_entries.idempotency_key
- **Generation**: Client generates UUID, server validates
- **Retry**: If duplicate key, return original transaction
- **Why**: Prevents double-charges on retry/network issues

---

### **Context 4: Trading Context - Requirements**

#### **Functional Requirements**

**FR-T1: Trade Initiation**
- **Must**: Initiate from item listing
- **Must**: Validate buyer has sufficient balance
- **Must**: Create trade record in database
- **Must**: Notify seller
- **Must**: Set expiry (offers expire after 48 hours)

**FR-T2: Offer/Counter System**
- **Must**: Buyer makes offer (any amount)
- **Must**: Seller can accept, decline, or counter
- **Must**: Maximum 2 rounds (1 offer + 1 counter)
- **Must**: Deadline for response (24-48 hours)
- **Must**: Auto-decline if expired
- **Should**: Price range auto-acceptance

**FR-T3: Location Coordination**
- **Must**: Calculate midpoint from zip codes
- **Must**: Find 3-5 Safe Zones within 5 miles
- **Must**: Expand to 7.5mi, then 10mi if insufficient
- **Must**: Show distances for both parties
- **Must**: Calculate fairness score
- **Must**: Both parties independently select
- **Must**: Require matching selection
- **Must**: Distance confirmation if > 5 miles
- **Must**: Risk warnings for custom locations

**FR-T4: Time Coordination**
- **Must**: Propose/accept/counter time workflow
- **Must**: ±15 minute arrival window
- **Must**: Both parties must agree
- **Must**: Calendar integration (ICS export)
- **Must**: Reminder notifications (24h, 1h, 15min before)
- **Must**: Timezone handling

**FR-T5: Escrow Execution**
- **Must**: Create escrow ONLY after location + time confirmed
- **Must**: Lock buyer's credits in ESCROW account
- **Must**: Validate sufficient balance
- **Must**: Atomic operation (use database transaction)
- **Must**: Trigger identity revelation
- **Must**: Notify both parties

**FR-T6: Identity Revelation** (CRITICAL PRIVACY REQUIREMENT)
- **Must**: Reveal profile photos ONLY after escrow created
- **Must**: Reveal vehicle info ONLY after escrow created
- **Must**: Show display names (always visible)
- **Must**: Show meetup details (location, time, window)
- **Must NOT**: Reveal real names, email, phone, address
- **Must**: Access control (API enforces escrow state)

**FR-T7: Arrival Coordination**
- **Must**: "I've Arrived" button during arrival window
- **Must**: Notify partner when arrived
- **Must**: Both-arrived notification
- **Should**: Geo-fence verification (optional)
- **Must**: Late arrival warnings
- **Must**: No-show detection (window + 15 min grace)

**FR-T8: Handoff Confirmation**
- **Must**: Both parties must confirm handoff
- **Must**: Inspection checklist before confirmation
- **Must**: Cancel option if item not as described
- **Must**: Release escrow when both confirm
- **Must**: Credits transfer via double-entry ledger
- **Must**: Item status → SOLD
- **Must**: Trade status → COMPLETED

**FR-T9: Feedback System**
- **Must**: Star rating (1-5)
- **Must**: Optional written review (max 500 chars)
- **Must**: Review moderation (flag offensive content)
- **Must**: Display on user profile (anonymous)
- **Should**: Helpful/not helpful voting

**FR-T10: Cancellation & Disputes**
- **Must**: Cancel before escrow (no penalty)
- **Must**: Cancel after escrow (escrow forfeit penalty)
- **Must**: Structured dispute system (predefined categories)
- **Must**: Evidence upload (photos)
- **Must**: Admin mediation within 72 hours
- **Must**: Escrow hold during dispute
- **Must**: Reputation impact for disputes

#### **Non-Functional Requirements**

**NFR-T1: Reliability**
- **Must**: 99.9% uptime for trade operations
- **Must**: No lost trades due to system failures
- **Must**: Automatic retry for failed operations
- **Must**: Complete audit trail for debugging

**NFR-T2: Performance**
- **Must**: Trade creation < 1 second
- **Must**: Safe Zone recommendations < 2 seconds
- **Must**: Arrival confirmation < 500ms
- **Must**: Escrow creation < 1 second

**NFR-T3: Testing**
- **Must**: 75%+ code coverage overall
- **Must**: 85%+ on escrow logic (financial critical)
- **Must**: 85%+ on location/time coordination
- **Must**: End-to-end trade flow tests
- **Must**: Chaos engineering (failure scenarios)

#### **Technology Recommendations**

**State Machine Implementation**:
- **Technology**: XState OR manual state machine
- **Why**: Complex state transitions need formal modeling
- **Recommendation**: **Manual state machine** (simpler, less dependencies)
- **Implementation**: Enum + transition validation functions

```typescript
enum TradeState {
  OFFER_MADE = 'OFFER_MADE',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  LOCATION_SELECTING = 'LOCATION_SELECTING',
  LOCATION_CONFIRMED = 'LOCATION_CONFIRMED',
  TIME_SELECTING = 'TIME_SELECTING',
  TIME_CONFIRMED = 'TIME_CONFIRMED',
  ESCROW_CREATED = 'ESCROW_CREATED',
  AWAITING_ARRIVAL = 'AWAITING_ARRIVAL',
  BOTH_ARRIVED = 'BOTH_ARRIVED',
  HANDOFF_PENDING = 'HANDOFF_PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
}

const VALID_TRANSITIONS: Record<TradeState, TradeState[]> = {
  OFFER_MADE: ['OFFER_ACCEPTED', 'CANCELLED'],
  OFFER_ACCEPTED: ['LOCATION_SELECTING', 'CANCELLED'],
  LOCATION_SELECTING: ['LOCATION_CONFIRMED', 'CANCELLED'],
  // ... all valid transitions
};

function validateTransition(from: TradeState, to: TradeState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) || false;
}
```

**Notification System**:
- **Technology**: Firebase Cloud Messaging (FCM)
- **Why**: Industry standard, reliable, free tier generous
- **Usage**: Trade updates, arrival notifications, reminders
- **Fallback**: Email notifications if push disabled

**Geolocation**:
- **Already decided**: Google Maps + PostGIS
- **Integration**: Create thin wrapper service
- **Caching Strategy**: 
  - Zip code → lat/lng: Cache forever (don't move)
  - Safe Zone searches: Cache for 24 hours
  - Distance calculations: Cache for 7 days

---

## 🔍 **Risk Analysis & Validation**

### **High-Risk Areas**

#### **Risk 1: Privacy Model Too Restrictive**
**Risk**: Users may feel uncomfortable offering without seeing seller  
**Likelihood**: Medium  
**Impact**: Medium (could reduce offers)  

**Validation Approach**:
- Survey potential users on privacy preferences
- A/B test in beta: Photos vs No Photos groups
- Monitor offer rates and completion rates
- User feedback surveys

**Mitigation**:
- Excellent reputation system (compensates for no photo)
- Verification badges build trust
- Detailed item listings reduce uncertainty
- Trial period: If offer rates drop >20%, reconsider

**Decision Point**: After beta testing (100 users, 2 weeks)

---

#### **Risk 2: No Messaging Frustrates Users**
**Risk**: Users want to ask questions about items  
**Likelihood**: High  
**Impact**: Medium  

**Validation Approach**:
- Analyze Craigslist/FB Marketplace messages
- Categorize: What are people actually asking?
- Design preemptive solutions in item listings

**Mitigation Strategies**:
```
Common Questions        → LocalEx Solution
───────────────────────────────────────────────
"Is this still available?" → If listed, it's available
"Can you do $X?"          → Make offer, seller accepts/declines
"What's the condition?"   → Required detailed condition field
"Does it work?"           → Required "known issues" field
"Can you deliver?"        → NO (local pickup only, stated upfront)
"Where are you?"          → General area shown, Safe Zone coordinated
"When can we meet?"       → Time coordination system
```

**Preemptive Solutions**:
- Comprehensive listing template (forces detail)
- FAQ section on each listing (seller pre-answers common questions)
- Video upload option (show item working)
- Detailed condition descriptions

**Decision Point**: After beta, if >15% request messaging, consider structured Q&A

---

#### **Risk 3: Safe Zones Insufficient in Rural Areas**
**Risk**: Some areas may have no Safe Zones within 10 miles  
**Likelihood**: Medium (urban: low, rural: high)  
**Impact**: High (blocks trades)  

**Validation Approach**:
- Map pilot areas and count Safe Zones
- Identify coverage gaps
- Plan solutions before launch

**Mitigation**:
- Start in urban/suburban areas (phase rollout)
- Partner with rural police departments for Safe Zone designation
- Allow custom locations with STRONG warnings in rural areas
- Set expectation: "LocalEx works best in populated areas"

**Decision Point**: Launch strategy - urban first, rural later

---

#### **Risk 4: Escrow-Before-Identity Creates Friction**
**Risk**: Users back out after seeing photo/vehicle  
**Likelihood**: Low  
**Impact**: High (reputation damage, user frustration)  

**Validation Approach**:
- Beta testing: Track cancellation rates
- Before escrow vs after escrow cancellations
- User feedback on reveal timing

**Mitigation**:
- Clear messaging: "Photos revealed after commitment"
- Escrow forfeit penalty for backing out
- Reputation penalty for cancellation after identity reveal
- Profile photo requirements (recent, clear, accurate)

**Success Criteria**: < 2% cancellation rate after identity revelation

**Decision Point**: Beta results, adjust if cancellation > 5%

---

#### **Risk 5: Double-Entry Ledger Complexity**
**Risk**: Financial bugs could cause critical issues  
**Likelihood**: Medium (complex system)  
**Impact**: **CRITICAL** (money lost, user trust destroyed)  

**Validation Approach**:
- Extensive testing (85%+ coverage mandatory)
- Load testing (1,000 concurrent transactions)
- Chaos engineering (failure injection)
- Manual ledger audits
- Reconciliation reports

**Mitigation**:
- Use Phase 1 proven foundation (BEFORE INSERT triggers ✅)
- Comprehensive unit tests on every transaction type
- Integration tests for complete trade flows
- Daily automated ledger reconciliation
- Admin dashboard for financial anomaly detection
- Regular manual audits

**Success Criteria**: 
- 0 balance inconsistencies
- 100% ledger balance = sum of credits in circulation
- All transactions reconcile

**Decision Point**: MUST pass all financial tests before production

---

## 🛠️ **Technology Stack Decisions**

### **Backend Technologies** (Mostly Decided in Phase 1)

| Component | Technology | Status | Justification |
|-----------|-----------|--------|---------------|
| **Runtime** | Node.js 18+ | ✅ Decided | TypeScript ecosystem, async I/O |
| **Language** | TypeScript (strict mode) | ✅ Decided | Type safety, fewer bugs |
| **Database** | PostgreSQL 16+ | ✅ Decided | ACID, triggers, proven |
| **Cache** | Redis 7+ | ✅ Decided Phase 1 | 86% tested, performant |
| **Search** | OpenSearch 2.11 | ✅ Decided Phase 1 | 90% tested, powerful |
| **Storage** | AWS S3 | ✅ Decided Phase 1 | 86% tested via file-mgmt |
| **Image Processing** | Sharp (libvips) | ✅ Decided Phase 1 | Fastest, tested |
| **Geospatial** | PostGIS | 📋 **NEW DECISION** | Native PostgreSQL, efficient |
| **Mapping API** | Google Maps | 📋 **NEW DECISION** | Industry standard, accurate |
| **Push Notifications** | FCM | 📋 **NEW DECISION** | Free, reliable, standard |
| **Email** | SendGrid/Mailgun | 📋 **NEEDS DECISION** | Either works, pick one |
| **BTC Conversion** | Coinbase Commerce | 📋 **NEW DECISION** | App Store compliant |

### **New Dependencies to Add**
```json
{
  "dependencies": {
    // Already have from Phase 1: pg, ioredis, @aws-sdk/*, sharp, etc.
    
    // NEW for Phase 2:
    "@googlemaps/google-maps-services-js": "^3.3.42", // Google Maps APIs
    "firebase-admin": "^12.0.0",           // Push notifications
    "joi": "^17.11.0",                     // Input validation (already have)
    "bcryptjs": "^2.4.3",                  // Password hashing (already have)
    "jsonwebtoken": "^9.0.2",              // JWT tokens (already have)
    "node-cron": "^3.0.3",                 // Scheduled jobs (reminders, cleanup)
    "coinbase-commerce-node": "^1.0.4"     // BTC conversion API
  }
}
```

### **Technology Decisions Needing Validation**

#### **Decision 1: Email Service Provider**
**Options**:
1. **SendGrid**
   - ✅ Generous free tier (100 emails/day)
   - ✅ Excellent deliverability
   - ✅ Good documentation
   - ⚠️ Cost scales: $15-20/mo for 50k emails
   
2. **Mailgun**
   - ✅ Good free tier (5,000 emails/month)
   - ✅ Developer-friendly API
   - ⚠️ Cost: $35/mo for 50k emails

3. **AWS SES**
   - ✅ Very cheap ($0.10 per 1,000 emails)
   - ⚠️ Requires verification setup
   - ⚠️ Deliverability requires warm-up

**Recommendation**: **SendGrid** for development/early stage, **AWS SES** when scaling (cost reduction)

#### **Decision 2: PostGIS vs Application Distance Calc**
**Validation**:
```sql
-- PostGIS performance test
EXPLAIN ANALYZE
SELECT name, ST_Distance(location, ST_MakePoint(-89.65, 39.78)::geography) / 1609.34 as miles
FROM safe_zones
WHERE ST_DWithin(location, ST_MakePoint(-89.65, 39.78)::geography, 8046.72)
ORDER BY miles ASC
LIMIT 5;

-- Expected: <10ms with spatial index
-- If >50ms, application-level might be better
```

**Recommendation**: **Benchmark with 1,000 Safe Zones**
- If < 10ms: PostGIS (recommended)
- If > 50ms: Application-level with in-memory filtering

#### **Decision 3: Real-Time Updates (WebSocket vs Polling)**
**Trade-offs**:
| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| WebSocket | Real-time, efficient | Complex, scaling challenges | Phase 3+ |
| Polling (30s) | Simple, reliable | Slight delay, more requests | **Phase 2** |
| Server-Sent Events | Good middle ground | One-way only | Consider for Phase 3 |

**DECISION**: **Start with polling** (30-second intervals during active trades)
- Simpler to implement
- Adequate for trade coordination (not chat)
- Upgrade to WebSocket in Phase 3 if user feedback demands it

---

## 📊 **Requirements Validation Matrix**

### **Must-Have Features (P0) - Cannot Launch Without**

| Requirement | Context | Complexity | Risk | Validation Method |
|-------------|---------|-----------|------|-------------------|
| User registration | User | Medium | Low | Standard practice |
| Display name system | User | Medium | Medium | Novel, needs testing |
| Authentication/JWT | User | Medium | Low | Standard practice |
| Profile photo upload | User | Low | Low | Phase 1 tested |
| Generic avatar system | User | Low | Low | Simple implementation |
| Item CRUD | Item | Low | Low | Standard practice |
| Multi-photo upload | Item | Medium | Low | Phase 1 tested |
| Search integration | Item | Medium | Low | Phase 1 90% tested |
| Category system | Item | Low | Low | Standard practice |
| Balance queries | Credits | Medium | Medium | Phase 1 foundation |
| Double-entry transactions | Credits | High | **Critical** | Phase 1 tested |
| Escrow management | Credits | High | **Critical** | Needs extensive testing |
| BTC conversion | Credits | High | High | External dependency |
| Offer/accept system | Trading | Medium | Medium | Novel, needs testing |
| Safe Zone recommendation | Trading | High | Medium | Novel, needs validation |
| Location coordination | Trading | High | Medium | Novel, complex workflow |
| Time coordination | Trading | Medium | Low | Standard scheduling |
| Arrival tracking | Trading | Medium | Low | Simple state tracking |
| Escrow-gated identity | Trading | High | High | **Novel, critical validation** |
| Handoff confirmation | Trading | Medium | Low | Standard practice |

**Critical Path**: Credits escrow + Trading escrow-gated identity (highest risk/complexity)

### **Should-Have Features (P1) - Important but Not Launch-Blocking**

| Feature | Context | Value | Defer If Needed |
|---------|---------|-------|-----------------|
| Password reset | User | High | No - needed for launch |
| ID verification | User | High | No - builds trust |
| Vehicle info | User | Medium | Yes - can add post-launch |
| Price range acceptance | Item | Medium | Yes - nice-to-have |
| Saved searches | Item | Low | Yes - convenience feature |
| CPSC safety checks | Item | High | Maybe - safety important |
| Transaction export | Credits | Medium | Yes - tax season feature |
| Partial refunds | Credits | Medium | Yes - dispute resolution |
| Feedback system | Trading | High | No - builds reputation |
| Trade cancellation | Trading | High | No - needed for flexibility |

### **Nice-to-Have Features (P2) - Post-Launch Enhancements**

| Feature | Context | Phase |
|---------|---------|-------|
| Social login (Google/Apple) | User | Phase 2.1 |
| Biometric login | User | Phase 2.1 |
| Privacy settings | User | Phase 2.1 |
| Video uploads (items) | Item | Phase 2.1 |
| Favorite items | Item | Phase 2.1 |
| View counters | Item | Phase 2.1 |
| Gift credits | Credits | Phase 2.2 |
| BTC price alerts | Credits | Phase 2.2 |
| Trade templates | Trading | Phase 2.1 |
| Safe Zone partnerships | Trading | Phase 3 |

---

## 🎯 **Recommended Implementation Approach**

### **Phase 2 Development Strategy**

#### **Approach 1: Waterfall (Traditional)**
```
Week 1-2:   User Context (complete)
Week 3-4:   Item Context (complete)
Week 5-6:   Credits Context (complete)
Week 7-10:  Trading Context (complete)
Week 11-12: Integration testing
```

**Pros**: Clear milestones, predictable  
**Cons**: No working product until week 12  
**Risk**: High - discover integration issues late

---

#### **Approach 2: Vertical Slicing** ✅ RECOMMENDED
```
Week 1-2:   SLICE 1 - "Minimal Trading Flow"
            ├── Basic user registration
            ├── Basic item listing
            ├── Simple fixed-price offers
            ├── Manual escrow (admin)
            └── Result: Can complete 1 trade (manual process)

Week 3-4:   SLICE 2 - "Automated Trading"
            ├── Full authentication
            ├── Search integration
            ├── Automated escrow
            ├── Basic completion
            └── Result: Can complete trades automatically

Week 5-6:   SLICE 3 - "Safe Coordination"
            ├── Safe Zone recommendations
            ├── Location confirmation
            ├── Time coordination
            └── Result: Safe meetups coordinated

Week 7-8:   SLICE 4 - "Privacy & Identity"
            ├── Display name system
            ├── Generic avatars
            ├── Escrow-gated photo reveal
            ├── Vehicle info system
            └── Result: Maximum privacy implemented

Week 9-10:  SLICE 5 - "Polish & Safety"
            ├── Arrival tracking
            ├── Enhanced feedback
            ├── Dispute system
            └── Result: Production-ready

Week 11-12: SLICE 6 - "Testing & Hardening"
            ├── Integration testing
            ├── Load testing
            ├── Security testing
            └── Result: Validated and ready
```

**Pros**: Working product every 2 weeks, early issue detection, adaptable  
**Cons**: Requires careful slice design  
**Risk**: Medium - manageable with good planning  

**RECOMMENDATION**: **Vertical Slicing** - De-risks early, provides working demos

---

#### **Approach 3: Risk-First** 
```
Week 1-3:   Highest Risk First (Escrow + Identity)
Week 4-6:   Medium Risk (Safe Zones)
Week 7-9:   Lower Risk (User/Item basics)
Week 10-12: Integration
```

**Pros**: Validates hardest parts early  
**Cons**: No working product for weeks  
**Risk**: High - if escrow fails, no fallback  

**RECOMMENDATION**: **Avoid** - too risky for novel features

---

### **SELECTED APPROACH: Vertical Slicing with Risk Validation**

**Hybrid Strategy**:
```
SLICE 1 (Weeks 1-2): "Proof of Concept"
├── Validate: Can complete a trade at all?
├── Includes: Minimal user, item, escrow, manual coordination
└── Goal: End-to-end flow, even if manual

SLICE 2 (Weeks 3-4): "Privacy Validation"  
├── Validate: Does anonymous system work?
├── Includes: Display names, generic avatars, reputation system
└── Goal: Confirm users trust system without photos

SLICE 3 (Weeks 5-6): "Safety Validation"
├── Validate: Do Safe Zones work? Do users use them?
├── Includes: Safe Zone recommendations, location coordination
└── Goal: Confirm users prefer Safe Zones

SLICE 4 (Weeks 7-8): "Identity Timing Validation"
├── Validate: Is escrow-gated photo reveal accepted?
├── Includes: Escrow creation → photo reveal → meetup
└── Goal: Confirm reveal timing is right

SLICE 5 (Weeks 9-10): "Automation & Scale"
├── Validate: Can system handle volume?
├── Includes: Arrival tracking, notifications, full automation
└── Goal: Reduce manual intervention to 0

SLICE 6 (Weeks 11-12): "Production Hardening"
├── Validate: Is it production-ready?
├── Includes: Testing, security, performance, documentation
└── Goal: 85%+ confidence for launch
```

**Why This Works**:
- ✅ Each slice validates a core assumption
- ✅ Working product every 2 weeks
- ✅ Can pivot if validation fails
- ✅ De-risks novel features early
- ✅ User feedback incorporated continuously

---

## 🧪 **Testing & Validation Strategy**

### **Test Coverage Requirements by Context**

| Context | Overall Coverage | Critical Path Coverage | Rationale |
|---------|-----------------|----------------------|-----------|
| User | 70%+ | 85%+ (auth, passwords) | Security critical |
| Item | 70%+ | 80%+ (search integration) | Core functionality |
| Credits | **85%+** | **95%+ (escrow, transactions)** | **FINANCIAL CRITICAL** |
| Trading | 75%+ | 90%+ (escrow-gated identity, state machine) | Integration critical |

### **Testing Phases**

#### **Phase 1: Unit Testing** (Continuous)
- Test each service in isolation
- Mock all dependencies
- 70-85% coverage enforced
- Written alongside code (TDD encouraged)

#### **Phase 2: Integration Testing** (After each slice)
- Test contexts working together
- Real database (test environment)
- Validate workflows end-to-end
- Performance validation

#### **Phase 3: Beta Testing** (Weeks 10-11)
- 50-100 real users
- Real trades (test credits)
- Collect feedback
- Monitor for issues

#### **Phase 4: Security Testing** (Week 11)
- Penetration testing
- Privacy audit (photo access control)
- Authentication security
- Financial transaction security

#### **Phase 5: Load Testing** (Week 12)
- 1,000 concurrent users
- 100 trades/minute
- Database performance
- Cache effectiveness

### **Validation Checkpoints**

**After Slice 1** (Week 2):
- ❓ Can complete a trade?
- ❓ Does basic escrow work?
- ❓ Are users comfortable with manual coordination?
- **Decision**: Proceed or redesign

**After Slice 2** (Week 4):
- ❓ Do users trust anonymous display names?
- ❓ Are generic avatars acceptable?
- ❓ Do reputation scores build trust?
- **Decision**: Proceed or add trust signals

**After Slice 3** (Week 6):
- ❓ Do users choose Safe Zones over custom?
- ❓ Are Safe Zones sufficient in coverage?
- ❓ Is location coordination smooth?
- **Decision**: Proceed or enhance Safe Zone database

**After Slice 4** (Week 8):
- ❓ Is escrow-gated identity accepted?
- ❓ What's the cancellation rate after reveal?
- ❓ Do users feel informed enough for meetup?
- **Decision**: Proceed or adjust reveal timing

**Each checkpoint is a GO/NO-GO decision point.**

---

## 📋 **Best Practices & Recommendations**

### **Development Best Practices**

#### **1. Test-Driven Development (TDD)**
**Recommendation**: Write tests FIRST for critical features

```typescript
// Example: Test first, then implement
describe('EscrowService', () => {
  it('should lock credits in ESCROW account', async () => {
    // Arrange
    const buyerId = 'user-1';
    const sellerId = 'user-2';
    const amount = 100;
    
    // Act
    const escrowId = await escrowService.create(buyerId, sellerId, amount);
    
    // Assert
    const buyerBalance = await balanceService.getBalance(buyerId);
    const escrowBalance = await balanceService.getEscrowBalance(escrowId);
    expect(buyerBalance).toBe(900); // Started with 1000
    expect(escrowBalance).toBe(100);
    
    // Assert double-entry
    const entries = await ledgerService.getEntriesForTransaction(escrowId);
    expect(entries).toHaveLength(2);
    expect(entries.find(e => e.type === 'DEBIT')).toBeDefined();
    expect(entries.find(e => e.type === 'CREDIT')).toBeDefined();
  });
});

// NOW implement the function to make test pass
```

**Why**: 
- Catches bugs before they exist
- Forces you to think about edge cases
- Tests serve as documentation
- Prevents regression

**Apply to**: ALL financial code (escrow, transactions), ALL security code (auth, access control)

---

#### **2. Progressive Enhancement**
**Recommendation**: Start simple, add complexity iteratively

**Example: Offer System**
```
Version 1 (Week 1): Fixed price only
├── Seller sets price
├── Buyer accepts or declines
└── No negotiation

Version 2 (Week 2): Single counter-offer
├── Buyer can make one counter
├── Seller accepts or declines
└── Max 1 round

Version 3 (Week 3): Price range
├── Seller sets acceptable range
├── Auto-accept if in range
└── Still max 1 round if outside

Each version is FUNCTIONAL and can go live
Add complexity only when previous version validated
```

**Why**:
- Each version is shippable
- Validates assumptions before adding complexity
- Easier to test simple versions
- Can launch sooner with MVP

**Apply to**: Offer system, Safe Zone recommendations, time coordination

---

#### **3. Feature Flags**
**Recommendation**: Use feature flags for novel features

```typescript
// Feature flag configuration
const FEATURE_FLAGS = {
  ANONYMOUS_PROFILES: true,           // Can toggle off if issues
  ESCROW_GATED_PHOTOS: true,          // Can revert if cancellations high
  SAFE_ZONE_REQUIRED: false,          // Can enforce or allow custom
  PRICE_RANGE_ACCEPTANCE: false,      // Enable when ready
  ARRIVAL_GEOFENCE_CHECK: false,      // Optional location verification
  AUTO_DECLINE_EXPIRED_OFFERS: true,
};

// In code
if (FEATURE_FLAGS.ESCROW_GATED_PHOTOS) {
  // Only show photos after escrow
} else {
  // Fallback: Show photos earlier
}
```

**Why**:
- Test in production with subset of users
- Quick rollback if issues
- A/B testing capability
- Gradual rollout

**Apply to**: All novel features (anonymous profiles, escrow-gated identity, Safe Zones)

---

#### **4. Fail-Safe Defaults**
**Recommendation**: Always fail safely for privacy/security

```typescript
// Privacy: Default to MORE private
function getProfilePhoto(userId: string, tradeId?: string): string {
  try {
    if (tradeId && isEscrowCreated(tradeId)) {
      return realPhoto; // Only if conditions met
    }
  } catch (error) {
    logger.error('Photo access check failed', error);
  }
  
  // FAIL SAFE: Return generic avatar
  return getGenericAvatar(userId);
}

// Security: Default to DENY
function canAccessEndpoint(user: User, action: string): boolean {
  try {
    return checkPermission(user, action);
  } catch (error) {
    logger.error('Permission check failed', error);
    return false; // FAIL SAFE: Deny access
  }
}

// Financial: Default to NO TRANSACTION
function createTransaction(/* ... */): Result {
  try {
    // Complex validation
  } catch (error) {
    // FAIL SAFE: Do not create transaction
    return { success: false, error: 'Validation failed' };
  }
}
```

**Apply to**: All privacy checks, all security checks, all financial operations

---

#### **5. Comprehensive Validation**
**Recommendation**: Validate ALL user inputs

```typescript
// Use Joi for validation
import Joi from 'joi';

const itemListingSchema = Joi.object({
  title: Joi.string().min(10).max(100).required(),
  description: Joi.string().min(50).max(2000).required(),
  priceInCredits: Joi.number().integer().min(1).max(100000).required(),
  categoryId: Joi.string().uuid().required(),
  condition: Joi.string().valid('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR').required(),
  photos: Joi.array().items(Joi.string().uri()).min(1).max(12).required(),
  // ... more fields
});

// Validate before processing
const { error, value } = itemListingSchema.validate(requestBody);
if (error) {
  throw new ValidationError(error.details);
}
```

**Why**:
- Prevents injection attacks
- Ensures data integrity
- Better error messages
- Type safety beyond TypeScript

**Apply to**: ALL API endpoints, ALL user inputs

---

#### **6. Idempotency Everywhere**
**Recommendation**: All state-changing operations must be idempotent

```typescript
// Example: Idempotent transaction creation
async createTransaction(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  idempotencyKey: string // Client-generated UUID
): Promise<Transaction> {
  
  // Check if already processed
  const existing = await this.findByIdempotencyKey(idempotencyKey);
  if (existing) {
    return existing; // Return existing, don't create duplicate
  }
  
  // Create new transaction
  const transaction = await this.createNewTransaction(/* ... */);
  
  return transaction;
}
```

**Why**:
- Network retries don't cause duplicates
- Mobile apps can retry safely
- Prevents double-charges
- Financial integrity

**Apply to**: All financial operations, all state changes, all notifications

---

#### **7. Audit Everything**
**Recommendation**: Comprehensive audit trail for debugging and compliance

```typescript
// Audit all important actions
await auditService.log('USER_REGISTERED', {
  userId,
  email: hashEmail(email), // Hash PII in logs
  displayName,
  timestamp: new Date(),
});

await auditService.log('PHOTO_ACCESSED', {
  viewerId,
  targetUserId,
  tradeId,
  escrowState: true,
  timestamp: new Date(),
});

await auditService.log('ESCROW_CREATED', {
  tradeId,
  buyerId,
  sellerId,
  amount,
  timestamp: new Date(),
});
```

**Why**:
- Debug issues in production
- Compliance (GDPR audit trail)
- Security investigations
- Business analytics

**Apply to**: User actions, financial operations, privacy-sensitive actions

---

## 📊 **Architecture Decision Records (ADRs)**

### **ADR-001: Display Names Over Real Names**
**Date**: October 9, 2025  
**Status**: ✅ Accepted  
**Context**: Need to identify users without exposing real identities  
**Decision**: Auto-generated display names (Adjective + Noun + Number)  
**Consequences**: 
- ✅ Maximum privacy
- ⚠️ Users can't choose names (less personal)
- ✅ Prevents inappropriate names
- ✅ Consistent, memorable format

**Alternatives Considered**:
- User-chosen usernames (rejected: moderation burden, inappropriate names)
- Real names (rejected: privacy violation)
- Anonymous numbers (rejected: not memorable)

---

### **ADR-002: No Messaging System**
**Date**: October 9, 2025  
**Status**: ✅ Accepted  
**Context**: Need coordination without direct communication  
**Decision**: System-guided workflow replaces all messaging  
**Consequences**:
- ✅ Maximum privacy
- ✅ Scam prevention
- ⚠️ Less flexible than chat
- ✅ Simpler moderation
- ✅ Unique market position

**Validation Required**: Beta testing must show <15% request messaging

---

### **ADR-003: Escrow-Gated Photo Revelation**
**Date**: October 9, 2025  
**Status**: ✅ Accepted  
**Context**: When to reveal personal identification (photos)  
**Decision**: Photos revealed ONLY after escrow created (credits locked)  
**Consequences**:
- ✅ Maximum privacy until commitment
- ✅ Prevents window shopping for faces
- ⚠️ Users can't see who they're trading with during offer
- ✅ Eliminates appearance-based discrimination
- ⚠️ Small risk of post-reveal cancellation

**Validation Required**: Beta must show <2% cancellation after reveal

---

### **ADR-004: Google Maps Over Alternatives**
**Date**: October 9, 2025  
**Status**: ✅ Accepted  
**Context**: Need geocoding and distance calculations  
**Decision**: Google Maps Platform with aggressive caching  
**Consequences**:
- ⚠️ Monthly cost (~$30-50, optimized to $5-10)
- ✅ Best accuracy and reliability
- ✅ Comprehensive features
- ✅ Industry standard

**Validation Required**: Monitor costs, ensure <$15/month with caching

---

### **ADR-005: PostGIS for Geospatial Queries**
**Date**: October 9, 2025  
**Status**: ✅ Accepted  
**Context**: Need fast proximity searches for Safe Zones  
**Decision**: PostGIS extension in PostgreSQL  
**Consequences**:
- ✅ Sub-10ms query performance
- ✅ Native to existing database
- ✅ Powerful spatial functions
- ⚠️ Learning curve for team

**Validation Required**: Benchmark with 1,000 Safe Zones, must be <10ms

---

### **ADR-006: Vertical Slicing Development**
**Date**: October 9, 2025  
**Status**: ✅ Accepted  
**Context**: How to structure Phase 2 development  
**Decision**: Vertical slices with validation checkpoints  
**Consequences**:
- ✅ Working product every 2 weeks
- ✅ Early risk validation
- ⚠️ Requires careful planning
- ✅ Can pivot based on feedback

**Validation Required**: Slice 1 must deliver working trade by week 2

---

## 📋 **Open Questions & Decisions Needed**

### **Questions Requiring Decisions**

**Q1: Email Service Provider**
- Options: SendGrid, Mailgun, AWS SES
- Recommendation: SendGrid (easy) → AWS SES (cheap at scale)
- **Decision needed before**: User registration implementation
- **Impact**: Low (easy to switch later)

**Q2: Price Range vs Counter-Offer**
- Options: (A) Counter-offer only, (B) Price range only, (C) Both
- Recommendation: Both (seller chooses)
- **Decision needed before**: Item listing implementation
- **Impact**: Medium (affects offer UX)

**Q3: CPSC Safety Integration**
- Options: Include in Phase 2, defer to Phase 3
- Recommendation: Include (safety is brand pillar)
- **Decision needed before**: Item creation workflow
- **Impact**: Medium (adds 1 week, but important)

**Q4: Arrival Geo-Fence Verification**
- Options: (A) Required, (B) Optional, (C) None
- Recommendation: Optional (verify if location services enabled)
- **Decision needed before**: Arrival tracking implementation
- **Impact**: Low (nice-to-have)

**Q5: Real-Time vs Polling**
- Options: WebSocket, Polling, Server-Sent Events
- Recommendation: Start with polling (30s), upgrade later if needed
- **Decision needed before**: Trade status updates
- **Impact**: Low (can upgrade later)

**Q6: Safe Zone Partnerships**
- Options: Launch with partnerships, add later
- Recommendation: Research during Phase 2, implement Phase 3
- **Decision needed before**: Marketing materials
- **Impact**: Low (enhancement, not requirement)

---

## 🎯 **Success Criteria for Phase 2**

### **Functional Success**
- [ ] User can register with display name
- [ ] User can list item with 1-12 photos
- [ ] Item appears in search immediately
- [ ] User can make offer on item
- [ ] System coordinates Safe Zone selection
- [ ] System coordinates meetup time
- [ ] Escrow creates and locks credits
- [ ] Photos revealed only after escrow
- [ ] Arrival tracking works
- [ ] Handoff confirmation releases escrow
- [ ] Feedback system updates reputation
- [ ] Complete trade without any direct communication

### **Quality Success**
- [ ] 70%+ coverage on User Context
- [ ] 70%+ coverage on Item Context
- [ ] 85%+ coverage on Credits Context (financial)
- [ ] 75%+ coverage on Trading Context
- [ ] All tests passing (95%+ pass rate)
- [ ] TypeScript strict mode throughout
- [ ] No critical security vulnerabilities
- [ ] Performance targets met

### **Business Success**
- [ ] Beta users complete trades successfully
- [ ] <15% request messaging feature
- [ ] <5% cancellation after identity revelation
- [ ] 80%+ use Safe Zones (vs custom locations)
- [ ] User satisfaction: 4.0+ stars
- [ ] <1% dispute rate
- [ ] 85%+ completion rate

### **Go-Live Criteria**
- [ ] All P0 features complete and tested
- [ ] Security audit passed
- [ ] Privacy audit passed (photo access control)
- [ ] Financial integrity validated (ledger reconciliation)
- [ ] Beta testing successful (50+ users, 100+ trades)
- [ ] Documentation complete
- [ ] Monitoring and alerts configured
- [ ] Rollback plan tested
- [ ] Legal disclaimers approved
- [ ] Insurance coverage confirmed

---

## 📝 **Next Steps**

### **Before Implementation Begins**

1. **Review & Approve This Document**
   - Validate requirements completeness
   - Approve technology choices
   - Confirm risk mitigations
   - Sign off on approach

2. **Create Detailed Design Documents**
   - API specification for each context
   - Database migration scripts
   - Service interfaces (TypeScript)
   - State machine diagrams

3. **Set Up Development Environment**
   - Install new dependencies
   - Configure Google Maps API
   - Configure email service
   - Set up feature flags

4. **Create Phase 2 Project Plan**
   - Break into 2-week slices
   - Assign validation checkpoints
   - Define success metrics
   - Schedule reviews

### **Phase 2 Kickoff Checklist**
- [ ] This requirements document approved
- [ ] Technology choices validated
- [ ] Risks acknowledged and mitigated
- [ ] Testing strategy agreed upon
- [ ] Timeline realistic and approved
- [ ] Team ready to begin
- [ ] Phase 1 foundation solid (✅ 66% tested, production-ready)

---

## ✅ **Requirements Sign-Off**

**This document establishes the requirements, architecture, and validation strategy for Phase 2.0 Business Logic Implementation.**

**Key Decisions Made**:
- ✅ Maximum privacy model (no photos until escrow)
- ✅ Zero-communication trading (no messaging)
- ✅ Safe Zone coordination system
- ✅ Escrow-gated identity revelation
- ✅ Vertical slicing with validation checkpoints
- ✅ Technology stack selections

**Ready for**: Detailed design and implementation planning

**Next Document**: `phase-2-0-detailed-design.md` (API specs, database schemas, service interfaces)

---

*Requirements Document Version: 1.0*  
*Status: APPROVED FOR DESIGN PHASE*  
*Date: October 9, 2025*  
*Approval: Pending stakeholder review*

