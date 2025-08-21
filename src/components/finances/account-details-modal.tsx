"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  Button,
  Flex,
  Text,
  Heading,
  Badge,
  Tabs,
  Card,
  TextField,
  Select,
} from "@radix-ui/themes";
import { 
  Cross2Icon, 
  ReloadIcon, 
  PlusIcon,
  CalendarIcon,
  DotFilledIcon
} from "@radix-ui/react-icons";
import { formatCurrency, formatLargeNumber, getAccountTypeInfo, calculatePercentageChange } from "@/lib/finances/utils";
import type { BankAccount, AccountBalance, FinancialTransaction } from "@/types/finances";

interface AccountDetailsModalProps {
  account: BankAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function AccountDetailsModal({
  account,
  open,
  onOpenChange,
  onUpdate,
}: AccountDetailsModalProps) {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Manual transaction form
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    amount: 0,
    description: "",
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: "debit" as const,
    merchant_name: "",
  });

  // Manual balance update form
  const [showUpdateBalance, setShowUpdateBalance] = useState(false);
  const [newBalance, setNewBalance] = useState({
    balance: account.current_balance || 0,
    balance_date: new Date().toISOString().split('T')[0],
  });

  const supabase = createClient();
  const typeInfo = getAccountTypeInfo(account.account_type);

  useEffect(() => {
    if (open) {
      fetchAccountData();
    }
  }, [open, account.id]);

  const fetchAccountData = async () => {
    try {
      setLoading(true);
      
      const [balancesResponse, transactionsResponse] = await Promise.all([
        fetchBalances(),
        fetchTransactions(),
      ]);

      setBalances(balancesResponse);
      setTransactions(transactionsResponse);
    } catch (error) {
      console.error("Error fetching account data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalances = async () => {
    try {
      const { data, error } = await supabase
        .from("account_balances")
        .select("*")
        .eq("bank_account_id", account.id)
        .order("balance_date", { ascending: false })
        .limit(30); // Last 30 balance records

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching balances:", error);
      return [];
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("bank_account_id", account.id)
        .order("transaction_date", { ascending: false })
        .limit(100); // Last 100 transactions

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  };

  const handleSyncAccount = async () => {
    if (account.connection_type !== 'gocardless') return;
    
    try {
      setSyncing(true);
      
      const response = await fetch('/api/finances/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id }),
      });

      if (response.ok) {
        await fetchAccountData();
        onUpdate();
      }
    } catch (error) {
      console.error("Error syncing account:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleAddTransaction = async () => {
    try {
      const { error } = await supabase
        .from("financial_transactions")
        .insert({
          bank_account_id: account.id,
          amount: newTransaction.transaction_type === 'debit' 
            ? -Math.abs(newTransaction.amount) 
            : Math.abs(newTransaction.amount),
          currency: account.currency,
          transaction_date: newTransaction.transaction_date,
          description: newTransaction.description,
          merchant_name: newTransaction.merchant_name || null,
          transaction_type: newTransaction.transaction_type,
          source: 'manual',
        });

      if (error) throw error;

      // Reset form and refresh data
      setNewTransaction({
        amount: 0,
        description: "",
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: "debit",
        merchant_name: "",
      });
      setShowAddTransaction(false);
      await fetchAccountData();
      onUpdate();
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  };

  const handleUpdateBalance = async () => {
    try {
      // Insert new balance record
      const { error: balanceError } = await supabase
        .from("account_balances")
        .upsert({
          bank_account_id: account.id,
          balance: newBalance.balance,
          currency: account.currency,
          balance_date: newBalance.balance_date,
          source: 'manual',
        }, {
          onConflict: 'bank_account_id,balance_date'
        });

      if (balanceError) throw balanceError;

      // Update account's current balance
      if (account.connection_type === 'manual') {
        const { error: accountError } = await supabase
          .from("bank_accounts")
          .update({ current_balance: newBalance.balance })
          .eq("id", account.id);

        if (accountError) throw accountError;
      }

      setShowUpdateBalance(false);
      await fetchAccountData();
      onUpdate();
    } catch (error) {
      console.error("Error updating balance:", error);
    }
  };

  const getBalanceChange = () => {
    if (balances.length < 2) return null;
    
    const current = balances[0].balance;
    const previous = balances[1].balance;
    
    return calculatePercentageChange(current, previous);
  };

  const getCurrentBalance = () => {
    if (balances.length > 0) {
      return balances[0];
    }
    
    if (account.connection_type === 'manual' && account.current_balance) {
      return {
        balance: account.current_balance,
        currency: account.currency,
        balance_date: new Date().toISOString().split('T')[0],
        source: 'manual',
      } as AccountBalance;
    }
    
    return null;
  };

  const currentBalance = getCurrentBalance();
  const balanceChange = getBalanceChange();

  const renderBalanceTab = () => (
    <div className="space-y-4">
      {/* Current Balance */}
      <Card className="p-4">
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Text size="2" color="gray">Current Balance</Text>
            {account.connection_type === 'gocardless' && (
              <Button size="1" variant="outline" onClick={handleSyncAccount} disabled={syncing}>
                <ReloadIcon className={syncing ? "animate-spin" : ""} />
                {syncing ? "Syncing..." : "Sync"}
              </Button>
            )}
          </Flex>
          
          <div>
            <Heading size="6">
              {currentBalance ? 
                formatCurrency(currentBalance.balance, currentBalance.currency) : 
                'N/A'
              }
            </Heading>
            
            {balanceChange && (
              <Flex align="center" gap="2" mt="1">
                <Text 
                  size="2" 
                  color={balanceChange.isPositive ? "green" : "red"}
                >
                  {balanceChange.isPositive ? "+" : "-"}
                  {formatCurrency(Math.abs(balanceChange.change), account.currency)}
                  ({balanceChange.percentage.toFixed(1)}%)
                </Text>
                <Text size="2" color="gray">from previous record</Text>
              </Flex>
            )}
          </div>

          {account.connection_type === 'manual' && (
            <Button size="2" variant="outline" onClick={() => setShowUpdateBalance(true)}>
              Update Balance
            </Button>
          )}
        </Flex>
      </Card>

      {/* Balance History */}
      <div>
        <Heading size="4" mb="3">Balance History</Heading>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {balances.map((balance, index) => (
            <Flex key={`${balance.balance_date}-${index}`} justify="between" align="center" className="p-2 border rounded">
              <div>
                <Text weight="medium">
                  {formatCurrency(balance.balance, balance.currency)}
                </Text>
                <Text size="2" color="gray">
                  {new Date(balance.balance_date).toLocaleDateString()}
                </Text>
              </div>
              <Badge size="1" color={balance.source === 'gocardless' ? 'green' : 'gray'}>
                {balance.source}
              </Badge>
            </Flex>
          ))}
          
          {balances.length === 0 && (
            <Text color="gray" className="text-center py-4">No balance history</Text>
          )}
        </div>
      </div>

      {/* Manual Balance Update Form */}
      {showUpdateBalance && (
        <Card className="p-4">
          <Heading size="4" mb="3">Update Balance</Heading>
          <div className="space-y-3">
            <div>
              <Text size="2" weight="medium" mb="1" display="block">Balance</Text>
              <TextField.Root
                type="number"
                step="0.01"
                value={newBalance.balance.toString()}
                onChange={(e) => setNewBalance(prev => ({ 
                  ...prev, 
                  balance: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
            <div>
              <Text size="2" weight="medium" mb="1" display="block">Date</Text>
              <TextField.Root
                type="date"
                value={newBalance.balance_date}
                onChange={(e) => setNewBalance(prev => ({ 
                  ...prev, 
                  balance_date: e.target.value 
                }))}
              />
            </div>
            <Flex gap="2">
              <Button onClick={handleUpdateBalance}>Update</Button>
              <Button variant="outline" onClick={() => setShowUpdateBalance(false)}>
                Cancel
              </Button>
            </Flex>
          </div>
        </Card>
      )}
    </div>
  );

  const renderTransactionsTab = () => (
    <div className="space-y-4">
      <Flex justify="between" align="center">
        <Heading size="4">Recent Transactions</Heading>
        {account.connection_type === 'manual' && (
          <Button size="2" onClick={() => setShowAddTransaction(true)}>
            <PlusIcon /> Add Transaction
          </Button>
        )}
      </Flex>

      {/* Add Transaction Form */}
      {showAddTransaction && (
        <Card className="p-4">
          <Heading size="4" mb="3">Add Transaction</Heading>
          <div className="space-y-3">
            <div>
              <Text size="2" weight="medium" mb="1" display="block">Amount</Text>
              <TextField.Root
                type="number"
                step="0.01"
                value={newTransaction.amount.toString()}
                onChange={(e) => setNewTransaction(prev => ({ 
                  ...prev, 
                  amount: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
            <div>
              <Text size="2" weight="medium" mb="1" display="block">Type</Text>
              <Select.Root 
                value={newTransaction.transaction_type}
                onValueChange={(value) => setNewTransaction(prev => ({ 
                  ...prev, 
                  transaction_type: value as any 
                }))}
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="credit">Credit (Money In)</Select.Item>
                  <Select.Item value="debit">Debit (Money Out)</Select.Item>
                </Select.Content>
              </Select.Root>
            </div>
            <div>
              <Text size="2" weight="medium" mb="1" display="block">Description</Text>
              <TextField.Root
                value={newTransaction.description}
                onChange={(e) => setNewTransaction(prev => ({ 
                  ...prev, 
                  description: e.target.value 
                }))}
                placeholder="Transaction description"
              />
            </div>
            <div>
              <Text size="2" weight="medium" mb="1" display="block">Merchant/Payee</Text>
              <TextField.Root
                value={newTransaction.merchant_name}
                onChange={(e) => setNewTransaction(prev => ({ 
                  ...prev, 
                  merchant_name: e.target.value 
                }))}
                placeholder="Optional"
              />
            </div>
            <div>
              <Text size="2" weight="medium" mb="1" display="block">Date</Text>
              <TextField.Root
                type="date"
                value={newTransaction.transaction_date}
                onChange={(e) => setNewTransaction(prev => ({ 
                  ...prev, 
                  transaction_date: e.target.value 
                }))}
              />
            </div>
            <Flex gap="2">
              <Button onClick={handleAddTransaction}>Add Transaction</Button>
              <Button variant="outline" onClick={() => setShowAddTransaction(false)}>
                Cancel
              </Button>
            </Flex>
          </div>
        </Card>
      )}

      {/* Transactions List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {transactions.map((transaction) => (
          <Card key={transaction.id} className="p-3">
            <Flex justify="between" align="start">
              <div className="flex-1">
                <Flex align="center" gap="2" mb="1">
                  <DotFilledIcon 
                    color={transaction.amount >= 0 ? "green" : "red"} 
                  />
                  <Text weight="medium">
                    {transaction.description || "Transaction"}
                  </Text>
                </Flex>
                
                {transaction.merchant_name && (
                  <Text size="2" color="gray" mb="1">
                    {transaction.merchant_name}
                  </Text>
                )}
                
                <Flex align="center" gap="2">
                  <CalendarIcon size={12} />
                  <Text size="2" color="gray">
                    {new Date(transaction.transaction_date).toLocaleDateString()}
                  </Text>
                  <Badge size="1" color={transaction.source === 'gocardless' ? 'green' : 'gray'}>
                    {transaction.source}
                  </Badge>
                </Flex>
              </div>
              
              <Text 
                size="3" 
                weight="bold"
                color={transaction.amount >= 0 ? "green" : "red"}
              >
                {transaction.amount >= 0 ? "+" : ""}
                {formatCurrency(transaction.amount, transaction.currency)}
              </Text>
            </Flex>
          </Card>
        ))}
        
        {transactions.length === 0 && (
          <Text color="gray" className="text-center py-8">
            No transactions found
          </Text>
        )}
      </div>
    </div>
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="4" maxWidth="800px">
        <Dialog.Title>
          <Flex justify="between" align="center">
            <div>
              <Flex align="center" gap="2" mb="1">
                <Text>{typeInfo.icon}</Text>
                <Heading size="6">{account.name}</Heading>
              </Flex>
              <Text color="gray">{account.bank_name}</Text>
            </div>
            <Dialog.Close>
              <Button variant="ghost" size="2">
                <Cross2Icon />
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Title>

        <div className="mt-4">
          {loading ? (
            <Flex justify="center" align="center" className="py-8">
              <ReloadIcon className="animate-spin" />
              <Text ml="2">Loading account data...</Text>
            </Flex>
          ) : (
            <Tabs.Root defaultValue="balance">
              <Tabs.List>
                <Tabs.Trigger value="balance">Balance</Tabs.Trigger>
                <Tabs.Trigger value="transactions">
                  Transactions ({transactions.length})
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="balance" className="mt-4">
                {renderBalanceTab()}
              </Tabs.Content>

              <Tabs.Content value="transactions" className="mt-4">
                {renderTransactionsTab()}
              </Tabs.Content>
            </Tabs.Root>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}