"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Flex, Text, Heading, Badge, DropdownMenu, SegmentedControl, TextField } from "@radix-ui/themes";
import { 
  PlusIcon, 
  ExternalLinkIcon, 
  DotsVerticalIcon, 
  Pencil1Icon, 
  TrashIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  PersonIcon,
  HomeIcon,
  ComponentInstanceIcon
} from "@radix-ui/react-icons";
import { ContractDrawer } from "@/components/contracts/contract-drawer";

interface Contract {
  id: string;
  name: string;
  contract_type: string;
  provider_name: string | null;
  property_id: string | null;
  property?: Property;
  company_id: string | null;
  person_name: string | null;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  monthly_amount: number | null;
  annual_amount: number | null;
  contract_number: string | null;
  portal_url: string | null;
  auto_renewal: boolean;
  reminder_days_before: number;
  notes: string | null;
}

interface Property {
  id: string;
  name: string;
  address: string;
  city: string | null;
  country: string;
}


type GroupBy = "all" | "property" | "person" | "type";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchContracts(), fetchProperties()]);
    setLoading(false);
  };

  const fetchContracts = async () => {
    try {
      const { data: contractsData, error } = await supabase
        .from("contracts")
        .select(`
          *,
          property:properties(id, name, address, city, country)
        `)
        .order("renewal_date", { ascending: true });

      if (error) throw error;
      setContracts(contractsData || []);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    }
  };

  const fetchProperties = async () => {
    try {
      const { data: propertiesData, error } = await supabase
        .from("properties")
        .select("id, name, address, city, country")
        .order("name", { ascending: true });

      if (error) throw error;
      setProperties(propertiesData || []);
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const handleDeleteContract = async (contractId: string) => {
    if (confirm("Are you sure you want to delete this contract?")) {
      await supabase.from("contracts").delete().eq("id", contractId);
      fetchContracts();
    }
  };

  const getDaysUntilRenewal = (renewalDate: string | null) => {
    if (!renewalDate) return null;
    const today = new Date();
    const renewal = new Date(renewalDate);
    const diffTime = renewal.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getRenewalBadge = (renewalDate: string | null) => {
    const daysUntil = getDaysUntilRenewal(renewalDate);
    if (!daysUntil) return null;
    
    if (daysUntil < 0) {
      return <Badge color="red">Expired</Badge>;
    } else if (daysUntil <= 30) {
      return <Badge color="orange">Renews in {daysUntil} days</Badge>;
    } else if (daysUntil <= 90) {
      return <Badge color="yellow">Renews in {Math.round(daysUntil / 30)} months</Badge>;
    }
    return null;
  };

  const filteredContracts = contracts.filter(contract => {
    const searchLower = searchQuery.toLowerCase();
    return (
      contract.name.toLowerCase().includes(searchLower) ||
      contract.contract_type.toLowerCase().includes(searchLower) ||
      (contract.provider_name?.toLowerCase().includes(searchLower) || false) ||
      (contract.property?.name.toLowerCase().includes(searchLower) || false) ||
      (contract.person_name?.toLowerCase().includes(searchLower) || false)
    );
  });

  const groupedContracts = () => {
    if (groupBy === "all") {
      return { "All Contracts": filteredContracts };
    }

    const groups: Record<string, Contract[]> = {};

    filteredContracts.forEach(contract => {
      let key = "Other";
      
      switch (groupBy) {
        case "property":
          key = contract.property?.name || "No Property";
          break;
        case "person":
          key = contract.person_name || "No Person";
          break;
        case "type":
          key = contract.contract_type;
          break;
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(contract);
    });

    return groups;
  };

  const renderContract = (contract: Contract) => (
    <Card key={contract.id}>
      <Flex justify="between" align="center">
        <Flex direction="column" gap="2">
          <Flex align="center" gap="3">
            <Heading size="4">{contract.name}</Heading>
            <Badge>{contract.contract_type}</Badge>
            {contract.auto_renewal && (
              <Badge color="green" variant="soft">Auto-renewal</Badge>
            )}
            {getRenewalBadge(contract.renewal_date)}
          </Flex>
          <Text size="2" color="gray">
            {contract.provider_name} 
            {contract.property && ` • ${contract.property.name}`}
            {contract.person_name && ` • ${contract.person_name}`}
          </Text>
          <Flex gap="4">
            {contract.monthly_amount && (
              <Text size="2">
                <Text weight="bold">{formatCurrency(contract.monthly_amount)}</Text>/month
              </Text>
            )}
            {contract.annual_amount && (
              <Text size="2">
                <Text weight="bold">{formatCurrency(contract.annual_amount)}</Text>/year
              </Text>
            )}
            {contract.renewal_date && (
              <Text size="2">
                Renewal: <Text weight="bold">{formatDate(contract.renewal_date)}</Text>
              </Text>
            )}
          </Flex>
        </Flex>
        <Flex gap="2" align="center">
          {contract.portal_url && (
            <a 
              href={contract.portal_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
            >
              <Text size="2">Portal</Text>
              <ExternalLinkIcon />
            </a>
          )}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="ghost" size="1">
                <DotsVerticalIcon />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                onClick={() => setEditingContract(contract)}
              >
                <Pencil1Icon />
                Edit Contract
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                color="red"
                onClick={() => handleDeleteContract(contract.id)}
              >
                <TrashIcon />
                Delete Contract
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>
      </Flex>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Text>Loading contracts...</Text>
      </div>
    );
  }

  const groups = groupedContracts();

  return (
    <div className="space-y-6">
      <Flex justify="between" align="center">
        <Heading size="8">Contracts</Heading>
        <Button onClick={() => setIsContractModalOpen(true)}>
          <PlusIcon /> Add Contract
        </Button>
      </Flex>

      <Flex gap="4" align="center" wrap="wrap">
        <TextField.Root 
          size="3"
          placeholder="Search contracts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px]"
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
        </TextField.Root>

        <SegmentedControl.Root value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
          <SegmentedControl.Item value="all">All</SegmentedControl.Item>
          <SegmentedControl.Item value="property">
            <HomeIcon /> Property
          </SegmentedControl.Item>
          <SegmentedControl.Item value="person">
            <PersonIcon /> Person
          </SegmentedControl.Item>
          <SegmentedControl.Item value="type">Type</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>

      <div className="space-y-6">
        {Object.entries(groups).map(([groupName, groupContracts]) => (
          <div key={groupName}>
            {groupBy !== "all" && (
              <Flex align="center" gap="2" mb="3">
                <Heading size="5" color="gray">{groupName}</Heading>
                <Badge size="1" variant="soft">{groupContracts.length}</Badge>
              </Flex>
            )}
            <div className="space-y-4">
              {groupContracts.map(renderContract)}
            </div>
          </div>
        ))}
      </div>

      {filteredContracts.length === 0 && (
        <Card>
          <Flex direction="column" align="center" gap="3" className="py-8">
            <Text color="gray">
              {searchQuery ? "No contracts match your search" : "No contracts yet"}
            </Text>
            {!searchQuery && (
              <Button onClick={() => setIsContractModalOpen(true)}>
                <PlusIcon /> Add Your First Contract
              </Button>
            )}
          </Flex>
        </Card>
      )}

      <ContractDrawer
        open={isContractModalOpen || !!editingContract}
        onOpenChange={(open) => {
          if (!open) {
            setIsContractModalOpen(false);
            setEditingContract(null);
          } else if (!editingContract) {
            setIsContractModalOpen(true);
          }
        }}
        contract={editingContract}
        properties={properties}
        onSuccess={() => {
          fetchContracts();
          setIsContractModalOpen(false);
          setEditingContract(null);
        }}
      />
    </div>
  );
}