'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Flex, Button, DropdownMenu, Avatar, Text, Separator } from '@radix-ui/themes'
import { 
  ExitIcon, 
  PersonIcon,
  DashboardIcon,
  ComponentInstanceIcon,
  ActivityLogIcon,
  HomeIcon,
  ArchiveIcon,
  FileTextIcon,
  BarChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon
} from '@radix-ui/react-icons'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

interface SidebarProps {
  user: User
}

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/dashboard/finances', label: 'Finances', icon: BarChartIcon },
  { href: '/dashboard/health', label: 'Health', icon: HeartIcon },
  { href: '/dashboard/investments', label: 'Investments', icon: ComponentInstanceIcon },
  { href: '/dashboard/real-estate', label: 'Real Estate', icon: HomeIcon },
  { href: '/dashboard/projects', label: 'Projects', icon: FileTextIcon },
  { href: '/dashboard/persons', label: 'People', icon: PersonIcon },
  { href: '/dashboard/storage', label: 'Storage', icon: ArchiveIcon },
]

export function Sidebar({ user }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const supabase = createClient()

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className={`bg-white border-r h-screen transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      <Flex direction="column" className="h-full">
        {/* Logo/Title */}
        <Flex align="center" justify="between" className="px-4 py-4 border-b">
          {!collapsed && (
            <Text size="5" weight="bold">MyCore</Text>
          )}
          <Button
            variant="ghost"
            size="2"
            onClick={() => setCollapsed(!collapsed)}
            className={collapsed ? 'mx-auto' : ''}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </Button>
        </Flex>

        {/* Navigation */}
        <Flex direction="column" className="flex-1 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link key={item.href} href={item.href}>
                <Flex
                  align="center"
                  gap="3"
                  className={`px-4 py-2 mx-2 rounded cursor-pointer transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${collapsed ? 'mx-auto' : ''}`} />
                  {!collapsed && (
                    <Text size="2" weight={isActive ? 'bold' : 'regular'}>
                      {item.label}
                    </Text>
                  )}
                </Flex>
              </Link>
            )
          })}
        </Flex>

        {/* User Menu */}
        <div className="border-t p-4">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="ghost" className="w-full">
                <Flex align="center" gap="3" justify={collapsed ? 'center' : 'start'}>
                  <Avatar
                    size="2"
                    fallback={user.email?.[0].toUpperCase() || 'U'}
                    radius="full"
                  />
                  {!collapsed && (
                    <Text size="2" className="truncate">{user.email}</Text>
                  )}
                </Flex>
              </Button>
            </DropdownMenu.Trigger>
            
            <DropdownMenu.Content side="top" align={collapsed ? 'center' : 'start'}>
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
        </div>
      </Flex>
    </div>
  )
}