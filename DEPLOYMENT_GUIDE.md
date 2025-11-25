# AifyMS ERP - Deployment Guide

This guide covers deploying the AifyMS ERP system to production.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Security Hardening](#security-hardening)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### System Requirements

**Server Specifications:**
- CPU: 4+ cores
- RAM: 8GB minimum, 16GB recommended
- Storage: 100GB+ SSD
- OS: Ubuntu 20.04 LTS or later

**Software Requirements:**
- Node.js 18+ LTS
- PostgreSQL 15+
- Nginx (reverse proxy)
- PM2 (process manager)
- SSL Certificate (Let's Encrypt)

---

## Database Setup

### 1. Install PostgreSQL

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE aify_erp_production;

# Create user
CREATE USER aify_admin WITH ENCRYPTED PASSWORD 'your_secure_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE aify_erp_production TO aify_admin;

# Exit
\q
```

### 3. Initialize Database Schema

```bash
# Upload init.sql to server
scp database/init.sql user@server:/tmp/

# Run initialization
psql -U aify_admin -d aify_erp_production -f /tmp/init.sql

# Verify tables created
psql -U aify_admin -d aify_erp_production -c "\dt"
```

### 4. Configure PostgreSQL for Production

Edit `/etc/postgresql/15/main/postgresql.conf`:

```conf
# Performance tuning
max_connections = 100
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10485kB
min_wal_size = 1GB
max_wal_size = 4GB
```

Edit `/etc/postgresql/15/main/pg_hba.conf`:

```conf
# Allow local connections
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

---

## Backend Deployment

### 1. Setup Application User

```bash
# Create app user
sudo useradd -m -s /bin/bash aifyapp
sudo su - aifyapp
```

### 2. Clone and Setup Backend

```bash
# Clone repository (or upload files)
cd /home/aifyapp
git clone <your-repo-url> aify-erp
cd aify-erp/backend

# Install dependencies
npm ci --production

# Create .env file
nano .env
```

### 3. Production Environment Variables

Create `/home/aifyapp/aify-erp/backend/.env`:

```env
# Server
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aify_erp_production
DB_USER=aify_admin
DB_PASSWORD=your_secure_password_here
DB_SSL=false

# JWT
JWT_SECRET=your_very_long_random_secret_key_change_this_in_production_min_32_chars
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=https://yourdomain.com

# File Upload
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/aify-erp/backend.log
```

### 4. Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 ecosystem file
nano ecosystem.config.js
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'aify-erp-backend',
    script: './src/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/aify-erp/backend-error.log',
    out_file: '/var/log/aify-erp/backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M'
  }]
};
```

### 5. Start Backend

```bash
# Create log directory
sudo mkdir -p /var/log/aify-erp
sudo chown aifyapp:aifyapp /var/log/aify-erp

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Run the command it outputs

# Check status
pm2 status
pm2 logs aify-erp-backend
```

---

## Frontend Deployment

### 1. Build Frontend

```bash
# On your local machine
cd frontend

# Create production .env
cat > .env.production << EOF
VITE_API_URL=https://api.yourdomain.com/api
EOF

# Build
npm run build

