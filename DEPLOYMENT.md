# TimeMachine 2.0 Production Deployment Guide

This guide will help you deploy TimeMachine 2.0 to your Ubuntu server, replacing the old version while maintaining data compatibility.

## Prerequisites

### System Requirements
- Ubuntu 18.04+ (tested on 20.04 LTS)
- Node.js 18+ and npm
- MongoDB 4.4+
- nginx with SSL/TLS certificates already configured
- PM2 process manager
- At least 2GB RAM, 10GB disk space

### Existing Setup
- Old TimeMachine 1.0 running on the server
- nginx configured with SSL certificates
- MongoDB with existing data

## Pre-Deployment Checklist

### 1. Backup Current System
```bash
# Backup your current application
sudo tar -czf /var/backups/timemachine-1.0-backup-$(date +%Y%m%d).tar.gz -C /var/www/timemachine-1.0 .

# Backup MongoDB database
mongodump --db timemachine --out /var/backups/mongodb-$(date +%Y%m%d)
```

### 2. Update Server Dependencies
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Verify versions
node --version  # Should be 18+
npm --version   # Should be 8+
pm2 --version
```

### 3. Database Migration
The new version is compatible with existing MongoDB data. No migration needed, but verify:
```bash
# Check current database
mongo
> use timemachine
> db.users.count()
> db.slices.count()
> exit
```

## Deployment Steps

### Step 1: Clone Repository to Server
```bash
# SSH to your server
ssh user@yourserver

# Clone the repository to the deployment directory
sudo git clone https://github.com/yourusername/timemachine-2.0.git /data/time2

# Set ownership
sudo chown -R $USER:$USER /data/time2
```

### Step 2: Run Initial Deployment
```bash
# On your server
cd /data/time2
./deploy.sh
```

The deployment script will:
1. Check system requirements
2. Create necessary directories
3. Backup existing installation
4. Install dependencies and build the application
5. Configure nginx
6. Set up PM2 process manager
7. Perform health checks
8. Start services

### Step 3: Configure Environment Variables
```bash
# Edit the production environment file
sudo nano /data/time2/server/.env.production

# Update these values:
MONGODB_URI=mongodb://127.0.0.1:27017/time  # Note: database name changed from 'timemachine' to 'time'
JWT_SECRET=your-auto-generated-secret-here   # Will be auto-generated
CORS_ORIGIN=https://time2.bill.tt            # Your actual domain
```

### Step 4: Update nginx Configuration
```bash
# Edit nginx configuration
sudo nano /etc/nginx/sites-available/time2.bill.tt

# Update the following lines:
server_name time2.bill.tt;
ssl_certificate /path/to/your/ssl/certificate.pem;
ssl_certificate_key /path/to/your/ssl/private.key;

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 5: Database Migration (if needed)
```bash
# If you need to migrate from 'timemachine' to 'time' database
mongo
> use timemachine
> db.copyDatabase('timemachine', 'time')
> use time
> db.users.count()  # Verify data copied
> db.slices.count()
> exit
```

### Step 6: Switch Traffic (Blue-Green Deployment)
```bash
# Disable old site (if applicable)
sudo rm /etc/nginx/sites-enabled/timemachine-1.0

# Enable new site
sudo ln -s /etc/nginx/sites-available/time2.bill.tt /etc/nginx/sites-enabled/

# Test and reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

## Updating the Application

### For Regular Updates
When you have new changes to deploy, simply use the update script:

```bash
# SSH to your server
ssh user@yourserver

# Navigate to the application directory
cd /data/time2

# Run the update script
./update.sh
```

The update script will:
1. Create a backup of the current state
2. Pull the latest changes from git
3. Install/update dependencies
4. Rebuild the application
5. Restart the PM2 process
6. Perform health checks

### Manual Update Process
If you prefer to update manually:

```bash
cd /data/time2

# Backup current state
tar -czf "/var/backups/timemachine/manual-backup-$(date +%Y%m%d-%H%M%S).tar.gz" --exclude=node_modules --exclude=.git .

# Pull latest changes
git pull

# Update dependencies and build
npm run install:all
npm run build

# Restart application
pm2 restart time2

# Check status
pm2 status
pm2 logs time2 --lines 20
```

### Git Workflow Tips
- Keep your `.env.production` files local (they're in `.gitignore`)
- Always commit and push changes before pulling on the server
- Use branches for major changes and merge to main/master when ready
- Tag releases for easy rollback: `git tag -a v2.0.1 -m "Release v2.0.1"`

## Post-Deployment

### Verification Steps
1. **Check Application Status**
   ```bash
   pm2 status
   pm2 logs time2
   ```

2. **Test API Endpoints**
   ```bash
   curl -I https://time2.bill.tt/api/health
   curl -I https://time2.bill.tt/api/csrf-token
   ```

3. **Test Frontend**
   - Visit `https://time2.bill.tt`
   - Try registering/logging in
   - Create a test slice
   - Test search functionality

