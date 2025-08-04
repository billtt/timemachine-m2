import { Response } from 'express';
import crypto from 'crypto';
import { Slice } from '../models/Slice';
import { AuthenticatedRequest } from '../middleware/auth';
import { SLICE_TYPES } from '../types/shared';

export const rotateEncryptionKey = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { oldKey, newKey } = req.body;
    const username = req.user!.username; // Use username, not id

    // Validate input
    if (typeof oldKey !== 'string' || typeof newKey !== 'string') {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid key format' 
      });
      return;
    }

    // Fetch all user slices (use username, not userId)
    const slices = await Slice.find({ user: username });
    let processedCount = 0;

    // Process each slice
    for (let i = 0; i < slices.length; i++) {
      const slice = slices[i]!; // TypeScript assertion - array access is safe here
      try {
        let content = slice.content;
        
        // Decrypt with old key if provided and not empty
        if (oldKey && oldKey.trim() !== '') {
          content = await decryptContent(content, oldKey);
        }
        
        // Encrypt with new key if provided and not empty
        if (newKey && newKey.trim() !== '') {
          content = await encryptContent(content, newKey);
          
          // Generate new search tokens
          slice.searchTokens = await generateServerSearchTokens(
            await decryptContent(content, newKey), 
            newKey
          );
        } else {
          // Clear search tokens if no encryption
          slice.searchTokens = [];
        }
        
        slice.content = content;
        
        // Handle unknown slice types by normalizing them to 'other'
        if (!SLICE_TYPES.includes(slice.type as any)) {
          console.warn(`Unknown slice type '${slice.type}' found for slice ${slice._id}, normalizing to 'other'`);
          slice.type = 'other' as any;
        }
        
        await slice.save();
        processedCount++;
      } catch (error) {
        // Handle validation errors specifically
        if (error instanceof Error && error.message.includes('is not a valid enum value for path `type`')) {
          console.warn(`Validation error for slice ${slice._id}: ${error.message}`);
          try {
            // Force set type to 'other' and retry save
            slice.type = 'other' as any;
            await slice.save();
            processedCount++;
            console.warn(`Successfully normalized slice ${slice._id} type to 'other'`);
          } catch (retryError) {
            console.error(`Failed to save slice ${slice._id} even after type normalization:`, retryError);
          }
        } else {
          console.error(`Failed to process slice ${slice._id}:`, error);
        }
        // Continue processing other slices even if one fails
      }
    }

    
    res.json({ 
      success: true, 
      message: 'Encryption key updated successfully',
      data: {
        success: true,
        slicesUpdated: processedCount 
      }
    });
  } catch (error) {
    console.error('Key rotation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update encryption key',
      message: 'Failed to update encryption key'
    });
  }
};

// Server-side encryption helpers (for key rotation only)
async function encryptContent(content: string, key: string): Promise<string> {
  try {
    if (!content || !key) return content;

    const iv = crypto.randomBytes(12);
    const keyBuffer = Buffer.from(key, 'base64').slice(0, 32);
    
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(content, 'utf8'),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();
    // Match client format: iv + (ciphertext + auth tag)
    const combined = Buffer.concat([iv, encrypted, tag]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Server encryption error:', error);
    return content; // Return original if encryption fails
  }
}

async function decryptContent(encrypted: string, key: string): Promise<string> {
  try {
    if (!encrypted || !key) return encrypted;
    
    // Check if content looks like base64
    if (!/^[A-Za-z0-9+/]+=*$/.test(encrypted)) {
      return encrypted; // Not encrypted
    }

    const combined = Buffer.from(encrypted, 'base64');
    
    // Need at least 12 bytes IV + 16 bytes auth tag + some data  
    if (combined.length < 29) {
      return encrypted;
    }

    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12); // Everything after IV (includes auth tag)
    
    // For Node.js crypto, we need to separate the auth tag from ciphertext
    // Web Crypto combines them, so the last 16 bytes are the auth tag
    const tag = encryptedData.slice(-16);
    const ciphertext = encryptedData.slice(0, -16);
    
    const keyBuffer = Buffer.from(key, 'base64').slice(0, 32);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(tag); // Set auth tag for verification
    
    const decrypted = decipher.update(ciphertext) + decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // If decryption fails, return as-is (might be unencrypted content)
    return encrypted;
  }
}

async function generateServerSearchTokens(content: string, key: string): Promise<string[]> {
  try {
    if (!content || !key) return [];

    const tokens: string[] = [];
    const normalized = content.toLowerCase().trim();
    
    // Skip if content is too short for bigrams
    if (normalized.length < 2) return [];
    
    // Generate 2-character bigram tokens
    for (let i = 0; i <= normalized.length - 2; i++) {
      const bigram = normalized.substring(i, i + 2);
      const hash = crypto.createHash('sha256')
        .update(key + bigram)
        .digest('base64')
        .substring(0, 16);
      tokens.push(hash);
    }
    
    return [...new Set(tokens)]; // Remove duplicates
  } catch (error) {
    console.error('Search token generation error:', error);
    return [];
  }
}