import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoCardlessService } from '@/lib/gocardless/service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get('ref'); // GoCardless requisition reference
    const error = searchParams.get('error');

    // Handle error cases
    if (error) {
      console.error('GoCardless callback error:', error);
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connection Failed</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; }
              .error { color: #dc2626; }
            </style>
          </head>
          <body>
            <h1 class="error">Connection Failed</h1>
            <p>There was an error connecting your bank account: ${error}</p>
            <p>Please close this window and try again.</p>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
        `,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!ref) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Request</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; }
              .error { color: #dc2626; }
            </style>
          </head>
          <body>
            <h1 class="error">Invalid Request</h1>
            <p>Missing requisition reference. Please try connecting again.</p>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
        `,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const supabase = await createClient();
    
    // The ref parameter from GoCardless callback could be:
    // 1. The actual requisition_id, or 
    // 2. Our custom reference that we passed when creating the requisition
    console.log('GoCardless callback ref:', ref);
    
    // Try to find the connection by requisition_id first
    let { data: connections, error: fetchError } = await supabase
      .from('gocardless_connections')
      .select('*')
      .eq('requisition_id', ref)
      .single();

    console.log('Database lookup by requisition_id result:', { connections, fetchError });

    // If not found, the ref might be our custom reference, so find by user pattern
    if (!connections && ref.startsWith('user-')) {
      console.log('Ref looks like custom reference, finding by user...');
      
      // Extract user ID from reference pattern: user-{userId}-{timestamp}
      const userIdMatch = ref.match(/^user-([a-f0-9-]+)-\d+$/);
      if (userIdMatch) {
        const userId = userIdMatch[1];
        console.log('Extracted user ID:', userId);
        
        // Find the most recent connection for this user
        const { data: userConnection } = await supabase
          .from('gocardless_connections')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'created')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        connections = userConnection;
        console.log('Found connection by user:', connections);
      }
    }

    if (!connections) {
      console.error('Connection not found after all attempts:', fetchError);
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connection Not Found</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; }
              .error { color: #dc2626; }
            </style>
          </head>
          <body>
            <h1 class="error">Connection Not Found</h1>
            <p>Could not find the connection record. Please try connecting again.</p>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
        `,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    try {
      // Complete the bank connection using the actual requisition ID
      console.log('Attempting to complete bank connection for requisition:', connections.requisition_id);
      const gocardlessService = new GoCardlessService(supabase);
      const bankAccounts = await gocardlessService.completeBankConnection(connections.requisition_id);
      console.log('Bank connection completed, accounts created:', bankAccounts.length);

      // Return success page
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connection Successful</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: system-ui, sans-serif; 
                text-align: center; 
                padding: 50px; 
                max-width: 500px; 
                margin: 0 auto; 
              }
              .success { color: #059669; }
              .account { 
                background: #f3f4f6; 
                padding: 10px; 
                margin: 10px 0; 
                border-radius: 5px; 
              }
            </style>
          </head>
          <body>
            <h1 class="success">✅ Bank Connected Successfully!</h1>
            <p>Successfully connected ${bankAccounts.length} account(s):</p>
            ${bankAccounts.map(account => 
              `<div class="account">${account.name} - ${account.bank_name}</div>`
            ).join('')}
            <p>You can now close this window and return to the application.</p>
            <p><small>This window will close automatically in 5 seconds.</small></p>
            <script>
              setTimeout(() => window.close(), 5000);
            </script>
          </body>
        </html>
        `,
        { headers: { 'Content-Type': 'text/html' } }
      );

    } catch (completionError) {
      console.error('Error completing bank connection:', completionError);
      
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connection Processing</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; }
              .warning { color: #d97706; }
            </style>
          </head>
          <body>
            <h1 class="warning">⏳ Connection Processing</h1>
            <p>Your bank connection is being processed. This may take a few minutes.</p>
            <p>Please close this window and check your accounts in the application.</p>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
        `,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

  } catch (error) {
    console.error('Callback error:', error);
    
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">Unexpected Error</h1>
          <p>An unexpected error occurred. Please try connecting again.</p>
          <script>
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}