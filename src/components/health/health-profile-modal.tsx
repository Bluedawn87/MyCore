'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Dialog, 
  Button, 
  TextField, 
  TextArea, 
  Flex, 
  Text,
  Separator
} from '@radix-ui/themes'

interface HealthProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: any
  onSuccess: () => void
}

export function HealthProfileModal({ open, onOpenChange, person, onSuccess }: HealthProfileModalProps) {
  const [formData, setFormData] = useState({
    primary_physician: '',
    health_insurance_provider: '',
    health_insurance_number: '',
    medications: '',
    family_history: '',
    lifestyle_notes: ''
  })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (person?.health_profile && open) {
      const profile = person.health_profile
      setFormData({
        primary_physician: profile.primary_physician || '',
        health_insurance_provider: profile.health_insurance_provider || '',
        health_insurance_number: profile.health_insurance_number || '',
        medications: profile.medications?.join(', ') || '',
        family_history: JSON.stringify(profile.family_history || {}, null, 2),
        lifestyle_notes: profile.lifestyle_notes || ''
      })
    }
  }, [person, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const profileData = {
        person_id: person.id,
        primary_physician: formData.primary_physician || null,
        health_insurance_provider: formData.health_insurance_provider || null,
        health_insurance_number: formData.health_insurance_number || null,
        medications: formData.medications ? formData.medications.split(',').map(m => m.trim()).filter(Boolean) : [],
        family_history: formData.family_history ? JSON.parse(formData.family_history) : {},
        lifestyle_notes: formData.lifestyle_notes || null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('health_profiles')
        .upsert(profileData, { onConflict: 'person_id' })

      if (error) throw error

      onSuccess()
    } catch (error) {
      console.error('Error saving health profile:', error)
      alert('Failed to save health profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>Health Profile - {person.name}</Dialog.Title>
        
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <div>
              <Text as="label" size="2" weight="bold" htmlFor="primary_physician">
                Primary Physician
              </Text>
              <TextField.Root
                id="primary_physician"
                value={formData.primary_physician}
                onChange={(e) => setFormData(prev => ({ ...prev, primary_physician: e.target.value }))}
                placeholder="Dr. Name, Practice"
              />
            </div>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="health_insurance_provider">
                  Insurance Provider
                </Text>
                <TextField.Root
                  id="health_insurance_provider"
                  value={formData.health_insurance_provider}
                  onChange={(e) => setFormData(prev => ({ ...prev, health_insurance_provider: e.target.value }))}
                  placeholder="Insurance company"
                />
              </div>

              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="health_insurance_number">
                  Insurance Number
                </Text>
                <TextField.Root
                  id="health_insurance_number"
                  value={formData.health_insurance_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, health_insurance_number: e.target.value }))}
                  placeholder="Policy number"
                />
              </div>
            </Flex>

            <div>
              <Text as="label" size="2" weight="bold" htmlFor="medications">
                Current Medications (comma-separated)
              </Text>
              <TextArea
                id="medications"
                value={formData.medications}
                onChange={(e) => setFormData(prev => ({ ...prev, medications: e.target.value }))}
                placeholder="e.g., Aspirin 81mg daily, Vitamin D 1000IU daily"
                rows={3}
              />
            </div>

            <div>
              <Text as="label" size="2" weight="bold" htmlFor="family_history">
                Family Medical History (JSON format)
              </Text>
              <TextArea
                id="family_history"
                value={formData.family_history}
                onChange={(e) => setFormData(prev => ({ ...prev, family_history: e.target.value }))}
                placeholder='{"heart_disease": "Father", "diabetes": "Mother"}'
                rows={4}
              />
            </div>

            <div>
              <Text as="label" size="2" weight="bold" htmlFor="lifestyle_notes">
                Lifestyle Notes
              </Text>
              <TextArea
                id="lifestyle_notes"
                value={formData.lifestyle_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, lifestyle_notes: e.target.value }))}
                placeholder="Exercise routine, diet preferences, smoking/alcohol habits, etc."
                rows={4}
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
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  )
}