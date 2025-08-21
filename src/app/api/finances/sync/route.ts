import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoCardlessService } from '@/lib/gocardless/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body (optional accountId for single account sync)
    const body = await request.json().catch(() => ({}));
    const { accountId } = body;

    // Initialize GoCardless service
    const gocardlessService = new GoCardlessService(supabase);

    // Sync account data
    const result = await gocardlessService.syncAccountData(user.id, accountId);

    // Update financial summary after successful sync
    if (result.success && result.accounts_synced > 0) {
      try {
        // Call the financial summary calculation function
        await supabase.rpc('calculate_financial_summary', {
          target_user_id: user.id,
          target_date: new Date().toISOString().split('T')[0],
        });
      } catch (summaryError) {
        console.error('Error updating financial summary:', summaryError);
        // Don't fail the sync if summary update fails
      }
    }

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? result.accounts_synced > 0 
          ? `Successfully synced ${result.accounts_synced} accounts, ${result.balances_synced} balances, and ${result.transactions_synced} transactions.`
          : 'Sync completed successfully. No GoCardless accounts found to sync.'
        : 'Sync completed with errors.',
      accounts_synced: result.accounts_synced,
      balances_synced: result.balances_synced,
      transactions_synced: result.transactions_synced,
      errors: result.errors,
    });

  } catch (error) {
    console.error('Error in sync operation:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Rate limit exceeded. GoCardless allows maximum 4 requests per day per account.',
            message: 'Please try again tomorrow or use manual updates.'
          },
          { status: 429 }
        );
      }
      
      if (error.message.includes('Authentication failed')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'GoCardless authentication failed. Please check configuration.',
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to sync account data',
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get sync information for user's accounts
    const { data: connections, error } = await supabase
      .from('gocardless_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('last_sync_at', { ascending: false });

    if (error) throw error;

    // Calculate next available sync times based on rate limits
    const gocardlessClient = await import('@/lib/gocardless/client');
    const syncStatus = connections?.map(connection => {
      // This is a simplified example - you'd want to track this per account
      const remainingRequests = 4; // gocardlessClient.GoCardlessClient.getRemainingRequests(accountId);
      const lastSync = connection.last_sync_at ? new Date(connection.last_sync_at) : null;
      const nextAvailableSync = lastSync 
        ? new Date(lastSync.getTime() + (24 * 60 * 60 * 1000)) // 24 hours later
        : new Date();

      return {
        institution: connection.institution_name,
        status: connection.status,
        last_sync: lastSync,
        next_available_sync: nextAvailableSync,
        remaining_requests: remainingRequests,
        can_sync_now: remainingRequests > 0 && new Date() >= nextAvailableSync,
      };
    }) || [];

    return NextResponse.json({
      sync_status: syncStatus,
      total_connections: connections?.length || 0,
      can_sync_any: syncStatus.some(s => s.can_sync_now),
    });

  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}