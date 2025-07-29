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
  IconButton
} from "@radix-ui/themes";
import { PlusIcon, Cross2Icon } from "@radix-ui/react-icons";

interface ProjectDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  project?: any;
}

interface Person {
  id: string;
  name: string;
  type: string;
}

interface Investment {
  id: string;
  name: string;
}

interface Owner {
  person_id: string;
  name: string;
  ownership_percentage: number;
  role: string;
}

export function ProjectDrawer({ open, onOpenChange, onSuccess, project }: ProjectDrawerProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "idea",
    project_type: "software",
    start_date: "",
    target_completion_date: "",
    initial_investment: "",
    estimated_value: "",
    current_value: "",
    investment_id: "",
    website_url: "",
    repository_url: "",
    notes: ""
  });
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(false);
  const [persons, setPersons] = useState<Person[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const supabase = createClient();
  const isEditing = !!project;

  useEffect(() => {
    if (open) {
      fetchRelations();
      if (project) {
        setFormData({
          name: project.name || "",
          description: project.description || "",
          status: project.status || "idea",
          project_type: project.project_type || "software",
          start_date: project.start_date || "",
          target_completion_date: project.target_completion_date || "",
          initial_investment: project.initial_investment?.toString() || "",
          estimated_value: project.estimated_value?.toString() || "",
          current_value: project.current_value?.toString() || "",
          investment_id: project.investment_id || "",
          website_url: project.website_url || "",
          repository_url: project.repository_url || "",
          notes: project.notes || ""
        });
        
        // Load existing owners
        if (project.project_owners) {
          const loadedOwners = project.project_owners.map((po: any) => ({
            person_id: po.person_id,
            name: po.person.name,
            ownership_percentage: po.ownership_percentage,
            role: po.role || ""
          }));
          setOwners(loadedOwners);
        }
      } else {
        resetForm();
      }
    }
  }, [project, open]);

  const fetchRelations = async () => {
    try {
      const [personsResult, investmentsResult] = await Promise.all([
        supabase.from("persons").select("id, name, type").order("name"),
        supabase.from("investments").select("id, name").order("name")
      ]);

      if (personsResult.data) setPersons(personsResult.data);
      if (investmentsResult.data) setInvestments(investmentsResult.data);
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

      const projectData = {
        name: formData.name,
        description: formData.description || null,
        status: formData.status,
        project_type: formData.project_type,
        start_date: formData.start_date || null,
        target_completion_date: formData.target_completion_date || null,
        initial_investment: formData.initial_investment ? parseFloat(formData.initial_investment) : null,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        current_value: formData.current_value ? parseFloat(formData.current_value) : null,
        investment_id: formData.investment_id || null,
        website_url: formData.website_url || null,
        repository_url: formData.repository_url || null,
        notes: formData.notes || null
      };

      let projectId = project?.id;

      if (isEditing) {
        const { error } = await supabase
          .from("projects")
          .update(projectData)
          .eq("id", project.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("projects")
          .insert({ ...projectData, user_id: user.id })
          .select()
          .single();

        if (error) throw error;
        projectId = data.id;
      }

      // Update project owners
      if (projectId) {
        // Delete existing owners
        await supabase.from("project_owners").delete().eq("project_id", projectId);
        
        // Insert new owners
        if (owners.length > 0) {
          const ownerData = owners.map(owner => ({
            project_id: projectId,
            person_id: owner.person_id,
            ownership_percentage: owner.ownership_percentage,
            role: owner.role || null
          }));
          
          const { error } = await supabase.from("project_owners").insert(ownerData);
          if (error) throw error;
        }
      }

      onSuccess();
      resetForm();
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      status: "idea",
      project_type: "software",
      start_date: "",
      target_completion_date: "",
      initial_investment: "",
      estimated_value: "",
      current_value: "",
      investment_id: "",
      website_url: "",
      repository_url: "",
      notes: ""
    });
    setOwners([]);
  };

  const addOwner = (personId: string) => {
    const person = persons.find(p => p.id === personId);
    if (person && !owners.find(o => o.person_id === personId)) {
      const remainingPercentage = 100 - owners.reduce((sum, o) => sum + o.ownership_percentage, 0);
      setOwners([...owners, {
        person_id: personId,
        name: person.name,
        ownership_percentage: Math.min(remainingPercentage, 100),
        role: ""
      }]);
    }
  };

  const updateOwner = (index: number, field: 'ownership_percentage' | 'role', value: any) => {
    const newOwners = [...owners];
    if (field === 'ownership_percentage') {
      newOwners[index][field] = Math.max(0, Math.min(100, value));
    } else {
      newOwners[index][field] = value;
    }
    setOwners(newOwners);
  };

  const removeOwner = (index: number) => {
    setOwners(owners.filter((_, i) => i !== index));
  };

  const totalOwnership = owners.reduce((sum, o) => sum + o.ownership_percentage, 0);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 900, maxHeight: '85vh' }}>
        <Dialog.Title>{isEditing ? "Edit Project" : "New Project"}</Dialog.Title>
        
        <form onSubmit={handleSubmit}>
          <Tabs.Root defaultValue="basic">
            <Tabs.List>
              <Tabs.Trigger value="basic">Basic Info</Tabs.Trigger>
              <Tabs.Trigger value="team">Team</Tabs.Trigger>
              <Tabs.Trigger value="financial">Financial</Tabs.Trigger>
              <Tabs.Trigger value="notes">Notes & Links</Tabs.Trigger>
            </Tabs.List>

            <div style={{ maxHeight: 'calc(85vh - 180px)', overflowY: 'auto', paddingRight: '8px', marginTop: '16px' }}>
              <Tabs.Content value="basic">
                <Flex direction="column" gap="4">
                  <div>
                    <Text as="label" size="2" weight="bold" htmlFor="name">
                      Project Name *
                    </Text>
                    <TextField.Root
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Mobile App Development"
                      required
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
                      placeholder="Brief description of the project"
                      rows={3}
                    />
                  </div>

                  <Flex gap="3">
                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold" htmlFor="status">
                        Status *
                      </Text>
                      <Select.Root 
                        value={formData.status} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                      >
                        <Select.Trigger />
                        <Select.Content>
                          <Select.Item value="idea">💡 Idea</Select.Item>
                          <Select.Item value="planning">📋 Planning</Select.Item>
                          <Select.Item value="active">🚀 Active</Select.Item>
                          <Select.Item value="on_hold">⏸️ On Hold</Select.Item>
                          <Select.Item value="completed">✅ Completed</Select.Item>
                          <Select.Item value="cancelled">❌ Cancelled</Select.Item>
                        </Select.Content>
                      </Select.Root>
                    </div>

                    <div style={{ flex: 1 }}>
                      <Text as="label" size="2" weight="bold" htmlFor="project_type">
                        Project Type
                      </Text>
                      <Select.Root 
                        value={formData.project_type} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, project_type: value }))}
                      >
                        <Select.Trigger />
                        <Select.Content>
                          <Select.Item value="software">Software</Select.Item>
                          <Select.Item value="hardware">Hardware</Select.Item>
                          <Select.Item value="service">Service</Select.Item>
                          <Select.Item value="content">Content</Select.Item>
                          <Select.Item value="research">Research</Select.Item>
                          <Select.Item value="other">Other</Select.Item>
                        </Select.Content>
                      </Select.Root>
                    </div>
                  </Flex>

                  <div>
                    <Text as="label" size="2" weight="bold" htmlFor="investment_id">
                      Under Investment (Optional)
                    </Text>
                    <Select.Root 
                      value={formData.investment_id || "none"} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, investment_id: value === "none" ? "" : value }))}
                    >
                      <Select.Trigger />
                      <Select.Content>
                        <Select.Item value="none">None - Independent Project</Select.Item>
                        {investments.map((investment) => (
                          <Select.Item key={investment.id} value={investment.id}>
                            {investment.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </div>

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
                      <Text as="label" size="2" weight="bold" htmlFor="target_completion_date">
                        Target Completion
                      </Text>
                      <TextField.Root
                        id="target_completion_date"
                        value={formData.target_completion_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, target_completion_date: e.target.value }))}
                        type="date"
                      />
                    </div>
                  </Flex>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="team">
                <Flex direction="column" gap="4">
                  <div>
                    <Text size="3" weight="bold">Project Team</Text>
                    <Text size="2" color="gray">Add team members and their roles</Text>
                  </div>

                  <div>
                    <Text as="label" size="2" weight="bold">Add Team Member</Text>
                    <Select.Root onValueChange={(value) => value && addOwner(value)}>
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

                  {owners.length > 0 && (
                    <div className="space-y-2">
                      {owners.map((owner, index) => (
                        <Flex key={owner.person_id} align="center" gap="3">
                          <Text size="2" style={{ flex: 1 }}>{owner.name}</Text>
                          <TextField.Root
                            value={owner.role}
                            onChange={(e) => updateOwner(index, 'role', e.target.value)}
                            placeholder="Role"
                            style={{ width: '150px' }}
                          />
                          <TextField.Root
                            value={owner.ownership_percentage.toString()}
                            onChange={(e) => updateOwner(index, 'ownership_percentage', parseFloat(e.target.value) || 0)}
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            style={{ width: '100px' }}
                          />
                          <Text size="2">%</Text>
                          <IconButton
                            type="button"
                            size="1"
                            variant="ghost"
                            onClick={() => removeOwner(index)}
                          >
                            <Cross2Icon />
                          </IconButton>
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
                    <Text as="label" size="2" weight="bold" htmlFor="initial_investment">
                      Initial Investment
                    </Text>
                    <TextField.Root
                      id="initial_investment"
                      value={formData.initial_investment}
                      onChange={(e) => setFormData(prev => ({ ...prev, initial_investment: e.target.value }))}
                      placeholder="0"
                      type="number"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <Text as="label" size="2" weight="bold" htmlFor="estimated_value">
                      Estimated Value
                    </Text>
                    <TextField.Root
                      id="estimated_value"
                      value={formData.estimated_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: e.target.value }))}
                      placeholder="0"
                      type="number"
                      step="0.01"
                    />
                  </div>

                  <div>
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
              </Tabs.Content>

              <Tabs.Content value="notes">
                <Flex direction="column" gap="4">
                  <div>
                    <Text as="label" size="2" weight="bold" htmlFor="website_url">
                      Website URL
                    </Text>
                    <TextField.Root
                      id="website_url"
                      value={formData.website_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                      placeholder="https://example.com"
                      type="url"
                    />
                  </div>

                  <div>
                    <Text as="label" size="2" weight="bold" htmlFor="repository_url">
                      Repository URL
                    </Text>
                    <TextField.Root
                      id="repository_url"
                      value={formData.repository_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, repository_url: e.target.value }))}
                      placeholder="https://github.com/username/repo"
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
                      placeholder="Additional notes about the project"
                      rows={5}
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
              {loading ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Project" : "Create Project")}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}