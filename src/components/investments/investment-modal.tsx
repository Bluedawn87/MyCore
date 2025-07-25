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
  Separator
} from "@radix-ui/themes";

interface InvestmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  investment?: any; // Investment to edit
}

interface Owner {
  name: string;
  email: string;
  ownership_percentage: string;
  role: string;
  notes: string;
}

export function InvestmentModal({ open, onOpenChange, onSuccess, investment }: InvestmentModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "equity" as "equity" | "stock",
    description: "",
    frontend_url: "",
    portal_url: "",
    ticker_symbol: "",
    initial_investment_amount: "",
    initial_investment_date: "",
    ownership_percentage: "",
    companies: [{ name: "", description: "", website_url: "" }],
    owners: [{ name: "", email: "", ownership_percentage: "", role: "", notes: "" }] as Owner[]
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const isEditing = !!investment;

  // Load investment data when editing
  useEffect(() => {
    if (investment && open) {
      loadInvestmentData();
    } else if (!open) {
      resetForm();
    }
  }, [investment, open]);

  const loadInvestmentData = async () => {
    if (!investment) return;

    // Load basic investment data
    setFormData({
      name: investment.name || "",
      type: investment.type || "equity",
      description: investment.description || "",
      frontend_url: investment.frontend_url || "",
      portal_url: investment.portal_url || "",
      ticker_symbol: investment.ticker_symbol || "",
      initial_investment_amount: investment.initial_investment_amount?.toString() || "",
      initial_investment_date: investment.initial_investment_date || "",
      ownership_percentage: investment.ownership_percentage?.toString() || "",
      companies: [{ name: "", description: "", website_url: "" }],
      owners: [{ name: "", email: "", ownership_percentage: "", role: "", notes: "" }]
    });

    // Load companies if it's an equity investment
    if (investment.type === "equity") {
      const { data: companies } = await supabase
        .from("companies")
        .select("*")
        .eq("investment_id", investment.id);
      
      if (companies && companies.length > 0) {
        setFormData(prev => ({
          ...prev,
          companies: companies.map(c => ({
            name: c.name || "",
            description: c.description || "",
            website_url: c.website_url || ""
          }))
        }));
      }
    }

    // Load owners
    const { data: owners } = await supabase
      .from("investment_owners")
      .select("*")
      .eq("investment_id", investment.id);
    
    if (owners && owners.length > 0) {
      setFormData(prev => ({
        ...prev,
        owners: owners.map(o => ({
          name: o.name || "",
          email: o.email || "",
          ownership_percentage: o.ownership_percentage?.toString() || "",
          role: o.role || "",
          notes: o.notes || ""
        }))
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      let investmentData;
      
      if (isEditing) {
        // Update existing investment
        const { data, error: investmentError } = await supabase
          .from("investments")
          .update({
            name: formData.name,
            type: formData.type,
            description: formData.description || null,
            frontend_url: formData.frontend_url || null,
            portal_url: formData.portal_url || null,
            ticker_symbol: formData.type === "stock" ? formData.ticker_symbol || null : null,
            initial_investment_amount: formData.initial_investment_amount ? parseFloat(formData.initial_investment_amount) : null,
            initial_investment_date: formData.initial_investment_date || null,
            ownership_percentage: formData.ownership_percentage ? parseFloat(formData.ownership_percentage) : null,
          })
          .eq("id", investment.id)
          .select()
          .single();

        if (investmentError) throw investmentError;
        investmentData = data;
      } else {
        // Insert new investment
        const { data, error: investmentError } = await supabase
          .from("investments")
          .insert({
            name: formData.name,
            type: formData.type,
            description: formData.description || null,
            frontend_url: formData.frontend_url || null,
            portal_url: formData.portal_url || null,
            ticker_symbol: formData.type === "stock" ? formData.ticker_symbol || null : null,
            initial_investment_amount: formData.initial_investment_amount ? parseFloat(formData.initial_investment_amount) : null,
            initial_investment_date: formData.initial_investment_date || null,
            ownership_percentage: formData.ownership_percentage ? parseFloat(formData.ownership_percentage) : null,
            user_id: user.id
          })
          .select()
          .single();

        if (investmentError) throw investmentError;
        investmentData = data;
      }

      // Handle companies for equity investments
      if (formData.type === "equity" && investmentData) {
        // Delete existing companies if editing
        if (isEditing) {
          await supabase
            .from("companies")
            .delete()
            .eq("investment_id", investment.id);
        }

        // Insert new companies
        const validCompanies = formData.companies.filter(c => c.name);
        if (validCompanies.length > 0) {
          const { error: companiesError } = await supabase
            .from("companies")
            .insert(
              validCompanies.map(company => ({
                investment_id: investmentData.id,
                name: company.name,
                description: company.description || null,
                website_url: company.website_url || null
              }))
            );

          if (companiesError) throw companiesError;
        }
      }

      // Handle owners
      if (investmentData) {
        // Delete existing owners if editing
        if (isEditing) {
          await supabase
            .from("investment_owners")
            .delete()
            .eq("investment_id", investment.id);
        }

        // Insert new owners
        const validOwners = formData.owners.filter(o => o.name);
        if (validOwners.length > 0) {
          const { error: ownersError } = await supabase
            .from("investment_owners")
            .insert(
              validOwners.map(owner => ({
                investment_id: investmentData.id,
                name: owner.name,
                email: owner.email || null,
                ownership_percentage: owner.ownership_percentage ? parseFloat(owner.ownership_percentage) : null,
                role: owner.role || null,
                notes: owner.notes || null
              }))
            );

          if (ownersError) throw ownersError;
        }
      }

      onSuccess();
      resetForm();
    } catch (error) {
      console.error("Error creating investment:", error);
      alert("Failed to create investment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "equity",
      description: "",
      frontend_url: "",
      portal_url: "",
      ticker_symbol: "",
      initial_investment_amount: "",
      initial_investment_date: "",
      ownership_percentage: "",
      companies: [{ name: "", description: "", website_url: "" }],
      owners: [{ name: "", email: "", ownership_percentage: "", role: "", notes: "" }]
    });
  };

  const addCompany = () => {
    setFormData(prev => ({
      ...prev,
      companies: [...prev.companies, { name: "", description: "", website_url: "" }]
    }));
  };

  const updateCompany = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      companies: prev.companies.map((company, i) => 
        i === index ? { ...company, [field]: value } : company
      )
    }));
  };

  const removeCompany = (index: number) => {
    setFormData(prev => ({
      ...prev,
      companies: prev.companies.filter((_, i) => i !== index)
    }));
  };

  const addOwner = () => {
    setFormData(prev => ({
      ...prev,
      owners: [...prev.owners, { name: "", email: "", ownership_percentage: "", role: "", notes: "" }]
    }));
  };

  const updateOwner = (index: number, field: keyof Owner, value: string) => {
    setFormData(prev => ({
      ...prev,
      owners: prev.owners.map((owner, i) => 
        i === index ? { ...owner, [field]: value } : owner
      )
    }));
  };

  const removeOwner = (index: number) => {
    setFormData(prev => ({
      ...prev,
      owners: prev.owners.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>{isEditing ? "Edit Investment" : "Add New Investment"}</Dialog.Title>
        
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <div>
              <Text as="label" size="2" weight="bold" htmlFor="name">
                Investment Name *
              </Text>
              <TextField.Root
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Acme Corp"
                required
              />
            </div>

            <div>
              <Text as="label" size="2" weight="bold" htmlFor="type">
                Type *
              </Text>
              <Select.Root 
                value={formData.type} 
                onValueChange={(value: "equity" | "stock") => setFormData(prev => ({ ...prev, type: value }))}
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="equity">Equity Investment</Select.Item>
                  <Select.Item value="stock">Stock</Select.Item>
                </Select.Content>
              </Select.Root>
            </div>

            <div>
              <Text as="label" size="2" weight="bold" htmlFor="description">
                Description
              </Text>
              <TextArea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the investment"
              />
            </div>

            <div>
              <Text as="label" size="2" weight="bold" htmlFor="frontend_url">
                Frontend URL
              </Text>
              <TextField.Root
                id="frontend_url"
                value={formData.frontend_url}
                onChange={(e) => setFormData(prev => ({ ...prev, frontend_url: e.target.value }))}
                placeholder="https://example.com"
                type="url"
              />
            </div>

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

            {formData.type === "stock" && (
              <div>
                <Text as="label" size="2" weight="bold" htmlFor="ticker_symbol">
                  Ticker Symbol
                </Text>
                <TextField.Root
                  id="ticker_symbol"
                  value={formData.ticker_symbol}
                  onChange={(e) => setFormData(prev => ({ ...prev, ticker_symbol: e.target.value.toUpperCase() }))}
                  placeholder="AAPL"
                />
              </div>
            )}

            <div>
              <Text as="label" size="2" weight="bold" htmlFor="initial_investment_amount">
                Initial Investment Amount
              </Text>
              <TextField.Root
                id="initial_investment_amount"
                value={formData.initial_investment_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, initial_investment_amount: e.target.value }))}
                placeholder="100000"
                type="number"
                step="0.01"
              />
            </div>

            <div>
              <Text as="label" size="2" weight="bold" htmlFor="initial_investment_date">
                Initial Investment Date
              </Text>
              <TextField.Root
                id="initial_investment_date"
                value={formData.initial_investment_date}
                onChange={(e) => setFormData(prev => ({ ...prev, initial_investment_date: e.target.value }))}
                type="date"
              />
            </div>

            <div>
              <Text as="label" size="2" weight="bold" htmlFor="ownership_percentage">
                Your Ownership Percentage (%)
              </Text>
              <TextField.Root
                id="ownership_percentage"
                value={formData.ownership_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, ownership_percentage: e.target.value }))}
                placeholder="25.5"
                type="number"
                step="0.01"
                min="0"
                max="100"
              />
            </div>

            {formData.type === "equity" && (
              <>
                <Separator size="4" />
                <div>
                  <Flex justify="between" align="center" mb="2">
                    <Text size="3" weight="bold">Companies</Text>
                    <Button type="button" size="1" variant="soft" onClick={addCompany}>
                      Add Company
                    </Button>
                  </Flex>
                  
                  {formData.companies.map((company, index) => (
                    <div key={index} className="mb-4 p-3 border rounded">
                      <Flex direction="column" gap="2">
                        <TextField.Root
                          value={company.name}
                          onChange={(e) => updateCompany(index, "name", e.target.value)}
                          placeholder="Company name"
                        />
                        <TextField.Root
                          value={company.description}
                          onChange={(e) => updateCompany(index, "description", e.target.value)}
                          placeholder="Company description"
                        />
                        <TextField.Root
                          value={company.website_url}
                          onChange={(e) => updateCompany(index, "website_url", e.target.value)}
                          placeholder="Website URL"
                          type="url"
                        />
                        {formData.companies.length > 1 && (
                          <Button 
                            type="button" 
                            size="1" 
                            variant="soft" 
                            color="red"
                            onClick={() => removeCompany(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </Flex>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Separator size="4" />
            <div>
              <Flex justify="between" align="center" mb="2">
                <Text size="3" weight="bold">Other Owners</Text>
                <Button type="button" size="1" variant="soft" onClick={addOwner}>
                  Add Owner
                </Button>
              </Flex>
              
              {formData.owners.map((owner, index) => (
                <div key={index} className="mb-4 p-3 border rounded">
                  <Flex direction="column" gap="2">
                    <Flex gap="2">
                      <TextField.Root
                        value={owner.name}
                        onChange={(e) => updateOwner(index, "name", e.target.value)}
                        placeholder="Owner name"
                        style={{ flex: 1 }}
                      />
                      <TextField.Root
                        value={owner.ownership_percentage}
                        onChange={(e) => updateOwner(index, "ownership_percentage", e.target.value)}
                        placeholder="%"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        style={{ width: "80px" }}
                      />
                    </Flex>
                    <TextField.Root
                      value={owner.email}
                      onChange={(e) => updateOwner(index, "email", e.target.value)}
                      placeholder="Email (optional)"
                      type="email"
                    />
                    <TextField.Root
                      value={owner.role}
                      onChange={(e) => updateOwner(index, "role", e.target.value)}
                      placeholder="Role (e.g., Co-founder, Angel Investor)"
                    />
                    <TextArea
                      value={owner.notes}
                      onChange={(e) => updateOwner(index, "notes", e.target.value)}
                      placeholder="Notes (optional)"
                    />
                    {formData.owners.length > 1 && (
                      <Button 
                        type="button" 
                        size="1" 
                        variant="soft" 
                        color="red"
                        onClick={() => removeOwner(index)}
                      >
                        Remove Owner
                      </Button>
                    )}
                  </Flex>
                </div>
              ))}
            </div>
          </Flex>

          <Flex gap="3" justify="end" mt="6">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Investment" : "Create Investment")}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}