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
  Select,
  Grid,
  Badge,
  IconButton,
  Table,
  SegmentedControl
} from '@radix-ui/themes'
import { 
  PlusIcon,
  Pencil1Icon,
  TrashIcon,
  HeartIcon,
  ActivityLogIcon
} from '@radix-ui/react-icons'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from '@/components/ui/recharts-wrapper'

interface HealthMetricsPanelProps {
  personId: string
}

interface MetricEntry {
  id: string
  metric_type: string
  value: any
  unit: string
  recorded_at: string
  notes: string
}

const METRIC_TYPES = [
  { value: 'weight', label: 'Weight', unit: 'kg', icon: '⚖️' },
  { value: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg', icon: '🩺' },
  { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: '❤️' },
  { value: 'temperature', label: 'Temperature', unit: '°C', icon: '🌡️' },
  { value: 'glucose', label: 'Blood Glucose', unit: 'mg/dL', icon: '🩸' },
  { value: 'oxygen_saturation', label: 'Oxygen Saturation', unit: '%', icon: '💨' },
  { value: 'steps', label: 'Steps', unit: 'steps', icon: '👟' },
  { value: 'sleep_hours', label: 'Sleep Hours', unit: 'hours', icon: '😴' },
]

export function HealthMetricsPanel({ personId }: HealthMetricsPanelProps) {
  const [metrics, setMetrics] = useState<MetricEntry[]>([])
  const [selectedMetricType, setSelectedMetricType] = useState('weight')
  const [timeRange, setTimeRange] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingMetric, setEditingMetric] = useState<MetricEntry | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadMetrics()
  }, [personId, selectedMetricType, timeRange])

  const loadMetrics = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(endDate.getDate() - 90)
          break
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }

      const { data, error } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('person_id', personId)
        .eq('metric_type', selectedMetricType)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true })

      if (!error && data) {
        setMetrics(data)
      }
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (metric: MetricEntry) => {
    const value = metric.value
    switch (metric.metric_type) {
      case 'blood_pressure':
        return `${value.systolic}/${value.diastolic}`
      default:
        return value.value || value
    }
  }

  const getChartData = () => {
    return metrics.map(metric => ({
      date: new Date(metric.recorded_at).toLocaleDateString(),
      value: metric.metric_type === 'blood_pressure' 
        ? metric.value.systolic 
        : (metric.value.value || metric.value),
      diastolic: metric.metric_type === 'blood_pressure' ? metric.value.diastolic : undefined
    }))
  }

  const selectedMetricInfo = METRIC_TYPES.find(m => m.value === selectedMetricType)

  return (
    <Flex direction="column" gap="4">
      {/* Controls */}
      <Card>
        <Flex justify="between" align="center" gap="4" wrap="wrap">
          <SegmentedControl.Root value={selectedMetricType} onValueChange={setSelectedMetricType}>
            {METRIC_TYPES.map(metric => (
              <SegmentedControl.Item key={metric.value} value={metric.value}>
                <Flex gap="1" align="center">
                  <Text>{metric.icon}</Text>
                  <Text size="2">{metric.label}</Text>
                </Flex>
              </SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>

          <Flex gap="2">
            <Select.Root value={timeRange} onValueChange={setTimeRange}>
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="7d">Last 7 days</Select.Item>
                <Select.Item value="30d">Last 30 days</Select.Item>
                <Select.Item value="90d">Last 90 days</Select.Item>
                <Select.Item value="1y">Last year</Select.Item>
              </Select.Content>
            </Select.Root>

            <Button onClick={() => setShowAddDialog(true)}>
              <PlusIcon />
              Add Entry
            </Button>
          </Flex>
        </Flex>
      </Card>

      {/* Chart */}
      {metrics.length > 0 && (
        <Card>
          <Text size="3" weight="bold" mb="3">
            {selectedMetricInfo?.label} Trend
          </Text>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  name={selectedMetricInfo?.label}
                />
                {selectedMetricType === 'blood_pressure' && (
                  <Line 
                    type="monotone" 
                    dataKey="diastolic" 
                    stroke="#ef4444" 
                    name="Diastolic"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Entries Table */}
      <Card>
        <Flex direction="column" gap="3">
          <Text size="3" weight="bold">Recent Entries</Text>
          
          {loading ? (
            <Text color="gray">Loading metrics...</Text>
          ) : metrics.length === 0 ? (
            <Flex direction="column" align="center" py="6" gap="3">
              <ActivityLogIcon className="w-8 h-8 text-gray-400" />
              <Text color="gray">No {selectedMetricInfo?.label.toLowerCase()} entries yet</Text>
              <Button size="2" variant="soft" onClick={() => setShowAddDialog(true)}>
                <PlusIcon />
                Add First Entry
              </Button>
            </Flex>
          ) : (
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Date & Time</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Value</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Notes</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="100px">Actions</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {metrics.slice().reverse().map(metric => (
                  <Table.Row key={metric.id}>
                    <Table.Cell>
                      {new Date(metric.recorded_at).toLocaleString()}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge size="2" variant="soft">
                        {formatValue(metric)} {metric.unit}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="2" color="gray">{metric.notes || '-'}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap="2">
                        <IconButton 
                          size="1" 
                          variant="soft"
                          onClick={() => {
                            setEditingMetric(metric)
                            setShowAddDialog(true)
                          }}
                        >
                          <Pencil1Icon />
                        </IconButton>
                        <IconButton 
                          size="1" 
                          variant="soft" 
                          color="red"
                          onClick={async () => {
                            if (confirm('Delete this entry?')) {
                              await supabase
                                .from('health_metrics')
                                .delete()
                                .eq('id', metric.id)
                              loadMetrics()
                            }
                          }}
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
        </Flex>
      </Card>

      {/* Add/Edit Dialog */}
      <MetricEntryDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open)
          if (!open) setEditingMetric(null)
        }}
        metricType={selectedMetricType}
        personId={personId}
        editingEntry={editingMetric}
        onSuccess={() => {
          loadMetrics()
          setShowAddDialog(false)
          setEditingMetric(null)
        }}
      />
    </Flex>
  )
}

interface MetricEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metricType: string
  personId: string
  editingEntry?: MetricEntry | null
  onSuccess: () => void
}

function MetricEntryDialog({ open, onOpenChange, metricType, personId, editingEntry, onSuccess }: MetricEntryDialogProps) {
  const [formData, setFormData] = useState({
    value: '',
    systolic: '',
    diastolic: '',
    notes: '',
    recorded_at: new Date().toISOString().slice(0, 16)
  })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (editingEntry && open) {
      if (metricType === 'blood_pressure') {
        setFormData({
          value: '',
          systolic: editingEntry.value.systolic?.toString() || '',
          diastolic: editingEntry.value.diastolic?.toString() || '',
          notes: editingEntry.notes || '',
          recorded_at: new Date(editingEntry.recorded_at).toISOString().slice(0, 16)
        })
      } else {
        setFormData({
          value: (editingEntry.value.value || editingEntry.value)?.toString() || '',
          systolic: '',
          diastolic: '',
          notes: editingEntry.notes || '',
          recorded_at: new Date(editingEntry.recorded_at).toISOString().slice(0, 16)
        })
      }
    } else if (!open) {
      setFormData({
        value: '',
        systolic: '',
        diastolic: '',
        notes: '',
        recorded_at: new Date().toISOString().slice(0, 16)
      })
    }
  }, [editingEntry, open, metricType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const metricInfo = METRIC_TYPES.find(m => m.value === metricType)
      
      let value: any
      if (metricType === 'blood_pressure') {
        value = {
          systolic: parseInt(formData.systolic),
          diastolic: parseInt(formData.diastolic)
        }
      } else {
        value = { value: parseFloat(formData.value) }
      }

      const metricData = {
        person_id: personId,
        user_id: user.id,
        metric_type: metricType,
        value,
        unit: metricInfo?.unit || '',
        notes: formData.notes || null,
        recorded_at: new Date(formData.recorded_at).toISOString()
      }

      if (editingEntry) {
        const { error } = await supabase
          .from('health_metrics')
          .update(metricData)
          .eq('id', editingEntry.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('health_metrics')
          .insert(metricData)

        if (error) throw error
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving metric:', error)
      alert('Failed to save metric entry')
    } finally {
      setLoading(false)
    }
  }

  const metricInfo = METRIC_TYPES.find(m => m.value === metricType)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>
          {editingEntry ? 'Edit' : 'Add'} {metricInfo?.label} Entry
        </Dialog.Title>
        
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <div>
              <Text as="label" size="2" weight="bold">
                Date & Time
              </Text>
              <TextField.Root
                type="datetime-local"
                value={formData.recorded_at}
                onChange={(e) => setFormData(prev => ({ ...prev, recorded_at: e.target.value }))}
                required
              />
            </div>

            {metricType === 'blood_pressure' ? (
              <Flex gap="3">
                <div style={{ flex: 1 }}>
                  <Text as="label" size="2" weight="bold">
                    Systolic
                  </Text>
                  <TextField.Root
                    type="number"
                    value={formData.systolic}
                    onChange={(e) => setFormData(prev => ({ ...prev, systolic: e.target.value }))}
                    placeholder="120"
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Text as="label" size="2" weight="bold">
                    Diastolic
                  </Text>
                  <TextField.Root
                    type="number"
                    value={formData.diastolic}
                    onChange={(e) => setFormData(prev => ({ ...prev, diastolic: e.target.value }))}
                    placeholder="80"
                    required
                  />
                </div>
              </Flex>
            ) : (
              <div>
                <Text as="label" size="2" weight="bold">
                  {metricInfo?.label} ({metricInfo?.unit})
                </Text>
                <TextField.Root
                  type="number"
                  step="0.1"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="Enter value"
                  required
                />
              </div>
            )}

            <div>
              <Text as="label" size="2" weight="bold">
                Notes (optional)
              </Text>
              <TextField.Root
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes"
              />
            </div>
          </Flex>

          <Flex gap="3" justify="end" mt="6">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (editingEntry ? 'Update' : 'Add')} Entry
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  )
}