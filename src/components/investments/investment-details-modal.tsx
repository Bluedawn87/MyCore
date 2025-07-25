"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Dialog, 
  Tabs, 
  Card, 
  Flex, 
  Text, 
  Heading,
  Badge,
  Table,
  Button
} from "@radix-ui/themes";
import { ExternalLinkIcon } from "@radix-ui/react-icons";

interface InvestmentDetailsModalProps {
  investment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: { start: Date | null; end: Date | null };
}

interface MetricsData {
  metric_date: string;
  revenue: number | null;
  marketing_spend: number | null;
  user_acquisitions: number | null;
  monthly_active_users: number | null;
  customer_acquisition_cost: number | null;
  gross_margin: number | null;
  net_profit: number | null;
}

interface StockData {
  price_date: string;
  open_price: number | null;
  close_price: number | null;
  high_price: number | null;
  low_price: number | null;
  volume: number | null;
}

export function InvestmentDetailsModal({ 
  investment, 
  open, 
  onOpenChange,
  dateRange 
}: InvestmentDetailsModalProps) {
  const [metrics, setMetrics] = useState<MetricsData[]>([]);
  const [stockPrices, setStockPrices] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (open && investment) {
      fetchData();
    }
  }, [open, investment, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (investment.type === "equity") {
        // Fetch metrics data
        let query = supabase
          .from("investment_metrics")
          .select("*")
          .eq("investment_id", investment.id)
          .order("metric_date", { ascending: false });

        if (dateRange.start) {
          query = query.gte("metric_date", dateRange.start.toISOString().split('T')[0]);
        }
        if (dateRange.end) {
          query = query.lte("metric_date", dateRange.end.toISOString().split('T')[0]);
        }

        const { data, error } = await query.limit(30);
        if (error) throw error;
        setMetrics(data || []);
      } else if (investment.type === "stock") {
        // Fetch stock price data
        let query = supabase
          .from("stock_prices")
          .select("*")
          .eq("investment_id", investment.id)
          .order("price_date", { ascending: false });

        if (dateRange.start) {
          query = query.gte("price_date", dateRange.start.toISOString());
        }
        if (dateRange.end) {
          query = query.lte("price_date", dateRange.end.toISOString());
        }

        const { data, error } = await query.limit(30);
        if (error) throw error;
        setStockPrices(data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number | null) => {
    if (!num) return "N/A";
    return new Intl.NumberFormat("en-US").format(num);
  };

  const formatPercentage = (value: number | null) => {
    if (!value) return "N/A";
    return `${value.toFixed(1)}%`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const calculateGrowth = (data: any[], valueKey: string) => {
    if (data.length < 2) return null;
    const latest = data[0][valueKey];
    const previous = data[data.length - 1][valueKey];
    if (!latest || !previous) return null;
    return ((latest - previous) / previous) * 100;
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 900 }}>
        <Dialog.Title>
          <Flex justify="between" align="center">
            <Flex align="center" gap="3">
              <Heading size="6">{investment.name}</Heading>
              <Badge color={investment.type === "equity" ? "blue" : "green"}>
                {investment.type}
              </Badge>
              {investment.ticker_symbol && (
                <Badge variant="outline">{investment.ticker_symbol}</Badge>
              )}
            </Flex>
            <Flex gap="3">
              {investment.frontend_url && (
                <a 
                  href={investment.frontend_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
                >
                  <Text size="2">Website</Text>
                  <ExternalLinkIcon />
                </a>
              )}
              {investment.portal_url && (
                <a 
                  href={investment.portal_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
                >
                  <Text size="2">Portal</Text>
                  <ExternalLinkIcon />
                </a>
              )}
            </Flex>
          </Flex>
        </Dialog.Title>

        <Tabs.Root defaultValue="overview">
          <Tabs.List>
            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
            {investment.type === "equity" ? (
              <>
                <Tabs.Trigger value="metrics">Metrics</Tabs.Trigger>
                <Tabs.Trigger value="companies">Companies</Tabs.Trigger>
              </>
            ) : (
              <Tabs.Trigger value="prices">Stock Prices</Tabs.Trigger>
            )}
            <Tabs.Trigger value="ownership">Ownership</Tabs.Trigger>
          </Tabs.List>

          <div className="mt-4">
            <Tabs.Content value="overview">
              <Flex direction="column" gap="4">
                {investment.description && (
                  <div>
                    <Text size="2" weight="bold" color="gray">Description</Text>
                    <Text size="3">{investment.description}</Text>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card>
                    <Text size="2" weight="bold" color="gray">Initial Investment</Text>
                    <Text size="5" weight="bold">
                      {formatCurrency(investment.initial_investment_amount)}
                    </Text>
                  </Card>

                  {investment.initial_investment_date && (
                    <Card>
                      <Text size="2" weight="bold" color="gray">Investment Date</Text>
                      <Text size="5" weight="bold">
                        {formatDate(investment.initial_investment_date)}
                      </Text>
                    </Card>
                  )}

                  {investment.ownership_percentage && (
                    <Card>
                      <Text size="2" weight="bold" color="gray">Your Ownership</Text>
                      <Text size="5" weight="bold">
                        {investment.ownership_percentage}%
                      </Text>
                    </Card>
                  )}
                </div>

                {investment.type === "equity" && metrics.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <Text size="2" weight="bold" color="gray">Latest Revenue</Text>
                      <Text size="5" weight="bold">
                        {formatCurrency(metrics[0].revenue)}
                      </Text>
                      {metrics.length > 1 && (
                        <Text size="1" color={calculateGrowth(metrics, 'revenue')! > 0 ? 'green' : 'red'}>
                          {calculateGrowth(metrics, 'revenue')?.toFixed(1)}% growth
                        </Text>
                      )}
                    </Card>

                    <Card>
                      <Text size="2" weight="bold" color="gray">MAU</Text>
                      <Text size="5" weight="bold">
                        {formatNumber(metrics[0].monthly_active_users)}
                      </Text>
                    </Card>

                    <Card>
                      <Text size="2" weight="bold" color="gray">Gross Margin</Text>
                      <Text size="5" weight="bold">
                        {formatPercentage(metrics[0].gross_margin)}
                      </Text>
                    </Card>
                  </div>
                )}

                {investment.type === "stock" && stockPrices.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <Text size="2" weight="bold" color="gray">Current Price</Text>
                      <Text size="5" weight="bold">
                        ${stockPrices[0].close_price?.toFixed(2)}
                      </Text>
                    </Card>

                    <Card>
                      <Text size="2" weight="bold" color="gray">24h High</Text>
                      <Text size="5" weight="bold">
                        ${stockPrices[0].high_price?.toFixed(2)}
                      </Text>
                    </Card>

                    <Card>
                      <Text size="2" weight="bold" color="gray">24h Low</Text>
                      <Text size="5" weight="bold">
                        ${stockPrices[0].low_price?.toFixed(2)}
                      </Text>
                    </Card>
                  </div>
                )}
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="metrics">
              {loading ? (
                <Text>Loading metrics...</Text>
              ) : metrics.length === 0 ? (
                <Text color="gray">No metrics data available for the selected date range.</Text>
              ) : (
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Revenue</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Marketing Spend</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>User Acquisitions</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>MAU</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>CAC</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Gross Margin</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Net Profit</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {metrics.map((metric) => (
                      <Table.Row key={metric.metric_date}>
                        <Table.Cell>{formatDate(metric.metric_date)}</Table.Cell>
                        <Table.Cell>{formatCurrency(metric.revenue)}</Table.Cell>
                        <Table.Cell>{formatCurrency(metric.marketing_spend)}</Table.Cell>
                        <Table.Cell>{formatNumber(metric.user_acquisitions)}</Table.Cell>
                        <Table.Cell>{formatNumber(metric.monthly_active_users)}</Table.Cell>
                        <Table.Cell>{formatCurrency(metric.customer_acquisition_cost)}</Table.Cell>
                        <Table.Cell>{formatPercentage(metric.gross_margin)}</Table.Cell>
                        <Table.Cell>{formatCurrency(metric.net_profit)}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              )}
            </Tabs.Content>

            <Tabs.Content value="companies">
              {investment.companies && investment.companies.length > 0 ? (
                <div className="space-y-4">
                  {investment.companies.map((company: any) => (
                    <Card key={company.id}>
                      <Flex direction="column" gap="2">
                        <Heading size="4">{company.name}</Heading>
                        {company.description && (
                          <Text size="2" color="gray">{company.description}</Text>
                        )}
                        {company.website_url && (
                          <a 
                            href={company.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
                          >
                            <Text size="2">Visit Website</Text>
                            <ExternalLinkIcon />
                          </a>
                        )}
                      </Flex>
                    </Card>
                  ))}
                </div>
              ) : (
                <Text color="gray">No companies associated with this investment.</Text>
              )}
            </Tabs.Content>

            <Tabs.Content value="prices">
              {loading ? (
                <Text>Loading stock prices...</Text>
              ) : stockPrices.length === 0 ? (
                <Text color="gray">No stock price data available for the selected date range.</Text>
              ) : (
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Open</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Close</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>High</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Low</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Volume</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {stockPrices.map((price) => (
                      <Table.Row key={price.price_date}>
                        <Table.Cell>{formatDate(price.price_date)}</Table.Cell>
                        <Table.Cell>${price.open_price?.toFixed(2)}</Table.Cell>
                        <Table.Cell>${price.close_price?.toFixed(2)}</Table.Cell>
                        <Table.Cell>${price.high_price?.toFixed(2)}</Table.Cell>
                        <Table.Cell>${price.low_price?.toFixed(2)}</Table.Cell>
                        <Table.Cell>{formatNumber(price.volume)}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              )}
            </Tabs.Content>

            <Tabs.Content value="ownership">
              <Flex direction="column" gap="4">
                {investment.ownership_percentage && (
                  <Card>
                    <Flex justify="between" align="center">
                      <div>
                        <Text size="2" weight="bold" color="gray">Your Ownership</Text>
                        <Text size="5" weight="bold">{investment.ownership_percentage}%</Text>
                      </div>
                    </Flex>
                  </Card>
                )}

                <div>
                  <Heading size="4" mb="3">Other Owners</Heading>
                  {investment.owners && investment.owners.length > 0 ? (
                    <div className="space-y-3">
                      {investment.owners.map((owner: any) => (
                        <Card key={owner.id}>
                          <Flex direction="column" gap="2">
                            <Flex justify="between" align="start">
                              <div>
                                <Text size="3" weight="bold">{owner.name}</Text>
                                {owner.role && (
                                  <Text size="2" color="gray">{owner.role}</Text>
                                )}
                              </div>
                              {owner.ownership_percentage && (
                                <Badge size="2">{owner.ownership_percentage}%</Badge>
                              )}
                            </Flex>
                            {owner.email && (
                              <Text size="2" color="gray">{owner.email}</Text>
                            )}
                            {owner.notes && (
                              <Text size="2">{owner.notes}</Text>
                            )}
                          </Flex>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Text color="gray">No other owners listed for this investment.</Text>
                  )}
                </div>

                {investment.ownership_percentage && investment.owners && investment.owners.length > 0 && (
                  <Card>
                    <Text size="2" weight="bold" color="gray">Total Tracked Ownership</Text>
                    <Text size="4" weight="bold">
                      {(investment.ownership_percentage + 
                        investment.owners.reduce((sum: number, owner: any) => 
                          sum + (owner.ownership_percentage || 0), 0)
                      ).toFixed(2)}%
                    </Text>
                  </Card>
                )}
              </Flex>
            </Tabs.Content>
          </div>
        </Tabs.Root>

        <Flex gap="3" justify="end" mt="6">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}