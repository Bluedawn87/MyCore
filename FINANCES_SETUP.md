# Finances Module - Complete Setup & User Guide

This comprehensive guide covers the setup, configuration, and usage of the MyCore finances module, including GoCardless bank integration, manual account management, wealth tracking, and automated synchronization.

## Overview

The Finances Module provides:
- **Bank Account Management**: Manual and automated account tracking
- **GoCardless Integration**: Connect to 2000+ European banks
- **Wealth Dashboard**: Comprehensive financial overview across all asset types
- **Automated Sync**: Daily balance and transaction updates
- **Financial Analytics**: Charts, trends, and spending analysis
- **Multi-Currency Support**: Handle different currencies
- **Security-First**: Row-level security and encrypted credentials

## 1. Database Setup

### Run the Migration
Execute the SQL migration in your Supabase dashboard:

```bash
# Copy the contents of migrations/finances_tables.sql
# Paste and run in Supabase SQL Editor
```

This creates the following tables:
- `bank_accounts` - Store bank account information
- `account_balances` - Time-series balance data
- `financial_transactions` - Transaction history
- `gocardless_connections` - GoCardless API connections
- `financial_summaries` - Cached wealth calculations

### Verify Tables
After running the migration, verify these tables exist in your Supabase dashboard:
- All tables should have Row Level Security (RLS) enabled
- Policies should allow users to access only their own data
- Indexes should be created for performance

## 2. Environment Variables

Add the following to your `.env.local` file:

```env
# GoCardless Bank Account Data API
GOCARDLESS_SECRET_ID=your_secret_id_here
GOCARDLESS_SECRET_KEY=your_secret_key_here

# IMPORTANT: Replace with your actual GoCardless credentials
# These should be stored securely in environment variables, not in code

# Cron job secret for daily updates
CRON_SECRET=your_secure_cron_secret_token

# Base URL for callbacks
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Update for production
```

## 3. GoCardless Setup

### API Access
1. The provided credentials are already configured in the code
2. The API supports multiple European countries (UK, Germany, France, etc.)
3. Rate limits: 4 requests per day per connected account

### Supported Features
- ✅ Institution listing by country
- ✅ Account connection via OAuth
- ✅ Balance retrieval
- ✅ Transaction history (up to 24 months)
- ✅ Automatic daily sync
- ✅ Connection management

## 4. Features Overview

### Manual Account Management
- Add/edit/delete bank accounts manually
- Update balances manually
- Add transactions manually
- Support for multiple account types (checking, savings, credit, etc.)

### Bank Connection (GoCardless)
- Connect to 2000+ European banks
- Automatic balance updates
- Transaction import
- Secure OAuth flow
- Connection status monitoring

### Wealth Dashboard
- Net worth calculation across all asset types
- Bank accounts + Investments + Real Estate + Assets
- Historical trending
- Visual charts and graphs
- Asset breakdown analysis

### Automated Updates
- Daily balance synchronization
- Transaction import
- Wealth calculation updates
- Error handling and retry logic

## 5. API Endpoints

The following API endpoints are available:

```
GET  /api/finances/institutions?country=GB  # List banks by country
POST /api/finances/connect                  # Initiate bank connection
GET  /api/finances/callback                 # Handle OAuth callback
POST /api/finances/sync                     # Sync account data
GET  /api/finances/status                   # Check connection status
POST /api/finances/disconnect               # Remove bank connection
POST /api/finances/daily-update             # Automated daily sync
GET  /api/finances/wealth-summary           # Wealth calculation
```

## 6. Daily Sync Setup

### PostgreSQL Cron Setup (Recommended)
The preferred method is using `pg_cron` directly in your Supabase database:

1. **Enable pg_cron Extension** (if not already enabled):
   ```sql
   -- Run this in Supabase SQL Editor as superuser
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

2. **Run the Cron Setup Migration**:
   - Copy the contents of `migrations/pg_cron_setup.sql`
   - Paste and run in your Supabase SQL Editor
   - This creates the sync functions and schedules the jobs

3. **Verify Setup**:
   ```sql
   -- Check scheduled jobs
   SELECT * FROM cron.job;
   
   -- Monitor job execution
   SELECT jobname, start_time, end_time, succeeded 
   FROM cron.job_run_details 
   ORDER BY start_time DESC LIMIT 10;
   ```

### Alternative: API Endpoint Cron
If you prefer external cron jobs, set up a system cron to call the API endpoint:

```bash
# Example cron job (daily at 6 AM UTC)
0 6 * * * curl -X POST -H "Authorization: Bearer your_cron_secret_token" \
  https://your-domain.com/api/finances/daily-update
