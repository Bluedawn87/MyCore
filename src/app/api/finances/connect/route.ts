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
    const { institutionId, institutionName, countryCode } = body;

    // Validate required fields
    if (!institutionId || !institutionName || !countryCode) {
      return NextResponse.json(
        { error: 'Missing required fields: institutionId, institutionName, countryCode' },
        { status: 400 }
      );
    }

    // Create redirect URL (user will return here after authorization)
    // Use the request headers to determine the correct base URL
    const host = request.headers.get('host') || 'localhost:3001';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
    const redirectUrl = `${baseUrl}/api/finances/callback`;

    // Initialize GoCardless service with authenticated supabase client
    const gocardlessService = new GoCardlessService(supabase);

    // Initiate bank connection
    const { requisitionId, authUrl } = await gocardlessService.initiateBankConnection(
      user.id,
      institutionId,
      institutionName,
      countryCode,
      redirectUrl,
      `user-${user.id}-${Date.now()}` // reference
    );

    return NextResponse.json({
      success: true,
      requisitionId,
      authUrl,
      message: 'Bank connection initiated. Redirect user to authUrl.',
    });
  } catch (error) {
    console.error('Error initiating bank connection:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication failed')) {
        return NextResponse.json(
          { error: 'GoCardless authentication failed. Please check configuration.' },
          { status: 500 }
        );
      }
      
      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to initiate bank connection' },
      { status: 500 }
    );
  }
}