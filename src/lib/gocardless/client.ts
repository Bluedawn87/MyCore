// GoCardless Bank Account Data API Client

import type {
  GoCardlessInstitution,
  GoCardlessRequisition,
  GoCardlessAccount,
  GoCardlessAccountDetails,
  GoCardlessBalance,
  GoCardlessTransaction,
  GoCardlessError,
} from '@/types/finances';

interface GoCardlessConfig {
  secretId: string;
  secretKey: string;
  baseUrl?: string;
}

interface TokenResponse {
  access: string;
  access_expires: number;
  refresh: string;
  refresh_expires: number;
}

export class GoCardlessClient {
  private config: GoCardlessConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(config: GoCardlessConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://bankaccountdata.gocardless.com/api/v2';
  }

  // Authentication
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await fetch(`${this.baseUrl}/token/new/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret_id: this.config.secretId,
          secret_key: this.config.secretKey,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Authentication failed: ${error.detail || response.statusText}`);
      }

      const tokenData: TokenResponse = await response.json();
      this.accessToken = tokenData.access;
      this.tokenExpiry = Date.now() + (tokenData.access_expires * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('GoCardless authentication error:', error);
      throw error;
    }
  }

  // Generic API request method
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: GoCardlessError = await response.json();
      throw new Error(`API Error: ${error.detail || error.summary || response.statusText}`);
    }

    return response.json();
  }

  // Get available institutions by country
  async getInstitutions(countryCode: string): Promise<GoCardlessInstitution[]> {
    try {
      const response = await this.apiRequest<GoCardlessInstitution[]>(
        `/institutions/?country=${countryCode.toUpperCase()}`
      );
      return response;
    } catch (error) {
      console.error('Error fetching institutions:', error);
      throw error;
    }
  }

  // Create end user agreement (optional, uses defaults if not called)
  async createEndUserAgreement(
    institutionId: string,
    options: {
      maxHistoricalDays?: number;
      accessValidForDays?: number;
      accessScope?: string[];
    } = {}
  ): Promise<{ id: string }> {
    try {
      const agreementData = {
        institution_id: institutionId,
        max_historical_days: options.maxHistoricalDays || 90,
        access_valid_for_days: options.accessValidForDays || 90,
        access_scope: options.accessScope || ['balances', 'details', 'transactions'],
      };

      const response = await this.apiRequest<{ id: string }>(
        '/agreements/enduser/',
        {
          method: 'POST',
          body: JSON.stringify(agreementData),
        }
      );
      return response;
    } catch (error) {
      console.error('Error creating end user agreement:', error);
      throw error;
    }
  }

  // Create requisition for bank account linking
  async createRequisition(
    institutionId: string,
    redirectUrl: string,
    userLanguage: string = 'EN',
    reference?: string,
    agreementId?: string
  ): Promise<GoCardlessRequisition> {
    try {
      const requisitionData = {
        redirect: redirectUrl,
        institution_id: institutionId,
        user_language: userLanguage,
        ...(reference && { reference }),
        ...(agreementId && { agreement: agreementId }),
      };

      const response = await this.apiRequest<GoCardlessRequisition>(
        '/requisitions/',
        {
          method: 'POST',
          body: JSON.stringify(requisitionData),
        }
      );
      return response;
    } catch (error) {
      console.error('Error creating requisition:', error);
      throw error;
    }
  }

  // Get requisition details and linked accounts
  async getRequisition(requisitionId: string): Promise<GoCardlessRequisition> {
    try {
      const response = await this.apiRequest<GoCardlessRequisition>(
        `/requisitions/${requisitionId}/`
      );
      return response;
    } catch (error) {
      console.error('Error fetching requisition:', error);
      throw error;
    }
  }

  // Delete requisition
  async deleteRequisition(requisitionId: string): Promise<void> {
    try {
      await this.apiRequest(`/requisitions/${requisitionId}/`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting requisition:', error);
      throw error;
    }
  }

  // Get account details
  async getAccountDetails(accountId: string): Promise<GoCardlessAccountDetails> {
    try {
      const response = await this.apiRequest<GoCardlessAccountDetails>(
        `/accounts/${accountId}/details/`
      );
      return response;
    } catch (error) {
      console.error('Error fetching account details:', error);
      throw error;
    }
  }

  // Get account balances
  async getAccountBalances(accountId: string): Promise<{ balances: GoCardlessBalance[] }> {
    try {
      const response = await this.apiRequest<{ balances: GoCardlessBalance[] }>(
        `/accounts/${accountId}/balances/`
      );
      return response;
    } catch (error) {
      console.error('Error fetching account balances:', error);
      throw error;
    }
  }

  // Get account transactions
  async getAccountTransactions(
    accountId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{ transactions: { booked: GoCardlessTransaction[]; pending: GoCardlessTransaction[] } }> {
    try {
      let endpoint = `/accounts/${accountId}/transactions/`;
      const params = new URLSearchParams();
      
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      const response = await this.apiRequest<{
        transactions: { booked: GoCardlessTransaction[]; pending: GoCardlessTransaction[] };
      }>(endpoint);
      return response;
    } catch (error) {
      console.error('Error fetching account transactions:', error);
      throw error;
    }
  }

  // Utility method to check if API credentials are valid
  async validateCredentials(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch (error) {
      console.error('GoCardless credentials validation failed:', error);
      return false;
    }
  }

  // Rate limiting helper - GoCardless allows max 4 calls per day per account
  private static requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  static checkRateLimit(accountId: string): boolean {
    const now = Date.now();
    const key = accountId;
    const current = this.requestCounts.get(key);

    // Reset count if it's a new day
    if (!current || now > current.resetTime) {
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + (24 * 60 * 60 * 1000), // 24 hours from now
      });
      return true;
    }

    // Check if under limit
    if (current.count < 4) {
      current.count++;
      return true;
    }

    return false;
  }

  static getRemainingRequests(accountId: string): number {
    const current = this.requestCounts.get(accountId);
    if (!current || Date.now() > current.resetTime) {
      return 4;
    }
    return Math.max(0, 4 - current.count);
  }
}

// Singleton instance for the application
let gocardlessClient: GoCardlessClient | null = null;

export function getGoCardlessClient(): GoCardlessClient {
  if (!gocardlessClient) {
    const secretId = process.env.GOCARDLESS_SECRET_ID;
    const secretKey = process.env.GOCARDLESS_SECRET_KEY;

    if (!secretId || !secretKey) {
      throw new Error(
        'GoCardless credentials not configured. Please add GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY to your environment variables.'
      );
    }

    gocardlessClient = new GoCardlessClient({
      secretId,
      secretKey,
    });
  }

  return gocardlessClient;
}