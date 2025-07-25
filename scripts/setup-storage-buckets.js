const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const buckets = [
  {
    id: 'property-images',
    name: 'property-images',
    public: true,
    file_size_limit: 10485760, // 10MB
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  {
    id: 'property-documents',
    name: 'property-documents',
    public: true,
    file_size_limit: 52428800, // 50MB
    allowed_mime_types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  },
  {
    id: 'person-documents',
    name: 'person-documents',
    public: true,
    file_size_limit: 52428800, // 50MB
    allowed_mime_types: ['application/pdf', 'image/jpeg', 'image/png', 'text/plain']
  },
  {
    id: 'contract-documents',
    name: 'contract-documents',
    public: true,
    file_size_limit: 52428800, // 50MB
    allowed_mime_types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  },
  {
    id: 'general-storage',
    name: 'general-storage',
    public: true,
    file_size_limit: 104857600, // 100MB
    allowed_mime_types: null // Allow all file types
  }
]

async function setupBuckets() {
  console.log('Setting up storage buckets...')
  
  for (const bucket of buckets) {
    try {
      // Check if bucket exists
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets()
      
      if (listError) {
        console.error('Error listing buckets:', listError)
        continue
      }
      
      const bucketExists = existingBuckets?.some(b => b.id === bucket.id)
      
      if (bucketExists) {
        console.log(`✓ Bucket '${bucket.id}' already exists`)
      } else {
        // Create bucket
        const { data, error } = await supabase.storage.createBucket(bucket.id, {
          public: bucket.public,
          fileSizeLimit: bucket.file_size_limit,
          allowedMimeTypes: bucket.allowed_mime_types
        })
        
        if (error) {
          console.error(`✗ Failed to create bucket '${bucket.id}':`, error.message)
        } else {
          console.log(`✓ Created bucket '${bucket.id}'`)
        }
      }
    } catch (error) {
      console.error(`Error processing bucket '${bucket.id}':`, error)
    }
  }
  
  console.log('\nBucket setup complete!')
  console.log('\nNote: If buckets were not created, you may need to create them manually in the Supabase dashboard:')
  console.log('1. Go to your Supabase project dashboard')
  console.log('2. Navigate to Storage section')
  console.log('3. Create the following buckets:')
  buckets.forEach(bucket => {
    console.log(`   - ${bucket.id} (${bucket.public ? 'Public' : 'Private'})`)
  })
}

setupBuckets()