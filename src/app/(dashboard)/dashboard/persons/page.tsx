"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Flex, Text, Heading, Badge, DropdownMenu, TextField, Table } from "@radix-ui/themes";
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  DotsVerticalIcon, 
  Pencil1Icon, 
  TrashIcon,
  PersonIcon,
  EnvelopeClosedIcon,
  MobileIcon
} from "@radix-ui/react-icons";
import { PersonModal } from "@/components/persons/person-modal";
import { PersonDetailsModal } from "@/components/persons/person-details-modal";

interface Person {
  id: string;
  name: string;
  type: "individual" | "company" | "trust" | "partnership" | "other";
  email: string | null;
  phone: string | null;
  company_name: string | null;
  position: string | null;
  address: string | null;
  city: string | null;
  state_province: string | null;
  country: string | null;
  postal_code: string | null;
  tax_id: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  notes: string | null;
  is_active: boolean;
  health_enabled: boolean;
  blood_type: string | null;
  height_cm: number | null;
  allergies: string[] | null;
  chronic_conditions: string[] | null;
  emergency_contact: string | null;
  created_at: string;
  updated_at: string;
  investment_count?: number;
  property_count?: number;
  contract_count?: number;
}

export default function PersonsPage() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchPersons = async () => {
    try {
      // Use the person_roles view to get counts
      const { data: personsData, error } = await supabase
        .from("person_roles")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setPersons(personsData || []);
    } catch (error) {
      console.error("Error fetching persons:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePerson = async (personId: string) => {
    if (confirm("Are you sure you want to delete this person? This will remove them from all investments, properties, and contracts.")) {
      await supabase.from("persons").delete().eq("id", personId);
      fetchPersons();
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "individual": return "blue";
      case "company": return "green";
      case "trust": return "purple";
      case "partnership": return "orange";
      default: return "gray";
    }
  };

  const filteredPersons = persons.filter(person => {
    const searchLower = searchTerm.toLowerCase();
    return (
      person.name.toLowerCase().includes(searchLower) ||
      person.email?.toLowerCase().includes(searchLower) ||
      person.phone?.includes(searchTerm) ||
      person.company_name?.toLowerCase().includes(searchLower) ||
      person.city?.toLowerCase().includes(searchLower) ||
      person.country?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Text>Loading persons...</Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Flex justify="between" align="center">
        <Heading size="8">People & Organizations</Heading>
        <Button onClick={() => setIsModalOpen(true)}>
          <PlusIcon /> Add Person
        </Button>
      </Flex>

      <Card>
        <TextField.Root
          placeholder="Search by name, email, phone, company, or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>
      </Card>

      <Card>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Contact</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Location</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Connections</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filteredPersons.map((person) => (
              <Table.Row 
                key={person.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedPerson(person)}
              >
                <Table.Cell>
                  <Flex direction="column">
                    <Text weight="bold">{person.name}</Text>
                    {person.company_name && (
                      <Text size="1" color="gray">{person.company_name}</Text>
                    )}
                    {person.position && (
                      <Text size="1" color="gray">{person.position}</Text>
                    )}
                  </Flex>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={getTypeBadgeColor(person.type)}>
                    {person.type}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Flex direction="column" gap="1">
                    {person.email && (
                      <Flex align="center" gap="1">
                        <EnvelopeClosedIcon width="12" height="12" />
                        <Text size="2">{person.email}</Text>
                      </Flex>
                    )}
                    {person.phone && (
                      <Flex align="center" gap="1">
                        <MobileIcon width="12" height="12" />
                        <Text size="2">{person.phone}</Text>
                      </Flex>
                    )}
                  </Flex>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2">
                    {person.city && `${person.city}, `}
                    {person.country}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Flex gap="2">
                    {person.investment_count && person.investment_count > 0 && (
                      <Badge variant="outline" size="1">
                        {person.investment_count} investments
                      </Badge>
                    )}
                    {person.property_count && person.property_count > 0 && (
                      <Badge variant="outline" size="1">
                        {person.property_count} properties
                      </Badge>
                    )}
                    {person.contract_count && person.contract_count > 0 && (
                      <Badge variant="outline" size="1">
                        {person.contract_count} contracts
                      </Badge>
                    )}
                  </Flex>
                </Table.Cell>
                <Table.Cell>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                      <Button variant="ghost" size="1" onClick={(e) => e.stopPropagation()}>
                        <DotsVerticalIcon />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      <DropdownMenu.Item
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPerson(person);
                        }}
                      >
                        <Pencil1Icon />
                        Edit Person
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePerson(person.id);
                        }}
                      >
                        <TrashIcon />
                        Delete Person
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>

        {filteredPersons.length === 0 && (
          <Flex direction="column" align="center" gap="3" className="py-8">
            <PersonIcon width="48" height="48" />
            <Text color="gray">
              {searchTerm ? "No persons found matching your search" : "No persons added yet"}
            </Text>
            {!searchTerm && (
              <Button onClick={() => setIsModalOpen(true)}>
                <PlusIcon /> Add Your First Person
              </Button>
            )}
          </Flex>
        )}
      </Card>

      <PersonModal
        open={isModalOpen || !!editingPerson}
        onOpenChange={(open) => {
          if (!open) {
            setIsModalOpen(false);
            setEditingPerson(null);
          } else if (!editingPerson) {
            setIsModalOpen(true);
          }
        }}
        person={editingPerson}
        onSuccess={() => {
          fetchPersons();
          setIsModalOpen(false);
          setEditingPerson(null);
        }}
      />

      {selectedPerson && (
        <PersonDetailsModal
          person={selectedPerson}
          open={!!selectedPerson}
          onOpenChange={(open) => !open && setSelectedPerson(null)}
          onUpdate={fetchPersons}
        />
      )}
    </div>
  );
}