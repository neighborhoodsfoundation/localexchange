# AWS S3 Storage Operational Guide

## Overview

This guide covers the day-to-day operations, monitoring, maintenance, and troubleshooting of the AWS S3 storage system for LocalEx.

---

## Table of Contents

1. [Monitoring & Metrics](#monitoring--metrics)
2. [Maintenance Procedures](#maintenance-procedures)
3. [Performance Optimization](#performance-optimization)
4. [Cost Management](#cost-management)
5. [Backup & Recovery](#backup--recovery)
6. [Security Operations](#security-operations)
7. [Troubleshooting](#troubleshooting)
8. [Incident Response](#incident-response)

---

## Monitoring & Metrics

### Key Metrics to Monitor

#### Storage Metrics
- **Total Storage Size**: Monitor bucket size growth
- **Object Count**: Track number of files
- **Storage Class Distribution**: Monitor Glacier vs Standard
- **Request Rate**: Track API requests per second

#### Performance Metrics
- **Upload Latency**: Average time to upload files
- **Download Latency**: Average time to download files
- **Processing Time**: Image processing duration
- **CDN Hit Ratio**: Percentage of requests served from cache

#### Cost Metrics
- **Storage Costs**: Monthly storage fees
- **Data Transfer Costs**: Bandwidth charges
- **Request Costs**: API request charges
- **Total Monthly Cost**: Overall S3 spending

### CloudWatch Dashboards

**Create Custom Dashboard**:
```bash
aws cloudwatch put-dashboard --dashboard-name LocalEx-Storage --dashboard-body file://dashboard.json
```

**Dashboard Configuration**:
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/S3", "BucketSizeBytes", {"stat": "Average"}],
          [".", "NumberOfObjects", {"stat": "Average"}]
        ],
        "period": 86400,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Storage Usage"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/S3", "AllRequests", {"stat": "Sum"}],
          [".", "GetRequests", {"stat": "Sum"}],
          [".", "PutRequests", {"stat": "Sum"}]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Request Metrics"
      }
    }
  ]
}
```

### Alerting

**Set Up CloudWatch Alarms**:

1. **High Storage Usage**:
   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name high-storage-usage \
     --alarm-description "Storage exceeds 1TB" \
     --metric-name BucketSizeBytes \
     --namespace AWS/S3 \
     --statistic Average \
     --period 86400 \
     --threshold 1099511627776 \
     --comparison-operator GreaterThanThreshold
   ```

2. **High Error Rate**:
   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name high-error-rate \
     --alarm-description "S3 error rate exceeds 5%" \
     --metric-name 4xxErrors \
     --namespace AWS/S3 \
     --statistic Average \
     --period 300 \
     --threshold 5 \
     --comparison-operator GreaterThanThreshold
   ```

3. **Unusual Request Volume**:
   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name unusual-request-volume \
     --alarm-description "Request volume exceeds normal" \
     --metric-name AllRequests \
     --namespace AWS/S3 \
     --statistic Sum \
     --period 300 \
     --threshold 10000 \
     --comparison-operator GreaterThanThreshold
   ```

---

## Maintenance Procedures

### Daily Tasks

1. **Monitor Storage Metrics**
   - Check CloudWatch dashboard
   - Review storage usage trends
   - Verify backup completion

2. **Review Error Logs**
   ```bash
   # Check S3 access logs
   aws s3 sync s3://localex-storage-logs/$(date +%Y/%m/%d)/ ./logs/
   
   # Analyze errors
   grep "HTTP/1.1\" 4" logs/*.log | wc -l
   grep "HTTP/1.1\" 5" logs/*.log | wc -l
   ```

3. **Verify CDN Performance**
   ```bash
   # Check CloudFront metrics
   aws cloudfront get-distribution-statistics \
     --distribution-id E1234ABCDEFG \
     --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S)
   ```

### Weekly Tasks

1. **Cleanup Expired Files**
   ```bash
   npm run storage:cleanup-expired
   ```

2. **Review Storage Statistics**
   ```typescript
   import { getFileManagementService } from './src/services/file-management.service';
   
   const fileService = getFileManagementService();
   const stats = await fileService.getStorageStatistics();
   
   console.log('Storage Statistics:', stats);
   ```

3. **Optimize Storage Costs**
   - Review lifecycle policies
   - Identify unused files
   - Archive old content

### Monthly Tasks

1. **Cost Analysis**
   ```bash
   # Get cost report
   aws ce get-cost-and-usage \
     --time-period Start=$(date -d '1 month ago' +%Y-%m-01),End=$(date +%Y-%m-01) \
     --granularity MONTHLY \
     --metrics BlendedCost \
     --filter file://s3-cost-filter.json
   ```

2. **Security Audit**
   - Review IAM permissions
   - Check bucket policies
   - Verify encryption settings
   - Review access logs

3. **Performance Review**
   - Analyze upload/download times
   - Review CDN hit ratios
   - Optimize image processing

---

## Performance Optimization

### Image Optimization

1. **Enable WebP Conversion**
   ```env
   IMAGE_ENABLE_WEBP=true
   ```

2. **Adjust Quality Settings**
   ```env
   IMAGE_QUALITY=85  # Balance quality and file size
   ```

3. **Optimize Thumbnail Sizes**
   ```env
   IMAGE_THUMBNAIL_SIZE=300
   IMAGE_MEDIUM_SIZE=800
   IMAGE_LARGE_SIZE=1200
   ```

### CDN Optimization

1. **Configure Cache Headers**
   ```typescript
   const cdnService = getCDNService();
   const headers = cdnService.getCacheHeaders('items/photo.jpg', {
     minTTL: 0,
     maxTTL: 31536000,
     defaultTTL: 2592000,
   });
   ```

2. **Warm Cache for Popular Content**
   ```typescript
   const popularKeys = await getPopularItemPhotos();
   await cdnService.warmCache(popularKeys);
   ```

3. **Invalidate Stale Content**
   ```typescript
   await cdnService.invalidateCache([
     'items/123/photo.jpg',
     'profiles/456/photo.jpg',
   ]);
   ```

### Upload Optimization

1. **Use Multipart Upload for Large Files**
   - Automatically enabled for files > 5MB
   - Improves reliability and performance

2. **Compress Before Upload**
   ```typescript
   const optimized = await imageService.optimizeImage(buffer);
   await storageService.uploadFile(key, optimized);
   ```

3. **Batch Operations**
   ```typescript
   const uploads = photos.map(photo => 
     imageService.processAndUpload(photo.buffer, photo.key)
   );
   
   const results = await Promise.all(uploads);
   ```

---

## Cost Management

### Cost Monitoring

**View Current Costs**:
```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '7 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

### Cost Optimization Strategies

1. **Use Lifecycle Policies**
   - Move old files to Glacier after 365 days
   - Delete temp files after 24 hours
   - Archive inactive content

2. **Enable Intelligent Tiering**
   ```bash
   aws s3api put-bucket-intelligent-tiering-configuration \
     --bucket localex-storage \
     --id intelligent-tiering-1 \
     --intelligent-tiering-configuration file://tiering-config.json
   ```

3. **Optimize Data Transfer**
   - Use CloudFront to reduce S3 data transfer
   - Enable compression
   - Use appropriate image sizes

4. **Clean Up Unused Files**
   ```typescript
   // Find orphaned files
   const orphaned = await findOrphanedFiles();
   
   // Delete orphaned files
   await storageService.deleteFiles(orphaned.map(f => f.key));
   ```

### Budget Alerts

**Create Budget**:
```bash
aws budgets create-budget \
  --account-id 123456789012 \
  --budget file://storage-budget.json \
  --notifications-with-subscribers file://budget-notifications.json
```

---

## Backup & Recovery

### Backup Strategy

1. **Enable Versioning**
   ```bash
   aws s3api put-bucket-versioning \
     --bucket localex-storage \
     --versioning-configuration Status=Enabled
   ```

2. **Cross-Region Replication**
   ```bash
   aws s3api put-bucket-replication \
     --bucket localex-storage \
     --replication-configuration file://replication-config.json
   ```

3. **Regular Snapshots**
   ```bash
   # Backup critical files
   aws s3 sync s3://localex-storage/items/ s3://localex-backup/items/
   aws s3 sync s3://localex-storage/profiles/ s3://localex-backup/profiles/
   ```

### Recovery Procedures

**Restore Deleted File**:
```bash
# List versions
aws s3api list-object-versions \
  --bucket localex-storage \
  --prefix items/123/photo.jpg

# Restore specific version
aws s3api copy-object \
  --bucket localex-storage \
  --copy-source localex-storage/items/123/photo.jpg?versionId=VERSION_ID \
  --key items/123/photo.jpg
```

**Restore from Backup**:
```bash
aws s3 sync s3://localex-backup/items/123/ s3://localex-storage/items/123/
```

---

## Security Operations

### Access Auditing

**Review Access Logs**:
```bash
# Download logs
aws s3 sync s3://localex-storage-logs/ ./access-logs/

# Analyze suspicious activity
grep "403" access-logs/*.log
grep "DELETE" access-logs/*.log | grep -v "200"
```

### Security Monitoring

1. **Monitor Failed Requests**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/S3 \
     --metric-name 4xxErrors \
     --dimensions Name=BucketName,Value=localex-storage \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 300 \
     --statistics Sum
   ```

2. **Review IAM Access**
   ```bash
   # List users with S3 access
   aws iam list-users | jq '.Users[].UserName'
   
   # Review user permissions
   aws iam list-user-policies --user-name localex-storage-user
   ```

3. **Check Bucket Policies**
   ```bash
   aws s3api get-bucket-policy --bucket localex-storage
   ```

### Incident Response

**Suspected Unauthorized Access**:
1. Rotate access keys immediately
2. Review CloudTrail logs
3. Check for unusual file modifications
4. Verify bucket policy hasn't changed
5. Enable MFA delete if not already enabled

**Data Breach**:
1. Identify compromised files
2. Invalidate CDN cache for affected files
3. Restore from backup if needed
4. Notify security team
5. Review and update security policies

---

## Troubleshooting

### Common Issues

#### Issue: Slow Upload Speeds

**Diagnosis**:
```typescript
const start = Date.now();
await storageService.uploadFile(key, buffer);
const duration = Date.now() - start;
console.log(`Upload took ${duration}ms`);
```

**Solutions**:
- Check network connectivity
- Use multipart upload for large files
- Compress files before upload
- Consider using Transfer Acceleration

#### Issue: High CDN Costs

**Diagnosis**:
```bash
aws cloudfront get-distribution-statistics \
  --distribution-id E1234ABCDEFG
```

**Solutions**:
- Review cache policies
- Increase TTL for static content
- Optimize image sizes
- Enable compression

#### Issue: Storage Quota Exceeded

**Diagnosis**:
```typescript
const stats = await storageService.getStorageStats();
console.log(`Total size: ${stats.totalSize} bytes`);
```

**Solutions**:
- Clean up old files
- Enable lifecycle policies
- Archive to Glacier
- Increase storage quota

---

## Performance Benchmarks

### Expected Performance

- **Upload Speed**: < 2 seconds for 5MB file
- **Download Speed**: < 500ms for 1MB file
- **Image Processing**: < 3 seconds for thumbnail generation
- **CDN Response**: < 100ms (cached content)
- **Signed URL Generation**: < 50ms

### Performance Testing

```bash
# Run performance tests
npm run storage:test

# Run specific performance test
npm run test:performance -- --grep "storage"
```

---

## Maintenance Checklist

### Daily ✅
- [ ] Review CloudWatch metrics
- [ ] Check error rates
- [ ] Verify backup completion
- [ ] Monitor storage usage

### Weekly ✅
- [ ] Clean up expired files
- [ ] Review storage statistics
- [ ] Optimize storage costs
- [ ] Check CDN performance

### Monthly ✅
- [ ] Cost analysis and optimization
- [ ] Security audit
- [ ] Performance review
- [ ] Update documentation

### Quarterly ✅
- [ ] Review and update IAM policies
- [ ] Test disaster recovery procedures
- [ ] Optimize lifecycle policies
- [ ] Review and update monitoring alerts

---

## Additional Resources

- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/best-practices.html)
- [CloudFront Performance Optimization](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ConfiguringCaching.html)
- [S3 Cost Optimization](https://aws.amazon.com/s3/cost-optimization/)
- [LocalEx Storage API Reference](api-reference.md)

---

*Last Updated: October 8, 2024*  
*Phase 1.4 - AWS S3 Storage Integration*

