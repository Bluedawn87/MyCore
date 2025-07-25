'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Flex, Button, DropdownMenu, Avatar, Text } from '@radix-ui/themes'
import { ExitIcon, PersonIcon } from '@radix-ui/react-icons'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

interface DashboardNavProps {
  user: User
}

export function DashboardNav({ user }: DashboardNavProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b">
      <div className="px-4 mx-auto max-w-7xl">
        <Flex justify="between" align="center" py="3">
          <Flex gap="6" align="center">
            <Link href="/dashboard">
              <Text size="5" weight="bold">Personal Dashboard</Text>
            </Link>
            
            <Flex gap="4" align="center">
              <Link href="/dashboard/finances">
                <Text size="2" className="hover:text-blue-600 cursor-pointer">Finances</Text>
              </Link>
              <Link href="/dashboard/health">
                <Text size="2" className="hover:text-blue-600 cursor-pointer">Health</Text>
              </Link>
              <Link href="/dashboard/investments">
                <Text size="2" className="hover:text-blue-600 cursor-pointer">Investments</Text>
              </Link>
              <Link href="/dashboard/real-estate">
                <Text size="2" className="hover:text-blue-600 cursor-pointer">Real Estate</Text>
              </Link>
              <Link href="/dashboard/projects">
                <Text size="2" className="hover:text-blue-600 cursor-pointer">Projects</Text>
              </Link>
              <Link href="/dashboard/persons">
                <Text size="2" className="hover:text-blue-600 cursor-pointer">People</Text>
              </Link>
              <Link href="/dashboard/storage">
                <Text size="2" className="hover:text-blue-600 cursor-pointer">Storage</Text>
              </Link>
            </Flex>
          </Flex>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="ghost" size="2">
                <Avatar
                  size="2"
                  fallback={user.email?.[0].toUpperCase() || 'U'}
                  radius="full"
                />
              </Button>
            </DropdownMenu.Trigger>
            
            <DropdownMenu.Content>
              <DropdownMenu.Item disabled>
                <PersonIcon />
                {user.email}
              </DropdownMenu.Item>
              
              <DropdownMenu.Separator />
              
              <DropdownMenu.Item
                color="red"
                onSelect={handleSignOut}
                disabled={loading}
              >
                <ExitIcon />
                {loading ? 'Signing out...' : 'Sign out'}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>
      </div>
    </nav>
  )
}