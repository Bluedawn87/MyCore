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
  Badge,
  IconButton,
  Table,
  Checkbox,
  Tabs
} from '@radix-ui/themes'
import { 
  PlusIcon,
  BellIcon,
  CheckIcon,
  CalendarIcon,
  TrashIcon,
  Pencil1Icon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@radix-ui/react-icons'

interface HealthRemindersPanelProps {
  personId: string
}

interface HealthReminder {
  id: string
  title: string
  description: string
  reminder_type: string
  due_date: string
  frequency: string
  last_completed: string | null
  status: string
  created_at: string
}

const REMINDER_TYPES = [
  { value: 'checkup', label: 'Regular Checkup', icon: '🩺' },
  { value: 'medication', label: 'Medication', icon: '💊' },
  { value: 'test', label: 'Lab Test', icon: '🧪' },
  { value: 'vaccination', label: 'Vaccination', icon: '💉' },
  { value: 'screening', label: 'Health Screening', icon: '🔍' },
  { value: 'appointment', label: 'Appointment', icon: '📅' },
  { value: 'other', label: 'Other', icon: '🔔' },
]

const FREQUENCIES = [
  { value: 'once', label: 'One Time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 Months' },
  { value: 'biannual', label: 'Every 6 Months' },
  { value: 'yearly', label: 'Yearly' },
]

// Common health checkup recommendations by age
const CHECKUP_RECOMMENDATIONS = [
  { test: 'Annual Physical Exam', frequency: 'yearly', allAges: true },
  { test: 'Dental Checkup', frequency: 'biannual', allAges: true },
  { test: 'Eye Exam', frequency: 'yearly', allAges: true },
  { test: 'Blood Pressure Check', frequency: 'yearly', minAge: 18 },
  { test: 'Cholesterol Test', frequency: 'yearly', minAge: 20 },
  { test: 'Diabetes Screening', frequency: 'yearly', minAge: 35 },
  { test: 'Mammogram', frequency: 'yearly', minAge: 40, gender: 'female' },
  { test: 'Colonoscopy', frequency: 'yearly', minAge: 45 },
  { test: 'Bone Density Test', frequency: 'yearly', minAge: 50, gender: 'female' },
  { test: 'Prostate Exam', frequency: 'yearly', minAge: 50, gender: 'male' },
]

export function HealthRemindersPanel({ personId }: HealthRemindersPanelProps) {
  const [reminders, setReminders] = useState<HealthReminder[]>([])
  const [activeTab, setActiveTab] = useState('upcoming')
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingReminder, setEditingReminder] = useState<HealthReminder | null>(null)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadReminders()
  }, [personId])

  const loadReminders = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('health_reminders')
        .select('*')
        .eq('person_id', personId)
        .order('due_date', { ascending: true })

      if (!error && data) {
        setReminders(data)
      }
    } catch (error) {
      console.error('Error loading reminders:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsComplete = async (reminder: HealthReminder) => {
    try {
      const updates: any = {
        last_completed: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Calculate next due date based on frequency
      if (reminder.frequency !== 'once') {
        const nextDate = new Date(reminder.due_date)
        switch (reminder.frequency) {
          case 'daily':
            nextDate.setDate(nextDate.getDate() + 1)
            break
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7)
            break
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1)
            break
          case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3)
            break
          case 'biannual':
            nextDate.setMonth(nextDate.getMonth() + 6)
            break
          case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1)
            break
        }
        updates.due_date = nextDate.toISOString().split('T')[0]
      } else {
        updates.status = 'completed'
      }

      const { error } = await supabase
        .from('health_reminders')
        .update(updates)
        .eq('id', reminder.id)

      if (error) throw error
      loadReminders()
    } catch (error) {
      console.error('Error marking reminder as complete:', error)
    }
  }

  const deleteReminder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return

    try {
      const { error } = await supabase
        .from('health_reminders')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadReminders()
    } catch (error) {
      console.error('Error deleting reminder:', error)
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const isOverdue = (dueDate: string) => getDaysUntilDue(dueDate) < 0

  const getReminderTypeInfo = (type: string) => {
    return REMINDER_TYPES.find(t => t.value === type) || REMINDER_TYPES[REMINDER_TYPES.length - 1]
  }

  // Filter reminders based on active tab
  const filteredReminders = reminders.filter(reminder => {
    const daysUntil = getDaysUntilDue(reminder.due_date)
    switch (activeTab) {
      case 'upcoming':
        return reminder.status === 'active' && daysUntil >= 0 && daysUntil <= 30
      case 'overdue':
        return reminder.status === 'active' && daysUntil < 0
      case 'all':
        return true
      case 'completed':
        return reminder.status === 'completed'
      default:
        return true
    }
  })

  return (
    <Flex direction="column" gap="4">
      {/* Header */}
      <Flex justify="between" align="center">
        <Text size="4" weight="bold">Health Reminders</Text>
        <Flex gap="2">
          <Button variant="soft" onClick={() => setShowRecommendations(true)}>
            <ExclamationTriangleIcon />
            Recommendations
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <PlusIcon />
            Add Reminder
          </Button>
        </Flex>
      </Flex>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Trigger value="upcoming">
            <BellIcon />
            Upcoming
            {reminders.filter(r => r.status === 'active' && getDaysUntilDue(r.due_date) >= 0 && getDaysUntilDue(r.due_date) <= 30).length > 0 && (
              <Badge size="1" color="blue" ml="2">
                {reminders.filter(r => r.status === 'active' && getDaysUntilDue(r.due_date) >= 0 && getDaysUntilDue(r.due_date) <= 30).length}
              </Badge>
            )}
          </Tabs.Trigger>
          <Tabs.Trigger value="overdue">
            <ExclamationTriangleIcon />
            Overdue
            {reminders.filter(r => r.status === 'active' && getDaysUntilDue(r.due_date) < 0).length > 0 && (
              <Badge size="1" color="red" ml="2">
                {reminders.filter(r => r.status === 'active' && getDaysUntilDue(r.due_date) < 0).length}
              </Badge>
            )}
          </Tabs.Trigger>
          <Tabs.Trigger value="all">All Active</Tabs.Trigger>
          <Tabs.Trigger value="completed">Completed</Tabs.Trigger>
        </Tabs.List>

        <div className="mt-4">
          {loading ? (
            <Card>
              <Flex justify="center" py="8">
                <Text color="gray">Loading reminders...</Text>
              </Flex>
            </Card>
          ) : filteredReminders.length === 0 ? (
            <Card>
              <Flex direction="column" align="center" py="8" gap="4">
                <BellIcon className="w-12 h-12 text-gray-400" />
                <Text size="4" weight="medium">
                  {activeTab === 'overdue' ? 'No overdue reminders' : 
                   activeTab === 'completed' ? 'No completed reminders' :
                   'No reminders found'}
                </Text>
                {activeTab === 'upcoming' && (
                  <>
                    <Text color="gray">Set reminders for health checkups and medications</Text>
                    <Button size="3" variant="soft" onClick={() => setShowCreateDialog(true)}>
                      <PlusIcon />
                      Create Your First Reminder
                    </Button>
                  </>
                )}
              </Flex>
            </Card>
          ) : (
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Reminder</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Due Date</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Frequency</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="150px">Actions</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredReminders.map(reminder => {
                  const typeInfo = getReminderTypeInfo(reminder.reminder_type)
                  const daysUntil = getDaysUntilDue(reminder.due_date)
                  const overdue = isOverdue(reminder.due_date)
                  
                  return (
                    <Table.Row key={reminder.id}>
                      <Table.Cell>
                        <Flex direction="column" gap="1">
                          <Flex align="center" gap="2">
                            <Text size="3">{typeInfo.icon}</Text>
                            <Text weight="medium">{reminder.title}</Text>
                          </Flex>
                          {reminder.description && (
                            <Text size="1" color="gray">{reminder.description}</Text>
                          )}
                        </Flex>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge size="1" variant="soft">{typeInfo.label}</Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Flex direction="column" gap="1">
                          <Text>{new Date(reminder.due_date).toLocaleDateString()}</Text>
                          {reminder.status === 'active' && (
                            <Text size="1" color={overdue ? 'red' : daysUntil <= 7 ? 'orange' : 'gray'}>
                              {overdue ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days`}
                            </Text>
                          )}
                        </Flex>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge size="1" color="gray">
                          {FREQUENCIES.find(f => f.value === reminder.frequency)?.label}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        {reminder.status === 'completed' ? (
                          <Badge size="1" color="green">Completed</Badge>
                        ) : overdue ? (
                          <Badge size="1" color="red">Overdue</Badge>
                        ) : daysUntil <= 7 ? (
                          <Badge size="1" color="orange">Due Soon</Badge>
                        ) : (
                          <Badge size="1" color="blue">Active</Badge>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Flex gap="2">
                          {reminder.status === 'active' && (
                            <IconButton
                              size="1"
                              variant="soft"
                              color="green"
                              onClick={() => markAsComplete(reminder)}
                            >
                              <CheckIcon />
                            </IconButton>
                          )}
                          <IconButton
                            size="1"
                            variant="soft"
                            onClick={() => {
                              setEditingReminder(reminder)
                              setShowCreateDialog(true)
                            }}
                          >
                            <Pencil1Icon />
                          </IconButton>
                          <IconButton
                            size="1"
                            variant="soft"
                            color="red"
                            onClick={() => deleteReminder(reminder.id)}
                          >
                            <TrashIcon />
                          </IconButton>
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Root>
          )}
        </div>
      </Tabs.Root>

      {/* Create/Edit Dialog */}
      <ReminderDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) setEditingReminder(null)
        }}
        personId={personId}
        editingReminder={editingReminder}
        onSuccess={() => {
          loadReminders()
          setShowCreateDialog(false)
          setEditingReminder(null)
        }}
      />

      {/* Recommendations Dialog */}
      <RecommendationsDialog
        open={showRecommendations}
        onOpenChange={setShowRecommendations}
        personId={personId}
        onCreateReminder={(reminder: any) => {
          setShowRecommendations(false)
          setEditingReminder(null)
          setShowCreateDialog(true)
          // Pre-fill form data would be handled in ReminderDialog
        }}
      />
    </Flex>
  )
}

interface ReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  personId: string
  editingReminder?: HealthReminder | null
  onSuccess: () => void
}

function ReminderDialog({ open, onOpenChange, personId, editingReminder, onSuccess }: ReminderDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_type: 'checkup',
    due_date: new Date().toISOString().split('T')[0],
    frequency: 'once'
  })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (editingReminder && open) {
      setFormData({
        title: editingReminder.title,
        description: editingReminder.description || '',
        reminder_type: editingReminder.reminder_type,
        due_date: editingReminder.due_date,
        frequency: editingReminder.frequency
      })
    } else if (!open) {
      setFormData({
        title: '',
        description: '',
        reminder_type: 'checkup',
        due_date: new Date().toISOString().split('T')[0],
        frequency: 'once'
      })
    }
  }, [editingReminder, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const reminderData = {
        person_id: personId,
        user_id: user.id,
        ...formData,
        status: editingReminder?.status || 'active',
        updated_at: new Date().toISOString()
      }

      if (editingReminder) {
        const { error } = await supabase
          .from('health_reminders')
          .update(reminderData)
          .eq('id', editingReminder.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('health_reminders')
          .insert(reminderData)

        if (error) throw error
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving reminder:', error)
      alert('Failed to save reminder')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 500 }}>
        <Dialog.Title>{editingReminder ? 'Edit' : 'Create'} Reminder</Dialog.Title>
        
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <div>
              <Text as="label" size="2" weight="bold">
                Reminder Type *
              </Text>
              <Select.Root 
                value={formData.reminder_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, reminder_type: value }))}
              >
                <Select.Trigger />
                <Select.Content>
                  {REMINDER_TYPES.map(type => (
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
                placeholder="e.g., Annual Physical Checkup"
                required
              />
            </div>

            <div>
              <Text as="label" size="2" weight="bold">
                Description
              </Text>
              <TextArea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional notes or details"
                rows={2}
              />
            </div>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold">
                  Due Date *
                </Text>
                <TextField.Root
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  required
                />
              </div>

              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold">
                  Frequency *
                </Text>
                <Select.Root 
                  value={formData.frequency} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}
                >
                  <Select.Trigger />
                  <Select.Content>
                    {FREQUENCIES.map(freq => (
                      <Select.Item key={freq.value} value={freq.value}>
                        {freq.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
            </Flex>
          </Flex>

          <Flex gap="3" justify="end" mt="6">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={loading || !formData.title}>
              {loading ? 'Saving...' : editingReminder ? 'Update' : 'Create'} Reminder
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  )
}

interface RecommendationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  personId: string
  onCreateReminder: (reminder: any) => void
}

function RecommendationsDialog({ open, onOpenChange, personId, onCreateReminder }: RecommendationsDialogProps) {
  const [personAge, setPersonAge] = useState<number | null>(null)
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      loadPersonAge()
    }
  }, [open, personId])

  const loadPersonAge = async () => {
    try {
      const { data } = await supabase
        .from('persons')
        .select('date_of_birth')
        .eq('id', personId)
        .single()

      if (data?.date_of_birth) {
        const birthDate = new Date(data.date_of_birth)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        setPersonAge(age)
      }
    } catch (error) {
      console.error('Error loading person age:', error)
    }
  }

  const applicableRecommendations = CHECKUP_RECOMMENDATIONS.filter(rec => {
    if (rec.minAge && personAge && personAge < rec.minAge) return false
    return true
  })

  const handleCreateSelected = () => {
    selectedRecommendations.forEach(test => {
      const rec = CHECKUP_RECOMMENDATIONS.find(r => r.test === test)
      if (rec) {
        // This would ideally pre-fill the reminder form
        onCreateReminder({
          title: rec.test,
          reminder_type: 'screening',
          frequency: rec.frequency
        })
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>Recommended Health Checkups</Dialog.Title>
        
        <Flex direction="column" gap="4">
          <Text size="2" color="gray">
            Based on age and general health guidelines, here are recommended regular checkups:
          </Text>

          <Card>
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell width="40px">
                    <Checkbox 
                      checked={selectedRecommendations.length === applicableRecommendations.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRecommendations(applicableRecommendations.map(r => r.test))
                        } else {
                          setSelectedRecommendations([])
                        }
                      }}
                    />
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Test/Checkup</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Recommended Frequency</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {applicableRecommendations.map(rec => (
                  <Table.Row key={rec.test}>
                    <Table.Cell>
                      <Checkbox
                        checked={selectedRecommendations.includes(rec.test)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRecommendations([...selectedRecommendations, rec.test])
                          } else {
                            setSelectedRecommendations(selectedRecommendations.filter(t => t !== rec.test))
                          }
                        }}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <Text weight="medium">{rec.test}</Text>
                      {rec.minAge && (
                        <Text size="1" color="gray" style={{ display: 'block' }}>
                          Recommended for ages {rec.minAge}+
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant="soft">
                        {FREQUENCIES.find(f => f.value === rec.frequency)?.label}
                      </Badge>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card>

          <Text size="1" color="gray">
            Note: These are general recommendations. Consult with your healthcare provider for personalized advice.
          </Text>
        </Flex>

        <Flex gap="3" justify="end" mt="6">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
          {selectedRecommendations.length > 0 && (
            <Button onClick={handleCreateSelected}>
              Create {selectedRecommendations.length} Reminder{selectedRecommendations.length > 1 ? 's' : ''}
            </Button>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}