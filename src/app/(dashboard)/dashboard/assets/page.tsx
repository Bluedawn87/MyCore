"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Flex, Text, Heading, Badge, DropdownMenu, TextField, SegmentedControl } from "@radix-ui/themes";
import { 
  PlusIcon, 
  DotsVerticalIcon, 
  Pencil1Icon, 
  TrashIcon,
  MagnifyingGlassIcon,
  GearIcon,
  CalendarIcon,
  PersonIcon,
  ComponentInstanceIcon,
  FileTextIcon
} from "@radix-ui/react-icons";
import { AssetDrawer } from "@/components/assets/asset-drawer";
import { MaintenanceModal } from "@/components/assets/maintenance-modal";
import { AssetDetailsModal } from "@/components/assets/asset-details-modal";

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  serial_number: string | null;
  registration_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  current_value: number | null;
  description: string | null;
  notes: string | null;
  is_active: boolean;
  asset_owners?: AssetOwner[];
  maintenance_logs?: MaintenanceLog[];
  contracts?: Contract[];
  property_assets?: PropertyAsset[];
}

interface AssetOwner {
  id: string;
  owner_type: string;
  person_id: string | null;
  company_id: string | null;
  ownership_percentage: number;
  person?: { name: string };
  company?: { name: string };
}

interface MaintenanceLog {
  id: string;
  maintenance_date: string;
  maintenance_type: string;
  description: string;
  cost: number | null;
  performed_by: string | null;
  next_maintenance_date: string | null;
}

interface Contract {
  id: string;
  name: string;
  contract_type: string;
  renewal_date: string | null;
}

interface PropertyAsset {
  property: {
    id: string;
    name: string;
    address: string;
  };
}

