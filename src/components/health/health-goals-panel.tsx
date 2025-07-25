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
  Progress,
  Grid
} from '@radix-ui/themes'
import { 
  PlusIcon,
  TargetIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  Pencil1Icon,
  TrashIcon,
  PlayIcon,
  PauseIcon
} from '@radix-ui/react-icons'

interface HealthGoalsPanelProps {
  personId: string
}

interface HealthGoal {
  id: string
  title: string
  description: string
  goal_type: string
  target_value: any
  current_value: any
  target_date: string
  status: string
  progress_notes: string[]
  created_at: string
  updated_at: string
}

const GOAL_TYPES = [
  { value: 'weight_loss', label: 'Weight Loss', icon: '⚖️', unit: 'kg' },
  { value: 'weight_gain', label: 'Weight Gain', icon: '💪', unit: 'kg' },
  { value: 'fitness', label: 'Fitness', icon: '🏃', unit: '' },
  { value: 'nutrition', label: 'Nutrition', icon: '🥗', unit: '' },
  { value: 'medical', label: 'Medical', icon: '🏥', unit: '' },
  { value: 'mental_health', label: 'Mental Health', icon: '🧠', unit: '' },
  { value: 'sleep', label: 'Sleep', icon: '😴', unit: 'hours' },
  { value: 'other', label: 'Other', icon: '🎯', unit: '' },
]

