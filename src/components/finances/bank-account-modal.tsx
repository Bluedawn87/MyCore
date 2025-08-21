"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  TextArea,
  Select,
  Heading,
} from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import type { BankAccount, CreateBankAccountForm } from "@/types/finances";

interface BankAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: BankAccount | null;
  onSuccess: () => void;
}

export function BankAccountModal({
  open,
  onOpenChange,
  account,
  onSuccess,
}: BankAccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateBankAccountForm>({
    name: "",
    bank_name: "",
    account_type: "checking",
    account_number_last4: "",
    current_balance: 0,
    description: "",
    notes: "",
  });

  const supabase = createClient();
  const isEditing = !!account;

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        bank_name: account.bank_name,
        account_type: account.account_type,
        account_number_last4: account.account_number_last4 || "",
        current_balance: account.current_balance || 0,
        description: account.description || "",
        notes: account.notes || "",
      });
    } else {
      setFormData({
        name: "",
        bank_name: "",
        account_type: "checking",
        account_number_last4: "",
        current_balance: 0,
        description: "",
        notes: "",
      });
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        // Update existing account
        const { error } = await supabase
          .from("bank_accounts")
          .update({
            name: formData.name,
            bank_name: formData.bank_name,
            account_type: formData.account_type,
            account_number_last4: formData.account_number_last4 || null,
            current_balance: formData.current_balance,
            description: formData.description || null,
            notes: formData.notes || null,
          })
          .eq("id", account.id);

        if (error) throw error;

        // Update balance if it's a manual account and balance changed
        if (account.connection_type === 'manual' && formData.current_balance !== account.current_balance) {
          await supabase
            .from("account_balances")
            .upsert({
              user_id: account.user_id,
              bank_account_id: account.id,
              balance: formData.current_balance,
              currency: account.currency,
              balance_date: new Date().toISOString().split('T')[0],
              source: 'manual',
            }, {
              onConflict: 'bank_account_id,balance_date'
            });
        }
      } else {
        // Create new account
        const { data: newAccount, error } = await supabase
          .from("bank_accounts")
          .insert({
            name: formData.name,
            bank_name: formData.bank_name,
            account_type: formData.account_type,
            account_number_last4: formData.account_number_last4 || null,
            current_balance: formData.current_balance,
            currency: "USD", // Default currency
            connection_type: "manual",
            is_active: true,
            description: formData.description || null,
            notes: formData.notes || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Create initial balance record
        if (formData.current_balance && formData.current_balance !== 0) {
          await supabase
            .from("account_balances")
            .insert({
              user_id: newAccount.user_id,
              bank_account_id: newAccount.id,
              balance: formData.current_balance,
              currency: "USD",
              balance_date: new Date().toISOString().split('T')[0],
              source: 'manual',
            });
        }
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving bank account:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateBankAccountForm, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="3" maxWidth="500px">
        <Dialog.Title>
          <Flex justify="between" align="center">
            <Heading size="6">
              {isEditing ? "Edit Bank Account" : "Add Manual Bank Account"}
            </Heading>
            <Dialog.Close>
              <Button variant="ghost" size="2">
                <Cross2Icon />
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Title>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-3">
            <div>
              <Text size="2" weight="medium" mb="1" display="block">
                Account Name *
              </Text>
              <TextField.Root
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Main Checking, Savings Account"
                required
              />
            </div>

            <div>
              <Text size="2" weight="medium" mb="1" display="block">
                Bank Name *
              </Text>
              <TextField.Root
                value={formData.bank_name}
                onChange={(e) => handleInputChange("bank_name", e.target.value)}
                placeholder="e.g., Chase, Bank of America"
                required
              />
            </div>

            <div>
              <Text size="2" weight="medium" mb="1" display="block">
                Account Type *
              </Text>
              <Select.Root 
                value={formData.account_type} 
                onValueChange={(value) => handleInputChange("account_type", value)}
                required
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="checking">Checking</Select.Item>
                  <Select.Item value="savings">Savings</Select.Item>
                  <Select.Item value="credit">Credit Card</Select.Item>
                  <Select.Item value="investment">Investment</Select.Item>
                  <Select.Item value="loan">Loan</Select.Item>
                  <Select.Item value="other">Other</Select.Item>
                </Select.Content>
              </Select.Root>
            </div>

            <div>
              <Text size="2" weight="medium" mb="1" display="block">
                Last 4 Digits of Account Number
              </Text>
              <TextField.Root
                value={formData.account_number_last4}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  handleInputChange("account_number_last4", value);
                }}
                placeholder="1234"
                maxLength={4}
              />
            </div>

            <div>
              <Text size="2" weight="medium" mb="1" display="block">
                Current Balance
              </Text>
              <TextField.Root
                type="number"
                step="0.01"
                value={formData.current_balance?.toString() || ""}
                onChange={(e) => handleInputChange("current_balance", parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Text size="2" weight="medium" mb="1" display="block">
                Description
              </Text>
              <TextField.Root
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div>
              <Text size="2" weight="medium" mb="1" display="block">
                Notes
              </Text>
              <TextArea
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Optional notes"
                rows={3}
              />
            </div>
          </div>

          <Flex justify="end" gap="3" mt="6">
            <Dialog.Close>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={loading || !formData.name || !formData.bank_name}>
              {loading ? "Saving..." : isEditing ? "Update Account" : "Add Account"}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}