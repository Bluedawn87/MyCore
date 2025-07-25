'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  Flex,
  Text,
  Heading,
  Button,
  IconButton,
  Badge,
  Separator,
  ScrollArea,
  TextField
} from '@radix-ui/themes'
import {
  Cross2Icon,
  DownloadIcon,
  TrashIcon,
  CopyIcon,
  ExternalLinkIcon,
  Pencil1Icon
} from '@radix-ui/react-icons'
import { formatBytes, formatDate } from '@/lib/utils'

interface FilePreviewDrawerProps {
  file: {
    name: string
    id: string
    size?: number
    updated_at?: string
    created_at?: string
    metadata?: any
  } | null
  bucketId: string
  path: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: () => void
}

export function FilePreviewDrawer({
  file,
  bucketId,
  path,
  open,
  onOpenChange,
  onDelete
}: FilePreviewDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (file && open) {
      loadPreview()
      setNewName(file.name)
      setIsRenaming(false)
    }
    
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [file, open])

  const loadPreview = async () => {
    if (!file) return
    
    setLoading(true)
    setError(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const fullPath = [user.id, ...path, file.name].filter(Boolean).join('/')
      
      // Generate signed URL for preview
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from(bucketId)
        .createSignedUrl(fullPath, 60 * 60) // 1 hour expiry
      
      if (urlError) {
        throw urlError
      }
      
      setPreviewUrl(signedUrl.signedUrl)
    } catch (err: any) {
      console.error('Error loading preview:', err)
      setError('Failed to load preview')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!file) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const fullPath = [user.id, ...path, file.name].filter(Boolean).join('/')
      const { data, error } = await supabase.storage
        .from(bucketId)
        .download(fullPath)

      if (error) {
        alert('Failed to download file')
        return
      }

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const handleCopyLink = async () => {
    if (previewUrl) {
      await navigator.clipboard.writeText(previewUrl)
      // You could add a toast notification here
    }
  }

  const handleDelete = async () => {
    if (!file) return
    
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const fullPath = [user.id, ...path, file.name].filter(Boolean).join('/')
        const { error } = await supabase.storage
          .from(bucketId)
          .remove([fullPath])

        if (error) {
          alert('Failed to delete file')
        } else {
          onOpenChange(false)
          if (onDelete) onDelete()
        }
      } catch (error) {
        console.error('Error deleting file:', error)
      }
    }
  }

  const handleRename = async () => {
    if (!file || !newName.trim() || newName === file.name) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const oldPath = [user.id, ...path, file.name].filter(Boolean).join('/')
      const newPath = [user.id, ...path, newName.trim()].filter(Boolean).join('/')
      
      // Supabase doesn't have a direct rename/move operation, so we need to:
      // 1. Copy the file to the new location
      // 2. Delete the old file
      
      // First, download the file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(bucketId)
        .download(oldPath)
        
      if (downloadError) {
        alert('Failed to rename file')
        return
      }
      
      // Upload with new name
      const { error: uploadError } = await supabase.storage
        .from(bucketId)
        .upload(newPath, fileData, {
          cacheControl: '3600',
          contentType: file.metadata?.mimetype || fileData.type || 'application/octet-stream'
        })
        
      if (uploadError) {
        alert('Failed to rename file: ' + uploadError.message)
        return
      }
      
      // Delete old file
      const { error: deleteError } = await supabase.storage
        .from(bucketId)
        .remove([oldPath])
        
      if (deleteError) {
        console.error('Failed to delete old file:', deleteError)
      }
      
      setIsRenaming(false)
      onOpenChange(false)
      if (onDelete) onDelete() // Trigger refresh
    } catch (error) {
      console.error('Error renaming file:', error)
      alert('Failed to rename file')
    }
  }

  const getFileType = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (!ext) return 'file'
    
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico']
    const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi']
    const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'm4a']
    const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
    const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'html', 'css', 'json', 'xml', 'yml', 'yaml']
    
    if (imageExts.includes(ext)) return 'image'
    if (videoExts.includes(ext)) return 'video'
    if (audioExts.includes(ext)) return 'audio'
    if (docExts.includes(ext)) return 'document'
    if (codeExts.includes(ext)) return 'code'
    if (ext === 'txt' || ext === 'md') return 'text'
    
    return 'file'
  }

  const renderPreview = () => {
    if (!file || !previewUrl) return null
    
    const fileType = getFileType(file.name)
    
    switch (fileType) {
      case 'image':
        return (
          <img 
            src={previewUrl} 
            alt={file.name}
            className="max-w-full max-h-[400px] object-contain mx-auto rounded-md"
          />
        )
      
      case 'video':
        return (
          <video 
            controls 
            className="max-w-full max-h-[400px] rounded-md"
            src={previewUrl}
          >
            Your browser does not support the video tag.
          </video>
        )
      
      case 'audio':
        return (
          <audio controls className="w-full">
            <source src={previewUrl} />
            Your browser does not support the audio tag.
          </audio>
        )
      
      case 'pdf':
        return (
          <iframe 
            src={previewUrl} 
            className="w-full h-[500px] rounded-md border"
            title={file.name}
          />
        )
      
      default:
        return (
          <Flex direction="column" align="center" gap="4" py="8">
            <Text size="6">📄</Text>
            <Text color="gray">Preview not available for this file type</Text>
            <Button onClick={handleDownload}>
              <DownloadIcon />
              Download to view
            </Button>
          </Flex>
        )
    }
  }

  if (!file) return null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content 
        maxWidth="800px" 
        className="relative"
        style={{ maxHeight: '90vh' }}
      >
        <Dialog.Title>
          <Flex justify="between" align="center">
            <Flex align="center" gap="2" className="flex-1">
              {isRenaming ? (
                <TextField.Root
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename()
                    if (e.key === 'Escape') {
                      setIsRenaming(false)
                      setNewName(file.name)
                    }
                  }}
                  className="flex-1"
                  autoFocus
                />
              ) : (
                <Heading size="4">{file.name}</Heading>
              )}
              {!isRenaming && (
                <IconButton
                  size="1"
                  variant="ghost"
                  onClick={() => setIsRenaming(true)}
                >
                  <Pencil1Icon />
                </IconButton>
              )}
            </Flex>
            <Flex gap="2" align="center">
              {isRenaming && (
                <>
                  <Button size="1" onClick={handleRename}>
                    Save
                  </Button>
                  <Button
                    size="1"
                    variant="soft"
                    color="gray"
                    onClick={() => {
                      setIsRenaming(false)
                      setNewName(file.name)
                    }}
                  >
                    Cancel
                  </Button>
                </>
              )}
              <Dialog.Close>
                <IconButton size="1" variant="ghost">
                  <Cross2Icon />
                </IconButton>
              </Dialog.Close>
            </Flex>
          </Flex>
        </Dialog.Title>

        <Separator my="4" />

        <ScrollArea style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* File Details */}
          <Flex direction="column" gap="2" mb="4">
            <Flex gap="2" wrap="wrap">
              {file.size && (
                <Badge variant="soft" color="gray">
                  {formatBytes(file.size)}
                </Badge>
              )}
              <Badge variant="soft" color="blue">
                {getFileType(file.name)}
              </Badge>
              {file.updated_at && (
                <Badge variant="soft" color="gray">
                  Modified: {formatDate(file.updated_at)}
                </Badge>
              )}
            </Flex>
            
            <Text size="2" color="gray">
              Path: /{path.join('/')}/{file.name}
            </Text>
          </Flex>

          <Separator my="4" />

          {/* Preview Area */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 min-h-[200px]">
            {loading ? (
              <Flex align="center" justify="center" py="8">
                <Text>Loading preview...</Text>
              </Flex>
            ) : error ? (
              <Flex direction="column" align="center" gap="2" py="8">
                <Text color="red">{error}</Text>
                <Button onClick={loadPreview} variant="soft">
                  Retry
                </Button>
              </Flex>
            ) : (
              renderPreview()
            )}
          </div>
        </ScrollArea>

        <Separator my="4" />

        {/* Actions */}
        <Flex gap="2" justify="between">
          <Flex gap="2">
            <Button onClick={handleDownload}>
              <DownloadIcon />
              Download
            </Button>
            <Button variant="soft" onClick={handleCopyLink} disabled={!previewUrl}>
              <CopyIcon />
              Copy Link
            </Button>
            {previewUrl && (
              <Button 
                variant="soft" 
                onClick={() => window.open(previewUrl, '_blank')}
              >
                <ExternalLinkIcon />
                Open in New Tab
              </Button>
            )}
          </Flex>
          
          <Button color="red" variant="soft" onClick={handleDelete}>
            <TrashIcon />
            Delete
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}