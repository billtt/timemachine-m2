import { ENCRYPTION_MESSAGES } from '../../../shared/constants';
import apiService from './api';

export class EncryptionService {
  private static readonly STORAGE_KEY = 'timemachine_encryption_key';
  private encryptionKey: string | null = null;

  // Initialize from storage
  async initialize(): Promise<void> {
    try {
      this.encryptionKey = localStorage.getItem(EncryptionService.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to initialize encryption service:', error);
      this.encryptionKey = null;
    }
  }

  // Transform user password to encryption key
  async deriveKey(password: string): Promise<string> {
    if (!password) return '';
    
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  }

  // Set encryption password
  async setPassword(password: string): Promise<void> {
    const key = await this.deriveKey(password);
    this.encryptionKey = key;
    if (key) {
      localStorage.setItem(EncryptionService.STORAGE_KEY, key);
    } else {
      localStorage.removeItem(EncryptionService.STORAGE_KEY);
    }
  }

  // Get current key (for key rotation)
  getStoredKey(): string | null {
    this.ensureInitialized();
    return this.encryptionKey;
  }

  // Clear encryption key (for logout)
  clearStoredKey(): void {
    this.encryptionKey = null;
    localStorage.removeItem(EncryptionService.STORAGE_KEY);
  }

  // Ensure service is initialized
  private ensureInitialized(): void {
    if (this.encryptionKey === null) {
      try {
        this.encryptionKey = localStorage.getItem(EncryptionService.STORAGE_KEY);
      } catch (error) {
        this.encryptionKey = '';
      }
    }
  }

  // Check if encryption is enabled
  isEncryptionEnabled(): boolean {
    this.ensureInitialized();
    return !!this.encryptionKey && this.encryptionKey.length > 0;
  }

  // Validate that the current local key state matches server content state
  async validateLocalKey(): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Fetch only content fields for efficiency
      const data = await apiService.getSliceContents({ limit: 5 });
      const contents = data.contents || [];

      if (contents.length === 0) {
        return { isValid: true }; // No slices to validate against
      }

      // Try to decrypt each content - fail if any fail
      for (const content of contents) {
        if (!content || typeof content !== 'string') continue;

        try {
          await this.decrypt(content);
        } catch (error) {
          // Any decryption failure means validation fails
          if (error instanceof Error) {
            return { isValid: false, error: error.message };
          }
          return { isValid: false, error: 'Decryption failed' };
        }
      }

      // All contents decrypted successfully
      return { isValid: true };

    } catch (error) {
      return { 
        isValid: false, 
        error: `Key validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Encrypt content
  async encrypt(content: string): Promise<string> {
    if (!this.isEncryptionEnabled() || !content) return content;

    try {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await this.importKey(this.encryptionKey!);
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(content)
      );

      // Combine iv + encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      return content; // Fallback to unencrypted
    }
  }

  // Decrypt content - throws error if decryption fails
  async decrypt(encryptedContent: string): Promise<string> {
    if (!encryptedContent) return encryptedContent;

    // Check if content looks like encrypted data (base64 with reasonable length)
    const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(encryptedContent);
    const isLongEnough = encryptedContent.length > 16; // Encrypted content should be longer
    
    // If content doesn't look encrypted, return as-is (probably plaintext)
    if (!isBase64 || !isLongEnough) {
      return encryptedContent;
    }

    // Content appears to be encrypted, but check if we have a key
    if (!this.isEncryptionEnabled()) {
      throw new Error('Content is encrypted but no local encryption key is set');
    }

    // We have a key and content looks encrypted - attempt to decrypt
    try {
      // Try to decode base64
      const combined = Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0));
      
      // Minimum size check (12 bytes IV + at least some data)
      if (combined.length < 13) {
        throw new Error('Encrypted content too short to be valid');
      }

      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const key = await this.importKey(this.encryptionKey!);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      throw new Error('Decryption failed - incorrect key or corrupted data');
    }
  }

  // Get display text for content (handles decryption errors gracefully)
  async getDisplayText(content: string): Promise<string> {
    try {
      return await this.decrypt(content);
    } catch (error) {
      // Return appropriate placeholder based on error type
      if (error instanceof Error && error.message.includes('no local encryption key')) {
        return ENCRYPTION_MESSAGES.INCORRECT_KEY;
      }
      return ENCRYPTION_MESSAGES.INCORRECT_KEY;
    }
  }

  // Generate search tokens using bigram approach
  async generateSearchTokens(content: string): Promise<string[]> {
    if (!this.isEncryptionEnabled() || !content) return [];

    const tokens: string[] = [];
    const normalized = content.toLowerCase().trim();
    
    // Skip if content is too short for bigrams
    if (normalized.length < 2) return [];
    
    // Generate 2-character bigram tokens
    for (let i = 0; i <= normalized.length - 2; i++) {
      const bigram = normalized.substring(i, i + 2);
      const hash = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(this.encryptionKey + bigram)
      );
      const token = btoa(String.fromCharCode(...new Uint8Array(hash))).substring(0, 16);
      tokens.push(token);
    }
    
    const uniqueTokens = [...new Set(tokens)];
    return uniqueTokens;
  }

  // Generate search tokens for query using bigram approach
  async generateQueryTokens(query: string): Promise<string[]> {
    if (!this.isEncryptionEnabled() || !query) return [];

    const tokens: string[] = [];
    const normalized = query.toLowerCase().trim();
    
    // Must be at least 2 characters for bigram search
    if (normalized.length < 2) return [];
    
    // Generate 2-character bigram tokens (same as content)
    for (let i = 0; i <= normalized.length - 2; i++) {
      const bigram = normalized.substring(i, i + 2);
      const hash = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(this.encryptionKey + bigram)
      );
      const token = btoa(String.fromCharCode(...new Uint8Array(hash))).substring(0, 16);
      tokens.push(token);
    }
    
    const uniqueTokens = [...new Set(tokens)];
    return uniqueTokens;
  }

  private async importKey(keyString: string): Promise<CryptoKey> {
    const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
    
    // Ensure key is 32 bytes for AES-256
    const keyBuffer = new Uint8Array(32);
    keyBuffer.set(keyData.slice(0, 32));
    
    return crypto.subtle.importKey(
      'raw',
      keyBuffer,
      'AES-GCM',
      false,
      ['encrypt', 'decrypt']
    );
  }
}

export const encryptionService = new EncryptionService();