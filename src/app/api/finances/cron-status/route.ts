import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin/has access to cron monitoring
    // You might want to add additional authorization checks here

    try {
      // Get scheduled cron jobs
      const { data: cronJobs, error: cronError } = await supabase
        .from('cron.job')
        .select('*')
        .in('jobname', ['daily-financial-sync', 'weekly-financial-cleanup']);

      // Get recent job run history
      const { data: jobHistory, error: historyError } = await supabase
        .from('cron.job_run_details')
        .select('*')
        .in('jobname', ['daily-financial-sync', 'weekly-financial-cleanup'])
        .order('start_time', { ascending: false })
        .limit(20);

      // Get user connection statistics
      const { data: connectionStats, error: statsError } = await supabase
        .from('gocardless_connections')
        .select('status, last_sync_at, sync_error, institution_name')
        .eq('user_id', user.id)
        .order('last_sync_at', { ascending: false });

      return NextResponse.json({
        success: true,
        cron_jobs: cronJobs || [],
        recent_runs: jobHistory || [],
        user_connections: connectionStats || [],
        timestamp: new Date().toISOString(),
        notes: {
          daily_sync: 'Runs at 6 AM UTC daily',
          weekly_cleanup: 'Runs at 2 AM UTC on Sundays',
          monitoring: 'Check recent_runs for job execution status'
        }
      });

    } catch (cronAccessError) {
      // If cron tables are not accessible, provide alternative status
      console.warn('Cron tables not accessible:', cronAccessError);
      
      // Get user connection statistics as fallback
      const { data: connectionStats } = await supabase
        .from('gocardless_connections')
        .select('status, last_sync_at, sync_error, institution_name')
        .eq('user_id', user.id)
        .order('last_sync_at', { ascending: false });

      return NextResponse.json({
        success: true,
        message: 'Cron monitoring not available (may require admin access)',
        user_connections: connectionStats || [],
        timestamp: new Date().toISOString(),
        recommendations: [
          'Check with your database administrator about pg_cron access',
          'Ensure pg_cron extension is properly installed',
          'Verify the cron jobs were scheduled correctly'
        ]
      });
    }

  } catch (error) {
    console.error('Error getting cron status:', error);
    return NextResponse.json(
      { error: 'Failed to get cron status' },
      { status: 500 }
    );
  }
}

// POST endpoint to manually trigger sync (for testing)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === 'sync') {
      // Manually trigger sync function
      const { data, error } = await supabase
        .rpc('sync_all_financial_data');

      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message,
          action: 'manual_sync'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        result: data,
        action: 'manual_sync',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'cleanup') {
      // Manually trigger cleanup function
      const { data, error } = await supabase
        .rpc('cleanup_old_financial_data', { retention_months: 12 });

      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message,
          action: 'manual_cleanup'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        result: data,
        action: 'manual_cleanup',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      error: 'Invalid action. Supported actions: sync, cleanup'
    }, { status: 400 });

  } catch (error) {
    console.error('Error in manual cron action:', error);
    return NextResponse.json(
      { error: 'Failed to execute cron action' },
      { status: 500 }
    );
  }
}