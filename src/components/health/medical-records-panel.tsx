'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Card, 
  Flex, 
  Text, 
  Button,
  Dialog,
  TextField,
  TextArea,
  Select,
  Grid,
  Badge,
  IconButton,
  Table,
  SegmentedControl,
  Separator
} from '@radix-ui/themes'
import { 
  PlusIcon,
  FileTextIcon,
  DownloadIcon,
  TrashIcon,
  UploadIcon,
  EyeOpenIcon,
  CalendarIcon
} from '@radix-ui/react-icons'

interface MedicalRecordsPanelProps {
  personId: string
}

interface MedicalRecord {
  id: string
  record_type: string
  title: string
  description: string
  record_date: string
  provider_name: string
  file_url: string
  file_name: string
  created_at: string
}

const RECORD_TYPES = [
  { value: 'lab_result', label: 'Lab Result', icon: '🧪' },
  { value: 'prescription', label: 'Prescription', icon: '💊' },
  { value: 'imaging', label: 'Imaging', icon: '🩻' },
  { value: 'consultation', label: 'Consultation', icon: '🩺' },
  { value: 'vaccination', label: 'Vaccination', icon: '💉' },
  { value: 'surgery', label: 'Surgery/Procedure', icon: '🏥' },
  { value: 'insurance', label: 'Insurance', icon: '📋' },
  { value: 'other', label: 'Other', icon: '📄' },
]

