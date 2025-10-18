# OpenSearch Setup Guide for Engineers

## Quick Setup for Development

### Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ npm 8+ installed (`npm --version`)
- ✅ Docker and Docker Compose installed (`docker --version`)
- ✅ Git repository cloned and dependencies installed (`npm install`)

### 1. Environment Configuration

Copy the environment template and configure OpenSearch settings:

```bash
cp env.example .env
```

Edit `.env` and verify OpenSearch configuration:
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

### 2. Start OpenSearch Services

**Option A: Docker (Recommended)**
```bash
npm run search:start
```

**Option B: Manual Docker**
```bash
docker-compose -f docker-compose.opensearch.yml up -d
```

**Option C: Native Installation**
```bash
npm run search:install
# Then start manually: C:\OpenSearch\bin\opensearch.bat
```

### 3. Verify Services Are Running

Check that OpenSearch is accessible:
```bash
curl http://localhost:9200
```

Expected response:
```json
{
  "name": "localex-node-1",
  "cluster_name": "localex-search",
  "cluster_uuid": "...",
  "version": {
    "distribution": "opensearch",
    "number": "2.11.0"
  }
}
```

Check OpenSearch Dashboards:
- URL: http://localhost:5601
- Should show the OpenSearch Dashboards interface

### 4. Set Up Search Indices

Create all required indices and configure mappings:
```bash
npm run search:setup
```

Expected output:
```
🔍 Setting up LocalEx Search Indices...

Step 1: Testing OpenSearch connection...
✅ OpenSearch connection successful: opensearch 2.11.0

Step 2: Checking cluster health...
✅ OpenSearch cluster health: yellow

Step 3: Creating index templates...
✅ Created index template: localex-items-template

Step 4: Creating search indices...
✅ Created index: localex_items
✅ Created index: localex_users
✅ Created index: localex_categories
✅ Created index: localex_search_logs

Step 5: Refreshing indices...
✅ Indices refreshed successfully

🎉 Search indices setup completed successfully!
```

### 5. Run Tests

Verify everything is working correctly:
```bash
npm run search:test
```

Expected output should show all tests passing:
```
🧪 Starting LocalEx Search Services Tests...

📊 Search Services Test Results:
============================================================
✅ PASS OpenSearch Connection (245ms)
✅ PASS OpenSearch Health Check (156ms)
✅ PASS Index Creation (1234ms)
✅ PASS Index Statistics (89ms)
✅ PASS Index Refresh (45ms)
✅ PASS Search Service Health (67ms)
✅ PASS Item Indexing (234ms)
✅ PASS Basic Search (123ms)
✅ PASS Advanced Search with Filters (456ms)
✅ PASS Search Suggestions (78ms)
✅ PASS Item Updates (345ms)
✅ PASS Item Deletion (123ms)
✅ PASS Bulk Indexing (567ms)
✅ PASS Search Analytics (234ms)
============================================================
Total: 14 tests
✅ Passed: 14
❌ Failed: 0
Success Rate: 100.0%

🎉 All search services tests passed successfully!
```

## Development Workflow

### Making Changes to Search Configuration

1. **Update Configuration Files:**
   - `src/config/opensearch.ts` - Client configuration
   - `src/services/search.service.ts` - Search logic
   - `src/services/index.service.ts` - Index management

2. **Test Changes:**
   ```bash
   npm run search:test
   ```

3. **Restart Services if Needed:**
   ```bash
   npm run search:stop
   npm run search:start
   npm run search:setup
   ```

### Adding New Search Features

1. **Define Types** in `src/services/search.service.ts`:
   ```typescript
   interface NewSearchFeature {
     // Define your feature interface
   }
   ```

2. **Implement Logic** in the SearchService class:
   ```typescript
   async newSearchFeature(params: NewSearchFeature): Promise<Results> {
     // Implementation
   }
   ```

3. **Add Tests** in `scripts/test-search-services.ts`:
   ```typescript
   private async testNewFeature(): Promise<boolean> {
     // Test implementation
   }
   ```

4. **Update Documentation** in `docs/opensearch/README.md`

### Index Schema Changes

1. **Update Mappings** in `src/services/index.service.ts`:
   ```typescript
   const mapping = {
     // Updated field mappings
   };
   ```

2. **Recreate Indices:**
   ```bash
   # Delete existing indices
   npm run search:stop
   npm run search:start
   npm run search:setup
   ```

3. **Reindex Data:**
   ```typescript
   // Use bulk indexing to reindex existing data
   await searchService.bulkIndexItems(existingItems);
   ```

## Debugging

### Common Issues and Solutions

#### 1. OpenSearch Won't Start

**Symptoms:**
- Connection refused errors
- Docker containers failing to start

**Solutions:**
```bash
# Check Docker status
docker ps -a

# Check logs
docker logs localex-opensearch

# Restart services
npm run search:stop
npm run search:start
```

