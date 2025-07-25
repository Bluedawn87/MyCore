'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Flex, 
  Text, 
  Button, 
  Card,
  Progress,
  Badge,
  ScrollArea
} from '@radix-ui/themes'
import { 
  UploadIcon, 
  CheckCircledIcon, 
  CrossCircledIcon,
  FileIcon
} from '@radix-ui/react-icons'
import { formatBytes } from '@/lib/utils'

interface FileWithProgress {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

interface FileUploaderProps {
  bucketId: string
  folderPath?: string[]
  onUploadComplete?: () => void
}

export function FileUploader({ bucketId, folderPath = [], onUploadComplete }: FileUploaderProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      addFiles(selectedFiles)
    }
  }, [])

  const addFiles = (newFiles: File[]) => {
    const filesWithProgress: FileWithProgress[] = newFiles.map(file => ({
      file: file,
      id: Math.random().toString(36).substring(7),
      progress: 0,
      status: 'pending' as const
    }))
    
    setFiles(prev => [...prev, ...filesWithProgress])
  }

  const uploadFile = async (file: FileWithProgress) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'uploading' } : f
      ))

      // Create file path with user ID and folder path
      const pathSegments = [user.id, ...folderPath]
      const fileName = file.file.name || 'unnamed-file'
      const filePath = `${pathSegments.join('/')}/${fileName}`

      // Upload file with explicit content type
      const { error } = await supabase.storage
        .from(bucketId)
        .upload(filePath, file.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.file.type || 'application/octet-stream'
        })

      if (error) throw error

      // Update status to success
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'success', progress: 100 } : f
      ))
      
      // Call onUploadComplete immediately after successful upload
      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { 
          ...f, 
          status: 'error', 
          error: error.message || 'Upload failed' 
        } : f
      ))
    }
  }

  const uploadAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')
    
    // Upload files in parallel (max 3 at a time)
    for (let i = 0; i < pendingFiles.length; i += 3) {
      const batch = pendingFiles.slice(i, i + 3)
      const batchPromises = batch.map(file => uploadFile(file))
      await Promise.all(batchPromises)
    }
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const pendingFiles = files.filter(f => f.status === 'pending')
  const uploadingFiles = files.filter(f => f.status === 'uploading')

  return (
    <div>
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Flex direction="column" align="center" gap="4" p="6">
          <UploadIcon className="w-12 h-12 text-gray-400" />
          <div className="text-center">
            <Text size="3" weight="medium" className="block mb-1">
              Drop files here or click to browse
            </Text>
            <Text size="2" color="gray">
              Maximum file size: 100MB for media, 50MB for documents
            </Text>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
          <Button 
            variant="soft" 
            onClick={() => fileInputRef.current?.click()}
          >
            Select Files
          </Button>
        </Flex>
      </Card>

      {files.length > 0 && (
        <>
          <ScrollArea className="max-h-64 mt-4">
            <Flex direction="column" gap="2">
              {files.map(file => (
                <Card key={file.id} className="p-3">
                  <Flex justify="between" align="center">
                    <Flex align="center" gap="3" className="flex-1">
                      <FileIcon className="w-4 h-4 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <Text size="2" weight="medium" className="block truncate">
                          {file.file.name}
                        </Text>
                        <Text size="1" color="gray">
                          {formatBytes(file.file.size)}
                        </Text>
                      </div>
                    </Flex>
                    
                    <Flex align="center" gap="3">
                      {file.status === 'pending' && (
                        <Button 
                          size="1" 
                          variant="ghost" 
                          color="red"
                          onClick={() => removeFile(file.id)}
                        >
                          Remove
                        </Button>
                      )}
                      
                      {file.status === 'uploading' && (
                        <Flex align="center" gap="2" className="w-32">
                          <Progress value={50} className="flex-1" />
                          <Text size="1" color="gray">
                            Uploading...
                          </Text>
                        </Flex>
                      )}
                      
                      {file.status === 'success' && (
                        <Badge color="green" variant="soft">
                          <CheckCircledIcon />
                          Uploaded
                        </Badge>
                      )}
                      
                      {file.status === 'error' && (
                        <Badge color="red" variant="soft">
                          <CrossCircledIcon />
                          {file.error || 'Failed'}
                        </Badge>
                      )}
                    </Flex>
                  </Flex>
                </Card>
              ))}
            </Flex>
          </ScrollArea>

          <Flex justify="between" align="center" mt="4">
            <Text size="2" color="gray">
              {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''} ready to upload
            </Text>
            <Button 
              onClick={uploadAll}
              disabled={pendingFiles.length === 0 || uploadingFiles.length > 0}
            >
              {uploadingFiles.length > 0 ? 'Uploading...' : 'Upload All'}
            </Button>
          </Flex>
        </>
      )}
    </div>
  )
}