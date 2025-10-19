# LocalEx OpenSearch Documentation

## Overview

This documentation covers the OpenSearch integration for the LocalEx platform, providing comprehensive search capabilities including full-text search, advanced filtering, geo-location search, and real-time indexing.

## Table of Contents

- [Quick Start Guide](#quick-start-guide)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Search API Reference](#search-api-reference)
- [Index Management](#index-management)
- [Performance Tuning](#performance-tuning)
- [Monitoring & Analytics](#monitoring--analytics)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

## Quick Start Guide

### Prerequisites

- Node.js 18+ and npm 8+
- Docker and Docker Compose (for containerized setup)
- Java 17+ (for native installation)

### Quick Setup

1. **Start OpenSearch with Docker:**
   ```bash
   npm run search:start
   ```

2. **Set up search indices:**
   ```bash
   npm run search:setup
   ```

3. **Run tests to verify setup:**
   ```bash
   npm run search:test
   ```

4. **Access OpenSearch Dashboards:**
   - URL: http://localhost:5601
   - Explore indices and run queries

### Basic Usage

```typescript
import { searchService } from './src/services/search.service';

// Basic search
const results = await searchService.search({
  query: 'electronics',
  pagination: { page: 1, size: 20 }
});

// Advanced search with filters
const filteredResults = await searchService.search({
  query: 'laptop',
  filters: {
    priceMin: 100,
    priceMax: 1000,
    category: ['Electronics', 'Computers'],
    condition: ['new', 'used']
  },
  sort: [{ field: 'price', order: 'asc' }]
});
```

## Installation & Setup

### Option 1: Docker Setup (Recommended for Development)

**Prerequisites:**
- Docker and Docker Compose installed

**Steps:**
1. Clone the repository and navigate to the project directory
2. Start OpenSearch services:
   ```bash
   docker-compose -f docker-compose.opensearch.yml up -d
   ```
3. Wait for services to be healthy (check with `docker ps`)
4. Set up indices:
   ```bash
   npm run search:setup
   ```

**Verification:**
- OpenSearch API: http://localhost:9200
- OpenSearch Dashboards: http://localhost:5601

### Option 2: Native Installation (Windows)

**Prerequisites:**
- Java 17+ installed
- PowerShell execution policy set to allow scripts

**Steps:**
1. Run the installation script:
   ```powershell
   npm run search:install
   ```
2. Start OpenSearch:
   ```bash
   C:\OpenSearch\bin\opensearch.bat
   ```
3. Set up indices:
   ```bash
   npm run search:setup
   ```

### Option 3: Manual Installation

**Prerequisites:**
- Java 17+
- 2GB+ available RAM
- 10GB+ available disk space

**Steps:**
1. Download OpenSearch 2.11.0 from [opensearch.org](https://opensearch.org/downloads.html)
2. Extract to your desired location
3. Configure `config/opensearch.yml`:
   ```yaml
   cluster.name: localex-search
   node.name: localex-node-1
   network.host: 0.0.0.0
   http.port: 9200
   discovery.type: single-node
   plugins.security.disabled: true
   ```
4. Start OpenSearch:
   ```bash
   ./bin/opensearch
   ```

## Configuration

### Environment Variables

Update your `.env` file with OpenSearch configuration:

```env
# OpenSearch Configuration
OPENSEARCH_HOST=localhost
OPENSEARCH_PORT=9200
OPENSEARCH_PROTOCOL=http
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=LocalExOpenSearch2024!
OPENSEARCH_SSL=false

# Search Configuration
SEARCH_INDEX_PREFIX=localex
SEARCH_INDEX_SHARDS=1
SEARCH_INDEX_REPLICAS=0
SEARCH_REFRESH_INTERVAL=1s
SEARCH_QUERY_TIMEOUT=5000
SEARCH_MAX_RESULTS=1000
SEARCH_DEFAULT_PAGE_SIZE=20
```

### Index Configuration

The LocalEx platform uses multiple specialized indices:

- **`localex_items`**: Item listings with full-text search
- **`localex_users`**: User profiles for user search
- **`localex_categories`**: Category hierarchy
- **`localex_search_logs`**: Search analytics and monitoring

### Field Mappings

Key field mappings for optimal search performance:

```json
{
  "title": {
    "type": "text",
    "analyzer": "custom_text_analyzer",
    "fields": {
      "keyword": { "type": "keyword" },
      "suggest": { "type": "completion" }
    }
  },
  "location": {
    "type": "geo_point",
    "fields": {
      "city": { "type": "keyword" },
      "state": { "type": "keyword" }
    }
  },
  "price": { "type": "double" },
  "category": { "type": "keyword" },
  "tags": { "type": "keyword" }
}
```

## Search API Reference

### SearchService Methods

#### `search(query: SearchQuery): Promise<SearchResults>`

Performs a search with optional filters, sorting, and pagination.

**Parameters:**
- `query` (string): Search query text
- `filters` (SearchFilters, optional): Filter criteria
- `sort` (SearchSort[], optional): Sort specifications
- `pagination` (PaginationOptions, optional): Page and size settings
- `highlights` (boolean, optional): Enable search highlighting

**Example:**
```typescript
const results = await searchService.search({
  query: 'vintage camera',
  filters: {
    priceMin: 50,
    priceMax: 500,
    category: ['Electronics'],
    condition: ['used'],
    location: {
      lat: 40.7128,
      lon: -74.0060,
      distance: '10km'
    }
  },
  sort: [{ field: 'createdAt', order: 'desc' }],
  pagination: { page: 1, size: 20 },
  highlights: true
});
```

#### `getSuggestions(partial: string, limit?: number): Promise<SearchSuggestion[]>`

Gets search suggestions for autocomplete functionality.

**Example:**
```typescript
const suggestions = await searchService.getSuggestions('elect', 10);
// Returns: [{ text: 'electronics', score: 1.0 }, ...]
```

#### `indexItem(item: ItemDocument): Promise<void>`

Indexes a single item for search.

**Example:**
```typescript
await searchService.indexItem({
  id: 'item-123',
  title: 'Vintage Camera',
  description: 'Great condition vintage camera',
  category: 'Electronics',
  price: 150,
  condition: 'used',
  location: { lat: 40.7128, lon: -74.0060, address: '123 Main St', city: 'New York', state: 'NY', zipCode: '10001' },
  images: ['image1.jpg'],
  tags: ['camera', 'vintage', 'photography'],
  userId: 'user-456',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  status: 'active',
  views: 10,
  favorites: 2
});
```

#### `bulkIndexItems(items: ItemDocument[]): Promise<void>`

Efficiently indexes multiple items.

**Example:**
```typescript
await searchService.bulkIndexItems([
  item1, item2, item3 // Array of ItemDocument objects
]);
```

### SearchFilters Interface

```typescript
interface SearchFilters {
  category?: string[];           // Filter by categories
  priceMin?: number;            // Minimum price
  priceMax?: number;            // Maximum price
  condition?: string[];         // Item condition (new, used, etc.)
  location?: GeoLocationFilter; // Geographic location filter
  userId?: string;              // Filter by specific user
  tags?: string[];              // Filter by tags
  dateRange?: DateRangeFilter;  // Filter by date range
}
```

### SearchSort Interface

```typescript
interface SearchSort {
  field: string;              // Field to sort by
  order: 'asc' | 'desc';     // Sort order
}
```

## Index Management

### Creating Indices

```bash
# Create all indices
npm run search:setup

# Or programmatically
import { indexService } from './src/services/index.service';
await indexService.createAllIndices();
```

### Index Statistics

```typescript
const stats = await indexService.getIndexStats();
console.log('Index statistics:', stats);
```

### Refreshing Indices

```typescript
// Make indexed changes immediately searchable
await indexService.refreshIndices();
```

### Optimizing Indices

```typescript
// Optimize indices for better performance
await indexService.optimizeIndices();
```

## Performance Tuning

### Search Performance Optimization

1. **Index Settings:**
   ```json
   {
     "settings": {
       "number_of_shards": 1,
       "number_of_replicas": 0,
       "refresh_interval": "1s"
     }
   }
   ```

2. **Query Optimization:**
   - Use filters instead of queries when possible
   - Limit result size with pagination
   - Use specific field searches for better performance

3. **Caching:**
   - Search results are automatically cached in Redis
   - Cache TTL: 5 minutes (configurable)
   - Cache invalidation on item updates

### Index Performance

1. **Bulk Operations:**
   ```typescript
   // Use bulk indexing for large datasets
   await searchService.bulkIndexItems(items);
   ```

2. **Refresh Strategy:**
   - Development: 1 second refresh interval
   - Production: 30 seconds or manual refresh

3. **Memory Settings:**
   - Minimum: 1GB heap size
   - Recommended: 2GB+ heap size
   - Maximum: 50% of available RAM

## Monitoring & Analytics

### Health Checks

```typescript
// Check search service health
const health = await searchService.healthCheck();
console.log('Search health:', health.status);
```

### Search Analytics

```typescript
// Get search analytics for monitoring
const analytics = await searchService.getSearchAnalytics({
  from: '2024-01-01T00:00:00Z',
  to: '2024-01-31T23:59:59Z'
});
```

### Key Metrics to Monitor

- **Search Response Time**: Target < 200ms
- **Index Size**: Monitor growth
- **Cache Hit Rate**: Target > 80%
- **Error Rate**: Target < 1%
- **Query Throughput**: Monitor requests per second

### OpenSearch Dashboards

Access dashboards at http://localhost:5601 for:
- Index management
- Query performance analysis
- Cluster health monitoring
- Search analytics visualization

## Troubleshooting

### Common Issues

#### 1. Connection Refused
**Error:** `Connection refused to localhost:9200`

**Solutions:**
- Ensure OpenSearch is running: `docker ps` or check process
- Verify port 9200 is not blocked
- Check OpenSearch logs for errors

#### 2. Index Not Found
**Error:** `index_not_found_exception`

**Solutions:**
- Run `npm run search:setup` to create indices
- Check index names in configuration
- Verify index creation in OpenSearch Dashboards

#### 3. Memory Issues
**Error:** `OutOfMemoryError` or slow performance

**Solutions:**
- Increase heap size in JVM settings
- Optimize index settings
- Monitor memory usage in dashboards

#### 4. Search Timeout
**Error:** `SearchTimeoutException`

**Solutions:**
- Increase `SEARCH_QUERY_TIMEOUT` in environment
- Optimize query complexity
- Check cluster health

### Debugging

1. **Enable Debug Logging:**
   ```env
   LOG_LEVEL=debug
   ```

2. **Check OpenSearch Logs:**
   ```bash
   # Docker
   docker logs localex-opensearch
   
   # Native installation
   tail -f logs/localex-search.log
   ```

3. **Test Connection:**
   ```bash
   curl http://localhost:9200
   ```

4. **Check Cluster Health:**
   ```bash
   curl http://localhost:9200/_cluster/health
   ```

## Production Deployment

### Cluster Configuration

For production, configure a multi-node cluster:

```yaml
# opensearch.yml
cluster.name: localex-search-prod
node.name: localex-node-1
node.roles: [master, data, ingest]
network.host: 0.0.0.0
discovery.seed_hosts: ["node1:9300", "node2:9300", "node3:9300"]
cluster.initial_master_nodes: ["localex-node-1", "localex-node-2", "localex-node-3"]

# Security
plugins.security.disabled: false
plugins.security.ssl.http.enabled: true
plugins.security.ssl.transport.enabled: true
```

### Security Configuration

1. **Enable Security:**
   ```yaml
   plugins.security.disabled: false
   ```

2. **SSL/TLS Configuration:**
   ```yaml
   plugins.security.ssl.http.enabled: true
   plugins.security.ssl.transport.enabled: true
   ```

3. **User Management:**
   ```bash
   # Create admin user
   ./bin/opensearch-users useradd admin -p "secure_password"
   ./bin/opensearch-users rolesmapping put admin -u admin
   ```

### Performance Configuration

1. **JVM Settings:**
   ```bash
   # config/jvm.options
   -Xms4g
   -Xmx4g
   ```

2. **Index Settings:**
   ```json
   {
     "settings": {
       "number_of_shards": 3,
       "number_of_replicas": 1,
       "refresh_interval": "30s"
     }
   }
   ```

### Backup Strategy

1. **Snapshot Repository:**
   ```bash
   curl -X PUT "localhost:9200/_snapshot/backup_repo" -H 'Content-Type: application/json' -d'
   {
     "type": "fs",
     "settings": {
       "location": "/backup/opensearch"
     }
   }'
   ```

2. **Automated Backups:**
   ```bash
   # Create daily snapshots
   curl -X PUT "localhost:9200/_snapshot/backup_repo/snapshot_$(date +%Y%m%d)" -H 'Content-Type: application/json' -d'
   {
     "indices": "localex_*",
     "ignore_unavailable": true,
     "include_global_state": false
   }'
   ```

### Monitoring Setup

1. **Performance Monitoring:**
   - Set up OpenSearch monitoring with dashboards
   - Configure alerts for cluster health
   - Monitor search performance metrics

2. **Log Aggregation:**
   - Use ELK stack or similar for log aggregation
   - Set up log rotation and retention policies
   - Monitor error rates and performance

---

## Support

For additional support:
- Check the [OpenSearch Documentation](https://opensearch.org/docs/)
- Review LocalEx implementation in `src/services/search.service.ts`
- Run tests with `npm run search:test`
- Access OpenSearch Dashboards for debugging