#### 2. Index Creation Fails

**Symptoms:**
- "index_not_found_exception" errors
- Setup script fails

**Solutions:**
```bash
# Check cluster health
curl http://localhost:9200/_cluster/health

# Manually create indices
npm run search:setup

# Check index status
curl http://localhost:9200/_cat/indices
```

#### 3. Search Queries Return No Results

**Symptoms:**
- Search returns empty results
- Items not appearing in search

**Solutions:**
```bash
# Check if items are indexed
curl http://localhost:9200/localex_items/_search?pretty

# Refresh indices
curl -X POST http://localhost:9200/localex_items/_refresh

# Check mapping
curl http://localhost:9200/localex_items/_mapping?pretty
```

#### 4. Performance Issues

**Symptoms:**
- Slow search responses
- High memory usage

**Solutions:**
```bash
# Check cluster stats
curl http://localhost:9200/_cluster/stats?pretty

# Optimize indices
curl -X POST http://localhost:9200/_forcemerge

# Check JVM memory
curl http://localhost:9200/_nodes/stats/jvm?pretty
```

### Debug Mode

Enable debug logging for detailed troubleshooting:

1. **Set Debug Environment:**
   ```env
   LOG_LEVEL=debug
   ```

2. **Check Application Logs:**
   ```bash
   # If running with ts-node
   npm run dev
   
   # Check for OpenSearch-related log messages
   ```

3. **OpenSearch Debug Info:**
   ```bash
   # Cluster info
   curl http://localhost:9200?pretty
   
   # Node info
   curl http://localhost:9200/_nodes?pretty
   
   # Index info
   curl http://localhost:9200/_cat/indices?v
   ```

## Performance Optimization

### Development Settings

For optimal development experience:

1. **Memory Settings:**
   ```yaml
   # opensearch.yml
   "OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g"
   ```

2. **Refresh Interval:**
   ```json
   {
     "settings": {
       "refresh_interval": "1s"
     }
   }
   ```

3. **Replica Settings:**
   ```json
   {
     "settings": {
       "number_of_replicas": 0
     }
   }
   ```

### Production Considerations

1. **Heap Size:**
   - Minimum: 1GB
   - Recommended: 2-4GB
   - Maximum: 50% of available RAM

2. **Shard Strategy:**
   - Development: 1 shard per index
   - Production: 3-5 shards per index

3. **Refresh Strategy:**
   - Development: 1 second
   - Production: 30 seconds or manual

## Integration with Other Services

### Database Integration

Search service integrates with PostgreSQL for data synchronization:

```typescript
// Example: Sync database items to search index
const items = await db.query('SELECT * FROM items WHERE status = $1', ['active']);
await searchService.bulkIndexItems(items.rows);
```

### Redis Integration

Search results are cached in Redis for performance:

```typescript
// Cache integration is automatic in SearchService
// Results are cached for 5 minutes (configurable)
```

### Queue Integration

Use the queue service for async indexing:

```typescript
import { queueService } from './src/services/queue.service';

// Add indexing job to queue
await queueService.addJob('index-item', { itemId: 'item-123' });
```

## Testing

### Running Tests

```bash
# Run all search tests
npm run search:test

# Run specific test categories
npm test -- --testNamePattern="Search"
```

### Writing Tests

Follow the pattern in `scripts/test-search-services.ts`:

```typescript
private async testNewFeature(): Promise<boolean> {
  try {
    // Test implementation
    const result = await searchService.newFeature(params);
    return result.success;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}
```

### Test Data

Use the test data generation methods:

```typescript
// Generate test item
const testItem = this.createTestItem();

// Generate multiple test items
const testItems = Array(10).fill(null).map(() => this.createTestItem());
```

## Monitoring

### Health Checks

```typescript
// Check search service health
const health = await searchService.healthCheck();
console.log('Health status:', health.status);

// Check index health
const indexHealth = await indexService.healthCheck();
console.log('Index health:', indexHealth.status);
```

### Performance Monitoring

```typescript
// Get search analytics
const analytics = await searchService.getSearchAnalytics({
  from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  to: new Date().toISOString()
});
```

### OpenSearch Dashboards

Access dashboards at http://localhost:5601 for:
- Index management
- Query performance analysis
- Cluster health monitoring
- Search analytics visualization

## Next Steps

After completing the setup:

1. **Explore OpenSearch Dashboards** at http://localhost:5601
2. **Run sample queries** to understand search capabilities
3. **Review the API documentation** in `docs/opensearch/README.md`
4. **Test integration** with existing database and Redis services
5. **Prepare for production deployment** following the production guide

## Support

For issues or questions:
1. Check this guide and the main documentation
2. Review test outputs for error messages
3. Check OpenSearch logs for detailed error information
4. Consult the [OpenSearch Documentation](https://opensearch.org/docs/)