# Upload build to server
scp -r dist/* user@server:/var/www/aify-erp/
```

### 2. Install Nginx

```bash
# On server
sudo apt install nginx -y

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3. Configure Nginx

Create `/etc/nginx/sites-available/aify-erp`:

```nginx
# Frontend
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Root directory
    root /var/www/aify-erp;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Frontend routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Backend API
server {
    listen 80;
    listen [::]:80;
    server_name api.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to backend
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # File upload size
        client_max_body_size 10M;
    }
}
```

### 4. Enable Site and SSL

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com

# Enable site
sudo ln -s /etc/nginx/sites-available/aify-erp /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Setup auto-renewal
sudo certbot renew --dry-run
```

---

## Environment Configuration

### Backend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Backend port | `5000` |
| `DB_HOST` | Database host | `localhost` |
| `DB_NAME` | Database name | `aify_erp_production` |
| `DB_USER` | Database user | `aify_admin` |
| `DB_PASSWORD` | Database password | `secure_password` |
| `JWT_SECRET` | JWT secret key | `min_32_chars_random` |
| `CORS_ORIGIN` | Allowed origins | `https://yourdomain.com` |

### Frontend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.yourdomain.com/api` |

---

## Security Hardening

### 1. Firewall Configuration

```bash
# Install UFW
sudo apt install ufw -y

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 2. Fail2Ban Setup

```bash
# Install Fail2Ban
sudo apt install fail2ban -y

# Configure
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Enable and start
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Database Security

```bash
# Backup database regularly
# Create backup script
cat > /home/aifyapp/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/aifyapp/backups"
mkdir -p $BACKUP_DIR

pg_dump -U aify_admin aify_erp_production | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /home/aifyapp/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/aifyapp/backup-db.sh
```

### 4. Application Security

- [ ] Change default admin password immediately
- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable HTTPS only
- [ ] Set secure cookie flags
- [ ] Implement rate limiting
- [ ] Enable CORS only for your domain
- [ ] Regular security updates

---

## Monitoring & Maintenance

### 1. PM2 Monitoring

```bash
# View logs
pm2 logs aify-erp-backend

# Monitor resources
pm2 monit

# View process info
pm2 info aify-erp-backend
```

### 2. Nginx Monitoring

```bash
# Check access logs
sudo tail -f /var/log/nginx/access.log

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Check status
sudo systemctl status nginx
```

### 3. Database Monitoring

```bash
# Connect to database
psql -U aify_admin -d aify_erp_production

# Check database size
SELECT pg_size_pretty(pg_database_size('aify_erp_production'));

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### 4. System Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Check disk space
df -h

# Check memory
free -h

# Check CPU
htop
```

### 5. Log Rotation

Create `/etc/logrotate.d/aify-erp`:

```conf
/var/log/aify-erp/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 aifyapp aifyapp
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## Backup Strategy

### 1. Database Backups

- **Frequency:** Daily at 2 AM
- **Retention:** 30 days
- **Location:** `/home/aifyapp/backups/`
- **Off-site:** Copy to S3/cloud storage weekly

### 2. File Backups

```bash
# Backup uploaded files
rsync -avz /home/aifyapp/aify-erp/backend/uploads/ /backup/uploads/

# Backup configuration
tar -czf /backup/config_$(date +%Y%m%d).tar.gz \
    /home/aifyapp/aify-erp/backend/.env \
    /etc/nginx/sites-available/aify-erp
```

### 3. Restore Procedure

```bash
# Restore database
gunzip < backup_20250125_020000.sql.gz | psql -U aify_admin -d aify_erp_production

# Restore files
rsync -avz /backup/uploads/ /home/aifyapp/aify-erp/backend/uploads/
```

---

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer:** Add Nginx load balancer
2. **Multiple Backend Instances:** Increase PM2 instances
3. **Database Replication:** Setup PostgreSQL read replicas
4. **CDN:** Use CloudFlare for static assets

### Vertical Scaling

1. **Increase RAM:** 16GB → 32GB
2. **Add CPU Cores:** 4 → 8 cores
3. **Upgrade Storage:** HDD → SSD
4. **Optimize Database:** Tune PostgreSQL parameters

---

## Troubleshooting

### Backend Not Starting

```bash
# Check logs
pm2 logs aify-erp-backend

# Check environment
pm2 env 0

# Restart
pm2 restart aify-erp-backend
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### High Memory Usage

```bash
# Check PM2 processes
pm2 list

# Restart with memory limit
pm2 restart aify-erp-backend --max-memory-restart 500M
```

---

## Post-Deployment Checklist

- [ ] Database initialized with init.sql
- [ ] Backend running on PM2
- [ ] Frontend built and deployed
- [ ] Nginx configured and running
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Backups scheduled
- [ ] Monitoring setup
- [ ] Default passwords changed
- [ ] DNS configured
- [ ] Email notifications setup
- [ ] Documentation updated

---

## Support & Maintenance

### Regular Tasks

**Daily:**
- Check application logs
- Monitor system resources
- Verify backups completed

**Weekly:**
- Review security logs
- Check disk space
- Update packages

**Monthly:**
- Security audit
- Performance review
- Database optimization
- Update dependencies

---

**Deployment Complete!**

Your AifyMS ERP system is now running in production. Monitor the system closely for the first few days and address any issues promptly.
