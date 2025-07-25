"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Dialog, 
  Button, 
  TextField, 
  TextArea, 
  Select, 
  Flex, 
  Text,
  Separator,
  Checkbox,
  Switch
} from "@radix-ui/themes";

interface ContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  contract?: any;
  properties: any[];
}

export function ContractModal({ open, onOpenChange, onSuccess, contract, properties }: ContractModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    contract_type: "internet",
    provider_name: "",
    property_id: "",
    company_id: "",
    person_name: "",
    start_date: "",
    end_date: "",
    renewal_date: "",
    monthly_amount: "",
    annual_amount: "",
    contract_number: "",
    portal_url: "",
    auto_renewal: false,
    reminder_days_before: "30",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const isEditing = !!contract;

  useEffect(() => {
    if (contract && open) {
      setFormData({
        name: contract.name || "",
        contract_type: contract.contract_type || "internet",
        provider_name: contract.provider_name || "",
        property_id: contract.property_id || "",
        company_id: contract.company_id || "",
        person_name: contract.person_name || "",
        start_date: contract.start_date || "",
        end_date: contract.end_date || "",
        renewal_date: contract.renewal_date || "",
        monthly_amount: contract.monthly_amount?.toString() || "",
        annual_amount: contract.annual_amount?.toString() || "",
        contract_number: contract.contract_number || "",
        portal_url: contract.portal_url || "",
        auto_renewal: contract.auto_renewal || false,
        reminder_days_before: contract.reminder_days_before?.toString() || "30",
        notes: contract.notes || ""
      });
    } else if (!open) {
      resetForm();
    }
  }, [contract, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const contractData = {
        name: formData.name,
        contract_type: formData.contract_type,
        provider_name: formData.provider_name || null,
        property_id: formData.property_id || null,
        company_id: formData.company_id || null,
        person_name: formData.person_name || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        renewal_date: formData.renewal_date || null,
        monthly_amount: formData.monthly_amount ? parseFloat(formData.monthly_amount) : null,
        annual_amount: formData.annual_amount ? parseFloat(formData.annual_amount) : null,
        contract_number: formData.contract_number || null,
        portal_url: formData.portal_url || null,
        auto_renewal: formData.auto_renewal,
        reminder_days_before: parseInt(formData.reminder_days_before) || 30,
        notes: formData.notes || null
      };

      if (isEditing) {
        const { error } = await supabase
          .from("contracts")
          .update(contractData)
          .eq("id", contract.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("contracts")
          .insert({ ...contractData, user_id: user.id });

        if (error) throw error;
      }

      onSuccess();
      resetForm();
    } catch (error) {
      console.error("Error saving contract:", error);
      alert("Failed to save contract. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      contract_type: "internet",
      provider_name: "",
      property_id: "",
      company_id: "",
      person_name: "",
      start_date: "",
      end_date: "",
      renewal_date: "",
      monthly_amount: "",
      annual_amount: "",
      contract_number: "",
      portal_url: "",
      auto_renewal: false,
      reminder_days_before: "30",
      notes: ""
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>{isEditing ? "Edit Contract" : "Add New Contract"}</Dialog.Title>
        
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <div>
              <Text as="label" size="2" weight="bold" htmlFor="name">
                Contract Name *
              </Text>
              <TextField.Root
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Internet Service - Home"
                required
              />
            </div>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="contract_type">
                  Contract Type *
                </Text>
                <Select.Root 
                  value={formData.contract_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, contract_type: value }))}
                >
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="internet">Internet</Select.Item>
                    <Select.Item value="insurance">Insurance</Select.Item>
                    <Select.Item value="phone">Phone</Select.Item>
                    <Select.Item value="utilities">Utilities</Select.Item>
                    <Select.Item value="maintenance">Maintenance</Select.Item>
                    <Select.Item value="security">Security</Select.Item>
                    <Select.Item value="cleaning">Cleaning</Select.Item>
                    <Select.Item value="other">Other</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>

              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="provider_name">
                  Provider Name
                </Text>
                <TextField.Root
                  id="provider_name"
                  value={formData.provider_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, provider_name: e.target.value }))}
                  placeholder="Service provider"
                />
              </div>
            </Flex>

            <div>
              <Text as="label" size="2" weight="bold" htmlFor="property_id">
                Associated Property
              </Text>
              <Select.Root 
                value={formData.property_id || "none"} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, property_id: value === "none" ? "" : value }))}
              >
                <Select.Trigger placeholder="Select a property" />
                <Select.Content>
                  <Select.Item value="none">None</Select.Item>
                  {properties.map((property) => (
                    <Select.Item key={property.id} value={property.id}>
                      {property.name} - {property.city}, {property.country}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>

            <div>
              <Text as="label" size="2" weight="bold" htmlFor="contract_number">
                Contract Number
              </Text>
              <TextField.Root
                id="contract_number"
                value={formData.contract_number}
                onChange={(e) => setFormData(prev => ({ ...prev, contract_number: e.target.value }))}
                placeholder="Contract or account number"
              />
            </div>

            <Separator size="4" />

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="start_date">
                  Start Date
                </Text>
                <TextField.Root
                  id="start_date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  type="date"
                />
              </div>

              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="end_date">
                  End Date
                </Text>
                <TextField.Root
                  id="end_date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  type="date"
                />
              </div>
            </Flex>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="renewal_date">
                  Renewal Date
                </Text>
                <TextField.Root
                  id="renewal_date"
                  value={formData.renewal_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, renewal_date: e.target.value }))}
                  type="date"
                />
              </div>

              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="reminder_days_before">
                  Reminder Days Before
                </Text>
                <TextField.Root
                  id="reminder_days_before"
                  value={formData.reminder_days_before}
                  onChange={(e) => setFormData(prev => ({ ...prev, reminder_days_before: e.target.value }))}
                  type="number"
                  min="1"
                />
              </div>
            </Flex>

            <Flex gap="3" align="center">
              <Text size="2">Auto-renewal</Text>
              <Switch
                checked={formData.auto_renewal}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_renewal: checked }))}
              />
            </Flex>

            <Separator size="4" />

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="monthly_amount">
                  Monthly Amount
                </Text>
                <TextField.Root
                  id="monthly_amount"
                  value={formData.monthly_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_amount: e.target.value }))}
                  placeholder="0"
                  type="number"
                  step="0.01"
                />
              </div>

              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="annual_amount">
                  Annual Amount
                </Text>
                <TextField.Root
                  id="annual_amount"
                  value={formData.annual_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, annual_amount: e.target.value }))}
                  placeholder="0"
                  type="number"
                  step="0.01"
                />
              </div>
            </Flex>

            <div>
              <Text as="label" size="2" weight="bold" htmlFor="portal_url">
                Portal URL
              </Text>
              <TextField.Root
                id="portal_url"
                value={formData.portal_url}
                onChange={(e) => setFormData(prev => ({ ...prev, portal_url: e.target.value }))}
                placeholder="https://portal.example.com"
                type="url"
              />
            </div>

            <div>
              <Text as="label" size="2" weight="bold" htmlFor="notes">
                Notes
              </Text>
              <TextArea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this contract"
              />
            </div>
          </Flex>

          <Flex gap="3" justify="end" mt="6">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Contract" : "Create Contract")}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}