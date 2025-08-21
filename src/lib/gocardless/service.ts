// GoCardless Service Layer - Database Integration

import { createClient } from '@/lib/supabase/client';
import { getGoCardlessClient } from './client';
import type {
  BankAccount,
  AccountBalance,
  FinancialTransaction,
  GoCardlessConnection,
  GoCardlessInstitution,
  GoCardlessRequisition,
  SyncResult,
} from '@/types/finances';

export class GoCardlessService {
  private supabase: any;
  private client = getGoCardlessClient();

  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || createClient();
  }

  // Get available institutions for a country
  async getInstitutions(countryCode: string = 'GB'): Promise<GoCardlessInstitution[]> {
    try {
      return await this.client.getInstitutions(countryCode);
    } catch (error) {
      console.error('Error fetching institutions:', error);
      throw error;
    }
  }

  // Initiate bank connection flow
  async initiateBankConnection(
    userId: string,
    institutionId: string,
    institutionName: string,
    countryCode: string,
    redirectUrl: string,
    reference?: string
  ): Promise<{ requisitionId: string; authUrl: string }> {
    try {
      // Create requisition with GoCardless
      const requisition = await this.client.createRequisition(
        institutionId,
        redirectUrl,
        'EN',
        reference
      );

      console.log('Created requisition:', { requisitionId: requisition.id, reference });

      // Store connection details in database
      const { error } = await this.supabase
        .from('gocardless_connections')
        .insert({
          user_id: userId,
          requisition_id: requisition.id, // Use the actual GoCardless requisition ID
          institution_id: institutionId,
          institution_name: institutionName,
          country_code: countryCode,
          status: 'created',
        });

      if (error) throw error;

      return {
        requisitionId: requisition.id,
        authUrl: requisition.link,
      };
    } catch (error) {
      console.error('Error initiating bank connection:', error);
      throw error;
    }
  }

  // Complete bank connection after user authorization
  async completeBankConnection(requisitionId: string): Promise<BankAccount[]> {
    try {
      console.log('Getting requisition details for ID:', requisitionId);
      
      // Get requisition details from GoCardless
      const requisition = await this.client.getRequisition(requisitionId);
      console.log('Retrieved requisition:', { 
        id: requisition.id, 
        status: requisition.status, 
        accounts: requisition.accounts 
      });

      if (requisition.status !== 'LN') {
        console.warn('Requisition not linked yet, status:', requisition.status);
        throw new Error(`Connection not completed. Status: ${requisition.status}`);
      }

      // Update connection status
      const { data: connection, error: updateError } = await this.supabase
        .from('gocardless_connections')
        .update({
          status: 'linked',
          agreement_accepted_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
        })
        .eq('requisition_id', requisitionId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Create bank accounts for each linked account
      const bankAccounts: BankAccount[] = [];

      for (const accountId of requisition.accounts) {
        try {
          // Get account details from GoCardless
          const accountDetails = await this.client.getAccountDetails(accountId);
          const balances = await this.client.getAccountBalances(accountId);

          // Create bank account record - handle missing IBAN gracefully
          const iban = accountDetails.account.iban || '';
          const accountName = accountDetails.account.name || 
                              accountDetails.account.product || 
                              (iban ? `Account ${iban.slice(-4)}` : `Account ${accountId.slice(-4)}`);
          const last4 = iban ? iban.slice(-4) : accountId.slice(-4);

          const { data: bankAccount, error: accountError } = await this.supabase
            .from('bank_accounts')
            .insert({
              user_id: connection.user_id,
              name: accountName,
              bank_name: connection.institution_name,
              account_type: this.mapAccountType(accountDetails.account.cashAccountType),
              account_number_last4: last4,
              currency: accountDetails.account.currency,
              connection_type: 'gocardless',
              gocardless_account_id: accountId,
              is_active: true,
            })
            .select()
            .single();

          if (accountError) throw accountError;

          // Store initial balance
          if (balances.balances.length > 0) {
            const currentBalance = balances.balances.find(b => b.balanceType === 'interimAvailable') ||
                                 balances.balances[0];
            
            await this.supabase
              .from('account_balances')
              .insert({
                user_id: connection.user_id,
                bank_account_id: bankAccount.id,
                balance: parseFloat(currentBalance.balanceAmount.amount),
                currency: currentBalance.balanceAmount.currency,
                balance_date: new Date().toISOString().split('T')[0],
                source: 'gocardless',
              });
          }

          bankAccounts.push(bankAccount);
        } catch (accountError) {
          console.error(`Error processing account ${accountId}:`, accountError);
          // Continue with other accounts even if one fails
        }
      }

      return bankAccounts;
    } catch (error) {
      console.error('Error completing bank connection:', error);
      throw error;
    }
  }

  // Sync account data (balances and transactions)
  async syncAccountData(userId: string, accountId?: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      accounts_synced: 0,
      transactions_synced: 0,
      balances_synced: 0,
      errors: [],
    };

    try {
      // Get accounts to sync - first get bank accounts, then get connections separately
      let query = this.supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('connection_type', 'gocardless')
        .eq('is_active', true);

      if (accountId) {
        query = query.eq('id', accountId);
      }

      const { data: accounts, error } = await query;
      if (error) throw error;

      for (const account of accounts || []) {
        try {
          // Skip accounts without gocardless_account_id
          if (!account.gocardless_account_id) {
            result.errors.push(`Account ${account.name} has no GoCardless account ID`);
            continue;
          }

          // Check rate limits
          if (!this.client.constructor.checkRateLimit(account.gocardless_account_id)) {
            result.errors.push(`Rate limit exceeded for account ${account.name}`);
            continue;
          }

          // Sync balances
          await this.syncAccountBalances(account);
          result.balances_synced++;

          // Sync transactions (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const transactionCount = await this.syncAccountTransactions(
            account,
            thirtyDaysAgo.toISOString().split('T')[0]
          );
          result.transactions_synced += transactionCount;

          result.accounts_synced++;
        } catch (accountError) {
          console.error(`Error syncing account ${account.name}:`, accountError);
          result.errors.push(`Failed to sync ${account.name}: ${accountError.message}`);
        }
      }

      // Sync is successful if there were no errors, even if no accounts were synced
      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      console.error('Error in sync operation:', error);
      result.errors.push(`Sync failed: ${error.message}`);
      return result;
    }
  }

  // Sync balances for a specific account
  private async syncAccountBalances(account: any): Promise<void> {
    try {
      const balances = await this.client.getAccountBalances(account.gocardless_account_id);
      const today = new Date().toISOString().split('T')[0];

      for (const balance of balances.balances) {
        // Update or insert balance for today
        await this.supabase
          .from('account_balances')
          .upsert({
            user_id: account.user_id,
            bank_account_id: account.id,
            balance: parseFloat(balance.balanceAmount.amount),
            available_balance: balance.balanceType === 'interimAvailable' 
              ? parseFloat(balance.balanceAmount.amount) 
              : null,
            currency: balance.balanceAmount.currency,
            balance_date: today,
            source: 'gocardless',
          }, {
            onConflict: 'bank_account_id,balance_date'
          });
      }
    } catch (error) {
      console.error('Error syncing account balances:', error);
      throw error;
    }
  }

  // Sync transactions for a specific account
  private async syncAccountTransactions(account: any, dateFrom: string): Promise<number> {
    try {
      const transactions = await this.client.getAccountTransactions(
        account.gocardless_account_id,
        dateFrom
      );

      let syncedCount = 0;

      // Process booked transactions
      for (const transaction of transactions.transactions.booked) {
        try {
          await this.supabase
            .from('financial_transactions')
            .upsert({
              user_id: account.user_id,
              bank_account_id: account.id,
              gocardless_transaction_id: transaction.transactionId,
              amount: parseFloat(transaction.transactionAmount.amount),
              currency: transaction.transactionAmount.currency,
              transaction_date: transaction.bookingDate,
              posting_date: transaction.valueDate,
              description: transaction.remittanceInformationUnstructured,
              merchant_name: transaction.creditorName || transaction.debtorName,
              transaction_type: parseFloat(transaction.transactionAmount.amount) >= 0 ? 'credit' : 'debit',
              reference: transaction.remittanceInformationStructured,
              source: 'gocardless',
            }, {
              onConflict: 'gocardless_transaction_id'
            });
          
          syncedCount++;
        } catch (transactionError) {
          console.error('Error syncing transaction:', transactionError);
          // Continue with other transactions
        }
      }

      return syncedCount;
    } catch (error) {
      console.error('Error syncing account transactions:', error);
      throw error;
    }
  }

  // Get user's GoCardless connections
  async getUserConnections(userId: string): Promise<GoCardlessConnection[]> {
    try {
      const { data, error } = await this.supabase
        .from('gocardless_connections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user connections:', error);
      throw error;
    }
  }

  // Disconnect and remove a bank connection
  async disconnectBank(userId: string, requisitionId: string): Promise<void> {
    try {
      // Delete requisition from GoCardless
      await this.client.deleteRequisition(requisitionId);

      // Update connection status
      await this.supabase
        .from('gocardless_connections')
        .update({ status: 'suspended' })
        .eq('user_id', userId)
        .eq('requisition_id', requisitionId);

      // Deactivate associated bank accounts
      // Since we don't have a direct relationship, we need to find accounts that belong to this requisition
      // For now, we'll deactivate all GoCardless accounts for this user (you could make this more specific later)
      await this.supabase
        .from('bank_accounts')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('connection_type', 'gocardless');
    } catch (error) {
      console.error('Error disconnecting bank:', error);
      throw error;
    }
  }

  // Helper method to map GoCardless account types to our types
  private mapAccountType(cashAccountType: string): BankAccount['account_type'] {
    const typeMap: Record<string, BankAccount['account_type']> = {
      'CACC': 'checking',
      'SVGS': 'savings',
      'CARD': 'credit',
      'LOAN': 'loan',
      'MGLD': 'investment',
    };

    return typeMap[cashAccountType] || 'other';
  }

  // Validate GoCardless configuration
  async validateConfiguration(): Promise<boolean> {
    try {
      return await this.client.validateCredentials();
    } catch (error) {
      console.error('GoCardless configuration validation failed:', error);
      return false;
    }
  }
}