4. **Monitor Logs**
   ```bash
   # Application logs
   pm2 logs time2
   
   # nginx logs
   sudo tail -f /var/log/nginx/time2.bill.tt.access.log
   sudo tail -f /var/log/nginx/time2.bill.tt.error.log
   ```

### Performance Monitoring
```bash
# Check system resources
htop
df -h
free -h

# Monitor PM2 process
pm2 monit

# Check nginx status
sudo systemctl status nginx
```

## Rollback Plan

### Quick Rollback to Previous Git Commit
If you need to rollback to a previous version:

```bash
cd /data/time2

# See recent commits
git log --oneline -10

# Rollback to specific commit (replace COMMIT_HASH)
git reset --hard COMMIT_HASH

# Or rollback to previous commit
git reset --hard HEAD~1

# Rebuild and restart
npm run install:all
npm run build
pm2 restart time2

# Verify rollback
pm2 status
curl -I https://time2.bill.tt/api/health
```

### Rollback to Tagged Release
If you use git tags for releases:

```bash
cd /data/time2

# List available tags
git tag -l

# Rollback to specific tag
git checkout v2.0.0

# Rebuild and restart
npm run install:all
npm run build
pm2 restart time2
```

### Rollback to Old Version (TimeMachine 1.0)
If you need to completely rollback to the old version:

```bash
# Stop new application
pm2 stop time2
pm2 delete time2

# Restore old nginx configuration
sudo rm /etc/nginx/sites-enabled/time2.bill.tt
sudo ln -s /etc/nginx/sites-available/timemachine-1.0 /etc/nginx/sites-enabled/
sudo systemctl reload nginx

# Restore database if needed
mongo
> use timemachine
> db.dropDatabase()
> use time
> db.copyDatabase('time', 'timemachine')
> exit

# Restore old application from backup
cd /var/www
sudo tar -xzf /var/backups/timemachine-1.0-backup-YYYYMMDD.tar.gz -C timemachine-1.0/
```

## Maintenance

### Regular Tasks
1. **Update Dependencies**
   ```bash
   cd /data/time2
   npm update
   npm audit fix
   ```

2. **Backup Database**
   ```bash
   mongodump --db time --out /var/backups/mongodb-$(date +%Y%m%d)
   ```

3. **Monitor Logs**
   ```bash
   pm2 logs time2 --lines 100
   ```

4. **SSL Certificate Renewal**
   ```bash
   # If using Let's Encrypt
   sudo certbot renew
   sudo systemctl reload nginx
   ```

### Security Updates
- Keep Node.js and npm updated
- Regularly update MongoDB
- Monitor security advisories
- Update nginx and system packages

## Troubleshooting

### Common Issues

1. **Application Won't Start**
   ```bash
   pm2 logs timemachine-2.0
   # Check for missing environment variables or database connection issues
   ```

2. **502 Bad Gateway**
   ```bash
   # Check if backend is running
   pm2 status
   # Check nginx error logs
   sudo tail -f /var/log/nginx/timemachine-2.0.error.log
   ```

3. **CSRF Token Issues**
   ```bash
   # Check if cookies are being set
   curl -I https://yourdomain.com/api/csrf-token
   # Verify CORS_ORIGIN in environment
   ```

4. **Database Connection Issues**
   ```bash
   # Check MongoDB status
   sudo systemctl status mongod
   # Check connection string in .env.production
   ```

### Getting Help
- Check application logs: `pm2 logs time2`
- Check nginx logs: `sudo tail -f /var/log/nginx/time2.bill.tt.error.log`
- Monitor system resources: `htop`, `df -h`, `free -h`
- Test API endpoints manually with curl

## Security Considerations

- Ensure JWT_SECRET is properly generated and secure
- Verify SSL certificates are properly configured
- Keep all dependencies updated
- Monitor for security advisories
- Regular backup of both application and database
- Use fail2ban for additional protection against brute force attacks

## Performance Optimization

- Monitor MongoDB query performance
- Enable nginx caching for static assets
- Consider using Redis for session storage (future enhancement)
- Monitor memory usage and adjust PM2 settings if needed
- Use HTTP/2 for better performance (already enabled in nginx config)