// Shared constants between client and server

// Encryption-related messages and placeholders
export const ENCRYPTION_MESSAGES = {
  INCORRECT_KEY: '🔒 [Incorrect Key]',
  EMPTY_CONTENT: '[Empty Content]',
  MISSING_CONTENT: '[Missing Content - Restored]',
  NULL_CONTENT: '[Null Content - Restored]',
  INVALID_CONTENT: '[Invalid Content Type - Restored]'
} as const;

// Configuration for encryption display
export const ENCRYPTION_CONFIG = {
  LOCK_ICON: '🔒',
  INCORRECT_KEY_TEXT: '[Incorrect Key]'
} as const;

// Type for accessing message keys
export type EncryptionMessageKey = keyof typeof ENCRYPTION_MESSAGES;