'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Heading, 
  Text, 
  Flex, 
  Card, 
  Button,
  Table,
  IconButton,
  Dialog,
  TextField,
  Badge,
  SegmentedControl
} from '@radix-ui/themes'
import { 
  UploadIcon, 
  FileIcon, 
  TrashIcon, 
  DownloadIcon,
  Cross2Icon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  HomeIcon,
  PlusIcon,
  TableIcon,
  ColumnsIcon
} from '@radix-ui/react-icons'
import { FileUploader } from '@/components/storage/file-uploader'
import { ColumnView } from '@/components/storage/column-view'
import { FilePreviewDrawer } from '@/components/storage/file-preview-drawer'
import { formatBytes, formatDate } from '@/lib/utils'

interface StorageBucket {
  id: string
  name: string
  owner?: string
  created_at?: string
  updated_at?: string
  public?: boolean
  file_size_limit?: number
  allowed_mime_types?: string[]
}

interface StorageItem {
  name: string
  id: string
  updated_at?: string
  created_at?: string
  size?: number
  metadata?: any
  isFolder?: boolean
}

export default function StoragePage() {
  const [buckets, setBuckets] = useState<StorageBucket[]>([])
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)
  const [items, setItems] = useState<StorageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingBuckets, setLoadingBuckets] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'table' | 'column'>('table')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedFile, setSelectedFile] = useState<StorageItem | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [isRootView, setIsRootView] = useState(true)
  const supabase = createClient()

  // Load buckets on mount
  useEffect(() => {
    loadBuckets()
  }, [])

  useEffect(() => {
    if (selectedBucket) {
      setCurrentPath([])
      setIsRootView(false)
      loadItems()
    } else {
      setIsRootView(true)
      setItems([])
    }
  }, [selectedBucket])

  useEffect(() => {
    if (selectedBucket) {
      loadItems()
    }
  }, [currentPath])

  const loadBuckets = async () => {
    setLoadingBuckets(true)
    try {
      // Try to fetch all buckets first
      const { data, error } = await supabase.storage.listBuckets()
      
      console.log('Buckets response:', { data, error })
      
      // If listing fails OR returns empty, try known bucket names
      if (error || !data || data.length === 0) {
        if (error) {
          console.error('Error loading buckets:', error)
        }
        
        // Use all known bucket names from the screenshot
        const knownBuckets = [
          'health-documents',
          'personal-media',
          'investment-documents',
          'baby-tracking',
          'property-images',
          'property-documents', 
          'person-documents',
          'contract-documents',
          'general-storage'
        ]
        
        // Check which buckets exist by trying to list their contents
        const existingBuckets: StorageBucket[] = []
        
        for (const bucketName of knownBuckets) {
          try {
            // Try to list with empty path to check if bucket exists
            const { error: listError } = await supabase.storage
              .from(bucketName)
              .list('', { limit: 1 })
            
            if (!listError) {
              existingBuckets.push({
                id: bucketName,
                name: bucketName,
                public: bucketName.includes('property') || bucketName.includes('person') || bucketName.includes('contract'),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              console.log(`✓ Found bucket: ${bucketName}`)
            } else {
              console.log(`✗ Bucket ${bucketName} not accessible:`, listError.message)
            }
          } catch (e) {
            console.log(`✗ Error checking bucket ${bucketName}:`, e)
          }
        }
        
        console.log(`Found ${existingBuckets.length} buckets`)
        setBuckets(existingBuckets)
      } else {
        setBuckets(data)
      }
    } catch (error) {
      console.error('Unexpected error loading buckets:', error)
    } finally {
      setLoadingBuckets(false)
    }
  }

  const getCurrentFullPath = async () => {
    // Don't include user ID in the path - buckets handle their own access control
    return currentPath.filter(Boolean).join('/')
  }

  const loadItems = async () => {
    if (!selectedBucket) return
    
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const path = await getCurrentFullPath()
      const { data, error } = await supabase.storage
        .from(selectedBucket)
        .list(path, {
          limit: 100,
          offset: 0
        })

      if (!error && data) {
        // Separate folders and files
        const folders: StorageItem[] = []
        const files: StorageItem[] = []
        
        data.forEach((item, index) => {
          // Better folder detection:
          // 1. If it has metadata.size, it's definitely a file
          // 2. If name ends with /, it's a folder
          // 3. If it's a .keep file, skip it
          // 4. Otherwise, check if it has a file extension
          
          if (item.name === '.keep') return // Skip .keep files
          
          const hasSize = item.metadata?.size !== undefined || (item as any).size !== undefined
          const endsWithSlash = item.name.endsWith('/')
          const hasExtension = item.name.includes('.') && !item.name.endsWith('.')
          
          // It's a folder if: no size AND (ends with slash OR no extension)
          const isFolder = !hasSize && (endsWithSlash || !hasExtension)
          
          if (isFolder) {
            folders.push({
              ...item,
              id: item.id || `${selectedBucket}-folder-${index}-${item.name}`,
              name: item.name.replace('/', ''),
              isFolder: true
            })
          } else {
            files.push({
              ...item,
              id: item.id || `${selectedBucket}-file-${index}-${item.name}`,
              isFolder: false
            })
          }
        })
        
        // Sort folders first, then files
        setItems([...folders, ...files])
      }
    } catch (error) {
      console.error('Error loading items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNavigateToFolder = (folderName: string) => {
    setCurrentPath([...currentPath, folderName])
  }

  const handleNavigateUp = (index: number) => {
    setCurrentPath(currentPath.slice(0, index))
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !selectedBucket) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to create folders')
        return
      }

      // Clean the folder name (remove special characters that might cause issues)
      const cleanFolderName = newFolderName.trim().replace(/[^a-zA-Z0-9-_ ]/g, '')
      if (!cleanFolderName) {
        alert('Please enter a valid folder name')
        return
      }

      const currentPath = await getCurrentFullPath()
      const folderPath = `${currentPath}/${cleanFolderName}/.keep`
      
      // Create a placeholder file to create the folder
      // Use text/plain which we just allowed for all buckets
      const placeholderFile = new Blob([''], { type: 'text/plain' })
      const { data, error } = await supabase.storage
        .from(selectedBucket)
        .upload(folderPath, placeholderFile)

      if (error) {
        // Check for specific error types
        if (error.message?.includes('already exists')) {
          alert('A folder with this name already exists')
        } else if (error.message?.includes('Invalid')) {
          alert('Invalid folder name. Please use only letters, numbers, spaces, hyphens, and underscores.')
        } else {
          alert(`Failed to create folder: ${error.message || 'Unknown error'}`)
        }
      } else if (data) {
        setShowCreateFolderDialog(false)
        setNewFolderName('')
        await loadItems()
      }
    } catch (error: any) {
      alert(`An unexpected error occurred: ${error.message || 'Unknown error'}`)
    }
  }

  const handleDelete = async (itemName: string, isFolder: boolean) => {
    if (!selectedBucket) return
    
    const confirmMessage = isFolder 
      ? 'Are you sure you want to delete this folder and all its contents?' 
      : 'Are you sure you want to delete this file?'
    
    if (!confirm(confirmMessage)) return

    try {
      const fullPath = `${await getCurrentFullPath()}/${itemName}`
      
      if (isFolder) {
        // For folders, we need to list and delete all contents recursively
        const { data: folderContents } = await supabase.storage
          .from(selectedBucket)
          .list(fullPath)
        
        if (folderContents && folderContents.length > 0) {
          const filesToDelete = folderContents.map(item => `${fullPath}/${item.name}`)
          await supabase.storage.from(selectedBucket).remove(filesToDelete)
        }
        
        // Delete the .keep file if it exists
        await supabase.storage.from(selectedBucket).remove([`${fullPath}/.keep`])
      } else {
        // For files, simple delete
        const { error } = await supabase.storage
          .from(selectedBucket)
          .remove([fullPath])

        if (error) {
          alert('Failed to delete file')
        }
      }
      
      await loadItems()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleDownload = async (fileName: string) => {
    if (!selectedBucket) return
    
    try {
      const fullPath = `${await getCurrentFullPath()}/${fileName}`
      const { data, error } = await supabase.storage
        .from(selectedBucket)
        .download(fullPath)

      if (error) {
        alert('Failed to download file')
        return
      }

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get bucket icon based on name
  const getBucketIcon = (bucketName: string) => {
    const iconMap: { [key: string]: string } = {
      'health': '🏥',
      'personal': '📸',
      'media': '📸',
      'investment': '📈',
      'baby': '👶',
      'property': '🏠',
      'person': '👤',
      'document': '📄'
    }
    
    const lowerName = bucketName.toLowerCase()
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerName.includes(key)) return icon
    }
    return '📁'
  }

  const currentBucket = buckets.find(b => b.id === selectedBucket)

  return (
    <div>
      <Flex justify="between" align="center" mb="4">
        <div>
          <Heading size="8" mb="2">Storage Manager</Heading>
          <Text size="3" color="gray">
            Upload and manage your documents and media files
          </Text>
        </div>
        {!isRootView && (
          <Flex gap="2">
            <Button size="3" variant="soft" onClick={() => setShowCreateFolderDialog(true)}>
              <PlusIcon />
              New Folder
            </Button>
            <Button size="3" onClick={() => setShowUploadDialog(true)}>
              <UploadIcon />
              Upload Files
            </Button>
          </Flex>
        )}
      </Flex>

      <Card className="mb-6">
        <Flex gap="4" align="center" mb="3">
          {!isRootView && (
            <Button size="2" variant="soft" onClick={() => {
              setSelectedBucket(null)
              setCurrentPath([])
            }}>
              <ChevronRightIcon className="rotate-180" />
              Back to Buckets
            </Button>
          )}

          <TextField.Root 
            placeholder="Search files and folders..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          >
            <TextField.Slot>
              <MagnifyingGlassIcon />
            </TextField.Slot>
            {searchQuery && (
              <TextField.Slot>
                <IconButton 
                  size="1" 
                  variant="ghost" 
                  onClick={() => setSearchQuery('')}
                >
                  <Cross2Icon />
                </IconButton>
              </TextField.Slot>
            )}
          </TextField.Root>

          <SegmentedControl.Root value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <SegmentedControl.Item value="table">
              <TableIcon />
              Table
            </SegmentedControl.Item>
            <SegmentedControl.Item value="column">
              <ColumnsIcon />
              Columns
            </SegmentedControl.Item>
          </SegmentedControl.Root>
        </Flex>

        {/* Breadcrumb navigation */}
        <Flex align="center" gap="2">
          <Button size="1" variant="ghost" onClick={() => {
            setSelectedBucket(null)
            setCurrentPath([])
          }}>
            <HomeIcon />
          </Button>
          {selectedBucket && (
            <>
              <ChevronRightIcon />
              <Button 
                size="1" 
                variant="ghost" 
                onClick={() => setCurrentPath([])}
              >
                {currentBucket?.name || selectedBucket}
              </Button>
            </>
          )}
          {currentPath.length > 0 && <ChevronRightIcon />}
          {currentPath.map((folder, index) => (
            <Flex key={index} align="center" gap="2">
              <Button 
                size="1" 
                variant="ghost" 
                onClick={() => handleNavigateUp(index + 1)}
              >
                {folder}
              </Button>
              {index < currentPath.length - 1 && <ChevronRightIcon />}
            </Flex>
          ))}
        </Flex>
      </Card>

      {isRootView ? (
        // Show buckets as folders
        <Card>
          {loadingBuckets ? (
            <Flex justify="center" py="8">
              <Text color="gray">Loading buckets...</Text>
            </Flex>
          ) : buckets.length === 0 ? (
            <Flex direction="column" align="center" py="8" gap="4">
              <FileIcon className="w-12 h-12 text-gray-400" />
              <Text size="4" weight="medium" mb="2">No storage buckets found</Text>
              <Text color="gray" align="center" className="max-w-md">
                Storage buckets need to be created in your Supabase project.
              </Text>
              <Card mt="4" className="max-w-lg">
                <Text size="2" color="gray">
                  <strong>To set up storage buckets:</strong>
                  <br /><br />
                  <strong>Option 1: Run the setup script</strong>
                  <br />
                  <code className="bg-gray-100 px-2 py-1 rounded">npm run setup:buckets</code>
                  <br /><br />
                  <strong>Option 2: Create manually in Supabase</strong>
                  <br />
                  1. Go to your Supabase dashboard
                  <br />
                  2. Navigate to Storage → Buckets
                  <br />
                  3. Create these public buckets:
                  <br />
                  • property-images
                  <br />
                  • property-documents
                  <br />
                  • person-documents
                  <br />
                  • contract-documents
                  <br />
                  • general-storage
                </Text>
              </Card>
              <Button onClick={() => loadBuckets()} mt="2">
                Refresh Buckets
              </Button>
            </Flex>
          ) : (
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {buckets.map((bucket) => (
                  <Table.Row key={bucket.id}>
                    <Table.Cell>
                      <Flex align="center" gap="2">
                        <Text size="4">{getBucketIcon(bucket.name)}</Text>
                        <Button 
                          variant="ghost" 
                          size="2"
                          onClick={() => setSelectedBucket(bucket.id)}
                          className="font-normal"
                        >
                          {bucket.name}
                        </Button>
                      </Flex>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant="soft" color={bucket.public ? "green" : "gray"}>
                        {bucket.public ? "Public" : "Private"}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      {bucket.created_at ? formatDate(bucket.created_at) : '-'}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Card>
      ) : viewMode === 'column' && selectedBucket ? (
        <Card className="p-0">
          <ColumnView
            bucketId={selectedBucket}
            refreshTrigger={refreshTrigger}
            onFileSelect={(file) => {
              setSelectedFile(file)
              setShowPreview(true)
            }}
            onFolderSelect={(folder, path) => {
              // Update current path when folder is selected
              setCurrentPath([...path, folder])
            }}
            onDelete={async (item) => {
              await handleDelete(item.name, item.isFolder || false)
            }}
            onDownload={async (file) => {
              await handleDownload(file.name)
            }}
          />
        </Card>
      ) : (
        <Card>
          {loading ? (
            <Flex justify="center" py="8">
              <Text color="gray">Loading files...</Text>
            </Flex>
          ) : filteredItems.length === 0 ? (
            <Flex direction="column" align="center" py="8" gap="4">
              <FileIcon className="w-12 h-12 text-gray-400" />
              <Text color="gray">
                {searchQuery ? 'No items found matching your search' : 'This folder is empty'}
              </Text>
            </Flex>
          ) : (
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Size</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Modified</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="100px">Actions</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredItems.map((item) => (
                  <Table.Row key={item.id}>
                    <Table.Cell>
                      <Flex align="center" gap="2">
                        {item.isFolder ? (
                          <>
                            <Text size="4">📁</Text>
                            <Button 
                              variant="ghost" 
                              size="2"
                              onClick={() => handleNavigateToFolder(item.name)}
                              className="font-normal"
                            >
                              {item.name}
                            </Button>
                          </>
                        ) : (
                          <>
                            <FileIcon />
                            <Button
                              variant="ghost"
                              size="2"
                              onClick={() => {
                                setSelectedFile(item)
                                setShowPreview(true)
                              }}
                              className="font-normal text-left"
                            >
                              {item.name}
                            </Button>
                          </>
                        )}
                      </Flex>
                    </Table.Cell>
                    <Table.Cell>
                      {item.size ? (
                        <Badge variant="soft" color="gray">
                          {formatBytes(item.size)}
                        </Badge>
                      ) : (
                        <Text color="gray">-</Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {item.updated_at ? formatDate(item.updated_at) : '-'}
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap="2">
                        {!item.isFolder && (
                          <IconButton 
                            size="1" 
                            variant="soft"
                            onClick={() => handleDownload(item.name)}
                          >
                            <DownloadIcon />
                          </IconButton>
                        )}
                        <IconButton 
                          size="1" 
                          variant="soft" 
                          color="red"
                          onClick={() => handleDelete(item.name, item.isFolder || false)}
                        >
                          <TrashIcon />
                        </IconButton>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Card>
      )}

      {/* Upload Dialog */}
      {selectedBucket && (
        <Dialog.Root open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <Dialog.Content maxWidth="600px">
            <Dialog.Title>Upload Files</Dialog.Title>
            <Dialog.Description mb="4">
              Upload files to: {currentBucket?.name} / {currentPath.join(' / ')}
            </Dialog.Description>

            <FileUploader 
              bucketId={selectedBucket}
              folderPath={currentPath}
              onUploadComplete={() => {
                // Don't close dialog immediately - let user see success status
                loadItems()
                // Trigger refresh for column view
                setRefreshTrigger(prev => prev + 1)
              }}
            />
          </Dialog.Content>
        </Dialog.Root>
      )}

      {/* Create Folder Dialog */}
      <Dialog.Root open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <Dialog.Content maxWidth="450px">
          <Dialog.Title>Create New Folder</Dialog.Title>
          <Dialog.Description mb="4">
            Create a new folder in: {currentBucket?.name} / {currentPath.join(' / ')}
          </Dialog.Description>
          
          <TextField.Root 
            placeholder="Folder name" 
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          
          <Flex gap="3" mt="4" justify="end">
            <Button 
              variant="soft" 
              color="gray"
              onClick={() => {
                setShowCreateFolderDialog(false)
                setNewFolderName('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>
              Create Folder
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* File Preview Drawer */}
      {selectedBucket && (
        <FilePreviewDrawer
          file={selectedFile}
          bucketId={selectedBucket}
          path={currentPath}
          open={showPreview}
          onOpenChange={setShowPreview}
          onDelete={() => {
            loadItems()
            setRefreshTrigger(prev => prev + 1)
          }}
        />
      )}
    </div>
  )
}