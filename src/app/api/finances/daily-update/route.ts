import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoCardlessService } from '@/lib/gocardless/service';

// This endpoint can be called by a cron job or scheduled task
// to automatically update all user accounts daily
export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized (you might want to use a secret token)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'your-cron-secret-token';
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const gocardlessService = new GoCardlessService(supabase);
    
    // Get all users with active GoCardless connections
    const { data: connections, error: connectionsError } = await supabase
      .from('gocardless_connections')
      .select(`
        user_id,
        requisition_id,
        institution_name,
        status,
        last_sync_at
      `)
      .eq('status', 'linked')
      .order('last_sync_at', { ascending: true }); // Sync oldest first

    if (connectionsError) throw connectionsError;

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active connections to sync',
        results: [],
      });
    }

    const results = [];
    const usersSynced = new Set<string>();

    // Process each connection
    for (const connection of connections) {
      // Skip if we already synced this user in this batch
      if (usersSynced.has(connection.user_id)) {
        continue;
      }

      try {
        console.log(`Syncing accounts for user ${connection.user_id}`);
        
        // Sync all accounts for this user
        const syncResult = await gocardlessService.syncAccountData(connection.user_id);
        
        // Update financial summary for the user
        if (syncResult.success && syncResult.accounts_synced > 0) {
          try {
            await supabase.rpc('calculate_financial_summary', {
              target_user_id: connection.user_id,
              target_date: new Date().toISOString().split('T')[0],
            });
          } catch (summaryError) {
            console.error(`Error updating financial summary for user ${connection.user_id}:`, summaryError);
          }
        }

        results.push({
          user_id: connection.user_id,
          institution: connection.institution_name,
          success: syncResult.success,
          accounts_synced: syncResult.accounts_synced,
          balances_synced: syncResult.balances_synced,
          transactions_synced: syncResult.transactions_synced,
          errors: syncResult.errors,
        });

        usersSynced.add(connection.user_id);

        // Update last sync timestamp for all user's connections
        await supabase
          .from('gocardless_connections')
          .update({ 
            last_sync_at: new Date().toISOString(),
            sync_error: syncResult.errors.length > 0 ? syncResult.errors.join('; ') : null,
          })
          .eq('user_id', connection.user_id);

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (userError) {
        console.error(`Error syncing user ${connection.user_id}:`, userError);
        
        results.push({
          user_id: connection.user_id,
          institution: connection.institution_name,
          success: false,
          accounts_synced: 0,
          balances_synced: 0,
          transactions_synced: 0,
          errors: [userError instanceof Error ? userError.message : 'Unknown error'],
        });

        // Update sync error in database
        await supabase
          .from('gocardless_connections')
          .update({ 
            sync_error: userError instanceof Error ? userError.message : 'Unknown error',
            last_sync_at: new Date().toISOString(),
          })
          .eq('user_id', connection.user_id);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalAccountsSynced = results.reduce((sum, r) => sum + r.accounts_synced, 0);
    const totalBalancesSynced = results.reduce((sum, r) => sum + r.balances_synced, 0);
    const totalTransactionsSynced = results.reduce((sum, r) => sum + r.transactions_synced, 0);

    return NextResponse.json({
      success: true,
      message: `Daily sync completed. ${successCount}/${results.length} users synced successfully.`,
      summary: {
        users_processed: results.length,
        users_successful: successCount,
        total_accounts_synced: totalAccountsSynced,
        total_balances_synced: totalBalancesSynced,
        total_transactions_synced: totalTransactionsSynced,
      },
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in daily update:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// GET endpoint to check when the last daily update ran
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the most recent sync timestamps
    const { data: recentSyncs, error } = await supabase
      .from('gocardless_connections')
      .select('last_sync_at, institution_name, sync_error, status')
      .order('last_sync_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    // Calculate next scheduled sync time (assuming daily at 6 AM UTC)
    const now = new Date();
    const nextSync = new Date();
    nextSync.setUTCHours(6, 0, 0, 0); // 6 AM UTC
    if (nextSync <= now) {
      nextSync.setDate(nextSync.getDate() + 1); // Next day if 6 AM has passed
    }

    // Get total sync statistics
    const { data: stats, error: statsError } = await supabase
      .from('gocardless_connections')
      .select('status')
      .eq('status', 'linked');

    if (statsError) throw statsError;

    return NextResponse.json({
      last_syncs: recentSyncs || [],
      next_scheduled_sync: nextSync.toISOString(),
      active_connections: stats?.length || 0,
      current_time: now.toISOString(),
    });

  } catch (error) {
    console.error('Error getting daily update status:', error);
    return NextResponse.json(
      { error: 'Failed to get daily update status' },
      { status: 500 }
    );
  }
}