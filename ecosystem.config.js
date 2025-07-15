module.exports = {
  apps: [
    {
      name: 'time2',
      script: './server/dist/index.js',
      cwd: '/data/time2',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        MONGODB_URI: 'mongodb://127.0.0.1:27017/time',
        JWT_SECRET: 'CHANGE-THIS-TO-A-SECURE-SECRET-KEY-IN-PRODUCTION',
        JWT_EXPIRES_IN: '7d',
        BCRYPT_ROUNDS: '12',
        CORS_ORIGIN: 'https://time2.bill.tt'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003,
        MONGODB_URI: 'mongodb://127.0.0.1:27017/time',
        JWT_SECRET: 'CHANGE-THIS-TO-A-SECURE-SECRET-KEY-IN-PRODUCTION',
        JWT_EXPIRES_IN: '7d',
        BCRYPT_ROUNDS: '12',
        CORS_ORIGIN: 'https://time2.bill.tt'
      },
      error_file: '/var/log/pm2/time2-error.log',
      out_file: '/var/log/pm2/time2-out.log',
      log_file: '/var/log/pm2/time2.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      listen_timeout: 8000,
      wait_ready: true,
      // Health check
      health_check_grace_period: 3000,
      // Auto restart settings
      autorestart: true,
      restart_delay: 4000,
      // Logging
      log_type: 'json',
      combine_logs: true,
      // Process management
      vizion: false,
      // Environment variables for production
      env_file: '/data/time2/server/.env.production'
    }
  ]
};