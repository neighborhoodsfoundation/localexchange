# LocalEx System Architecture Overview

## Executive Summary

LocalEx is a production-ready local trading platform built with a monolithic architecture that incorporates all critical fixes and operational requirements. The system is designed for scalability, reliability, and user safety.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 LocalEx Production                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │   Mobile    │ │   Web App   │ │   Admin Panel   │   │
│  │    App      │ │  (Next.js)  │ │   (React)       │   │
│  │ (RN/Expo)   │ │             │ │                 │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
│                       │                                 │
│  ┌─────────────────────▼─────────────────────────────┐  │
│  │              API Gateway                          │  │
│  │  (Rate Limiting, Auth, Abuse Prevention, WAF)    │  │
│  └─────────────────────┬─────────────────────────────┘  │
│                       │                                 │
│  ┌─────────────────────▼─────────────────────────────┐  │
│  │            LocalEx Monolith                       │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │  │
│  │  │  User   │ │  Item   │ │ Trading │ │ Credits │ │  │
│  │  │ Context │ │ Context │ │ Context │ │ Context │ │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │  │
│  │  │ Search  │ │ Policy  │ │  Admin  │ │ Worker  │ │  │
│  │  │ Context │ │ Context │ │ Context │ │ Context │ │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │  │
│  └─────────────────────┬─────────────────────────────┘  │
│                       │                                 │
│  ┌─────────────────────▼─────────────────────────────┐  │
│  │              Data Layer                           │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │  │
│  │  │PostgreSQL│ │ OpenSearch│ │  Redis │ │   S3   │ │  │
│  │  │ (Main)  │ │ (Search) │ │ (Cache) │ │(Images) │ │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Frontend Applications

#### Mobile App (React Native/Expo)
- **Purpose**: Primary user interface for trading activities
- **Features**: Item listing, search, trading, messaging, profile management
- **Platforms**: iOS and Android

#### Web App (Next.js)
- **Purpose**: Web-based interface for desktop users
- **Features**: Full platform functionality with responsive design
- **Target**: Desktop and tablet users

#### Admin Panel (React)
- **Purpose**: Administrative interface for platform management
- **Features**: User management, content moderation, analytics, system monitoring
- **Access**: Restricted to authorized administrators

### 2. API Gateway

- **Rate Limiting**: Prevents abuse and ensures fair usage
- **Authentication**: JWT-based authentication and authorization
- **Abuse Prevention**: Advanced fraud detection and prevention
- **WAF Integration**: Web Application Firewall for security

### 3. LocalEx Monolith

The monolithic application contains 8 specialized contexts:

#### User Context
- User registration and authentication
- Profile management and verification
- Preference settings and privacy controls

#### Item Context
- Item listing and categorization
- Image upload and management
- Item search and filtering

#### Trading Context
- Trade negotiation and execution
- Escrow management
- Trade completion and feedback

#### Credits Context
- Credit balance management
- Conversion system (Credits ↔ BTC)
- Transaction history and auditing

#### Search Context
- Advanced search algorithms
- Recommendation engine
- Location-based matching

#### Policy Context
- Content moderation and compliance
- Safety policies and enforcement
- Dispute resolution

#### Admin Context
- System administration
- User support tools
- Analytics and reporting

#### Worker Context
- Background job processing
- Notification delivery
- Data synchronization

### 4. Data Layer

#### PostgreSQL (Primary Database)
- User data and profiles
- Item listings and categories
- Trading transactions and history
- Financial ledger (double-entry accounting)

#### OpenSearch (Search Engine)
- Full-text search capabilities
- Advanced filtering and sorting
- Real-time search indexing

#### Redis (Caching & Sessions)
- Session management
- Application caching
- Queue management
- Rate limiting counters

#### S3 (File Storage)
- User profile images
- Item photos
- Document storage
- Backup archives

## Critical Architecture Features

### 1. Double-Entry Credits Ledger
- **Purpose**: Ensures financial accuracy and prevents negative balances
- **Implementation**: BEFORE INSERT triggers for fast failure
- **Compliance**: Full audit trail for all financial transactions

### 2. Queue System with Idempotency
- **Purpose**: Prevents duplicate processing and race conditions
- **Implementation**: Redis SET NX guards
- **Reliability**: Atomic operations with exponential backoff

### 3. CPSC API Integration
- **Purpose**: Product safety verification and recall checking
- **Implementation**: Multi-layer fallbacks with caching
- **Resilience**: Graceful degradation to manual review

### 4. Privacy Operations
- **Purpose**: GDPR compliance and data subject rights
- **Implementation**: Explicit retention windows and DSR SLAs
- **Compliance**: Automated data deletion and export

## Security Architecture

### Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication
- **OAuth 2.0**: Third-party authentication support
- **Role-Based Access**: Granular permission system

### Data Protection
- **Encryption**: TLS in transit, AES-256 at rest
- **PII Handling**: Secure storage and processing
- **Audit Logging**: Comprehensive activity tracking

### Content Safety
- **AI Moderation**: Multi-vendor content screening
- **Human Review**: Escalation for complex cases
- **Report System**: User-driven content reporting

## Performance & Monitoring

### Service Level Objectives (SLOs)
- **Search API**: 200ms p95 latency, 99.9% availability
- **Trading API**: 300ms p95 latency, 99.9% availability
- **Credit Conversion**: 1s p95 latency, 99.9% availability

### Monitoring Stack
- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Alerting**: PagerDuty integration with auto-paging

### Performance Budgets
- **Mobile**: <2.5s LCP, <100ms FID, <0.1 CLS
- **Web**: <2.0s LCP, <100ms FID, <0.1 CLS

## Scalability Considerations

### Horizontal Scaling
- **Stateless Design**: All contexts are stateless
- **Database Sharding**: User-based sharding strategy
- **CDN Integration**: Global content delivery

### Vertical Scaling
- **Resource Optimization**: Efficient memory and CPU usage
- **Connection Pooling**: Database connection management
- **Caching Strategy**: Multi-level caching implementation

## Development & Deployment

### Technology Stack
- **Backend**: Node.js, TypeScript, Express.js
- **Frontend**: React, Next.js, React Native
- **Database**: PostgreSQL, Redis, OpenSearch
- **Infrastructure**: Docker, Kubernetes, AWS

### CI/CD Pipeline
- **Testing**: Automated unit, integration, and E2E tests
- **Deployment**: Blue-green deployment strategy
- **Monitoring**: Continuous health checks and rollback

## Compliance & Standards

### App Store Compliance
- **Apple App Store**: Virtual currency policy compliance
- **Google Play Store**: Developer policy adherence
- **Content Guidelines**: Age-appropriate content standards

### Accessibility
- **WCAG 2.1 AA**: Full compliance with accessibility standards
- **Keyboard Navigation**: Complete keyboard accessibility
- **Screen Reader**: Full screen reader support

---

*This architecture document is part of the LocalEx v5 production-ready system.*  
*Last Updated: [Current Date]*  
*Version: 5.0*