export function HealthGoalsPanel({ personId }: HealthGoalsPanelProps) {
  const [goals, setGoals] = useState<HealthGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingGoal, setEditingGoal] = useState<HealthGoal | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<HealthGoal | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadGoals()
  }, [personId])

  const loadGoals = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('health_goals')
        .select('*')
        .eq('person_id', personId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setGoals(data)
      }
    } catch (error) {
      console.error('Error loading goals:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateGoalStatus = async (goalId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('health_goals')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)

      if (error) throw error
      loadGoals()
    } catch (error) {
      console.error('Error updating goal status:', error)
    }
  }

  const deleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      const { error } = await supabase
        .from('health_goals')
        .delete()
        .eq('id', goalId)

      if (error) throw error
      loadGoals()
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  const getGoalProgress = (goal: HealthGoal) => {
    if (!goal.target_value?.value || !goal.current_value?.value) return 0
    
    const target = parseFloat(goal.target_value.value)
    const current = parseFloat(goal.current_value.value)
    
    if (goal.goal_type === 'weight_loss') {
      const initial = goal.target_value.initial || current
      const progress = ((initial - current) / (initial - target)) * 100
      return Math.max(0, Math.min(100, progress))
    } else {
      const progress = (current / target) * 100
      return Math.max(0, Math.min(100, progress))
    }
  }

  const getGoalTypeInfo = (type: string) => {
    return GOAL_TYPES.find(t => t.value === type) || GOAL_TYPES[GOAL_TYPES.length - 1]
  }

  const getDaysRemaining = (targetDate: string) => {
    const today = new Date()
    const target = new Date(targetDate)
    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <Flex direction="column" gap="4">
      {/* Header */}
      <Flex justify="between" align="center">
        <Text size="4" weight="bold">Health Goals</Text>
        <Button onClick={() => setShowCreateDialog(true)}>
          <PlusIcon />
          Create Goal
        </Button>
      </Flex>

      {/* Goals List */}
      {loading ? (
        <Card>
          <Flex justify="center" py="8">
            <Text color="gray">Loading goals...</Text>
          </Flex>
        </Card>
      ) : goals.length === 0 ? (
        <Card>
          <Flex direction="column" align="center" py="8" gap="4">
            <TargetIcon className="w-12 h-12 text-gray-400" />
            <Text size="4" weight="medium">No health goals yet</Text>
            <Text color="gray">Set goals to track your health progress</Text>
            <Button size="3" variant="soft" onClick={() => setShowCreateDialog(true)}>
              <PlusIcon />
              Create Your First Goal
            </Button>
          </Flex>
        </Card>
      ) : (
        <Grid columns={{ initial: '1', md: '2' }} gap="4">
          {goals.map(goal => {
            const typeInfo = getGoalTypeInfo(goal.goal_type)
            const progress = getGoalProgress(goal)
            const daysRemaining = getDaysRemaining(goal.target_date)
            
            return (
              <Card 
                key={goal.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedGoal(goal)}
              >
                <Flex direction="column" gap="3">
                  <Flex justify="between" align="start">
                    <Flex gap="2" align="center">
                      <Text size="5">{typeInfo.icon}</Text>
                      <Badge 
                        size="1" 
                        color={
                          goal.status === 'completed' ? 'green' : 
                          goal.status === 'active' ? 'blue' : 
                          goal.status === 'paused' ? 'orange' : 'gray'
                        }
                      >
                        {goal.status}
                      </Badge>
                    </Flex>
                    <Flex gap="1">
                      {goal.status === 'active' && (
                        <IconButton
                          size="1"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            updateGoalStatus(goal.id, 'paused')
                          }}
                        >
                          <PauseIcon />
                        </IconButton>
                      )}
                      {goal.status === 'paused' && (
                        <IconButton
                          size="1"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            updateGoalStatus(goal.id, 'active')
                          }}
                        >
                          <PlayIcon />
                        </IconButton>
                      )}
                      <IconButton
                        size="1"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingGoal(goal)
                          setShowCreateDialog(true)
                        }}
                      >
                        <Pencil1Icon />
                      </IconButton>
                      <IconButton
                        size="1"
                        variant="ghost"
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteGoal(goal.id)
                        }}
                      >
                        <TrashIcon />
                      </IconButton>
                    </Flex>
                  </Flex>

                  <div>
                    <Text size="3" weight="bold">{goal.title}</Text>
                    <Text size="2" color="gray" className="line-clamp-2">
                      {goal.description}
                    </Text>
                  </div>

                  {goal.target_value?.value && goal.current_value?.value && (
                    <div>
                      <Flex justify="between" mb="2">
                        <Text size="2">
                          Current: {goal.current_value.value} {typeInfo.unit}
                        </Text>
                        <Text size="2" weight="bold">
                          Target: {goal.target_value.value} {typeInfo.unit}
                        </Text>
                      </Flex>
                      <Progress value={progress} size="2" />
                      <Text size="1" color="gray" mt="1">
                        {progress.toFixed(0)}% Complete
                      </Text>
                    </div>
                  )}

                  <Flex justify="between" align="center">
                    <Text size="2" color="gray">
                      Target Date: {new Date(goal.target_date).toLocaleDateString()}
                    </Text>
                    {goal.status === 'active' && (
                      <Badge 
                        size="1" 
                        color={daysRemaining < 0 ? 'red' : daysRemaining < 7 ? 'orange' : 'gray'}
                      >
                        {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
                      </Badge>
                    )}
                  </Flex>
                </Flex>
              </Card>
            )
          })}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <GoalDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) setEditingGoal(null)
        }}
        personId={personId}
        editingGoal={editingGoal}
        onSuccess={() => {
          loadGoals()
          setShowCreateDialog(false)
          setEditingGoal(null)
        }}
      />

      {/* Goal Details Dialog */}
      {selectedGoal && (
        <GoalDetailsDialog
          goal={selectedGoal}
          open={!!selectedGoal}
          onOpenChange={(open) => !open && setSelectedGoal(null)}
          onUpdate={loadGoals}
        />
      )}
    </Flex>
  )
}

interface GoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  personId: string
  editingGoal?: HealthGoal | null
  onSuccess: () => void
}

