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

  // Decrypt content
  async decrypt(encryptedContent: string): Promise<string> {
    if (!this.isEncryptionEnabled() || !encryptedContent) return encryptedContent;

    // When encryption is enabled, always attempt to decrypt
    // If content is not encrypted, show error message
    try {
      // First, check if it looks like proper base64 encrypted data
      const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(encryptedContent);
      const isLongEnough = encryptedContent.length > 16; // Encrypted content should be longer
      
      if (!isBase64 || !isLongEnough) {
        // Content doesn't look like encrypted data
        return `🔒 [Incorrect Key]`;
      }

      // Try to decode base64
      const combined = Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0));
      
      // Minimum size check (12 bytes IV + at least some data)
      if (combined.length < 13) {
        return `🔒 [Incorrect Key]`;
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
      // Any decryption failure should show the error message
      return `🔒 [Incorrect Key]`;
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