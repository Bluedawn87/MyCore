"use client";

import { useState, useEffect } from "react";
import { Card, Flex, Text, Heading, Badge, Grid } from "@radix-ui/themes";
import { 
  TriangleUpIcon, 
  TriangleDownIcon,
  DashboardIcon,
  HomeIcon,
  ComponentInstanceIcon,
  BarChartIcon
} from "@radix-ui/react-icons";
import { formatCurrency, formatLargeNumber, calculatePercentageChange } from "@/lib/finances/utils";
import type { FinancialSummary, BankAccount } from "@/types/finances";

interface WealthSummaryProps {
  summary: FinancialSummary;
  bankAccounts: BankAccount[];
}

interface AssetCategory {
  name: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  change?: number;
  changePercentage?: number;
}

export function WealthSummary({ summary, bankAccounts }: WealthSummaryProps) {
  const [previousSummary, setPreviousSummary] = useState<FinancialSummary | null>(null);

  useEffect(() => {
    // In a real implementation, you would fetch the previous period's summary
    // For now, we'll simulate some data for demonstration
    setPreviousSummary({
      ...summary,
      total_net_worth: summary.total_net_worth * 0.95, // 5% lower for demo
      total_bank_balance: summary.total_bank_balance * 0.98,
      total_investment_value: summary.total_investment_value * 0.92,
      total_real_estate_value: summary.total_real_estate_value * 1.02,
    } as FinancialSummary);
  }, [summary]);

  const getNetWorthChange = () => {
    if (!previousSummary) return null;
    
    return calculatePercentageChange(
      summary.total_net_worth,
      previousSummary.total_net_worth
    );
  };

  const assetCategories: AssetCategory[] = [
    {
      name: "Cash & Bank Accounts",
      value: summary.total_bank_balance,
      icon: <BarChartIcon />,
      color: "blue",
      change: previousSummary ? summary.total_bank_balance - previousSummary.total_bank_balance : undefined,
    },
    {
      name: "Investments",
      value: summary.total_investment_value,
      icon: <ComponentInstanceIcon />,
      color: "green",
      change: previousSummary ? summary.total_investment_value - previousSummary.total_investment_value : undefined,
    },
    {
      name: "Real Estate",
      value: summary.total_real_estate_value,
      icon: <HomeIcon />,
      color: "purple",
      change: previousSummary ? summary.total_real_estate_value - previousSummary.total_real_estate_value : undefined,
    },
    {
      name: "Other Assets",
      value: summary.total_asset_value,
      icon: <DashboardIcon />,
      color: "orange",
      change: previousSummary ? summary.total_asset_value - previousSummary.total_asset_value : undefined,
    },
  ];

  const totalAssetValue = assetCategories.reduce((sum, category) => sum + category.value, 0);
  const netWorthChange = getNetWorthChange();

  const renderAssetBreakdown = () => {
    return assetCategories.map((category) => {
      const percentage = totalAssetValue > 0 ? (category.value / totalAssetValue) * 100 : 0;
      const isPositiveChange = category.change ? category.change >= 0 : true;

      return (
        <Card key={category.name} className="p-4">
          <Flex direction="column" gap="3">
            <Flex justify="between" align="center">
              <Flex align="center" gap="2">
                <div className={`text-${category.color}-600`}>
                  {category.icon}
                </div>
                <Text size="2" weight="medium">{category.name}</Text>
              </Flex>
              <Text size="1" color="gray">{percentage.toFixed(1)}%</Text>
            </Flex>
            
            <div>
              <Text size="4" weight="bold">
                {formatLargeNumber(category.value, summary.currency)}
              </Text>
              
              {category.change !== undefined && (
                <Flex align="center" gap="1" mt="1">
                  {isPositiveChange ? (
                    <TriangleUpIcon className="text-green-600" size={12} />
                  ) : (
                    <TriangleDownIcon className="text-red-600" size={12} />
                  )}
                  <Text 
                    size="1" 
                    color={isPositiveChange ? "green" : "red"}
                  >
                    {formatCurrency(Math.abs(category.change), summary.currency)}
                  </Text>
                </Flex>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className={`bg-${category.color}-500 h-1 rounded-full transition-all duration-300`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </Flex>
        </Card>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Net Worth Overview */}
      <Card className="p-6">
        <Flex direction="column" gap="4">
          <Flex justify="between" align="start">
            <div>
              <Text size="2" color="gray" mb="1" display="block">
                Total Net Worth
              </Text>
              <Heading size="8" className="mb-2">
                {formatLargeNumber(summary.total_net_worth, summary.currency)}
              </Heading>
              
              {netWorthChange && (
                <Flex align="center" gap="2">
                  {netWorthChange.isPositive ? (
                    <TriangleUpIcon className="text-green-600" />
                  ) : (
                    <TriangleDownIcon className="text-red-600" />
                  )}
                  <Text 
                    size="2" 
                    color={netWorthChange.isPositive ? "green" : "red"}
                    weight="medium"
                  >
                    {netWorthChange.isPositive ? "+" : "-"}
                    {formatCurrency(Math.abs(netWorthChange.change), summary.currency)}
                    ({netWorthChange.percentage.toFixed(1)}%)
                  </Text>
                  <Text size="2" color="gray">vs last period</Text>
                </Flex>
              )}
            </div>
            
            <Badge color="blue" size="2">
              As of {new Date(summary.summary_date).toLocaleDateString()}
            </Badge>
          </Flex>

          <Text size="2" color="gray">
            Your total wealth across all asset classes including bank accounts, 
            investments, real estate, and other assets.
          </Text>
        </Flex>
      </Card>

      {/* Asset Breakdown */}
      <div>
        <Heading size="4" mb="4">Asset Breakdown</Heading>
        <Grid columns={{ initial: "1", sm: "2", lg: "4" }} gap="4">
          {renderAssetBreakdown()}
        </Grid>
      </div>

      {/* Account Summary */}
      {bankAccounts.length > 0 && (
        <Card className="p-6">
          <Flex direction="column" gap="4">
            <Heading size="4">Bank Account Summary</Heading>
            
            <Grid columns={{ initial: "1", sm: "2", lg: "3" }} gap="4">
              {bankAccounts.slice(0, 6).map((account) => {
                const balance = account.latest_balance?.balance || account.current_balance || 0;
                const currency = account.latest_balance?.currency || account.currency;
                
                return (
                  <div key={account.id} className="border rounded-lg p-3">
                    <Flex justify="between" align="start" mb="2">
                      <div className="flex-1">
                        <Text size="2" weight="medium" className="line-clamp-1">
                          {account.name}
                        </Text>
                        <Text size="1" color="gray">{account.bank_name}</Text>
                      </div>
                      <Badge 
                        size="1" 
                        color={account.connection_type === 'gocardless' ? 'green' : 'gray'}
                      >
                        {account.connection_type === 'gocardless' ? 'Auto' : 'Manual'}
                      </Badge>
                    </Flex>
                    
                    <Text size="3" weight="bold">
                      {formatCurrency(balance, currency)}
                    </Text>
                  </div>
                );
              })}
            </Grid>
            
            {bankAccounts.length > 6 && (
              <Text size="2" color="gray" className="text-center">
                +{bankAccounts.length - 6} more accounts
              </Text>
            )}
          </Flex>
        </Card>
      )}
    </div>
  );
}