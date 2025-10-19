# LocalEx Production Deployment Guide
*Version 7.0 - AI-Powered Privacy-First Trading Platform*

**Version**: 7.0  
**Date**: October 18, 2025  
**Status**: Production Ready  
**Architecture**: v7 - AI-Powered Item Intelligence

---

## 📋 **Deployment Overview**

This guide provides comprehensive instructions for deploying the LocalEx trading platform to production, following the v7 architectural specifications with AI-powered item intelligence and privacy-first design.

### **System Requirements**

**Minimum Requirements:**
- **CPU**: 4 cores, 2.4GHz+
- **RAM**: 16GB
- **Storage**: 100GB SSD
- **Network**: 100Mbps dedicated connection

**Recommended Requirements:**
- **CPU**: 8 cores, 3.0GHz+
- **RAM**: 32GB
- **Storage**: 500GB NVMe SSD
- **Network**: 1Gbps dedicated connection

**Software Requirements:**
- Node.js 18.x LTS
- PostgreSQL 14+
- Redis 6+
- OpenSearch 2.x
- Docker & Docker Compose
- Nginx (for reverse proxy)
- SSL Certificate

---

## 🏗️ **Architecture Overview (v7)**

### **Phase 1: Infrastructure Layer** ✅ **COMPLETE**
```
Data Layer Services:
├── PostgreSQL (Primary Database)
├── Redis (Caching & Sessions)
├── OpenSearch (Search & Analytics)
└── S3-Compatible Storage (Files & Images)

Service Layer:
├── User Management Service
├── Item Management Service
├── Trading Service
├── Credit System Service
├── Search Service
├── Notification Service
└── AI Intelligence Service (NEW in v7)
```

### **Phase 2: AI-Powered Features** ✅ **COMPLETE**
```
AI Intelligence Layer:
├── LLM Chatbot (Item Assessment)
├── Google Vision API (Image Recognition)
├── AI Valuation System
├── Market Analysis Engine
└── Conversational AI Assistant

Enhanced Trading Features:
├── Arrival Tracking System
├── Handoff Confirmation
├── Feedback & Rating System
└── Dispute Resolution System
```

---

## 🚀 **Deployment Steps**

### **Step 1: Environment Preparation**

1. **Create Production Environment**
   ```bash
   # Create deployment directory
   mkdir -p /opt/localex
   cd /opt/localex
   
   # Clone repository
   git clone https://github.com/your-org/localex.git .
   git checkout production
   ```

2. **Install Dependencies**
   ```bash
   # Install Node.js 18.x
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

### **Step 2: Database Setup**

1. **PostgreSQL Configuration**
   ```bash
   # Install PostgreSQL
   sudo apt-get install postgresql postgresql-contrib
   
   # Create database and user
   sudo -u postgres psql
   CREATE DATABASE localex_production;
   CREATE USER localex_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE localex_production TO localex_user;
   \q
   ```

2. **Database Schema Deployment**
   ```bash
   # Run migrations
   npm run build
   npm run migrate:production
   ```

### **Step 3: Infrastructure Services**

1. **Redis Setup**
   ```bash
   # Start Redis container
   docker-compose -f docker-compose.redis.yml up -d
   ```

2. **OpenSearch Setup**
   ```bash
   # Start OpenSearch container
   docker-compose -f docker-compose.opensearch.yml up -d
   
   # Initialize search indices
   npm run setup:search:production
   ```

3. **S3 Storage Setup**
   ```bash
   # Configure S3-compatible storage
   npm run setup:s3:production
   ```

### **Step 4: Application Deployment**

1. **Environment Configuration**
   ```bash
   # Create production environment file
   cp env.example .env.production
   
   # Edit environment variables
   nano .env.production
   ```

   **Required Environment Variables:**
   ```env
   # Database
   DATABASE_URL=postgresql://localex_user:secure_password@localhost:5432/localex_production
   
   # Redis
   REDIS_URL=redis://localhost:6379
   
   # OpenSearch
   OPENSEARCH_URL=https://localhost:9200
   OPENSEARCH_USERNAME=admin
   OPENSEARCH_PASSWORD=admin_password
   
   # S3 Storage
   S3_BUCKET=localex-production
   S3_REGION=us-east-1
   S3_ACCESS_KEY_ID=your_access_key
   S3_SECRET_ACCESS_KEY=your_secret_key
   
   # AI Services (v7 Features)
   OPENAI_API_KEY=your_openai_key
   GOOGLE_VISION_API_KEY=your_google_vision_key
   
   # Security
   JWT_SECRET=your_jwt_secret
   ENCRYPTION_KEY=your_encryption_key
   
   # Application
   NODE_ENV=production
   PORT=3000
   ```

2. **Build Application**
   ```bash
   # Install dependencies
   npm ci --production
   
   # Build TypeScript
   npm run build
   
   # Run security audit
   npm audit --production
   ```

3. **Start Application**
   ```bash
   # Start with PM2 for production
   npm install -g pm2
   
   # Create PM2 ecosystem file
   cat > ecosystem.config.js << EOF
   module.exports = {
     apps: [{
       name: 'localex',
       script: 'dist/index.js',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       },
       error_file: './logs/err.log',
       out_file: './logs/out.log',
       log_file: './logs/combined.log',
       time: true
     }]
   }
   EOF
   
   # Start application
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### **Step 5: Reverse Proxy Setup (Nginx)**

