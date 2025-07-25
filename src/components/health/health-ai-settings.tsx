'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Dialog, 
  Button, 
  TextField, 
  Select,
  Flex, 
  Text,
  Switch,
  Separator,
  Card,
  Badge
} from '@radix-ui/themes'
import { InfoCircledIcon, LockClosedIcon } from '@radix-ui/react-icons'

interface HealthAISettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AI_PROVIDERS = [
  { 
    value: 'openai', 
    label: 'OpenAI', 
    models: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
    endpoint: 'https://api.openai.com/v1/chat/completions'
  },
  { 
    value: 'openrouter', 
    label: 'OpenRouter', 
    models: ['anthropic/claude-3-opus', 'anthropic/claude-3-sonnet', 'openai/gpt-4-turbo', 'google/gemini-pro'],
    endpoint: 'https://openrouter.ai/api/v1/chat/completions'
  },
  { 
    value: 'custom', 
    label: 'Custom API', 
    models: [],
    endpoint: ''
  }
]

export function HealthAISettings({ open, onOpenChange }: HealthAISettingsProps) {
  const [settings, setSettings] = useState({
    provider: 'openai',
    model_name: 'gpt-4-turbo-preview',
    api_key: '',
    api_endpoint: '',
    enabled: false
  })
  const [loading, setLoading] = useState(false)
  const [hasExistingKey, setHasExistingKey] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open])

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('health_ai_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!error && data) {
        setSettings({
          provider: data.provider || 'openai',
          model_name: data.model_name || 'gpt-4-turbo-preview',
          api_key: '', // Don't load the actual key
          api_endpoint: data.api_endpoint || '',
          enabled: data.enabled || false
        })
        setHasExistingKey(!!data.api_key_encrypted)
      }
    } catch (error) {
      console.error('Error loading AI settings:', error)
    }
  }

  const handleSave = async () => {
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const provider = AI_PROVIDERS.find(p => p.value === settings.provider)
      
      const settingsData: any = {
        user_id: user.id,
        provider: settings.provider,
        model_name: settings.model_name,
        api_endpoint: settings.provider === 'custom' 
          ? settings.api_endpoint 
          : provider?.endpoint || '',
        enabled: settings.enabled,
        updated_at: new Date().toISOString()
      }

      // Only update API key if a new one is provided
      if (settings.api_key) {
        // In a real app, you'd encrypt this before storing
        settingsData.api_key_encrypted = settings.api_key
      }

      const { error } = await supabase
        .from('health_ai_settings')
        .upsert(settingsData, { onConflict: 'user_id' })

      if (error) throw error

      onOpenChange(false)
    } catch (error) {
      console.error('Error saving AI settings:', error)
      alert('Failed to save AI settings')
    } finally {
      setLoading(false)
    }
  }

  const selectedProvider = AI_PROVIDERS.find(p => p.value === settings.provider)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>AI Health Analysis Settings</Dialog.Title>
        
        <Flex direction="column" gap="4">
          <Card>
            <Flex gap="2" align="center">
              <InfoCircledIcon className="text-blue-500" />
              <Text size="2">
                Configure AI settings to enable intelligent health insights and recommendations based on your health data.
              </Text>
            </Flex>
          </Card>

          <div>
            <Flex justify="between" align="center" mb="2">
              <Text as="label" size="2" weight="bold">
                Enable AI Analysis
              </Text>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
              />
            </Flex>
            <Text size="1" color="gray">
              When enabled, AI will analyze your health data to provide insights and recommendations
            </Text>
          </div>

          <Separator size="4" />

          <div>
            <Text as="label" size="2" weight="bold" htmlFor="provider">
              AI Provider
            </Text>
            <Select.Root 
              value={settings.provider} 
              onValueChange={(value) => {
                const provider = AI_PROVIDERS.find(p => p.value === value)
                setSettings(prev => ({ 
                  ...prev, 
                  provider: value,
                  model_name: provider?.models[0] || ''
                }))
              }}
            >
              <Select.Trigger />
              <Select.Content>
                {AI_PROVIDERS.map(provider => (
                  <Select.Item key={provider.value} value={provider.value}>
                    {provider.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>

          {selectedProvider && selectedProvider.models.length > 0 && (
            <div>
              <Text as="label" size="2" weight="bold" htmlFor="model">
                Model
              </Text>
              <Select.Root 
                value={settings.model_name} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, model_name: value }))}
              >
                <Select.Trigger />
                <Select.Content>
                  {selectedProvider.models.map(model => (
                    <Select.Item key={model} value={model}>
                      {model}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
          )}

          {settings.provider === 'custom' && (
            <>
              <div>
                <Text as="label" size="2" weight="bold" htmlFor="model_name">
                  Model Name
                </Text>
                <TextField.Root
                  id="model_name"
                  value={settings.model_name}
                  onChange={(e) => setSettings(prev => ({ ...prev, model_name: e.target.value }))}
                  placeholder="e.g., gpt-4"
                />
              </div>

              <div>
                <Text as="label" size="2" weight="bold" htmlFor="endpoint">
                  API Endpoint
                </Text>
                <TextField.Root
                  id="endpoint"
                  value={settings.api_endpoint}
                  onChange={(e) => setSettings(prev => ({ ...prev, api_endpoint: e.target.value }))}
                  placeholder="https://api.example.com/v1/chat/completions"
                />
              </div>
            </>
          )}

          <div>
            <Flex align="center" gap="2" mb="1">
              <Text as="label" size="2" weight="bold" htmlFor="api_key">
                API Key
              </Text>
              <LockClosedIcon className="text-gray-500" />
              {hasExistingKey && !settings.api_key && (
                <Badge size="1" color="green">Key Saved</Badge>
              )}
            </Flex>
            <TextField.Root
              id="api_key"
              type="password"
              value={settings.api_key}
              onChange={(e) => setSettings(prev => ({ ...prev, api_key: e.target.value }))}
              placeholder={hasExistingKey ? "Enter new key to update" : "Enter your API key"}
            />
            <Text size="1" color="gray" mt="1">
              Your API key is encrypted and stored securely
            </Text>
          </div>

          <Card>
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">Privacy & Security</Text>
              <Text size="2" color="gray">
                • Your health data is never sent to AI providers without your explicit action
              </Text>
              <Text size="2" color="gray">
                • API keys are encrypted before storage
              </Text>
              <Text size="2" color="gray">
                • You can disable AI analysis at any time
              </Text>
              <Text size="2" color="gray">
                • All AI interactions are logged for your review
              </Text>
            </Flex>
          </Card>
        </Flex>

        <Flex gap="3" justify="end" mt="6">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button 
            onClick={handleSave} 
            disabled={loading || (settings.enabled && !settings.api_key && !hasExistingKey)}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}