"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Button, 
  TextField, 
  TextArea, 
  Select, 
  Flex, 
  Text,
  Separator,
  Switch,
  Dialog,
  Tabs
} from "@radix-ui/themes";

interface ContractDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  contract?: any;
  properties: any[];
}

interface Person {
  id: string;
  name: string;
  type: string;
}

interface Company {
  id: string;
  name: string;
}

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  brand: string | null;
  model: string | null;
}

export function ContractDrawer({ open, onOpenChange, onSuccess, contract, properties }: ContractDrawerProps) {
  const [formData, setFormData] = useState({
    name: "",
    contract_type: "internet",
    provider_name: "",
    property_id: "",
    company_id: "",
    person_id: "",
    asset_id: "",
    start_date: "",
    end_date: "",
    renewal_date: "",
    monthly_amount: "",
    annual_amount: "",
    contract_number: "",
    auto_renewal: false,
    reminder_days_before: "30",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [persons, setPersons] = useState<Person[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const supabase = createClient();
  const isEditing = !!contract;

  useEffect(() => {
    if (open) {
      fetchRelations();
      if (contract) {
        setFormData({
          name: contract.name || "",
          contract_type: contract.contract_type || "internet",
          provider_name: contract.provider_name || "",
          property_id: contract.property_id || "",
          company_id: contract.company_id || "",
          person_id: contract.person_id || "",
          asset_id: contract.asset_id || "",
          start_date: contract.start_date || "",
          end_date: contract.end_date || "",
          renewal_date: contract.renewal_date || "",
          monthly_amount: contract.monthly_amount?.toString() || "",
          annual_amount: contract.annual_amount?.toString() || "",
          contract_number: contract.contract_number || "",
          auto_renewal: contract.auto_renewal || false,
          reminder_days_before: contract.reminder_days_before?.toString() || "30",
          notes: contract.notes || ""
        });
      } else {
        resetForm();
      }
    }
  }, [contract, open]);

  const fetchRelations = async () => {
    try {
      const [personsResult, companiesResult, assetsResult] = await Promise.all([
        supabase.from("persons").select("id, name, type").order("name"),
        supabase.from("companies").select("id, name").order("name"),
        supabase.from("assets").select("id, name, asset_type, brand, model").order("name")
      ]);

      if (personsResult.data) setPersons(personsResult.data);
      if (companiesResult.data) setCompanies(companiesResult.data);
      if (assetsResult.data) setAssets(assetsResult.data);
    } catch (error) {
      console.error("Error fetching relations:", error);
    }
  };

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
        person_id: formData.person_id || null,
        person_name: formData.person_id ? persons.find(p => p.id === formData.person_id)?.name : null,
        asset_id: formData.asset_id || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        renewal_date: formData.renewal_date || null,
        monthly_amount: formData.monthly_amount ? parseFloat(formData.monthly_amount) : null,
        annual_amount: formData.annual_amount ? parseFloat(formData.annual_amount) : null,
        contract_number: formData.contract_number || null,
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
      person_id: "",
      start_date: "",
      end_date: "",
      renewal_date: "",
      monthly_amount: "",
      annual_amount: "",
      contract_number: "",
      auto_renewal: false,
      reminder_days_before: "30",
      notes: ""
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 900, maxHeight: '85vh' }}>
        <Dialog.Title>{isEditing ? "Edit Contract" : "Add New Contract"}</Dialog.Title>
        
        <form onSubmit={handleSubmit}>
          <Tabs.Root defaultValue="basic">
            <Tabs.List>
              <Tabs.Trigger value="basic">Basic Info</Tabs.Trigger>
              <Tabs.Trigger value="relations">Relations</Tabs.Trigger>
              <Tabs.Trigger value="dates">Dates & Renewal</Tabs.Trigger>
              <Tabs.Trigger value="financial">Financial</Tabs.Trigger>
            </Tabs.List>

            <div style={{ maxHeight: 'calc(85vh - 180px)', overflowY: 'auto', paddingRight: '8px', marginTop: '16px' }}>
              <Tabs.Content value="basic">
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
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="relations">
                <Flex direction="column" gap="4">

              <Flex gap="3">
                <div style={{ flex: 1 }}>
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

                <div style={{ flex: 1 }}>
                  <Text as="label" size="2" weight="bold" htmlFor="person_id">
                    Associated Person
                  </Text>
                  <Select.Root 
                    value={formData.person_id || "none"} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, person_id: value === "none" ? "" : value }))}
                  >
                    <Select.Trigger placeholder="Select a person" />
                    <Select.Content>
                      <Select.Item value="none">None</Select.Item>
                      {persons.map((person) => (
                        <Select.Item key={person.id} value={person.id}>
                          {person.name} ({person.type})
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              </Flex>

              <div>
                <Text as="label" size="2" weight="bold" htmlFor="company_id">
                  Associated Company
                </Text>
                <Select.Root 
                  value={formData.company_id || "none"} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, company_id: value === "none" ? "" : value }))}
                >
                  <Select.Trigger placeholder="Select a company" />
                  <Select.Content>
                    <Select.Item value="none">None</Select.Item>
                    {companies.map((company) => (
                      <Select.Item key={company.id} value={company.id}>
                        {company.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>

              <div>
                <Text as="label" size="2" weight="bold" htmlFor="asset_id">
                  Associated Asset
                </Text>
                <Select.Root 
                  value={formData.asset_id || "none"} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, asset_id: value === "none" ? "" : value }))}
                >
                  <Select.Trigger placeholder="Select an asset" />
                  <Select.Content>
                    <Select.Item value="none">None</Select.Item>
                    {assets.map((asset) => (
                      <Select.Item key={asset.id} value={asset.id}>
                        {asset.name} - {asset.asset_type} {asset.brand && `(${asset.brand} ${asset.model || ''})`}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="dates">
                <Flex direction="column" gap="4">

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
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="financial">
                <Flex direction="column" gap="4">

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
              </Tabs.Content>
            </div>
          </Tabs.Root>

          <Flex gap="3" justify="end" mt="4" style={{ borderTop: '1px solid var(--gray-5)', paddingTop: '16px' }}>
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