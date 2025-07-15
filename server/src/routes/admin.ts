/**
 * Admin routes for security monitoring and management
 * Note: In production, these should be protected with admin authentication
 */

import express from 'express';
import { getPasswordSecurityStats, getLegacyUsersForMigration } from '../utils/security';
import { SECURITY_CONFIG } from '../config/security';

const router = express.Router();

/**
 * Get password security statistics
 * GET /admin/security/stats
 */
router.get('/security/stats', async (req, res) => {
  try {
    const stats = await getPasswordSecurityStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        config: {
          legacySupport: SECURITY_CONFIG.LEGACY_PASSWORD_SUPPORT,
          autoUpgrade: SECURITY_CONFIG.AUTO_UPGRADE_LEGACY_PASSWORDS,
          bcryptRounds: SECURITY_CONFIG.BCRYPT_ROUNDS
        },
        recommendations: {
          message: stats.onlyLegacy > 0 ? 
            'Some users are still using legacy password format. They will be automatically upgraded on next login.' :
            'All users are using secure bcrypt password format.',
          action: stats.onlyLegacy > 0 ? 
            'Consider notifying users to login to upgrade their passwords.' : 
            'No action needed.'
        }
      }
    });
  } catch (error) {
    console.error('Error getting security stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security statistics'
    });
  }
});

/**
 * Get list of users with legacy passwords
 * GET /admin/security/legacy-users
 */
router.get('/security/legacy-users', async (req, res) => {
  try {
    const legacyUsers = await getLegacyUsersForMigration();
    
    res.json({
      success: true,
      data: {
        count: legacyUsers.length,
        users: legacyUsers
      }
    });
  } catch (error) {
    console.error('Error getting legacy users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get legacy users'
    });
  }
});

export default router;