1. **Install and Configure Nginx**
   ```bash
   # Install Nginx
   sudo apt-get install nginx
   
   # Create site configuration
   sudo nano /etc/nginx/sites-available/localex
   ```

   **Nginx Configuration:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name your-domain.com;
       
       ssl_certificate /path/to/ssl/certificate.crt;
       ssl_certificate_key /path/to/ssl/private.key;
       
       # Security headers
       add_header X-Frame-Options DENY;
       add_header X-Content-Type-Options nosniff;
       add_header X-XSS-Protection "1; mode=block";
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
       
       # Rate limiting
       limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
       limit_req zone=api burst=20 nodelay;
       
       # Proxy to application
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
       
       # Static files
       location /static/ {
           alias /opt/localex/public/;
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

2. **Enable Site and Restart Nginx**
   ```bash
   sudo ln -s /etc/nginx/sites-available/localex /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   sudo systemctl enable nginx
   ```

### **Step 6: SSL Certificate Setup**

1. **Let's Encrypt SSL (Recommended)**
   ```bash
   # Install Certbot
   sudo apt-get install certbot python3-certbot-nginx
   
   # Obtain SSL certificate
   sudo certbot --nginx -d your-domain.com
   
   # Test automatic renewal
   sudo certbot renew --dry-run
   ```

### **Step 7: Monitoring and Logging**

1. **Application Monitoring**
   ```bash
   # Install monitoring tools
   npm install -g @pm2/io
   
   # Configure monitoring
   pm2 install pm2-server-monit
   ```

2. **Log Management**
   ```bash
   # Configure log rotation
   sudo nano /etc/logrotate.d/localex
   ```

   **Logrotate Configuration:**
   ```
   /opt/localex/logs/*.log {
       daily
       missingok
       rotate 30
       compress
       delaycompress
       notifempty
       create 644 localex localex
       postrotate
           pm2 reloadLogs
       endscript
   }
   ```

### **Step 8: Backup Configuration**

1. **Automated Backup Setup**
   ```bash
   # Create backup script
   nano /opt/localex/scripts/backup-production.ps1
   
   # Make executable
   chmod +x /opt/localex/scripts/backup-production.ps1
   
   # Add to crontab
   crontab -e
   # Add: 0 2 * * * /opt/localex/scripts/backup-production.ps1 backup
   ```

---

## 🔧 **AI Features Configuration (v7)**

### **OpenAI Integration**
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7
```

### **Google Vision API Integration**
```env
# Google Vision Configuration
GOOGLE_VISION_API_KEY=your_google_vision_api_key
GOOGLE_VISION_PROJECT_ID=your_project_id
```

### **AI Service Initialization**
```bash
# Initialize AI services
npm run setup:ai:production
```

---

## 🧪 **Production Testing**

### **Pre-Deployment Testing**
```bash
# Run comprehensive test suite
npm run test:all

# Run security audit
npm run test:security

# Run load testing
npm run test:load

# Run performance benchmarks
npm run test:performance
```

### **Post-Deployment Validation**
```bash
# Health check endpoint
curl https://your-domain.com/health

# API endpoints test
curl https://your-domain.com/api/health
curl https://your-domain.com/api/version
```

---

## 📊 **Performance Optimization**

### **Database Optimization**
```sql
-- Create indexes for production
CREATE INDEX CONCURRENTLY idx_items_category ON items(category_id);
CREATE INDEX CONCURRENTLY idx_items_location ON items USING GIST (location);
CREATE INDEX CONCURRENTLY idx_trades_status ON trades(status);
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

### **Redis Optimization**
```bash
# Configure Redis for production
echo "maxmemory 2gb" >> /etc/redis/redis.conf
echo "maxmemory-policy allkeys-lru" >> /etc/redis/redis.conf
```

### **OpenSearch Optimization**
```json
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "refresh_interval": "30s"
  }
}
```

---

## 🔒 **Security Configuration**

### **Firewall Setup**
```bash
# Configure UFW firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### **Application Security**
```bash
# Set secure file permissions
chmod 600 .env.production
chmod 644 ecosystem.config.js
chmod 755 scripts/*.ps1

# Create non-root user for application
sudo useradd -r -s /bin/false localex
sudo chown -R localex:localex /opt/localex
```

---

## 📈 **Monitoring and Alerting**

### **Health Checks**
```bash
# Create health check script
cat > /opt/localex/scripts/health-check.sh << EOF
#!/bin/bash
curl -f http://localhost:3000/health || exit 1
EOF

chmod +x /opt/localex/scripts/health-check.sh
```

### **Performance Monitoring**
```bash
# Install monitoring tools
npm install -g clinic
clinic doctor -- node dist/index.js
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Database Connection Issues**
   ```bash
   # Check database status
   sudo systemctl status postgresql
   
   # Test connection
   psql -h localhost -U localex_user -d localex_production
   ```

2. **Redis Connection Issues**
   ```bash
   # Check Redis status
   docker ps | grep redis
   
   # Test connection
   redis-cli ping
   ```

3. **Application Issues**
   ```bash
   # Check application logs
   pm2 logs localex
   
   # Restart application
   pm2 restart localex
   ```

### **Emergency Procedures**

1. **Rollback Procedure**
   ```bash
   # Restore from backup
   ./scripts/backup-restore-system.ps1 restore -BackupId "backup_id"
   
   # Restart services
   pm2 restart all
   ```

2. **Database Recovery**
   ```bash
   # Restore database from backup
   pg_restore -d localex_production backup.sql
   ```

---

## 📚 **Documentation and Support**

### **Additional Resources**
- [API Documentation](docs/api/)
- [User Guide](docs/users/user-guide.md)
- [Developer Guide](docs/engineers/setup-guide.md)
- [Security Guide](docs/security/)
- [Monitoring Guide](docs/monitoring/)

### **Support Contacts**
- **Technical Issues**: support@localex.com
- **Security Issues**: security@localex.com
- **Emergency**: +1-XXX-XXX-XXXX

---

## ✅ **Deployment Checklist**

- [ ] Environment prepared and dependencies installed
- [ ] Database configured and migrated
- [ ] Infrastructure services running (Redis, OpenSearch, S3)
- [ ] Application built and deployed with PM2
- [ ] Nginx configured with SSL
- [ ] AI services configured (OpenAI, Google Vision)
- [ ] Monitoring and logging configured
- [ ] Backup system configured
- [ ] Security measures implemented
- [ ] Performance testing completed
- [ ] Health checks passing
- [ ] Documentation updated

---

**🎉 Congratulations! Your LocalEx v7 platform is now deployed and ready for production use!**

*For ongoing maintenance and updates, refer to the [Maintenance Guide](docs/deployment/maintenance-guide.md).*
