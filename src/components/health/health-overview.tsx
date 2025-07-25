'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Card, 
  Flex, 
  Text, 
  Badge,
  Separator,
  Button,
  Grid
} from '@radix-ui/themes'
import { 
  HeartIcon,
  FileTextIcon,
  TargetIcon,
  BellIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircledIcon,
  InfoCircledIcon
} from '@radix-ui/react-icons'

interface HealthOverviewProps {
  person: any
}

export function HealthOverview({ person }: HealthOverviewProps) {
  const [stats, setStats] = useState({
    metricsCount: 0,
    recordsCount: 0,
    activeGoals: 0,
    upcomingReminders: 0,
    lastCheckup: null as string | null,
    nextCheckup: null as string | null,
    recentMetrics: [] as any[],
    activeConditions: person.chronic_conditions || [],
    allergies: person.allergies || []
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadOverviewData()
  }, [person.id])

  const loadOverviewData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get counts and recent data
      const [metricsResult, recordsResult, goalsResult, remindersResult, profileResult] = await Promise.all([
        supabase
          .from('health_metrics')
          .select('*', { count: 'exact' })
          .eq('person_id', person.id)
          .order('recorded_at', { ascending: false })
          .limit(5),
        supabase
          .from('medical_records')
          .select('*', { count: 'exact' })
          .eq('person_id', person.id),
        supabase
          .from('health_goals')
          .select('*', { count: 'exact' })
          .eq('person_id', person.id)
          .eq('status', 'active'),
        supabase
          .from('health_reminders')
          .select('*', { count: 'exact' })
          .eq('person_id', person.id)
          .eq('status', 'active')
          .gte('due_date', new Date().toISOString().split('T')[0]),
        supabase
          .from('health_profiles')
          .select('*')
          .eq('person_id', person.id)
          .single()
      ])

      setStats({
        metricsCount: metricsResult.count || 0,
        recordsCount: recordsResult.count || 0,
        activeGoals: goalsResult.count || 0,
        upcomingReminders: remindersResult.count || 0,
        lastCheckup: profileResult.data?.last_checkup_date,
        nextCheckup: profileResult.data?.next_checkup_date,
        recentMetrics: metricsResult.data || [],
        activeConditions: person.chronic_conditions || [],
        allergies: person.allergies || []
      })
    } catch (error) {
      console.error('Error loading overview data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatMetricValue = (metric: any) => {
    const value = metric.value
    switch (metric.metric_type) {
      case 'weight':
        return `${value.value} ${metric.unit || 'kg'}`
      case 'blood_pressure':
        return `${value.systolic}/${value.diastolic} mmHg`
      case 'heart_rate':
        return `${value.value} bpm`
      case 'glucose':
        return `${value.value} ${metric.unit || 'mg/dL'}`
      case 'temperature':
        return `${value.value} ${metric.unit || '°C'}`
      default:
        return `${value.value} ${metric.unit || ''}`
    }
  }

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'blood_pressure':
      case 'heart_rate':
        return <HeartIcon />
      default:
        return <InfoCircledIcon />
    }
  }

  if (loading) {
    return (
      <Card>
        <Flex justify="center" py="8">
          <Text color="gray">Loading health overview...</Text>
        </Flex>
      </Card>
    )
  }

  const isCheckupOverdue = stats.nextCheckup && new Date(stats.nextCheckup) < new Date()

  return (
    <Flex direction="column" gap="4">
      {/* Stats Grid */}
      <Grid columns={{ initial: '1', xs: '2', sm: '4' }} gap="4">
        <Card>
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <HeartIcon className="text-blue-500" />
              <Text size="2" color="gray">Health Metrics</Text>
            </Flex>
            <Text size="6" weight="bold">{stats.metricsCount}</Text>
            <Text size="1" color="gray">Total recorded</Text>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <FileTextIcon className="text-green-500" />
              <Text size="2" color="gray">Medical Records</Text>
            </Flex>
            <Text size="6" weight="bold">{stats.recordsCount}</Text>
            <Text size="1" color="gray">Documents</Text>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <TargetIcon className="text-purple-500" />
              <Text size="2" color="gray">Active Goals</Text>
            </Flex>
            <Text size="6" weight="bold">{stats.activeGoals}</Text>
            <Text size="1" color="gray">In progress</Text>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <BellIcon className="text-orange-500" />
              <Text size="2" color="gray">Reminders</Text>
            </Flex>
            <Text size="6" weight="bold">{stats.upcomingReminders}</Text>
            <Text size="1" color="gray">Upcoming</Text>
          </Flex>
        </Card>
      </Grid>

      {/* Health Status */}
      <Card>
        <Flex direction="column" gap="4">
          <Text size="3" weight="bold">Health Status</Text>
          
          <Grid columns={{ initial: '1', sm: '2' }} gap="4">
            <div>
              <Text size="2" color="gray" mb="2">Blood Type</Text>
              <Badge size="2" variant="soft" color="blue">
                {person.blood_type || 'Not specified'}
              </Badge>
            </div>
            
            <div>
              <Text size="2" color="gray" mb="2">Height</Text>
              <Badge size="2" variant="soft" color="gray">
                {person.height_cm ? `${person.height_cm} cm` : 'Not specified'}
              </Badge>
            </div>
          </Grid>

          {(stats.allergies.length > 0 || stats.activeConditions.length > 0) && (
            <>
              <Separator size="4" />
              
              {stats.allergies.length > 0 && (
                <div>
                  <Flex align="center" gap="2" mb="2">
                    <ExclamationTriangleIcon className="text-red-500" />
                    <Text size="2" weight="bold">Allergies</Text>
                  </Flex>
                  <Flex gap="2" wrap="wrap">
                    {stats.allergies.map((allergy: string, index: number) => (
                      <Badge key={index} color="red" variant="soft">
                        {allergy}
                      </Badge>
                    ))}
                  </Flex>
                </div>
              )}

              {stats.activeConditions.length > 0 && (
                <div>
                  <Flex align="center" gap="2" mb="2">
                    <InfoCircledIcon className="text-orange-500" />
                    <Text size="2" weight="bold">Chronic Conditions</Text>
                  </Flex>
                  <Flex gap="2" wrap="wrap">
                    {stats.activeConditions.map((condition: string, index: number) => (
                      <Badge key={index} color="orange" variant="soft">
                        {condition}
                      </Badge>
                    ))}
                  </Flex>
                </div>
              )}
            </>
          )}

          {person.emergency_contact && (
            <>
              <Separator size="4" />
              <div>
                <Text size="2" weight="bold" mb="1">Emergency Contact</Text>
                <Text size="2" color="gray">{person.emergency_contact}</Text>
              </div>
            </>
          )}
        </Flex>
      </Card>

      {/* Checkup Status */}
      <Card>
        <Flex direction="column" gap="3">
          <Text size="3" weight="bold">Checkup Schedule</Text>
          
          <Flex justify="between" align="center">
            <div>
              <Text size="2" color="gray">Last Checkup</Text>
              <Text size="3" weight="medium">
                {stats.lastCheckup ? new Date(stats.lastCheckup).toLocaleDateString() : 'Not recorded'}
              </Text>
            </div>
            
            <div className="text-right">
              <Text size="2" color="gray">Next Checkup</Text>
              <Flex align="center" gap="2" justify="end">
                <Text size="3" weight="medium">
                  {stats.nextCheckup ? new Date(stats.nextCheckup).toLocaleDateString() : 'Not scheduled'}
                </Text>
                {isCheckupOverdue && (
                  <Badge color="red" variant="soft">Overdue</Badge>
                )}
              </Flex>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* Recent Metrics */}
      {stats.recentMetrics.length > 0 && (
        <Card>
          <Flex direction="column" gap="3">
            <Text size="3" weight="bold">Recent Metrics</Text>
            
            <Flex direction="column" gap="2">
              {stats.recentMetrics.map((metric) => (
                <Flex key={metric.id} justify="between" align="center">
                  <Flex align="center" gap="2">
                    {getMetricIcon(metric.metric_type)}
                    <Text size="2" style={{ textTransform: 'capitalize' }}>
                      {metric.metric_type.replace(/_/g, ' ')}
                    </Text>
                  </Flex>
                  <Flex align="center" gap="3">
                    <Badge variant="soft">
                      {formatMetricValue(metric)}
                    </Badge>
                    <Text size="1" color="gray">
                      {new Date(metric.recorded_at).toLocaleDateString()}
                    </Text>
                  </Flex>
                </Flex>
              ))}
            </Flex>
          </Flex>
        </Card>
      )}
    </Flex>
  )
}