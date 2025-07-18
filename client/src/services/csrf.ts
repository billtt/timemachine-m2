
class CSRFService {
  private csrfToken: string | null = null;
  private tokenPromise: Promise<string> | null = null;

  /**
   * Get CSRF token, fetching from server if needed
   */
  async getToken(): Promise<string> {
    // If we have a valid token, return it
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // If we're already fetching a token, wait for that promise
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    // Fetch new token
    this.tokenPromise = this.fetchToken();
    
    try {
      this.csrfToken = await this.tokenPromise;
      return this.csrfToken;
    } finally {
      this.tokenPromise = null;
    }
  }

  /**
   * Fetch CSRF token from server
   */
  private async fetchToken(): Promise<string> {
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const data = await response.json();
      
      if (!data.success || !data.csrfToken) {
        throw new Error('Invalid CSRF token response');
      }

      return data.csrfToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      throw error;
    }
  }

  /**
   * Clear stored token (e.g., on auth error or logout)
   */
  clearToken() {
    this.csrfToken = null;
    this.tokenPromise = null;
  }

  /**
   * Refresh token (force fetch new token)
   */
  async refreshToken(): Promise<string> {
    this.clearToken();
    return this.getToken();
  }

  /**
   * DEBUG: Force clear token for testing
   * @description Use this in browser console to test CSRF expiration
   */
  debugClearToken() {
    console.log('[DEBUG] Clearing CSRF token for testing');
    this.clearToken();
    // Also try to clear server-side cookie
    document.cookie = 'csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  /**
   * DEBUG: Get current token state
   */
  debugGetTokenState() {
    return {
      hasToken: !!this.csrfToken,
      token: this.csrfToken ? `${this.csrfToken.substring(0, 10)}...` : null,
      isFetching: !!this.tokenPromise
    };
  }
}

export const csrfService = new CSRFService();

// Expose to window for debugging in production
if (typeof window !== 'undefined') {
  (window as any).__csrfService = csrfService;
}

export default csrfService;