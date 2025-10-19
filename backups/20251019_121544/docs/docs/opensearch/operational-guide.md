# OpenSearch Operational Guide

## Overview

This guide provides operational procedures for managing the LocalEx OpenSearch infrastructure in production environments. It covers monitoring, maintenance, troubleshooting, and scaling operations.

## Table of Contents

- [Monitoring & Alerting](#monitoring--alerting)
- [Backup & Recovery](#backup--recovery)
- [Performance Tuning](#performance-tuning)
- [Scaling Operations](#scaling-operations)
- [Security Operations](#security-operations)
- [Maintenance Procedures](#maintenance-procedures)
- [Troubleshooting Guide](#troubleshooting-guide)
- [Emergency Procedures](#emergency-procedures)

## Monitoring & Alerting

### Key Metrics to Monitor

#### Cluster Health Metrics
- **Cluster Status**: Green, Yellow, Red
- **Node Count**: Active nodes vs configured nodes
- **Shard Status**: Unassigned shards, relocating shards
- **Index Count**: Total indices and document count

#### Performance Metrics
- **Search Latency**: Average response time (target: <200ms)
- **Indexing Rate**: Documents indexed per second
- **Query Throughput**: Queries per second
- **Cache Hit Rate**: Redis cache effectiveness (target: >80%)

#### Resource Metrics
- **CPU Usage**: Per node CPU utilization
- **Memory Usage**: Heap memory usage (target: <80%)
- **Disk Usage**: Storage utilization per node
- **Network I/O**: Bandwidth utilization

### Monitoring Setup

#### 1. Health Check Endpoints

```typescript
// Application health check
app.get('/health/search', async (req, res) => {
  const health = await searchService.healthCheck();
  res.json({
    status: health.status,
    timestamp: new Date().toISOString(),
    details: health.details
  });
});
```

#### 2. Prometheus Metrics (Optional)

```typescript
// Search metrics collection
const searchMetrics = {
  search_requests_total: 0,
  search_duration_seconds: 0,
  search_errors_total: 0,
  index_operations_total: 0
};
```

#### 3. Log Monitoring

```bash
# Monitor OpenSearch logs
tail -f /var/log/opensearch/localex-search.log | grep -E "(ERROR|WARN|FATAL)"

# Monitor application logs
tail -f /var/log/localex/app.log | grep -E "(search|opensearch)"
```

### Alerting Rules

#### Critical Alerts
- **Cluster Status Red**: Immediate response required
- **Node Down**: Alert if any node is unavailable
- **Search Latency >500ms**: Performance degradation
- **Memory Usage >90%**: Risk of OOM errors
- **Disk Usage >85%**: Storage space critical

#### Warning Alerts
- **Cluster Status Yellow**: Investigate within 1 hour
- **Search Latency >200ms**: Performance monitoring
- **Memory Usage >80%**: Memory pressure
- **Unassigned Shards**: Shard allocation issues

## Backup & Recovery

### Backup Strategy

#### 1. Snapshot Repository Setup

```bash
# Create filesystem snapshot repository
curl -X PUT "localhost:9200/_snapshot/backup_repo" \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "fs",
    "settings": {
      "location": "/backup/opensearch",
      "compress": true,
      "max_snapshot_bytes_per_sec": "50mb",
      "max_restore_bytes_per_sec": "50mb"
    }
  }'
```

#### 2. Automated Backup Script

```bash
#!/bin/bash
# daily-backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_NAME="localex_backup_$DATE"

# Create snapshot
curl -X PUT "localhost:9200/_snapshot/backup_repo/$SNAPSHOT_NAME" \
  -H 'Content-Type: application/json' \
  -d '{
    "indices": "localex_*",
    "ignore_unavailable": true,
    "include_global_state": false,
    "metadata": {
      "taken_by": "automated_backup",
      "taken_because": "daily_backup"
    }
  }'

# Wait for completion
curl -X GET "localhost:9200/_snapshot/backup_repo/$SNAPSHOT_NAME/_status"

# Cleanup old snapshots (keep 30 days)
find /backup/opensearch -name "localex_backup_*" -mtime +30 -delete
```

#### 3. Backup Verification

```bash
# Verify snapshot integrity
curl -X GET "localhost:9200/_snapshot/backup_repo?pretty"

# Test restore on staging environment
curl -X POST "localhost:9200/_snapshot/backup_repo/snapshot_name/_restore" \
  -H 'Content-Type: application/json' \
  -d '{
    "indices": "localex_items",
    "rename_pattern": "localex_(.+)",
    "rename_replacement": "restored_$1"
  }'
```

### Recovery Procedures

#### 1. Full Cluster Recovery

```bash
# 1. Stop application services
systemctl stop localex-api

# 2. Restore from snapshot
curl -X POST "localhost:9200/_snapshot/backup_repo/snapshot_name/_restore" \
  -H 'Content-Type: application/json' \
  -d '{
    "indices": "localex_*",
    "ignore_unavailable": true,
    "include_global_state": false
  }'

# 3. Wait for restore completion
curl -X GET "localhost:9200/_cat/recovery?v"

# 4. Verify data integrity
curl -X GET "localhost:9200/_cat/indices/localex_*?v"

# 5. Restart application services
systemctl start localex-api
```

#### 2. Partial Index Recovery

```bash
# Restore specific index
curl -X POST "localhost:9200/_snapshot/backup_repo/snapshot_name/_restore" \
  -H 'Content-Type: application/json' \
  -d '{
    "indices": "localex_items",
    "rename_pattern": "localex_items",
    "rename_replacement": "localex_items_restored"
  }'
```

## Performance Tuning

### Index Optimization

#### 1. Index Settings Tuning

```json
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "refresh_interval": "30s",
    "max_result_window": 10000,
    "index.mapping.total_fields.limit": 1000,
    "index.mapping.depth.limit": 20
  }
}
```

#### 2. Query Optimization

```typescript
// Optimize search queries
const optimizedQuery = {
  query: {
    bool: {
      must: [
        { match: { title: { query: searchTerm, boost: 3 } } },
        { match: { description: { query: searchTerm, boost: 1 } } }
      ],
      filter: [
        { term: { status: 'active' } },
        { range: { price: { gte: minPrice, lte: maxPrice } } }
      ]
    }
  },
  size: 20,
  from: 0
};
```

#### 3. Cache Optimization

```typescript
// Search result caching
const cacheKey = `search:${hashQuery(query)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const results = await opensearchClient.search(body);
await redis.setex(cacheKey, 300, JSON.stringify(results)); // 5 min TTL
```

### Memory Management

#### 1. JVM Heap Settings

```bash
# config/jvm.options
-Xms4g
-Xmx4g
-XX:+UseG1GC
-XX:G1HeapRegionSize=16m
-XX:+UseStringDeduplication
```

#### 2. Circuit Breaker Configuration

```yaml
# opensearch.yml
indices.breaker.total.limit: 70%
indices.breaker.fielddata.limit: 40%
indices.breaker.request.limit: 60%
```

## Scaling Operations

### Horizontal Scaling

#### 1. Adding Nodes

```bash
# New node configuration
node.name: localex-node-3
node.roles: [data, ingest]
discovery.seed_hosts: ["node1:9300", "node2:9300", "node3:9300"]
cluster.initial_master_nodes: ["localex-node-1", "localex-node-2", "localex-node-3"]
```

#### 2. Shard Allocation

```bash
# Rebalance shards across nodes
curl -X POST "localhost:9200/_cluster/reroute" \
  -H 'Content-Type: application/json' \
  -d '{
    "commands": [
      {
        "move": {
          "index": "localex_items",
          "shard": 0,
          "from_node": "node1",
          "to_node": "node3"
        }
      }
    ]
  }'
```

### Vertical Scaling

#### 1. Memory Scaling

```bash
# Update JVM heap size
# config/jvm.options
-Xms8g
-Xmx8g
```

#### 2. Disk Scaling

```bash
# Add new data path
path.data: ["/data1", "/data2", "/data3"]
```

## Security Operations

### Authentication & Authorization

#### 1. User Management

```bash
# Create admin user
./bin/opensearch-users useradd admin -p "secure_password"

# Create application user
./bin/opensearch-users useradd localex_app -p "app_password"

# Assign roles
./bin/opensearch-users rolesmapping put admin -u admin
./bin/opensearch-users rolesmapping put localex_app_role -u localex_app
```

#### 2. Role Configuration

```json
{
  "cluster_permissions": ["cluster:monitor/main"],
  "index_permissions": [
    {
      "index_patterns": ["localex_*"],
      "dls": "",
      "fls": [],
      "masked_fields": [],
      "allowed_actions": [
        "indices_all",
        "read",
        "write",
        "delete"
      ]
    }
  ]
}
```

### SSL/TLS Configuration

#### 1. Certificate Generation

```bash
# Generate certificates
./bin/opensearch-security-admin.sh \
  -cd config/opensearch-security/ \
  -icl -p 9200 \
  -nhnv
```

#### 2. SSL Configuration

```yaml
# opensearch.yml
plugins.security.ssl.http.enabled: true
plugins.security.ssl.http.keystore_filepath: config/opensearch-keystore.jks
plugins.security.ssl.http.truststore_filepath: config/opensearch-truststore.jks
plugins.security.ssl.http.keystore_password: keystore_password
plugins.security.ssl.http.truststore_password: truststore_password
```

## Maintenance Procedures

### Regular Maintenance Tasks

#### 1. Daily Tasks

```bash
# Check cluster health
curl -X GET "localhost:9200/_cluster/health?pretty"

# Monitor disk usage
curl -X GET "localhost:9200/_cat/allocation?v"

# Check slow queries
curl -X GET "localhost:9200/_nodes/stats/indices/search?pretty"
```

#### 2. Weekly Tasks

```bash
# Force merge indices
curl -X POST "localhost:9200/_forcemerge?max_num_segments=1"

# Clear field data cache
curl -X POST "localhost:9200/_cache/clear?fielddata=true"

# Update index settings
curl -X PUT "localhost:9200/localex_*/_settings" \
  -H 'Content-Type: application/json' \
  -d '{"index.refresh_interval": "30s"}'
```

#### 3. Monthly Tasks

```bash
# Index optimization
curl -X POST "localhost:9200/_forcemerge?max_num_segments=1&wait_for_completion=true"

# Cleanup old indices
curl -X DELETE "localhost:9200/localex_old_index_*"

# Review and update mappings
curl -X GET "localhost:9200/localex_*/_mapping?pretty"
```

### Index Maintenance

#### 1. Index Rotation

```bash
# Create new index with date suffix
INDEX_NAME="localex_items_$(date +%Y%m)"
curl -X PUT "localhost:9200/$INDEX_NAME" \
  -H 'Content-Type: application/json' \
  -d @index_template.json

# Reindex data
curl -X POST "localhost:9200/_reindex" \
  -H 'Content-Type: application/json' \
  -d '{
    "source": {"index": "localex_items"},
    "dest": {"index": "'$INDEX_NAME'"}
  }'

# Update alias
curl -X POST "localhost:9200/_aliases" \
  -H 'Content-Type: application/json' \
  -d '{
    "actions": [
      {"remove": {"index": "localex_items", "alias": "localex_items_current"}},
      {"add": {"index": "'$INDEX_NAME'", "alias": "localex_items_current"}}
    ]
  }'
```

## Troubleshooting Guide

### Common Issues

#### 1. Cluster Status Yellow/Red

**Symptoms:**
- Cluster health shows yellow or red
- Unassigned shards

**Diagnosis:**
```bash
# Check cluster health
curl -X GET "localhost:9200/_cluster/health?pretty"

# Check unassigned shards
curl -X GET "localhost:9200/_cat/shards?v&h=index,shard,prirep,state,unassigned.reason"

# Check node status
curl -X GET "localhost:9200/_cat/nodes?v"
```

**Solutions:**
```bash
# Allocate unassigned shards
curl -X POST "localhost:9200/_cluster/reroute" \
  -H 'Content-Type: application/json' \
  -d '{
    "commands": [
      {
        "allocate_empty_primary": {
          "index": "index_name",
          "shard": 0,
          "node": "node_name",
          "accept_data_loss": true
        }
      }
    ]
  }'
```

#### 2. High Memory Usage

**Symptoms:**
- JVM heap usage >90%
- OutOfMemoryError in logs

**Diagnosis:**
```bash
# Check JVM stats
curl -X GET "localhost:9200/_nodes/stats/jvm?pretty"

# Check field data usage
curl -X GET "localhost:9200/_cat/fielddata?v"
```

**Solutions:**
```bash
# Clear field data cache
curl -X POST "localhost:9200/_cache/clear?fielddata=true"

# Increase heap size
# Update config/jvm.options: -Xms8g -Xmx8g

# Optimize queries to use filters instead of queries
```

#### 3. Slow Search Performance

**Symptoms:**
- Search latency >500ms
- High CPU usage during searches

**Diagnosis:**
```bash
# Check slow queries
curl -X GET "localhost:9200/_nodes/stats/indices/search?pretty"

# Profile a slow query
curl -X GET "localhost:9200/localex_items/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "profile": true,
    "query": {"match_all": {}}
  }'
```

**Solutions:**
```bash
# Optimize index settings
curl -X PUT "localhost:9200/localex_items/_settings" \
  -H 'Content-Type: application/json' \
  -d '{"index.refresh_interval": "30s"}'

# Force merge segments
curl -X POST "localhost:9200/localex_items/_forcemerge?max_num_segments=1"
```

#### 4. Index Corruption

**Symptoms:**
- Corrupted index errors
- Data inconsistencies

**Diagnosis:**
```bash
# Check index integrity
curl -X GET "localhost:9200/_cat/indices/localex_*?v&h=index,health,status,docs.count,store.size"

# Verify document count
curl -X GET "localhost:9200/localex_items/_count"
```

**Solutions:**
```bash
# Restore from backup
curl -X POST "localhost:9200/_snapshot/backup_repo/snapshot_name/_restore" \
  -H 'Content-Type: application/json' \
  -d '{
    "indices": "localex_items",
    "ignore_unavailable": true
  }'

# Reindex from source data
curl -X POST "localhost:9200/_reindex" \
  -H 'Content-Type: application/json' \
  -d '{
    "source": {"index": "source_index"},
    "dest": {"index": "localex_items"}
  }'
```

## Emergency Procedures

### Cluster Recovery

#### 1. Complete Cluster Failure

```bash
# 1. Stop all nodes
systemctl stop opensearch

# 2. Check data directory integrity
fsck /dev/sdb1

# 3. Restore from backup
tar -xzf /backup/opensearch/cluster_backup.tar.gz -C /var/lib/opensearch/

# 4. Start nodes one by one
systemctl start opensearch

# 5. Verify cluster health
curl -X GET "localhost:9200/_cluster/health?wait_for_status=green&timeout=30s"
```

#### 2. Data Corruption Recovery

```bash
# 1. Stop application
systemctl stop localex-api

# 2. Restore from latest snapshot
curl -X POST "localhost:9200/_snapshot/backup_repo/latest/_restore" \
  -H 'Content-Type: application/json' \
  -d '{
    "indices": "localex_*",
    "ignore_unavailable": true
  }'

# 3. Wait for restore completion
curl -X GET "localhost:9200/_cat/recovery?v"

# 4. Restart application
systemctl start localex-api
```

### Service Degradation Response

#### 1. High Load Response

```bash
# 1. Increase refresh interval
curl -X PUT "localhost:9200/localex_*/_settings" \
  -H 'Content-Type: application/json' \
  -d '{"index.refresh_interval": "60s"}'

# 2. Disable replicas temporarily
curl -X PUT "localhost:9200/localex_*/_settings" \
  -H 'Content-Type: application/json' \
  -d '{"index.number_of_replicas": 0}'

# 3. Enable read-only mode if necessary
curl -X PUT "localhost:9200/localex_*/_settings" \
  -H 'Content-Type: application/json' \
  -d '{"index.blocks.write": true}'
```

#### 2. Memory Pressure Response

```bash
# 1. Clear caches
curl -X POST "localhost:9200/_cache/clear"

# 2. Reduce heap usage
curl -X PUT "localhost:9200/localex_*/_settings" \
  -H 'Content-Type: application/json' \
  -d '{"index.mapping.total_fields.limit": 500}'

# 3. Restart node if necessary
systemctl restart opensearch
```

## Contact Information

### Emergency Contacts
- **On-Call Engineer**: [Contact Information]
- **Database Team**: [Contact Information]
- **Infrastructure Team**: [Contact Information]

### Escalation Procedures
1. **Level 1**: Application team (0-30 minutes)
2. **Level 2**: Infrastructure team (30-60 minutes)
3. **Level 3**: Vendor support (60+ minutes)

### Documentation References
- [OpenSearch Official Documentation](https://opensearch.org/docs/)
- [LocalEx Architecture Documentation](./README.md)
- [Search API Documentation](./README.md#search-api-reference)
