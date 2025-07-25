'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Flex,
  ScrollArea,
  Text,
  Card,
  IconButton,
  Badge,
  Button
} from '@radix-ui/themes'
import {
  FileIcon,
  DownloadIcon,
  TrashIcon
} from '@radix-ui/react-icons'
import { formatBytes, formatDate } from '@/lib/utils'

interface StorageItem {
  name: string
  id: string
  updated_at?: string
  created_at?: string
  size?: number
  metadata?: any
  isFolder?: boolean
}

interface ColumnData {
  path: string[]
  items: StorageItem[]
}

interface ColumnViewProps {
  bucketId: string
  onFileSelect?: (file: StorageItem, path: string[]) => void
  onFolderSelect?: (folder: string, path: string[]) => void
  onDelete?: (item: StorageItem, path: string[]) => void
  onDownload?: (file: StorageItem, path: string[]) => void
  refreshTrigger?: number
}

export function ColumnView({ 
  bucketId, 
  onFileSelect, 
  onFolderSelect, 
  onDelete, 
  onDownload,
  refreshTrigger 
}: ColumnViewProps) {
  const [columns, setColumns] = useState<ColumnData[]>([{ path: [], items: [] }])
  const [selectedPaths, setSelectedPaths] = useState<Map<number, string>>(new Map())
  const [loading, setLoading] = useState<Map<number, boolean>>(new Map())
  const supabase = createClient()

  useEffect(() => {
    loadColumn(0, [])
  }, [bucketId])

  useEffect(() => {
    // Refresh the current columns when trigger changes
    if (refreshTrigger && refreshTrigger > 0) {
      columns.forEach((column, index) => {
        loadColumn(index, column.path)
      })
    }
  }, [refreshTrigger])

  const loadColumn = async (columnIndex: number, path: string[]) => {
    setLoading(prev => new Map(prev).set(columnIndex, true))
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const fullPath = [user.id, ...path].filter(Boolean).join('/')
      const { data, error } = await supabase.storage
        .from(bucketId)
        .list(fullPath, {
          limit: 100,
          offset: 0
        })

      if (!error && data) {
        // Separate and process folders and files
        const folders: StorageItem[] = []
        const files: StorageItem[] = []
        
        data.forEach((item, index) => {
          // Skip .keep files
          if (item.name === '.keep') return
          
          // Better folder detection:
          // 1. If it has metadata.size, it's definitely a file
          // 2. If name ends with /, it's a folder
          // 3. Otherwise, check if it has a file extension
          
          const hasSize = item.metadata?.size !== undefined || (item as any).size !== undefined
          const endsWithSlash = item.name.endsWith('/')
          const hasExtension = item.name.includes('.') && !item.name.endsWith('.')
          
          // It's a folder if: no size AND (ends with slash OR no extension)
          const isFolder = !hasSize && (endsWithSlash || !hasExtension)
          
          if (isFolder) {
            folders.push({
              ...item,
              id: item.id || `${bucketId}-col${columnIndex}-folder-${index}-${item.name}`,
              name: item.name.replace('/', ''),
              isFolder: true
            })
          } else {
            files.push({
              ...item,
              id: item.id || `${bucketId}-col${columnIndex}-file-${index}-${item.name}`,
              isFolder: false
            })
          }
        })
        
        // Sort folders first, then files
        const sortedItems = [...folders.sort((a, b) => a.name.localeCompare(b.name)), 
                            ...files.sort((a, b) => a.name.localeCompare(b.name))]

        setColumns(prev => {
          const newColumns = [...prev.slice(0, columnIndex + 1)]
          newColumns[columnIndex] = { path, items: sortedItems }
          return newColumns
        })
      }
    } catch (error) {
      console.error('Error loading column:', error)
    } finally {
      setLoading(prev => {
        const newMap = new Map(prev)
        newMap.delete(columnIndex)
        return newMap
      })
    }
  }

  const handleItemClick = (item: StorageItem, columnIndex: number, path: string[]) => {
    // Update selected paths
    setSelectedPaths(prev => {
      const newMap = new Map(prev)
      // Clear selections in deeper columns
      for (let i = columnIndex; i < columns.length; i++) {
        newMap.delete(i)
      }
      newMap.set(columnIndex, item.name)
      return newMap
    })

    if (item.isFolder) {
      const newPath = [...path, item.name]
      loadColumn(columnIndex + 1, newPath)
      
      if (onFolderSelect) {
        onFolderSelect(item.name, path)
      }
    } else {
      // Remove any columns beyond this one
      setColumns(prev => prev.slice(0, columnIndex + 1))
      
      if (onFileSelect) {
        onFileSelect(item, path)
      }
    }
  }

  const handleDownload = async (item: StorageItem, path: string[]) => {
    if (onDownload) {
      onDownload(item, path)
    }
  }

  const handleDelete = async (item: StorageItem, path: string[]) => {
    if (onDelete) {
      onDelete(item, path)
      // Reload the current column after deletion
      const columnIndex = columns.findIndex(col => 
        col.path.length === path.length && 
        col.path.every((p, i) => p === path[i])
      )
      if (columnIndex >= 0) {
        loadColumn(columnIndex, path)
      }
    }
  }

  return (
    <Flex className="h-[600px] border rounded-md overflow-hidden">
      {columns.map((column, columnIndex) => (
        <div
          key={columnIndex}
          className="flex-1 min-w-[250px] border-r last:border-r-0 overflow-hidden"
        >
          <ScrollArea className="h-full">
            {loading.get(columnIndex) ? (
              <Flex justify="center" py="4">
                <Text color="gray">Loading...</Text>
              </Flex>
            ) : column.items.length === 0 ? (
              <Flex justify="center" py="4">
                <Text color="gray" size="2">Empty folder</Text>
              </Flex>
            ) : (
              <div className="p-2">
                {column.items.map((item) => {
                  const isSelected = selectedPaths.get(columnIndex) === item.name
                  
                  return (
                    <Card
                      key={item.id}
                      className={`mb-1 p-2 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleItemClick(item, columnIndex, column.path)}
                    >
                      <Flex justify="between" align="center">
                        <Flex align="center" gap="2" className="flex-1 min-w-0">
                          {item.isFolder ? (
                            <Text size="3">📁</Text>
                          ) : (
                            <FileIcon className="w-4 h-4 text-gray-500" />
                          )}
                          <Text size="2" className="truncate">
                            {item.name}
                          </Text>
                        </Flex>
                        
                        {!item.isFolder && (
                          <Flex gap="1" onClick={(e) => e.stopPropagation()}>
                            <IconButton
                              size="1"
                              variant="ghost"
                              onClick={() => handleDownload(item, column.path)}
                            >
                              <DownloadIcon />
                            </IconButton>
                            <IconButton
                              size="1"
                              variant="ghost"
                              color="red"
                              onClick={() => handleDelete(item, column.path)}
                            >
                              <TrashIcon />
                            </IconButton>
                          </Flex>
                        )}
                      </Flex>
                      
                      {!item.isFolder && item.size && (
                        <Flex gap="2" mt="1">
                          <Badge variant="soft" color="gray" size="1">
                            {formatBytes(item.size)}
                          </Badge>
                          {item.updated_at && (
                            <Text size="1" color="gray">
                              {formatDate(item.updated_at)}
                            </Text>
                          )}
                        </Flex>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      ))}
    </Flex>
  )
}