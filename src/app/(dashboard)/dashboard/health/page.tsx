'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Heading, 
  Text, 
  Flex, 
  Card, 
  Button,
  Badge,
  Tabs,
  Avatar,
  Select,
  SegmentedControl
} from '@radix-ui/themes'
import { 
  PersonIcon,
  PlusIcon,
  HeartIcon,
  FileTextIcon,
  TargetIcon,
  BellIcon,
  BarChartIcon,
  GearIcon
} from '@radix-ui/react-icons'
import { HealthProfileModal } from '@/components/health/health-profile-modal'
import { HealthMetricsPanel } from '@/components/health/health-metrics-panel'
import { MedicalRecordsPanel } from '@/components/health/medical-records-panel'
import { HealthGoalsPanel } from '@/components/health/health-goals-panel'
import { HealthRemindersPanel } from '@/components/health/health-reminders-panel'
import { HealthOverview } from '@/components/health/health-overview'
import { HealthAISettings } from '@/components/health/health-ai-settings'

interface HealthPerson {
  id: string
  name: string
  type: string
  date_of_birth: string | null
  blood_type: string | null
  height_cm: number | null
  allergies: string[] | null
  chronic_conditions: string[] | null
  emergency_contact: string | null
  health_enabled: boolean
  health_profile?: any
}

export default function HealthPage() {
  const [persons, setPersons] = useState<HealthPerson[]>([])
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showAISettings, setShowAISettings] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadHealthEnabledPersons()
  }, [])

  const loadHealthEnabledPersons = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all persons with health enabled
      const { data, error } = await supabase
        .from('persons')
        .select(`
          *,
          health_profile:health_profiles(*)
        `)
        .eq('user_id', user.id)
        .eq('health_enabled', true)
        .eq('type', 'individual')
        .order('name')

      if (!error && data) {
        setPersons(data)
        // Auto-select first person if none selected
        if (data.length > 0 && !selectedPersonId) {
          setSelectedPersonId(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading health persons:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedPerson = persons.find(p => p.id === selectedPersonId)

  const getAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null
    const today = new Date()
    const birth = new Date(dateOfBirth)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div>
      <Flex justify="between" align="center" mb="4">
        <div>
          <Heading size="8" mb="2">Health Tracking</Heading>
          <Text size="3" color="gray">
            Comprehensive health management and insights
          </Text>
        </div>
        <Flex gap="2">
          <Button size="3" variant="soft" onClick={() => setShowAISettings(true)}>
            <GearIcon />
            AI Settings
          </Button>
        </Flex>
      </Flex>

      {loading ? (
        <Card>
          <Flex justify="center" py="8">
            <Text color="gray">Loading health data...</Text>
          </Flex>
        </Card>
      ) : persons.length === 0 ? (
        <Card>
          <Flex direction="column" align="center" py="8" gap="4">
            <HeartIcon className="w-12 h-12 text-gray-400" />
            <Text size="4" weight="medium">No health tracking enabled</Text>
            <Text color="gray" align="center" className="max-w-md">
              Enable health tracking for individuals in the Persons section to start managing health data.
            </Text>
            <Button onClick={() => window.location.href = '/dashboard/persons'}>
              <PersonIcon />
              Go to Persons
            </Button>
          </Flex>
        </Card>
      ) : (
        <>
          {/* Person Selector */}
          <Card mb="4">
            <Flex gap="4" align="center" wrap="wrap">
              <Text size="2" weight="bold">Select Person:</Text>
              <SegmentedControl.Root 
                value={selectedPersonId || ''} 
                onValueChange={setSelectedPersonId}
              >
                {persons.map(person => (
                  <SegmentedControl.Item key={person.id} value={person.id}>
                    <Flex gap="2" align="center">
                      <Avatar 
                        size="1" 
                        fallback={getInitials(person.name)} 
                        radius="full"
                      />
                      <Text size="2">{person.name}</Text>
                      {person.date_of_birth && (
                        <Badge size="1" variant="soft">
                          {getAge(person.date_of_birth)}y
                        </Badge>
                      )}
                    </Flex>
                  </SegmentedControl.Item>
                ))}
              </SegmentedControl.Root>
              
              {selectedPerson && !selectedPerson.health_profile && (
                <Button size="2" variant="soft" onClick={() => setShowProfileModal(true)}>
                  <PlusIcon />
                  Complete Health Profile
                </Button>
              )}
            </Flex>
          </Card>

          {selectedPerson && (
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Trigger value="overview">
                  <BarChartIcon />
                  Overview
                </Tabs.Trigger>
                <Tabs.Trigger value="metrics">
                  <HeartIcon />
                  Metrics
                </Tabs.Trigger>
                <Tabs.Trigger value="records">
                  <FileTextIcon />
                  Medical Records
                </Tabs.Trigger>
                <Tabs.Trigger value="goals">
                  <TargetIcon />
                  Goals
                </Tabs.Trigger>
                <Tabs.Trigger value="reminders">
                  <BellIcon />
                  Reminders
                </Tabs.Trigger>
              </Tabs.List>

              <div className="mt-4">
                <Tabs.Content value="overview">
                  <HealthOverview person={selectedPerson} />
                </Tabs.Content>

                <Tabs.Content value="metrics">
                  <HealthMetricsPanel personId={selectedPerson.id} />
                </Tabs.Content>

                <Tabs.Content value="records">
                  <MedicalRecordsPanel personId={selectedPerson.id} />
                </Tabs.Content>

                <Tabs.Content value="goals">
                  <HealthGoalsPanel personId={selectedPerson.id} />
                </Tabs.Content>

                <Tabs.Content value="reminders">
                  <HealthRemindersPanel personId={selectedPerson.id} />
                </Tabs.Content>
              </div>
            </Tabs.Root>
          )}
        </>
      )}

      {/* Health Profile Modal */}
      {selectedPerson && (
        <HealthProfileModal
          open={showProfileModal}
          onOpenChange={setShowProfileModal}
          person={selectedPerson}
          onSuccess={() => {
            loadHealthEnabledPersons()
            setShowProfileModal(false)
          }}
        />
      )}

      {/* AI Settings Modal */}
      <HealthAISettings
        open={showAISettings}
        onOpenChange={setShowAISettings}
      />
    </div>
  )
}