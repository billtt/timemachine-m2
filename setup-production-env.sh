#!/bin/bash

# Setup production environment variables
# This script should be run on your production server

echo "Setting up production environment for TimeMachine 2.0..."

# Generate a secure JWT secret if not already set
if [ -z "$JWT_SECRET" ]; then
    echo "Generating secure JWT secret..."
    JWT_SECRET=$(openssl rand -hex 32)
    echo "Generated JWT_SECRET: $JWT_SECRET"
fi

# Create .env file for production
cat > /data/time2/server/.env.production << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=3003

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/time

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12

# CORS
CORS_ORIGIN=https://time2.bill.tt

# Optional: Security monitoring
LEGACY_PASSWORD_SUPPORT=true
AUTO_UPGRADE_LEGACY_PASSWORDS=true
LOG_LEGACY_PASSWORD_USAGE=true

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

echo "Production environment file created at /data/time2/server/.env.production"
echo ""
echo "🔐 IMPORTANT SECURITY NOTE:"
echo "Your JWT_SECRET is: $JWT_SECRET"
echo "Please save this securely - you'll need it if you ever need to recreate the environment"
echo ""
echo "✅ Next steps:"
echo "1. Run 'npm run build' to build the project"
echo "2. Run 'pm2 restart time2' to restart the application"
echo "3. Check logs with 'pm2 logs time2'"