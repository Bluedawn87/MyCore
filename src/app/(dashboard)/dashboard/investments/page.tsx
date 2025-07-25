"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Flex, Text, Heading, Badge, Dialog, DropdownMenu } from "@radix-ui/themes";
import { PlusIcon, ExternalLinkIcon, DotsVerticalIcon, Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { InvestmentModal } from "@/components/investments/investment-modal";
import { InvestmentDetailsModal } from "@/components/investments/investment-details-modal";
import { DateRangeSelector } from "@/components/investments/date-range-selector";

interface Investment {
  id: string;
  name: string;
  type: "equity" | "stock";
  description: string | null;
  frontend_url: string | null;
  portal_url: string | null;
  ticker_symbol: string | null;
  initial_investment_amount: number | null;
  initial_investment_date: string | null;
  ownership_percentage: number | null;
  created_at: string;
  updated_at: string;
  companies?: Company[];
  latest_metrics?: InvestmentMetrics;
  latest_stock_price?: StockPrice;
  owners?: Owner[];
}

interface Owner {
  id: string;
  name: string;
  email: string | null;
  ownership_percentage: number | null;
  role: string | null;
  notes: string | null;
}

interface Company {
  id: string;
  name: string;
  description: string | null;
  website_url: string | null;
}

interface InvestmentMetrics {
  revenue: number | null;
  marketing_spend: number | null;
  user_acquisitions: number | null;
  monthly_active_users: number | null;
  customer_acquisition_cost: number | null;
  gross_margin: number | null;
  net_profit: number | null;
}

interface StockPrice {
  close_price: number | null;
  price_date: string;
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const supabase = createClient();

  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    try {
      const { data: investmentsData, error } = await supabase
        .from("investments")
        .select(`
          *,
          companies (id, name, description, website_url),
          investment_owners (id, name, email, ownership_percentage, role, notes),
          latest_metrics:investment_metrics(revenue, marketing_spend, user_acquisitions, monthly_active_users, customer_acquisition_cost, gross_margin, net_profit)!investment_metrics_investment_id_fkey(metric_date.desc()),
          latest_stock_price:stock_prices(close_price, price_date)!stock_prices_investment_id_fkey(price_date.desc())
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Process the data to get only the latest metrics and stock price
      const processedData = investmentsData?.map((inv: any) => ({
        ...inv,
        latest_metrics: inv.latest_metrics?.[0] || null,
        latest_stock_price: inv.latest_stock_price?.[0] || null,
        owners: inv.investment_owners || [],
      }));

      setInvestments(processedData || []);
    } catch (error) {
      console.error("Error fetching investments:", error);
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

  const formatPercentage = (value: number | null) => {
    if (!value) return "N/A";
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Text>Loading investments...</Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Flex justify="between" align="center">
        <Heading size="8">Investments</Heading>
        <Flex gap="3" align="center">
          <DateRangeSelector onChange={setDateRange} />
          <Button onClick={() => setIsAddModalOpen(true)}>
            <PlusIcon /> Add Investment
          </Button>
        </Flex>
      </Flex>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {investments.map((investment) => (
          <Card 
            key={investment.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedInvestment(investment)}
          >
            <Flex direction="column" gap="3">
              <Flex justify="between" align="start">
                <div>
                  <Heading size="4">{investment.name}</Heading>
                  {investment.ticker_symbol && (
                    <Text size="2" color="gray">{investment.ticker_symbol}</Text>
                  )}
                </div>
                <Flex gap="2" align="center">
                  <Badge color={investment.type === "equity" ? "blue" : "green"}>
                    {investment.type}
                  </Badge>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                      <Button variant="ghost" size="1" onClick={(e) => e.stopPropagation()}>
                        <DotsVerticalIcon />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      <DropdownMenu.Item
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingInvestment(investment);
                        }}
                      >
                        <Pencil1Icon />
                        Edit Investment
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item
                        color="red"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm("Are you sure you want to delete this investment?")) {
                            await supabase.from("investments").delete().eq("id", investment.id);
                            fetchInvestments();
                          }
                        }}
                      >
                        <TrashIcon />
                        Delete Investment
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </Flex>
              </Flex>

              {investment.description && (
                <Text size="2" color="gray" className="line-clamp-2">
                  {investment.description}
                </Text>
              )}

              <div className="space-y-2">
                {investment.initial_investment_amount && (
                  <Flex justify="between">
                    <Text size="2" color="gray">Initial Investment:</Text>
                    <Text size="2" weight="medium">
                      {formatCurrency(investment.initial_investment_amount)}
                    </Text>
                  </Flex>
                )}

                {investment.ownership_percentage && (
                  <Flex justify="between">
                    <Text size="2" color="gray">Your Ownership:</Text>
                    <Text size="2" weight="medium">
                      {investment.ownership_percentage}%
                    </Text>
                  </Flex>
                )}

                {investment.type === "stock" && investment.latest_stock_price ? (
                  <Flex justify="between">
                    <Text size="2" color="gray">Current Price:</Text>
                    <Text size="2" weight="medium">
                      ${investment.latest_stock_price.close_price?.toFixed(2) || "N/A"}
                    </Text>
                  </Flex>
                ) : investment.latest_metrics ? (
                  <>
                    {investment.latest_metrics.revenue && (
                      <Flex justify="between">
                        <Text size="2" color="gray">Revenue:</Text>
                        <Text size="2" weight="medium">
                          {formatCurrency(investment.latest_metrics.revenue)}
                        </Text>
                      </Flex>
                    )}
                    {investment.latest_metrics.gross_margin && (
                      <Flex justify="between">
                        <Text size="2" color="gray">Gross Margin:</Text>
                        <Text size="2" weight="medium">
                          {formatPercentage(investment.latest_metrics.gross_margin)}
                        </Text>
                      </Flex>
                    )}
                  </>
                ) : null}

                {investment.companies && investment.companies.length > 0 && (
                  <div>
                    <Text size="2" color="gray">Companies:</Text>
                    <Text size="2">{investment.companies.map(c => c.name).join(", ")}</Text>
                  </div>
                )}
              </div>

              <Flex justify="end" gap="3">
                {investment.frontend_url && (
                  <a 
                    href={investment.frontend_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
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
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
                  >
                    <Text size="2">Portal</Text>
                    <ExternalLinkIcon />
                  </a>
                )}
              </Flex>
            </Flex>
          </Card>
        ))}
      </div>

      {investments.length === 0 && (
        <Card>
          <Flex direction="column" align="center" gap="3" className="py-8">
            <Text color="gray">No investments yet</Text>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <PlusIcon /> Add Your First Investment
            </Button>
          </Flex>
        </Card>
      )}

      <InvestmentModal
        open={isAddModalOpen || !!editingInvestment}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddModalOpen(false);
            setEditingInvestment(null);
          } else if (!editingInvestment) {
            setIsAddModalOpen(true);
          }
        }}
        investment={editingInvestment}
        onSuccess={() => {
          fetchInvestments();
          setIsAddModalOpen(false);
          setEditingInvestment(null);
        }}
      />

      {selectedInvestment && (
        <InvestmentDetailsModal
          investment={selectedInvestment}
          open={!!selectedInvestment}
          onOpenChange={(open) => !open && setSelectedInvestment(null)}
          dateRange={dateRange}
        />
      )}
    </div>
  );
}