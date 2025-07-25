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
  Switch,
  Tabs
} from "@radix-ui/themes";

interface PersonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  person?: any;
}

export function PersonModal({ open, onOpenChange, onSuccess, person }: PersonModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "individual" as "individual" | "company" | "trust" | "partnership" | "other",
    email: "",
    phone: "",
    company_name: "",
    position: "",
    address: "",
    city: "",
    state_province: "",
    country: "",
    postal_code: "",
    tax_id: "",
    date_of_birth: "",
    nationality: "",
    notes: "",
    is_active: true,
    health_enabled: false
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const isEditing = !!person;

  useEffect(() => {
    if (person && open) {
      setFormData({
        name: person.name || "",
        type: person.type || "individual",
        email: person.email || "",
        phone: person.phone || "",
        company_name: person.company_name || "",
        position: person.position || "",
        address: person.address || "",
        city: person.city || "",
        state_province: person.state_province || "",
        country: person.country || "",
        postal_code: person.postal_code || "",
        tax_id: person.tax_id || "",
        date_of_birth: person.date_of_birth || "",
        nationality: person.nationality || "",
        notes: person.notes || "",
        is_active: person.is_active ?? true,
        health_enabled: person.health_enabled || false
      });
    } else if (!open) {
      resetForm();
    }
  }, [person, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const personData = {
        name: formData.name,
        type: formData.type,
        email: formData.email || null,
        phone: formData.phone || null,
        company_name: formData.company_name || null,
        position: formData.position || null,
        address: formData.address || null,
        city: formData.city || null,
        state_province: formData.state_province || null,
        country: formData.country || null,
        postal_code: formData.postal_code || null,
        tax_id: formData.tax_id || null,
        date_of_birth: formData.date_of_birth || null,
        nationality: formData.nationality || null,
        notes: formData.notes || null,
        is_active: formData.is_active,
        health_enabled: formData.health_enabled,
        blood_type: null,
        height_cm: null,
        allergies: [],
        chronic_conditions: [],
        emergency_contact: null
      };

      if (isEditing) {
        const { error } = await supabase
          .from("persons")
          .update(personData)
          .eq("id", person.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("persons")
          .insert({ ...personData, user_id: user.id });

        if (error) throw error;
      }

      onSuccess();
      resetForm();
    } catch (error) {
      console.error("Error saving person:", error);
      alert("Failed to save person. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "individual",
      email: "",
      phone: "",
      company_name: "",
      position: "",
      address: "",
      city: "",
      state_province: "",
      country: "",
      postal_code: "",
      tax_id: "",
      date_of_birth: "",
      nationality: "",
      notes: "",
      is_active: true,
      health_enabled: false
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>{isEditing ? "Edit Person" : "Add New Person"}</Dialog.Title>
        
        <form onSubmit={handleSubmit}>
          <Tabs.Root defaultValue="basic">
            <Tabs.List>
              <Tabs.Trigger value="basic">Basic Info</Tabs.Trigger>
              <Tabs.Trigger value="contact">Contact</Tabs.Trigger>
              <Tabs.Trigger value="address">Address</Tabs.Trigger>
              {formData.type === "individual" && (
                <>
                  <Tabs.Trigger value="personal">Personal</Tabs.Trigger>
                  <Tabs.Trigger value="health">Health</Tabs.Trigger>
                </>
              )}
              <Tabs.Trigger value="additional">Additional</Tabs.Trigger>
            </Tabs.List>

            <div style={{ paddingTop: 20 }}>
              <Tabs.Content value="basic">
                <Flex direction="column" gap="4">
                  <Flex gap="3">
                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold" htmlFor="name">
                        Name *
                      </Text>
                      <TextField.Root
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Full name or organization name"
                        required
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold" htmlFor="type">
                        Type *
                      </Text>
                      <Select.Root 
                        value={formData.type} 
                        onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                      >
                        <Select.Trigger />
                        <Select.Content>
                          <Select.Item value="individual">Individual</Select.Item>
                          <Select.Item value="company">Company</Select.Item>
                          <Select.Item value="trust">Trust</Select.Item>
                          <Select.Item value="partnership">Partnership</Select.Item>
                          <Select.Item value="other">Other</Select.Item>
                        </Select.Content>
                      </Select.Root>
                    </div>
                  </Flex>

                  <Flex gap="3">
                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold" htmlFor="company_name">
                        Company/Organization
                      </Text>
                      <TextField.Root
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                        placeholder="Company name"
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold" htmlFor="position">
                        Position/Title
                      </Text>
                      <TextField.Root
                        id="position"
                        value={formData.position}
                        onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                        placeholder="Job title"
                      />
                    </div>
                  </Flex>

                  <Flex gap="3" align="center">
                    <Text size="2">Active</Text>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                  </Flex>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="contact">
                <Flex direction="column" gap="4">
                  <Flex gap="3">
                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold" htmlFor="email">
                        Email
                      </Text>
                      <TextField.Root
                        id="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@example.com"
                        type="email"
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold" htmlFor="phone">
                        Phone
                      </Text>
                      <TextField.Root
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </Flex>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="address">
                <Flex direction="column" gap="4">
                  <div>
                    <Text as="label" size="2" weight="bold" htmlFor="address">
                      Address
                    </Text>
                    <TextArea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Street address"
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
                        Country
                      </Text>
                      <TextField.Root
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                        placeholder="Country"
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
                </Flex>
              </Tabs.Content>

              {formData.type === "individual" && (
                <Tabs.Content value="personal">
                  <Flex direction="column" gap="4">
                    <Flex gap="3">
                      <div style={{ flex: 1 }}>
                        <Text as="label" size="2" weight="bold" htmlFor="date_of_birth">
                          Date of Birth
                        </Text>
                        <TextField.Root
                          id="date_of_birth"
                          value={formData.date_of_birth}
                          onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                          type="date"
                        />
                      </div>

                      <div style={{ flex: 1 }}>
                        <Text as="label" size="2" weight="bold" htmlFor="nationality">
                          Nationality
                        </Text>
                        <TextField.Root
                          id="nationality"
                          value={formData.nationality}
                          onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                          placeholder="Nationality"
                        />
                      </div>
                    </Flex>
                  </Flex>
                </Tabs.Content>
              )}

              {formData.type === "individual" && (
                <Tabs.Content value="health">
                  <Flex direction="column" gap="4">
                    <Flex direction="column" gap="2">
                      <Flex gap="3" align="center">
                        <Text size="2" weight="bold">Enable Health Tracking</Text>
                        <Switch
                          checked={formData.health_enabled}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, health_enabled: checked }))}
                        />
                      </Flex>
                      <Text size="1" color="gray">
                        Enable health tracking to monitor health metrics, store medical records, set health goals, and manage health reminders for this person.
                      </Text>
                    </Flex>
                  </Flex>
                </Tabs.Content>
              )}

              <Tabs.Content value="additional">
                <Flex direction="column" gap="4">
                  <div>
                    <Text as="label" size="2" weight="bold" htmlFor="tax_id">
                      Tax ID / Registration Number
                    </Text>
                    <TextField.Root
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                      placeholder="SSN, EIN, or other tax identifier"
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
              </Tabs.Content>
            </div>
          </Tabs.Root>

          <Flex gap="3" justify="end" mt="6">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Person" : "Create Person")}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}