type AssetType = "all" | "car" | "motorbike" | "boat" | "equipment" | "aircon" | "other";

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAssetDrawerOpen, setIsAssetDrawerOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetType>("all");
  const supabase = createClient();

  useEffect(() => {
    fetchAssets();
  }, [assetTypeFilter]);

  const fetchAssets = async () => {
    try {
      const { data: assetsData, error } = await supabase
        .from("assets")
        .select(`
          *,
          asset_owners (
            *,
            person:persons(name),
            company:companies(name)
          ),
          maintenance_logs (
            id,
            maintenance_date,
            maintenance_type,
            description,
            cost,
            performed_by,
            next_maintenance_date
          ),
          contracts (
            id,
            name,
            contract_type,
            renewal_date
          ),
          property_assets (
            property:properties(name, address)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAssets(assetsData || []);
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setLoading(false);
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

  const handleDeleteAsset = async (assetId: string) => {
    if (confirm("Are you sure you want to delete this asset? This will also delete all related maintenance logs.")) {
      await supabase.from("assets").delete().eq("id", assetId);
      fetchAssets();
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "car": return "🚗";
      case "motorbike": return "🏍️";
      case "boat": return "🚤";
      case "equipment": return "📹";
      case "aircon": return "❄️";
      default: return "📦";
    }
  };

  const getNextMaintenance = (logs: MaintenanceLog[]) => {
    if (!logs || logs.length === 0) return null;
    
    const futureMaintenance = logs
      .filter(log => log.next_maintenance_date && new Date(log.next_maintenance_date) > new Date())
      .sort((a, b) => new Date(a.next_maintenance_date!).getTime() - new Date(b.next_maintenance_date!).getTime());
    
    return futureMaintenance[0]?.next_maintenance_date;
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.registration_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = assetTypeFilter === "all" || asset.asset_type === assetTypeFilter;
    
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Text>Loading assets...</Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Flex justify="between" align="center">
        <Heading size="8">Assets</Heading>
        <Button onClick={() => setIsAssetDrawerOpen(true)}>
          <PlusIcon /> Add Asset
        </Button>
      </Flex>

      <Flex gap="4" align="center" wrap="wrap">
        <TextField.Root 
          size="3"
          placeholder="Search assets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px]"
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
        </TextField.Root>

        <SegmentedControl.Root value={assetTypeFilter} onValueChange={(value) => setAssetTypeFilter(value as AssetType)}>
          <SegmentedControl.Item value="all">All</SegmentedControl.Item>
          <SegmentedControl.Item value="car">Cars</SegmentedControl.Item>
          <SegmentedControl.Item value="motorbike">Motorbikes</SegmentedControl.Item>
          <SegmentedControl.Item value="boat">Boats</SegmentedControl.Item>
          <SegmentedControl.Item value="equipment">Equipment</SegmentedControl.Item>
          <SegmentedControl.Item value="aircon">A/C Units</SegmentedControl.Item>
          <SegmentedControl.Item value="other">Other</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.map((asset) => {
          const nextMaintenance = getNextMaintenance(asset.maintenance_logs || []);
          
          return (
            <Card 
              key={asset.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={(e) => {
                // Prevent card click when clicking dropdown
                if (!(e.target as HTMLElement).closest('[data-radix-collection-item]') && 
                    !(e.target as HTMLElement).closest('button')) {
                  setSelectedAsset(asset);
                  setIsDetailsModalOpen(true);
                }
              }}
            >
              <Flex direction="column" gap="3">
                <Flex justify="between" align="start">
                  <Flex gap="2" align="center" className="flex-1 min-w-0">
                    <Text size="6" className="flex-shrink-0">{getAssetIcon(asset.asset_type)}</Text>
                    <div className="min-w-0 flex-1">
                      <Heading size="4" className="truncate">{asset.name}</Heading>
                      <Text size="2" color="gray" className="truncate">
                        {asset.brand} {asset.model} {asset.year && `(${asset.year})`}
                      </Text>
                    </div>
                  </Flex>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                      <Button variant="ghost" size="1" className="flex-shrink-0">
                        <DotsVerticalIcon />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      <DropdownMenu.Item 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAsset(asset);
                        }}
                      >
                        <Pencil1Icon />
                        Edit Asset
                      </DropdownMenu.Item>
                      <DropdownMenu.Item 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAsset(asset);
                          setIsMaintenanceModalOpen(true);
                        }}
                      >
                        <GearIcon />
                        Add Maintenance
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAsset(asset.id);
                        }}
                      >
                        <TrashIcon />
                        Delete Asset
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </Flex>

                {asset.registration_number && (
                  <Badge variant="outline">
                    Reg: {asset.registration_number}
                  </Badge>
                )}

                <div className="space-y-2">
                  {asset.purchase_price && (
                    <Flex justify="between">
                      <Text size="2" color="gray">Purchase Price:</Text>
                      <Text size="2" weight="medium">{formatCurrency(asset.purchase_price)}</Text>
                    </Flex>
                  )}
                  {asset.current_value && (
                    <Flex justify="between">
                      <Text size="2" color="gray">Current Value:</Text>
                      <Text size="2" weight="medium">{formatCurrency(asset.current_value)}</Text>
                    </Flex>
                  )}
                </div>

                {asset.asset_owners && asset.asset_owners.length > 0 && (
                  <div className="space-y-1">
                    {asset.asset_owners.map((owner) => (
                      <Flex key={owner.id} align="center" gap="2">
                        {owner.owner_type === 'person' ? 
                          <PersonIcon className="flex-shrink-0 w-3 h-3" /> : 
                          <ComponentInstanceIcon className="flex-shrink-0 w-3 h-3" />
                        }
                        <Text size="2" className="truncate flex-1">
                          {owner.person?.name || owner.company?.name}
                        </Text>
                        {owner.ownership_percentage < 100 && (
                          <Badge size="1" variant="soft">{owner.ownership_percentage}%</Badge>
                        )}
                      </Flex>
                    ))}
                  </div>
                )}

                <Flex gap="2" wrap="wrap">
                  {asset.contracts && asset.contracts.length > 0 && (
                    <Badge variant="outline" color="blue">
                      <FileTextIcon />
                      {asset.contracts.length} contracts
                    </Badge>
                  )}
                  
                  {asset.maintenance_logs && asset.maintenance_logs.length > 0 && (
                    <Badge variant="outline" color="green">
                      <GearIcon />
                      {asset.maintenance_logs.length} maintenance records
                    </Badge>
                  )}
                  
                  {nextMaintenance && (
                    <Badge variant="outline" color="orange">
                      <CalendarIcon />
                      Next: {formatDate(nextMaintenance)}
                    </Badge>
                  )}
                  
                  {asset.property_assets && asset.property_assets.length > 0 && (
                    <Badge variant="outline" color="purple">
                      🏠 {asset.property_assets[0].property.name}
                    </Badge>
                  )}
                </Flex>
              </Flex>
            </Card>
          );
        })}
      </div>

      {filteredAssets.length === 0 && (
        <Card>
          <Flex direction="column" align="center" gap="3" className="py-8">
            <Text color="gray">
              {searchQuery || assetTypeFilter !== "all" ? "No assets match your filters" : "No assets yet"}
            </Text>
            {!searchQuery && assetTypeFilter === "all" && (
              <Button onClick={() => setIsAssetDrawerOpen(true)}>
                <PlusIcon /> Add Your First Asset
              </Button>
            )}
          </Flex>
        </Card>
      )}

      <AssetDrawer
        open={isAssetDrawerOpen || !!editingAsset}
        onOpenChange={(open) => {
          if (!open) {
            setIsAssetDrawerOpen(false);
            setEditingAsset(null);
          } else if (!editingAsset) {
            setIsAssetDrawerOpen(true);
          }
        }}
        asset={editingAsset}
        onSuccess={() => {
          fetchAssets();
          setIsAssetDrawerOpen(false);
          setEditingAsset(null);
        }}
      />

      {selectedAsset && (
        <>
          <AssetDetailsModal
            asset={selectedAsset}
            open={isDetailsModalOpen}
            onOpenChange={setIsDetailsModalOpen}
            onEdit={() => {
              setEditingAsset(selectedAsset);
              setIsDetailsModalOpen(false);
            }}
            onAddMaintenance={() => {
              setIsMaintenanceModalOpen(true);
              setIsDetailsModalOpen(false);
            }}
          />
          
          <MaintenanceModal
            open={isMaintenanceModalOpen}
            onOpenChange={setIsMaintenanceModalOpen}
            asset={selectedAsset}
            onSuccess={() => {
              fetchAssets();
              setIsMaintenanceModalOpen(false);
              setIsDetailsModalOpen(true);
            }}
          />
        </>
      )}
    </div>
  );
}