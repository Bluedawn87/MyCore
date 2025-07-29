"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Button,
  TextField,
  TextArea,
  Select,
  Flex,
  Text,
  Dialog,
  Heading
} from "@radix-ui/themes";

interface MaintenanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  asset: {
    id: string;
    name: string;
    asset_type: string;
  };
}

export function MaintenanceModal({ open, onOpenChange, onSuccess, asset }: MaintenanceModalProps) {
  const [formData, setFormData] = useState({
    maintenance_date: new Date().toISOString().split('T')[0],
    maintenance_type: "",
    description: "",
    cost: "",
    performed_by: "",
    next_maintenance_date: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const maintenanceTypes = {
    car: ["Oil Change", "Tire Rotation", "Brake Service", "General Service", "Major Service", "Repair", "Other"],
    motorbike: ["Oil Change", "Chain Maintenance", "Brake Service", "General Service", "Major Service", "Repair", "Other"],
    boat: ["Engine Service", "Hull Cleaning", "Antifouling", "General Service", "Winterization", "Repair", "Other"],
    equipment: ["Calibration", "Cleaning", "Parts Replacement", "Software Update", "Repair", "Other"],
    aircon: ["Filter Cleaning", "Gas Refill", "General Service", "Deep Cleaning", "Repair", "Other"],
    other: ["Inspection", "Service", "Repair", "Replacement", "Other"]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from("maintenance_logs")
        .insert({
          asset_id: asset.id,
          user_id: user.id,
          maintenance_date: formData.maintenance_date,
          maintenance_type: formData.maintenance_type,
          description: formData.description,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          performed_by: formData.performed_by || null,
          next_maintenance_date: formData.next_maintenance_date || null,
          notes: formData.notes || null
        });

      if (error) throw error;

      onSuccess();
      resetForm();
    } catch (error) {
      console.error("Error saving maintenance log:", error);
      alert("Failed to save maintenance log. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      maintenance_date: new Date().toISOString().split('T')[0],
      maintenance_type: "",
      description: "",
      cost: "",
      performed_by: "",
      next_maintenance_date: "",
      notes: ""
    });
  };

  const types = maintenanceTypes[asset.asset_type as keyof typeof maintenanceTypes] || maintenanceTypes.other;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>Add Maintenance Log</Dialog.Title>
        
        <Heading size="3" mb="4" color="gray">
          {asset.name}
        </Heading>
        
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="maintenance_date">
                  Maintenance Date *
                </Text>
                <TextField.Root
                  id="maintenance_date"
                  value={formData.maintenance_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, maintenance_date: e.target.value }))}
                  type="date"
                  required
                />
              </div>

              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="maintenance_type">
                  Maintenance Type *
                </Text>
                <Select.Root 
                  value={formData.maintenance_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, maintenance_type: value }))}
                >
                  <Select.Trigger placeholder="Select type" />
                  <Select.Content>
                    {types.map((type) => (
                      <Select.Item key={type} value={type}>
                        {type}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
            </Flex>

            <div>
              <Text as="label" size="2" weight="bold" htmlFor="description">
                Description *
              </Text>
              <TextArea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What was done? e.g., Replaced oil filter and 5L of engine oil"
                required
                rows={3}
              />
            </div>

            <Flex gap="3">
              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="cost">
                  Cost
                </Text>
                <TextField.Root
                  id="cost"
                  value={formData.cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="0"
                  type="number"
                  step="0.01"
                />
              </div>

              <div style={{ flex: 1 }}>
                <Text as="label" size="2" weight="bold" htmlFor="performed_by">
                  Performed By
                </Text>
                <TextField.Root
                  id="performed_by"
                  value={formData.performed_by}
                  onChange={(e) => setFormData(prev => ({ ...prev, performed_by: e.target.value }))}
                  placeholder="Service center or mechanic name"
                />
              </div>
            </Flex>

            <div>
              <Text as="label" size="2" weight="bold" htmlFor="next_maintenance_date">
                Next Maintenance Date
              </Text>
              <TextField.Root
                id="next_maintenance_date"
                value={formData.next_maintenance_date}
                onChange={(e) => setFormData(prev => ({ ...prev, next_maintenance_date: e.target.value }))}
                type="date"
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
                placeholder="Additional notes or recommendations"
                rows={2}
              />
            </div>
          </Flex>

          <Flex gap="3" justify="end" mt="6">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={loading || !formData.maintenance_type || !formData.description}>
              {loading ? "Saving..." : "Save Maintenance Log"}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}