function GoalDialog({ open, onOpenChange, personId, editingGoal, onSuccess }: GoalDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal_type: 'weight_loss',
    target_value: '',
    current_value: '',
    target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    initial_value: ''
  })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (editingGoal && open) {
      setFormData({
        title: editingGoal.title,
        description: editingGoal.description || '',
        goal_type: editingGoal.goal_type,
        target_value: editingGoal.target_value?.value?.toString() || '',
        current_value: editingGoal.current_value?.value?.toString() || '',
        target_date: editingGoal.target_date,
        initial_value: editingGoal.target_value?.initial?.toString() || ''
      })
    } else if (!open) {
      setFormData({
        title: '',
        description: '',
        goal_type: 'weight_loss',
        target_value: '',
        current_value: '',
        target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        initial_value: ''
      })
    }
  }, [editingGoal, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const goalData = {
        person_id: personId,
        user_id: user.id,
        title: formData.title,
        description: formData.description || null,
        goal_type: formData.goal_type,
        target_value: formData.target_value ? {
          value: parseFloat(formData.target_value),
          initial: formData.goal_type === 'weight_loss' && formData.initial_value 
            ? parseFloat(formData.initial_value) 
            : parseFloat(formData.current_value)
        } : null,
        current_value: formData.current_value ? {
          value: parseFloat(formData.current_value)
        } : null,
        target_date: formData.target_date,
        status: editingGoal?.status || 'active',
        updated_at: new Date().toISOString()
      }

      if (editingGoal) {
        const { error } = await supabase
          .from('health_goals')
          .update(goalData)
          .eq('id', editingGoal.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('health_goals')
          .insert({
            ...goalData,
            progress_notes: []
          })

        if (error) throw error
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving goal:', error)
      alert('Failed to save goal')
    } finally {
      setLoading(false)
    }
  }

  const typeInfo = GOAL_TYPES.find(t => t.value === formData.goal_type)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>{editingGoal ? 'Edit' : 'Create'} Health Goal</Dialog.Title>
        
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <div>
              <Text as="label" size="2" weight="bold">
                Goal Type *
              </Text>
              <Select.Root 
                value={formData.goal_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, goal_type: value }))}
              >
                <Select.Trigger />
                <Select.Content>
                  {GOAL_TYPES.map(type => (
                    <Select.Item key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>

            <div>
              <Text as="label" size="2" weight="bold">
                Goal Title *
              </Text>
              <TextField.Root
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Lose 10kg by summer"
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
                placeholder="Describe your goal and plan..."
                rows={3}
              />
            </div>

            {typeInfo?.unit && (
              <Grid columns="2" gap="3">
                <div>
                  <Text as="label" size="2" weight="bold">
                    Current Value {typeInfo.unit && `(${typeInfo.unit})`}
                  </Text>
                  <TextField.Root
                    type="number"
                    step="0.1"
                    value={formData.current_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_value: e.target.value }))}
                    placeholder="Current measurement"
                  />
                </div>

                <div>
                  <Text as="label" size="2" weight="bold">
                    Target Value {typeInfo.unit && `(${typeInfo.unit})`}
                  </Text>
                  <TextField.Root
                    type="number"
                    step="0.1"
                    value={formData.target_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_value: e.target.value }))}
                    placeholder="Goal measurement"
                  />
                </div>
              </Grid>
            )}

            {formData.goal_type === 'weight_loss' && (
              <div>
                <Text as="label" size="2" weight="bold">
                  Starting Weight (kg)
                </Text>
                <TextField.Root
                  type="number"
                  step="0.1"
                  value={formData.initial_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, initial_value: e.target.value }))}
                  placeholder="Initial weight (defaults to current)"
                />
              </div>
            )}

            <div>
              <Text as="label" size="2" weight="bold">
                Target Date *
              </Text>
              <TextField.Root
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                required
              />
            </div>
          </Flex>

          <Flex gap="3" justify="end" mt="6">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={loading || !formData.title}>
              {loading ? 'Saving...' : editingGoal ? 'Update Goal' : 'Create Goal'}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  )
}

