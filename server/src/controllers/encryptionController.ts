import { Response } from 'express';
import crypto from 'crypto';
import { Slice } from '../models/Slice';
import { AuthenticatedRequest } from '../middleware/auth';
import { SLICE_TYPES } from '../types/shared';

export const rotateEncryptionKey = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { oldKey, newKey } = req.body;
    const username = req.user!.username;

    // Validate input
    if (typeof oldKey !== 'string' || typeof newKey !== 'string') {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid key format' 
      });
      return;
    }

    // SAFETY MEASURE 1: Validate old key by testing decryption on sample slices
    const validationSlices = await Slice.find({ user: username })
      .sort({ createdAt: -1 })
      .limit(10);

    if (validationSlices.length === 0) {
      // No slices to validate - allow operation
    } else {
      // Test old key on validation slices
      let validationSuccess = 0;
      let validationFailures = 0;

      for (const slice of validationSlices) {
        try {
          if (oldKey && oldKey.trim() !== '') {
            // If old key is provided, content should be encrypted - try to decrypt strictly
            await decryptContentStrict(slice.content, oldKey, true);
            validationSuccess++;
          } else {
            // If no old key, content should be unencrypted - check if it looks like plaintext
            const isEncrypted = /^[A-Za-z0-9+/]+=*$/.test(slice.content) && slice.content.length > 16;
            if (!isEncrypted) {
              validationSuccess++;
            } else {
              validationFailures++;
            }
          }
        } catch (error) {
          console.error(`Old key validation failed for slice ${slice._id}:`, error instanceof Error ? error.message : error);
          validationFailures++;
        }
      }

      // If more than half of validation slices fail, reject the operation
      if (validationFailures > validationSuccess) {
        res.status(400).json({
          success: false,
          error: 'Old key validation failed. The provided old key cannot decrypt existing content.',
          details: `Validation failed on ${validationFailures} out of ${validationSlices.length} recent slices`
        });
        return;
      }
    }

    // Fetch all user slices for processing
    const slices = await Slice.find({ user: username });
    let processedCount = 0;

    // PRE-ROTATION VALIDATION: Check for problematic slices before starting
    console.log('Pre-rotation validation: Checking for problematic slices...');
    const problematicSlices = slices.filter(slice => {
      return !slice.content || 
             typeof slice.content !== 'string' || 
             slice.content.length === 0;
    });

    if (problematicSlices.length > 0) {
      console.error(`Found ${problematicSlices.length} slices with invalid content that must be fixed first:`);
      for (const slice of problematicSlices) {
        console.error(`  - Slice ${slice._id}: content is ${typeof slice.content}, length: ${slice.content?.length}`);
      }

      res.status(400).json({
        success: false,
        error: 'Database contains slices with invalid content that must be fixed before key rotation',
        details: `Found ${problematicSlices.length} slices with empty or invalid content. Please run the database repair script first.`,
        problematicSliceIds: problematicSlices.map(s => s._id?.toString())
      });
      return;
    }

    console.log('✅ Pre-rotation validation passed. All slices have valid content.');

    // SAFETY MEASURE 2: Two-phase process using temporary content field
    
    // PHASE 1: Generate new content and store in temporary field
    console.log(`Phase 1: Generating temporary content for ${slices.length} slices`);
    
    for (let i = 0; i < slices.length; i++) {
      const slice = slices[i]!;
      try {
        let content = slice.content;
        
        // Validate original content
        if (!content || typeof content !== 'string') {
          console.error(`Slice ${slice._id} has invalid original content:`, {
            type: typeof content,
            length: content?.length,
            sliceType: slice.type,
            sliceTime: slice.time,
            sliceUser: slice.user
          });
          
          // Handle empty/null content by setting a placeholder
          if (content === null || content === undefined) {
            console.warn(`Setting placeholder content for slice ${slice._id} with null/undefined content`);
            content = '[Empty Content]';
          } else {
            throw new Error(`Slice ${slice._id} has invalid original content: ${typeof content}`);
          }
        }
        
        // Decrypt with old key if provided and not empty
        if (oldKey && oldKey.trim() !== '') {
          const decryptedContent = await decryptContentStrict(content, oldKey, true);
          
          // Validate decrypted content
          if (!decryptedContent || typeof decryptedContent !== 'string') {
            console.error(`Decryption failed for slice ${slice._id}. Original content length: ${content.length}, decrypted: ${typeof decryptedContent}`);
            throw new Error(`Decryption failed for slice ${slice._id} - result is ${typeof decryptedContent}`);
          }
          
          content = decryptedContent;
        }
        
        // Validate content after decryption
        if (!content || typeof content !== 'string') {
          console.error(`Content after decryption is invalid for slice ${slice._id}:`, typeof content);
          throw new Error(`Content after decryption is invalid for slice ${slice._id}`);
        }
        
        // Encrypt with new key if provided and not empty
        if (newKey && newKey.trim() !== '') {
          // Store plaintext content for search token generation before encryption
          const plaintextContent = content;
          
          const encryptedContent = await encryptContent(content, newKey);
          
          // Validate encrypted content
          if (!encryptedContent || typeof encryptedContent !== 'string') {
            console.error(`Encryption failed for slice ${slice._id}. Content length: ${content.length}, encrypted: ${typeof encryptedContent}`);
            throw new Error(`Encryption failed for slice ${slice._id} - result is ${typeof encryptedContent}`);
          }
          
          content = encryptedContent;
          
          // Generate new search tokens using the plaintext content (not encrypted content)
          const newSearchTokens = await generateServerSearchTokens(
            plaintextContent, 
            newKey
          );
          slice.set('tempSearchTokens', newSearchTokens);
        } else {
          // Clear search tokens if no encryption
          slice.set('tempSearchTokens', []);
        }
        
        // Final validation before storing
        if (!content || typeof content !== 'string' || content.length === 0) {
          console.error(`Final content validation failed for slice ${slice._id}:`, {
            type: typeof content,
            length: content?.length,
            isEmpty: content === ''
          });
          
          // If content is empty, set a placeholder that meets schema requirements
          if (content === '' || !content) {
            console.warn(`Setting placeholder for empty content in slice ${slice._id}`);
            content = '[Empty Content]';
          } else {
            throw new Error(`Final content validation failed for slice ${slice._id}: ${typeof content}`);
          }
        }
        
        // Store new content in temporary field
        slice.set('tempContent', content);
        
        // Handle unknown slice types by normalizing them to 'other'
        if (!SLICE_TYPES.includes(slice.type as any)) {
          slice.type = 'other' as any;
        }
        
        // Validate that tempContent is set properly before saving
        const tempContent = slice.get('tempContent');
        if (!tempContent || typeof tempContent !== 'string' || tempContent.length === 0) {
          console.error(`TempContent is invalid before save for slice ${slice._id}:`, {
            type: typeof tempContent,
            tempContentLength: tempContent?.length,
            originalContentType: typeof content,
            originalContentLength: content?.length
          });
          throw new Error(`TempContent is invalid for slice ${slice._id}`);
        }
        
        await slice.save();
        processedCount++;
      } catch (error) {
        // Clean up any temporary fields that were set
        await Slice.updateMany(
          { user: username, tempContent: { $exists: true } },
          { $unset: { tempContent: 1, tempSearchTokens: 1 } }
        );

        console.error(`Phase 1 failed on slice ${slice._id}:`, error);
        res.status(500).json({
          success: false,
          error: 'Key rotation failed during content generation phase',
          details: `Failed on slice ${slice._id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        return;
      }
    }

    // PHASE 2: Verify all slices have temporary content, then commit the changes
    console.log('Phase 2: Verifying temporary content and committing changes');
    
    // Verify all slices have temporary content
    const slicesWithTemp = await Slice.countDocuments({ 
      user: username, 
      tempContent: { $exists: true } 
    });
    
    if (slicesWithTemp !== slices.length) {
      // Clean up temporary fields
      await Slice.updateMany(
        { user: username, tempContent: { $exists: true } },
        { $unset: { tempContent: 1, tempSearchTokens: 1 } }
      );

      res.status(500).json({
        success: false,
        error: 'Key rotation failed: Not all slices have temporary content',
        details: `Expected ${slices.length} slices with temp content, found ${slicesWithTemp}`
      });
      return;
    }

    // Commit changes: Replace content with tempContent and remove temporary fields
    const updateResult = await Slice.updateMany(
      { user: username, tempContent: { $exists: true } },
      [
        {
          $set: {
            content: '$tempContent',
            searchTokens: '$tempSearchTokens'
          }
        },
        {
          $unset: ['tempContent', 'tempSearchTokens']
        }
      ]
    );

    if (updateResult.modifiedCount !== slices.length) {
      console.error(`Warning: Expected to update ${slices.length} slices, but updated ${updateResult.modifiedCount}`);
    }

    console.log(`Key rotation completed successfully for ${processedCount} slices`);
    
    res.json({ 
      success: true, 
      message: 'Encryption key updated successfully',
      data: {
        success: true,
        slicesUpdated: processedCount 
      }
    });
  } catch (error) {
    // Emergency cleanup: Remove any temporary fields
    try {
      await Slice.updateMany(
        { user: req.user!.username, tempContent: { $exists: true } },
        { $unset: { tempContent: 1, tempSearchTokens: 1 } }
      );
    } catch (cleanupError) {
      console.error('Failed to cleanup temporary fields:', cleanupError);
    }

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
    if (!content || !key) {
      console.error('encryptContent: Missing content or key', { 
        hasContent: !!content, 
        hasKey: !!key,
        contentLength: content?.length 
      });
      return content || '';
    }

    if (typeof content !== 'string') {
      console.error('encryptContent: Content is not a string', typeof content);
      throw new Error('Content must be a string');
    }

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
    
    const result = combined.toString('base64');
    
    // Validate result
    if (!result || typeof result !== 'string' || result === undefined || result === null || result.length === 0) {
      console.error('encryptContent: Encryption produced invalid result', {
        type: typeof result,
        value: result,
        length: result?.length
      });
      throw new Error('Encryption produced invalid result');
    }
    
    return result;
  } catch (error) {
    console.error('Server encryption error:', error, {
      contentLength: content?.length,
      keyLength: key?.length
    });
    return content; // Return original if encryption fails
  }
}

async function decryptContent(encrypted: string, key: string): Promise<string> {
  return await decryptContentStrict(encrypted, key, false);
}

async function decryptContentStrict(encrypted: string, key: string, strictMode: boolean = true): Promise<string> {
  try {
    if (!encrypted || !key) {
      console.error('decryptContent: Missing encrypted content or key', { 
        hasEncrypted: !!encrypted, 
        hasKey: !!key,
        encryptedLength: encrypted?.length 
      });
      if (strictMode) {
        throw new Error('Missing encrypted content or key');
      }
      return encrypted || '';
    }
    
    // Check if content looks like base64
    if (!/^[A-Za-z0-9+/]+=*$/.test(encrypted)) {
      if (strictMode) {
        throw new Error('Content does not appear to be encrypted (not base64)');
      }
      // Content doesn't look encrypted, return as-is
      return encrypted;
    }

    const combined = Buffer.from(encrypted, 'base64');
    
    // Need at least 12 bytes IV + 16 bytes auth tag + some data  
    if (combined.length < 29) {
      if (strictMode) {
        throw new Error('Encrypted content too short to be valid');
      }
      // Too short to be properly encrypted, return as-is
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
    
    const decryptedPart1 = decipher.update(ciphertext);
    const decryptedPart2 = decipher.final('utf8');
    const decrypted = decryptedPart1 + decryptedPart2;
    
    // Validate decrypted result
    if (typeof decrypted !== 'string' || decrypted === undefined || decrypted === null) {
      console.error('decryptContent: Decryption returned invalid result', {
        type: typeof decrypted,
        value: decrypted,
        part1Type: typeof decryptedPart1,
        part2Type: typeof decryptedPart2
      });
      throw new Error('Decryption returned invalid result');
    }
    
    return decrypted;
  } catch (error) {
    console.error('decryptContent: Decryption failed:', error, {
      encryptedLength: encrypted?.length,
      keyLength: key?.length
    });
    
    if (strictMode) {
      // For key rotation, decryption failure should throw an error, not fall back
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } else {
      // For general use, return content as-is (might be unencrypted)
      return encrypted;
    }
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