export function MedicalRecordsPanel({ personId }: MedicalRecordsPanelProps) {
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [filteredType, setFilteredType] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadRecords()
  }, [personId])

  const loadRecords = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const query = supabase
        .from('medical_records')
        .select('*')
        .eq('person_id', personId)
        .order('record_date', { ascending: false })

      if (filteredType !== 'all') {
        query.eq('record_type', filteredType)
      }

      const { data, error } = await query

      if (!error && data) {
        setRecords(data)
      }
    } catch (error) {
      console.error('Error loading records:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (record: MedicalRecord) => {
    if (!confirm('Are you sure you want to delete this medical record?')) return

    try {
      // Delete file from storage if exists
      if (record.file_url) {
        const fileName = record.file_url.split('/').pop()
        if (fileName) {
          await supabase.storage
            .from('medical-records')
            .remove([`${personId}/${fileName}`])
        }
      }

      // Delete record from database
      const { error } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', record.id)

      if (error) throw error

      loadRecords()
    } catch (error) {
      console.error('Error deleting record:', error)
      alert('Failed to delete record')
    }
  }

  const getRecordTypeInfo = (type: string) => {
    return RECORD_TYPES.find(t => t.value === type) || RECORD_TYPES[RECORD_TYPES.length - 1]
  }

  const filteredRecords = filteredType === 'all' 
    ? records 
    : records.filter(r => r.record_type === filteredType)

  return (
    <Flex direction="column" gap="4">
      {/* Controls */}
      <Card>
        <Flex justify="between" align="center" gap="4" wrap="wrap">
          <SegmentedControl.Root value={filteredType} onValueChange={setFilteredType}>
            <SegmentedControl.Item value="all">
              <Flex gap="1" align="center">
                <Text>📁</Text>
                <Text size="2">All Records</Text>
              </Flex>
            </SegmentedControl.Item>
            {RECORD_TYPES.slice(0, 4).map(type => (
              <SegmentedControl.Item key={type.value} value={type.value}>
                <Flex gap="1" align="center">
                  <Text>{type.icon}</Text>
                  <Text size="2">{type.label}</Text>
                </Flex>
              </SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>

          <Button onClick={() => setShowUploadDialog(true)}>
            <UploadIcon />
            Upload Record
          </Button>
        </Flex>
      </Card>

      {/* Records Grid */}
      {loading ? (
        <Card>
          <Flex justify="center" py="8">
            <Text color="gray">Loading medical records...</Text>
          </Flex>
        </Card>
      ) : filteredRecords.length === 0 ? (
        <Card>
          <Flex direction="column" align="center" py="8" gap="4">
            <FileTextIcon className="w-12 h-12 text-gray-400" />
            <Text size="4" weight="medium">No medical records found</Text>
            <Text color="gray">Upload your medical documents to keep them organized</Text>
            <Button size="3" variant="soft" onClick={() => setShowUploadDialog(true)}>
              <UploadIcon />
              Upload First Record
            </Button>
          </Flex>
        </Card>
      ) : (
        <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="4">
          {filteredRecords.map(record => {
            const typeInfo = getRecordTypeInfo(record.record_type)
            return (
              <Card key={record.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <Flex direction="column" gap="3">
                  <Flex justify="between" align="start">
                    <Flex gap="2" align="center">
                      <Text size="5">{typeInfo.icon}</Text>
                      <Badge size="1" variant="soft">{typeInfo.label}</Badge>
                    </Flex>
                    <Flex gap="1">
                      {record.file_url && (
                        <IconButton
                          size="1"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(record.file_url, '_blank')
                          }}
                        >
                          <EyeOpenIcon />
                        </IconButton>
                      )}
                      <IconButton
                        size="1"
                        variant="ghost"
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(record)
                        }}
                      >
                        <TrashIcon />
                      </IconButton>
                    </Flex>
                  </Flex>

                  <div onClick={() => setSelectedRecord(record)}>
                    <Text size="3" weight="bold" className="line-clamp-2">
                      {record.title}
                    </Text>
                    <Text size="2" color="gray" className="line-clamp-2 mt-1">
                      {record.description}
                    </Text>
                  </div>

                  <Separator size="4" />

                  <Flex justify="between" align="center">
                    <Flex direction="column" gap="1">
                      <Text size="1" color="gray">Date</Text>
                      <Text size="2">
                        {new Date(record.record_date).toLocaleDateString()}
                      </Text>
                    </Flex>
                    {record.provider_name && (
                      <Flex direction="column" gap="1" align="end">
                        <Text size="1" color="gray">Provider</Text>
                        <Text size="2">{record.provider_name}</Text>
                      </Flex>
                    )}
                  </Flex>

                  {record.file_name && (
                    <Flex align="center" gap="2" className="mt-2">
                      <FileTextIcon className="text-gray-500" />
                      <Text size="1" color="gray" className="truncate">
                        {record.file_name}
                      </Text>
                    </Flex>
                  )}
                </Flex>
              </Card>
            )
          })}
        </Grid>
      )}

      {/* Upload Dialog */}
      <RecordUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        personId={personId}
        onSuccess={() => {
          loadRecords()
          setShowUploadDialog(false)
        }}
      />

      {/* Record Details Dialog */}
      {selectedRecord && (
        <Dialog.Root open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <Dialog.Content style={{ maxWidth: 600 }}>
            <Dialog.Title>{selectedRecord.title}</Dialog.Title>
            
            <Flex direction="column" gap="4">
              <Grid columns="2" gap="4">
                <div>
                  <Text size="2" color="gray">Type</Text>
                  <Badge size="2" mt="1">
                    {getRecordTypeInfo(selectedRecord.record_type).icon} {getRecordTypeInfo(selectedRecord.record_type).label}
                  </Badge>
                </div>
                <div>
                  <Text size="2" color="gray">Date</Text>
                  <Text size="3" weight="medium">
                    {new Date(selectedRecord.record_date).toLocaleDateString()}
                  </Text>
                </div>
                {selectedRecord.provider_name && (
                  <div>
                    <Text size="2" color="gray">Provider</Text>
                    <Text size="3" weight="medium">{selectedRecord.provider_name}</Text>
                  </div>
                )}
                <div>
                  <Text size="2" color="gray">Uploaded</Text>
                  <Text size="3" weight="medium">
                    {new Date(selectedRecord.created_at).toLocaleDateString()}
                  </Text>
                </div>
              </Grid>

              {selectedRecord.description && (
                <div>
                  <Text size="2" color="gray">Description</Text>
                  <Text size="3" className="whitespace-pre-wrap">{selectedRecord.description}</Text>
                </div>
              )}

              {selectedRecord.file_url && (
                <Flex gap="3" mt="2">
                  <Button 
                    size="3" 
                    onClick={() => window.open(selectedRecord.file_url, '_blank')}
                  >
                    <EyeOpenIcon />
                    View Document
                  </Button>
                  <Button 
                    size="3" 
                    variant="soft"
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = selectedRecord.file_url
                      link.download = selectedRecord.file_name
                      link.click()
                    }}
                  >
                    <DownloadIcon />
                    Download
                  </Button>
                </Flex>
              )}
            </Flex>

            <Flex gap="3" justify="end" mt="6">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Close
                </Button>
              </Dialog.Close>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      )}
    </Flex>
  )
}

