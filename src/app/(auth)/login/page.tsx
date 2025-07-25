'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Flex, Text, TextField, Button, Heading, Callout } from '@radix-ui/themes'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card size="4">
      <Flex direction="column" gap="4">
        <div>
          <Heading size="6" mb="2">Welcome to MyCore</Heading>
          <Text color="gray">Sign in to your personal management system</Text>
        </div>

        {error && (
          <Callout.Root color="red" variant="soft">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        <form onSubmit={handleLogin}>
          <Flex direction="column" gap="3">
            <div>
              <Text as="label" size="2" weight="medium" htmlFor="email">
                Email
              </Text>
              <TextField.Root
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                mt="1"
              />
            </div>

            <div>
              <Text as="label" size="2" weight="medium" htmlFor="password">
                Password
              </Text>
              <TextField.Root
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                mt="1"
              />
            </div>

            <Button type="submit" disabled={loading} size="3" mt="2">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </Flex>
        </form>

        <Text size="2" align="center" color="gray">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </Text>
      </Flex>
    </Card>
  )
}