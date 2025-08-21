// Finance Module TypeScript Interfaces

export interface BankAccount {
  id: string;
  user_id: string;
  name: string;
  bank_name: string;
  account_type: 'checking' | 'savings' | 'credit' | 'investment' | 'loan' | 'other';
  account_number_last4?: string;
  currency: string;
  connection_type: 'gocardless' | 'manual';
  gocardless_account_id?: string;
  is_active: boolean;
  current_balance?: number;
  description?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  latest_balance?: AccountBalance;
  recent_transactions?: FinancialTransaction[];
}

export interface AccountBalance {
  id: string;
  user_id: string;
  bank_account_id: string;
  balance: number;
  available_balance?: number;
  currency: string;
  balance_date: string;
  source: 'gocardless' | 'manual';
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  user_id: string;
  bank_account_id: string;
  transaction_id?: string;
  amount: number;
  currency: string;
  transaction_date: string;
  posting_date?: string;
  description?: string;
  merchant_name?: string;
  category?: string;
  transaction_type?: 'debit' | 'credit' | 'transfer' | 'fee' | 'interest' | 'other';
  gocardless_transaction_id?: string;
  reference?: string;
  source: 'gocardless' | 'manual';
  created_at: string;
  updated_at: string;
}

export interface GoCardlessConnection {
  id: string;
  user_id: string;
  requisition_id: string;
  institution_id: string;
  institution_name: string;
  country_code: string;
  status: 'created' | 'linked' | 'expired' | 'suspended' | 'error';
  access_valid_for_days: number;
  max_historical_days: number;
  end_user_agreement_id?: string;
  agreement_accepted_at?: string;
  agreement_expires_at?: string;
  created_at: string;
  updated_at: string;
  last_sync_at?: string;
  sync_error?: string;
}

export interface FinancialSummary {
  id: string;
  user_id: string;
  total_bank_balance: number;
  total_investment_value: number;
  total_real_estate_value: number;
  total_asset_value: number;
  total_net_worth: number;
  currency: string;
  summary_date: string;
  created_at: string;
  updated_at: string;
}

// GoCardless API Types
export interface GoCardlessInstitution {
  id: string;
  name: string;
  bic: string;
  transaction_total_days: string;
  countries: string[];
  logo: string;
}

export interface GoCardlessRequisition {
  id: string;
  created: string;
  redirect: string;
  status: string;
  institution_id: string;
  agreement: string;
  reference: string;
  accounts: string[];
  user_language: string;
  link: string;
  ssn?: string;
  account_selection: boolean;
  redirect_immediate: boolean;
}

export interface GoCardlessAccount {
  id: string;
  created: string;
  last_accessed: string;
  iban: string;
  institution_id: string;
  status: string;
}

export interface GoCardlessAccountDetails {
  account: {
    resourceId: string;
    iban: string;
    currency: string;
    ownerName: string;
    name: string;
    product: string;
    cashAccountType: string;
  };
}

export interface GoCardlessBalance {
  balanceAmount: {
    amount: string;
    currency: string;
  };
  balanceType: string;
  referenceDate: string;
}

export interface GoCardlessTransaction {
  transactionId: string;
  bookingDate: string;
  valueDate: string;
  transactionAmount: {
    amount: string;
    currency: string;
  };
  creditorName?: string;
  debtorName?: string;
  remittanceInformationUnstructured: string;
  remittanceInformationStructured?: string;
  proprietaryBankTransactionCode?: string;
  internalTransactionId?: string;
}

// Form Types
export interface CreateBankAccountForm {
  name: string;
  bank_name: string;
  account_type: BankAccount['account_type'];
  account_number_last4?: string;
  current_balance?: number;
  description?: string;
  notes?: string;
}

export interface UpdateBankAccountForm extends Partial<CreateBankAccountForm> {
  is_active?: boolean;
}

export interface CreateTransactionForm {
  bank_account_id: string;
  amount: number;
  transaction_date: string;
  description?: string;
  merchant_name?: string;
  category?: string;
  transaction_type?: FinancialTransaction['transaction_type'];
}

export interface UpdateBalanceForm {
  bank_account_id: string;
  balance: number;
  balance_date?: string;
}

// Dashboard Types
export interface WealthSummary {
  total_net_worth: number;
  bank_accounts: {
    total: number;
    accounts: Array<{
      name: string;
      balance: number;
      currency: string;
    }>;
  };
  investments: {
    total: number;
    count: number;
  };
  real_estate: {
    total: number;
    count: number;
  };
  assets: {
    total: number;
    count: number;
  };
}

export interface FinancialMetrics {
  monthly_income: number;
  monthly_expenses: number;
  savings_rate: number;
  net_worth_change: number;
  account_balances_trend: Array<{
    date: string;
    total_balance: number;
  }>;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Error Types
export interface GoCardlessError {
  summary: string;
  detail: string;
  status_code: number;
  type: string;
}

export interface SyncResult {
  success: boolean;
  accounts_synced: number;
  transactions_synced: number;
  balances_synced: number;
  errors: string[];
}