/**
 * Security utilities for monitoring and managing password security
 */

import { User } from '../models/User';
import { SECURITY_CONFIG } from '../config/security';

/**
 * Get statistics about password formats in the database
 */
export async function getPasswordSecurityStats() {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          bcryptUsers: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$password', null] }, { $ne: ['$password', ''] }] },
                1,
                0
              ]
            }
          },
          legacyUsers: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$key', null] }, { $ne: ['$key', ''] }] },
                1,
                0
              ]
            }
          },
          mixedUsers: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$password', null] },
                    { $ne: ['$password', ''] },
                    { $ne: ['$key', null] },
                    { $ne: ['$key', ''] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalUsers: 0,
      bcryptUsers: 0,
      legacyUsers: 0,
      mixedUsers: 0
    };

    return {
      ...result,
      onlyBcrypt: result.bcryptUsers - result.mixedUsers,
      onlyLegacy: result.legacyUsers - result.mixedUsers,
      migrationProgress: result.totalUsers > 0 ? 
        ((result.bcryptUsers / result.totalUsers) * 100).toFixed(1) : '0.0'
    };
  } catch (error) {
    console.error('Error getting password security stats:', error);
    return {
      totalUsers: 0,
      bcryptUsers: 0,
      legacyUsers: 0,
      mixedUsers: 0,
      onlyBcrypt: 0,
      onlyLegacy: 0,
      migrationProgress: '0.0'
    };
  }
}

/**
 * Log security-related events
 */
export function logSecurityEvent(event: string, details: any) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    details,
    config: {
      legacySupport: SECURITY_CONFIG.LEGACY_PASSWORD_SUPPORT,
      autoUpgrade: SECURITY_CONFIG.AUTO_UPGRADE_LEGACY_PASSWORDS
    }
  };

  console.log('SECURITY EVENT:', JSON.stringify(logEntry, null, 2));
}

/**
 * Check if password meets security requirements
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} characters long`);
  }

  // Add more password strength requirements here if needed
  // - Must contain uppercase
  // - Must contain lowercase  
  // - Must contain numbers
  // - Must contain special characters
  // - Must not be common password

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get legacy users that need password migration
 */
export async function getLegacyUsersForMigration() {
  try {
    const legacyUsers = await User.find({
      key: { $exists: true, $ne: null },
      $or: [
        { password: { $exists: false } },
        { password: null },
        { password: '' }
      ]
    }).select('name createdAt updatedAt');

    return legacyUsers.map(user => ({
      id: user._id,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
  } catch (error) {
    console.error('Error getting legacy users:', error);
    return [];
  }
}