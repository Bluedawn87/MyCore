// Financial utilities and helper functions

import type { BankAccount, AccountBalance, FinancialSummary, WealthSummary } from '@/types/finances';

// Currency formatting
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'USD',
  options: Intl.NumberFormatOptions = {}
): string {
  if (amount === null || amount === undefined) return 'N/A';

  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  };

  return new Intl.NumberFormat('en-US', defaultOptions).format(amount);
}

// Format large numbers with abbreviations (K, M, B)
export function formatLargeNumber(
  amount: number | null | undefined,
  currency?: string
): string {
  if (amount === null || amount === undefined) return 'N/A';

  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (absAmount < 1000) {
    return currency ? formatCurrency(amount, currency) : amount.toString();
  }

  const units = ['', 'K', 'M', 'B', 'T'];
  const tier = Math.floor(Math.log10(absAmount) / 3);
  
  if (tier === 0) {
    return currency ? formatCurrency(amount, currency) : amount.toString();
  }

  const scaled = absAmount / Math.pow(1000, tier);
  const formatted = scaled.toFixed(1).replace(/\.0$/, '');
  
  if (currency) {
    return `${sign}${currency === 'USD' ? '$' : currency} ${formatted}${units[tier]}`;
  }
  
  return `${sign}${formatted}${units[tier]}`;
}

// Calculate percentage change
export function calculatePercentageChange(
  current: number,
  previous: number
): { change: number; percentage: number; isPositive: boolean } {
  if (previous === 0) {
    return { change: current, percentage: 0, isPositive: current >= 0 };
  }

  const change = current - previous;
  const percentage = (change / Math.abs(previous)) * 100;

  return {
    change,
    percentage: Math.abs(percentage),
    isPositive: change >= 0,
  };
}

// Format percentage with appropriate color coding
export function formatPercentage(
  percentage: number,
  options: { 
    showSign?: boolean;
    decimals?: number;
    colorCode?: boolean;
  } = {}
): { formatted: string; color?: string } {
  const { showSign = false, decimals = 1, colorCode = false } = options;
  
  const sign = showSign && percentage > 0 ? '+' : '';
  const formatted = `${sign}${percentage.toFixed(decimals)}%`;
  
  let color: string | undefined;
  if (colorCode) {
    color = percentage > 0 ? 'green' : percentage < 0 ? 'red' : 'gray';
  }

  return { formatted, color };
}

// Get account type display information
export function getAccountTypeInfo(type: BankAccount['account_type']): {
  label: string;
  color: string;
  icon: string;
} {
  const typeMap = {
    checking: { label: 'Checking', color: 'blue', icon: '💳' },
    savings: { label: 'Savings', color: 'green', icon: '🏦' },
    credit: { label: 'Credit', color: 'orange', icon: '💳' },
    investment: { label: 'Investment', color: 'purple', icon: '📈' },
    loan: { label: 'Loan', color: 'red', icon: '🏠' },
    other: { label: 'Other', color: 'gray', icon: '💼' },
  };

  return typeMap[type] || typeMap.other;
}

// Calculate total balance for an account (latest balance)
export function getLatestBalance(balances: AccountBalance[]): AccountBalance | null {
  if (!balances || balances.length === 0) return null;
  
  return balances.reduce((latest, current) => {
    const latestDate = new Date(latest.balance_date);
    const currentDate = new Date(current.balance_date);
    return currentDate > latestDate ? current : latest;
  });
}

// Group transactions by date for charts
export function groupTransactionsByDate(
  transactions: Array<{ transaction_date: string; amount: number }>
): Array<{ date: string; income: number; expenses: number; net: number }> {
  const grouped = transactions.reduce((acc, transaction) => {
    const date = transaction.transaction_date;
    if (!acc[date]) {
      acc[date] = { income: 0, expenses: 0 };
    }
    
    if (transaction.amount > 0) {
      acc[date].income += transaction.amount;
    } else {
      acc[date].expenses += Math.abs(transaction.amount);
    }
    
    return acc;
  }, {} as Record<string, { income: number; expenses: number }>);

  return Object.entries(grouped)
    .map(([date, { income, expenses }]) => ({
      date,
      income,
      expenses,
      net: income - expenses,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Calculate financial metrics
export function calculateFinancialMetrics(
  transactions: Array<{ transaction_date: string; amount: number }>,
  timeframe: 'month' | 'quarter' | 'year' = 'month'
): {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  averageTransaction: number;
  transactionCount: number;
} {
  const now = new Date();
  const cutoffDate = new Date();
  
  switch (timeframe) {
    case 'month':
      cutoffDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      cutoffDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      cutoffDate.setFullYear(now.getFullYear() - 1);
      break;
  }

  const relevantTransactions = transactions.filter(
    t => new Date(t.transaction_date) >= cutoffDate
  );

  const totalIncome = relevantTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = relevantTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const netIncome = totalIncome - totalExpenses;
  const transactionCount = relevantTransactions.length;
  const averageTransaction = transactionCount > 0 
    ? relevantTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactionCount
    : 0;

  return {
    totalIncome,
    totalExpenses,
    netIncome,
    averageTransaction,
    transactionCount,
  };
}

// Generate wealth summary from financial summary
export function generateWealthSummary(
  financialSummary: FinancialSummary,
  bankAccounts: Array<BankAccount & { latest_balance?: AccountBalance }>
): WealthSummary {
  const accountsWithBalances = bankAccounts
    .filter(account => account.latest_balance)
    .map(account => ({
      name: account.name,
      balance: account.latest_balance!.balance,
      currency: account.latest_balance!.currency,
    }));

  return {
    total_net_worth: financialSummary.total_net_worth,
    bank_accounts: {
      total: financialSummary.total_bank_balance,
      accounts: accountsWithBalances,
    },
    investments: {
      total: financialSummary.total_investment_value,
      count: 0, // This would need to be calculated separately
    },
    real_estate: {
      total: financialSummary.total_real_estate_value,
      count: 0, // This would need to be calculated separately
    },
    assets: {
      total: financialSummary.total_asset_value,
      count: 0, // This would need to be calculated separately
    },
  };
}

// Validate account number (basic validation)
export function validateAccountNumber(accountNumber: string): boolean {
  // Remove spaces and dashes
  const cleaned = accountNumber.replace(/[\s-]/g, '');
  
  // Check if it's a reasonable length (4-34 characters for international compatibility)
  if (cleaned.length < 4 || cleaned.length > 34) {
    return false;
  }
  
  // Check if it contains only alphanumeric characters
  return /^[a-zA-Z0-9]+$/.test(cleaned);
}

// Generate chart colors for financial data
export function getChartColors(): {
  income: string;
  expenses: string;
  net: string;
  balance: string;
  primary: string;
  secondary: string;
} {
  return {
    income: '#10b981', // Green
    expenses: '#ef4444', // Red
    net: '#3b82f6', // Blue
    balance: '#8b5cf6', // Purple
    primary: '#1f2937', // Dark gray
    secondary: '#6b7280', // Medium gray
  };
}

// Date range utilities for financial data filtering
export function getDateRange(
  range: 'week' | 'month' | 'quarter' | 'year' | 'all'
): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case 'week':
      start.setDate(end.getDate() - 7);
      break;
    case 'month':
      start.setMonth(end.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(end.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(end.getFullYear() - 1);
      break;
    case 'all':
      start.setFullYear(2000); // Far enough back to include all data
      break;
  }

  return { start, end };
}

// Safe number parsing for financial data
export function safeParseFloat(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const parsed = parseFloat(value.toString().replace(/[^-\d.]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}