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

    // Check for recent connections (within last 5 minutes)
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    const { data: recentConnections, error: connectionsError } = await supabase
      .from('gocardless_connections')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', fiveMinutesAgo.toISOString())
      .order('created_at', { ascending: false });

    if (connectionsError) throw connectionsError;

    // Check for recent bank accounts (within last 5 minutes)
    const { data: recentAccounts, error: accountsError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('connection_type', 'gocardless')
      .gte('created_at', fiveMinutesAgo.toISOString())
      .order('created_at', { ascending: false });

    if (accountsError) throw accountsError;

    // Get overall financial summary
    const { data: summary, error: summaryError } = await supabase
      .from('financial_summaries')
      .select('*')
      .eq('user_id', user.id)
      .order('summary_date', { ascending: false })
      .limit(1)
      .single();

    // Don't throw error if no summary exists yet
    const financialSummary = summaryError?.code === 'PGRST116' ? null : summary;

    // Get total account counts
    const { data: allAccounts, error: allAccountsError } = await supabase
      .from('bank_accounts')
      .select('id, connection_type, is_active')
      .eq('user_id', user.id);

    if (allAccountsError) throw allAccountsError;

    const accountStats = {
      total: allAccounts?.length || 0,
      active: allAccounts?.filter(a => a.is_active).length || 0,
      connected: allAccounts?.filter(a => a.connection_type === 'gocardless' && a.is_active).length || 0,
      manual: allAccounts?.filter(a => a.connection_type === 'manual' && a.is_active).length || 0,
    };

    // Get connection status summary
    const { data: allConnections, error: allConnectionsError } = await supabase
      .from('gocardless_connections')
      .select('status')
      .eq('user_id', user.id);

    if (allConnectionsError) throw allConnectionsError;

    const connectionStats = {
      total: allConnections?.length || 0,
      linked: allConnections?.filter(c => c.status === 'linked').length || 0,
      expired: allConnections?.filter(c => c.status === 'expired').length || 0,
      error: allConnections?.filter(c => c.status === 'error').length || 0,
    };

    return NextResponse.json({
      hasRecentConnection: (recentConnections?.length || 0) > 0,
      hasRecentAccounts: (recentAccounts?.length || 0) > 0,
      recentConnections: recentConnections || [],
      recentAccounts: recentAccounts || [],
      accountStats,
      connectionStats,
      financialSummary,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error getting status:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}