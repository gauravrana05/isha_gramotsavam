/**
 * Isha SSO OIDC Integration
 * Based on the OIDC documentation provided
 */

interface IshaOIDCConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface IshaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  id_token: string;
}

interface IshaUserInfo {
  sub: string;
  phone_number: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  profile?: string;
}

class IshaSSO {
  private config: IshaOIDCConfig;

  constructor() {
    this.config = {
      issuer: process.env.ISHA_OIDC_ISSUER || 'https://isha.auth.ac',
      clientId: process.env.ISHA_OIDC_CLIENT_ID || '',
      clientSecret: process.env.ISHA_OIDC_CLIENT_SECRET || '',
      redirectUri: process.env.ISHA_OIDC_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/isha',
    };
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate authorization URL for OIDC login
   */
  async getAuthorizationUrl(): Promise<{ url: string; codeVerifier: string }> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateCodeVerifier(); // Use same function for state

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'openid profile phone email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `${this.config.issuer}/oidc/authorize?${params.toString()}`;

    return {
      url: authUrl,
      codeVerifier,
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<IshaTokenResponse> {
    const tokenEndpoint = `${this.config.issuer}/oidc/token`;

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
    }

    return response.json();
  }

  /**
   * Get user information using access token
   */
  async getUserInfo(accessToken: string): Promise<IshaUserInfo> {
    const userInfoEndpoint = `${this.config.issuer}/oidc/userinfo`;

    const response = await fetch(userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<IshaTokenResponse> {
    const tokenEndpoint = `${this.config.issuer}/oidc/token`;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Logout user by revoking tokens
   */
  async logout(accessToken: string): Promise<void> {
    const revokeEndpoint = `${this.config.issuer}/revoke`;

    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      token: accessToken,
      token_type_hint: 'access_token',
    });

    const response = await fetch(revokeEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      console.error('Token revocation failed:', response.status);
      // Don't throw error as logout should still proceed
    }
  }

  /**
   * Decode JWT token payload
   */
  decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }

  /**
   * Verify JWT token signature (simplified - in production use proper JWT library)
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      const decoded = this.decodeJWT(token);
      
      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return false;
      }

      // Check issuer
      if (decoded.iss !== this.config.issuer) {
        return false;
      }

      // Check audience
      if (decoded.aud !== this.config.clientId) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const ishaSSO = new IshaSSO();

// Export types
export type { IshaTokenResponse, IshaUserInfo };