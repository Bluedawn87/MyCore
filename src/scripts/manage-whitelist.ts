// Script to manage the auth whitelist
// Run with: npx tsx src/scripts/manage-whitelist.ts

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

if (!supabaseServiceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY - You need to add this to your .env.local file')
  console.log('You can find it in your Supabase project settings')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listWhitelist() {
  const { data, error } = await supabase
    .from('auth_whitelist')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching whitelist:', error)
    return
  }

  console.log('\nCurrent whitelist:')
  console.table(data)
}

async function addToWhitelist(email: string, name: string) {
  const { data, error } = await supabase
    .from('auth_whitelist')
    .insert({ email, name })
    .select()
    .single()

  if (error) {
    console.error('Error adding to whitelist:', error)
    return
  }

  console.log(`Successfully added ${email} to whitelist`)
  return data
}

async function removeFromWhitelist(email: string) {
  const { error } = await supabase
    .from('auth_whitelist')
    .update({ is_active: false })
    .eq('email', email)

  if (error) {
    console.error('Error removing from whitelist:', error)
    return
  }

  console.log(`Successfully deactivated ${email} from whitelist`)
}

// Parse command line arguments
const command = process.argv[2]
const args = process.argv.slice(3)

async function main() {
  switch (command) {
    case 'list':
      await listWhitelist()
      break
    
    case 'add':
      if (args.length < 2) {
        console.error('Usage: npm run whitelist:add <email> <name>')
        process.exit(1)
      }
      await addToWhitelist(args[0], args[1])
      await listWhitelist()
      break
    
    case 'remove':
      if (args.length < 1) {
        console.error('Usage: npm run whitelist:remove <email>')
        process.exit(1)
      }
      await removeFromWhitelist(args[0])
      await listWhitelist()
      break
    
    default:
      console.log('Available commands:')
      console.log('  npm run whitelist:list                - List all whitelisted emails')
      console.log('  npm run whitelist:add <email> <name>  - Add email to whitelist')
      console.log('  npm run whitelist:remove <email>      - Remove email from whitelist')
  }
}

main().catch(console.error)