"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Button, 
  Card, 
  Flex, 
  Text, 
  Heading, 
  Badge, 
  DropdownMenu,
  Tabs,
  Grid
} from "@radix-ui/themes";
import { 
  PlusIcon, 
  ReloadIcon,
  DotsVerticalIcon, 
  Pencil1Icon, 
  TrashIcon,
  LinkBreak2Icon,
  Link2Icon,
  DashboardIcon
} from "@radix-ui/react-icons";
import { BankAccountModal } from "@/components/finances/bank-account-modal";
import { ConnectBankModal } from "@/components/finances/connect-bank-modal";
import { WealthSummary } from "@/components/finances/wealth-summary";
import { AccountDetailsModal } from "@/components/finances/account-details-modal";
import { FinancialDashboard } from "@/components/finances/financial-dashboard";
import { formatCurrency, getAccountTypeInfo, getLatestBalance } from "@/lib/finances/utils";
import type { 
  BankAccount, 
  AccountBalance, 
  FinancialSummary,
  GoCardlessConnection 
} from "@/types/finances";

export default function FinancesPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [connections, setConnections] = useState<GoCardlessConnection[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [historicalData, setHistoricalData] = useState<FinancialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Modal states
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isConnectBankModalOpen, setIsConnectBankModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      // Fetch all financial data in parallel
      const [accountsResponse, summaryResponse, connectionsResponse, transactionsResponse, historicalResponse] = await Promise.all([
        fetchBankAccounts(),
        fetchFinancialSummary(),
        fetchConnections(),
        fetchTransactions(),
        fetchHistoricalData(),
      ]);

      setBankAccounts(accountsResponse || []);
      setFinancialSummary(summaryResponse);
      setConnections(connectionsResponse || []);
      setTransactions(transactionsResponse || []);
      setHistoricalData(historicalResponse || []);
    } catch (error) {
      console.error("Error fetching financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select(`
          *,
          account_balances(balance, balance_date, currency)
        `)
        .eq('is_active', true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Process to get the latest balance for each account
      const processedAccounts = data?.map(account => {
        let latestBalance = null;
        
        // Get the latest balance by sorting by date
        if (account.account_balances?.length > 0) {
          latestBalance = account.account_balances.sort((a, b) => 
            new Date(b.balance_date).getTime() - new Date(a.balance_date).getTime()
          )[0];
        }
        
        // For manual accounts, use current_balance if no balance records exist
        if (!latestBalance && account.connection_type === 'manual' && account.current_balance !== null) {
          latestBalance = {
            balance: account.current_balance,
            currency: account.currency,
            balance_date: new Date().toISOString().split('T')[0],
          };
        }

        return {
          ...account,
          latest_balance: latestBalance,
        };
      }) || [];

      return processedAccounts;
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      return [];
    }
  };

  const fetchFinancialSummary = async () => {
    try {
      const { data, error } = await supabase
        .from("financial_summaries")
        .select("*")
        .order("summary_date", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
      return data;
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      return null;
    }
  };

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from("gocardless_connections")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching connections:", error);
      return [];
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .limit(500); // Latest 500 transactions

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  };

  const fetchHistoricalData = async () => {
    try {
      const { data, error } = await supabase
        .from("financial_summaries")
        .select("*")
        .order("summary_date", { ascending: false })
        .limit(12); // Last 12 months

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching historical data:", error);
      return [];
    }
  };

  const handleSyncData = async () => {
    try {
      setSyncing(true);
      
      // Call the sync API endpoint
      const response = await fetch('/api/finances/sync', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const result = await response.json();
      
      if (result.success) {
        // Refresh data after successful sync
        await fetchFinancialData();
        
        // Only show errors if there are actually errors
        if (result.errors && result.errors.length > 0) {
          console.warn('Sync completed with warnings:', result.errors);
        }
      } else {
        console.error('Sync failed:', result.errors);
      }
    } catch (error) {
      console.error("Error syncing data:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (confirm("Are you sure you want to delete this account? This will also delete all associated transactions.")) {
      try {
        await supabase.from("bank_accounts").delete().eq("id", accountId);
        fetchFinancialData();
      } catch (error) {
        console.error("Error deleting account:", error);
      }
    }
  };

  const handleDisconnectBank = async (connection: GoCardlessConnection) => {
    if (confirm(`Are you sure you want to disconnect ${connection.institution_name}? This will disable automatic updates.`)) {
      try {
        // Call disconnect API
        const response = await fetch('/api/finances/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requisitionId: connection.requisition_id }),
        });

        if (response.ok) {
          fetchFinancialData();
        }
      } catch (error) {
        console.error("Error disconnecting bank:", error);
      }
    }
  };

  const handleDeleteConnection = async (connection: GoCardlessConnection) => {
    if (confirm(`Are you sure you want to permanently delete the connection to ${connection.institution_name}? This cannot be undone.`)) {
      try {
        const { error } = await supabase
          .from("gocardless_connections")
          .delete()
          .eq("id", connection.id);

        if (!error) {
          fetchFinancialData();
        } else {
          console.error("Error deleting connection:", error);
        }
      } catch (error) {
        console.error("Error deleting connection:", error);
      }
    }
  };

  const getConnectionStatus = (account: BankAccount) => {
    const connection = connections.find(c => 
      bankAccounts.some(ba => 
        ba.gocardless_account_id && 
        ba.id === account.id
      )
    );

    if (!connection) return null;

    const statusColors = {
      linked: 'green',
      created: 'blue',
      expired: 'orange',
      suspended: 'red',
      error: 'red',
    };

    return (
      <Badge color={statusColors[connection.status] || 'gray'}>
        {connection.status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Text>Loading financial data...</Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Flex justify="between" align="center">
        <Heading size="8">Finances</Heading>
        <Flex gap="3" align="center">
          <Button 
            variant="outline" 
            onClick={handleSyncData}
            disabled={syncing}
          >
            <ReloadIcon className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Sync Data"}
          </Button>
          <Button onClick={() => setIsConnectBankModalOpen(true)}>
            <Link2Icon /> Connect Bank
          </Button>
          <Button onClick={() => setIsAddAccountModalOpen(true)}>
            <PlusIcon /> Add Manual Account
          </Button>
        </Flex>
      </Flex>

      <Tabs.Root defaultValue="overview">
        <Tabs.List>
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="dashboard">Dashboard</Tabs.Trigger>
          <Tabs.Trigger value="accounts">Accounts</Tabs.Trigger>
          <Tabs.Trigger value="connections">Connections</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview" className="mt-6">
          <div className="space-y-6">
            {/* Wealth Summary */}
            {financialSummary && (
              <WealthSummary 
                summary={financialSummary}
                bankAccounts={bankAccounts}
              />
            )}

            {/* Quick Account Overview */}
            <Card>
              <Flex direction="column" gap="4">
                <Flex justify="between" align="center">
                  <Heading size="4">Account Balances</Heading>
                  <Text size="2" color="gray">
                    {bankAccounts.length} accounts
                  </Text>
                </Flex>
                
                <Grid columns="1" gap="3">
                  {bankAccounts.slice(0, 5).map((account) => {
                    const typeInfo = getAccountTypeInfo(account.account_type);

                    return (
                      <Flex 
                        key={account.id} 
                        justify="between" 
                        align="center"
                        className="p-3 rounded border hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedAccount(account)}
                      >
                        <Flex align="center" gap="3">
                          <Text>{typeInfo.icon}</Text>
                          <div>
                            <Text weight="medium">{account.name}</Text>
                            <Text size="2" color="gray">{account.bank_name}</Text>
                          </div>
                        </Flex>
                        <Flex align="center" gap="2">
                          {getConnectionStatus(account)}
                          <Text weight="medium">
                            {account.latest_balance ? 
                              formatCurrency(account.latest_balance.balance, account.latest_balance.currency) : 
                              'N/A'
                            }
                          </Text>
                        </Flex>
                      </Flex>
                    );
                  })}
                </Grid>
                
                {bankAccounts.length > 5 && (
                  <Button variant="outline" className="w-full">
                    View All Accounts
                  </Button>
                )}
              </Flex>
            </Card>
          </div>
        </Tabs.Content>

        <Tabs.Content value="dashboard" className="mt-6">
          <FinancialDashboard
            summary={financialSummary}
            bankAccounts={bankAccounts}
            transactions={transactions}
            historicalData={historicalData}
          />
        </Tabs.Content>

        <Tabs.Content value="accounts" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map((account) => {
              const typeInfo = getAccountTypeInfo(account.account_type);

              return (
                <Card 
                  key={account.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedAccount(account)}
                >
                  <Flex direction="column" gap="3">
                    <Flex justify="between" align="start">
                      <div className="flex-1">
                        <Flex align="center" gap="2" mb="1">
                          <Text>{typeInfo.icon}</Text>
                          <Heading size="4">{account.name}</Heading>
                        </Flex>
                        <Text size="2" color="gray">{account.bank_name}</Text>
                        {account.account_number_last4 && (
                          <Text size="2" color="gray">****{account.account_number_last4}</Text>
                        )}
                      </div>
                      <Flex gap="2" align="center">
                        <Badge color={typeInfo.color}>{typeInfo.label}</Badge>
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
                                setEditingAccount(account);
                              }}
                            >
                              <Pencil1Icon />
                              Edit Account
                            </DropdownMenu.Item>
                            {account.connection_type === 'gocardless' && (
                              <DropdownMenu.Item
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const connection = connections.find(c => 
                                    bankAccounts.some(ba => ba.gocardless_account_id && ba.id === account.id)
                                  );
                                  if (connection) handleDisconnectBank(connection);
                                }}
                              >
                                <LinkBreak2Icon />
                                Disconnect Bank
                              </DropdownMenu.Item>
                            )}
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item
                              color="red"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAccount(account.id);
                              }}
                            >
                              <TrashIcon />
                              Delete Account
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Root>
                      </Flex>
                    </Flex>

                    <div className="space-y-2">
                      <Flex justify="between">
                        <Text size="2" color="gray">Current Balance:</Text>
                        <Text size="2" weight="medium">
                          {account.latest_balance ? 
                            formatCurrency(account.latest_balance.balance, account.latest_balance.currency) : 
                            'N/A'
                          }
                        </Text>
                      </Flex>
                      
                      <Flex justify="between">
                        <Text size="2" color="gray">Connection:</Text>
                        <Flex align="center" gap="2">
                          {account.connection_type === 'gocardless' ? (
                            <>
                              <Link2Icon size={12} />
                              <Text size="2">Connected</Text>
                            </>
                          ) : (
                            <Text size="2">Manual</Text>
                          )}
                        </Flex>
                      </Flex>

                      {account.description && (
                        <Text size="2" color="gray" className="line-clamp-2">
                          {account.description}
                        </Text>
                      )}
                    </div>

                    <Flex justify="end">
                      {getConnectionStatus(account)}
                    </Flex>
                  </Flex>
                </Card>
              );
            })}
          </div>

          {bankAccounts.length === 0 && (
            <Card>
              <Flex direction="column" align="center" gap="3" className="py-8">
                <DashboardIcon size={32} color="gray" />
                <Text color="gray">No bank accounts yet</Text>
                <Flex gap="3">
                  <Button onClick={() => setIsConnectBankModalOpen(true)}>
                    <Link2Icon /> Connect Bank
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddAccountModalOpen(true)}>
                    <PlusIcon /> Add Manual Account
                  </Button>
                </Flex>
              </Flex>
            </Card>
          )}
        </Tabs.Content>

        <Tabs.Content value="connections" className="mt-6">
          <div className="space-y-4">
            {connections.map((connection) => (
              <Card key={connection.id}>
                <Flex justify="between" align="center">
                  <div>
                    <Heading size="4">{connection.institution_name}</Heading>
                    <Text size="2" color="gray">
                      Connected {new Date(connection.created_at).toLocaleDateString()}
                    </Text>
                    <Text size="2" color="gray">
                      Country: {connection.country_code}
                    </Text>
                  </div>
                  <Flex align="center" gap="3">
                    <Badge color={
                      connection.status === 'linked' ? 'green' :
                      connection.status === 'expired' ? 'orange' : 'red'
                    }>
                      {connection.status}
                    </Badge>
                    <Button 
                      variant="outline" 
                      color="red"
                      onClick={() => handleDisconnectBank(connection)}
                    >
                      <LinkBreak2Icon />
                      Disconnect
                    </Button>
                    <Button 
                      variant="outline" 
                      color="red"
                      onClick={() => handleDeleteConnection(connection)}
                    >
                      <TrashIcon />
                      Delete
                    </Button>
                  </Flex>
                </Flex>
              </Card>
            ))}
            
            {connections.length === 0 && (
              <Card>
                <Flex direction="column" align="center" gap="3" className="py-8">
                  <Link2Icon size={32} color="gray" />
                  <Text color="gray">No bank connections</Text>
                  <Button onClick={() => setIsConnectBankModalOpen(true)}>
                    <Link2Icon /> Connect Your First Bank
                  </Button>
                </Flex>
              </Card>
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Modals */}
      <BankAccountModal
        open={isAddAccountModalOpen || !!editingAccount}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddAccountModalOpen(false);
            setEditingAccount(null);
          } else if (!editingAccount) {
            setIsAddAccountModalOpen(true);
          }
        }}
        account={editingAccount}
        onSuccess={() => {
          fetchFinancialData();
          setIsAddAccountModalOpen(false);
          setEditingAccount(null);
        }}
      />

      <ConnectBankModal
        open={isConnectBankModalOpen}
        onOpenChange={setIsConnectBankModalOpen}
        onSuccess={() => {
          fetchFinancialData();
          setIsConnectBankModalOpen(false);
        }}
      />

      {selectedAccount && (
        <AccountDetailsModal
          account={selectedAccount}
          open={!!selectedAccount}
          onOpenChange={(open) => !open && setSelectedAccount(null)}
          onUpdate={() => {
            fetchFinancialData();
          }}
        />
      )}
    </div>
  );
}