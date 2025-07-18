import dotenv from 'dotenv';
import app from './app';
import { connectDatabase } from './config/database';

// Load environment variables
// Try multiple env file locations based on NODE_ENV
const isDevelopment = process.env.NODE_ENV === 'development';
const envFiles = isDevelopment ? [
  '.env.dev',
  '.env.development',
  '.env',
  'server/.env.dev',
  'server/.env.development',
  'server/.env'
] : [
  '.env.production',
  '.env',
  'server/.env.production',
  'server/.env'
];

let loadedEnvFile = 'none';
for (const envFile of envFiles) {
  try {
    const result = dotenv.config({ path: envFile });
    if (!result.error) {
      loadedEnvFile = envFile;
      break;
    }
  } catch {
    // Continue to next file
  }
}

// Debug: Log environment loading
console.log(`🔧 Loading environment from: ${loadedEnvFile}`);
console.log(`📝 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔑 JWT_SECRET loaded: ${process.env.JWT_SECRET ? 'YES' : 'NO'}`);
console.log(`🗄️ MONGODB_URI loaded: ${process.env.MONGODB_URI ? 'YES' : 'NO'}`);

// Additional debug: Show first few characters of JWT_SECRET if it exists
if (process.env.JWT_SECRET) {
  console.log(`🔑 JWT_SECRET preview: ${process.env.JWT_SECRET.substring(0, 8)}...`);
}

const PORT = process.env.PORT || 5000;
let server: any; // eslint-disable-line @typescript-eslint/no-explicit-any

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  
  // Close server
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
  
  // Force close after timeout
  setTimeout(() => {
    console.log('⏰ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Start HTTP server
    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API available at: http://localhost:${PORT}/api`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Export for testing
export { app };

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}