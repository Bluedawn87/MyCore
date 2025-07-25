import { Grid, Card, Heading, Text, Flex } from '@radix-ui/themes'
import { 
  BarChartIcon, 
  HeartIcon, 
  RocketIcon, 
  HomeIcon, 
  CodeIcon,
  FileIcon 
} from '@radix-ui/react-icons'
import Link from 'next/link'

const modules = [
  {
    title: 'Finances',
    description: 'Track income, expenses, budgets, and financial goals',
    icon: BarChartIcon,
    href: '/dashboard/finances',
    color: 'blue',
  },
  {
    title: 'Health',
    description: 'Monitor fitness, nutrition, medical records, and wellness',
    icon: HeartIcon,
    href: '/dashboard/health',
    color: 'red',
  },
  {
    title: 'Investments',
    description: 'Manage stocks, crypto, and portfolio performance',
    icon: RocketIcon,
    href: '/dashboard/investments',
    color: 'green',
  },
  {
    title: 'Real Estate',
    description: 'Track properties, mortgages, and rental income',
    icon: HomeIcon,
    href: '/dashboard/real-estate',
    color: 'orange',
  },
  {
    title: 'Projects',
    description: 'Organize personal projects, tasks, and goals',
    icon: CodeIcon,
    href: '/dashboard/projects',
    color: 'purple',
  },
  {
    title: 'Storage',
    description: 'Upload and manage documents, photos, and videos',
    icon: FileIcon,
    href: '/dashboard/storage',
    color: 'indigo',
  },
]

export default function DashboardPage() {
  return (
    <div>
      <Heading size="8" mb="2">Welcome to Your Dashboard</Heading>
      <Text size="3" color="gray" className="block mb-8">
        Manage all aspects of your personal life in one place
      </Text>

      <Grid columns={{ initial: '1', sm: '2', lg: '3' }} gap="4">
        {modules.map((module) => {
          const Icon = module.icon
          return (
            <Link key={module.href} href={module.href} className="no-underline">
              <Card size="3" className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <Flex direction="column" gap="3">
                  <Icon className="w-8 h-8" style={{ color: `var(--${module.color}-9)` }} />
                  <div>
                    <Heading size="4" mb="1">{module.title}</Heading>
                    <Text size="2" color="gray">
                      {module.description}
                    </Text>
                  </div>
                </Flex>
              </Card>
            </Link>
          )
        })}
      </Grid>
    </div>
  )
}