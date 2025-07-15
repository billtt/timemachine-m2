/**
 * Security configuration for password migration and authentication
 */

export const SECURITY_CONFIG = {
  // Password requirements
  PASSWORD_MIN_LENGTH: 6,
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  
  // Legacy password support
  LEGACY_PASSWORD_SUPPORT: process.env.LEGACY_PASSWORD_SUPPORT !== 'false', // Default: enabled
  AUTO_UPGRADE_LEGACY_PASSWORDS: process.env.AUTO_UPGRADE_LEGACY_PASSWORDS !== 'false', // Default: enabled
  
  // Security monitoring
  LOG_LEGACY_PASSWORD_USAGE: process.env.LOG_LEGACY_PASSWORD_USAGE !== 'false', // Default: enabled
  
  // Rate limiting (if you want to implement it)
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
  LOCKOUT_DURATION: parseInt(process.env.LOCKOUT_DURATION || '15') * 60 * 1000, // 15 minutes
  
  // Legacy password salt (from v1.0)
  LEGACY_PASSWORD_SALT: '.time.js'
};

/**
 * Security recommendations for production deployment
 */
export const SECURITY_RECOMMENDATIONS = {
  // After all users have been migrated, disable legacy password support
  DISABLE_LEGACY_SUPPORT_AFTER_MIGRATION: true,
  
  // Monitor legacy password usage and encourage users to change passwords
  ENCOURAGE_PASSWORD_CHANGE: true,
  
  // Consider implementing additional security measures
  IMPLEMENT_2FA: false, // Future enhancement
  IMPLEMENT_PASSWORD_HISTORY: false, // Future enhancement
  IMPLEMENT_SESSION_MANAGEMENT: false, // Future enhancement
};