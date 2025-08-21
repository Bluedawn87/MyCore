"use client";

import { useState, useEffect } from "react";
import { Card, Flex, Text, Heading, Badge, Select, Grid } from "@radix-ui/themes";
import { CalendarIcon, TriangleUpIcon, TriangleDownIcon } from "@radix-ui/react-icons";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatLargeNumber, calculatePercentageChange, getChartColors } from "@/lib/finances/utils";
import type { FinancialSummary, BankAccount, FinancialTransaction } from "@/types/finances";

interface FinancialDashboardProps {
  summary?: FinancialSummary | null;
  bankAccounts?: BankAccount[];
  transactions?: FinancialTransaction[];
  historicalData?: FinancialSummary[];
}

interface WealthBreakdown {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export function FinancialDashboard({
  summary,
  bankAccounts = [],
  transactions = [],
  historicalData = [],
}: FinancialDashboardProps) {
  const [timeframe, setTimeframe] = useState<'3M' | '6M' | '1Y' | 'ALL'>('6M');
  const colors = getChartColors();

  // Calculate wealth breakdown for pie chart
  const getWealthBreakdown = (): WealthBreakdown[] => {
    if (!summary) return [];

    const total = summary.total_net_worth;
    if (total === 0) return [];

    return [
      {
        name: 'Bank Accounts',
        value: summary.total_bank_balance,
        color: colors.balance,
        percentage: (summary.total_bank_balance / total) * 100,
      },
      {
        name: 'Investments',
        value: summary.total_investment_value,
        color: colors.income,
        percentage: (summary.total_investment_value / total) * 100,
      },
      {
        name: 'Real Estate',
        value: summary.total_real_estate_value,
        color: colors.primary,
        percentage: (summary.total_real_estate_value / total) * 100,
      },
      {
        name: 'Other Assets',
        value: summary.total_asset_value,
        color: colors.secondary,
        percentage: (summary.total_asset_value / total) * 100,
      },
    ].filter(item => item.value > 0);
  };

  // Process historical data for trend charts
  const getHistoricalChartData = () => {
    if (!historicalData || historicalData.length === 0) return [];

    return historicalData
      .sort((a, b) => new Date(a.summary_date).getTime() - new Date(b.summary_date).getTime())
      .map(item => ({
        date: new Date(item.summary_date).toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        }),
        netWorth: item.total_net_worth,
        bankBalance: item.total_bank_balance,
        investments: item.total_investment_value,
        realEstate: item.total_real_estate_value,
        assets: item.total_asset_value,
      }));
  };

  // Process account balances for comparison chart
  const getAccountComparisonData = () => {
    return bankAccounts
      .filter(account => account.latest_balance)
      .sort((a, b) => (b.latest_balance?.balance || 0) - (a.latest_balance?.balance || 0))
      .slice(0, 8) // Top 8 accounts
      .map(account => ({
        name: account.name.length > 12 ? 
          account.name.substring(0, 12) + '...' : 
          account.name,
        balance: account.latest_balance?.balance || 0,
        type: account.account_type,
      }));
  };

  // Process transactions for spending analysis
  const getSpendingAnalysis = () => {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentTransactions = transactions.filter(
      t => new Date(t.transaction_date) >= last30Days
    );

    const dailyData = recentTransactions.reduce((acc, transaction) => {
      const date = transaction.transaction_date;
      if (!acc[date]) {
        acc[date] = { income: 0, expenses: 0, net: 0 };
      }
      
      if (transaction.amount > 0) {
        acc[date].income += transaction.amount;
      } else {
        acc[date].expenses += Math.abs(transaction.amount);
      }
      
      acc[date].net = acc[date].income - acc[date].expenses;
      return acc;
    }, {} as Record<string, { income: number; expenses: number; net: number }>);

    return Object.entries(dailyData)
      .map(([date, values]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ...values,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14); // Last 14 days
  };

  // Calculate key metrics
  const calculateMetrics = () => {
    if (historicalData.length < 2) return null;

    const current = historicalData[historicalData.length - 1];
    const previous = historicalData[historicalData.length - 2];

    return {
      netWorthChange: calculatePercentageChange(current.total_net_worth, previous.total_net_worth),
      bankBalanceChange: calculatePercentageChange(current.total_bank_balance, previous.total_bank_balance),
      investmentChange: calculatePercentageChange(current.total_investment_value, previous.total_investment_value),
    };
  };

  const wealthBreakdown = getWealthBreakdown();
  const historicalChartData = getHistoricalChartData();
  const accountComparisonData = getAccountComparisonData();
  const spendingAnalysisData = getSpendingAnalysis();
  const metrics = calculateMetrics();

  if (!summary) {
    return (
      <Card className="p-6">
        <Text color="gray">No financial data available yet. Add some bank accounts to get started.</Text>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <Grid columns={{ initial: "1", sm: "2", lg: "4" }} gap="4">
        <Card className="p-4">
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">Total Net Worth</Text>
            <Heading size="5">{formatLargeNumber(summary.total_net_worth, summary.currency)}</Heading>
            {metrics?.netWorthChange && (
              <Flex align="center" gap="1">
                {metrics.netWorthChange.isPositive ? (
                  <TriangleUpIcon className="text-green-600" size={14} />
                ) : (
                  <TriangleDownIcon className="text-red-600" size={14} />
                )}
                <Text 
                  size="2" 
                  color={metrics.netWorthChange.isPositive ? "green" : "red"}
                >
                  {metrics.netWorthChange.percentage.toFixed(1)}%
                </Text>
              </Flex>
            )}
          </Flex>
        </Card>

        <Card className="p-4">
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">Bank Accounts</Text>
            <Heading size="5">{formatLargeNumber(summary.total_bank_balance, summary.currency)}</Heading>
            <Text size="2" color="gray">{bankAccounts.length} accounts</Text>
          </Flex>
        </Card>

        <Card className="p-4">
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">Investments</Text>
            <Heading size="5">{formatLargeNumber(summary.total_investment_value, summary.currency)}</Heading>
            {metrics?.investmentChange && (
              <Flex align="center" gap="1">
                {metrics.investmentChange.isPositive ? (
                  <TriangleUpIcon className="text-green-600" size={14} />
                ) : (
                  <TriangleDownIcon className="text-red-600" size={14} />
                )}
                <Text 
                  size="2" 
                  color={metrics.investmentChange.isPositive ? "green" : "red"}
                >
                  {metrics.investmentChange.percentage.toFixed(1)}%
                </Text>
              </Flex>
            )}
          </Flex>
        </Card>

        <Card className="p-4">
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">Real Estate</Text>
            <Heading size="5">{formatLargeNumber(summary.total_real_estate_value, summary.currency)}</Heading>
            <Text size="2" color="gray">Properties</Text>
          </Flex>
        </Card>
      </Grid>

      {/* Charts Grid */}
      <Grid columns={{ initial: "1", lg: "2" }} gap="6">
        {/* Net Worth Trend */}
        <Card className="p-6">
          <Flex justify="between" align="center" mb="4">
            <Heading size="4">Net Worth Trend</Heading>
            <Select.Root value={timeframe} onValueChange={setTimeframe as any}>
              <Select.Trigger size="1" />
              <Select.Content>
                <Select.Item value="3M">3 Months</Select.Item>
                <Select.Item value="6M">6 Months</Select.Item>
                <Select.Item value="1Y">1 Year</Select.Item>
                <Select.Item value="ALL">All Time</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => formatLargeNumber(value)} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value, summary.currency)}
                  labelStyle={{ color: '#000' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="netWorth" 
                  stroke={colors.primary} 
                  fill={colors.primary}
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Wealth Breakdown */}
        <Card className="p-6">
          <Heading size="4" mb="4">Wealth Breakdown</Heading>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={wealthBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {wealthBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value, summary.currency)}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry) => (
                    <span style={{ color: entry.color }}>
                      {value} ({entry.payload?.percentage?.toFixed(1)}%)
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Account Comparison */}
        <Card className="p-6">
          <Heading size="4" mb="4">Account Balances</Heading>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accountComparisonData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatLargeNumber(value)} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value, summary.currency)}
                />
                <Bar dataKey="balance" fill={colors.balance} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Spending Analysis */}
        {spendingAnalysisData.length > 0 && (
          <Card className="p-6">
            <Heading size="4" mb="4">Recent Spending (Last 14 Days)</Heading>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendingAnalysisData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => formatLargeNumber(value)} />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(value, summary.currency)}
                  />
                  <Legend />
                  <Bar dataKey="income" fill={colors.income} name="Income" />
                  <Bar dataKey="expenses" fill={colors.expenses} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </Grid>

      {/* Summary Stats */}
      <Card className="p-6">
        <Heading size="4" mb="4">Quick Stats</Heading>
        <Grid columns={{ initial: "2", sm: "4" }} gap="4">
          <div className="text-center">
            <Text size="4" weight="bold" display="block">
              {bankAccounts.filter(a => a.connection_type === 'gocardless').length}
            </Text>
            <Text size="2" color="gray">Connected Banks</Text>
          </div>
          <div className="text-center">
            <Text size="4" weight="bold" display="block">
              {bankAccounts.filter(a => a.connection_type === 'manual').length}
            </Text>
            <Text size="2" color="gray">Manual Accounts</Text>
          </div>
          <div className="text-center">
            <Text size="4" weight="bold" display="block">
              {transactions.length}
            </Text>
            <Text size="2" color="gray">Total Transactions</Text>
          </div>
          <div className="text-center">
            <Text size="4" weight="bold" display="block">
              {new Date(summary.summary_date).toLocaleDateString()}
            </Text>
            <Text size="2" color="gray">Last Updated</Text>
          </div>
        </Grid>
      </Card>
    </div>
  );
}