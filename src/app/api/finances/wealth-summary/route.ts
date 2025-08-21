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

    // Get query parameters for date range
    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Calculate or retrieve financial summary
    const { data: summaryData, error: summaryError } = await supabase
      .rpc('calculate_financial_summary', {
        target_user_id: user.id,
        target_date: targetDate,
      })
      .single();

    if (summaryError) {
      console.error('Error calculating financial summary:', summaryError);
      // If the function fails, calculate manually
      return await calculateWealthSummaryManually(supabase, user.id, targetDate);
    }

    // Get additional breakdown data
    const [bankAccountsData, investmentsData, realEstateData] = await Promise.all([
      getBankAccountsBreakdown(supabase, user.id),
      getInvestmentsBreakdown(supabase, user.id),
      getRealEstateBreakdown(supabase, user.id),
    ]);

    // Get historical data for trends (last 12 months)
    const historicalData = await getHistoricalWealthData(supabase, user.id, 12);

    return NextResponse.json({
      summary: summaryData,
      breakdown: {
        bank_accounts: bankAccountsData,
        investments: investmentsData,
        real_estate: realEstateData,
      },
      historical: historicalData,
      calculated_at: new Date().toISOString(),
      target_date: targetDate,
    });

  } catch (error) {
    console.error('Error calculating wealth summary:', error);
    return NextResponse.json(
      { error: 'Failed to calculate wealth summary' },
      { status: 500 }
    );
  }
}

// POST endpoint to recalculate and update financial summary
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { date } = body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Force recalculation of financial summary
    const { data: summaryData, error: summaryError } = await supabase
      .rpc('calculate_financial_summary', {
        target_user_id: user.id,
        target_date: targetDate,
      })
      .single();

    if (summaryError) throw summaryError;

    return NextResponse.json({
      success: true,
      message: 'Financial summary recalculated successfully',
      summary: summaryData,
      calculated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error recalculating wealth summary:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate wealth summary' },
      { status: 500 }
    );
  }
}

// Helper function to get bank accounts breakdown
async function getBankAccountsBreakdown(supabase: any, userId: string) {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select(`
        id,
        name,
        bank_name,
        account_type,
        currency,
        connection_type,
        is_active,
        current_balance,
        latest_balance:account_balances(balance, balance_date, currency)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const processedAccounts = data?.map(account => {
      const latestBalance = account.account_balances?.[0];
      const balance = latestBalance?.balance || account.current_balance || 0;
      
      return {
        id: account.id,
        name: account.name,
        bank_name: account.bank_name,
        account_type: account.account_type,
        balance,
        currency: latestBalance?.currency || account.currency || 'USD',
        connection_type: account.connection_type,
        last_updated: latestBalance?.balance_date || new Date().toISOString().split('T')[0],
      };
    }) || [];

    const totalBalance = processedAccounts.reduce((sum, account) => sum + account.balance, 0);

    return {
      accounts: processedAccounts,
      total_balance: totalBalance,
      count: processedAccounts.length,
      by_type: groupAccountsByType(processedAccounts),
    };
  } catch (error) {
    console.error('Error getting bank accounts breakdown:', error);
    return { accounts: [], total_balance: 0, count: 0, by_type: {} };
  }
}

// Helper function to get investments breakdown
async function getInvestmentsBreakdown(supabase: any, userId: string) {
  try {
    const { data, error } = await supabase
      .from('investments')
      .select(`
        id,
        name,
        type,
        initial_investment_amount,
        ownership_percentage,
        latest_metrics:investment_metrics(revenue, gross_margin, net_profit)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalValue = data?.reduce((sum, investment) => {
      return sum + (investment.initial_investment_amount || 0);
    }, 0) || 0;

    return {
      investments: data || [],
      total_value: totalValue,
      count: data?.length || 0,
      by_type: groupInvestmentsByType(data || []),
    };
  } catch (error) {
    console.error('Error getting investments breakdown:', error);
    return { investments: [], total_value: 0, count: 0, by_type: {} };
  }
}

// Helper function to get real estate breakdown
async function getRealEstateBreakdown(supabase: any, userId: string) {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        type,
        ownership_type,
        current_market_value,
        acquisition_price,
        city,
        country
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalValue = data?.reduce((sum, property) => {
      return sum + (property.current_market_value || property.acquisition_price || 0);
    }, 0) || 0;

    return {
      properties: data || [],
      total_value: totalValue,
      count: data?.length || 0,
      by_type: groupPropertiesByType(data || []),
    };
  } catch (error) {
    console.error('Error getting real estate breakdown:', error);
    return { properties: [], total_value: 0, count: 0, by_type: {} };
  }
}

// Helper function to get historical wealth data
async function getHistoricalWealthData(supabase: any, userId: string, months: number) {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data, error } = await supabase
      .from('financial_summaries')
      .select('*')
      .eq('user_id', userId)
      .gte('summary_date', startDate.toISOString().split('T')[0])
      .order('summary_date', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting historical wealth data:', error);
    return [];
  }
}

// Helper function to calculate wealth summary manually if database function fails
async function calculateWealthSummaryManually(supabase: any, userId: string, targetDate: string) {
  try {
    const [bankAccountsData, investmentsData, realEstateData] = await Promise.all([
      getBankAccountsBreakdown(supabase, userId),
      getInvestmentsBreakdown(supabase, userId),
      getRealEstateBreakdown(supabase, userId),
    ]);

    const totalNetWorth = 
      bankAccountsData.total_balance + 
      investmentsData.total_value + 
      realEstateData.total_value;

    const manualSummary = {
      user_id: userId,
      total_bank_balance: bankAccountsData.total_balance,
      total_investment_value: investmentsData.total_value,
      total_real_estate_value: realEstateData.total_value,
      total_asset_value: 0, // Can be expanded later
      total_net_worth: totalNetWorth,
      currency: 'USD',
      summary_date: targetDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Try to save the manually calculated summary
    await supabase
      .from('financial_summaries')
      .upsert(manualSummary, {
        onConflict: 'user_id,summary_date'
      });

    return NextResponse.json({
      summary: manualSummary,
      breakdown: {
        bank_accounts: bankAccountsData,
        investments: investmentsData,
        real_estate: realEstateData,
      },
      historical: [],
      calculated_at: new Date().toISOString(),
      target_date: targetDate,
      note: 'Calculated manually due to database function error',
    });
  } catch (error) {
    console.error('Error in manual calculation:', error);
    return NextResponse.json(
      { error: 'Failed to calculate wealth summary manually' },
      { status: 500 }
    );
  }
}

// Helper functions for grouping data
function groupAccountsByType(accounts: any[]) {
  return accounts.reduce((groups, account) => {
    const type = account.account_type;
    if (!groups[type]) {
      groups[type] = { count: 0, total_balance: 0 };
    }
    groups[type].count++;
    groups[type].total_balance += account.balance;
    return groups;
  }, {});
}

function groupInvestmentsByType(investments: any[]) {
  return investments.reduce((groups, investment) => {
    const type = investment.type;
    if (!groups[type]) {
      groups[type] = { count: 0, total_value: 0 };
    }
    groups[type].count++;
    groups[type].total_value += investment.initial_investment_amount || 0;
    return groups;
  }, {});
}

function groupPropertiesByType(properties: any[]) {
  return properties.reduce((groups, property) => {
    const type = property.type;
    if (!groups[type]) {
      groups[type] = { count: 0, total_value: 0 };
    }
    groups[type].count++;
    groups[type].total_value += property.current_market_value || property.acquisition_price || 0;
    return groups;
  }, {});
}