# Redis Setup Guide for LocalEx Phase 1.2

## Overview

This guide provides multiple methods to install and configure Redis for the LocalEx platform's cache and queue system.

## Method 1: Docker (Recommended for Development)

### Prerequisites
- Docker Desktop installed and running
- Docker Compose available

### Installation Steps

1. **Create Docker Compose file**:
```yaml
# docker-compose.redis.yml
version: '3.8'
services:
  redis:
    image: redis:7.2-alpine
    container_name: localex-redis
    ports:
      - "6379:6379"
    command: redis-server --requirepass LocalExRedis2024! --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  redis_data:
```

2. **Start Redis**:
```bash
docker-compose -f docker-compose.redis.yml up -d
```

3. **Verify Installation**:
```bash
docker exec -it localex-redis redis-cli -a LocalExRedis2024! ping
```

## Method 2: Windows Native Installation

### Option A: Using Chocolatey

1. **Install Chocolatey** (if not already installed):
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

2. **Install Redis**:
```powershell
choco install redis-64 -y
```

3. **Start Redis Service**:
```powershell
redis-server --service-install --service-name Redis --requirepass LocalExRedis2024!
net start Redis
```

### Option B: Manual Installation

1. **Download Redis for Windows**:
   - Visit: https://github.com/microsoftarchive/redis/releases
   - Download the latest MSI installer (e.g., `Redis-x64-3.0.504.msi`)

2. **Install Redis**:
   - Run the MSI installer as Administrator
   - Follow the installation wizard
   - Note the installation path (usually `C:\Program Files\Redis`)

3. **Configure Redis**:
   - Create configuration file: `C:\Program Files\Redis\redis.conf`
   ```conf
   # LocalEx Redis Configuration
   bind 127.0.0.1
   port 6379
   requirepass LocalExRedis2024!
   maxmemory 2gb
   maxmemory-policy allkeys-lru
   save 900 1
   save 300 10
   save 60 10000
   ```

4. **Start Redis**:
   ```cmd
   redis-server redis.conf
   ```

## Method 3: WSL2 (Windows Subsystem for Linux)

### Prerequisites
- WSL2 installed and configured
- Ubuntu or similar Linux distribution

### Installation Steps

1. **Open WSL2 Terminal**

2. **Update Package Manager**:
```bash
sudo apt update
```

3. **Install Redis**:
```bash
sudo apt install redis-server -y
```

4. **Configure Redis**:
```bash
sudo nano /etc/redis/redis.conf
```

Add/modify these settings:
```conf
bind 127.0.0.1
requirepass LocalExRedis2024!
maxmemory 2gb
maxmemory-policy allkeys-lru
```

5. **Start Redis Service**:
```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

6. **Test Connection**:
```bash
redis-cli -a LocalExRedis2024! ping
```

## Configuration Verification

### Test Redis Connection

1. **Using Redis CLI**:
```bash
redis-cli -a LocalExRedis2024! ping
# Should return: PONG
```

2. **Using Node.js**:
```bash
npm run redis:test
```

### Verify Configuration

1. **Check Redis Info**:
```bash
redis-cli -a LocalExRedis2024! info server
```

2. **Test Basic Operations**:
```bash
redis-cli -a LocalExRedis2024!
> SET test "Hello Redis"
> GET test
> DEL test
```

## Environment Configuration

### Update .env File

Ensure your `.env` file contains:
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=LocalExRedis2024!
REDIS_CACHE_DB=0
REDIS_QUEUE_DB=1
REDIS_SESSION_DB=2

# Queue Configuration
QUEUE_CONCURRENCY=5
QUEUE_MAX_ATTEMPTS=3
QUEUE_BACKOFF_DELAY=5000
QUEUE_RETRY_DELAY=1000
QUEUE_JOB_TIMEOUT=30000
```

## Testing the Installation

### Run Redis Services Tests

```bash
npm run redis:test
```

This will test:
- Redis connections (cache, queue, session)
- Cache service functionality
- Queue service with idempotency
- Rate limiting service
- Session management
- Performance benchmarks

### Expected Test Results

All tests should pass with:
- ✅ Redis connections successful
- ✅ Cache operations working
- ✅ Queue system operational
- ✅ Rate limiting functional
- ✅ Session management working
- ✅ Performance within acceptable limits

## Troubleshooting

### Common Issues

1. **Connection Refused**:
   - Ensure Redis server is running
   - Check port 6379 is not blocked by firewall
   - Verify Redis is bound to correct interface

2. **Authentication Failed**:
   - Check password in `.env` file matches Redis configuration
   - Verify `requirepass` setting in Redis config

3. **Permission Denied**:
   - Run Redis server with appropriate permissions
   - Check file system permissions for Redis data directory

4. **Port Already in Use**:
   - Check if another Redis instance is running
   - Use `netstat -an | findstr 6379` to check port usage
   - Kill existing Redis processes if needed

### Performance Issues

1. **High Memory Usage**:
   - Adjust `maxmemory` setting
   - Monitor with `redis-cli info memory`
   - Implement proper eviction policies

2. **Slow Operations**:
   - Check Redis logs for errors
   - Monitor with `redis-cli monitor`
   - Optimize key patterns and data structures

## Security Considerations

### Production Security

1. **Network Security**:
   - Bind Redis to specific interfaces only
   - Use firewall rules to restrict access
   - Consider Redis ACLs for fine-grained access control

2. **Authentication**:
   - Use strong passwords
   - Rotate passwords regularly
   - Implement Redis ACLs for production

3. **Data Protection**:
   - Enable Redis persistence (RDB/AOF)
   - Regular backups of Redis data
   - Encrypt sensitive data before storing

## Monitoring and Maintenance

### Health Checks

1. **Redis Health Check**:
```bash
redis-cli -a LocalExRedis2024! ping
redis-cli -a LocalExRedis2024! info replication
```

2. **Memory Monitoring**:
```bash
redis-cli -a LocalExRedis2024! info memory
redis-cli -a LocalExRedis2024! memory usage <key>
```

3. **Performance Monitoring**:
```bash
redis-cli -a LocalExRedis2024! info stats
redis-cli -a LocalExRedis2024! slowlog get 10
```

### Maintenance Tasks

1. **Regular Backups**:
   - Schedule Redis RDB snapshots
   - Monitor AOF file size
   - Test restore procedures

2. **Memory Management**:
   - Monitor memory usage trends
   - Clean up expired keys
   - Optimize data structures

3. **Performance Tuning**:
   - Analyze slow queries
   - Optimize key patterns
   - Monitor connection counts

## Next Steps

After successful Redis installation and testing:

1. **Integrate with Application**:
   - Update application configuration
   - Test cache integration
   - Verify queue processing

2. **Performance Testing**:
   - Run load tests
   - Monitor performance metrics
   - Optimize based on results

3. **Production Preparation**:
   - Configure monitoring
   - Set up backup procedures
   - Implement security measures

---

*This guide ensures Redis is properly configured for LocalEx Phase 1.2 implementation.*
