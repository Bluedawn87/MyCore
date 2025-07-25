# Deployment Guide

## Vercel Deployment

### Prerequisites
1. A Vercel account (https://vercel.com)
2. A Supabase project with the database schema set up
3. Git repository hosted on GitHub

### Environment Variables

You'll need to configure the following environment variables in Vercel:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Your Supabase project URL
   - Found in: Supabase Dashboard > Settings > API > Project URL

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Your Supabase anonymous/public key
   - Found in: Supabase Dashboard > Settings > API > anon/public key

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Your Supabase service role key (keep this secret!)
   - Found in: Supabase Dashboard > Settings > API > service_role key

### Deployment Steps

1. **Connect to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Select the `core` directory as the root directory

2. **Configure Environment Variables**
   - In Vercel project settings, go to Environment Variables
   - Add all three environment variables listed above
   - Make sure they're available for all environments (Production, Preview, Development)

3. **Deploy**
   - Vercel will automatically deploy your project
   - The build command is already configured in `vercel.json`

### Post-Deployment

1. **Run Storage Setup**
   - After deployment, you may need to run the storage bucket setup
   - This can be done locally with: `npm run setup:buckets`

2. **Configure Supabase Auth**
   - Add your Vercel deployment URL to Supabase Auth settings
   - Go to: Supabase Dashboard > Authentication > URL Configuration
   - Add your Vercel URL to Redirect URLs

3. **Setup Email Whitelist**
   - Use the whitelist management commands to add authorized users:
   ```bash
   npm run whitelist:add "email@example.com" "User Name"
   ```

### Troubleshooting

- If builds fail, check the build logs in Vercel
- Ensure all environment variables are correctly set
- Verify that the Supabase project is accessible
- Check that all database migrations have been applied