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
  Dialog,
  Tabs,
  Badge,
  Checkbox
} from "@radix-ui/themes";
import { PlusIcon, Cross2Icon } from "@radix-ui/react-icons";

interface AssetDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  asset?: any;
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

interface Property {
  id: string;
  name: string;
  address: string;
}

interface Owner {
  type: 'person' | 'company';
  id: string;
  name: string;
  percentage: number;
}

export function AssetDrawer({ open, onOpenChange, onSuccess, asset }: AssetDrawerProps) {
  const [formData, setFormData] = useState({
    name: "",
    asset_type: "car",
    brand: "",
    model: "",
    year: "",
    serial_number: "",
    registration_number: "",
    purchase_date: "",
    purchase_price: "",
    current_value: "",
    description: "",
    notes: "",
    is_active: true
  });
  const [owners, setOwners] = useState<Owner[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [persons, setPersons] = useState<Person[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const supabase = createClient();
  const isEditing = !!asset;

  useEffect(() => {
    if (open) {
      fetchRelations();
      if (asset) {
        setFormData({
          name: asset.name || "",
          asset_type: asset.asset_type || "car",
          brand: asset.brand || "",
          model: asset.model || "",
          year: asset.year?.toString() || "",
          serial_number: asset.serial_number || "",
          registration_number: asset.registration_number || "",
          purchase_date: asset.purchase_date || "",
          purchase_price: asset.purchase_price?.toString() || "",
          current_value: asset.current_value?.toString() || "",
          description: asset.description || "",
          notes: asset.notes || "",
          is_active: asset.is_active ?? true
        });
        
        // Load existing owners
        if (asset.asset_owners) {
          const loadedOwners = asset.asset_owners.map((ao: any) => ({
            type: ao.owner_type as 'person' | 'company',
            id: ao.person_id || ao.company_id,
            name: ao.person?.name || ao.company?.name || '',
            percentage: ao.ownership_percentage
          }));
          setOwners(loadedOwners);
        }
        
        // Load property association
        if (asset.property_assets && asset.property_assets.length > 0) {
          setSelectedPropertyId(asset.property_assets[0].property_id);
        }
      } else {
        resetForm();
      }
    }
  }, [asset, open]);

  const fetchRelations = async () => {
    try {
      const [personsResult, companiesResult, propertiesResult] = await Promise.all([
        supabase.from("persons").select("id, name, type").order("name"),
        supabase.from("companies").select("id, name").order("name"),
        supabase.from("properties").select("id, name, address").order("name")
      ]);

      if (personsResult.data) setPersons(personsResult.data);
      if (companiesResult.data) setCompanies(companiesResult.data);
      if (propertiesResult.data) setProperties(propertiesResult.data);
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

      const assetData = {
        name: formData.name,
        asset_type: formData.asset_type,
        brand: formData.brand || null,
        model: formData.model || null,
        year: formData.year ? parseInt(formData.year) : null,
        serial_number: formData.serial_number || null,
        registration_number: formData.registration_number || null,
        purchase_date: formData.purchase_date || null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        current_value: formData.current_value ? parseFloat(formData.current_value) : null,
        description: formData.description || null,
        notes: formData.notes || null,
        is_active: formData.is_active
      };

      let assetId = asset?.id;

      if (isEditing) {
        const { error } = await supabase
          .from("assets")
          .update(assetData)
          .eq("id", asset.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("assets")
          .insert({ ...assetData, user_id: user.id })
          .select()
          .single();

        if (error) throw error;
        assetId = data.id;
      }

      // Update asset owners
      if (assetId) {
        // Delete existing owners
        await supabase.from("asset_owners").delete().eq("asset_id", assetId);
        
        // Insert new owners
        if (owners.length > 0) {
          const ownerData = owners.map(owner => ({
            asset_id: assetId,
            owner_type: owner.type,
            person_id: owner.type === 'person' ? owner.id : null,
            company_id: owner.type === 'company' ? owner.id : null,
            ownership_percentage: owner.percentage
          }));
          
          const { error } = await supabase.from("asset_owners").insert(ownerData);
          if (error) throw error;
        }
        
        // Update property association
        await supabase.from("property_assets").delete().eq("asset_id", assetId);
        
        if (selectedPropertyId) {
          const { error } = await supabase.from("property_assets").insert({
            asset_id: assetId,
            property_id: selectedPropertyId,
            installation_date: formData.purchase_date || null
          });
          if (error) throw error;
        }
      }

      onSuccess();
      resetForm();
    } catch (error) {
      console.error("Error saving asset:", error);
      alert("Failed to save asset. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      asset_type: "car",
      brand: "",
      model: "",
      year: "",
      serial_number: "",
      registration_number: "",
      purchase_date: "",
      purchase_price: "",
      current_value: "",
      description: "",
      notes: "",
      is_active: true
    });
    setOwners([]);
    setSelectedPropertyId("");
  };

  const addOwner = (type: 'person' | 'company', id: string) => {
    const entity = type === 'person' 
      ? persons.find(p => p.id === id)
      : companies.find(c => c.id === id);
    
    if (entity && !owners.find(o => o.type === type && o.id === id)) {
      const remainingPercentage = 100 - owners.reduce((sum, o) => sum + o.percentage, 0);
      setOwners([...owners, {
        type,
        id,
        name: entity.name,
        percentage: Math.min(remainingPercentage, 100)
      }]);
    }
  };

  const updateOwnerPercentage = (index: number, percentage: number) => {
    const newOwners = [...owners];
    newOwners[index].percentage = Math.max(0, Math.min(100, percentage));
    setOwners(newOwners);
  };

  const removeOwner = (index: number) => {
    setOwners(owners.filter((_, i) => i !== index));
  };

  const totalOwnership = owners.reduce((sum, o) => sum + o.percentage, 0);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 900, maxHeight: '85vh' }}>
        <Dialog.Title>{isEditing ? "Edit Asset" : "Add New Asset"}</Dialog.Title>
        
        <form onSubmit={handleSubmit}>
          <Tabs.Root defaultValue="basic">
            <Tabs.List>
              <Tabs.Trigger value="basic">Basic Info</Tabs.Trigger>
              <Tabs.Trigger value="ownership">Ownership</Tabs.Trigger>
              <Tabs.Trigger value="financial">Financial</Tabs.Trigger>
              <Tabs.Trigger value="notes">Notes</Tabs.Trigger>
            </Tabs.List>

            <div style={{ maxHeight: 'calc(85vh - 180px)', overflowY: 'auto', paddingRight: '8px', marginTop: '16px' }}>
              <Tabs.Content value="basic">
                <Flex direction="column" gap="4">
                  <div>
                    <Text as="label" size="2" weight="bold" htmlFor="name">
                      Asset Name *
                    </Text>
                    <TextField.Root
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Toyota Camry, MacBook Pro"
                      required
                    />
                  </div>

                  <Flex gap="3">
                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold" htmlFor="asset_type">
                        Asset Type *
                      </Text>
                      <Select.Root 
                        value={formData.asset_type} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, asset_type: value }))}
                      >
                        <Select.Trigger />
                        <Select.Content>
                          <Select.Item value="car">Car</Select.Item>
                          <Select.Item value="motorbike">Motorbike</Select.Item>
                          <Select.Item value="boat">Boat</Select.Item>
                          <Select.Item value="equipment">Equipment</Select.Item>
                          <Select.Item value="aircon">Air Conditioner</Select.Item>
                          <Select.Item value="other">Other</Select.Item>
                        </Select.Content>
                      </Select.Root>
                    </div>

                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold" htmlFor="brand">
                        Brand
                      </Text>
                      <TextField.Root
                        id="brand"
                        value={formData.brand}
                        onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                        placeholder="e.g., Toyota, Apple"
                      />
                    </div>
                  </Flex>

                  <Flex gap="3">
                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold" htmlFor="model">
                        Model
                      </Text>
                      <TextField.Root
                        id="model"
                        value={formData.model}
                        onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                        placeholder="e.g., Camry, MacBook Pro 16"
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold" htmlFor="year">
                        Year
                      </Text>
                      <TextField.Root
                        id="year"
                        value={formData.year}
                        onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                        placeholder="e.g., 2023"
                        type="number"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>
                  </Flex>

                  <Flex gap="3">
                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold" htmlFor="serial_number">
                        Serial Number
                      </Text>
                      <TextField.Root
                        id="serial_number"
                        value={formData.serial_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                        placeholder="Serial or VIN number"
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold" htmlFor="registration_number">
                        Registration Number
                      </Text>
                      <TextField.Root
                        id="registration_number"
                        value={formData.registration_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, registration_number: e.target.value }))}
                        placeholder="License plate or registration"
                      />
                    </div>
                  </Flex>

                  <div>
                    <Text as="label" size="2" weight="bold" htmlFor="property_id">
                      Associated Property (for A/C units, etc.)
                    </Text>
                    <Select.Root 
                      value={selectedPropertyId || "none"} 
                      onValueChange={(value) => setSelectedPropertyId(value === "none" ? "" : value)}
                    >
                      <Select.Trigger />
                      <Select.Content>
                        <Select.Item value="none">None</Select.Item>
                        {properties.map((property) => (
                          <Select.Item key={property.id} value={property.id}>
                            {property.name} - {property.address}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </div>

                  <Flex align="center" gap="2">
                    <Checkbox
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked as boolean }))}
                    />
                    <Text as="label" size="2" htmlFor="is_active">
                      Asset is active
                    </Text>
                  </Flex>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="ownership">
                <Flex direction="column" gap="4">
                  <div>
                    <Text size="3" weight="bold">Asset Owners</Text>
                    <Text size="2" color="gray">Add persons or companies as owners</Text>
                  </div>

                  <Flex gap="3">
                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold">Add Person</Text>
                      <Select.Root onValueChange={(value) => value && addOwner('person', value)}>
                        <Select.Trigger placeholder="Select a person" />
                        <Select.Content>
                          {persons.map((person) => (
                            <Select.Item key={person.id} value={person.id}>
                              {person.name} ({person.type})
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </div>

                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold">Add Company</Text>
                      <Select.Root onValueChange={(value) => value && addOwner('company', value)}>
                        <Select.Trigger placeholder="Select a company" />
                        <Select.Content>
                          {companies.map((company) => (
                            <Select.Item key={company.id} value={company.id}>
                              {company.name}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </div>
                  </Flex>

                  {owners.length > 0 && (
                    <div className="space-y-2">
                      {owners.map((owner, index) => (
                        <Flex key={`${owner.type}-${owner.id}`} align="center" gap="3">
                          <Badge variant="soft">
                            {owner.type === 'person' ? 'Person' : 'Company'}
                          </Badge>
                          <Text size="2" style={{ flex: 1 }}>{owner.name}</Text>
                          <TextField.Root
                            value={owner.percentage.toString()}
                            onChange={(e) => updateOwnerPercentage(index, parseFloat(e.target.value) || 0)}
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            style={{ width: '100px' }}
                          />
                          <Text size="2">%</Text>
                          <Button
                            type="button"
                            size="1"
                            variant="ghost"
                            onClick={() => removeOwner(index)}
                          >
                            <Cross2Icon />
                          </Button>
                        </Flex>
                      ))}
                      
                      {totalOwnership !== 100 && (
                        <Text size="2" color={totalOwnership > 100 ? "red" : "orange"}>
                          Total ownership: {totalOwnership}% (should equal 100%)
                        </Text>
                      )}
                    </div>
                  )}
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="financial">
                <Flex direction="column" gap="4">
                  <div>
                    <Text as="label" size="2" weight="bold" htmlFor="purchase_date">
                      Purchase Date
                    </Text>
                    <TextField.Root
                      id="purchase_date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                      type="date"
                    />
                  </div>

                  <Flex gap="3">
                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold" htmlFor="purchase_price">
                        Purchase Price
                      </Text>
                      <TextField.Root
                        id="purchase_price"
                        value={formData.purchase_price}
                        onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
                        placeholder="0"
                        type="number"
                        step="0.01"
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold" htmlFor="current_value">
                        Current Value
                      </Text>
                      <TextField.Root
                        id="current_value"
                        value={formData.current_value}
                        onChange={(e) => setFormData(prev => ({ ...prev, current_value: e.target.value }))}
                        placeholder="0"
                        type="number"
                        step="0.01"
                      />
                    </div>
                  </Flex>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="notes">
                <Flex direction="column" gap="4">
                  <div>
                    <Text as="label" size="2" weight="bold" htmlFor="description">
                      Description
                    </Text>
                    <TextArea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Detailed description of the asset"
                      rows={3}
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
                      placeholder="Additional notes or comments"
                      rows={3}
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
              {loading ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Asset" : "Create Asset")}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}