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
  Checkbox
} from "@radix-ui/themes";

interface PropertyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  property?: any;
}

export function PropertyModal({ open, onOpenChange, onSuccess, property }: PropertyModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "owned" as "owned" | "leased",
    ownership_type: "personal" as "personal" | "company" | "foreign_personal" | "foreign_company",
    owner_name: "",
    owner_company_id: "",
    address: "",
    city: "",
    state_province: "",
    country: "",
    postal_code: "",
    latitude: "",
    longitude: "",
    acquisition_date: "",
    acquisition_price: "",
    current_market_value: "",
    lease_start_date: "",
    lease_end_date: "",
    lease_monthly_amount: "",
    portal_url: "",
    description: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const isEditing = !!property;

  useEffect(() => {
    if (property && open) {
      setFormData({
        name: property.name || "",
        type: property.type || "owned",
        ownership_type: property.ownership_type || "personal",
        owner_name: property.owner_name || "",
        owner_company_id: property.owner_company_id || "",
        address: property.address || "",
        city: property.city || "",
        state_province: property.state_province || "",
        country: property.country || "",
        postal_code: property.postal_code || "",
        latitude: property.latitude?.toString() || "",
        longitude: property.longitude?.toString() || "",
        acquisition_date: property.acquisition_date || "",
        acquisition_price: property.acquisition_price?.toString() || "",
        current_market_value: property.current_market_value?.toString() || "",
        lease_start_date: property.lease_start_date || "",
        lease_end_date: property.lease_end_date || "",
        lease_monthly_amount: property.lease_monthly_amount?.toString() || "",
        portal_url: property.portal_url || "",
        description: property.description || "",
        notes: property.notes || ""
      });
    } else if (!open) {
      resetForm();
    }
  }, [property, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const propertyData = {
        name: formData.name,
        type: formData.type,
        ownership_type: formData.ownership_type,
        owner_name: formData.owner_name || null,
        owner_company_id: formData.owner_company_id || null,
        address: formData.address,
        city: formData.city || null,
        state_province: formData.state_province || null,
        country: formData.country,
        postal_code: formData.postal_code || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        acquisition_date: formData.acquisition_date || null,
        acquisition_price: formData.acquisition_price ? parseFloat(formData.acquisition_price) : null,
        current_market_value: formData.current_market_value ? parseFloat(formData.current_market_value) : null,
        lease_start_date: formData.lease_start_date || null,
        lease_end_date: formData.lease_end_date || null,
        lease_monthly_amount: formData.lease_monthly_amount ? parseFloat(formData.lease_monthly_amount) : null,
        portal_url: formData.portal_url || null,
        description: formData.description || null,
        notes: formData.notes || null
      };

      if (isEditing) {
        const { error } = await supabase
          .from("properties")
          .update(propertyData)
          .eq("id", property.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("properties")
          .insert({ ...propertyData, user_id: user.id });

        if (error) throw error;
      }

      onSuccess();
      resetForm();
    } catch (error) {
      console.error("Error saving property:", error);
      alert("Failed to save property. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "owned",
      ownership_type: "personal",
      owner_name: "",
      owner_company_id: "",
      address: "",
      city: "",
      state_province: "",
      country: "",
      postal_code: "",
      latitude: "",
      longitude: "",
      acquisition_date: "",
      acquisition_price: "",
      current_market_value: "",
      lease_start_date: "",
      lease_end_date: "",
      lease_monthly_amount: "",
      portal_url: "",
      description: "",
      notes: ""
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 700 }}>
        <Dialog.Title>{isEditing ? "Edit Property" : "Add New Property"}</Dialog.Title>
        
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="name">
                  Property Name *
                </Text>
                <TextField.Root
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Main Residence"
                  required
                />
              </div>

              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="type">
                  Type *
                </Text>
                <Select.Root 
                  value={formData.type} 
                  onValueChange={(value: "owned" | "leased") => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="owned">Owned</Select.Item>
                    <Select.Item value="leased">Leased</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </Flex>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="ownership_type">
                  Ownership Type *
                </Text>
                <Select.Root 
                  value={formData.ownership_type} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, ownership_type: value }))}
                >
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="personal">Personal</Select.Item>
                    <Select.Item value="company">Company</Select.Item>
                    <Select.Item value="foreign_personal">Foreign Personal</Select.Item>
                    <Select.Item value="foreign_company">Foreign Company</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>

              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="owner_name">
                  Owner Name/Company
                </Text>
                <TextField.Root
                  id="owner_name"
                  value={formData.owner_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                  placeholder="Name of owner"
                />
              </div>
            </Flex>

            <Separator size="4" />

            <div>
              <Text as="label" size="2" weight="bold" htmlFor="address">
                Address *
              </Text>
              <TextArea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Full address"
                required
              />
            </div>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="city">
                  City
                </Text>
                <TextField.Root
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>

              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="state_province">
                  State/Province
                </Text>
                <TextField.Root
                  id="state_province"
                  value={formData.state_province}
                  onChange={(e) => setFormData(prev => ({ ...prev, state_province: e.target.value }))}
                  placeholder="State or Province"
                />
              </div>
            </Flex>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="country">
                  Country *
                </Text>
                <TextField.Root
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Country"
                  required
                />
              </div>

              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="postal_code">
                  Postal Code
                </Text>
                <TextField.Root
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                  placeholder="Postal/ZIP code"
                />
              </div>
            </Flex>

            <Separator size="4" />

            {formData.type === "owned" ? (
              <>
                <Flex gap="3">
                  <div style={{ flex: 1 }}>
                    <Text as="label" size="2" weight="bold" htmlFor="acquisition_date">
                      Acquisition Date
                    </Text>
                    <TextField.Root
                      id="acquisition_date"
                      value={formData.acquisition_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, acquisition_date: e.target.value }))}
                      type="date"
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <Text as="label" size="2" weight="bold" htmlFor="acquisition_price">
                      Acquisition Price
                    </Text>
                    <TextField.Root
                      id="acquisition_price"
                      value={formData.acquisition_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, acquisition_price: e.target.value }))}
                      placeholder="0"
                      type="number"
                      step="0.01"
                    />
                  </div>
                </Flex>

                <div>
                  <Text as="label" size="2" weight="bold" htmlFor="current_market_value">
                    Current Market Value
                  </Text>
                  <TextField.Root
                    id="current_market_value"
                    value={formData.current_market_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_market_value: e.target.value }))}
                    placeholder="0"
                    type="number"
                    step="0.01"
                  />
                </div>
              </>
            ) : (
              <>
                <Flex gap="3">
                  <div style={{ flex: 1 }}>
                    <Text as="label" size="2" weight="bold" htmlFor="lease_start_date">
                      Lease Start Date
                    </Text>
                    <TextField.Root
                      id="lease_start_date"
                      value={formData.lease_start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, lease_start_date: e.target.value }))}
                      type="date"
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <Text as="label" size="2" weight="bold" htmlFor="lease_end_date">
                      Lease End Date
                    </Text>
                    <TextField.Root
                      id="lease_end_date"
                      value={formData.lease_end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, lease_end_date: e.target.value }))}
                      type="date"
                    />
                  </div>
                </Flex>

                <div>
                  <Text as="label" size="2" weight="bold" htmlFor="lease_monthly_amount">
                    Monthly Lease Amount
                  </Text>
                  <TextField.Root
                    id="lease_monthly_amount"
                    value={formData.lease_monthly_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, lease_monthly_amount: e.target.value }))}
                    placeholder="0"
                    type="number"
                    step="0.01"
                  />
                </div>
              </>
            )}

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
              <Text as="label" size="2" weight="bold" htmlFor="description">
                Description
              </Text>
              <TextArea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Property description"
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
                placeholder="Additional notes"
              />
            </div>
          </Flex>

          <Flex gap="3" justify="end" mt="6">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={loading || !formData.name || !formData.address || !formData.country}>
              {loading ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Property" : "Create Property")}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}