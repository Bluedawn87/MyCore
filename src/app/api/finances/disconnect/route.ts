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

    // Parse request body
    const body = await request.json();
    const { requisitionId } = body;

    if (!requisitionId) {
      return NextResponse.json(
        { error: 'Missing requisitionId' },
        { status: 400 }
      );
    }

    // Verify the connection belongs to the user
    const { data: connection, error: connectionError } = await supabase
      .from('gocardless_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('requisition_id', requisitionId)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found or access denied' },
        { status: 404 }
      );
    }

    // Initialize GoCardless service and disconnect
    const gocardlessService = new GoCardlessService(supabase);
    await gocardlessService.disconnectBank(user.id, requisitionId);

    // Update financial summary after disconnection
    try {
      await supabase.rpc('calculate_financial_summary', {
        target_user_id: user.id,
        target_date: new Date().toISOString().split('T')[0],
      });
    } catch (summaryError) {
      console.error('Error updating financial summary:', summaryError);
      // Don't fail the disconnect if summary update fails
    }

    return NextResponse.json({
      success: true,
      message: `Successfully disconnected ${connection.institution_name}`,
      disconnectedInstitution: connection.institution_name,
    });

  } catch (error) {
    console.error('Error disconnecting bank:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication failed')) {
        return NextResponse.json(
          { error: 'GoCardless authentication failed. Please check configuration.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to disconnect bank' },
      { status: 500 }
    );
  }
}