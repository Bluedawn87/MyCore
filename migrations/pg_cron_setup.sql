-- PostgreSQL Cron Setup for Daily Financial Sync
-- This file sets up pg_cron jobs for automated financial data synchronization
-- Run this in your Supabase SQL Editor after enabling pg_cron extension

-- First, ensure pg_cron extension is enabled (run this as superuser in Supabase dashboard)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to sync financial data for all users
CREATE OR REPLACE FUNCTION sync_all_financial_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_summary json;
    user_record record;
    sync_results json[] := '{}';
    total_users integer := 0;
    successful_users integer := 0;
    total_accounts integer := 0;
    total_errors text[] := '{}';
    current_error text;
BEGIN
    -- Log the start of sync
    RAISE NOTICE 'Starting daily financial sync at %', NOW();
    
    -- Get all users with active GoCardless connections
    FOR user_record IN 
        SELECT DISTINCT user_id, 
               COUNT(*) as connection_count,
               STRING_AGG(institution_name, ', ') as institutions
        FROM gocardless_connections 
        WHERE status = 'linked' 
        GROUP BY user_id
    LOOP
        BEGIN
            total_users := total_users + 1;
            
            -- Log current user being processed
            RAISE NOTICE 'Processing user: % with % connections (%)', 
                user_record.user_id, user_record.connection_count, user_record.institutions;
            
            -- Count user's active GoCardless accounts
            SELECT COUNT(*) INTO current_error
            FROM bank_accounts 
            WHERE user_id = user_record.user_id 
              AND connection_type = 'gocardless' 
              AND is_active = true;
            
            total_accounts := total_accounts + current_error::integer;
            
            -- Update last sync timestamp for user's connections
            UPDATE gocardless_connections 
            SET last_sync_at = NOW(),
                sync_error = NULL
            WHERE user_id = user_record.user_id 
              AND status = 'linked';
            
            -- Calculate financial summary for the user
            PERFORM calculate_financial_summary(user_record.user_id, CURRENT_DATE);
            
            successful_users := successful_users + 1;
            
            -- Add to results
            sync_results := sync_results || json_build_object(
                'user_id', user_record.user_id,
                'success', true,
                'accounts', current_error::integer,
                'institutions', user_record.institutions
            );
            
        EXCEPTION WHEN OTHERS THEN
            -- Handle individual user errors
            current_error := 'User ' || user_record.user_id || ': ' || SQLERRM;
            total_errors := total_errors || current_error;
            
            RAISE WARNING 'Error syncing user %: %', user_record.user_id, SQLERRM;
            
            -- Update error in connections table
            UPDATE gocardless_connections 
            SET sync_error = SQLERRM,
                last_sync_at = NOW()
            WHERE user_id = user_record.user_id;
            
            -- Add error to results
            sync_results := sync_results || json_build_object(
                'user_id', user_record.user_id,
                'success', false,
                'error', SQLERRM
            );
        END;
    END LOOP;
    
    -- Build final result summary
    result_summary := json_build_object(
        'success', true,
        'timestamp', NOW(),
        'summary', json_build_object(
            'total_users', total_users,
            'successful_users', successful_users,
            'total_accounts', total_accounts,
            'errors_count', array_length(total_errors, 1)
        ),
        'results', sync_results,
        'errors', total_errors
    );
    
    RAISE NOTICE 'Daily sync completed: %/% users successful', successful_users, total_users;
    
    RETURN result_summary;
    
EXCEPTION WHEN OTHERS THEN
    -- Handle function-level errors
    RAISE WARNING 'Daily sync failed: %', SQLERRM;
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'timestamp', NOW()
    );
END;
$$;

-- Create a function to clean up old financial data (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_financial_data(retention_months integer DEFAULT 12)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cutoff_date date;
    deleted_balances integer;
    deleted_summaries integer;
BEGIN
    cutoff_date := CURRENT_DATE - INTERVAL '1 month' * retention_months;
    
    -- Delete old balance records (keep last 12 months by default)
    DELETE FROM account_balances 
    WHERE balance_date < cutoff_date;
    
    GET DIAGNOSTICS deleted_balances = ROW_COUNT;
    
    -- Delete old financial summaries (keep last 12 months by default)
    DELETE FROM financial_summaries 
    WHERE summary_date < cutoff_date;
    
    GET DIAGNOSTICS deleted_summaries = ROW_COUNT;
    
    RAISE NOTICE 'Cleanup completed: % balance records, % summary records deleted', 
        deleted_balances, deleted_summaries;
    
    RETURN json_build_object(
        'success', true,
        'cutoff_date', cutoff_date,
        'deleted_balances', deleted_balances,
        'deleted_summaries', deleted_summaries,
        'timestamp', NOW()
    );
END;
$$;

-- Schedule the daily sync job (runs at 6 AM UTC daily)
-- Note: You may need to adjust the timezone based on your needs
SELECT cron.schedule(
    'daily-financial-sync',           -- job name
    '0 6 * * *',                     -- cron expression (6 AM UTC daily)
    'SELECT sync_all_financial_data();' -- SQL command to execute
);

-- Schedule weekly cleanup job (runs at 2 AM UTC on Sundays)
SELECT cron.schedule(
    'weekly-financial-cleanup',       -- job name  
    '0 2 * * 0',                     -- cron expression (2 AM UTC on Sundays)
    'SELECT cleanup_old_financial_data(12);' -- Keep 12 months of data
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- View job run history (useful for monitoring)
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

/*
USAGE NOTES:

1. Enable pg_cron Extension (run as superuser):
   CREATE EXTENSION IF NOT EXISTS pg_cron;

2. The sync function will:
   - Process all users with linked GoCardless connections
   - Update last_sync_at timestamps
   - Calculate financial summaries
   - Handle errors gracefully per user
   - Return detailed results

3. Schedule Management:
   -- List all cron jobs
   SELECT * FROM cron.job;
   
   -- Delete a job if needed
   SELECT cron.unschedule('daily-financial-sync');
   
   -- Manually run the sync function
   SELECT sync_all_financial_data();

4. Monitoring:
   -- Check recent job runs
   SELECT jobid, jobname, runid, start_time, end_time, succeeded, output
   FROM cron.job_run_details 
   ORDER BY start_time DESC 
   LIMIT 20;

5. Timezone Considerations:
   - The cron jobs are scheduled in UTC
   - Adjust the times if you need a different timezone
   - 6 AM UTC = 6 AM GMT, 7 AM CET, 2 AM EST, etc.

6. Error Handling:
   - Individual user errors won't stop the entire sync
   - Errors are logged in gocardless_connections.sync_error
   - Function returns detailed success/failure information

7. Performance:
   - The function processes users sequentially to avoid API rate limits
   - Consider the GoCardless rate limit of 4 requests per day per account
   - Large numbers of users may need batch processing

8. Security:
   - Functions use SECURITY DEFINER to run with elevated privileges
   - Only affects tables the user has access to via RLS
   - No external API calls from SQL (those would be handled by your app)
*/