interface GoalDetailsDialogProps {
  goal: HealthGoal
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

function GoalDetailsDialog({ goal, open, onOpenChange, onUpdate }: GoalDetailsDialogProps) {
  const [newProgress, setNewProgress] = useState('')
  const [newNote, setNewNote] = useState('')
  const [updating, setUpdating] = useState(false)
  const supabase = createClient()

  const updateProgress = async () => {
    if (!newProgress) return
    setUpdating(true)

    try {
      const { error } = await supabase
        .from('health_goals')
        .update({
          current_value: { value: parseFloat(newProgress) },
          updated_at: new Date().toISOString()
        })
        .eq('id', goal.id)

      if (error) throw error

      setNewProgress('')
      onUpdate()
    } catch (error) {
      console.error('Error updating progress:', error)
    } finally {
      setUpdating(false)
    }
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    setUpdating(true)

    try {
      const notes = [...(goal.progress_notes || []), {
        date: new Date().toISOString(),
        note: newNote
      }]

      const { error } = await supabase
        .from('health_goals')
        .update({
          progress_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', goal.id)

      if (error) throw error

      setNewNote('')
      onUpdate()
    } catch (error) {
      console.error('Error adding note:', error)
    } finally {
      setUpdating(false)
    }
  }

  const markComplete = async () => {
    setUpdating(true)

    try {
      const { error } = await supabase
        .from('health_goals')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', goal.id)

      if (error) throw error
      onUpdate()
      onOpenChange(false)
    } catch (error) {
      console.error('Error completing goal:', error)
    } finally {
      setUpdating(false)
    }
  }

  const typeInfo = GOAL_TYPES.find(t => t.value === goal.goal_type)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>
          <Flex align="center" gap="2">
            <Text>{typeInfo?.icon}</Text>
            {goal.title}
          </Flex>
        </Dialog.Title>
        
        <Flex direction="column" gap="4">
          <Badge 
            size="2" 
            color={
              goal.status === 'completed' ? 'green' : 
              goal.status === 'active' ? 'blue' : 
              goal.status === 'paused' ? 'orange' : 'gray'
            }
          >
            {goal.status.toUpperCase()}
          </Badge>

          {goal.description && (
            <div>
              <Text size="2" color="gray">Description</Text>
              <Text size="3">{goal.description}</Text>
            </div>
          )}

          {goal.target_value?.value && (
            <Card>
              <Flex direction="column" gap="3">
                <Text size="2" weight="bold">Progress Update</Text>
                <Flex gap="2">
                  <TextField.Root
                    type="number"
                    step="0.1"
                    value={newProgress}
                    onChange={(e) => setNewProgress(e.target.value)}
                    placeholder={`Current: ${goal.current_value?.value || 0} ${typeInfo?.unit || ''}`}
                  />
                  <Button 
                    onClick={updateProgress} 
                    disabled={!newProgress || updating}
                  >
                    Update
                  </Button>
                </Flex>
              </Flex>
            </Card>
          )}

          <Card>
            <Flex direction="column" gap="3">
              <Text size="2" weight="bold">Add Note</Text>
              <TextArea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a progress note..."
                rows={2}
              />
              <Button 
                size="2" 
                variant="soft"
                onClick={addNote} 
                disabled={!newNote.trim() || updating}
              >
                Add Note
              </Button>
            </Flex>
          </Card>

          {goal.progress_notes && goal.progress_notes.length > 0 && (
            <div>
              <Text size="2" weight="bold" mb="2">Progress Notes</Text>
              <Flex direction="column" gap="2">
                {goal.progress_notes.slice().reverse().map((note: any, index: number) => (
                  <Card key={index} size="1">
                    <Text size="1" color="gray">
                      {new Date(note.date).toLocaleDateString()}
                    </Text>
                    <Text size="2">{note.note}</Text>
                  </Card>
                ))}
              </Flex>
            </div>
          )}

          {goal.status === 'active' && (
            <Button 
              size="3" 
              color="green"
              onClick={markComplete}
              disabled={updating}
            >
              <CheckCircledIcon />
              Mark as Complete
            </Button>
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
  )
}