interface RecordUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  personId: string
  onSuccess: () => void
}

function RecordUploadDialog({ open, onOpenChange, personId, onSuccess }: RecordUploadDialogProps) {
  const [formData, setFormData] = useState({
    record_type: 'lab_result',
    title: '',
    description: '',
    record_date: new Date().toISOString().split('T')[0],
    provider_name: ''
  })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      let file_url = null
      let file_name = null

      // Upload file if provided
      if (file) {
        // Create bucket if it doesn't exist
        const bucketName = 'medical-records'
        
        // Check if bucket exists
        const { data: buckets } = await supabase.storage.listBuckets()
        const bucketExists = buckets?.some(b => b.name === bucketName)
        
        if (!bucketExists) {
          await supabase.storage.createBucket(bucketName, { public: true })
        }

        // Upload file
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const filePath = `${personId}/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath)

        file_url = publicUrl
        file_name = file.name
      }

      // Save record to database
      const { error } = await supabase
        .from('medical_records')
        .insert({
          person_id: personId,
          user_id: user.id,
          ...formData,
          file_url,
          file_name,
          metadata: {}
        })

      if (error) throw error

      onSuccess()
    } catch (error) {
      console.error('Error uploading record:', error)
      alert('Failed to upload medical record')
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      record_type: 'lab_result',
      title: '',
      description: '',
      record_date: new Date().toISOString().split('T')[0],
      provider_name: ''
    })
    setFile(null)
  }

  useEffect(() => {
    if (!open) resetForm()
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>Upload Medical Record</Dialog.Title>
        
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <div>
              <Text as="label" size="2" weight="bold">
                Record Type *
              </Text>
              <Select.Root 
                value={formData.record_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, record_type: value }))}
              >
                <Select.Trigger />
                <Select.Content>
                  {RECORD_TYPES.map(type => (
                    <Select.Item key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>

            <div>
              <Text as="label" size="2" weight="bold">
                Title *
              </Text>
              <TextField.Root
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Annual Blood Work Results"
                required
              />
            </div>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold">
                  Record Date *
                </Text>
                <TextField.Root
                  type="date"
                  value={formData.record_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, record_date: e.target.value }))}
                  required
                />
              </div>

              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold">
                  Provider/Facility
                </Text>
                <TextField.Root
                  value={formData.provider_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, provider_name: e.target.value }))}
                  placeholder="Doctor or facility name"
                />
              </div>
            </Flex>

            <div>
              <Text as="label" size="2" weight="bold">
                Description
              </Text>
              <TextArea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional notes about this record"
                rows={3}
              />
            </div>

            <div>
              <Text as="label" size="2" weight="bold">
                Document File
              </Text>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full mt-1"
              />
              <Text size="1" color="gray" mt="1">
                Supported: PDF, JPG, PNG, DOC, DOCX (Max 50MB)
              </Text>
            </div>
          </Flex>

          <Flex gap="3" justify="end" mt="6">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={uploading || !formData.title}>
              {uploading ? 'Uploading...' : 'Upload Record'}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  )
}