# MyCore - Personal Management System

MyCore is a comprehensive personal management system built with Next.js, TypeScript, and Supabase. It provides a centralized platform to manage investments, real estate, contracts, people, and personal storage.

## Features

### 🏠 Dashboard
- Overview of all your personal management modules
- Quick access to different sections via sidebar navigation
- User authentication with secure access control

### 💰 Investments
- Track equity investments and stock holdings
- Monitor ownership percentages and co-investors
- View investment metrics (revenue, user acquisition, marketing spend)
- Support for multiple companies per investment
- Date range filtering for historical data
- External links to investment portals (frontend and portal URLs)

### 🏦 Finances
- **Bank Account Management**: Manual and automated account tracking
- **GoCardless Integration**: Connect to 2000+ European banks securely
- **Automated Sync**: Daily balance and transaction updates via pg_cron
- **Wealth Dashboard**: Comprehensive financial overview with interactive charts
- **Multi-Asset Aggregation**: Total net worth across bank accounts, investments, real estate
- **Transaction History**: Import and track financial transactions
- **Financial Analytics**: Income/expense analysis, spending trends, account comparisons
- **Currency Support**: Multi-currency account management
- **Security**: OAuth bank connections, encrypted credentials, RLS protection

### 🏢 Real Estate
- Manage owned and leased properties
- Track properties across different countries
- Support for various ownership types (personal, company, foreign)
- Property image galleries
- Document storage for deeds, leases, and insurance
- Contract management for utilities and services
- Renewal tracking and reminders

### 👥 People & Organizations
- Centralized database of individuals and companies
- Link people to investments, properties, and contracts
- Track relationships between people
- Document storage for personal records
- View all connections for each person

### 📄 Contracts
- Manage service contracts (internet, insurance, utilities, etc.)
- Link contracts to properties or people
- Track renewal dates with reminders
- Monitor monthly and annual costs
- Auto-renewal tracking

### 🗄️ Storage
- Personal file storage system
- Upload and manage documents
- Organize files in a secure environment

### ❤️ Health Tracking
- Comprehensive health management for individuals and families
- Track health metrics (weight, blood pressure, heart rate, etc.)
- Store and organize medical records securely
- Set and monitor health goals
- Health reminders for checkups and medications
- AI-ready for intelligent health insights

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Authentication**: Supabase Auth with RLS (Row Level Security)
- **File Storage**: Supabase Storage

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- Supabase account
- Git

### 2. Environment Variables

Create or update the `.env.local` file with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# GoCardless Bank Account Data API (for Finances module)
GOCARDLESS_SECRET_ID=your_secret_id
GOCARDLESS_SECRET_KEY=your_secret_key

# Cron job secret for automated sync
CRON_SECRET=your_secure_cron_secret

# Base URL for callbacks
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Get your keys from:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings > API
4. Copy the required keys

### 3. Managing Access (Whitelist)

This system uses email whitelisting for security. Only pre-authorized emails can create accounts.

```bash
# List current whitelist
npm run whitelist:list

# Add an email to whitelist
npm run whitelist:add "your-email@example.com" "Your Name"

# Remove an email from whitelist
npm run whitelist:remove "email@example.com"
```

### 4. Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

Visit http://localhost:3000

### 5. First Time Setup

1. Add your emails to the whitelist (see above)
2. Go to http://localhost:3000/signup
3. Create accounts using the whitelisted emails
4. Sign in at http://localhost:3000/login

### 6. Finances Module Setup (Optional)

To enable bank integrations and automated financial tracking:

1. **Database Migration**: Run `migrations/finances_tables.sql` in Supabase SQL Editor
2. **GoCardless Setup**: Add GoCardless credentials to `.env.local`
3. **pg_cron Setup**: Run `migrations/pg_cron_setup.sql` for automated daily sync
4. **Test Connection**: Visit `/dashboard/finances` and connect a European bank

See `FINANCES_SETUP.md` for detailed setup instructions.

## Project Structure

```
core/
├── src/
│   ├── app/
│   │   ├── (auth)/         # Authentication pages
│   │   ├── (dashboard)/    # Dashboard pages
│   │   │   ├── dashboard/
│   │   │   │   ├── investments/
│   │   │   │   ├── real-estate/
│   │   │   │   ├── finances/
│   │   │   │   ├── health/
│   │   │   │   ├── persons/
│   │   │   │   └── storage/
│   │   │   └── layout.tsx
│   │   └── layout.tsx
│   ├── components/
│   │   ├── dashboard/      # Dashboard components
│   │   ├── investments/    # Investment components
│   │   ├── real-estate/    # Real estate components
│   │   ├── finances/       # Financial management components
│   │   ├── health/         # Health tracking components
│   │   ├── persons/        # Person management components
│   │   └── storage/        # Storage components
│   └── lib/
│       └── supabase/       # Supabase client configuration
├── docs/                   # Feature documentation
└── package.json
```

## Database Schema

### Core Tables
- `investments` - Investment records with ownership tracking
- `investment_owners` - Co-investor details
- `investment_metrics` - Time series metrics data
- `stock_prices` - Stock price history
- `properties` - Real estate properties
- `property_images` - Property photo galleries
- `property_documents` - Property-related documents
- `contracts` - Service contracts
- `persons` - People and organizations database (with health fields)
- `person_relationships` - Relationships between people
- `health_profiles` - Extended health information
- `health_metrics` - Health measurements over time
- `medical_records` - Medical document storage
- `health_goals` - Health goal tracking
- `health_reminders` - Health reminder system
- `bank_accounts` - Bank account information (manual and connected)
- `account_balances` - Time-series balance data
- `financial_transactions` - Transaction history
- `gocardless_connections` - Bank connection management
- `financial_summaries` - Wealth calculations across all asset types

## Security

- Email whitelist authentication
- Row Level Security (RLS) on all tables
- Secure file uploads with access control
- Session management with httpOnly cookies
- User data isolation

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run whitelist:list    # List whitelisted emails
npm run whitelist:add     # Add email to whitelist
npm run whitelist:remove  # Remove email from whitelist
```

## License

This project is private and proprietary.