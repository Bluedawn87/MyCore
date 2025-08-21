import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoCardlessClient } from '@/lib/gocardless/client';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get country from query parameters
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || 'GB';

    // Validate country code (should be 2 characters)
    if (!country || country.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid country code. Must be 2 characters.' },
        { status: 400 }
      );
    }

    // Fetch institutions from GoCardless
    const gocardlessClient = getGoCardlessClient();
    const institutions = await gocardlessClient.getInstitutions(country.toUpperCase());

    // Sort institutions by name for better UX
    const sortedInstitutions = institutions.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      institutions: sortedInstitutions,
      count: sortedInstitutions.length,
      country: country.toUpperCase(),
    });
  } catch (error) {
    console.error('Error fetching institutions:', error);
    
    // Return appropriate error message
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
      { error: 'Failed to fetch institutions' },
      { status: 500 }
    );
  }
}