```

## 7. User Guide - How to Use the Finances Module

### Page Structure
The Finances page (`/dashboard/finances`) has 4 main tabs:

#### 📊 Overview Tab
- **Wealth Summary**: Total net worth with trending
- **Asset Breakdown**: Bank accounts, investments, real estate distribution  
- **Quick Account View**: 5 most recent accounts with balances
- **Action Buttons**: Sync data, connect bank, add manual account

#### 📈 Dashboard Tab  
- **Key Metrics Cards**: Net worth, bank balance, investments, real estate
- **Net Worth Trend Chart**: Historical wealth progression
- **Wealth Breakdown Pie Chart**: Asset distribution visualization
- **Account Comparison Bar Chart**: Individual account balances
- **Spending Analysis**: Income vs expenses over time
- **Quick Stats**: Connection counts, transaction totals

#### 💳 Accounts Tab
- **Account Grid**: All bank accounts with details
- **Account Cards**: Show balance, type, connection status, bank name
- **Account Actions**: Edit, delete, disconnect (for GoCardless accounts)
- **Account Details**: Click any account to view full details
- **Manual Operations**: Add transactions, update balances

#### 🔗 Connections Tab
- **GoCardless Connections**: All bank connection statuses
- **Connection Management**: Disconnect or delete connections
- **Institution Details**: Bank name, country, connection date
- **Status Monitoring**: Linked, expired, error states

### Manual Account Management

#### Adding Manual Accounts
1. **Navigate**: Finances → Accounts tab → "Add Manual Account"
2. **Required Fields**:
   - Account Name (e.g., "Main Checking")
   - Bank Name (e.g., "Chase", "Bank of America")
   - Account Type (Checking, Savings, Credit, Investment, Loan, Other)
3. **Optional Fields**:
   - Last 4 digits of account number
   - Current balance
   - Description and notes

#### Managing Manual Accounts
- **Update Balance**: Click account → Balance tab → "Update Balance"
- **Add Transactions**: Click account → Transactions tab → "Add Transaction" 
- **Edit Account**: Three dots menu → "Edit Account"
- **Delete Account**: Three dots menu → "Delete Account"

### GoCardless Bank Connection

#### Supported Banks
- **2000+ European Banks**: UK, Germany, France, Spain, Italy, Netherlands, etc.
- **Real-time Data**: Balances, transactions, account details
- **Secure OAuth**: Bank-grade security and authorization

#### Connecting Your Bank
1. **Navigate**: Finances → Overview → "Connect Bank"
2. **Select Country**: Choose your bank's country
3. **Choose Bank**: Search and select your financial institution
4. **Authorization**: Complete OAuth flow in bank's secure environment
5. **Automatic Import**: Accounts and balances imported automatically

#### After Connection
- **Automatic Sync**: Balances update daily via pg_cron
- **Transaction History**: Up to 24 months imported
- **Real-time Status**: Connection status monitoring
- **Rate Limits**: 4 API calls per day per account (managed automatically)

### Wealth Dashboard & Analytics

#### Total Net Worth Calculation
**Automatic Aggregation** across:
- **Bank Accounts**: Latest balances from all accounts
- **Investments**: Total investment amounts from investments module
- **Real Estate**: Market values from real estate module  
- **Other Assets**: Future expansion for additional asset types

#### Charts & Visualizations
- **Net Worth Trend**: Historical progression over time
- **Asset Breakdown**: Pie chart showing wealth distribution
- **Account Comparison**: Bar chart of individual account balances
- **Spending Analysis**: Income vs expenses over recent periods

#### Financial Metrics
- **Monthly Income/Expenses**: Calculated from transactions
- **Savings Rate**: Income vs spending ratio
- **Account Growth**: Balance changes over time
- **Asset Allocation**: Percentage across different asset types

### Data Synchronization

#### Automatic Daily Sync (pg_cron)
- **Schedule**: 6 AM UTC daily
- **Process**: Updates all connected accounts
- **Scope**: Balances, transactions, account details
- **Error Handling**: Individual account failures don't stop entire sync
- **Monitoring**: Built-in logging and status tracking

#### Manual Sync Options
- **Sync All**: Finances → Overview → "Sync Data" button
- **Individual Account**: Account details → "Sync" button  
- **API Endpoint**: `POST /api/finances/sync`
- **Database Function**: `SELECT sync_all_financial_data();`

#### Sync Process Details
1. **Rate Limit Check**: Ensure within 4 calls/day limit
2. **Fetch Balances**: Get current balance from bank
3. **Import Transactions**: Download recent transactions  
4. **Update Database**: Store new data with timestamps
5. **Calculate Summary**: Update wealth totals across all modules
6. **Error Logging**: Track any failures for monitoring

### Connection Management

#### Connection States
- **Created**: Initial connection, awaiting authorization
- **Linked**: Successfully connected and active
- **Expired**: Access expired, needs re-authorization  
- **Suspended**: Manually disconnected
- **Error**: Connection failure, needs attention

#### Managing Connections
- **Disconnect**: Stops data sync, keeps historical data
- **Delete**: Permanently removes connection record
- **Re-connect**: Create new connection for expired banks
- **Monitor**: Check connection status and last sync times

### Security & Privacy

#### Data Protection
- **Row Level Security**: Users only see their own financial data
- **Encrypted Storage**: API credentials stored securely in environment
- **No Full Account Numbers**: Only last 4 digits stored
- **Secure Callbacks**: OAuth flows use secure redirects

#### API Security
- **Environment Variables**: Credentials never in source code
- **Rate Limiting**: Respects bank API limits automatically
- **Error Handling**: Secure error messages, detailed logging
- **Authentication**: All endpoints require user authentication

### Troubleshooting Common Issues

#### GoCardless Connection Problems
- **"Connection Failed"**: Check if bank is supported in selected country
- **"Rate Limit Exceeded"**: Wait until next day, use manual updates
- **"Authentication Failed"**: Verify GoCardless credentials in environment
- **"Connection Not Found"**: Delete old connections and try again

#### Balance Display Issues  
- **"N/A" Balances**: Run sync to update from bank, or update manually
- **Inconsistent Amounts**: Check currency settings, refresh page
- **Missing Accounts**: Verify account is active and connection is linked

#### Sync Problems
- **No Accounts to Sync**: Connect banks via GoCardless first
- **Partial Sync**: Some accounts may hit rate limits, will retry next day
- **Database Errors**: Check RLS policies and table permissions

#### Dashboard Issues
- **Empty Charts**: Need historical data, add manual transactions for testing
- **Incorrect Totals**: Refresh financial summary calculation
- **Missing Categories**: Ensure investments/real estate modules have data

### For Developers

1. **Adding New Account Types**
   - Update the `account_type` enum in database
   - Update TypeScript types in `src/types/finances.ts`
   - Update UI components as needed

2. **Extending Wealth Calculation**
   - Modify the `calculate_financial_summary` SQL function
   - Update the wealth summary API endpoint
   - Add new asset categories to dashboard

3. **Custom Integrations**
   - Follow the GoCardless service pattern
   - Implement new API endpoints
   - Add corresponding frontend components

## 8. Troubleshooting

### Common Issues

**GoCardless Authentication Errors**
- Verify credentials in environment variables
- Check API endpoint URLs
- Ensure proper content-type headers

**Bank Connection Failures**
- Check if bank is supported in selected country
- Verify callback URL configuration
- Review browser console for errors

**Sync Issues**
- Check rate limits (4 requests/day per account)
- Verify connection status in database
- Review API error logs

**Database Errors**
- Ensure all migrations are applied
- Check RLS policies
- Verify user permissions

### Debug Mode
Add debug logging:

```typescript
// Add to any service file
console.log('Debug:', { variable });
```

### Support
- GoCardless documentation: https://developer.gocardless.com/bank-account-data/
- Review API response format in browser network tab
- Check Supabase logs for database issues

## 9. Security Considerations

- API credentials stored securely in environment variables
- All database access protected by Row Level Security
- OAuth flows use secure redirects
- Rate limiting prevents API abuse
- No sensitive account numbers stored (only last 4 digits)

## 10. Performance Optimization

- Database indexes on frequently queried columns
- Efficient SQL queries with proper joins
- Cached financial summaries
- Pagination for large transaction lists
- Rate limit awareness for external APIs

The finances module is now fully integrated with your MyCore application!