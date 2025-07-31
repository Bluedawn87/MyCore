'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, Flex, Text, TextField, Button, Heading, Callout } from '@radix-ui/themes'
import { InfoCircledIcon, CheckCircledIcon } from '@radix-ui/react-icons'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('not authorized')) {
          setError('Access denied: Your email is not authorized. Please contact the administrator.')
        } else {
          setError(error.message)
        }
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card size="4">
      <Flex direction="column" gap="4">
        <div>
          <Heading size="6" mb="2">Create your account</Heading>
          <Text color="gray">Sign up for MyCore</Text>
        </div>

        {error && (
          <Callout.Root color="red" variant="soft">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        {success && (
          <Callout.Root color="green" variant="soft">
            <Callout.Icon>
              <CheckCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              Account created successfully! Check your email to confirm. Redirecting to login...
            </Callout.Text>
          </Callout.Root>
        )}

        <form onSubmit={handleSignup}>
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
                placeholder="Create a password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                mt="1"
              />
            </div>

            <div>
              <Text as="label" size="2" weight="medium" htmlFor="confirmPassword">
                Confirm Password
              </Text>
              <TextField.Root
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                mt="1"
              />
            </div>

            <Button type="submit" disabled={loading || success} size="3" mt="2">
              {loading ? 'Creating account...' : 'Sign up'}
            </Button>
          </Flex>
        </form>

        <Text size="2" align="center" color="gray">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </Text>

        <Callout.Root variant="soft">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Note: Only pre-authorized email addresses can create accounts.
          </Callout.Text>
        </Callout.Root>
      </Flex>
    </Card>
  )
}